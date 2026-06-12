'use client';

import { motion } from 'framer-motion';
import { GitBranch, Users, DollarSign, Tag, AlertTriangle } from 'lucide-react';
import { EASE_OUT_EXPO, STAGGER_ITEM } from '@/lib/motion';
import { ActiveUsersChart, SignupsBySourceChart } from '@/components/MockChartCards';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER_ITEM },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
};

interface ModuleCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  chart?: React.ReactNode;
  wide?: boolean;
}

function ModuleCard({ icon: Icon, title, description, chart, wide }: ModuleCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={[
        'rounded-2xl border border-argus-border bg-argus-bg-elevated p-6',
        'shadow-[var(--argus-shadow-md)] hover:shadow-[var(--argus-shadow-lg)] transition-shadow duration-300',
        'flex flex-col gap-4',
        wide ? 'md:col-span-2' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="inline-flex shrink-0 items-center justify-center rounded-lg bg-argus-primary-soft p-2.5 text-argus-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-heading text-base font-semibold text-argus-ink">{title}</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-argus-text-muted">{description}</p>
        </div>
      </div>
      {chart && <div className="mt-auto">{chart}</div>}
    </motion.div>
  );
}

export function InsightModules() {
  return (
    <section className="w-full px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="font-heading text-3xl font-semibold leading-tight text-argus-ink md:text-4xl mb-12 text-center"
        >
          Five analysts, zero hiring.
        </motion.h2>

        {/* Bento grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-5 md:grid-cols-3"
        >
          {/* Funnel — wide, with chart */}
          <ModuleCard
            icon={GitBranch}
            title="Funnel"
            description="Where users drop off, mapped from your events collection."
            chart={<ActiveUsersChart />}
            wide
          />

          {/* Cohort */}
          <ModuleCard
            icon={Users}
            title="Cohort"
            description="Retention by signup week — $setWindowFields under the hood."
          />

          {/* RFM */}
          <ModuleCard
            icon={DollarSign}
            title="RFM"
            description="Who pays, who churns, who's about to."
          />

          {/* Attribution */}
          <ModuleCard
            icon={Tag}
            title="Attribution"
            description="Revenue by UTM source, without a warehouse."
            chart={<SignupsBySourceChart />}
          />

          {/* Anomaly — wide */}
          <ModuleCard
            icon={AlertTriangle}
            title="Anomaly"
            description="Login spikes and silent failures, flagged before you ask."
            wide
          />
        </motion.div>
      </div>
    </section>
  );
}
