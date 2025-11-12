import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';

export async function createContextDocuments(manifest) {
  const contexts = [];
  
  for (const file of manifest.files) {
    // Skip non-code files for now
    if (!['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs'].includes(file.type)) {
      continue;
    }
    
    const content = await readFile(path.join(manifest.basePath, file.path), 'utf-8');
    
    // Split large files into chunks
    const chunks = splitIntoChunks(content, file);
    
    for (const chunk of chunks) {
      const doc = {
        id: createHash('md5').update(`${file.path}-${chunk.start}`).digest('hex'),
        content: chunk.content,
        metadata: {
          file: file.path,
          category: file.metadata.category,
          type: file.type,
          functions: chunk.functions || [],
          imports: file.metadata.imports,
          exports: file.metadata.exports,
          complexity: file.metadata.complexity,
          chunkIndex: chunk.index,
          chunkTotal: chunks.length,
          lines: `${chunk.start}-${chunk.end}`,
          tags: generateTags(chunk.content, file.metadata)
        }
      };
      
      contexts.push(doc);
    }
  }
  
  return contexts;
}

function splitIntoChunks(content, file, maxChunkSize = 1500) {
  const lines = content.split('\n');
  const chunks = [];
  let currentChunk = {
    content: '',
    start: 1,
    end: 1,
    index: 0,
    functions: []
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for function/class boundaries
    const isBoundary = /^(export |class |function |const \w+ = |interface |type )/.test(line);
    
    if (isBoundary && currentChunk.content.length > maxChunkSize / 2) {
      // Start new chunk at boundary
      chunks.push(currentChunk);
      currentChunk = {
        content: '',
        start: i + 1,
        end: i + 1,
        index: chunks.length,
        functions: []
      };
    }
    
    currentChunk.content += line + '\n';
    currentChunk.end = i + 1;
    
    // Track functions in chunk
    const funcMatch = line.match(/function\s+(\w+)|const\s+(\w+)\s*=.*=>/);
    if (funcMatch) {
      currentChunk.functions.push(funcMatch[1] || funcMatch[2]);
    }
    
    // Force split if chunk too large
    if (currentChunk.content.length > maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = {
        content: '',
        start: i + 2,
        end: i + 2,
        index: chunks.length,
        functions: []
      };
    }
  }
  
  if (currentChunk.content.trim()) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

function generateTags(content, metadata) {
  const tags = [];
  
  // Add category as tag
  tags.push(metadata.category);
  
  // Detect patterns
  if (content.includes('useState') || content.includes('useEffect')) tags.push('react-hooks');
  if (content.includes('async') || content.includes('await')) tags.push('async');
  if (content.includes('SELECT') || content.includes('INSERT')) tags.push('sql');
  if (content.includes('mongoose') || content.includes('prisma')) tags.push('orm');
  if (content.includes('express') || content.includes('fastify')) tags.push('backend');
  if (content.includes('className') || content.includes('styled')) tags.push('styling');
  if (content.includes('test(') || content.includes('describe(')) tags.push('testing');
  if (content.includes('supabase')) tags.push('supabase');
  if (content.includes('svelte')) tags.push('svelte');
  
  // Add complexity level
  if (metadata.complexity < 20) tags.push('simple');
  else if (metadata.complexity < 50) tags.push('moderate');
  else tags.push('complex');
  
  return tags;
}

