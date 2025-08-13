var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-HVN1qY/checked-fetch.js
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
      } else if (path.startsWith("/service/")) {
        return await handleServiceRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith("/documents/")) {
        return await handleDocumentRoutes(request, env, path, corsHeaders);
      } else if (path.startsWith("/notifications/")) {
        return await handleNotificationRoutes(request, env, path, corsHeaders);
      } else if (path === "/health") {
        return new Response(
          JSON.stringify({
            success: true,
            status: "healthy",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            services: ["auth", "research", "service", "documents", "notifications"]
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
  return new Response(
    JSON.stringify({
      success: false,
      error: "Community service not implemented yet",
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

// .wrangler/tmp/bundle-HVN1qY/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-HVN1qY/middleware-loader.entry.ts
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
