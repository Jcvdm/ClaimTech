FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Create directories
RUN mkdir -p db contexts cache

# Expose port
EXPOSE 3456

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3456/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start
CMD ["npm", "start"]

