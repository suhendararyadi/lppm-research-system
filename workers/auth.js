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
      } else if (path.startsWith('/users/')) {
        return await handleUserRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith('/program-studi/')) {
        return await handleProgramStudiRoutes(request, env, path, corsHeaders);
      } else if (path === '/health') {
        return new Response(
          JSON.stringify({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: ['auth', 'research', 'service', 'documents', 'notifications', 'users', 'program-studi']
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

// User CRUD Routes
async function handleUserRoutes(request, env, path, corsHeaders) {
  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  
  // Verify authentication for all user routes
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ success: false, message: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.substring(7);
  let user;
  try {
    user = await verifyJWT(token, env.JWT_SECRET);
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: 'Invalid token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check permissions - allow lecturers for statistics endpoint only
  console.log('User role:', user.role, 'User data:', user);
  const isStatisticsEndpoint = method === 'GET' && pathParts.length === 2 && pathParts[1] === 'statistics';
  
  if (!['super_admin', 'lppm_admin', 'admin', 'lecturer'].includes(user.role)) {
    return new Response(
      JSON.stringify({ success: false, message: 'Insufficient permissions', userRole: user.role }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  // For non-statistics endpoints, only allow admin roles
  if (!isStatisticsEndpoint && !['super_admin', 'lppm_admin', 'admin'].includes(user.role)) {
    return new Response(
      JSON.stringify({ success: false, message: 'Insufficient permissions', userRole: user.role }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    if (method === 'GET' && pathParts.length === 1) {
      // GET /users - List users with pagination and filtering
      return await handleGetUsers(request, env, corsHeaders);
    } else if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'statistics') {
      // GET /users/statistics - Get user statistics
      return await handleGetUserStatistics(request, env, corsHeaders);
    } else if (method === 'GET' && pathParts.length === 2) {
      // GET /users/:id - Get specific user
      const userId = pathParts[1];
      return await handleGetUser(userId, env, corsHeaders);
    } else if (method === 'POST' && pathParts.length === 1) {
      // POST /users - Create new user
      return await handleCreateUser(request, env, corsHeaders);
    } else if (method === 'PUT' && pathParts.length === 2) {
      // PUT /users/:id - Update user
      const userId = pathParts[1];
      return await handleUpdateUser(userId, request, env, corsHeaders);
    } else if (method === 'DELETE' && pathParts.length === 2) {
      // DELETE /users/:id - Delete user
      const userId = pathParts[1];
      return await handleDeleteUser(userId, env, corsHeaders);
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Route not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in user routes:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Program Studi Routes
async function handleProgramStudiRoutes(request, env, path, corsHeaders) {
  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  
  try {
    if (method === 'GET' && pathParts.length === 1) {
      // GET /program-studi - List all program studi
      return await handleGetProgramStudi(env, corsHeaders);
    } else if (method === 'POST' && pathParts.length === 1) {
      // POST /program-studi - Create new program studi (admin only)
      return await handleCreateProgramStudi(request, env, corsHeaders);
    } else if (method === 'PUT' && pathParts.length === 2) {
      // PUT /program-studi/:id - Update program studi (admin only)
      const programId = pathParts[1];
      return await handleUpdateProgramStudi(programId, request, env, corsHeaders);
    } else if (method === 'DELETE' && pathParts.length === 2) {
      // DELETE /program-studi/:id - Delete program studi (admin only)
      const programId = pathParts[1];
      return await handleDeleteProgramStudi(programId, env, corsHeaders);
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Route not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in program studi routes:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// User CRUD Handlers
async function handleGetUsers(request, env, corsHeaders) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const search = url.searchParams.get('search') || '';
  const role = url.searchParams.get('role') || '';
  const program_studi = url.searchParams.get('program_studi') || '';
  const is_active = url.searchParams.get('is_active');
  
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM users WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
  const params = [];
  
  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ?)';
    countQuery += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (role) {
    query += ' AND role = ?';
    countQuery += ' AND role = ?';
    params.push(role);
  }
  
  if (program_studi) {
    query += ' AND program_studi = ?';
    countQuery += ' AND program_studi = ?';
    params.push(program_studi);
  }
  
  if (is_active !== null && is_active !== undefined && is_active !== '') {
    query += ' AND is_active = ?';
    countQuery += ' AND is_active = ?';
    params.push(is_active === 'true' ? 1 : 0);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  
  try {
    const [usersResult, countResult] = await Promise.all([
      env.DB.prepare(query).bind(...params, limit, offset).all(),
      env.DB.prepare(countQuery).bind(...params).first()
    ]);
    
    const users = usersResult.results.map(user => ({
      ...user,
      is_active: Boolean(user.is_active),
      email_verified: Boolean(user.email_verified)
    }));
    
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          data: users,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error getting users:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to get users' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleGetUser(userId, env, corsHeaders) {
  try {
    const result = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
    
    if (!result) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const user = {
      ...result,
      is_active: Boolean(result.is_active),
      email_verified: Boolean(result.email_verified)
    };
    
    return new Response(
      JSON.stringify({ success: true, data: user }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error getting user:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to get user' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleCreateUser(request, env, corsHeaders) {
  try {
    const userData = await request.json();
    
    // Validate required fields
    if (!userData.email || !userData.password || !userData.name || !userData.role) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if email already exists
    const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(userData.email).first();
    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, message: 'Email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Hash password
    const hashedPassword = await hashPassword(userData.password);
    
    // Generate user ID
    const userId = crypto.randomUUID();
    
    // Prepare user data
    const now = new Date().toISOString();
    const expertiseJson = userData.expertise ? JSON.stringify(userData.expertise) : null;
    
    // Insert user
    await env.DB.prepare(`
      INSERT INTO users (
        id, email, password_hash, name, role, department, institution, phone, address, expertise,
        nidn, nuptk, nim, program_studi, status_kepegawaian, jabatan_fungsional, 
        pendidikan_terakhir, tahun_masuk, is_active, email_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      userData.email,
      hashedPassword,
      userData.name,
      userData.role,
      userData.department || null,
      userData.institution || null,
      userData.phone || null,
      userData.address || null,
      expertiseJson,
      userData.nidn || null,
      userData.nuptk || null,
      userData.nim || null,
      userData.program_studi || null,
      userData.status_kepegawaian || null,
      userData.jabatan_fungsional || null,
      userData.pendidikan_terakhir || null,
      userData.tahun_masuk || null,
      1, // is_active = true
      0, // email_verified = false
      now,
      now
    ).run();
    
    return new Response(
      JSON.stringify({ success: true, message: 'User created successfully', data: { id: userId } }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to create user' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleUpdateUser(userId, request, env, corsHeaders) {
  try {
    const userData = await request.json();
    
    // Check if user exists
    const existingUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
    if (!existingUser) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build update query dynamically
    const updateFields = [];
    const params = [];
    
    if (userData.name !== undefined) {
      updateFields.push('name = ?');
      params.push(userData.name);
    }
    if (userData.email !== undefined) {
      updateFields.push('email = ?');
      params.push(userData.email);
    }
    if (userData.role !== undefined) {
      updateFields.push('role = ?');
      params.push(userData.role);
    }
    if (userData.department !== undefined) {
      updateFields.push('department = ?');
      params.push(userData.department);
    }
    if (userData.institution !== undefined) {
      updateFields.push('institution = ?');
      params.push(userData.institution);
    }
    if (userData.phone !== undefined) {
      updateFields.push('phone = ?');
      params.push(userData.phone);
    }
    if (userData.address !== undefined) {
      updateFields.push('address = ?');
      params.push(userData.address);
    }
    if (userData.expertise !== undefined) {
      updateFields.push('expertise = ?');
      params.push(userData.expertise ? JSON.stringify(userData.expertise) : null);
    }
    if (userData.nidn !== undefined) {
      updateFields.push('nidn = ?');
      params.push(userData.nidn);
    }
    if (userData.nuptk !== undefined) {
      updateFields.push('nuptk = ?');
      params.push(userData.nuptk);
    }
    if (userData.nim !== undefined) {
      updateFields.push('nim = ?');
      params.push(userData.nim);
    }
    if (userData.program_studi !== undefined) {
      updateFields.push('program_studi = ?');
      params.push(userData.program_studi);
    }
    if (userData.status_kepegawaian !== undefined) {
      updateFields.push('status_kepegawaian = ?');
      params.push(userData.status_kepegawaian);
    }
    if (userData.jabatan_fungsional !== undefined) {
      updateFields.push('jabatan_fungsional = ?');
      params.push(userData.jabatan_fungsional);
    }
    if (userData.pendidikan_terakhir !== undefined) {
      updateFields.push('pendidikan_terakhir = ?');
      params.push(userData.pendidikan_terakhir);
    }
    if (userData.tahun_masuk !== undefined) {
      updateFields.push('tahun_masuk = ?');
      params.push(userData.tahun_masuk);
    }
    if (userData.is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(userData.is_active ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No fields to update' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    updateFields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(userId);
    
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await env.DB.prepare(query).bind(...params).run();
    
    return new Response(
      JSON.stringify({ success: true, message: 'User updated successfully' }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error updating user:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to update user' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleDeleteUser(userId, env, corsHeaders) {
  try {
    // Check if user exists
    const existingUser = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
    if (!existingUser) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Delete user
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
    
    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to delete user' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Program Studi Handlers
async function handleGetProgramStudi(env, corsHeaders) {
  try {
    const result = await env.DB.prepare('SELECT * FROM program_studi WHERE is_active = 1 ORDER BY fakultas, nama').all();
    
    const programStudi = result.results.map(program => ({
      ...program,
      is_active: Boolean(program.is_active)
    }));
    
    return new Response(
      JSON.stringify({ success: true, data: programStudi }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error getting program studi:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to get program studi' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleCreateProgramStudi(request, env, corsHeaders) {
  // Admin authentication check would be here
  try {
    const programData = await request.json();
    
    if (!programData.kode || !programData.nama || !programData.fakultas || !programData.jenjang) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const programId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await env.DB.prepare(`
      INSERT INTO program_studi (id, kode, nama, fakultas, jenjang, akreditasi, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      programId,
      programData.kode,
      programData.nama,
      programData.fakultas,
      programData.jenjang,
      programData.akreditasi || null,
      1,
      now,
      now
    ).run();
    
    return new Response(
      JSON.stringify({ success: true, message: 'Program studi created successfully', data: { id: programId } }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating program studi:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to create program studi' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleUpdateProgramStudi(programId, request, env, corsHeaders) {
  // Admin authentication check would be here
  try {
    const programData = await request.json();
    
    const existingProgram = await env.DB.prepare('SELECT id FROM program_studi WHERE id = ?').bind(programId).first();
    if (!existingProgram) {
      return new Response(
        JSON.stringify({ success: false, message: 'Program studi not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const updateFields = [];
    const params = [];
    
    if (programData.kode !== undefined) {
      updateFields.push('kode = ?');
      params.push(programData.kode);
    }
    if (programData.nama !== undefined) {
      updateFields.push('nama = ?');
      params.push(programData.nama);
    }
    if (programData.fakultas !== undefined) {
      updateFields.push('fakultas = ?');
      params.push(programData.fakultas);
    }
    if (programData.jenjang !== undefined) {
      updateFields.push('jenjang = ?');
      params.push(programData.jenjang);
    }
    if (programData.akreditasi !== undefined) {
      updateFields.push('akreditasi = ?');
      params.push(programData.akreditasi);
    }
    if (programData.is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(programData.is_active ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No fields to update' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    updateFields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(programId);
    
    const query = `UPDATE program_studi SET ${updateFields.join(', ')} WHERE id = ?`;
    await env.DB.prepare(query).bind(...params).run();
    
    return new Response(
      JSON.stringify({ success: true, message: 'Program studi updated successfully' }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error updating program studi:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to update program studi' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleDeleteProgramStudi(programId, env, corsHeaders) {
  // Admin authentication check would be here
  try {
    const existingProgram = await env.DB.prepare('SELECT id FROM program_studi WHERE id = ?').bind(programId).first();
    if (!existingProgram) {
      return new Response(
        JSON.stringify({ success: false, message: 'Program studi not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Soft delete by setting is_active to false
    await env.DB.prepare('UPDATE program_studi SET is_active = 0, updated_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), programId).run();
    
    return new Response(
      JSON.stringify({ success: true, message: 'Program studi deleted successfully' }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error deleting program studi:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to delete program studi' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Get user statistics
async function handleGetUserStatistics(request, env, corsHeaders) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyJWT(token, env.JWT_SECRET);
    if (!decoded) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to view statistics
    // Allow lecturers, admins, lppm_admin, and super_admin
    const allowedRoles = ['lecturer', 'admin', 'lppm_admin', 'super_admin'];
    if (!allowedRoles.includes(decoded.role)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Insufficient permissions',
          userRole: decoded.role 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN role = 'lecturer' THEN 1 END) as lecturers,
        COUNT(CASE WHEN role = 'student' THEN 1 END) as students,
        COUNT(CASE WHEN role IN ('admin', 'lppm_admin', 'super_admin') THEN 1 END) as admins,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_users
      FROM users
    `).first();
    
    return new Response(
      JSON.stringify({
        success: true,
        data: stats
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error getting user statistics:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to get user statistics' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}