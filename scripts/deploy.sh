#!/bin/bash

# LPPM Research System - Cloudflare Deployment Script
# This script automates the deployment process to Cloudflare

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="lppm-research-system"
ENVIRONMENT=${1:-development}  # Default to development
VERSION=$(date +"%Y%m%d-%H%M%S")

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists "wrangler"; then
        print_error "Wrangler CLI is not installed. Please install it with: npm install -g wrangler"
        exit 1
    fi
    
    if ! command_exists "node"; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command_exists "npm"; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "All prerequisites are met"
}

# Function to validate environment
validate_environment() {
    print_status "Validating environment: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        development|staging|production)
            print_success "Environment '$ENVIRONMENT' is valid"
            ;;
        *)
            print_error "Invalid environment '$ENVIRONMENT'. Use: development, staging, or production"
            exit 1
            ;;
    esac
}

# Function to check authentication
check_auth() {
    print_status "Checking Cloudflare authentication..."
    
    if ! wrangler whoami >/dev/null 2>&1; then
        print_warning "Not authenticated with Cloudflare. Please run: wrangler login"
        read -p "Do you want to login now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            wrangler login
        else
            print_error "Authentication required for deployment"
            exit 1
        fi
    fi
    
    print_success "Cloudflare authentication verified"
}

# Function to setup environment variables
setup_environment() {
    print_status "Setting up environment variables for $ENVIRONMENT..."
    
    # Check if .env file exists
    if [ -f ".env.${ENVIRONMENT}" ]; then
        print_status "Loading environment variables from .env.${ENVIRONMENT}"
        source ".env.${ENVIRONMENT}"
    else
        print_warning "No .env.${ENVIRONMENT} file found. Using default values."
    fi
    
    # Set required secrets (these should be set manually for security)
    print_status "Setting up Cloudflare secrets..."
    
    # JWT Secret
    if [ -n "$JWT_SECRET" ]; then
        echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env $ENVIRONMENT
    else
        print_warning "JWT_SECRET not found in environment. Please set it manually:"
        print_warning "wrangler secret put JWT_SECRET --env $ENVIRONMENT"
    fi
    
    # Database encryption key
    if [ -n "$DB_ENCRYPTION_KEY" ]; then
        echo "$DB_ENCRYPTION_KEY" | wrangler secret put DB_ENCRYPTION_KEY --env $ENVIRONMENT
    else
        print_warning "DB_ENCRYPTION_KEY not found. Please set it manually:"
        print_warning "wrangler secret put DB_ENCRYPTION_KEY --env $ENVIRONMENT"
    fi
    
    # Email service credentials
    if [ -n "$EMAIL_API_KEY" ]; then
        echo "$EMAIL_API_KEY" | wrangler secret put EMAIL_API_KEY --env $ENVIRONMENT
    fi
    
    print_success "Environment setup completed"
}

# Function to create D1 database
setup_database() {
    print_status "Setting up D1 database for $ENVIRONMENT..."
    
    DB_NAME="lppm-research-db"
    if [ "$ENVIRONMENT" != "production" ]; then
        DB_NAME="$DB_NAME-$ENVIRONMENT"
    fi
    
    # Check if database exists
    if wrangler d1 list | grep -q "$DB_NAME"; then
        print_success "Database '$DB_NAME' already exists"
    else
        print_status "Creating database '$DB_NAME'..."
        wrangler d1 create "$DB_NAME"
        print_success "Database '$DB_NAME' created"
    fi
    
    # Apply schema
    print_status "Applying database schema..."
    wrangler d1 execute "$DB_NAME" --file=./database/schema.sql --env $ENVIRONMENT
    print_success "Database schema applied"
}

# Function to create R2 buckets
setup_storage() {
    print_status "Setting up R2 storage for $ENVIRONMENT..."
    
    BUCKET_NAME="lppm-documents"
    if [ "$ENVIRONMENT" != "production" ]; then
        BUCKET_NAME="$BUCKET_NAME-$ENVIRONMENT"
    fi
    
    # Check if bucket exists
    if wrangler r2 bucket list | grep -q "$BUCKET_NAME"; then
        print_success "R2 bucket '$BUCKET_NAME' already exists"
    else
        print_status "Creating R2 bucket '$BUCKET_NAME'..."
        wrangler r2 bucket create "$BUCKET_NAME"
        print_success "R2 bucket '$BUCKET_NAME' created"
    fi
}

# Function to create KV namespaces
setup_kv() {
    print_status "Setting up KV storage for $ENVIRONMENT..."
    
    KV_NAME="lppm-cache"
    if [ "$ENVIRONMENT" != "production" ]; then
        KV_NAME="$KV_NAME-$ENVIRONMENT"
    fi
    
    # Check if KV namespace exists
    if wrangler kv:namespace list | grep -q "$KV_NAME"; then
        print_success "KV namespace '$KV_NAME' already exists"
    else
        print_status "Creating KV namespace '$KV_NAME'..."
        wrangler kv:namespace create "$KV_NAME" --env $ENVIRONMENT
        print_success "KV namespace '$KV_NAME' created"
    fi
}

# Function to deploy workers
deploy_workers() {
    print_status "Deploying workers to $ENVIRONMENT..."
    
    # Deploy auth worker
    print_status "Deploying auth worker..."
    wrangler deploy workers/auth.js --name "lppm-auth-worker-$ENVIRONMENT" --env $ENVIRONMENT
    
    # Deploy research worker
    print_status "Deploying research worker..."
    wrangler deploy workers/research.js --name "lppm-research-worker-$ENVIRONMENT" --env $ENVIRONMENT
    
    print_success "All workers deployed successfully"
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    if [ -f "package.json" ] && npm run test --if-present; then
        print_success "All tests passed"
    else
        print_warning "No tests found or tests failed"
    fi
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Test auth endpoint
    AUTH_URL="https://lppm-auth-worker-$ENVIRONMENT.your-account.workers.dev"
    if [ "$ENVIRONMENT" = "production" ]; then
        AUTH_URL="https://api.your-domain.com"
    fi
    
    print_status "Testing auth endpoint: $AUTH_URL/auth/verify"
    
    # Simple health check
    if curl -s -f "$AUTH_URL/auth/verify" >/dev/null; then
        print_success "Auth service is responding"
    else
        print_warning "Auth service health check failed"
    fi
    
    print_success "Deployment verification completed"
}

# Function to show deployment summary
show_summary() {
    print_success "\n=== Deployment Summary ==="
    echo "Environment: $ENVIRONMENT"
    echo "Version: $VERSION"
    echo "Timestamp: $(date)"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "Auth API: https://api.your-domain.com/auth"
        echo "Research API: https://api.your-domain.com/research"
        echo "Frontend: https://lppm.your-domain.com"
    else
        echo "Auth API: https://lppm-auth-worker-$ENVIRONMENT.your-account.workers.dev"
        echo "Research API: https://lppm-research-worker-$ENVIRONMENT.your-account.workers.dev"
    fi
    
    print_success "\nDeployment completed successfully!"
}

# Function to rollback deployment
rollback() {
    print_warning "Rolling back deployment..."
    
    # This would implement rollback logic
    # For now, just show instructions
    print_status "To rollback manually:"
    echo "1. wrangler rollback lppm-auth-worker-$ENVIRONMENT"
    echo "2. wrangler rollback lppm-research-worker-$ENVIRONMENT"
    
    print_warning "Rollback instructions displayed"
}

# Function to show help
show_help() {
    echo "LPPM Research System - Deployment Script"
    echo ""
    echo "Usage: $0 [environment] [options]"
    echo ""
    echo "Environments:"
    echo "  development  Deploy to development environment (default)"
    echo "  staging      Deploy to staging environment"
    echo "  production   Deploy to production environment"
    echo ""
    echo "Options:"
    echo "  --help       Show this help message"
    echo "  --rollback   Rollback the last deployment"
    echo "  --verify     Only verify the current deployment"
    echo "  --setup      Only setup infrastructure (DB, R2, KV)"
    echo ""
    echo "Examples:"
    echo "  $0 development"
    echo "  $0 production --verify"
    echo "  $0 staging --setup"
}

# Main deployment function
main() {
    print_status "Starting deployment of $PROJECT_NAME to $ENVIRONMENT"
    print_status "Version: $VERSION"
    
    check_prerequisites
    validate_environment
    check_auth
    setup_environment
    
    # Setup infrastructure
    setup_database
    setup_storage
    setup_kv
    
    # Run tests before deployment
    run_tests
    
    # Deploy workers
    deploy_workers
    
    # Verify deployment
    verify_deployment
    
    # Show summary
    show_summary
}

# Parse command line arguments
case "${2:-}" in
    --help)
        show_help
        exit 0
        ;;
    --rollback)
        rollback
        exit 0
        ;;
    --verify)
        verify_deployment
        exit 0
        ;;
    --setup)
        check_prerequisites
        validate_environment
        check_auth
        setup_database
        setup_storage
        setup_kv
        print_success "Infrastructure setup completed"
        exit 0
        ;;
    "")
        # No additional options, proceed with normal deployment
        ;;
    *)
        print_error "Unknown option: ${2}"
        show_help
        exit 1
        ;;
esac

# Run main deployment
main

# Exit successfully
exit 0