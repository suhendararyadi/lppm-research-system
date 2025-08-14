// Cloudflare Worker for Research Management
// This worker handles research proposals CRUD operations

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Verify authentication for all requests except OPTIONS
      let user = await verifyAuth(request, env);
      
      // For development mode, create a mock user if no auth provided
      if (!user && env.ENVIRONMENT === 'development') {
        user = {
          id: 1,
          userId: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'lecturer',
          department: 'Computer Science'
        };
      }
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 401, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders 
            } 
          }
        );
      }

      let response;

      // Route handling
      if ((path === '/research/proposals' || path === '/research') && method === 'GET') {
        response = await getProposals(request, env, user);
      } else if ((path === '/research/proposals' || path === '/research') && method === 'POST') {
        response = await createProposal(request, env, user);
      } else if (path.match(/^\/research\/proposals\/\d+$/) && method === 'GET') {
        const id = path.split('/').pop();
        response = await getProposal(id, env, user);
      } else if (path.match(/^\/research\/\d+$/) && method === 'GET') {
        const id = path.split('/').pop();
        response = await getProposal(id, env, user);
      } else if (path.match(/^\/research\/proposals\/\d+$/) && method === 'PUT') {
        const id = path.split('/').pop();
        response = await updateProposal(id, request, env, user);
      } else if (path.match(/^\/research\/\d+$/) && method === 'PUT') {
        const id = path.split('/').pop();
        response = await updateProposal(id, request, env, user);
      } else if (path.match(/^\/research\/proposals\/\d+$/) && method === 'DELETE') {
        const id = path.split('/').pop();
        response = await deleteProposal(id, env, user);
      } else if (path.match(/^\/research\/\d+$/) && method === 'DELETE') {
        const id = path.split('/').pop();
        response = await deleteProposal(id, env, user);
      } else if (path.match(/^\/research\/proposals\/\d+\/submit$/) && method === 'POST') {
        const id = path.split('/')[3];
        response = await submitProposal(id, env, user);
      } else if (path.match(/^\/research\/\d+\/submit$/) && method === 'POST') {
        const id = path.split('/')[2];
        response = await submitProposal(id, env, user);
      } else if (path.match(/^\/research\/proposals\/\d+\/review$/) && method === 'POST') {
        const id = path.split('/')[3];
        response = await reviewProposal(id, request, env, user);
      } else if (path.match(/^\/research\/\d+\/review$/) && method === 'POST') {
        const id = path.split('/')[2];
        response = await reviewProposal(id, request, env, user);
      } else if (path === '/research/statistics' && method === 'GET') {
        response = await getStatistics(env, user);
      } else {
        response = new Response('Not Found', { status: 404 });
      }

      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Research Worker Error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error', message: error.message }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
  },
};

// Get all proposals with filtering and pagination
async function getProposals(request, env, user) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const limit = parseInt(url.searchParams.get('limit')) || 10;
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('search');
  const sortByParam = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  
  // Map frontend sortBy to database column names
  const sortByMapping = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'title': 'title',
    'status': 'status',
    'budget': 'budget'
  };
  
  const sortBy = sortByMapping[sortByParam] || 'created_at';

  const offset = (page - 1) * limit;

  // Build query conditions
  let whereConditions = [];
  let params = [];

  // Role-based filtering
  if (user.role === 'lecturer' || user.role === 'student') {
    whereConditions.push('p.created_by = ?');
    params.push(user.userId);
  }

  if (status) {
    whereConditions.push('p.status = ?');
    params.push(status);
  }

  if (type) {
    whereConditions.push('p.type = ?');
    params.push(type);
  }

  if (search) {
    whereConditions.push('(p.title LIKE ? OR p.abstract LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM research_proposals p
    JOIN users u ON p.created_by = u.id
    ${whereClause}
  `;

  const countResult = await env.DB.prepare(countQuery).bind(...params).first();
  const total = countResult.total;

  // Get proposals
  const proposalsQuery = `
    SELECT 
      p.*,
      u.name as creator_name,
      u.department as creator_department
    FROM research_proposals p
    JOIN users u ON p.created_by = u.id
    ${whereClause}
    ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
    LIMIT ? OFFSET ?
  `;

  const proposals = await env.DB.prepare(proposalsQuery)
    .bind(...params, limit, offset)
    .all();

  return new Response(
    JSON.stringify({
      success: true,
      data: proposals.results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Get single proposal
async function getProposal(id, env, user) {
  let query = `
    SELECT 
      p.*,
      u.name as creator_name,
      u.department as creator_department,
      u.email as creator_email
    FROM research_proposals p
    JOIN users u ON p.created_by = u.id
    WHERE p.id = ?
  `;

  let params = [id];

  // Role-based access control
  if (user.role === 'lecturer' || user.role === 'student') {
    query += ' AND p.created_by = ?';
    params.push(user.userId);
  }

  const proposal = await env.DB.prepare(query).bind(...params).first();

  if (!proposal) {
    return new Response(
      JSON.stringify({ error: 'Proposal not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get reviews if user has permission
  let reviews = [];
  if (user.role === 'admin' || user.role === 'reviewer' || proposal.created_by === user.userId) {
    const reviewsResult = await env.DB.prepare(`
      SELECT 
        r.*,
        u.name as reviewer_name
      FROM proposal_reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.proposal_id = ?
      ORDER BY r.created_at DESC
    `).bind(id).all();
    
    reviews = reviewsResult.results;
  }

  // Parse team_members if it exists
  let teamMembers = [];
  if (proposal.team_members) {
    try {
      teamMembers = JSON.parse(proposal.team_members);
    } catch (e) {
      console.error('Error parsing team_members:', e);
      teamMembers = [];
    }
  }

  // Parse keywords if it exists
  let keywords = [];
  if (proposal.keywords) {
    try {
      keywords = JSON.parse(proposal.keywords);
    } catch (e) {
      console.error('Error parsing keywords:', e);
      keywords = [];
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        ...proposal,
        team_members: teamMembers,
        keywords: keywords,
        reviews
      }
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Create new proposal
async function createProposal(request, env, user) {
  const data = await request.json();
  
  const {
    title,
    abstract,
    type,
    budget = null,
    duration = null,
    keywords = [],
    objectives = null,
    methodology = null,
    expected_outcomes = null,
    team_members = []
  } = data;

  if (!title || !abstract || !type) {
    return new Response(
      JSON.stringify({ error: 'Required fields missing' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const result = await env.DB.prepare(`
    INSERT INTO research_proposals (
      title, abstract, type, budget, duration, keywords,
      objectives, methodology, expected_outcomes, team_members,
      status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, datetime('now'), datetime('now'))
  `).bind(
    title, abstract, type, budget, duration, 
    JSON.stringify(keywords), objectives, methodology, 
    expected_outcomes, JSON.stringify(team_members), user.userId || user.id
  ).run();

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Failed to create proposal' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        id: result.meta.last_row_id,
        message: 'Proposal created successfully'
      }
    }),
    { 
      status: 201, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Update proposal
async function updateProposal(id, request, env, user) {
  const data = await request.json();
  
  // Check if proposal exists and user has permission
  let checkQuery = 'SELECT * FROM research_proposals WHERE id = ?';
  let checkParams = [id];
  
  if (user.role === 'lecturer' || user.role === 'student') {
    checkQuery += ' AND created_by = ?';
    checkParams.push(user.userId);
  }
  
  const existing = await env.DB.prepare(checkQuery).bind(...checkParams).first();
  
  if (!existing) {
    return new Response(
      JSON.stringify({ error: 'Proposal not found or access denied' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Don't allow updates if proposal is submitted (unless admin)
  if (existing.status !== 'draft' && user.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Cannot update submitted proposal' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const updateFields = [];
  const updateParams = [];
  
  const allowedFields = [
    'title', 'abstract', 'type', 'budget', 'duration', 
    'objectives', 'methodology', 'expected_outcomes'
  ];
  
  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      updateFields.push(`${field} = ?`);
      updateParams.push(data[field]);
    }
  });
  
  if (data.keywords) {
    updateFields.push('keywords = ?');
    updateParams.push(JSON.stringify(data.keywords));
  }
  
  if (data.team_members) {
    updateFields.push('team_members = ?');
    updateParams.push(JSON.stringify(data.team_members));
  }
  
  if (updateFields.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No valid fields to update' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  updateFields.push('updated_at = datetime(\'now\')');
  updateParams.push(id);
  
  const result = await env.DB.prepare(`
    UPDATE research_proposals 
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `).bind(...updateParams).run();

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Failed to update proposal' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Proposal updated successfully'
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Delete proposal
async function deleteProposal(id, env, user) {
  // Check if proposal exists and user has permission
  let checkQuery = 'SELECT * FROM research_proposals WHERE id = ?';
  let checkParams = [id];
  
  if (user.role !== 'admin') {
    checkQuery += ' AND created_by = ? AND status = \'draft\'';
    checkParams.push(user.userId);
  }
  
  const existing = await env.DB.prepare(checkQuery).bind(...checkParams).first();
  
  if (!existing) {
    return new Response(
      JSON.stringify({ error: 'Proposal not found or cannot be deleted' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const result = await env.DB.prepare(
    'DELETE FROM research_proposals WHERE id = ?'
  ).bind(id).run();

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Failed to delete proposal' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Proposal deleted successfully'
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Submit proposal for review
async function submitProposal(id, env, user) {
  const proposal = await env.DB.prepare(
    'SELECT * FROM research_proposals WHERE id = ? AND created_by = ? AND status = \'draft\''
  ).bind(id, user.userId).first();

  if (!proposal) {
    return new Response(
      JSON.stringify({ error: 'Proposal not found or already submitted' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const result = await env.DB.prepare(
    'UPDATE research_proposals SET status = \'submitted\', submitted_at = datetime(\'now\') WHERE id = ?'
  ).bind(id).run();

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Failed to submit proposal' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Proposal submitted successfully'
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Review proposal (for reviewers)
async function reviewProposal(id, request, env, user) {
  if (user.role !== 'reviewer' && user.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Access denied' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { score, comments, recommendation } = await request.json();

  if (!score || !comments || !recommendation) {
    return new Response(
      JSON.stringify({ error: 'Score, comments, and recommendation are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check if proposal exists and is submitted
  const proposal = await env.DB.prepare(
    'SELECT * FROM research_proposals WHERE id = ? AND status IN (\'submitted\', \'under_review\')'
  ).bind(id).first();

  if (!proposal) {
    return new Response(
      JSON.stringify({ error: 'Proposal not found or not available for review' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Insert or update review
  const existingReview = await env.DB.prepare(
    'SELECT id FROM proposal_reviews WHERE proposal_id = ? AND reviewer_id = ?'
  ).bind(id, user.userId).first();

  let result;
  if (existingReview) {
    result = await env.DB.prepare(`
      UPDATE proposal_reviews 
      SET score = ?, comments = ?, recommendation = ?, updated_at = datetime('now')
      WHERE proposal_id = ? AND reviewer_id = ?
    `).bind(score, comments, recommendation, id, user.userId).run();
  } else {
    result = await env.DB.prepare(`
      INSERT INTO proposal_reviews (proposal_id, reviewer_id, score, comments, recommendation, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(id, user.userId, score, comments, recommendation).run();
  }

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Failed to save review' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Update proposal status to under_review if not already
  if (proposal.status === 'submitted') {
    await env.DB.prepare(
      'UPDATE research_proposals SET status = \'under_review\' WHERE id = ?'
    ).bind(id).run();
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Review saved successfully'
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Get research statistics
async function getStatistics(env, user) {
  let whereClause = '';
  let params = [];
  
  if (user.role === 'lecturer' || user.role === 'student') {
    whereClause = 'WHERE created_by = ?';
    params = [user.userId];
  }

  const stats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
      COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
      COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
      SUM(CASE WHEN status = 'approved' THEN budget ELSE 0 END) as total_budget
    FROM research_proposals
    ${whereClause}
  `).bind(...params).first();

  return new Response(
    JSON.stringify({
      success: true,
      data: stats
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Utility function to verify authentication
async function verifyAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  // Handle mock token in development
  if (token === 'mock-token') {
    return {
      userId: '1',
      email: 'mock@lecturer.com',
      role: 'dosen',
      name: 'Dr. Mock Lecturer',
      department: 'Computer Science'
    };
  }
  
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

// JWT verification function (same as in auth worker)
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