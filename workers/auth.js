// Cloudflare Worker for Authentication
// This worker handles user authentication, registration, and session management

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Environment',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    try {
      // Route handling for multiple services
      if (path.startsWith('/auth/')) {
        return await handleAuthRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith('/research/')) {
        return await handleResearchRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith('/service/')) {
        return await handleServiceRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith('/documents/')) {
        return await handleDocumentRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith('/notifications/')) {
        return await handleNotificationRoutes(request, env, path, corsHeaders);
      } else if (path === '/health') {
        return new Response(
          JSON.stringify({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: ['auth', 'research', 'service', 'documents', 'notifications']
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal server error',
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};

// Handle auth routes
async function handleAuthRoutes(request, env, path, corsHeaders) {
  let response;

  switch (path) {
    case '/auth/login':
      response = await handleLogin(request, env);
      break;
    case '/auth/register':
      response = await handleRegister(request, env);
      break;
    case '/auth/logout':
      response = await handleLogout(request, env);
      break;
    case '/auth/verify':
      response = await handleVerifyToken(request, env);
      break;
    case '/auth/refresh':
      response = await handleRefreshToken(request, env);
      break;
    default:
      response = new Response('Not Found', { status: 404 });
  }

  // Add CORS headers to response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Handle user login
async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { email, password } = await request.json();

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: 'Email and password are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Query user from D1 database
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE email = ? AND is_active = 1'
  ).bind(email).first();

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Invalid credentials' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify password (in production, use proper password hashing)
  const isValidPassword = await verifyPassword(password, user.password_hash);
  
  if (!isValidPassword) {
    return new Response(
      JSON.stringify({ error: 'Invalid credentials' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Generate JWT token
  const token = await generateJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  }, env.JWT_SECRET);

  // Update last login
  await env.DB.prepare(
    'UPDATE users SET last_login = datetime("now") WHERE id = ?'
  ).bind(user.id).run();

  return new Response(
    JSON.stringify({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        institution: user.institution
      }
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Handle user registration
async function handleRegister(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { email, password, name, role, department, institution } = await request.json();

  if (!email || !password || !name || !role) {
    return new Response(
      JSON.stringify({ error: 'Required fields missing' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check if user already exists
  const existingUser = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();

  if (existingUser) {
    return new Response(
      JSON.stringify({ error: 'User already exists' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Insert new user
  const result = await env.DB.prepare(`
    INSERT INTO users (email, password_hash, name, role, department, institution, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `).bind(email, passwordHash, name, role, department, institution).run();

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Failed to create user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'User created successfully',
      userId: result.meta.last_row_id
    }),
    { 
      status: 201, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Handle logout
async function handleLogout(request, env) {
  // In a stateless JWT system, logout is handled client-side
  // But we can add token to blacklist if needed
  return new Response(
    JSON.stringify({ success: true, message: 'Logged out successfully' }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Verify JWT token
async function handleVerifyToken(request, env) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'No token provided' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.substring(7);
  
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: payload 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Handle token refresh
async function handleRefreshToken(request, env) {
  // Implementation for token refresh logic
  return new Response(
    JSON.stringify({ message: 'Token refresh not implemented yet' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } }
  );
}

// Utility functions
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

async function generateJWT(payload, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60) // 24 hours
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signature = await sign(`${encodedHeader}.${encodedPayload}`, secret);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [header, payload, signature] = parts;
  const expectedSignature = await sign(`${header}.${payload}`, secret);
  
  if (signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }

  const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  
  if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return decodedPayload;
}

async function sign(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Placeholder handlers for other services
async function handleResearchRoutes(request, env, path, corsHeaders) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Research service not implemented yet',
      message: 'This endpoint will be implemented in the next phase'
    }),
    {
      status: 501,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

async function handleServiceRoutes(request, env, path, corsHeaders) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Community service not implemented yet',
      message: 'This endpoint will be implemented in the next phase'
    }),
    {
      status: 501,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

async function handleDocumentRoutes(request, env, path, corsHeaders) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Document service not implemented yet',
      message: 'This endpoint will be implemented in the next phase'
    }),
    {
      status: 501,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

async function handleNotificationRoutes(request, env, path, corsHeaders) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Notification service not implemented yet',
      message: 'This endpoint will be implemented in the next phase'
    }),
    {
      status: 501,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}