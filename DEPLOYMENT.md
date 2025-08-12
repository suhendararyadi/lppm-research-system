# LPPM Research System - Deployment Guide

## Overview

Sistem LPPM Research telah berhasil di-deploy ke Cloudflare dengan arsitektur sebagai berikut:

- **Frontend**: Next.js aplikasi di-deploy ke Cloudflare Pages
- **Backend**: Cloudflare Workers untuk API endpoints
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV untuk caching

## URLs Produksi

- **Frontend**: https://lppm-research-system.pages.dev
- **Backend API**: https://lppm-research-system.suhendararyadi.workers.dev
- **Health Check**: https://lppm-research-system.suhendararyadi.workers.dev/health

## Deployment Frontend ke Cloudflare Pages

### Metode 1: Menggunakan Script Otomatis

```bash
# Jalankan script deployment
./scripts/deploy-pages.sh
```

### Metode 2: Manual Deployment

```bash
# 1. Build aplikasi untuk produksi
NODE_ENV=production npm run build

# 2. Deploy ke Cloudflare Pages
wrangler pages deploy out --project-name lppm-research-system
```

### Metode 3: Menggunakan NPM Scripts

```bash
# Build produksi
npm run build:prod

# Deploy ke Pages
npm run pages:deploy
```

## Environment Variables

### Frontend (Cloudflare Pages)

Set environment variables berikut di Cloudflare Dashboard > Pages > lppm-research-system > Settings > Environment variables:

```
NEXT_PUBLIC_AUTH_WORKER_URL=https://lppm-research-system.suhendararyadi.workers.dev
NEXT_PUBLIC_RESEARCH_WORKER_URL=https://lppm-research-system.suhendararyadi.workers.dev
NEXT_PUBLIC_SERVICE_WORKER_URL=https://lppm-research-system.suhendararyadi.workers.dev
NEXT_PUBLIC_DOCUMENTS_WORKER_URL=https://lppm-research-system.suhendararyadi.workers.dev
NEXT_PUBLIC_NOTIFICATIONS_WORKER_URL=https://lppm-research-system.suhendararyadi.workers.dev
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_MOCK_DATA=false
```

### Backend (Cloudflare Workers)

Environment variables sudah dikonfigurasi di `wrangler.toml`:

- **D1 Database**: `lppm-research-db`
- **KV Storage**: untuk caching
- **JWT Secret**: untuk authentication

## Database Setup

Database D1 sudah dikonfigurasi dengan:

- **Database Name**: `lppm-research-db`
- **Tables**: `users`, `research_proposals`, `community_services`, dll.
- **Admin User**: `admin@lppm.ac.id` / `admin123`

## Akses Dashboard Cloudflare

1. **Cloudflare Dashboard**: https://dash.cloudflare.com
2. **Workers & Pages**: https://dash.cloudflare.com/workers-and-pages
3. **D1 Database**: https://dash.cloudflare.com/d1
4. **KV Storage**: https://dash.cloudflare.com/kv

## Monitoring & Logs

### Workers Logs
```bash
# Lihat logs Workers
wrangler tail lppm-research-system
```

### Pages Logs
```bash
# Lihat deployment logs
wrangler pages deployment list --project-name lppm-research-system
```

## Custom Domain (Opsional)

### Untuk Pages
1. Buka Cloudflare Dashboard > Pages > lppm-research-system
2. Pilih tab "Custom domains"
3. Tambahkan domain custom Anda
4. Ikuti instruksi DNS setup

### Untuk Workers
1. Buka Cloudflare Dashboard > Workers & Pages > lppm-research-system
2. Pilih tab "Triggers"
3. Tambahkan custom domain atau route

## CI/CD Setup (Opsional)

### GitHub Actions

Buat file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build:prod
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy out --project-name lppm-research-system
```

## Troubleshooting

### Build Errors
- Pastikan semua dependencies terinstall: `npm ci`
- Check TypeScript errors: `npm run lint`
- Rebuild: `rm -rf .next out && npm run build:prod`

### Deployment Errors
- Pastikan Wrangler sudah login: `wrangler auth login`
- Check project exists: `wrangler pages project list`
- Verify file permissions: `chmod +x scripts/deploy-pages.sh`

### Runtime Errors
- Check Workers logs: `wrangler tail lppm-research-system`
- Verify environment variables di dashboard
- Test API endpoints: `curl https://lppm-research-system.suhendararyadi.workers.dev/health`

## Backup & Recovery

### Database Backup
```bash
# Export database
wrangler d1 export lppm-research-db --output backup.sql

# Import database
wrangler d1 execute lppm-research-db --file backup.sql
```

### Code Backup
- Repository sudah ada di local
- Pertimbangkan setup Git repository untuk version control

## Security Considerations

1. **Environment Variables**: Jangan commit secrets ke repository
2. **API Keys**: Gunakan Cloudflare API tokens dengan scope minimal
3. **CORS**: Sudah dikonfigurasi untuk domain yang tepat
4. **Authentication**: JWT tokens dengan expiration
5. **Database**: D1 database sudah secured by default

## Performance Optimization

1. **Caching**: KV storage untuk cache API responses
2. **CDN**: Cloudflare CDN otomatis untuk static assets
3. **Compression**: Gzip compression enabled
4. **Image Optimization**: Disabled untuk static export

## Support

Untuk bantuan deployment:
1. Check dokumentasi Cloudflare: https://developers.cloudflare.com
2. Cloudflare Community: https://community.cloudflare.com
3. Wrangler CLI docs: https://developers.cloudflare.com/workers/wrangler/