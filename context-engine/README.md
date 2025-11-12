# 🚀 Context Engine

AI-powered context retrieval system with automatic codebase processing. Reduces token costs by 80-90% through intelligent semantic search and context synthesis.

## Features

- **Local Vector Database** - ChromaDB for fast semantic search
- **Cheap AI Broker** - Uses Gemini Flash 1.5 8B ($0.075/1M tokens)
- **Automatic Codebase Processing** - Analyzes and indexes your entire codebase
- **Smart Context Retrieval** - Returns only relevant code snippets
- **Built-in Caching** - Reduces repeated query costs
- **Monitoring Dashboard** - Real-time stats and testing interface

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your OpenRouter API key

# 3. Process your codebase
npm run process-codebase /path/to/your/project

# 4. Start the engine
npm start

# 5. Open dashboard
open http://localhost:3456/dashboard
```

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Claude/GPT-4   │─────▶│  Gemini Flash    │─────▶│   ChromaDB      │
│  (Main Agent)   │      │  (Context Broker)│      │  (Vector Store) │
└─────────────────┘      └──────────────────┘      └─────────────────┘
      $3/1M                    $0.075/1M                    FREE
```

## API Endpoints

### POST /api/context
Retrieve relevant code context for a query.

```json
{
  "query": "How is user authentication handled?",
  "category": "authentication",
  "limit": 3
}
```

### POST /api/process-codebase
Process and index a new codebase.

```json
{
  "path": "/path/to/project",
  "extensions": [".js", ".ts", ".py"],
  "clearExisting": false
}
```

### GET /health
Check system status.

## Configuration

Edit `.env` file:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxx
CONTEXT_MODEL=google/gemini-flash-1.5-8b
PORT=3456
DB_PATH=./db
CONTEXT_DIR=./contexts
CACHE_TTL=3600
```

## Cost Analysis

| Component | Without Context Engine | With Context Engine | Savings |
|-----------|------------------------|-------------------|---------|
| Context Tokens | 15,000 | 1,500 | 90% |
| Model Cost | $30 (GPT-4) | $3 (GPT-4) + $0.11 (Gemini) | 89% |
| Response Time | 3-5s | 1-2s | 50% |

**Monthly Savings**: ~$269 (for 10,000 queries)

## Docker Deployment

```bash
docker-compose up -d
```

## License

MIT

