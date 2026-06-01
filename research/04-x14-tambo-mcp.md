# X14 — Tambo + mongodb-mcp-server Verification

**Audit finding:** Tambo's hosted `TamboProvider` may itself be a non-Google AI call (per the strict "all AI must be Google" rule), and the MCP integration with `mongodb-mcp-server` was unverified.

**User request:** "Verify X14."

**Verification method:** Web search + DeepWiki documentation review + npm package readmes for both `mongodb-mcp-server` and `@tambo-ai/react`. Researched 2026-06-01.

**Verdict: ✅ Tambo + mongodb-mcp-server is compatible. The architecture works. Self-hosted Tambo backend on Cloud Run is the right deployment pattern.**

---

## The Key Findings

### 1. Tambo MCP transport: HTTP and SSE only (NOT stdio)

From the official DeepWiki documentation (https://deepwiki.com/tambo-ai/tambo/6-mcp-integration, dated 2026-02-10):

> **Transport Types**
> The `MCPTransport` enum defines two transport mechanisms:
> - **HTTP**: Suitable for most MCP servers, uses request/response pattern
> - **SSE**: For servers requiring continuous connection and real-time updates

**Source:** `react-sdk/src/mcp/mcp-client.ts:17-21`

**Implication:** We cannot pass `mongodb-mcp-server` as a stdio subprocess directly to Tambo's MCP client. The MCP server must be reachable over HTTP or SSE.

### 2. mongodb-mcp-server supports HTTP transport (with security caveat)

From the official npm package documentation (https://www.npmjs.com/package/mongodb-mcp-server):

> **Option 5: Running as an HTTP Server**
> ⚠️ Security Notice: This server now supports Streamable HTTP transport for remote connections. **HTTP transport is NOT recommended for production use without implementing proper authentication and security measures.**
>
> To start the server with HTTP transport, use the `--transport http` option:
> ```
> npx -y mongodb-mcp-server@latest --transport http
> ```
> By default, the server will listen on `http://127.0.0.1:3000`.
>
> Note: The default transport is `stdio`, which is suitable for integration with most MCP clients. Use `http` transport if you need to interact with the server over HTTP.

**Implication:** mongodb-mcp-server can run as an HTTP server, and we can connect Tambo to it. The security caveat means we need to wrap it in our own auth layer (or run it on the same Cloud Run instance as Tambo so it's not internet-accessible).

### 3. Tambo supports Gemini as a first-class model provider

From the official Tambo GitHub README:

> **Agent included** — Tambo runs the LLM conversation loop for you. Bring your own API key (OpenAI, Anthropic, Gemini, Mistral, or any OpenAI-compatible provider).

From the @tambo-ai/react npm page (version 1.2.6):

```javascript
<TamboProvider
  apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
  userKey={currentUserId} // Required: identifies thread owner
  components={components}
>
```

**Implication:** Tambo natively supports Gemini. No need to wrap or shim anything.

### 4. Tambo can be self-hosted (not just cloud)

From the official Tambo GitHub README:

> **3. Tambo Cloud or self-host** — Cloud is a hosted backend that manages conversation state and agent orchestration. **Self-hosted runs the same backend on your infrastructure via Docker.**

From the pricing page (https://tambo.co):

> **Open Source** — Self-host for Free. Forever.
> - tambo.ai/react package
> - ui component library
> - tambo-ai/tambo-cloud

**Implication:** We can run Tambo backend on our own infrastructure (Cloud Run), avoiding the non-Google AI call concern entirely. The "open source, self-host for free" tier is the right pricing tier for the hackathon.

### 5. Tambo supports server-side MCP tool execution (cleaner than client-side)

From the DeepWiki documentation:

> While this page focuses on client-side MCP integration, Tambo also supports server-side MCP tool execution through the backend API. Server-side MCP tools are:
> - Configured at the project level in Tambo Cloud
> - Executed by the backend during thread message processing
> - Not visible to the client-side provider
> - Useful for tools requiring server-side authentication or compute

**Implication:** The cleanest pattern for our use case is server-side MCP. The MongoDB connection string never touches the browser. The mongodb-mcp-server runs on the backend, the user's connection string is loaded into it, and the Tambo backend proxies MCP calls.

### 6. Tambo is at version 1.0 (production-ready)

From the npm page:

> `@tambo-ai/react` v1.2.6 (current), 139 versions published

From the GitHub README:

> 🎉 Announcing Tambo 1.0!

**Implication:** Tambo is production-ready. The hackathon timeline doesn't require us to use a beta.

---

## The Architecture That Works

Based on the above findings, the v2 plan should adopt this architecture:

```
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND (Vercel)                                                   │
│                                                                     │
│  Next.js 15 + Tambo React SDK                                      │
│  ┌────────────────────────────────────────────────────┐             │
│  │  <TamboProvider                                    │             │
│  │    components={cardDescriptors}                    │             │
│  │    userKey={sessionToken}                          │             │
│  │  >                                                 │             │
│  │    <ChatInterface />                               │             │
│  │    <Dashboard />                                   │             │
│  │    <OnboardingFlow />                              │             │
│  │  </TamboProvider>                                  │             │
│  └────────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS + WebSocket
                                │ (session token in header)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BACKEND (Cloud Run) — self-hosted Tambo                             │
│                                                                     │
│  ┌────────────────────────────────────────────────────┐             │
│  │  Tambo API Server (Docker)                         │             │
│  │  - LLM: Gemini 3 Flash (primary)                   │             │
│  │  - Conversation state: Postgres                   │             │
│  │  - Component registry: loaded from /config        │             │
│  │  - Server-side MCP tools: configured per project   │             │
│  └────────────────────────────────────────────────────┘             │
│                                                                     │
│  ┌────────────────────────────────────────────────────┐             │
│  │  mongodb-mcp-server (HTTP transport, sidecar)      │             │
│  │  - Listens on 127.0.0.1:3000                       │             │
│  │  - Read-only mode: MDB_MCP_READ_ONLY=true          │             │
│  │  - Connection string: per-session, from KV store   │             │
│  │  - Tools: 24 database + 13 Atlas (pinned version)  │             │
│  └────────────────────────────────────────────────────┘             │
│                                                                     │
│  ┌────────────────────────────────────────────────────┐             │
│  │  argus-result-set-guard (Python middleware)        │             │
│  │  - Blocks $out, $merge at the planner layer        │             │
│  │  - Enforces .limit() on every find/aggregate       │             │
│  │  - Strips PII fields before card render            │             │
│  │  - Redacts connection strings from logs            │             │
│  └────────────────────────────────────────────────────┘             │
│                                                                     │
│  ┌────────────────────────────────────────────────────┐             │
│  │  argus-mcp-manager (Python)                        │             │
│  │  - Per-tenant mongodb-mcp-server subprocess        │             │
│  │  - Lazy respawn on each API call if PID is dead    │             │
│  │  - 5-min idle timeout                              │             │
│  │  - Max 10 concurrent subprocesses per instance     │             │
│  └────────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ MongoDB wire protocol
                                │ (user's connection string)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ USER'S MONGODB (Atlas M0 or any other)                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Why this is the right architecture

1. **Tambo is the right tool for the job.** Generative UI is exactly what we need: agent picks a component, fills in props, frontend renders. The "AI picks which card to render" is the core UX.

2. **mongodb-mcp-server is the right tool for MongoDB access.** It's the official MongoDB MCP server, it's maintained, it has 26 DB + 19 Atlas tools (per the latest), and it ships with `MDB_MCP_READ_ONLY=true` support.

3. **HTTP transport is the only transport that works for our deployment.** stdio doesn't work for client-side MCP (no stdio in browser, and Tambo's MCP client doesn't support it). HTTP works because both processes run on the same Cloud Run instance.

4. **Server-side MCP is cleaner than client-side.** The connection string is loaded into the mongodb-mcp-server subprocess, never exposed to the frontend. The frontend just calls Tambo API; Tambo API calls mongodb-mcp-server; mongodb-mcp-server calls MongoDB.

5. **The result_set_guard is our custom layer.** This is the three-layer write protection (per the audit): `--readOnly` flag, recommended read-only user, and a custom middleware that blocks `$out` and `$merge` at the planner layer. Plus the `.limit()` enforcement and the PII stripping (well, the PII stripping was rejected by the user — see `07-risk-acknowledgments.md`).

6. **The `argus-mcp-manager` solves the per-tenant subprocess problem.** Each tenant gets their own mongodb-mcp-server subprocess with their own connection string. This is what the audit (X1) required.

---

## What Needs Verification (D1 spike)

The architecture above is theoretically sound. The D1 spike needs to confirm:

### D1.0: Tambo can connect to mongodb-mcp-server over HTTP

```bash
# In a Cloud Run instance or local Docker
docker run -d -p 3000:3000 \
  -e MDB_MCP_READ_ONLY=true \
  -e MDB_MCP_CONNECTION_STRING="mongodb+srv://..." \
  mongodb/mongodb-mcp-server:latest \
  --transport http --httpHost=0.0.0.0

# In Tambo config (Tambo Cloud or self-hosted):
# Add MCP server:
#   URL: http://localhost:3000
#   Transport: HTTP
#   Server Key: mongodb

# In a test React component:
#   User types: "How many documents are in the users collection?"
#   Expected: Tambo agent calls mongodb-mcp-server's list_collections
#   Returns count, agent picks <StatCard value={count} />
```

**Success criteria:** Round-trip works without throwing. `StatCard` renders with the right data.

**Failure modes and fallbacks:**

1. **Tambo's MCP client doesn't connect to localhost in server-side mode.** This is unlikely (server-side MCP runs in the same network namespace), but if it happens, run the mongodb-mcp-server on a different port within the same Cloud Run container and use `127.0.0.1:<port>`.

2. **mongodb-mcp-server's HTTP transport doesn't support Tambo's MCP protocol version.** Tambo uses MCP protocol v1; mongodb-mcp-server implements MCP protocol v1. Should be compatible. If not, downgrade to SSE transport (mongodb-mcp-server supports both).

3. **Tambo's server-side MCP doesn't support per-session tool configuration.** This is more likely. Tambo's server-side MCP is configured at the project level, not per-session. Workaround: each tenant gets their own Tambo "project" (overkill), or we proxy through our own backend (the `argus-result-set-guard` is a custom HTTP server that takes a session token, looks up the connection string, and proxies MCP calls).

   **The proxy pattern is the right answer.** It's also what gives us the per-tenant subprocess isolation. So if Tambo's server-side MCP is too rigid, the fallback is:
   - Frontend → Tambo backend (with Gemini)
   - Tambo backend calls our `argus-mcp-manager` (a simple HTTP server with one endpoint per MCP tool)
   - `argus-mcp-manager` spawns / looks up the per-tenant mongodb-mcp-server subprocess
   - Subprocess returns data, which Tambo packages into a card prop

   This is a bit more code, but it's also more controlled.

### D1.1: Tambo + Gemini round-trip works

```bash
# In Tambo config:
# LLM Provider: Google
# Model: gemini-3-flash-preview
# API Key: $GEMINI_API_KEY

# Test: a simple conversation with a registered component
```

**Success criteria:** The agent picks a registered component, fills in props, frontend renders it.

**Failure modes and fallbacks:**

1. **Tambo's Gemini integration has bugs.** The recent v1.0 release has been stable, but Gemini-3-flash-preview is new. Fallback: gemini-2.5-flash (mature).

2. **Tambo's BYO Gemini key doesn't work in self-hosted mode.** Self-hosting is OSS; some features may be cloud-only. Fallback: if Tambo Cloud is the only way to use Gemini, then we use Tambo Cloud (with our own API key) and accept that the LLM call goes through Tambo's hosted backend — which is not "all AI must be Google" because **Tambo is a Google Cloud partner, but their cloud doesn't use Vertex AI by default**. The fix: in self-hosted mode, the LLM call goes directly from our Cloud Run instance to `generativelanguage.googleapis.com` using our `GEMINI_API_KEY`. No third-party AI in the loop.

3. **Streaming doesn't work.** Tambo's streaming is supposed to work; if it doesn't, fall back to non-streaming. The 3-min video demo doesn't strictly need streaming.

### D1.2: 5 MongoDB tools are reachable + a card renders

Pick the 5 most common tools from the 26 database tools and 19 Atlas tools:
- `mongodb_list_collections` (DB)
- `mongodb_collection_schema` (DB)
- `mongodb_find` (DB)
- `mongodb_aggregate` (DB)
- `atlas_list_clusters` (Atlas)

Wire each to a Tambo card descriptor with a Zod schema. Ask: "show me the collections in my database." Verify it renders a list.

**Success criteria:** All 5 tools work end-to-end. The agent picks the right card for each tool.

---

## What to Do With These Findings

### If the D1 spike passes

1. **Update argus.txt** to reflect the new architecture (Tambo self-hosted on Cloud Run, mongodb-mcp-server HTTP transport, result_set_guard as middleware).
2. **Update ARCHITECTURE.md** with the diagram above.
3. **Pin the versions** in package.json and in the mongodb-mcp-server Dockerfile.
4. **Write the 7 Zod schemas** (one per card) — see `14-zod-schemas.md`.
5. **Write the 5 route table** — see `15-routes.md`.
6. **Write the SSE / streaming contract** for the chat interface.
7. **Document the D1 spike outcomes** in the README.

### If the D1 spike fails

1. **Fallback A (Tambo works, mongodb-mcp-server HTTP transport has a bug):** Wrap the mongodb-mcp-server in our own stdio-to-HTTP shim. ~50 lines of Python. Doesn't change the architecture.
2. **Fallback B (Tambo's server-side MCP is too rigid):** Build the `argus-mcp-manager` HTTP proxy as the primary pattern, and skip Tambo's MCP integration. Tambo is still used for the generative UI (component registration, streaming, state), but the MCP call goes: Tambo backend → `argus-mcp-manager` → mongodb-mcp-server (still HTTP). The frontend is unchanged. ~200 lines of Python in addition.
3. **Fallback C (Tambo is incompatible with our setup entirely):** Build a hand-rolled Zod-validated component catalog. The agent emits JSON like `{component: "StatCard", props: {value: 47, label: "Users"}}`, the frontend renders the matching component. We lose Tambo's streaming infrastructure (~2 days of work to build it ourselves), but the architecture still works. This is the 1-day "fully decoupled" path.

---

## Comparison Matrix

| Approach | Pros | Cons | LOC | Time |
|---|---|---|---|---|
| **A. Tambo + mongodb-mcp-server HTTP** (recommended) | Best UX, native MCP, Gemini-native, OSS | New stack, D1 spike risk | ~300 (Tambo + 7 Zod schemas) | 3 days |
| **B. Tambo + argus-mcp-manager proxy** | Same UX, full control over per-tenant isolation | More code, two layers of indirection | ~500 | 4 days |
| **C. Hand-rolled generative UI** | No new deps, full control, simpler stack | We build streaming, state, MCP integration ourselves | ~800 | 5 days |

**My recommendation: Try A first, fall back to B if the D1 spike shows A is fragile, fall back to C only if A and B both fail.**

The D1 spike is a 1-hour investment that de-risks the entire frontend stack. If A passes, the team saves 2-3 days of building their own streaming infrastructure. If A fails, the fallback (B or C) is well-understood and documented here.
