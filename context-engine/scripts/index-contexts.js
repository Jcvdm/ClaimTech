import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
import { pipeline } from '@xenova/transformers';

export async function indexContexts(contexts, options = {}) {
  const { 
    useLocalEmbeddings = true,
    batchSize = 100,
    collectionName = 'codebase_contexts'
  } = options;
  
  console.log(`📚 Indexing ${contexts.length} context documents...`);
  
  // Initialize ChromaDB
  const chroma = new ChromaClient({ path: './db' });
  
  // Clear existing collection if requested
  if (options.clearExisting) {
    try {
      await chroma.deleteCollection(collectionName);
      console.log('🗑️ Cleared existing collection');
    } catch (error) {
      // Collection might not exist
    }
  }
  
  // Create embedding function
  let embeddingFunction;
  
  if (useLocalEmbeddings) {
    // Use free local embeddings
    console.log('🏠 Using local embeddings (free)');
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    embeddingFunction = {
      generate: async (texts) => {
        const embeddings = [];
        for (const text of texts) {
          const output = await embedder(text, { 
            pooling: 'mean', 
            normalize: true 
          });
          embeddings.push(Array.from(output.data));
        }
        return embeddings;
      }
    };
  } else {
    // Use OpenAI embeddings
    console.log('☁️ Using OpenAI embeddings');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    embeddingFunction = {
      generate: async (texts) => {
        const response = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: texts
        });
        return response.data.map(d => d.embedding);
      }
    };
  }
  
  // Create collection with embedding function
  const collection = await chroma.createCollection({
    name: collectionName,
    embeddingFunction
  });
  
  // Process in batches
  for (let i = 0; i < contexts.length; i += batchSize) {
    const batch = contexts.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(contexts.length/batchSize)}`);
    
    // Prepare batch data
    const ids = batch.map(ctx => ctx.id);
    const documents = batch.map(ctx => ctx.content);
    const metadatas = batch.map(ctx => ctx.metadata);
    
    // Add to collection
    await collection.add({
      ids,
      documents,
      metadatas
    });
  }
  
  console.log('✅ Indexing complete!');
  
  return {
    success: true,
    indexed: contexts.length,
    collection: collectionName
  };
}

