var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-wNF2eh/checked-fetch.js
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

// workers/research.js
var research_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      const user = await verifyAuth(request, env);
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
      let response;
      if (path === "/research/proposals" && method === "GET") {
        response = await getProposals(request, env, user);
      } else if (path === "/research/proposals" && method === "POST") {
        response = await createProposal(request, env, user);
      } else if (path.match(/^\/research\/proposals\/\d+$/) && method === "GET") {
        const id = path.split("/").pop();
        response = await getProposal(id, env, user);
      } else if (path.match(/^\/research\/proposals\/\d+$/) && method === "PUT") {
        const id = path.split("/").pop();
        response = await updateProposal(id, request, env, user);
      } else if (path.match(/^\/research\/proposals\/\d+$/) && method === "DELETE") {
        const id = path.split("/").pop();
        response = await deleteProposal(id, env, user);
      } else if (path.match(/^\/research\/proposals\/\d+\/submit$/) && method === "POST") {
        const id = path.split("/")[3];
        response = await submitProposal(id, env, user);
      } else if (path.match(/^\/research\/proposals\/\d+\/review$/) && method === "POST") {
        const id = path.split("/")[3];
        response = await reviewProposal(id, request, env, user);
      } else if (path === "/research/statistics" && method === "GET") {
        response = await getStatistics(env, user);
      } else {
        response = new Response("Not Found", { status: 404 });
      }
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    } catch (error) {
      console.error("Research Worker Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal Server Error", message: error.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
  }
};
async function getProposals(request, env, user) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page")) || 1;
  const limit = parseInt(url.searchParams.get("limit")) || 10;
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  const search = url.searchParams.get("search");
  const sortBy = url.searchParams.get("sortBy") || "created_at";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";
  const offset = (page - 1) * limit;
  let whereConditions = [];
  let params = [];
  if (user.role === "lecturer" || user.role === "student") {
    whereConditions.push("p.created_by = ?");
    params.push(user.userId);
  }
  if (status) {
    whereConditions.push("p.status = ?");
    params.push(status);
  }
  if (type) {
    whereConditions.push("p.type = ?");
    params.push(type);
  }
  if (search) {
    whereConditions.push("(p.title LIKE ? OR p.abstract LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
  const countQuery = `
    SELECT COUNT(*) as total
    FROM research_proposals p
    JOIN users u ON p.created_by = u.id
    ${whereClause}
  `;
  const countResult = await env.DB.prepare(countQuery).bind(...params).first();
  const total = countResult.total;
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
  const proposals = await env.DB.prepare(proposalsQuery).bind(...params, limit, offset).all();
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
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(getProposals, "getProposals");
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
  if (user.role === "lecturer" || user.role === "student") {
    query += " AND p.created_by = ?";
    params.push(user.userId);
  }
  const proposal = await env.DB.prepare(query).bind(...params).first();
  if (!proposal) {
    return new Response(
      JSON.stringify({ error: "Proposal not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  let reviews = [];
  if (user.role === "admin" || user.role === "reviewer" || proposal.created_by === user.userId) {
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
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        ...proposal,
        reviews
      }
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(getProposal, "getProposal");
async function createProposal(request, env, user) {
  const data = await request.json();
  const {
    title,
    abstract,
    type,
    budget,
    duration,
    keywords,
    objectives,
    methodology,
    expected_outcomes,
    team_members
  } = data;
  if (!title || !abstract || !type) {
    return new Response(
      JSON.stringify({ error: "Required fields missing" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const result = await env.DB.prepare(`
    INSERT INTO research_proposals (
      title, abstract, type, budget, duration, keywords,
      objectives, methodology, expected_outcomes, team_members,
      status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, datetime('now'), datetime('now'))
  `).bind(
    title,
    abstract,
    type,
    budget,
    duration,
    JSON.stringify(keywords),
    objectives,
    methodology,
    expected_outcomes,
    JSON.stringify(team_members),
    user.userId
  ).run();
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Failed to create proposal" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        id: result.meta.last_row_id,
        message: "Proposal created successfully"
      }
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(createProposal, "createProposal");
async function updateProposal(id, request, env, user) {
  const data = await request.json();
  let checkQuery = "SELECT * FROM research_proposals WHERE id = ?";
  let checkParams = [id];
  if (user.role === "lecturer" || user.role === "student") {
    checkQuery += " AND created_by = ?";
    checkParams.push(user.userId);
  }
  const existing = await env.DB.prepare(checkQuery).bind(...checkParams).first();
  if (!existing) {
    return new Response(
      JSON.stringify({ error: "Proposal not found or access denied" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  if (existing.status !== "draft" && user.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Cannot update submitted proposal" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  const updateFields = [];
  const updateParams = [];
  const allowedFields = [
    "title",
    "abstract",
    "type",
    "budget",
    "duration",
    "objectives",
    "methodology",
    "expected_outcomes"
  ];
  allowedFields.forEach((field) => {
    if (data[field] !== void 0) {
      updateFields.push(`${field} = ?`);
      updateParams.push(data[field]);
    }
  });
  if (data.keywords) {
    updateFields.push("keywords = ?");
    updateParams.push(JSON.stringify(data.keywords));
  }
  if (data.team_members) {
    updateFields.push("team_members = ?");
    updateParams.push(JSON.stringify(data.team_members));
  }
  if (updateFields.length === 0) {
    return new Response(
      JSON.stringify({ error: "No valid fields to update" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  updateFields.push("updated_at = datetime('now')");
  updateParams.push(id);
  const result = await env.DB.prepare(`
    UPDATE research_proposals 
    SET ${updateFields.join(", ")}
    WHERE id = ?
  `).bind(...updateParams).run();
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Failed to update proposal" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({
      success: true,
      message: "Proposal updated successfully"
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(updateProposal, "updateProposal");
async function deleteProposal(id, env, user) {
  let checkQuery = "SELECT * FROM research_proposals WHERE id = ?";
  let checkParams = [id];
  if (user.role !== "admin") {
    checkQuery += " AND created_by = ? AND status = 'draft'";
    checkParams.push(user.userId);
  }
  const existing = await env.DB.prepare(checkQuery).bind(...checkParams).first();
  if (!existing) {
    return new Response(
      JSON.stringify({ error: "Proposal not found or cannot be deleted" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  const result = await env.DB.prepare(
    "DELETE FROM research_proposals WHERE id = ?"
  ).bind(id).run();
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Failed to delete proposal" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({
      success: true,
      message: "Proposal deleted successfully"
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(deleteProposal, "deleteProposal");
async function submitProposal(id, env, user) {
  const proposal = await env.DB.prepare(
    "SELECT * FROM research_proposals WHERE id = ? AND created_by = ? AND status = 'draft'"
  ).bind(id, user.userId).first();
  if (!proposal) {
    return new Response(
      JSON.stringify({ error: "Proposal not found or already submitted" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  const result = await env.DB.prepare(
    "UPDATE research_proposals SET status = 'submitted', submitted_at = datetime('now') WHERE id = ?"
  ).bind(id).run();
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Failed to submit proposal" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({
      success: true,
      message: "Proposal submitted successfully"
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(submitProposal, "submitProposal");
async function reviewProposal(id, request, env, user) {
  if (user.role !== "reviewer" && user.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Access denied" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  const { score, comments, recommendation } = await request.json();
  if (!score || !comments || !recommendation) {
    return new Response(
      JSON.stringify({ error: "Score, comments, and recommendation are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const proposal = await env.DB.prepare(
    "SELECT * FROM research_proposals WHERE id = ? AND status IN ('submitted', 'under_review')"
  ).bind(id).first();
  if (!proposal) {
    return new Response(
      JSON.stringify({ error: "Proposal not found or not available for review" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  const existingReview = await env.DB.prepare(
    "SELECT id FROM proposal_reviews WHERE proposal_id = ? AND reviewer_id = ?"
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
      JSON.stringify({ error: "Failed to save review" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (proposal.status === "submitted") {
    await env.DB.prepare(
      "UPDATE research_proposals SET status = 'under_review' WHERE id = ?"
    ).bind(id).run();
  }
  return new Response(
    JSON.stringify({
      success: true,
      message: "Review saved successfully"
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(reviewProposal, "reviewProposal");
async function getStatistics(env, user) {
  let whereClause = "";
  let params = [];
  if (user.role === "lecturer" || user.role === "student") {
    whereClause = "WHERE created_by = ?";
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
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(getStatistics, "getStatistics");
async function verifyAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}
__name(verifyAuth, "verifyAuth");
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

// .wrangler/tmp/bundle-wNF2eh/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = research_default;

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

// .wrangler/tmp/bundle-wNF2eh/middleware-loader.entry.ts
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
//# sourceMappingURL=research.js.map
