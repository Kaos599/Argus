import React from 'react';
import { 
  AreaChart, Area, ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Cell
} from 'recharts';
import { Clock, TrendingDown, TrendingUp, Zap, Server, Activity, Filter, MoreHorizontal, Sparkles } from 'lucide-react';

const complexData = Array.from({ length: 30 }).map((_, i) => ({
  date: `May ${i + 1}`,
  traffic: Math.floor(Math.random() * 5000) + 2000,
  conversion: Math.floor(Math.random() * 800) + 200,
  latency: Math.random() * 40 + 10,
  errors: Math.floor(Math.random() * 50),
}));

export const PremiumAreaChart = () => (
  <div className="h-full w-full min-h-[280px] rounded-xl bg-white overflow-hidden relative border border-gray-200 shadow-sm flex flex-col">
    {/* Header with complex filtering mock */}
    <div className="p-5 pb-4 border-b border-gray-100 flex flex-wrap justify-between items-start gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="text-sm font-bold text-gray-900 tracking-tight">Multi-Dimensional Engagement Analysis</div>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-600 uppercase tracking-widest">Generative Insight</span>
        </div>
        <div className="text-xs text-gray-500 font-medium">Auto-correlated Traffic vs. Conversion vs. System Latency over 30 days</div>
      </div>
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors">
          <Filter className="w-3.5 h-3.5" /> Filter
        </button>
        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Metric Summaries */}
    <div className="grid grid-cols-3 gap-4 p-5 bg-gray-50/50 border-b border-gray-100">
      <div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Traffic</div>
        <div className="text-xl font-black text-gray-900">142.5k <span className="text-xs font-semibold text-emerald-600 ml-1">+12%</span></div>
      </div>
      <div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Avg Conversion</div>
        <div className="text-xl font-black text-gray-900">8.4% <span className="text-xs font-semibold text-amber-600 ml-1">-1.2%</span></div>
      </div>
      <div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">P99 Latency</div>
        <div className="text-xl font-black text-gray-900">32ms <span className="text-xs font-semibold text-emerald-600 ml-1">Opt</span></div>
      </div>
    </div>

    {/* Dense Chart Area */}
    <div className="flex-1 w-full p-4 pt-6">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={complexData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} minTickGap={30} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
          
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
            labelStyle={{ color: '#374151', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px', marginBottom: '8px' }}
            itemStyle={{ fontSize: '13px', fontWeight: '600', padding: '2px 0' }}
          />
          
          <Area yAxisId="left" type="monotone" dataKey="traffic" name="Traffic Vol." stroke="#3b82f6" strokeWidth={2} fill="url(#colorTraffic)" />
          <Bar yAxisId="left" dataKey="conversion" name="Conversions" fill="url(#colorConv)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Line yAxisId="right" type="monotone" dataKey="latency" name="Latency (ms)" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const sparklineData = (base: number) => Array.from({ length: 14 }).map(() => ({ val: base + Math.random() * 20 - 10 }));

const tableData = [
  { id: '1', query: 'Find paying users inactive for 30d', type: 'Retention', duration: '1.2s', runs: 1240, trend: 'up' },
  { id: '2', query: 'Aggregate revenue by UTM source', type: 'Revenue', duration: '3.4s', runs: 890, trend: 'up' },
  { id: '3', query: 'Detect anomalous login spikes', type: 'Security', duration: '0.8s', runs: 4500, trend: 'down' },
  { id: '4', query: 'Map user journey to checkout', type: 'Funnel', duration: '2.1s', runs: 620, trend: 'up' },
];

export const CohortTableMockup = () => {
  return (
    <div className="h-full w-full min-h-[280px] rounded-xl bg-white border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-bold text-gray-900">Generated Query Signatures</span>
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Real-time Analysis</span>
      </div>
      
      <div className="flex-1 w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white">Natural Language Intent</th>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white">Category</th>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white">Avg Exec</th>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white w-32">14d Volume</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tableData.map((row) => (
              <tr key={row.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-4 py-3">
                  <div className="text-xs font-semibold text-gray-900">{row.query}</div>
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5 group-hover:text-blue-500 transition-colors">db.events.aggregate([...])</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                    {row.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs font-mono text-gray-600">{row.duration}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700 w-8">{row.runs}</span>
                    <div className="h-6 w-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData(100)}>
                          <Line type="monotone" dataKey="val" stroke={row.trend === 'up' ? '#10b981' : '#f43f5e'} strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100 text-xs text-blue-800 font-medium flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
        Agent is currently optimizing 12 slow queries detected in the last hour.
      </div>
    </div>
  );
};

export const TimeSavedCard = () => (
  <div className="h-full w-full min-h-[140px] rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-5 relative border border-gray-700 shadow-xl flex flex-col justify-center overflow-hidden group">
    <div className="absolute right-0 top-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-400/20 transition-colors" />
    <div className="flex items-center gap-3 mb-3 relative z-10">
      <div className="p-2.5 bg-gray-800 rounded-lg text-blue-400 shadow-sm border border-gray-700">
        <Server className="w-5 h-5" />
      </div>
      <div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Infrastructure Cost</div>
        <div className="text-3xl font-black text-white tracking-tighter">$0.00</div>
      </div>
    </div>
    <div className="text-sm font-medium text-gray-300 leading-snug mt-2 relative z-10">
      Zero ETL. Zero warehouse fees. Argus queries your existing MongoDB directly.
    </div>
  </div>
);

export const QueryOptimizationCard = () => (
  <div className="h-full w-full min-h-[140px] rounded-xl bg-white p-5 relative border border-gray-200 shadow-sm flex flex-col justify-center overflow-hidden group">
    <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl group-hover:bg-emerald-200/50 transition-colors" />
    <div className="flex items-center gap-3 mb-3 relative z-10">
      <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600 shadow-sm border border-emerald-100">
        <Activity className="w-5 h-5" />
      </div>
      <div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Complex Pipelines</div>
        <div className="text-3xl font-black text-gray-900 tracking-tighter">12ms <span className="text-sm font-bold text-emerald-500 tracking-normal border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 rounded">p99</span></div>
      </div>
    </div>
    <div className="text-sm font-medium text-gray-600 leading-snug mt-2 relative z-10">
      Argus writes perfectly indexed <code>$facet</code> pipelines instantly.
    </div>
  </div>
);
