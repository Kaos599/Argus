"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Database,
  Eye,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
  Search,
  Code2,
  Cpu,
  LayoutDashboard,
  Bot
} from "lucide-react";
import { BentoGrid, BentoGridItem } from "@/components/BentoGrid";
import { GenerativeUIMockup } from "@/components/GenerativeUIMockup";
import { PremiumAreaChart, TimeSavedCard, QueryOptimizationCard, CohortTableMockup } from "@/components/MockChartCards";
import { GradientMesh } from "@/components/ui/gradient-mesh";

const READ_ONLY_LAYERS = [
  "MCP server runs with MDB_MCP_READ_ONLY=true — write tools are stripped.",
  "Onboarding recommends a read-only database user.",
  "argus-result-set-guard blocks $out / $merge before execution.",
];

const PremiumIcon = ({ icon: Icon, colorClass = "from-blue-600 to-indigo-600", shadowClass = "shadow-blue-500/30" }: any) => (
  <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr ${colorClass} shadow-lg ${shadowClass} mb-4 relative overflow-hidden group`}>
    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    <Icon className="w-6 h-6 text-white relative z-10" />
  </div>
);

export default function Landing() {
  return (
    <main className="min-h-screen bg-white text-gray-900 selection:bg-blue-100 overflow-x-hidden relative">
      
      {/* Top nav */}
      <header className="relative border-b border-gray-100 bg-white/80 backdrop-blur-md z-50">
        <div className="mx-auto flex h-20 max-w-screen-xl items-center justify-between px-6">
          <Link href="/" className="inline-flex items-center gap-2.5 text-xl font-black tracking-tight group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-600 shadow-md shadow-blue-600/20 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent)] pointer-events-none" />
              <Eye className="h-4 w-4 text-white" strokeWidth={3} />
            </div>
            Argus
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/connect" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Connect</Link>
            <Link href="/dashboard" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Dashboard</Link>
            <Link href="/chat" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Chat</Link>
          </nav>
          <div className="flex items-center">
            <Link
              href="/connect"
              className="inline-flex h-10 items-center rounded-lg bg-gray-900 px-5 text-sm font-bold text-white shadow-sm hover:bg-black transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto w-full px-6 pt-24 pb-16 md:pt-32 md:pb-32 overflow-hidden border-b border-gray-100">
        {/* Dim, Transparent Gradient Mesh Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <GradientMesh 
            className="opacity-70" 
            colors={["#a78bfa", "#60a5fa", "#34d399"]} 
            speed={2.5}
            scale={1.2}
            distortion={6}
            waveAmp={0.2}
            waveFreq={5}
            swirl={0.7}
          />
          {/* Subtle bottom fade to blend with next section */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-white to-transparent" />
        </div>

        <div className="max-w-screen-xl mx-auto grid gap-16 md:grid-cols-2 md:items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/50 bg-blue-50/50 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm mb-6">
              <Bot className="h-4 w-4" />
              Your Instant AI Admin Dashboard
            </div>
            <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl text-gray-900 drop-shadow-sm">
              Connect your database. <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-700 to-indigo-600">Get instant insights.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-lg font-medium">
              No setup. No queries to write. Argus connects directly to your MongoDB and instantly acts as a personalized, generative dashboard for your entire team.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/connect"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-700 px-6 text-sm font-bold text-white shadow-xl shadow-blue-700/20 hover:bg-blue-800 transition-all hover:-translate-y-0.5 group"
              >
                Connect your database
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/chat"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm px-6 text-sm font-bold text-gray-900 shadow-sm hover:bg-white hover:border-gray-300 transition-colors"
              >
                View live demo
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-gray-500 font-bold">
              <div className="flex items-center gap-1.5"><ShieldCheck className="w-5 h-5 text-emerald-500"/> Zero write risk</div>
              <div className="flex items-center gap-1.5"><Cpu className="w-5 h-5 text-indigo-500"/> Generative UI</div>
            </div>
          </motion.div>

          <div className="relative z-10 hidden md:block">
            <GenerativeUIMockup />
          </div>
        </div>
      </section>

      {/* Bento Grid Features - Sales & Value Proposition */}
      <section className="relative z-10 mx-auto max-w-screen-xl px-6 py-24 bg-gray-50/30">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black tracking-tight text-gray-900">Make admins out of a dashboard, easily.</h2>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto font-medium text-lg">
            Stop building internal tools from scratch. Argus reads your schema and generates the charts, tables, and insights you need automatically.
          </p>
        </div>

        <BentoGrid>
          <BentoGridItem
            title="Real-time Generative Charts"
            description="Ask questions in plain English. Argus generates beautiful, interactive charts specific to your schema without a single line of frontend code."
            header={<PremiumAreaChart />}
            icon={<PremiumIcon icon={Sparkles} />}
            className="md:col-span-2"
          />
          <BentoGridItem
            title="Zero Setup Time"
            description="Skip the grueling process of wiring up a React frontend to your database."
            header={<TimeSavedCard />}
            icon={<PremiumIcon icon={TrendingUp} colorClass="from-amber-500 to-orange-500" shadowClass="shadow-orange-500/30" />}
            className="md:col-span-1"
          />
          <BentoGridItem
            title="No MQL Required"
            description="Stop wrestling with dense aggregations. We handle indexing and execution."
            header={<QueryOptimizationCard />}
            icon={<PremiumIcon icon={Code2} colorClass="from-emerald-500 to-teal-500" shadowClass="shadow-emerald-500/30" />}
            className="md:col-span-1"
          />
          <BentoGridItem
            title="Personalized Insights"
            description="Argus learns what matters to you. Whether it's cohort retention or daily active users, it builds the dashboard around your specific needs."
            header={<CohortTableMockup />}
            icon={<PremiumIcon icon={LayoutDashboard} colorClass="from-indigo-500 to-purple-500" shadowClass="shadow-indigo-500/30" />}
            className="md:col-span-2 bg-gradient-to-br from-white to-indigo-50/30"
          />
        </BentoGrid>
      </section>

      {/* Read-only Security Banner */}
      <section className="mx-auto max-w-screen-xl px-6 py-24">
        <motion.div 
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50/30 p-8 md:p-12 shadow-2xl shadow-emerald-900/5"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="w-64 h-64 text-emerald-600" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="inline-flex items-center gap-3 text-2xl md:text-3xl font-black text-emerald-950 tracking-tight">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
                <Lock className="h-7 w-7 text-white" />
              </span>
              Your production cluster is safe.
            </h2>
            <p className="mt-5 text-emerald-800/80 font-medium text-lg leading-relaxed">
              We know the fear of connecting third-party tools to a live database. That's why Argus is built with three impenetrable layers of write-protection.
            </p>
            <ul className="mt-8 space-y-4 text-base text-emerald-900 font-medium">
              {READ_ONLY_LAYERS.map((layer, i) => (
                <li key={i} className="flex items-start gap-4 bg-white/60 p-4 rounded-xl border border-emerald-100/50 shadow-sm backdrop-blur-sm">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 shadow-sm text-xs font-bold text-white mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{layer}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto flex max-w-screen-xl flex-col items-center gap-4 px-6 py-12 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-900">
              <Eye className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
            <p className="text-sm font-bold text-gray-500">© 2026 Argus AI. Built for the MongoDB AI Hackathon.</p>
          </div>
          <div className="flex gap-6 text-sm font-bold text-gray-500">
            <Link href="#" className="hover:text-gray-900 transition-colors">GitHub</Link>
            <Link href="#" className="hover:text-gray-900 transition-colors">Documentation</Link>
            <Link href="#" className="hover:text-gray-900 transition-colors">Architecture</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
