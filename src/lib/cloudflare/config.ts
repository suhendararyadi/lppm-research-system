// Cloudflare Configuration
export const cloudflareConfig = {
  // Worker endpoints
  workerUrl: process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 'https://your-worker.your-subdomain.workers.dev',
  
  // API endpoints
  apiEndpoints: {
    auth: '/api/auth',
    users: '/api/users',
    research: '/api/research',
    service: '/api/service',
    documents: '/api/documents',
    analytics: '/api/analytics',
    notifications: '/api/notifications'
  },
  
  // File upload configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ]
  },
  
  // Pagination defaults
  pagination: {
    defaultLimit: 10,
    maxLimit: 100
  }
};

// Environment variables validation
export const validateEnv = () => {
  const requiredEnvVars = [
    'NEXT_PUBLIC_CLOUDFLARE_WORKER_URL',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_API_TOKEN'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('Missing environment variables:', missingVars);
  }
  
  return missingVars.length === 0;
};