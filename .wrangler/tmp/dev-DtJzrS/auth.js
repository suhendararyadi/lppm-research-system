var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-XkkAFS/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// workers/auth.js
var auth_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Environment",
      "Access-Control-Max-Age": "86400"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }
    try {
      if (path.startsWith("/auth/")) {
        return await handleAuthRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith("/research/")) {
        return await handleResearchRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith("/service/") || path === "/service") {
        return await handleServiceRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith("/documents/")) {
        return await handleDocumentRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith("/notifications/")) {
        return await handleNotificationRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith("/users")) {
        return await handleUserRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith("/program-studi")) {
        return await handleProgramStudiRoutes(request, env, path, corsHeaders);
      } else if (path === "/health") {
        return new Response(
          JSON.stringify({
            success: true,
            status: "healthy",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            services: ["auth", "research", "service", "documents", "notifications", "users", "program-studi"]
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
      return new Response("Not Found", {
        status: 404,
        headers: corsHeaders
      });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Internal server error",
          message: error.message
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};
async function handleAuthRoutes(request, env, path, corsHeaders) {
  let response;
  switch (path) {
    case "/auth/login":
      response = await handleLogin(request, env);
      break;
    case "/auth/register":
      response = await handleRegister(request, env);
      break;
    case "/auth/logout":
      response = await handleLogout(request, env);
      break;
    case "/auth/verify":
      response = await handleVerifyToken(request, env);
      break;
    case "/auth/refresh":
      response = await handleRefreshToken(request, env);
      break;
    default:
      response = new Response("Not Found", { status: 404 });
  }
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
__name(handleAuthRoutes, "handleAuthRoutes");
async function handleLogin(request, env) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const { email, password } = await request.json();
  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: "Email and password are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE email = ? AND is_active = 1"
  ).bind(email).first();
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Invalid credentials" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  const isValidPassword = await verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    return new Response(
      JSON.stringify({ error: "Invalid credentials" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  const token = await generateJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  }, env.JWT_SECRET);
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
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(handleLogin, "handleLogin");
async function handleRegister(request, env) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const { email, password, name, role, department, institution } = await request.json();
  if (!email || !password || !name || !role) {
    return new Response(
      JSON.stringify({ error: "Required fields missing" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const existingUser = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ?"
  ).bind(email).first();
  if (existingUser) {
    return new Response(
      JSON.stringify({ error: "User already exists" }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }
  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare(`
    INSERT INTO users (email, password_hash, name, role, department, institution, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `).bind(email, passwordHash, name, role, department, institution).run();
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Failed to create user" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({
      success: true,
      message: "User created successfully",
      userId: result.meta.last_row_id
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(handleRegister, "handleRegister");
async function handleLogout(request, env) {
  return new Response(
    JSON.stringify({ success: true, message: "Logged out successfully" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(handleLogout, "handleLogout");
async function handleVerifyToken(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "No token provided" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
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
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(handleVerifyToken, "handleVerifyToken");
async function getCommunityServices(request, env, user, corsHeaders) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 10;
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");
    const search = url.searchParams.get("search");
    const created_by = url.searchParams.get("created_by");
    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;
    if (status) {
      whereConditions.push(`status = ?${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (type) {
      whereConditions.push(`type = ?${paramIndex}`);
      params.push(type);
      paramIndex++;
    }
    if (search) {
      whereConditions.push(`(title LIKE ?${paramIndex} OR description LIKE ?${paramIndex + 1})`);
      params.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }
    if (created_by) {
      whereConditions.push(`created_by = ?${paramIndex}`);
      params.push(parseInt(created_by));
      paramIndex++;
    }
    if (user.role === "lecturer" || user.role === "dosen") {
      if (!created_by) {
        whereConditions.push(`created_by = ?${paramIndex}`);
        params.push(user.userId);
        paramIndex++;
      }
    }
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
    const countQuery = `SELECT COUNT(*) as total FROM community_services ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult.total;
    const query = `
      SELECT 
        cs.*,
        u.name as creator_name,
        u.email as creator_email
      FROM community_services cs
      LEFT JOIN users u ON cs.created_by = u.id
      ${whereClause}
      ORDER BY cs.created_at DESC
      LIMIT ?${paramIndex} OFFSET ?${paramIndex + 1}
    `;
    params.push(limit, offset);
    const result = await env.DB.prepare(query).bind(...params).all();
    return new Response(
      JSON.stringify({
        success: true,
        data: result.results || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error fetching community services:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch community services",
        message: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
}
__name(getCommunityServices, "getCommunityServices");
async function getCommunityService(id, env, user, corsHeaders) {
  try {
    const query = `
      SELECT 
        cs.*,
        u.name as creator_name,
        u.email as creator_email
      FROM community_services cs
      LEFT JOIN users u ON cs.created_by = u.id
      WHERE cs.id = ?1
    `;
    const result = await env.DB.prepare(query).bind(id).first();
    if (!result) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Community service not found"
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    if ((user.role === "lecturer" || user.role === "dosen") && result.created_by !== user.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Access denied"
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error fetching community service:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch community service",
        message: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
}
__name(getCommunityService, "getCommunityService");
async function createCommunityService(request, env, user, corsHeaders) {
  try {
    const data = await request.json();
    const requiredFields = ["title", "description", "type", "budget", "start_date", "end_date"];
    for (const field of requiredFields) {
      if (!data[field]) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Field ${field} is required`
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const query = `
      INSERT INTO community_services (
        title, description, type, budget, start_date, end_date,
        objectives, target_audience, expected_outcomes, location,
        status, created_by, created_at, updated_at
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'draft', ?11, ?12, ?13
      )
    `;
    const result = await env.DB.prepare(query).bind(
      data.title,
      data.description,
      data.type,
      data.budget,
      data.start_date,
      data.end_date,
      data.objectives || "",
      data.target_audience || "",
      data.expected_outcomes || "",
      data.location || "",
      user.userId,
      now,
      now
    ).run();
    if (!result.success) {
      throw new Error("Failed to create community service");
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: result.meta.last_row_id,
          ...data,
          status: "draft",
          created_by: user.userId,
          created_at: now,
          updated_at: now
        }
      }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error creating community service:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to create community service",
        message: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
}
__name(createCommunityService, "createCommunityService");
async function updateCommunityService(id, request, env, user, corsHeaders) {
  try {
    const existingService = await env.DB.prepare("SELECT * FROM community_services WHERE id = ?1").bind(id).first();
    if (!existingService) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Community service not found"
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    if ((user.role === "lecturer" || user.role === "dosen") && existingService.created_by !== user.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Access denied"
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    const data = await request.json();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const query = `
      UPDATE community_services SET
        title = ?1,
        description = ?2,
        type = ?3,
        budget = ?4,
        start_date = ?5,
        end_date = ?6,
        objectives = ?7,
        target_audience = ?8,
        expected_outcomes = ?9,
        location = ?10,
        updated_at = ?11
      WHERE id = ?12
    `;
    const result = await env.DB.prepare(query).bind(
      data.title || existingService.title,
      data.description || existingService.description,
      data.type || existingService.type,
      data.budget || existingService.budget,
      data.start_date || existingService.start_date,
      data.end_date || existingService.end_date,
      data.objectives || existingService.objectives,
      data.target_audience || existingService.target_audience,
      data.expected_outcomes || existingService.expected_outcomes,
      data.location || existingService.location,
      now,
      id
    ).run();
    if (!result.success) {
      throw new Error("Failed to update community service");
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...existingService,
          ...data,
          updated_at: now
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error updating community service:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to update community service",
        message: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
}
__name(updateCommunityService, "updateCommunityService");
async function deleteCommunityService(id, env, user, corsHeaders) {
  try {
    const existingService = await env.DB.prepare("SELECT * FROM community_services WHERE id = ?1").bind(id).first();
    if (!existingService) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Community service not found"
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    if ((user.role === "lecturer" || user.role === "dosen") && existingService.created_by !== user.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Access denied"
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    if (existingService.status !== "draft") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cannot delete submitted community service"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    const result = await env.DB.prepare("DELETE FROM community_services WHERE id = ?1").bind(id).run();
    if (!result.success) {
      throw new Error("Failed to delete community service");
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: "Community service deleted successfully"
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error deleting community service:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to delete community service",
        message: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
}
__name(deleteCommunityService, "deleteCommunityService");
async function submitCommunityService(id, env, user, corsHeaders) {
  try {
    const existingService = await env.DB.prepare("SELECT * FROM community_services WHERE id = ?1").bind(id).first();
    if (!existingService) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Community service not found"
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    if ((user.role === "lecturer" || user.role === "dosen") && existingService.created_by !== user.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Access denied"
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    if (existingService.status !== "draft") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Community service already submitted"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await env.DB.prepare(
      "UPDATE community_services SET status = ?1, submitted_at = ?2, updated_at = ?3 WHERE id = ?4"
    ).bind("submitted", now, now, id).run();
    if (!result.success) {
      throw new Error("Failed to submit community service");
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: "Community service submitted successfully",
        data: {
          ...existingService,
          status: "submitted",
          submitted_at: now,
          updated_at: now
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error submitting community service:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to submit community service",
        message: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
}
__name(submitCommunityService, "submitCommunityService");
async function reviewCommunityService(id, request, env, user, corsHeaders) {
  try {
    if (!["super_admin", "lppm_admin", "reviewer"].includes(user.role)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Access denied. Only admins and reviewers can review community services."
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    const existingService = await env.DB.prepare("SELECT * FROM community_services WHERE id = ?1").bind(id).first();
    if (!existingService) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Community service not found"
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    const data = await request.json();
    const { status, review_notes } = data;
    if (!["approved", "rejected", "needs_revision"].includes(status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid status. Must be approved, rejected, or needs_revision"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await env.DB.prepare(
      "UPDATE community_services SET status = ?1, review_notes = ?2, reviewed_by = ?3, reviewed_at = ?4, updated_at = ?5 WHERE id = ?6"
    ).bind(status, review_notes || "", user.userId, now, now, id).run();
    if (!result.success) {
      throw new Error("Failed to review community service");
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: "Community service reviewed successfully",
        data: {
          ...existingService,
          status,
          review_notes: review_notes || "",
          reviewed_by: user.userId,
          reviewed_at: now,
          updated_at: now
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error reviewing community service:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to review community service",
        message: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
}
__name(reviewCommunityService, "reviewCommunityService");
async function verifyAuth(request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload) {
      return null;
    }
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?1").bind(payload.userId).first();
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department
    };
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}
__name(verifyAuth, "verifyAuth");
async function handleRefreshToken(request, env) {
  return new Response(
    JSON.stringify({ message: "Token refresh not implemented yet" }),
    { status: 501, headers: { "Content-Type": "application/json" } }
  );
}
__name(handleRefreshToken, "handleRefreshToken");
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
__name(verifyPassword, "verifyPassword");
async function generateJWT(payload, secret) {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const now = Math.floor(Date.now() / 1e3);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + 24 * 60 * 60
    // 24 hours
  };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(jwtPayload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signature = await sign(`${encodedHeader}.${encodedPayload}`, secret);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
__name(generateJWT, "generateJWT");
async function verifyJWT(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }
  const [header, payload, signature] = parts;
  const expectedSignature = await sign(`${header}.${payload}`, secret);
  if (signature !== expectedSignature) {
    throw new Error("Invalid signature");
  }
  const decodedPayload = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  if (decodedPayload.exp < Math.floor(Date.now() / 1e3)) {
    throw new Error("Token expired");
  }
  return decodedPayload;
}
__name(verifyJWT, "verifyJWT");
async function sign(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sign, "sign");
async function handleResearchRoutes(request, env, path, corsHeaders) {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Research service not implemented yet",
      message: "This endpoint will be implemented in the next phase"
    }),
    {
      status: 501,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
}
__name(handleResearchRoutes, "handleResearchRoutes");
async function handleServiceRoutes(request, env, path, corsHeaders) {
  const method = request.method;
  const url = new URL(request.url);
  let user = await verifyAuth(request, env);
  if (!user && env.ENVIRONMENT === "development") {
    user = {
      id: 1,
      userId: 1,
      email: "test@example.com",
      name: "Test User",
      role: "lecturer",
      department: "Computer Science"
    };
  }
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
  try {
    if (path === "/service" && method === "GET") {
      return await getCommunityServices(request, env, user, corsHeaders);
    } else if (path === "/service" && method === "POST") {
      return await createCommunityService(request, env, user, corsHeaders);
    } else if (path.match(/^\/service\/\d+$/) && method === "GET") {
      const id = parseInt(path.split("/")[2]);
      return await getCommunityService(id, env, user, corsHeaders);
    } else if (path.match(/^\/service\/\d+$/) && method === "PUT") {
      const id = parseInt(path.split("/")[2]);
      return await updateCommunityService(id, request, env, user, corsHeaders);
    } else if (path.match(/^\/service\/\d+$/) && method === "DELETE") {
      const id = parseInt(path.split("/")[2]);
      return await deleteCommunityService(id, env, user, corsHeaders);
    } else if (path.match(/^\/service\/\d+\/submit$/) && method === "POST") {
      const id = parseInt(path.split("/")[2]);
      return await submitCommunityService(id, env, user, corsHeaders);
    } else if (path.match(/^\/service\/\d+\/review$/) && method === "POST") {
      const id = parseInt(path.split("/")[2]);
      return await reviewCommunityService(id, request, env, user, corsHeaders);
    }
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("Service route error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        message: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
}
__name(handleServiceRoutes, "handleServiceRoutes");
async function handleDocumentRoutes(request, env, path, corsHeaders) {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Document service not implemented yet",
      message: "This endpoint will be implemented in the next phase"
    }),
    {
      status: 501,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
}
__name(handleDocumentRoutes, "handleDocumentRoutes");
async function handleNotificationRoutes(request, env, path, corsHeaders) {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Notification service not implemented yet",
      message: "This endpoint will be implemented in the next phase"
    }),
    {
      status: 501,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
}
__name(handleNotificationRoutes, "handleNotificationRoutes");
async function handleUserRoutes(request, env, path, corsHeaders) {
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ success: false, message: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const token = authHeader.substring(7);
  let user;
  try {
    user = await verifyJWT(token, env.JWT_SECRET);
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: "Invalid token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  console.log("User role:", user.role, "User data:", user);
  const isStatisticsEndpoint = method === "GET" && pathParts.length === 2 && pathParts[1] === "statistics";
  if (!["super_admin", "lppm_admin", "admin", "lecturer"].includes(user.role)) {
    return new Response(
      JSON.stringify({ success: false, message: "Insufficient permissions", userRole: user.role }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (!isStatisticsEndpoint && !["super_admin", "lppm_admin", "admin"].includes(user.role)) {
    return new Response(
      JSON.stringify({ success: false, message: "Insufficient permissions", userRole: user.role }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  try {
    if (method === "GET" && pathParts.length === 1) {
      return await handleGetUsers(request, env, corsHeaders);
    } else if (method === "GET" && pathParts.length === 2 && pathParts[1] === "statistics") {
      return await handleGetUserStatistics(request, env, corsHeaders);
    } else if (method === "GET" && pathParts.length === 2) {
      const userId = pathParts[1];
      return await handleGetUser(userId, env, corsHeaders);
    } else if (method === "POST" && pathParts.length === 1) {
      return await handleCreateUser(request, env, corsHeaders);
    } else if (method === "PUT" && pathParts.length === 2) {
      const userId = pathParts[1];
      return await handleUpdateUser(userId, request, env, corsHeaders);
    } else if (method === "DELETE" && pathParts.length === 2) {
      const userId = pathParts[1];
      return await handleDeleteUser(userId, env, corsHeaders);
    } else {
      return new Response(
        JSON.stringify({ success: false, message: "Route not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in user routes:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
__name(handleUserRoutes, "handleUserRoutes");
async function handleProgramStudiRoutes(request, env, path, corsHeaders) {
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  try {
    if (method === "GET" && pathParts.length === 1) {
      return await handleGetProgramStudi(env, corsHeaders);
    } else if (method === "POST" && pathParts.length === 1) {
      return await handleCreateProgramStudi(request, env, corsHeaders);
    } else if (method === "PUT" && pathParts.length === 2) {
      const programId = pathParts[1];
      return await handleUpdateProgramStudi(programId, request, env, corsHeaders);
    } else if (method === "DELETE" && pathParts.length === 2) {
      const programId = pathParts[1];
      return await handleDeleteProgramStudi(programId, env, corsHeaders);
    } else {
      return new Response(
        JSON.stringify({ success: false, message: "Route not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in program studi routes:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
__name(handleProgramStudiRoutes, "handleProgramStudiRoutes");
async function handleGetUsers(request, env, corsHeaders) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const search = url.searchParams.get("search") || "";
  const role = url.searchParams.get("role") || "";
  const program_studi = url.searchParams.get("program_studi") || "";
  const is_active = url.searchParams.get("is_active");
  const offset = (page - 1) * limit;
  let query = "SELECT * FROM users WHERE 1=1";
  let countQuery = "SELECT COUNT(*) as total FROM users WHERE 1=1";
  const params = [];
  if (search) {
    query += " AND (name LIKE ? OR email LIKE ?)";
    countQuery += " AND (name LIKE ? OR email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role) {
    query += " AND role = ?";
    countQuery += " AND role = ?";
    params.push(role);
  }
  if (program_studi) {
    query += " AND program_studi = ?";
    countQuery += " AND program_studi = ?";
    params.push(program_studi);
  }
  if (is_active !== null && is_active !== void 0 && is_active !== "") {
    query += " AND is_active = ?";
    countQuery += " AND is_active = ?";
    params.push(is_active === "true" ? 1 : 0);
  }
  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  try {
    const [usersResult, countResult] = await Promise.all([
      env.DB.prepare(query).bind(...params, limit, offset).all(),
      env.DB.prepare(countQuery).bind(...params).first()
    ]);
    const users = usersResult.results.map((user) => ({
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
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error getting users:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to get users" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
__name(handleGetUsers, "handleGetUsers");
async function handleGetUser(userId, env, corsHeaders) {
  try {
    const result = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
    if (!result) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error getting user:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to get user" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
__name(handleGetUser, "handleGetUser");
async function handleCreateUser(request, env, corsHeaders) {
  try {
    const userData = await request.json();
    if (!userData.email || !userData.password || !userData.name || !userData.role) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const existingUser = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(userData.email).first();
    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, message: "Email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const hashedPassword = await hashPassword(userData.password);
    const userId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const expertiseJson = userData.expertise ? JSON.stringify(userData.expertise) : null;
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
      1,
      // is_active = true
      0,
      // email_verified = false
      now,
      now
    ).run();
    return new Response(
      JSON.stringify({ success: true, message: "User created successfully", data: { id: userId } }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to create user" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
__name(handleCreateUser, "handleCreateUser");
async function handleUpdateUser(userId, request, env, corsHeaders) {
  try {
    const userData = await request.json();
    const existingUser = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
    if (!existingUser) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const updateFields = [];
    const params = [];
    if (userData.name !== void 0) {
      updateFields.push("name = ?");
      params.push(userData.name);
    }
    if (userData.email !== void 0) {
      updateFields.push("email = ?");
      params.push(userData.email);
    }
    if (userData.role !== void 0) {
      updateFields.push("role = ?");
      params.push(userData.role);
    }
    if (userData.department !== void 0) {
      updateFields.push("department = ?");
      params.push(userData.department);
    }
    if (userData.institution !== void 0) {
      updateFields.push("institution = ?");
      params.push(userData.institution);
    }
    if (userData.phone !== void 0) {
      updateFields.push("phone = ?");
      params.push(userData.phone);
    }
    if (userData.address !== void 0) {
      updateFields.push("address = ?");
      params.push(userData.address);
    }
    if (userData.expertise !== void 0) {
      updateFields.push("expertise = ?");
      params.push(userData.expertise ? JSON.stringify(userData.expertise) : null);
    }
    if (userData.nidn !== void 0) {
      updateFields.push("nidn = ?");
      params.push(userData.nidn);
    }
    if (userData.nuptk !== void 0) {
      updateFields.push("nuptk = ?");
      params.push(userData.nuptk);
    }
    if (userData.nim !== void 0) {
      updateFields.push("nim = ?");
      params.push(userData.nim);
    }
    if (userData.program_studi !== void 0) {
      updateFields.push("program_studi = ?");
      params.push(userData.program_studi);
    }
    if (userData.status_kepegawaian !== void 0) {
      updateFields.push("status_kepegawaian = ?");
      params.push(userData.status_kepegawaian);
    }
    if (userData.jabatan_fungsional !== void 0) {
      updateFields.push("jabatan_fungsional = ?");
      params.push(userData.jabatan_fungsional);
    }
    if (userData.pendidikan_terakhir !== void 0) {
      updateFields.push("pendidikan_terakhir = ?");
      params.push(userData.pendidikan_terakhir);
    }
    if (userData.tahun_masuk !== void 0) {
      updateFields.push("tahun_masuk = ?");
      params.push(userData.tahun_masuk);
    }
    if (userData.is_active !== void 0) {
      updateFields.push("is_active = ?");
      params.push(userData.is_active ? 1 : 0);
    }
    if (updateFields.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No fields to update" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    updateFields.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString());
    params.push(userId);
    const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
    await env.DB.prepare(query).bind(...params).run();
    return new Response(
      JSON.stringify({ success: true, message: "User updated successfully" }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to update user" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
__name(handleUpdateUser, "handleUpdateUser");
async function handleDeleteUser(userId, env, corsHeaders) {
  try {
    const existingUser = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
    if (!existingUser) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
    return new Response(
      JSON.stringify({ success: true, message: "User deleted successfully" }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to delete user" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
__name(handleDeleteUser, "handleDeleteUser");
async function handleGetProgramStudi(env, corsHeaders) {
  try {
    const result = await env.DB.prepare("SELECT * FROM program_studi WHERE is_active = 1 ORDER BY fakultas, nama").all();
    const programStudi = result.results.map((program) => ({
      ...program,
      is_active: Boolean(program.is_active)
    }));
    return new Response(
      JSON.stringify({ success: true, data: programStudi }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error getting program studi:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to get program studi" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
__name(handleGetProgramStudi, "handleGetProgramStudi");
async function handleCreateProgramStudi(request, env, corsHeaders) {
  try {
    const programData = await request.json();
    if (!programData.kode || !programData.nama || !programData.fakultas || !programData.jenjang) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const programId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
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
      JSON.stringify({ success: true, message: "Program studi created successfully", data: { id: programId } }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error creating program studi:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to create program studi" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
__name(handleCreateProgramStudi, "handleCreateProgramStudi");
async function handleUpdateProgramStudi(programId, request, env, corsHeaders) {
  try {
    const programData = await request.json();
    const existingProgram = await env.DB.prepare("SELECT id FROM program_studi WHERE id = ?").bind(programId).first();
    if (!existingProgram) {
      return new Response(
        JSON.stringify({ success: false, message: "Program studi not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const updateFields = [];
    const params = [];
    if (programData.kode !== void 0) {
      updateFields.push("kode = ?");
      params.push(programData.kode);
    }
    if (programData.nama !== void 0) {
      updateFields.push("nama = ?");
      params.push(programData.nama);
    }
    if (programData.fakultas !== void 0) {
      updateFields.push("fakultas = ?");
      params.push(programData.fakultas);
    }
    if (programData.jenjang !== void 0) {
      updateFields.push("jenjang = ?");
      params.push(programData.jenjang);
    }
    if (programData.akreditasi !== void 0) {
      updateFields.push("akreditasi = ?");
      params.push(programData.akreditasi);
    }
    if (programData.is_active !== void 0) {
      updateFields.push("is_active = ?");
      params.push(programData.is_active ? 1 : 0);
    }
    if (updateFields.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No fields to update" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    updateFields.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString());
    params.push(programId);
    const query = `UPDATE program_studi SET ${updateFields.join(", ")} WHERE id = ?`;
    await env.DB.prepare(query).bind(...params).run();
    return new Response(
      JSON.stringify({ success: true, message: "Program studi updated successfully" }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error updating program studi:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to update program studi" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
__name(handleUpdateProgramStudi, "handleUpdateProgramStudi");
async function handleDeleteProgramStudi(programId, env, corsHeaders) {
  try {
    const existingProgram = await env.DB.prepare("SELECT id FROM program_studi WHERE id = ?").bind(programId).first();
    if (!existingProgram) {
      return new Response(
        JSON.stringify({ success: false, message: "Program studi not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    await env.DB.prepare("UPDATE program_studi SET is_active = 0, updated_at = ? WHERE id = ?").bind((/* @__PURE__ */ new Date()).toISOString(), programId).run();
    return new Response(
      JSON.stringify({ success: true, message: "Program studi deleted successfully" }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error deleting program studi:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to delete program studi" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
__name(handleDeleteProgramStudi, "handleDeleteProgramStudi");
async function handleGetUserStatistics(request, env, corsHeaders) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, message: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.substring(7);
    const decoded = await verifyJWT(token, env.JWT_SECRET);
    if (!decoded) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const allowedRoles = ["lecturer", "admin", "lppm_admin", "super_admin"];
    if (!allowedRoles.includes(decoded.role)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Insufficient permissions",
          userRole: decoded.role
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error getting user statistics:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to get user statistics" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
__name(handleGetUserStatistics, "handleGetUserStatistics");

// ../../../../../Library/Application Support/Herd/config/nvm/versions/node/v22.17.0/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../Library/Application Support/Herd/config/nvm/versions/node/v22.17.0/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-XkkAFS/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = auth_default;

// ../../../../../Library/Application Support/Herd/config/nvm/versions/node/v22.17.0/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-XkkAFS/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=auth.js.map
