#!/bin/bash

# Migration script to apply optimizations
# Usage: ./scripts/migrate-to-optimized.sh

echo "🚀 Starting migration to optimized build..."

# Backup original files
echo "📦 Creating backups..."
cp src/App.tsx src/App.tsx.backup
cp vite.config.ts vite.config.ts.backup
cp package.json package.json.backup

# Copy optimized files
echo "📝 Applying optimizations..."
cp src/App.optimized.tsx src/App.tsx
cp vite.config.optimized.ts vite.config.ts

# Install new dependencies
echo "📥 Installing dependencies..."
npm install express compression --save
npm install @types/express @types/compression rollup-plugin-visualizer terser --save-dev

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Install PM2 globally (if not already installed)
echo "🔧 Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
else
    echo "PM2 already installed"
fi

echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Review the changes in src/App.tsx and vite.config.ts"
echo "2. Test the build: npm run build"
echo "3. Start with PM2: npm run start:pm2"
echo ""
echo "To revert:"
echo "cp src/App.tsx.backup src/App.tsx"
echo "cp vite.config.ts.backup vite.config.ts"
echo "cp package.json.backup package.json"
