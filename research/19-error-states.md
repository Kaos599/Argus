# Error State Matrix

**Date:** 2026-06-01
**Status:** Draft. The error states for each surface × failure mode combination. Used by the UI to render consistent error messages.

---

## Surfaces (rows)

1. **Landing page** (`/`)
2. **Connect page** (`/connect`)
3. **Onboarding** (`/onboarding`)
4. **Dashboard** (`/dashboard`)
5. **Chat** (`/chat`)

## Failure modes (columns)

1. **Network failure** (no internet, timeout, 5xx)
2. **Invalid input** (malformed connection string, bad JSON, missing field)
3. **Auth failure** (not applicable in v1 per user decision; documented for future)
4. **Rate limit** (Gemini API rate limit, MCP server rate limit)
5. **Read-only refusal** (the "drop the users collection" moment)
6. **MongoDB connection failure** (wrong creds, IP allow-list, network)
7. **Schema sample failure** (empty collection, too many collections, timeout)
8. **MQL execution failure** (invalid pipeline, runtime error)
9. **Empty state** (no collections, no data, no cards)
10. **LLM hallucination** (the LLM emits an invalid card descriptor)

That's 5 surfaces × 10 failure modes = 50 cells. Below, each cell is specified.

---

## Surface 1: Landing page (`/`)

| Failure mode | Behavior | UI |
|---|---|---|
| Network failure | Show static page; offline users see cached version | Offline banner at top |
| Invalid input | n/a (no input) | n/a |
| Auth failure | n/a (no auth in v1) | n/a |
| Rate limit | n/a (no API calls) | n/a |
| Read-only refusal | n/a (no MongoDB) | n/a |
| MongoDB connection failure | n/a (no MongoDB) | n/a |
| Schema sample failure | n/a | n/a |
| MQL execution failure | n/a | n/a |
| Empty state | n/a | n/a |
| LLM hallucination | n/a | n/a |

**Notes:** The landing page is static. No API calls in v1. The only failure mode is network failure, which is handled by the browser's offline cache.

---

## Surface 2: Connect page (`/connect`)

| Failure mode | Behavior | UI |
|---|---|---|
| Network failure | Disable the "Connect" button; show "No connection" message | Red ErrorCard |
| Invalid input | Show field-level validation error | Red text below the input |
| Auth failure | n/a (no auth) | n/a |
| Rate limit | Disable the button; show "Try again in 60s" | Yellow ErrorCard with countdown |
| Read-only refusal | n/a (we're connecting, not querying) | n/a |
| MongoDB connection failure | Show the error from the probe | Red ErrorCard with the error message + "Retry" button |
| Schema sample failure | n/a (not yet sampled) | n/a |
| MQL execution failure | n/a | n/a |
| Empty state | n/a (no data yet) | n/a |
| LLM hallucination | n/a | n/a |

**Notes:** The "Connect" button is disabled until the connection string is valid. Validation is client-side (regex on the connection string format) plus server-side (the probe call).

---

## Surface 3: Onboarding (`/onboarding`)

| Failure mode | Behavior | UI |
|---|---|---|
| Network failure | Show retry banner; preserve step state | Yellow banner at top |
| Invalid input | n/a (no input in onboarding) | n/a |
| Auth failure | n/a (no auth) | n/a |
| Rate limit | Show "Try again in 60s" on the affected step | Yellow ErrorCard on the affected step |
| Read-only refusal | If the user manually enters a write MQL pipeline, refuse with a card | Red ErrorCard with the 3 layers explained |
| MongoDB connection failure | If the connection dies mid-onboarding, show a banner | Yellow banner: "Connection lost. Reconnect?" |
| Schema sample failure | If sampling fails, show a fallback: "We'll use collection names + doc counts only" | Yellow ErrorCard with the fallback explanation |
| MQL execution failure | If a module's MQL fails, show the error and let the user skip | Red ErrorCard with the error + "Skip" button |
| Empty state | If the cluster has no collections, show: "Your cluster is empty. Add some data and refresh." | Empty state with illustration |
| LLM hallucination | If the planner emits an invalid plan, fall back to the default 5 modules | Yellow notice: "Using default insight modules" |

**Notes:** Onboarding is the most failure-prone surface. The UI must handle each step independently. If step 2 (insight selection) fails, the user can still complete step 1.

---

## Surface 4: Dashboard (`/dashboard`)

| Failure mode | Behavior | UI |
|---|---|---|
| Network failure | Show stale data; banner: "Showing cached data" | Yellow banner at top |
| Invalid input | n/a (no input) | n/a |
| Auth failure | n/a (no auth) | n/a |
| Rate limit | Disable refresh button; show "Try again in 60s" | Yellow ErrorCard in the toolbar |
| Read-only refusal | If a card tries to write, refuse with a card | Red ErrorCard inline |
| MongoDB connection failure | If the connection dies, show: "Connection lost. Click to reconnect." | Red ErrorCard in the toolbar |
| Schema sample failure | n/a (already sampled) | n/a |
| MQL execution failure | If a card's MQL fails, show the error in the card slot | Red ErrorCard in the card slot |
| Empty state | If the dashboard has no cards, show: "Add your first card to get started" | Empty state with "Add card" button |
| LLM hallucination | If a card's props are invalid, the React component fails to render | Red ErrorCard in the card slot with "Remove this card" button |

**Notes:** The dashboard is mostly read-only. The main failure modes are MQL execution failures (a card's pipeline errors at runtime) and LLM hallucinations (a card has invalid props).

---

## Surface 5: Chat (`/chat`)

| Failure mode | Behavior | UI |
|---|---|---|
| Network failure | Show retry banner; preserve message draft | Yellow banner at top |
| Invalid input | n/a (the LLM handles invalid input) | n/a |
| Auth failure | n/a (no auth) | n/a |
| Rate limit | Show "Try again in 60s" in the input area | Yellow ErrorCard above the input |
| Read-only refusal | **The key moment.** The LLM refuses the write request, returns an ErrorCard | Red ErrorCard with `isReadOnlyViolation: true` and the 3 layers explained |
| MongoDB connection failure | Show: "Connection lost. Click to reconnect." | Red ErrorCard above the input |
| Schema sample failure | n/a (already sampled) | n/a |
| MQL execution failure | The agent explains the error and suggests a fix | ErrorCard with explanation + retry |
| Empty state | n/a (chat is always queryable) | n/a |
| LLM hallucination | If the LLM emits an invalid card, the component fails to render; the agent retries once with a different card type | ErrorCard with retry |

**Notes:** The chat is the surface where the read-only refusal happens. The ErrorCard's `isReadOnlyViolation: true` field is the trigger for the "Argus is read-only by design" message. See `14-zod-schemas.md` Card 7.

---

## The standard error response

All error responses from the backend follow this shape:

```typescript
// Backend error response
{
  error: {
    code: 'CONNECTION_FAILED' | 'INVALID_INPUT' | 'RATE_LIMITED' | 'READ_ONLY_VIOLATION' | 'MQL_EXECUTION_FAILED' | 'LLM_HALLUCINATION' | 'UNKNOWN',
    message: string,  // Human-readable explanation
    technicalDetails?: string,  // Optional technical info for debugging
    isRetryable: boolean,
    guidance?: string,  // Optional guidance, e.g. "Connect with a read-only user"
  }
}
```

The frontend renders this as an ErrorCard (per `14-zod-schemas.md` Card 7).

---

## The 5 universal UI patterns

1. **Red ErrorCard** — for failures (network, MongoDB, MQL, LLM hallucination)
2. **Yellow ErrorCard** — for rate limits and recoverable errors
3. **Red ErrorCard with `isReadOnlyViolation: true`** — for read-only refusals (the key moment)
4. **Banner at top of page** — for persistent state (offline, stale data)
5. **Inline in card slot** — for per-card failures on the dashboard

These 5 patterns cover all 50 cells of the matrix. The matrix is a way to think about which pattern applies to which combination.

---

## The fallback chain (per `04-x14-tambo-mcp.md`)

The chat has an additional layer: the LLM fallback chain. If Gemini 3 Flash fails (rate limit, model unavailable), fall back to:

1. `gemini-3-flash-preview` (primary)
2. `gemini-2.5-flash` (fallback)
3. `gemini-2.5-flash-lite` (last resort)
4. **Hard error** with a clear message

The fallback is invisible to the user; they just see a slightly longer response time.

---

## What this matrix gets the team

- A consistent error UX across all 5 surfaces.
- The read-only refusal is the most-tested interaction. The matrix specifies exactly what it looks like.
- The error codes map to the `ErrorCard.props.errorCode` field (per `14-zod-schemas.md`).
- The frontend can be implemented with 5 reusable error components (one per pattern above).

## What this does NOT cover

- The specific error messages (these are written by the LLM, not hardcoded).
- The internationalization (i18n) of error messages (out of scope for v1).
- The error reporting to Cloud Logging (operational concern, not UI).
- The retry behavior (the ErrorCard has a "Retry" button, but the actual retry logic is per-surface).
