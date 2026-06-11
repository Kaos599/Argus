import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

export const TerminalMockup = () => {
  const [text, setText] = useState("");
  const fullText = "> db.users.aggregate([\n  { $match: { status: 'active' } },\n  { $group: { _id: '$cohort', count: { $sum: 1 } } }\n])";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full max-w-lg mx-auto rounded-xl overflow-hidden border border-gray-200 bg-white shadow-2xl shadow-blue-900/5"
    >
      <div className="flex items-center px-4 py-3 bg-gray-50/80 border-b border-gray-100 backdrop-blur-sm">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-amber-400/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
        </div>
        <div className="mx-auto flex items-center justify-center space-x-2 text-xs font-medium text-gray-400">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Read-Only Shell</span>
        </div>
      </div>
      <div className="p-6 bg-white font-mono text-sm text-gray-800 h-48 overflow-hidden relative">
        <pre className="whitespace-pre-wrap">
          {text}
          <motion.span 
            animate={{ opacity: [1, 0] }} 
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="inline-block w-2 h-4 bg-blue-500 ml-1 translate-y-1"
          />
        </pre>
        
        {text.length === fullText.length && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-4 left-4 right-4 p-4 rounded-lg bg-blue-50/50 border border-blue-100 text-blue-900 font-sans backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Generated Insight</span>
              <span className="text-xs text-blue-400">22ms</span>
            </div>
            <div className="mt-2 text-sm font-medium">
              Active users are concentrated in the Q3 cohort (45%).
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
