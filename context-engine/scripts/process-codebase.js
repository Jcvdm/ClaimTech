import { analyzeCodebase } from './analyze-codebase.js';
import { createContextDocuments } from './create-contexts.js';
import { indexContexts } from './index-contexts.js';
import { writeFile } from 'fs/promises';

async function main() {
  const targetPath = process.argv[2] || '../your-project';
  
  console.log(`🚀 Processing codebase: ${targetPath}`);
  
  try {
    // Step 1: Analyze
    console.log('📊 Analyzing codebase structure...');
    const manifest = await analyzeCodebase(targetPath);
    await writeFile('manifest.json', JSON.stringify(manifest, null, 2));
    console.log(`Found ${manifest.files.length} files`);
    
    // Step 2: Create context documents
    console.log('📄 Creating context documents...');
    const contexts = await createContextDocuments(manifest);
    console.log(`Created ${contexts.length} context chunks`);
    
    // Step 3: Index with embeddings
    console.log('🔍 Generating embeddings and indexing...');
    const result = await indexContexts(contexts, {
      useLocalEmbeddings: true,  // Free!
      clearExisting: true,
      batchSize: 100
    });
    
    // Step 4: Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      basePath: targetPath,
      stats: {
        files: manifest.files.length,
        contexts: contexts.length,
        categories: [...new Set(contexts.map(c => c.metadata.category))],
        avgComplexity: contexts.reduce((sum, c) => sum + c.metadata.complexity, 0) / contexts.length
      },
      result
    };
    
    await writeFile('processing-summary.json', JSON.stringify(summary, null, 2));
    
    console.log('\n✅ Processing complete!');
    console.log('📊 Summary:');
    console.log(`  - Files processed: ${summary.stats.files}`);
    console.log(`  - Context chunks: ${summary.stats.contexts}`);
    console.log(`  - Categories: ${summary.stats.categories.join(', ')}`);
    console.log(`  - Avg complexity: ${summary.stats.avgComplexity.toFixed(1)}`);
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    process.exit(1);
  }
}

main();

