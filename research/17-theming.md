# Theming & Design Tokens

**Date:** 2026-06-01
**Status:** Draft. The theming system for the Argus frontend. Tailwind config + CSS variables + 1 design philosophy.

---

## Design philosophy

**Argus is "the all-seeing eye for your MongoDB data."** The brand should feel:
- **Observational, not interactive.** Argus watches your data and surfaces findings. It's not a chat-with-your-data app where the user drives every interaction.
- **Calm, not alarming.** Anomalies are highlighted, but the default state is calm. The user shouldn't feel their data is "in danger."
- **Precise, not flashy.** Numbers are monospace. Charts are clean. No gradients, no glows, no shadows beyond a single 1px border.
- **Two-mode (light + dark) by default.** MongoDB developers work in terminals; dark mode is the default for them.

**Visual reference:** Linear, Vercel's dashboard, MongoDB Compass's dark mode. NOT Tableau (too cluttered), NOT ChatGPT (too playful).

---

## Color tokens

### Brand colors

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--argus-primary` | `#1e40af` (blue-800) | `#60a5fa` (blue-400) | Primary actions, links, active states |
| `--argus-primary-fg` | `#ffffff` | `#0a0a0a` | Text on `--argus-primary` |
| `--argus-secondary` | `#7c3aed` (violet-600) | `#a78bfa` (violet-400) | Secondary actions, accent borders |
| `--argus-accent` | `#059669` (emerald-600) | `#34d399` (emerald-400) | Success, positive trends |
| `--argus-warning` | `#d97706` (amber-600) | `#fbbf24` (amber-400) | Warnings, anomalies |
| `--argus-danger` | `#dc2626` (red-600) | `#f87171` (red-400) | Errors, refusals, write-protection blocks |

### Surface colors

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--argus-bg` | `#ffffff` | `#0a0a0a` | Page background |
| `--argus-bg-elevated` | `#f9fafb` (gray-50) | `#171717` (neutral-900) | Card background |
| `--argus-bg-sunken` | `#f3f4f6` (gray-100) | `#0f0f0f` (neutral-950) | Inset surfaces (form inputs, code blocks) |
| `--argus-border` | `#e5e7eb` (gray-200) | `#262626` (neutral-800) | Default 1px border |
| `--argus-border-strong` | `#d1d5db` (gray-300) | `#404040` (neutral-700) | Hover / focus border |

### Text colors

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--argus-text` | `#0a0a0a` | `#fafafa` | Primary text |
| `--argus-text-muted` | `#6b7280` (gray-500) | `#a3a3a3` (neutral-400) | Secondary text |
| `--argus-text-subtle` | `#9ca3af` (gray-400) | `#737373` (neutral-500) | Tertiary text, captions |
| `--argus-text-inverse` | `#ffffff` | `#0a0a0a` | Text on dark surfaces |

### Semantic colors

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--argus-success-bg` | `#d1fae5` (emerald-100) | `#064e3b` (emerald-900) | Success background |
| `--argus-warning-bg` | `#fef3c7` (amber-100) | `#78350f` (amber-900) | Warning background |
| `--argus-danger-bg` | `#fee2e2` (red-100) | `#7f1d1d` (red-900) | Error background |
| `--argus-info-bg` | `#dbeafe` (blue-100) | `#1e3a8a` (blue-900) | Info background |

---

## Typography

### Font families

| Token | Family | Use |
|---|---|---|
| `--argus-font-sans` | `Inter, system-ui, -apple-system, sans-serif` | UI text, headings |
| `--argus-font-mono` | `JetBrains Mono, Menlo, monospace` | Numbers, MQL pipelines, code blocks, connection strings |

**Why Inter:** Open source, geometric, optimized for UI. Used by Linear, Vercel, GitHub.
**Why JetBrains Mono:** Open source, designed for code, used by MongoDB Compass. The monospace + tabular numerals make numbers align cleanly in cards.

### Type scale

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `--argus-text-xs` | 12px | 16px | 400 | Captions, helper text |
| `--argus-text-sm` | 14px | 20px | 400 | Body text (small) |
| `--argus-text-base` | 16px | 24px | 400 | Body text (default) |
| `--argus-text-lg` | 18px | 28px | 400 | Subheadings |
| `--argus-text-xl` | 20px | 28px | 600 | Card titles |
| `--argus-text-2xl` | 24px | 32px | 600 | Page titles |
| `--argus-text-3xl` | 30px | 36px | 700 | Landing H1 |
| `--argus-text-4xl` | 36px | 40px | 700 | StatCard big number |

### Special typography

- **All numbers in cards** use `font-variant-numeric: tabular-nums` for clean alignment.
- **MQL pipelines** use `--argus-font-mono` and `--argus-text-sm`.
- **Connection strings** use `--argus-font-mono` and `--argus-text-xs`.

---

## Spacing

**Base unit: 4px.** All spacing is a multiple of 4.

| Token | Value | Use |
|---|---|---|
| `--argus-space-1` | 4px | Tight gap between icon and label |
| `--argus-space-2` | 8px | Form field padding, button padding |
| `--argus-space-3` | 12px | Card padding (compact) |
| `--argus-space-4` | 16px | Card padding (default), list item gap |
| `--argus-space-6` | 24px | Section gap, page padding |
| `--argus-space-8` | 32px | Major section gap |
| `--argus-space-12` | 48px | Page-level vertical rhythm |
| `--argus-space-16` | 64px | Hero section vertical rhythm |

---

## Border radius

| Token | Value | Use |
|---|---|---|
| `--argus-radius-sm` | 4px | Form inputs, small buttons |
| `--argus-radius-md` | 8px | Cards, buttons |
| `--argus-radius-lg` | 12px | Modals, large cards |
| `--argus-radius-full` | 9999px | Pills, avatars, status indicators |

**Default:** Cards use `--argus-radius-md` (8px). This is "rounded but not too round" — feels modern without being playful.

---

## Shadows

| Token | Value | Use |
|---|---|---|
| `--argus-shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Subtle elevation (form inputs) |
| `--argus-shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | Card hover |
| `--argus-shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | Modals |

**The design philosophy is "1px borders, not shadows."** Most components have a 1px border; shadows are reserved for hover/focus states and modals. This keeps the UI feeling flat and observational.

---

## Iconography

**Library:** `lucide-react` (open source, 1000+ icons, tree-shakeable).

**Sizes:**
- `16px` — inline with body text
- `20px` — button icons
- `24px` — card headers, status pills

**Style:** Outline (default) and solid (for status indicators). Stroke width 1.5.

**Key icons:**
- `Eye` — Argus logo
- `Database` — MongoDB
- `MessageSquare` — chat
- `LayoutGrid` — dashboard
- `Sparkles` — AI-driven insight
- `Lock` — read-only indicator
- `AlertTriangle` — anomaly
- `CheckCircle2` — success
- `XCircle` — error / refusal

---

## Animation

**Library:** Framer Motion (for one-time animations only) + CSS transitions (for hover/focus).

**Principles:**
- **No infinite animations.** No pulsing, no spinning, no auto-playing. Argus is observational, not attention-seeking.
- **200ms for hover transitions.** Fast enough to feel responsive.
- **300ms for layout transitions.** Slow enough to feel smooth, not sluggish.
- **Respect `prefers-reduced-motion`.** Disable all non-essential animations for users who prefer reduced motion.

**Specific animations:**
- Card enter: `opacity 0 → 1, translateY 8px → 0`, 300ms, ease-out
- Card hover: `shadow-sm → shadow-md`, 200ms, ease-in-out
- Button press: `scale 1 → 0.98`, 100ms, ease-out
- Status pill change: `color transition`, 300ms, ease-in-out
- Modal enter: `opacity + scale 0.95 → 1`, 200ms, ease-out

---

## Tailwind config (sketch)

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        argus: {
          primary: 'var(--argus-primary)',
          'primary-fg': 'var(--argus-primary-fg)',
          secondary: 'var(--argus-secondary)',
          accent: 'var(--argus-accent)',
          warning: 'var(--argus-warning)',
          danger: 'var(--argus-danger)',
          bg: 'var(--argus-bg)',
          'bg-elevated': 'var(--argus-bg-elevated)',
          'bg-sunken': 'var(--argus-bg-sunken)',
          border: 'var(--argus-border)',
          'border-strong': 'var(--argus-border-strong)',
          text: 'var(--argus-text)',
          'text-muted': 'var(--argus-text-muted)',
          'text-subtle': 'var(--argus-text-subtle)',
        },
      },
      fontFamily: {
        sans: 'var(--argus-font-sans)',
        mono: 'var(--argus-font-mono)',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## CSS variables (light + dark)

```css
/* app/globals.css */
:root {
  /* Brand */
  --argus-primary: #1e40af;
  --argus-primary-fg: #ffffff;
  --argus-secondary: #7c3aed;
  --argus-accent: #059669;
  --argus-warning: #d97706;
  --argus-danger: #dc2626;

  /* Surfaces */
  --argus-bg: #ffffff;
  --argus-bg-elevated: #f9fafb;
  --argus-bg-sunken: #f3f4f6;
  --argus-border: #e5e7eb;
  --argus-border-strong: #d1d5db;

  /* Text */
  --argus-text: #0a0a0a;
  --argus-text-muted: #6b7280;
  --argus-text-subtle: #9ca3af;
  --argus-text-inverse: #ffffff;

  /* Semantic */
  --argus-success-bg: #d1fae5;
  --argus-warning-bg: #fef3c7;
  --argus-danger-bg: #fee2e2;
  --argus-info-bg: #dbeafe;

  /* Fonts */
  --argus-font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --argus-font-mono: 'JetBrains Mono', Menlo, monospace;
}

.dark {
  --argus-primary: #60a5fa;
  --argus-primary-fg: #0a0a0a;
  --argus-secondary: #a78bfa;
  --argus-accent: #34d399;
  --argus-warning: #fbbf24;
  --argus-danger: #f87171;

  --argus-bg: #0a0a0a;
  --argus-bg-elevated: #171717;
  --argus-bg-sunken: #0f0f0f;
  --argus-border: #262626;
  --argus-border-strong: #404040;

  --argus-text: #fafafa;
  --argus-text-muted: #a3a3a3;
  --argus-text-subtle: #737373;
  --argus-text-inverse: #0a0a0a;

  --argus-success-bg: #064e3b;
  --argus-warning-bg: #78350f;
  --argus-danger-bg: #7f1d1d;
  --argus-info-bg: #1e3a8a;
}
```

---

## Dark mode toggle

**Default:** `prefers-color-scheme: dark` (MongoDB developers work in terminals; dark is the default).

**Override:** A toggle in the user menu. Persists in `localStorage`. Three options: `system | light | dark`.

**Implementation:**
```typescript
// components/ThemeToggle.tsx
'use client';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  useEffect(() => {
    const stored = localStorage.getItem('argus-theme') as 'light' | 'dark' | 'system' | null;
    if (stored) setTheme(stored);
  }, []);
  
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else if (theme === 'light') root.classList.remove('dark');
    else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    }
    localStorage.setItem('argus-theme', theme);
  }, [theme]);
  
  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value as any)}>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
```

---

## What this gets the team

- A consistent visual language across the 5 routes + the 7 cards.
- Light + dark mode out of the box (important for the MongoDB developer audience).
- A design system that's easy to extend (add a new card, follow the same color/typography patterns).
- The "observational" feel — not flashy, not alarming, just precise.

## What this does NOT cover

- The specific chart styling (handled by Recharts theme props).
- The animation library choice (Framer Motion is the recommendation; lighter alternatives exist).
- The responsive breakpoints (covered in `20-responsive.md`).
- The accessibility (ARIA labels, contrast) — partially covered here, full coverage in `20-responsive.md`.
