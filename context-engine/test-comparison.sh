#!/bin/bash
# Test V1 vs V2 side-by-side

echo "🧪 Context Engine V1 vs V2 Comparison Test"
echo "=========================================="
echo ""

# Test query
QUERY="additionals service approve decline methods"

echo "📝 Test Query: $QUERY"
echo ""

# Test V1
echo "🔵 Testing V1 (Basic)..."
echo "Request:"
echo "curl -X POST http://localhost:3456/api/context -H 'Content-Type: application/json' -d '{\"query\": \"$QUERY\", \"limit\": 10}'"
echo ""

V1_RESPONSE=$(curl -s -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\", \"limit\": 10}")

echo "Response:"
echo "$V1_RESPONSE" | python -m json.tool
echo ""
echo "---"
echo ""

# Test V2
echo "🟢 Testing V2 (Intelligent)..."
echo "Request:"
echo "curl -X POST http://localhost:3457/api/context -H 'Content-Type: application/json' -d '{\"query\": \"$QUERY\", \"intent\": \"pre-edit-gathering\", \"limit\": 10}'"
echo ""

V2_RESPONSE=$(curl -s -X POST http://localhost:3457/api/context \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\", \"intent\": \"pre-edit-gathering\", \"limit\": 10}")

echo "Response:"
echo "$V2_RESPONSE" | python -m json.tool
echo ""
echo "---"
echo ""

# Compare metrics
echo "📊 Comparison:"
echo ""

V1_TIME=$(echo "$V1_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('responseTime', 0))")
V2_TIME=$(echo "$V2_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('responseTime', 0))")

V1_CONTEXTS=$(echo "$V1_RESPONSE" | python -c "import sys, json; print(len(json.load(sys.stdin).get('contexts', [])))")
V2_CONTEXTS=$(echo "$V2_RESPONSE" | python -c "import sys, json; print(len(json.load(sys.stdin).get('contexts', [])))")

V1_TOKENS=$(echo "$V1_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('tokensSaved', 0))")
V2_TOKENS=$(echo "$V2_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('tokensSaved', 0))")

echo "| Metric | V1 | V2 |"
echo "|--------|----|----|"
echo "| Response Time | ${V1_TIME}ms | ${V2_TIME}ms |"
echo "| Contexts Found | $V1_CONTEXTS | $V2_CONTEXTS |"
echo "| Token Savings | ${V1_TOKENS}% | ${V2_TOKENS}% |"
echo "| Has Reasoning | ❌ | ✅ |"
echo "| Has Code Graph | ❌ | ✅ |"
echo "| Has Recommendations | ❌ | ✅ |"
echo ""

# Check for V2-specific features
HAS_REASONING=$(echo "$V2_RESPONSE" | python -c "import sys, json; print('✅' if 'reasoning' in json.load(sys.stdin) else '❌')")
HAS_GRAPH=$(echo "$V2_RESPONSE" | python -c "import sys, json; print('✅' if 'codeGraph' in json.load(sys.stdin) else '❌')")
HAS_RECS=$(echo "$V2_RESPONSE" | python -c "import sys, json; print('✅' if 'recommendations' in json.load(sys.stdin) else '❌')")

echo "🎯 V2 Features:"
echo "  - Reasoning: $HAS_REASONING"
echo "  - Code Graph: $HAS_GRAPH"
echo "  - Recommendations: $HAS_RECS"
echo ""

echo "✅ Test complete!"
echo ""
echo "💡 To run both servers:"
echo "  Terminal 1: npm start        # V1 on port 3456"
echo "  Terminal 2: npm run start:v2 # V2 on port 3457"

