# Quick Start Guide - Performance Optimizations

## 🚀 Quick Deployment Steps

### 1. Install Dependencies

```bash
# Install new dependencies
npm install express compression --save
npm install @types/express @types/compression rollup-plugin-visualizer terser --save-dev

# Install PM2 globally (if not already installed)
npm install -g pm2
```

### 2. Apply Optimizations

**Option A: Use Migration Script (Recommended)**
```bash
chmod +x scripts/migrate-to-optimized.sh
./scripts/migrate-to-optimized.sh
```

**Option B: Manual Migration**
```bash
# Backup original files
cp src/App.tsx src/App.tsx.backup
cp vite.config.ts vite.config.ts.backup

# Apply optimizations
cp src/App.optimized.tsx src/App.tsx
cp vite.config.optimized.ts vite.config.ts
```

### 3. Build Production Bundle

```bash
# Standard build
npm run build

# Production build with optimizations
npm run build:prod

# Build with bundle analyzer (optional)
npm run build:analyze
```

### 4. Start with PM2

```bash
# Create logs directory
mkdir -p logs

# Start application
npm run start:pm2

# Or directly
pm2 start ecosystem.config.js --env production
```

### 5. Verify Deployment

```bash
# Check status
pm2 status

# View logs
npm run logs:pm2

# Monitor in real-time
npm run monit:pm2

# Test health endpoint
curl http://localhost:3000/health
```

## 📊 Performance Testing

### Run Lighthouse Audit

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html

# Open report
open lighthouse-report.html
```

### Check Bundle Size

```bash
# Build with analyzer
npm run build:analyze

# Check dist folder size
du -sh dist/
```

## 🔧 Common Commands

```bash
# Development
npm run dev

# Production build
npm run build:prod

# Start server (Node.js)
npm start

# PM2 Management
npm run start:pm2    # Start
npm run stop:pm2     # Stop
npm run restart:pm2  # Restart
npm run reload:pm2   # Zero-downtime reload
npm run logs:pm2     # View logs
npm run monit:pm2    # Monitor

# Deploy (build + reload)
npm run deploy
```

## 📝 Environment Variables

Create `.env` file:
```env
NODE_ENV=production
PORT=3000
API_URL=http://your-api-url:8000
```

## 🐛 Troubleshooting

### PM2 not found
```bash
npm install -g pm2
```

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in ecosystem.config.js
```

### Build fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist .vite
npm install
npm run build
```

### Application crashes
```bash
# Check logs
pm2 logs dentc-frontend --err

# Check memory
pm2 monit

# Restart
pm2 restart dentc-frontend
```

## 📚 Documentation

- Full deployment guide: `DEPLOYMENT.md`
- Performance details: `PERFORMANCE_OPTIMIZATION.md`
- PM2 config: `ecosystem.config.js`

## ✅ Verification Checklist

- [ ] Dependencies installed
- [ ] Optimizations applied
- [ ] Production build successful
- [ ] PM2 started successfully
- [ ] Health endpoint responding
- [ ] Application accessible on port 3000
- [ ] Logs directory created
- [ ] Environment variables set

## 🎯 Expected Results

After optimization:
- ✅ Initial bundle size: < 500KB (was ~2.5MB)
- ✅ First Contentful Paint: < 1.8s (was ~3.5s)
- ✅ Time to Interactive: < 3.8s (was ~5.2s)
- ✅ Lighthouse Score: 85-95 (was 45-55)
