import express from 'express';
import cors from 'cors';
import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// INTELLIGENT CONTEXT ENGINE V2
// Multi-hop reasoning + iterative refinement
// ============================================

class IntelligentContextEngine {
  constructor() {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    this.chroma = new ChromaClient();
    
    // Use smarter model for reasoning
    this.ai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3457',
        'X-Title': 'Intelligent Context Engine V2'
      }
    });

    this.cache = new Map();
    this.setupRoutes();
  }

  async initialize() {
    try {
      this.collection = await this.chroma.getOrCreateCollection({
        name: 'codebase_contexts',
        metadata: {
          description: 'Intelligent code context with reasoning',
          model: process.env.CONTEXT_MODEL
        }
      });

      console.log('✅ Intelligent Context Engine initialized');
      const count = await this.collection.count();
      console.log(`📚 Loaded ${count} context documents`);

    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      process.exit(1);
    }
  }

  setupRoutes() {
    // Main intelligent context endpoint
    this.app.post('/api/context', async (req, res) => {
      const startTime = Date.now();
      const {
        query,
        intent,
        limit = 10,
        useCache = true,
        strategy = 'auto',
        maxTokens = 3000,
        sessionId = null
      } = req.body;

      try {
        // Check cache
        const cacheKey = this.getCacheKey(query, intent, strategy, maxTokens, limit);
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

        // INTELLIGENT MULTI-PHASE RETRIEVAL
        const result = await this.intelligentRetrieval(query, intent, {
          limit,
          strategy,
          maxTokens
        });

        const response = {
          query,
          intent: result.intent,
          reasoning: result.reasoning,
          contexts: result.contexts,
          relatedQueries: result.relatedQueries,
          codeGraph: result.codeGraph,
          recommendations: result.recommendations,
          tokensSaved: this.calculateTokenSavings(result),
          responseTime: Date.now() - startTime,
          cached: false,
          model: process.env.CONTEXT_MODEL,
          phases: result.phases,
          layers: result.layers,
          meta: result.meta,
          agentView: result.agentView,
          strategy,
          maxTokens,
          sessionId
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
        console.error('Intelligent retrieval error:', error);
        res.status(500).json({
          error: error.message,
          responseTime: Date.now() - startTime
        });
      }
    });

    // Health check
    this.app.get('/health', async (req, res) => {
      const count = await this.collection.count();
      res.json({
        status: 'healthy',
        documents: count,
        cacheSize: this.cache.size,
        model: process.env.CONTEXT_MODEL,
        version: '2.0-intelligent'
      });
    });

    // Dashboard
    this.app.get('/dashboard', (req, res) => {
      res.sendFile('dashboard.html', { root: './contexts/src' });
    });
  }

  // PHASE 1: Understand Intent & Plan Retrieval Strategy
  async understandIntent(query, userIntent) {
    const response = await this.ai.chat.completions.create({
      model: process.env.CONTEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a code context planning agent. Output ONLY valid JSON, no markdown, no explanation.

Analyze the query and output this exact structure:
{
  "intent": "pre-edit-gathering",
  "goal": "brief description",
  "contextNeeded": ["services", "types", "components"],
  "retrievalStrategy": {
    "phase1": "search services",
    "phase2": "find types",
    "phase3": "find UI"
  },
  "searchQueries": ["query1", "query2", "query3"]
}`
        },
        {
          role: 'user',
          content: `Query: "${query}"\nIntent: ${userIntent || 'pre-edit-gathering'}\n\nOutput JSON only:`
        }
      ],
      max_tokens: 300,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    try {
      const content = response.choices[0].message.content.trim();
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      // Ensure searchQueries is an array
      if (!Array.isArray(parsed.searchQueries)) {
        parsed.searchQueries = [query];
      }

      return parsed;
    } catch (error) {
      console.log('Intent parsing failed, using defaults:', error.message);
      return {
        intent: userIntent || 'pre-edit-gathering',
        goal: query,
        contextNeeded: ['services', 'types', 'components', 'tests'],
        retrievalStrategy: {
          phase1: 'search services and types',
          phase2: 'find UI components',
          phase3: 'find tests and downstream'
        },
        searchQueries: [
          query,
          `${query} types interface`,
          `${query} component UI`
        ]
      };
    }
  }

  // PHASE 2: Multi-Hop Retrieval with Reasoning
  async intelligentRetrieval(query, userIntent, options = {}) {
    const { limit = 10, strategy = 'auto', maxTokens = 3000 } = options;
    const phases = [];

    // Step 1: Understand what user wants
    const intentAnalysis = await this.understandIntent(query, userIntent);
    phases.push({ phase: 'intent', result: intentAnalysis });

    // Step 2: Initial retrieval based on search queries
    const initialResults = [];
    for (const searchQuery of intentAnalysis.searchQueries) {
      const results = await this.vectorSearch(searchQuery, limit);
      initialResults.push(...results);
    }
    phases.push({ phase: 'initial-search', count: initialResults.length });

    // Step 3: Follow dependencies (multi-hop)
    const dependencies = await this.followDependencies(initialResults);
    phases.push({ phase: 'dependencies', count: dependencies.length });

    // Step 4: Find downstream impacts
    const downstream = await this.findDownstream(initialResults);
    phases.push({ phase: 'downstream', count: downstream.length });

    // Step 5: Build code graph
    const codeGraph = await this.buildCodeGraph([
      ...initialResults,
      ...dependencies,
      ...downstream
    ]);
    phases.push({ phase: 'code-graph', nodes: codeGraph.nodes.length });

    // Step 6: Intelligent synthesis with reasoning
    const synthesis = await this.synthesizeWithReasoning(
      query,
      intentAnalysis,
      initialResults,
      dependencies,
      downstream,
      codeGraph
    );

    // Build layered contexts
    const layerL1 = initialResults.slice(0, Math.min(limit, initialResults.length));
    const layerL2 = dependencies;
    const layerL3 = downstream;

    const rawLayers = { L1: layerL1, L2: layerL2, L3: layerL3 };
    const { layers, totalTokens } = this.applyBudget(rawLayers, strategy, maxTokens);

    const agentView = this.buildAgentView(layers);

    phases.push({
      phase: 'layering',
      strategy,
      maxTokens,
      totalTokens,
      layerCounts: {
        L1: layers.L1.length,
        L2: layers.L2.length,
        L3: layers.L3.length
      }
    });

    return {
      intent: intentAnalysis,
      reasoning: synthesis.reasoning,
      contexts: synthesis.contexts,
      relatedQueries: synthesis.relatedQueries,
      codeGraph,
      recommendations: synthesis.recommendations,
      phases,
      layers,
      meta: {
        strategy,
        maxTokens,
        totalTokens,
        layerCounts: {
          L1: layers.L1.length,
          L2: layers.L2.length,
          L3: layers.L3.length
        },
        rawCounts: {
          initial: initialResults.length,
          dependencies: dependencies.length,
          downstream: downstream.length
        }
      },
      agentView
    };
  }

  // Vector search helper
  async vectorSearch(query, limit) {
    const results = await this.collection.query({
      queryTexts: [query],
      nResults: limit
    });

    return results.documents[0].map((doc, i) => ({
      content: doc,
      metadata: results.metadatas[0][i],
      distance: results.distances[0][i],
      relevance: 1 - results.distances[0][i]
    }));
  }

  // Follow import/export dependencies
  async followDependencies(contexts) {
    const dependencies = [];

    for (const ctx of contexts) {
      // Extract imports from content
      const imports = this.extractImports(ctx.content);

      // Search for each imported module
      for (const imp of imports) {
        const results = await this.vectorSearch(`import from ${imp}`, 3);
        dependencies.push(...results);
      }
    }

    return this.deduplicateContexts(dependencies);
  }

  // Find downstream callers and usages
  async findDownstream(contexts) {
    const downstream = [];

    for (const ctx of contexts) {
      // Extract exported symbols
      const exports = this.extractExports(ctx.content);

      // Search for usages of each export
      for (const exp of exports) {
        const results = await this.vectorSearch(`calls ${exp} usage`, 5);
        downstream.push(...results);
      }
    }

    return this.deduplicateContexts(downstream);
  }

  // Build code dependency graph
  async buildCodeGraph(contexts) {
    const nodes = [];
    const edges = [];
    const seen = new Set();

    for (const ctx of contexts) {
      const file = ctx.metadata.file || 'unknown';
      if (seen.has(file)) continue;
      seen.add(file);

      nodes.push({
        id: file,
        type: ctx.metadata.category || 'unknown',
        relevance: ctx.relevance
      });

      // Extract relationships
      const imports = this.extractImports(ctx.content);
      for (const imp of imports) {
        edges.push({ from: file, to: imp, type: 'imports' });
      }
    }

    return { nodes, edges };
  }

  // Intelligent synthesis with deep reasoning
  async synthesizeWithReasoning(query, intent, initial, deps, downstream, graph) {
    const allContexts = [...initial, ...deps, ...downstream];

    const prompt = `You are an intelligent code context synthesizer with reasoning capabilities.

**User Query:** "${query}"
**Intent:** ${intent.intent} - ${intent.goal}
**Context Needed:** ${intent.contextNeeded.join(', ')}

**Retrieved Contexts (${allContexts.length} total):**
${allContexts.slice(0, 15).map((ctx, i) => `
[${i}] File: ${ctx.metadata.file || 'unknown'}
Category: ${ctx.metadata.category || 'unknown'}
Relevance: ${(ctx.relevance * 100).toFixed(1)}%
Content Preview: ${ctx.content.substring(0, 300)}...
`).join('\n')}

**Code Graph:**
- Nodes: ${graph.nodes.length} files
- Edges: ${graph.edges.length} dependencies

**Your Task:**
1. Reason about what contexts are most relevant
2. Explain WHY each context matters for the user's goal
3. Identify missing information that should be retrieved
4. Provide actionable recommendations

Output this JSON:
{
  "reasoning": "Step-by-step explanation of what you found and why it matters",
  "contexts": [
    {
      "file": "path/to/file.ts",
      "content": "relevant code snippet",
      "relevance": 0.95,
      "why": "Explanation of why this is relevant",
      "category": "service|component|type|test"
    }
  ],
  "relatedQueries": ["query1", "query2"],
  "recommendations": [
    "Check X before editing Y",
    "Update tests in Z after changes"
  ],
  "missingContext": ["What else should be retrieved"]
}`;

    const response = await this.ai.chat.completions.create({
      model: process.env.CONTEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert code analyst. Output ONLY valid JSON, no markdown. Provide deep reasoning and actionable insights.'
        },
        { role: 'user', content: prompt + '\n\nOutput JSON only:' }
      ],
      max_tokens: 2000,  // Much more tokens for deep analysis
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    try {
      const content = response.choices[0].message.content.trim();
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      // Ensure required fields exist
      if (!parsed.reasoning) parsed.reasoning = 'Analysis of retrieved contexts';
      if (!Array.isArray(parsed.contexts)) parsed.contexts = [];
      if (!Array.isArray(parsed.relatedQueries)) parsed.relatedQueries = [];
      if (!Array.isArray(parsed.recommendations)) parsed.recommendations = [];

      // If contexts is empty, populate from allContexts
      if (parsed.contexts.length === 0) {
        parsed.contexts = allContexts.slice(0, 10).map(ctx => ({
          file: ctx.metadata.file,
          content: ctx.content.substring(0, 500),
          relevance: ctx.relevance,
          why: 'Relevant to query based on semantic similarity',
          category: ctx.metadata.category || 'unknown'
        }));
      }

      return parsed;
    } catch (error) {
      console.log('Synthesis parsing failed, using fallback:', error.message);
      // Fallback with basic structure
      return {
        reasoning: `Found ${allContexts.length} relevant contexts for "${query}". Includes service methods, type definitions, and related utilities.`,
        contexts: allContexts.slice(0, 10).map(ctx => ({
          file: ctx.metadata.file,
          content: ctx.content.substring(0, 500),
          relevance: ctx.relevance,
          why: 'Semantically similar to query',
          category: ctx.metadata.category || 'unknown'
        })),
        relatedQueries: [`${query} tests`, `${query} UI components`],
        recommendations: [
          'Review service methods before making changes',
          'Check type definitions for interface changes',
          'Update tests after modifications'
        ],
        missingContext: []
      };
    }
  }

  // Helper: Extract imports from code
  extractImports(code) {
    const imports = [];
    const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  // Helper: Extract exports from code
  extractExports(code) {
    const exports = [];
    const exportRegex = /export\s+(?:const|function|class|interface|type)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(code)) !== null) {
      exports.push(match[1]);
    }
    return exports;
  }

  // Helper: Deduplicate contexts
  deduplicateContexts(contexts) {
    const seen = new Map();
    for (const ctx of contexts) {
      const key = ctx.metadata.file + ctx.content.substring(0, 100);
      if (!seen.has(key) || seen.get(key).relevance < ctx.relevance) {
        seen.set(key, ctx);
      }
    }
    return Array.from(seen.values());
  }

  // Apply simple token budget across layered contexts
  applyBudget(layers, strategy, maxTokens) {
    const order =
      strategy === 'minimal'
        ? ['L1']
        : strategy === 'architectural'
          ? ['L1', 'L2', 'L3']
          : ['L1', 'L2', 'L3'];

    const kept = { L1: [], L2: [], L3: [] };
    let used = 0;

    for (const key of order) {
      const layer = layers[key] || [];
      for (const ctx of layer) {
        const tokens = ctx.content ? ctx.content.length / 4 : 0;
        if (used + tokens > maxTokens) {
          break;
        }
        kept[key].push(ctx);
        used += tokens;
      }
    }

    return { layers: kept, totalTokens: used };
  }

  // Build agent-friendly primary/secondary/reference view
  buildAgentView(layers) {
    const flat = [
      ...(layers.L1 || []),
      ...(layers.L2 || []),
      ...(layers.L3 || [])
    ];

    if (flat.length === 0) {
      return { primary: '', secondary: '', reference: { files: [] } };
    }

    const primary = flat
      .slice(0, 3)
      .map((ctx) => ctx.content)
      .join('\n---\n');

    const secondary = flat
      .slice(3, 8)
      .map((ctx) => {
        const file = ctx.metadata?.file || 'unknown';
        const preview = ctx.content ? ctx.content.slice(0, 120) : '';
        return `[${file}]: ${preview}...`;
      })
      .join('\n');

    const reference = {
      files: Array.from(
        new Set(
          flat
            .map((ctx) => ctx.metadata?.file)
            .filter(Boolean)
        )
      )
    };

    return { primary, secondary, reference };
  }

  getCacheKey(query, intent, strategy, maxTokens, limit) {
    const data = JSON.stringify({ query, intent, strategy, maxTokens, limit });
    return createHash('md5').update(data).digest('hex');
  }

  calculateTokenSavings(result) {
    const retrievedTokens = JSON.stringify(result).length / 4;
    const fullContextTokens = 20000;  // Estimated full context
    return Math.round((1 - retrievedTokens / fullContextTokens) * 100);
  }

  start() {
    const port = process.env.PORT || 3457;
    this.app.listen(port, () => {
      console.log(`🚀 Intelligent Context Engine V2 running at http://localhost:${port}`);
      console.log(`🧠 Using model: ${process.env.CONTEXT_MODEL}`);
      console.log(`💾 Database: ${process.env.DB_PATH}`);
      console.log(`✨ Features: Multi-hop reasoning, dependency tracking, code graph`);
    });
  }
}

// Start the intelligent engine
const engine = new IntelligentContextEngine();
await engine.initialize();
engine.start();

export default IntelligentContextEngine;
