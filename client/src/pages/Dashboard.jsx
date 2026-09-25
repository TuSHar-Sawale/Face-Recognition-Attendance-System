import React from 'react';
import { 
  Users, 
  UserCheck, 
  ClockAlert, 
  ShieldCheck, 
  Scan, 
  Building2, 
  Download,
  GraduationCap,
  Briefcase
} from 'lucide-react';

export default function Dashboard({ stats, onNavigate, onExportCsv }) {
  const today = stats?.today || {
    total_present: 0,
    on_time: 0,
    late: 0,
    rate_percentage: 0,
    students: { total: 0, present: 0, rate: 0 },
    employees: { total: 0, present: 0, rate: 0 }
  };

  const departmentStats = stats?.department_stats || [];
  const hourlyTrend = stats?.hourly_trend || [];
  const recentLogs = stats?.recent_logs || [];
  const maxHourlyCount = Math.max(...hourlyTrend.map(h => h.count), 5);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 minimal-card p-6 rounded-2xl bg-white border border-slate-200">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Administrative Overview
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Daily Attendance Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('kiosk')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            <Scan className="w-4 h-4" />
            <span>Open Attendance Scanner</span>
          </button>
          <button
            onClick={onExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Present */}
        <div className="minimal-card p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Present Today</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{today.total_present}</span>
            <span className="text-xs font-semibold text-emerald-600">{today.rate_percentage}% attendance</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full" 
              style={{ width: `${Math.min(today.rate_percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* On-Time Arrivals */}
        <div className="minimal-card p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">On-Time (Present)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{today.on_time}</span>
            <span className="text-xs text-slate-400">check-ins</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Arrived before 09:15 AM</p>
        </div>

        {/* Late Arrivals */}
        <div className="minimal-card p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Late Arrivals</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{today.late}</span>
            <span className="text-xs text-slate-400">logged</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Arrived after scheduled cut-off</p>
        </div>

        {/* Total Enrolled */}
        <div className="minimal-card p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Campus Directory</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {(today.students?.total || 0) + (today.employees?.total || 0)}
            </span>
            <span className="text-xs text-slate-400">profiles</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{today.students?.total || 0} Students</span>
            <span>{today.employees?.total || 0} Faculty/Staff</span>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Check-In Timeline (2 cols) */}
        <div className="lg:col-span-2 minimal-card p-6 rounded-2xl bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Hourly Check-In Traffic</h3>
              <p className="text-xs text-slate-500">Timeline from 07:00 AM to 07:00 PM</p>
            </div>
          </div>

          {/* Clean minimal bar chart */}
          <div className="mt-6 h-40 flex items-end justify-between gap-2 px-2 border-b border-slate-100 pb-2">
            {hourlyTrend.map((item, idx) => {
              const heightPercent = maxHourlyCount > 0 ? (item.count / maxHourlyCount) * 100 : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-slate-100 rounded-t h-28 flex items-end overflow-hidden">
                    <div 
                      className={`w-full rounded-t transition-all ${item.count > 0 ? 'bg-slate-800' : 'bg-transparent'}`}
                      style={{ height: `${Math.max(heightPercent, item.count > 0 ? 15 : 0)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {item.hour.split(':')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Attendance (1 col) */}
        <div className="minimal-card p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Department Rates</h3>
            <p className="text-xs text-slate-500 mb-4">Today's presence percentage</p>

            <div className="space-y-3.5">
              {departmentStats.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No department records yet.</p>
              ) : (
                departmentStats.map((dept, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">{dept.department}</span>
                      <span className="font-mono text-slate-500">{dept.rate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${dept.rate >= 75 ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        style={{ width: `${dept.rate}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="minimal-card rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Scans</h3>
            <p className="text-xs text-slate-500">Latest face recognition attendance events</p>
          </div>
          <button
            onClick={() => onNavigate('logs')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            View All Logs
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentLogs.slice(0, 5).map((log) => {
            const isLate = log.status === 'late';
            const logTime = log.check_in_time 
              ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '--:--';

            return (
              <div key={log.id} className="p-3 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <img
                    src={log.snapshot_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{log.member_name}</p>
                    <p className="text-[11px] text-slate-500">{log.member_id} • {log.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    isLate ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {log.status === 'present' ? 'On-Time' : 'Late'}
                  </span>
                  <span className="font-mono text-xs text-slate-500">{logTime}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
