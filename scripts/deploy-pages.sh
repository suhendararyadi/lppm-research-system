#!/bin/bash

# LPPM Research System - Cloudflare Pages Deployment Script
# This script builds and deploys the frontend to Cloudflare Pages

set -e

echo "🚀 Starting LPPM Research System deployment to Cloudflare Pages..."

# Build the application for production
echo "📦 Building application for production..."
NODE_ENV=production npm run build

# Deploy to Cloudflare Pages
echo "🌐 Deploying to Cloudflare Pages..."
wrangler pages deploy out --project-name lppm-research-system --commit-dirty=true

echo "✅ Deployment completed successfully!"
echo "🔗 Your application is available at: https://lppm-research-system.pages.dev"
echo ""
echo "📝 Next steps:"
echo "1. Configure environment variables in Cloudflare Dashboard"
echo "2. Set up custom domain (optional)"
echo "3. Configure CI/CD pipeline (optional)"
echo ""
echo "🔧 Environment Variables to set in Cloudflare Dashboard:"
echo "   - NEXT_PUBLIC_AUTH_WORKER_URL: https://lppm-research-system.suhendararyadi.workers.dev"
echo "   - NEXT_PUBLIC_RESEARCH_WORKER_URL: https://lppm-research-system.suhendararyadi.workers.dev"
echo "   - NEXT_PUBLIC_SERVICE_WORKER_URL: https://lppm-research-system.suhendararyadi.workers.dev"
echo "   - NEXT_PUBLIC_DOCUMENTS_WORKER_URL: https://lppm-research-system.suhendararyadi.workers.dev"
echo "   - NEXT_PUBLIC_NOTIFICATIONS_WORKER_URL: https://lppm-research-system.suhendararyadi.workers.dev"
echo "   - NEXT_PUBLIC_ENVIRONMENT: production"
echo "   - NEXT_PUBLIC_MOCK_DATA: false"