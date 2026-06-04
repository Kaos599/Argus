# Responsive Breakpoints

**Date:** 2026-06-01
**Status:** Draft. The responsive breakpoints for the Argus frontend. Defines the 4 breakpoints, the grid behavior at each, and the component-level adaptations.

---

## Breakpoints (mobile-first)

| Name | Min width | Max width | Target device |
|---|---|---|---|
| `xs` | 0 | 639px | Phone (portrait) |
| `sm` | 640px | 767px | Phone (landscape), small tablet |
| `md` | 768px | 1023px | Tablet (portrait) |
| `lg` | 1024px | 1279px | Tablet (landscape), small laptop |
| `xl` | 1280px | 1535px | Laptop |
| `2xl` | 1536px | ∞ | Desktop |

**Tailwind defaults.** No custom configuration needed.

---

## Grid behavior per breakpoint

The dashboard uses `react-grid-layout` with a 12-column grid. Behavior per breakpoint:

| Breakpoint | Columns | Card min width | Card max width | Row height |
|---|---|---|---|---|
| `xs` | 4 | 1 col | 4 cols | 80px |
| `sm` | 6 | 2 cols | 6 cols | 80px |
| `md` | 12 | 3 cols | 12 cols | 80px |
| `lg` | 12 | 3 cols | 12 cols | 80px |
| `xl` | 12 | 3 cols | 12 cols | 80px |
| `2xl` | 12 | 3 cols | 12 cols | 80px |

**Code (sketch):**
```typescript
const layouts = {
  xs: { cols: 4, breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 } },
  sm: { cols: 6, breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 } },
  md: { cols: 12, breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 } },
  lg: { cols: 12, breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 } },
  xl: { cols: 12, breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 } },
  '2xl': { cols: 12, breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 } },
};
```

---

## Per-route responsive behavior

### `/` (Landing)

| Breakpoint | Layout |
|---|---|
| `xs`, `sm` | Single column. H1 above the architecture diagram. Video full-width. |
| `md` | Single column. H1 above the architecture diagram. Video 16:9, max 720px wide. |
| `lg`, `xl`, `2xl` | Two-column hero (H1 + CTA on left, architecture diagram on right). Video below. |

### `/connect`

| Breakpoint | Layout |
|---|---|
| `xs`, `sm` | Form full-width. Code block scrollable horizontally. |
| `md` | Form max-width 640px, centered. Code block wrap or horizontal scroll. |
| `lg`, `xl`, `2xl` | Form max-width 640px, centered. Code block wrap. |

### `/onboarding`

| Breakpoint | Layout |
|---|---|
| `xs`, `sm` | Stepper at top, single-column content below. Card preview full-width. |
| `md` | Stepper at top, two-column content (preview on left, controls on right). |
| `lg`, `xl`, `2xl` | Stepper at top, two-column content (preview on left, controls on right). Card preview max-width 800px. |

### `/dashboard`

| Breakpoint | Layout |
|---|---|
| `xs`, `sm` | 4-col or 6-col grid. Cards stack to 1 per row. TopBar collapses to hamburger menu. |
| `md` | 12-col grid. Cards can span 3-12 cols. TopBar full. |
| `lg`, `xl`, `2xl` | 12-col grid. Cards can span 3-12 cols. TopBar full. |

### `/chat`

| Breakpoint | Layout |
|---|---|
| `xs`, `sm` | Message thread full-width. Input full-width. Suggestion strip horizontal scroll. |
| `md` | Same as above, slightly more padding. |
| `lg`, `xl`, `2xl` | Message thread max-width 1024px, centered. Input max-width 1024px, centered. Suggestion strip max-width 1024px, centered. |

---

## Per-component responsive behavior

### TopBar (used on `/dashboard`, `/chat`)

| Breakpoint | Layout |
|---|---|
| `xs`, `sm` | Logo on left. Hamburger menu on right (drops down to: refresh, settings, theme toggle, user menu). |
| `md` | Logo on left. Action icons inline. User menu on right. |
| `lg`, `xl`, `2xl` | Logo on left. Action icons inline. User menu on right. |

### StatCard

| Breakpoint | Layout |
|---|---|
| `xs`, `sm` | Label small, value large. Delta indicator below. |
| `md` | Same as above, with more padding. |
| `lg`, `xl`, `2xl` | Same. |

### TimeSeriesCard

| Breakpoint | Layout |
|---|---|
| `xs`, `sm` | Chart full-width. Title and legend above. Axis labels small. |
| `md` | Chart full-width. Title and legend above. |
| `lg`, `xl`, `2xl` | Chart full-width. Title and legend above. Axis labels normal. |

### BarChartCard

| Breakpoint | Layout |
|---|---|
| `xs`, `sm` | Vertical orientation. Bars full-width. Labels small. |
| `md` | Vertical orientation. |
| `lg`, `xl`, `2xl` | Vertical or horizontal (user choice). |

### HeatmapCard

| Breakpoint | Layout |
|---|---|
| `xs`, `sm` | Cells small. Labels tiny. Scroll horizontally if needed. |
| `md` | Cells normal. Labels small. |
| `lg`, `xl`, `2xl` | Cells normal. Labels normal. |

### TableCard

| Breakpoint | Layout |
|---|---|
| `xs`, `sm` | Horizontal scroll. Column labels sticky. Search and export in toolbar. |
| `md` | Same, with more padding. |
| `lg`, `xl`, `2xl` | Full table. Column resizing enabled. |

### SummaryCard

| Breakpoint | Layout |
|---|---|
| All | Single column. Title at top, summary, findings, suggested actions. |

### ErrorCard

| Breakpoint | Layout |
|---|---|
| All | Full-width within its container. Title, message, optional technical details (collapsible), action buttons. |

---

## Mobile-specific UX

### Touch targets

- All interactive elements (buttons, links, cards) have a minimum touch target of 44×44px (Apple's recommendation).
- Spacing between touch targets is at least 8px.
- Drag-and-drop on the dashboard: long-press to start dragging (instead of click-and-drag, which doesn't work on touch).

### Gestures

- **Swipe left on a chat message** → delete.
- **Swipe right on a chat message** → copy.
- **Long-press on a card** → open the card menu.
- **Pinch-to-zoom on charts** → enabled (Recharts supports this with `mouseWheelZoom` prop).

### Performance

- Lazy-load all images.
- Lazy-load chart components (Recharts can be heavy on mobile).
- Use `next/image` for all images.
- Use `next/dynamic` for code-splitting.

---

## Accessibility (WCAG 2.1 AA)

### Color contrast

- All text on background: ≥ 4.5:1 contrast ratio.
- Large text (≥ 18px or ≥ 14px bold): ≥ 3:1 contrast ratio.
- Verified in both light and dark mode.

### Keyboard navigation

- All interactive elements are reachable via Tab.
- Focus indicator is visible (2px ring with `--argus-primary`).
- Skip-to-content link at the top of every page.
- Modal traps focus; Escape closes the modal.
- Drag-and-drop has a keyboard alternative (arrow keys to move, Space to drop).

### Screen readers

- All images have `alt` text.
- All icons have `aria-label` or are `aria-hidden="true"` if decorative.
- All form fields have associated labels.
- All buttons have accessible names.
- Live regions for chat messages and status changes.

### Motion

- Respect `prefers-reduced-motion`: disable all non-essential animations.
- No flashing content (no animations faster than 3Hz).
- Pause-on-hover for any auto-playing content (we don't have any in v1, but the principle is documented).

### Touch

- Touch target size ≥ 44×44px (per above).
- Spacing between touch targets ≥ 8px.
- Gestures have non-gesture alternatives (per above).

---

## What this gets the team

- A consistent responsive behavior across all 5 routes.
- A mobile-first design that doesn't degrade on small screens.
- WCAG 2.1 AA accessibility out of the box.
- The component-level specifications are explicit; the team can implement them in parallel.

## What this does NOT cover

- The actual chart responsive behavior (handled by Recharts props).
- The print stylesheet (out of scope for v1).
- The high-contrast mode (Windows accessibility feature; out of scope for v1).
- The internationalization (i18n) of the UI text (out of scope for v1).
- The right-to-left (RTL) layout (out of scope for v1).
