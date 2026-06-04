# 5-Route Table (Frontend Pages)

**Date:** 2026-06-01
**Status:** Draft. The 5 routes in the Next.js 15 App Router. Each row is a page-level spec: what it shows, what it calls, what it renders.

---

## The 5 routes

| # | Route | Purpose | Auth | Public |
|---|---|---|---|---|
| 1 | `/` | Landing page. Pitch + 3-min video + "Connect" CTA. | none | YES |
| 2 | `/connect` | Connection string form. Validates and probes the cluster. | none | YES |
| 3 | `/onboarding` | 5-step onboarding flow. Schema sample → plan → render → customize. | session | NO |
| 4 | `/dashboard` | The Interactable board. 12-col grid, drag-and-drop cards. | session | NO |
| 5 | `/chat` | The Tambo chat interface. Free-form Q&A. | session | NO |

Plus 2 utility routes:
- `/api/v1/*` — backend API (not a page)
- `/api/v1/events/stream` — SSE endpoint for live updates

---

## Route 1: `/` (Landing)

**Purpose:** Sell the product in 30 seconds. Get the user to `/connect`.

**Sections (in order):**

1. **H1 + tagline.** Per `05-x16-positioning.md` Pillar 1.
2. **3-box architecture diagram.** Per `08-x15-architecture-diagram.md`.
3. **3-min video.** Embedded YouTube iframe.
4. **"Connect your MongoDB" CTA button.** → `/connect`.
5. **5 insight module cards.** With 1 screenshot each.
6. **"How it works" 3-step list.** Connect → Sample → Insight.
7. **Built With** bar (logos).
8. **Footer.** GitHub, Devpost, team.

**Components:** Mostly static. No API calls. Some lazy-loaded images.

**File:** `app/page.tsx` (Next.js App Router).

**Code (sketch):**
```typescript
// app/page.tsx
export default function Landing() {
  return (
    <main>
      <Hero />
      <ArchitectureDiagram />
      <VideoEmbed src="https://www.youtube.com/embed/..." />
      <CTA href="/connect" />
      <ModuleShowcase />
      <HowItWorks />
      <BuiltWith />
      <Footer />
    </main>
  );
}
```

---

## Route 2: `/connect`

**Purpose:** Get the user's MongoDB connection string. Validate it. Probe the cluster.

**UI:**

1. **H1:** "Connect your MongoDB Atlas cluster"
2. **Connection string input.** Multi-line, monospace font. Placeholder: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`
3. **"I understand the risks" gate.** Per `07-risk-acknowledgments.md` — 5 enumerated risks. User must check.
4. **Recommended: create a read-only user.** Code block with mongosh commands.
5. **"Connect" button.** Disabled until the string is valid.
6. **Status indicator:** 🟢 probing / 🟡 sampling / 🔴 error.
7. **Error state:** If the probe fails, show a red ErrorCard with the error message and a "Retry" button.

**API calls:**

- `POST /api/v1/connect` with `{connection_string}` → returns `{session_token, status}`
- `GET /api/v1/probe/{session_token}` → returns `{collections: number, sample_status: 'pending' | 'ready'}`

**On success:** Redirect to `/onboarding`.

**Components:** Form, validation, ErrorCard, status pill.

**File:** `app/connect/page.tsx`.

---

## Route 3: `/onboarding`

**Purpose:** The 5-step onboarding flow. Schema sample → plan → render → customize.

**UI (5 steps, in order):**

1. **Step 1: Schema sample.** Show a list of the top 5 collections (name, doc count, sample field names). The user can override the selection.
2. **Step 2: Insight selection.** Show the 5 modules with "✓ Recommended" or "— Skipped" badges. The user can toggle.
3. **Step 3: Plan preview.** Show the MQL pipeline that each module will run. The user can edit.
4. **Step 4: Render.** Show the rendered cards. Loading state while each card resolves.
5. **Step 5: Customize.** Drag-and-drop to reorder. Resize. Pin. Save layout.

**API calls (per step):**

- `GET /api/v1/sample/{session_token}` → returns `{collections: [...]}`
- `POST /api/v1/plan` with `{session_token, collections, modules}` → returns `{plan: {module: mql_pipeline}}`
- `POST /api/v1/render` with `{session_token, plan_id}` → returns SSE stream of card descriptors
- `PUT /api/v1/dashboard/layout` with `{session_token, layout}` → returns `{ok: true}`

**On step 5 success:** Redirect to `/dashboard`.

**Components:** Stepper, plan editor, card preview, drag-and-drop.

**File:** `app/onboarding/page.tsx`.

**Code (sketch):**
```typescript
// app/onboarding/page.tsx
'use client';
import { useState } from 'react';
import { useTamboThreadInput } from '@tambo-ai/react';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [sessionToken] = useSearchParams().get('token');
  
  return (
    <main>
      <Stepper currentStep={step} totalSteps={5} />
      {step === 1 && <SchemaSample token={sessionToken} />}
      {step === 2 && <InsightSelection token={sessionToken} />}
      {step === 3 && <PlanPreview token={sessionToken} />}
      {step === 4 && <RenderPreview token={sessionToken} />}
      {step === 5 && <CustomizeLayout token={sessionToken} onComplete={() => router.push('/dashboard')} />}
    </main>
  );
}
```

---

## Route 4: `/dashboard`

**Purpose:** The Interactable board. 12-col grid, drag-and-drop cards, persistent layout.

**UI:**

1. **Top bar:** Logo, "Watch the 3-min demo" button (per `05-x16-positioning.md` SRE F14), system status pill, user menu.
2. **12-col grid.** Uses `react-grid-layout`. Each card is a grid item.
3. **Cards:** Render the 5-10 cards from the user's saved dashboard.
4. **Add card button:** + icon, opens a modal with the 5 modules + the 7 card types.
5. **Refresh button:** Manual refresh (per `05-x16-positioning.md` Frontend F-23).
6. **Reset demo data button:** Per SRE F5.

**API calls:**

- `GET /api/v1/dashboard` → returns `{layout, cards: [...]}`
- `PUT /api/v1/dashboard/layout` with `{layout}` → persists layout
- `POST /api/v1/cards` with `{module, params}` → adds a new card
- `POST /api/v1/refresh` → re-runs all MQL pipelines
- `GET /api/v1/events/stream` → SSE for live updates (optional, v1 may not have)

**Components:** TopBar, GridBoard, Card, AddCardModal, RefreshButton.

**File:** `app/dashboard/page.tsx`.

**Code (sketch):**
```typescript
// app/dashboard/page.tsx
'use client';
import { Responsive, WidthProvider } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function Dashboard() {
  const { layout, cards, updateLayout } = useDashboard();
  
  return (
    <main>
      <TopBar />
      <ResponsiveGridLayout
        layouts={layout}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4 }}
        onLayoutChange={updateLayout}
      >
        {cards.map(card => <Card key={card.id} descriptor={card} />)}
      </ResponsiveGridLayout>
      <AddCardButton />
    </main>
  );
}
```

---

## Route 5: `/chat`

**Purpose:** The Tambo chat interface. Free-form Q&A with the agent.

**UI:**

1. **Message thread (top, scrollable).** Each message is a user prompt or an agent response (with cards).
2. **Message input (bottom, fixed).** Textarea + send button.
3. **Suggestions strip (above input).** 3-4 suggested questions.
4. **System status pill (top right).** Per SRE F20.

**API calls:**

- All communication goes through Tambo's React SDK (`useTamboThreadInput`, `useTambo`).
- The Tambo backend proxies MCP calls to the result_set_guard, which calls the mcp_manager, which calls mongodb-mcp-server.

**Components:** MessageThread, MessageInput, SuggestionStrip, Card (from `/dashboard`).

**File:** `app/chat/page.tsx`.

**Code (sketch):**
```typescript
// app/chat/page.tsx
'use client';
import { useTambo, useTamboThreadInput, useTamboSuggestions } from '@tambo-ai/react';
import { cardDescriptors } from '@/cards';

export default function Chat() {
  const { messages, isStreaming } = useTambo();
  const { value, setValue, submit, isPending } = useTamboThreadInput();
  const suggestions = useTamboSuggestions();
  
  return (
    <main className="flex flex-col h-screen">
      <MessageThread messages={messages} isStreaming={isStreaming} />
      <SuggestionStrip suggestions={suggestions} onClick={(s) => setValue(s)} />
      <MessageInput value={value} onChange={setValue} onSubmit={submit} isPending={isPending} />
    </main>
  );
}
```

---

## Utility route: `/api/v1/*` (backend API)

Not a page, but a router. The full API surface:

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/v1/connect` | Issue session token, store connection string | none |
| `GET` | `/api/v1/probe/{token}` | Probe the cluster, return collection list | session |
| `GET` | `/api/v1/sample/{token}` | Sample schemas from top 5 collections | session |
| `POST` | `/api/v1/plan` | Generate plan (which modules to run) | session |
| `POST` | `/api/v1/render` | Run plan, return card descriptors (SSE) | session |
| `GET` | `/api/v1/dashboard` | Get saved dashboard | session |
| `PUT` | `/api/v1/dashboard/layout` | Save dashboard layout | session |
| `POST` | `/api/v1/cards` | Add a card | session |
| `POST` | `/api/v1/refresh` | Re-run all MQL pipelines | session |
| `GET` | `/api/v1/health` | Health check | none |
| `GET` | `/api/v1/events/stream` | SSE for live updates | session |

Per the user decision, **no API-level auth** is required (per `07-risk-acknowledgments.md` X8). The frontend sets an `X-Demo-Mode: true` header for "soft" auth if the team wants to add it later.

---

## Utility route: `/api/v1/events/stream` (SSE)

**Purpose:** Live updates for the dashboard. When a card's underlying data changes (because the underlying MongoDB collection was updated by something other than Argus), the SSE pushes a re-render signal.

**Implementation:**
```typescript
// frontend: useSSE hook
import { useEffect } from 'react';

export function useSSE(token: string, onUpdate: (cardId: string) => void) {
  useEffect(() => {
    const es = new EventSource(`/api/v1/events/stream?token=${token}`);
    es.addEventListener('card-update', (e) => {
      const { cardId } = JSON.parse(e.data);
      onUpdate(cardId);
    });
    return () => es.close();
  }, [token, onUpdate]);
}

// backend: SSE handler (FastAPI)
from fastapi.responses import StreamingResponse
import asyncio

async def event_stream(token: str):
    queue = await get_tenant_queue(token)  # Per-tenant pub/sub
    while True:
        update = await queue.get()
        yield f"event: card-update\ndata: {json.dumps(update)}\n\n"
        await asyncio.sleep(0)

@app.get("/api/v1/events/stream")
async def stream(token: str):
    return StreamingResponse(event_stream(token), media_type="text/event-stream")
```

**Note:** The user said "X15 will be there, just listed" — but SSE wasn't explicitly addressed for v1. v1 can ship with polled refresh (30s interval) and add SSE in v2. This is a v2.0 feature, not a v1.0 requirement. The /api/v1/events/stream endpoint is listed for completeness, but the polling-based refresh is the v1 implementation.

---

## What this gets the team

- The 5 routes are explicit. The Next.js App Router structure is fixed.
- The 11 backend API endpoints are explicit. The contract is fixed.
- Each route has a clear "what it shows" + "what it calls" + "what it renders" pattern. The team can implement them in parallel.
- The auth model is consistent: `/` and `/connect` are public; `/onboarding`, `/dashboard`, `/chat` require a session token. (Per user decision, no JWT — just a session token in a query param or header.)

## What this does NOT cover

- The actual component implementations (separate work).
- The styling (per `17-theming.md`).
- The error states (per `19-error-states.md`).
- The responsive breakpoints (per `20-responsive.md`).
- The SSE implementation (v2, not v1).
- The team role assignments (deferred per user decision).
