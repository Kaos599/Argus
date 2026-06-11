"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User, Bot, BarChart3, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const mockData = [
  { time: '00:00', value: 120 },
  { time: '04:00', value: 300 },
  { time: '08:00', value: 850 },
  { time: '12:00', value: 1200 },
  { time: '16:00', value: 940 },
  { time: '20:00', value: 1400 },
  { time: '24:00', value: 1600 },
];

export const GenerativeUIMockup = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500), // User asks question
      setTimeout(() => setStep(2), 2500), // Agent starts thinking/fetching
      setTimeout(() => setStep(3), 4500), // Agent renders chart
      setTimeout(() => setStep(4), 5500), // Agent adds insights
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-2xl shadow-blue-900/10 flex flex-col min-h-[540px]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/80 backdrop-blur-md">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <Bot className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Argus Agent</div>
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Connected to production-db
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-5 space-y-6 overflow-hidden bg-white relative">
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 items-start"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-800 shadow-sm border border-gray-200/50">
                Show me the active users trend from the last 24 hours.
              </div>
            </motion.div>
          )}

          {step >= 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 items-start"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-600/30">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 space-y-4">
                {step === 2 && (
                  <motion.div key="step-2-loading" className="bg-blue-50/50 border border-blue-100 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-blue-800 flex items-center gap-2 w-fit shadow-sm">
                    <span className="flex space-x-1">
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    </span>
                    <span className="font-medium">Analyzing schema & writing $facet pipeline...</span>
                  </motion.div>
                )}

                {step >= 3 && (
                  <motion.div
                    key="step-3-chart"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white">
                      <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        24h Active Users
                      </div>
                      <div className="text-xs text-gray-500 font-mono">1,600 peak</div>
                    </div>
                    <div className="h-40 w-full bg-gradient-to-b from-blue-50/30 to-transparent p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockData}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ color: '#6b7280', fontSize: '12px' }}
                            itemStyle={{ color: '#1e3a8a', fontSize: '14px', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {step >= 4 && (
                      <motion.div 
                        key="step-4-insight"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="px-4 py-3 bg-emerald-50/50 border-t border-emerald-100 text-sm text-emerald-800 flex gap-2 items-start"
                      >
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                        <p>User activity peaked at <strong>24:00 (1,600 users)</strong>. This represents a 15% increase compared to yesterday's peak.</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Input area */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="relative">
          <div className="w-full h-10 rounded-full border border-gray-300 bg-gray-50 flex items-center px-4 text-sm text-gray-400">
            Ask Argus anything about your data...
          </div>
          <div className="absolute right-1 top-1 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};
