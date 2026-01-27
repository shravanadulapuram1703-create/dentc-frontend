# Frontend Deployment Guide

## Performance Optimizations Implemented

### 1. Code Splitting & Lazy Loading
- All route components are lazy-loaded using `React.lazy()`
- Reduces initial bundle size by ~60-70%
- Components load on-demand when routes are accessed

### 2. API Optimization
- **Caching**: In-memory cache with TTL (5 minutes default)
- **Debouncing**: Prevents excessive API calls on user input
- **Request Batching**: Groups multiple requests into batches

### 3. Memoization
- Components wrapped with `React.memo()` to prevent unnecessary re-renders
- `useMemo` and `useCallback` hooks for expensive computations

### 4. Build Optimizations
- Manual chunk splitting for better caching
- Terser minification with console.log removal
- Asset optimization (images, fonts)
- Source maps disabled in production

### 5. Server-Side Optimizations
- Gzip/Brotli compression
- Aggressive caching for static assets
- Security headers
- Health check endpoint

## Prerequisites

```bash
# Install Node.js (v18+ recommended)
node --version

# Install PM2 globally
npm install -g pm2

# Install dependencies
npm install
```

## Build Steps

### 1. Development Build
```bash
npm run dev
```

### 2. Production Build
```bash
# Standard build
npm run build

# Production build with environment
npm run build:prod

# Build with bundle analyzer
npm run build:analyze
```

### 3. Preview Production Build
```bash
npm run preview
```

## PM2 Deployment

### Initial Setup

1. **Create logs directory**
```bash
mkdir -p logs
```

2. **Install production dependencies**
```bash
npm install --production
```

3. **Build the application**
```bash
npm run build:prod
```

### PM2 Commands

#### Start Application
```bash
# Start with production environment
npm run start:pm2

# Or directly
pm2 start ecosystem.config.js --env production

# Start with specific number of instances
pm2 start ecosystem.config.js --env production -i 4
```

#### Monitor Application
```bash
# View logs
npm run logs:pm2
# Or
pm2 logs dentc-frontend

# Monitor in real-time
npm run monit:pm2
# Or
pm2 monit

# View status
pm2 status

# View detailed info
pm2 describe dentc-frontend
```

#### Manage Application
```bash
# Stop application
npm run stop:pm2
# Or
pm2 stop dentc-frontend

# Restart application
npm run restart:pm2
# Or
pm2 restart dentc-frontend

# Reload (zero-downtime)
npm run reload:pm2
# Or
pm2 reload dentc-frontend

# Delete from PM2
npm run delete:pm2
# Or
pm2 delete dentc-frontend
```

#### Update Application
```bash
# Pull latest code, rebuild, and reload
git pull
npm install
npm run build:prod
npm run reload:pm2

# Or use the deploy script
npm run deploy
```

### PM2 Configuration

The `ecosystem.config.js` file contains:
- **Instances**: 2 (adjust based on CPU cores)
- **Memory limit**: 1GB (auto-restart if exceeded)
- **Logging**: Separate error and output logs
- **Auto-restart**: Enabled with delay
- **Graceful shutdown**: 5 second timeout

### Environment Variables

Create a `.env` file in the root directory:
```env
NODE_ENV=production
PORT=3000
API_URL=http://your-api-url:8000
```

## Nginx Configuration (Optional)

If using Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Proxy to PM2
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Performance Monitoring

### Before/After Metrics

Run Lighthouse audit:
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html
```

### Key Metrics to Track

1. **First Contentful Paint (FCP)**: < 1.8s
2. **Largest Contentful Paint (LCP)**: < 2.5s
3. **Time to Interactive (TTI)**: < 3.8s
4. **Total Blocking Time (TBT)**: < 200ms
5. **Cumulative Layout Shift (CLS)**: < 0.1
6. **Bundle Size**: < 500KB (initial)

### Web Vitals

Monitor Core Web Vitals:
- Use Chrome DevTools Performance tab
- Use Lighthouse CI for automated testing
- Integrate with Google Analytics for real user metrics

## Troubleshooting

### PM2 Issues

**Application not starting:**
```bash
# Check logs
pm2 logs dentc-frontend --err

# Check if port is in use
lsof -i :3000

# Restart PM2 daemon
pm2 kill
pm2 resurrect
```

**High memory usage:**
```bash
# Check memory
pm2 monit

# Adjust memory limit in ecosystem.config.js
max_memory_restart: '2G'
```

**Application crashes:**
```bash
# View error logs
pm2 logs dentc-frontend --err

# Check system resources
pm2 status
htop
```

### Build Issues

**Build fails:**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

**Large bundle size:**
```bash
# Analyze bundle
npm run build:analyze

# Check for duplicate dependencies
npm ls --depth=0
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Production build tested locally
- [ ] PM2 configuration verified
- [ ] Logs directory created
- [ ] Health check endpoint working
- [ ] Compression enabled
- [ ] Security headers configured
- [ ] Caching strategy verified
- [ ] Error monitoring set up
- [ ] Performance metrics baseline established

## Maintenance

### Daily
- Monitor PM2 logs for errors
- Check application health endpoint

### Weekly
- Review performance metrics
- Check bundle size trends
- Update dependencies (security patches)

### Monthly
- Full dependency audit
- Performance optimization review
- Backup configuration files

## Support

For issues or questions:
1. Check PM2 logs: `pm2 logs`
2. Review application logs in `./logs/`
3. Check system resources: `pm2 monit`
4. Verify environment variables
5. Test health endpoint: `curl http://localhost:3000/health`
