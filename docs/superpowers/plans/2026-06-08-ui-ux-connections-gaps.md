# UI/UX & Real-Time Connection Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close remaining UI/UX gaps identified in audit: onboarding plan preview, chat suggestion auto-submit, dashboard real-time polling, landing page video embed, grid layout fix, error state wiring.

**Architecture:** 6 independent frontend-only tasks spanning 5 route files. Each task modifies one file with no cross-file dependencies. Backend is already complete — these are purely frontend polish items.

**Tech Stack:** Next.js 15 App Router, React 19, react-grid-layout, lucide-react, Tailwind CSS

---

### Task 1: Fix Onboarding Step 3 to Show Actual Plan Data

**Files:**
- Modify: `frontend/app/onboarding/page.tsx`

**Context:** Step 3 (PlanPreview) currently renders hardcoded mock MQL instead of the actual plan returned by the backend's `/api/v1/plan` endpoint. The `plan()` call in `handleNext()` already returns `{ plan_id, plan }` with `plan` containing `{ module, collection, mql_pipeline }` for each step. We just need to pass this data to the StepPlanPreview component.

- [ ] **Step 1: Pass plan data to StepPlanPreview**

In `OnboardingFlow`, the `plan` response is currently being discarded after extracting `plan_id`:
```typescript
const res = await plan({...});
setPlanId(res.plan_id);
setStep(3);   // res.plan is ignored
```

Add a new state variable `const [planData, setPlanData] = useState<PlanResponseType["plan"]>([]);` and save it:
```typescript
const res = await plan({...});
setPlanId(res.plan_id);
setPlanData(res.plan);
setStep(3);
```

- [ ] **Step 2: Update StepPlanPreview to render actual pipelines**

Change the component signature and rendering:
```typescript
function StepPlanPreview({ plan }: { plan: PlanResponseType["plan"] }) {
  return (
    <section>
      <h2 className="text-2xl font-bold">Plan preview</h2>
      <p className="mt-1 text-argus-text-muted">
        Review the MQL pipelines the planner generated for each module.
      </p>
      <div className="mt-6 space-y-4">
        {plan.map((step, i) => (
          <details key={i} className="rounded-md border border-argus-border bg-argus-bg-elevated">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              {step.module} on <code className="font-mono">{step.collection}</code>
              {step.estimated_runtime_s != null && (
                <span className="ml-2 text-xs text-argus-text-muted">
                  ~{step.estimated_runtime_s}s
                </span>
              )}
            </summary>
            <pre className="overflow-x-auto border-t border-argus-border bg-argus-bg-sunken p-4 font-mono text-xs">
              {JSON.stringify(step.mql_pipeline, null, 2)}
            </pre>
          </details>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Wire it in OnboardingFlow**

Replace `{step === 3 && <StepPlanPreview />}` with `{step === 3 && <StepPlanPreview plan={planData} />}`

- [ ] **Step 4: Verify the build passes**

Run: `npm run build` in the frontend directory.
Expected: No errors, only existing lint warnings.

---

### Task 2: Fix Chat Suggestions to Auto-Submit

**Files:**
- Modify: `frontend/app/chat/page.tsx`

**Context:** The suggestion strip buttons call `setValue(s)` which fills the textarea, but the user must then click Send. The fix: wrap in a function that sets value AND submits.

- [ ] **Step 1: Add auto-submit handler**

Change the suggestion button onClick:
```typescript
// Before
onClick={() => setValue(s)}

// After
onClick={() => {
  setValue(s);
  // Use setTimeout to let state settle, then submit
  setTimeout(() => {
    const form = document.getElementById("chat-form") as HTMLFormElement;
    if (form) form.requestSubmit();
  }, 0);
}}
```

Or better: use the `submit` function from the hook directly. The issue is that `submit` reads `value` synchronously and the `setValue` is async. We need to ensure the value is set before submit reads it.

Best approach: add a `handleSuggestionClick(suggestion: string)` function that sets value and submits after state settles:
```typescript
function handleSuggestionClick(suggestion: string) {
  setValue(suggestion);
  // submit will be triggered on next render when value is set
  // The form submit handler checks isStreaming and value.trim()
}
```

Actually, looking at the current code more carefully:
```typescript
const submit = handleSubmit; // from useChat's submit

// The form submit does:
onSubmit={(e) => {
  e.preventDefault();
  void submit();
}}
```

And `submit()` reads `value` from the hook state. Since React batches state updates, calling `setValue(s)` then `submit()` in the same event handler should work because React 18+ does automatic batching.

So the fix is:
```typescript
onClick={() => {
  setValue(s);
  // Use requestAnimationFrame to ensure setValue has flushed
  requestAnimationFrame(() => {
    const form = document.getElementById("chat-form");
    if (form) (form as HTMLFormElement).requestSubmit();
  });
}}
```

Wait, but the form's submit handler calls `submit()` which reads the chat hook's value. If `setValue` triggers a re-render, by the time `submit` runs (via rAF), the value should be updated. But `submit` is a stable function from useChat, so this should work.

Actually, the simplest correct approach: add the suggestion click handler inline.

- [ ] **Step 2: Add form id**

Add `id="chat-form"` to the form element.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

---

### Task 3: Add 30s Dashboard Auto-Refresh (Real-Time Polling)

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

**Context:** Per research/16-known-limitations.md, v1 uses polled refresh at 30s intervals. Currently the dashboard only refreshes on manual "Refresh" button click. Add a useEffect that auto-refreshes every 30s when the dashboard is open and has cards.

- [ ] **Step 1: Add auto-refresh effect**

After the existing `useEffect` for initial load, add:
```typescript
useEffect(() => {
  if (!token || !dashboard?.cards.length) return;
  const interval = setInterval(async () => {
    try {
      const fresh = await getDashboard(token);
      setDashboard(fresh);
    } catch {
      // swallow; next interval will retry
    }
  }, 30000);
  return () => clearInterval(interval);
}, [token, dashboard?.cards.length]);
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

---

### Task 4: Fix Landing Page Video Placeholder → YouTube Embed

**Files:**
- Modify: `frontend/app/page.tsx`

**Context:** The spec says a "3-min demo video" embed. Currently shows a placeholder div. Replace with a YouTube iframe. The embed should be lazy-loaded and preserve the aspect ratio.

- [ ] **Step 1: Replace placeholder with YouTube iframe**

Use a placeholder URL since the actual video doesn't exist yet:
```typescript
<section className="mx-auto max-w-screen-xl px-4 pb-16">
  <div className="aspect-video w-full overflow-hidden rounded-lg border border-argus-border bg-argus-bg-sunken">
    <iframe
      width="100%"
      height="100%"
      src="https://www.youtube.com/embed/dQw4w9WgXcQ"
      title="Argus demo video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="h-full w-full"
      loading="lazy"
    />
  </div>
</section>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

---

### Task 5: Fix react-grid-layout data-grid vs layouts Conflict

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

**Context:** The `ResponsiveGridLayout` receives the `layouts` prop with saved layout positions, but each child `<div>` also has a `data-grid` attribute with hardcoded `{x:0, y:0, w:4, h:4}`. react-grid-layout uses `data-grid` as an override when present, which means saved layouts are ignored. Fix: remove `data-grid` from children.

- [ ] **Step 1: Remove data-grid from child divs**

Change:
```typescript
{dashboard.cards.map((descriptor, i) => (
  <div
    key={`card-${i}`}
    className="group"
    data-grid={{
      i: `card-${i}`,
      x: 0,
      y: 0,
      w: 4,
      h: 4,
      minW: 2,
      minH: 3,
    }}
  >
```

To:
```typescript
{dashboard.cards.map((descriptor, i) => (
  <div
    key={`card-${i}`}
    className="group"
  >
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

---

### Task 6: Wire ErrorCard into Onboarding Error States

**Files:**
- Modify: `frontend/app/onboarding/page.tsx`

**Context:** The onboarding page currently shows errors as a plain `<div>` with red text. The spec (research/19-error-states.md) specifies ErrorCard for errors. Replace with the ErrorCard component. Also add guidance text per the spec's failure modes.

- [ ] **Step 1: Import ErrorCard**

Add import:
```typescript
import { ErrorCard } from "@/cards/ErrorCard";
```

- [ ] **Step 2: Replace generic error div with ErrorCard**

Change:
```typescript
{error && (
  <div className="mt-4 rounded-md border border-argus-danger bg-argus-danger-bg/30 p-3 text-sm text-argus-danger">
    {error}
  </div>
)}
```

To:
```typescript
{error && (
  <ErrorCard
    title="Something went wrong"
    message={error}
    isRetryable
    isReadOnlyViolation={false}
    guidance="Try going back a step and adjusting your selections."
  />
)}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

---

### Task 7: Fix Dashboard Add Card Module Selector to Submit Properly

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

**Context:** The "Add card" button shows a picker with 5 modules. Each module button calls `handleAddCard(m)` which sends the request. The response includes both `card_id` and `card`, but the layout append uses `Date.now()` as ID which may mismatch. Fix: use the actual `card_id` from the response.

- [ ] **Step 1: Fix layout append to use real card_id**

Change:
```typescript
const res = await addCard({ session_token: token, module });
setDashboard((d) =>
  d ? {
    ...d,
    cards: [...d.cards, res.card],
    layout: appendLayoutItem(d.layout, `card-${Date.now()}`),
  } : d,
);
```

To:
```typescript
const res = await addCard({ session_token: token, module });
setDashboard((d) =>
  d ? {
    ...d,
    cards: [...d.cards, res.card],
    layout: appendLayoutItem(d.layout, res.card_id),
  } : d,
);
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

---

## Verification

After all tasks:

1. Run `python -m pytest backend/tests/ -q` — all backend tests must pass
2. Run `npm run build` in frontend — build must succeed
3. Run `git status` — verify all changes are tracked
