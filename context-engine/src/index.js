import express from 'express';
import cors from 'cors';
import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// CONTEXT ENGINE CORE
// ============================================

class ContextEngine {
  constructor() {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    // Initialize Chroma
    this.chroma = new ChromaClient({ path: process.env.DB_PATH });

    // Initialize AI broker (cheap model via OpenRouter)
    this.ai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3456',
        'X-Title': 'Context Engine'
      }
    });

    // Cache for frequent queries
    this.cache = new Map();

    this.setupRoutes();
  }

  async initialize() {
    // Get or create collection
    try {
      this.collection = await this.chroma.getOrCreateCollection({
        name: 'codebase_contexts',
        metadata: {
          description: 'Intelligent code context storage',
          model: process.env.CONTEXT_MODEL
        }
      });

      console.log('✅ ChromaDB initialized');

      // Load existing contexts
      const count = await this.collection.count();
      console.log(`📚 Loaded ${count} context documents`);

    } catch (error) {
      console.error('❌ Failed to initialize ChromaDB:', error);
      process.exit(1);
    }
  }

  setupRoutes() {
    // Main context retrieval endpoint
    this.app.post('/api/context', async (req, res) => {
      const startTime = Date.now();
      const { query, category, tags, limit = 3, useCache = true } = req.body;

      try {
        // Check cache
        const cacheKey = this.getCacheKey(query, category, tags);
        if (useCache && this.cache.has(cacheKey)) {
          const cached = this.cache.get(cacheKey);
          if (cached.expires > Date.now()) {
            return res.json({
              ...cached.data,
              cached: true,
              responseTime: Date.now() - startTime
            });
          }
        }

        // Step 1: Use AI to understand and expand query
        const expandedQuery = await this.expandQuery(query);

        // Step 2: Vector search
        const searchResults = await this.searchContexts(
          expandedQuery,
          category,
          tags,
          limit * 2  // Get more for AI to filter
        );

        // Step 3: Use AI broker to rank and synthesize
        const synthesis = await this.synthesizeContext(
          query,
          searchResults,
          limit
        );

        // Calculate metrics
        const response = {
          query,
          expandedQuery,
          contexts: synthesis.contexts,
          summary: synthesis.summary,
          codeExamples: synthesis.code,
          relatedFiles: synthesis.files,
          tokensSaved: this.calculateTokenSavings(synthesis),
          responseTime: Date.now() - startTime,
          cached: false,
          model: process.env.CONTEXT_MODEL
        };

        // Update cache
        if (useCache) {
          this.cache.set(cacheKey, {
            data: response,
            expires: Date.now() + (parseInt(process.env.CACHE_TTL) * 1000)
          });
        }

        res.json(response);

      } catch (error) {
        console.error('Context retrieval error:', error);
        res.status(500).json({
          error: error.message,
          responseTime: Date.now() - startTime
        });
      }
    });

    // Process new codebase endpoint
    this.app.post('/api/process-codebase', async (req, res) => {
      const { path, extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java'],
              clearExisting = false } = req.body;

      try {
        if (clearExisting) {
          await this.clearCollection();
        }

        const result = await this.processCodebase(path, extensions);
        res.json(result);

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Search specific code patterns
    this.app.post('/api/search-code', async (req, res) => {
      const { pattern, fileType, limit = 5 } = req.body;

      try {
        const results = await this.searchCode(pattern, fileType, limit);
        res.json(results);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Health check
    this.app.get('/health', async (req, res) => {
      const count = await this.collection.count();
      res.json({
        status: 'healthy',
        documents: count,
        cacheSize: this.cache.size,
        model: process.env.CONTEXT_MODEL
      });
    });

    // Serve dashboard
    this.app.get('/dashboard', (req, res) => {
      res.sendFile('dashboard.html', { root: './src' });
    });
  }

  async expandQuery(query) {
    const response = await this.ai.chat.completions.create({
      model: process.env.CONTEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: `Extract key technical terms and expand the query with related concepts.
Output JSON: { original: "", keywords: [], related: [], category: "" }`
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    });

    try {
      const expanded = JSON.parse(response.choices[0].message.content);
      return expanded.keywords.join(' ') + ' ' + expanded.related.join(' ');
    } catch {
      return query;  // Fallback to original
    }
  }

  async searchContexts(query, category, tags, limit) {
    const results = await this.collection.query({
      queryTexts: [query],
      nResults: limit,
      where: category ? { category } : undefined
    });

    return results.documents[0].map((doc, i) => ({
      content: doc,
      metadata: results.metadatas[0][i],
      distance: results.distances[0][i]
    }));
  }

  async synthesizeContext(originalQuery, searchResults, limit) {
    const prompt = `You are a code context synthesizer. Given search results, extract the most relevant information.

Query: "${originalQuery}"

Search Results:
${searchResults.map((r, i) => `
[${i}] File: ${r.metadata.file || 'unknown'}
Category: ${r.metadata.category}
Content: ${r.content.substring(0, 500)}...
`).join('\n')}

Output this exact JSON structure:
{
  "contexts": [{"file": "", "content": "", "relevance": 0.9}],
  "summary": "Brief summary of found contexts",
  "code": ["relevant code snippet 1", "snippet 2"],
  "files": ["file1.js", "file2.ts"]
}`;

    const response = await this.ai.chat.completions.create({
      model: process.env.CONTEXT_MODEL,
      messages: [
        { role: 'system', content: 'Output only valid JSON. Be concise.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0
    });

    try {
      return JSON.parse(response.choices[0].message.content);
    } catch {
      // Fallback structure
      return {
        contexts: searchResults.slice(0, limit).map(r => ({
          file: r.metadata.file,
          content: r.content.substring(0, 200),
          relevance: 1 - r.distance
        })),
        summary: 'Retrieved relevant contexts',
        code: [],
        files: []
      };
    }
  }

  getCacheKey(query, category, tags) {
    const data = JSON.stringify({ query, category, tags });
    return createHash('md5').update(data).digest('hex');
  }

  calculateTokenSavings(synthesis) {
    const retrievedTokens = JSON.stringify(synthesis).length / 4;
    const fullContextTokens = 15000;  // Estimated full context
    return Math.round((1 - retrievedTokens / fullContextTokens) * 100);
  }

  async clearCollection() {
    await this.chroma.deleteCollection('codebase_contexts');
    this.collection = await this.chroma.createCollection({
      name: 'codebase_contexts'
    });
  }

  async processCodebase(basePath, extensions) {
    console.log(`🔍 Processing codebase at ${basePath}`);
    // Implementation in scripts/process-codebase.js
    return { processed: 0, errors: [] };
  }

  async searchCode(pattern, fileType, limit) {
    // Implementation for code pattern search
    return { matches: [] };
  }

  start() {
    const port = process.env.PORT || 3456;
    this.app.listen(port, () => {
      console.log(`🚀 Context Engine running at http://localhost:${port}`);
      console.log(`📊 Using model: ${process.env.CONTEXT_MODEL}`);
      console.log(`💾 Database path: ${process.env.DB_PATH}`);
    });
  }
}

// Start the engine
const engine = new ContextEngine();
await engine.initialize();
engine.start();

