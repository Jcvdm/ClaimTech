import { writeFile, mkdir } from 'fs/promises';
import { pipeline } from '@xenova/transformers';
import path from 'path';

export async function simpleIndexContexts(contexts, options = {}) {
  const { 
    outputDir = './db',
    collectionName = 'codebase_contexts'
  } = options;
  
  console.log(`📚 Indexing ${contexts.length} context documents...`);
  
  // Create output directory
  await mkdir(outputDir, { recursive: true });
  
  // Use free local embeddings
  console.log('🏠 Using local embeddings (free)');
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  
  // Process contexts with embeddings
  const indexedContexts = [];
  
  for (let i = 0; i < contexts.length; i++) {
    if (i % 50 === 0) {
      console.log(`Processing ${i}/${contexts.length}...`);
    }
    
    const ctx = contexts[i];
    
    // Generate embedding
    const output = await embedder(ctx.content.substring(0, 512), { 
      pooling: 'mean', 
      normalize: true 
    });
    
    indexedContexts.push({
      id: ctx.id,
      content: ctx.content,
      metadata: ctx.metadata,
      embedding: Array.from(output.data)
    });
  }
  
  // Save to JSON file
  const outputPath = path.join(outputDir, `${collectionName}.json`);
  await writeFile(outputPath, JSON.stringify({
    version: '1.0',
    created: new Date().toISOString(),
    count: indexedContexts.length,
    contexts: indexedContexts
  }, null, 2));
  
  console.log(`✅ Indexing complete! Saved to ${outputPath}`);
  
  return {
    success: true,
    indexed: contexts.length,
    outputPath
  };
}

