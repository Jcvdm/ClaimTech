import { glob } from 'glob';
import { readFile, writeFile, stat } from 'fs/promises';
import path from 'path';
import parser from '@babel/parser';
import traverse from '@babel/traverse';

export async function analyzeCodebase(basePath) {
  const manifest = {
    basePath,
    files: [],
    structure: {},
    dependencies: new Set(),
    patterns: {}
  };
  
  // Find all relevant files
  const patterns = [
    '**/*.{js,jsx,ts,tsx}',
    '**/*.{py,java,go,rs}',
    '**/*.{md,mdx}',
    '**/package.json',
    '**/.env.example'
  ];
  
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: basePath,
      ignore: [
        'node_modules/**',
        'dist/**',
        '.git/**',
        'build/**',
        'coverage/**',
        '.svelte-kit/**',
        '.vercel/**',
        'context-engine/**',
        '**/*.min.js',
        '**/*.map'
      ]
    });
    
    for (const file of files) {
      const fullPath = path.join(basePath, file);

      // Skip directories
      try {
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          continue;
        }
      } catch (error) {
        console.warn(`Skipping ${file}: ${error.message}`);
        continue;
      }

      const content = await readFile(fullPath, 'utf-8');

      // Extract metadata based on file type
      const metadata = await extractMetadata(fullPath, content);

      manifest.files.push({
        path: file,
        type: path.extname(file),
        size: content.length,
        metadata
      });
    }
  }
  
  return manifest;
}

async function extractMetadata(filePath, content) {
  const ext = path.extname(filePath);
  const metadata = {
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    comments: [],
    category: categorizeFile(filePath),
    complexity: calculateComplexity(content)
  };
  
  if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });
      
      traverse.default(ast, {
        ImportDeclaration(path) {
          metadata.imports.push(path.node.source.value);
        },
        ExportNamedDeclaration(path) {
          if (path.node.declaration?.id?.name) {
            metadata.exports.push(path.node.declaration.id.name);
          }
        },
        FunctionDeclaration(path) {
          metadata.functions.push({
            name: path.node.id?.name,
            params: path.node.params.length,
            loc: path.node.loc?.start.line
          });
        },
        ClassDeclaration(path) {
          metadata.classes.push({
            name: path.node.id?.name,
            methods: []  // Extract methods if needed
          });
        }
      });
    } catch (error) {
      console.warn(`Failed to parse ${filePath}:`, error.message);
    }
  }
  
  return metadata;
}

function categorizeFile(filePath) {
  if (filePath.includes('auth')) return 'authentication';
  if (filePath.includes('api')) return 'api';
  if (filePath.includes('component')) return 'frontend';
  if (filePath.includes('util') || filePath.includes('helper')) return 'utilities';
  if (filePath.includes('test')) return 'testing';
  if (filePath.includes('config')) return 'configuration';
  if (filePath.includes('model') || filePath.includes('schema')) return 'database';
  if (filePath.includes('service')) return 'service';
  if (filePath.includes('route')) return 'routing';
  return 'general';
}

function calculateComplexity(content) {
  // Simple complexity score based on code patterns
  let score = 0;
  score += (content.match(/if\s*\(/g) || []).length * 1;
  score += (content.match(/for\s*\(/g) || []).length * 2;
  score += (content.match(/while\s*\(/g) || []).length * 2;
  score += (content.match(/catch\s*\(/g) || []).length * 1;
  score += (content.match(/async\s+/g) || []).length * 1;
  return Math.min(score, 100);
}

