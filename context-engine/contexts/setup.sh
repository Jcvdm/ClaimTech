#!/bin/bash
# setup.sh - Complete setup in one command

echo "🚀 Setting up Context Engine..."

# Create all directories
mkdir -p src scripts contexts db cache templates

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo "❌ package.json not found. Please run this from the context-engine directory."
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "⚠️  Please add your OpenRouter API key to .env file"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your OpenRouter API key to .env"
echo "2. Run: npm run process-codebase /path/to/your/project"
echo "3. Start: npm start"
echo "4. Test: curl http://localhost:3456/health"
echo "5. Open dashboard: http://localhost:3456/dashboard"

