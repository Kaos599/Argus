# 7 Zod Card Schemas

**Date:** 2026-06-01
**Status:** Draft. Each schema is the contract between the backend (`card_renderer.py`) and the frontend (Tambo component registry). 7 cards, each ≤30 lines of Zod.

---

## The 7 cards

| # | Card | Purpose | Module |
|---|---|---|---|
| 1 | **StatCard** | Single number with label and trend. | Funnel, Anomaly |
| 2 | **TimeSeriesCard** | Line chart of a metric over time. | Funnel, Anomaly |
| 3 | **BarChartCard** | Bar chart of categories with values. | Funnel, Attribution |
| 4 | **HeatmapCard** | 2D heatmap (rows × cols). | Cohort, RFM |
| 5 | **TableCard** | Sortable, filterable table. | All modules |
| 6 | **SummaryCard** | Natural-language summary with key findings. | All modules |
| 7 | **ErrorCard** | Failure explanation with retry / dismiss actions. | All modules |

Each card has a Zod schema (for the LLM to fill), a React component (to render), and a Tambo registration entry.

---

## Card 1: StatCard

```typescript
// frontend/src/cards/StatCard.tsx + schemas/stat-card.ts
import { z } from 'zod';

export const StatCardProps = z.object({
  label: z.string().describe('Human-readable label, e.g. "Active users"'),
  value: z.number().describe('The numeric value'),
  unit: z.enum(['', 'count', 'percent', 'usd', 'eur', 'gbp', 'days', 'hours']).optional()
    .describe('Optional unit suffix'),
  delta: z.number().optional()
    .describe('Optional change from previous period (signed)'),
  deltaWindow: z.enum(['day', 'week', 'month']).optional()
    .describe('Window the delta is measured over'),
  trend: z.enum(['up', 'down', 'flat']).optional()
    .describe('Optional explicit trend (overrides delta sign)'),
  comparisonText: z.string().optional()
    .describe('Optional text to render under the value, e.g. "vs. last week"'),
});

export type StatCardProps = z.infer<typeof StatCardProps>;
```

**Rendered as:** A single large number with optional small delta indicator (green/red triangle, percentage) and a small caption.

**Example prompt that produces this card:**
> "How many active users did we have last week?"

---

## Card 2: TimeSeriesCard

```typescript
import { z } from 'zod';

export const TimeSeriesCardProps = z.object({
  title: z.string().describe('Chart title, e.g. "Daily signups"'),
  series: z.array(z.object({
    name: z.string().describe('Series name, e.g. "Signups"'),
    points: z.array(z.object({
      t: z.string().describe('ISO 8601 timestamp'),
      v: z.number().describe('Value at that timestamp'),
    })),
    color: z.enum(['primary', 'secondary', 'success', 'warning', 'danger']).optional(),
  })).min(1).describe('One or more time series'),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional()
    .describe('Time granularity (used for axis ticks)'),
  showAnomalies: z.boolean().optional()
    .describe('If true, highlight points that are >2σ from the rolling mean'),
});

export type TimeSeriesCardProps = z.infer<typeof TimeSeriesCardProps>;
```

**Rendered as:** A line chart with 1-3 series, x-axis = time, y-axis = value. Optional anomaly markers (red dots).

**Example prompt:**
> "Show me the daily signups for the last 30 days."

---

## Card 3: BarChartCard

```typescript
import { z } from 'zod';

export const BarChartCardProps = z.object({
  title: z.string().describe('Chart title, e.g. "Revenue by country"'),
  orientation: z.enum(['vertical', 'horizontal']).default('vertical'),
  bars: z.array(z.object({
    label: z.string().describe('Bar label, e.g. "US" or "Q1 2026"'),
    value: z.number().describe('Bar value'),
    color: z.enum(['primary', 'secondary', 'success', 'warning', 'danger']).optional(),
  })).min(1).max(20).describe('Between 1 and 20 bars'),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  sortBy: z.enum(['value-desc', 'value-asc', 'label-asc']).default('value-desc'),
  showValues: z.boolean().default(true)
    .describe('If true, show numeric value on each bar'),
});

export type BarChartCardProps = z.infer<typeof BarChartCardProps>;
```

**Rendered as:** A bar chart (vertical or horizontal), 1-20 bars, sorted by value or label.

**Example prompt:**
> "What's the top 10 countries by revenue?"

---

## Card 4: HeatmapCard

```typescript
import { z } from 'zod';

export const HeatmapCardProps = z.object({
  title: z.string().describe('Chart title, e.g. "Retention by cohort"'),
  rowLabels: z.array(z.string()).min(2).max(20)
    .describe('Row labels (e.g., acquisition weeks)'),
  colLabels: z.array(z.string()).min(2).max(20)
    .describe('Column labels (e.g., days since signup)'),
  values: z.array(z.array(z.number()))
    .describe('2D array of values, shape = [rowLabels.length, colLabels.length]'),
  colorScale: z.enum(['sequential', 'diverging']).default('sequential'),
  colorDomain: z.tuple([z.number(), z.number()]).optional()
    .describe('Optional [min, max] for color scale; if omitted, auto-fit'),
  cellFormat: z.enum(['count', 'percent', 'usd']).default('count')
    .describe('Format for the cell labels'),
  showRowLabels: z.boolean().default(true),
  showColLabels: z.boolean().default(true),
});

export type HeatmapCardProps = z.infer<typeof HeatmapCardProps>;
```

**Rendered as:** A 2D heatmap (max 20x20 cells), with cell labels showing the value, color scale from low to high.

**Example prompt:**
> "Show me weekly retention by acquisition week for the last 12 weeks."

---

## Card 5: TableCard

```typescript
import { z } from 'zod';

export const TableCardProps = z.object({
  title: z.string().describe('Table title, e.g. "Top 100 users by spend"'),
  columns: z.array(z.object({
    key: z.string().describe('Column key, matches row[key]'),
    label: z.string().describe('Column header label'),
    format: z.enum(['text', 'number', 'percent', 'usd', 'date', 'datetime']).default('text'),
    sortable: z.boolean().default(true),
    align: z.enum(['left', 'center', 'right']).default('left'),
  })).min(1).max(10).describe('Between 1 and 10 columns'),
  rows: z.array(z.record(z.union([z.string(), z.number(), z.null()]))).min(1).max(1000)
    .describe('Between 1 and 1000 rows; each row is a key-value object'),
  pageSize: z.number().min(10).max(100).default(25)
    .describe('Number of rows per page'),
  enableSearch: z.boolean().default(true),
  enableExport: z.boolean().default(true)
    .describe('If true, add a "Download as CSV" button'),
});

export type TableCardProps = z.infer<typeof TableCardProps>;
```

**Rendered as:** A paginated, sortable, searchable table with CSV export.

**Example prompt:**
> "List the top 100 users by total spend, including their signup date and last active date."

---

## Card 6: SummaryCard

```typescript
import { z } from 'zod';

export const SummaryCardProps = z.object({
  title: z.string().describe('Card title, e.g. "Anomaly detected"'),
  summary: z.string().describe('1-3 sentence natural-language summary'),
  findings: z.array(z.object({
    text: z.string().describe('A single finding, e.g. "Signups dropped 47% on Tuesday"'),
    severity: z.enum(['info', 'warning', 'critical']).default('info'),
    metric: z.string().optional().describe('The metric this finding is about'),
    delta: z.number().optional().describe('The numeric change'),
  })).max(5).describe('Up to 5 structured findings'),
  suggestedActions: z.array(z.string()).max(3).optional()
    .describe('Optional follow-up questions the user might ask'),
  relatedCard: z.union([
    z.lazy(() => StatCardProps),
    z.lazy(() => TimeSeriesCardProps),
    z.lazy(() => BarChartCardProps),
  ]).optional().describe('Optional drill-down card'),
});

export type SummaryCardProps = z.infer<typeof SummaryCardProps>;
```

**Rendered as:** A card with a title, a 1-3 sentence summary, 1-5 bulleted findings (each with a severity icon), and 0-3 "you might want to ask..." suggestion chips.

**Example prompt:**
> "What anomalies do you see in the last 7 days?"

---

## Card 7: ErrorCard

```typescript
import { z } from 'zod';

export const ErrorCardProps = z.object({
  title: z.string().default('Something went wrong').describe('Card title'),
  message: z.string().describe('Human-readable error explanation'),
  errorCode: z.string().optional().describe('Optional error code for support'),
  technicalDetails: z.string().optional()
    .describe('Optional technical details (e.g., the failing MQL pipeline)'),
  isRetryable: z.boolean().default(true)
    .describe('If true, show a "Retry" button'),
  isReadOnlyViolation: z.boolean().default(false)
    .describe('If true, this error is a write-protection refusal (not a bug)'),
  guidance: z.string().optional()
    .describe('Optional guidance, e.g. "Connect with a read-only user to use this feature"'),
});

export type ErrorCardProps = z.infer<typeof ErrorCardProps>;
```

**Rendered as:** A red-bordered card with an icon, a title, an error message, optional technical details (collapsible), and 1-2 action buttons (Retry, Dismiss, or both).

**Example prompt that produces this card:**
> "drop the users collection" → The agent refuses, the `isReadOnlyViolation: true` is set, and the `guidance` says "Argus is read-only by design. See the 3 layers of write protection."

---

## Tambo registration

Each card registers with the Tambo React SDK:

```typescript
// frontend/src/cards/index.ts
import { components } from '@tambo-ai/react';

export const cardDescriptors = [
  {
    name: 'StatCard',
    description: 'Single number with optional trend indicator. Use for KPIs.',
    component: StatCard,
    propsSchema: StatCardProps,
  },
  {
    name: 'TimeSeriesCard',
    description: 'Line chart of a metric over time. Use for trends, daily/weekly metrics.',
    component: TimeSeriesCard,
    propsSchema: TimeSeriesCardProps,
  },
  {
    name: 'BarChartCard',
    description: 'Bar chart of categories. Use for top-N, breakdowns.',
    component: BarChartCard,
    propsSchema: BarChartCardProps,
  },
  {
    name: 'HeatmapCard',
    description: '2D heatmap. Use for cohort analysis, time-vs-time, segment-vs-segment.',
    component: HeatmapCard,
    propsSchema: HeatmapCardProps,
  },
  {
    name: 'TableCard',
    description: 'Sortable, paginated table. Use for top-N lists, raw data.',
    component: TableCard,
    propsSchema: TableCardProps,
  },
  {
    name: 'SummaryCard',
    description: 'Natural-language summary with findings. Use for anomaly reports, weekly digests.',
    component: SummaryCard,
    propsSchema: SummaryCardProps,
  },
  {
    name: 'ErrorCard',
    description: 'Error or refusal explanation. Use for failures and write-protection refusals.',
    component: ErrorCard,
    propsSchema: ErrorCardProps,
  },
];
```

This is the contract. The backend `card_renderer.py` emits JSON that matches one of these 7 Zod schemas. The frontend uses the matching React component to render.

---

## Backend contract

The backend `card_renderer.py` is the function that turns an insight module's output into one of these card descriptors. It looks like:

```python
# backend/insights/card_renderer.py
from typing import Literal
from pydantic import BaseModel

class CardDescriptor(BaseModel):
    component_name: Literal['StatCard', 'TimeSeriesCard', 'BarChartCard', 'HeatmapCard', 'TableCard', 'SummaryCard', 'ErrorCard']
    props: dict  # Validated against the matching Zod schema on the frontend

def render_funnel_card(funnel_data: dict) -> CardDescriptor:
    return CardDescriptor(
        component_name='StatCard',
        props={
            'label': 'Conversion rate',
            'value': funnel_data['conversion_rate'],
            'unit': 'percent',
            'delta': funnel_data['delta_vs_last_period'],
            'deltaWindow': 'week',
        }
    )

# Similar render functions for the other 6 cards
```

The Pydantic model on the backend + the Zod schema on the frontend must match. **If they don't match, the card fails to render.** This is the XSS / data-integrity closed-at-design-level (per the audit's positive finding).

---

## What this gets the team

- The contract is locked. The backend can emit card descriptors without knowing the frontend details.
- The 7 Zod schemas are version-controlled. Changes to the contract are explicit commits.
- The LLM (Tambo's planner) has 7 options to choose from. The "right" card is one of 7; the LLM picks, the schema validates.
- The ErrorCard is the "read-only by default" moment in card form. The user asks for a write, gets an ErrorCard with `isReadOnlyViolation: true`.

## What this does NOT cover

- The actual React component implementations (separate work).
- The chart library choice (recommend Recharts; lightweight, supports all 5 chart types we need).
- The accessibility features (ARIA labels, keyboard nav) — covered in `20-responsive.md`.
- The theming (covered in `17-theming.md`).
