import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CalendarCheck, 
  Download, 
  Search, 
  Plus, 
  Calendar, 
  CheckCircle2,
  ClockAlert
} from 'lucide-react';

export default function AttendanceLogs({ 
  onOpenManualEntry, 
  lockedRole = null, 
  lockedDepartment = null,
  onSelectStudent = null 
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState(lockedRole || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      // Enforce locked role (e.g. 'student' for teachers)
      if (lockedRole) {
        params.role = lockedRole;
      } else if (roleFilter !== 'all') {
        params.role = roleFilter;
      }

      // Enforce locked department (e.g. 'Computer Science' for CS teachers)
      if (lockedDepartment) {
        params.department = lockedDepartment;
      }

      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await axios.get('/api/attendance/logs', { params });
      if (res.data.success) {
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [dateFilter, roleFilter, statusFilter, lockedRole, lockedDepartment]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (dateFilter) params.append('date', dateFilter);
    if (lockedRole) params.append('role', lockedRole);
    else if (roleFilter !== 'all') params.append('role', roleFilter);

    if (lockedDepartment) params.append('department', lockedDepartment);
    window.location.href = `/api/attendance/export?${params.toString()}`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="minimal-card p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {lockedDepartment 
              ? `${lockedDepartment} Student Attendance Records` 
              : 'Attendance Records & Audit Log'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lockedDepartment 
              ? `Verified check-in history exclusively for ${lockedDepartment} students`
              : 'Complete campus check-in history with timestamps, status, and verification mode'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenManualEntry}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-800 focus:outline-none"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="text-slate-400 hover:text-slate-700 text-[11px] ml-1 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Role Filter: Only visible to Admin */}
          {!lockedRole && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:border-slate-900"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:border-slate-900"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present (On-Time)</option>
            <option value="late">Late</option>
          </select>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={lockedDepartment ? `Search ${lockedDepartment} student...` : "Search member or ID..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
          />
        </form>
      </div>

      {/* Clean Table */}
      <div className="minimal-card rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[11px] font-semibold tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-400">Loading records...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-400">
                    No attendance records found for {lockedDepartment || 'selected criteria'}.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isLate = log.status === 'late';
                  const checkInTime = log.check_in_time 
                    ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td 
                        className={`py-3 px-4 flex items-center gap-3 ${log.role === 'student' && onSelectStudent ? 'cursor-pointer group' : ''}`}
                        onClick={() => {
                          if (log.role === 'student' && onSelectStudent) {
                            onSelectStudent({
                              member_id: log.member_id,
                              name: log.member_name,
                              department: log.department,
                              role: log.role,
                              avatar_url: log.snapshot_url
                            });
                          }
                        }}
                        title={log.role === 'student' && onSelectStudent ? 'Click to view student stats' : ''}
                      >
                        <img
                          src={log.snapshot_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 group-hover:border-blue-400 transition-colors"
                        />
                        <div>
                          <span className={`font-bold text-slate-900 block ${log.role === 'student' && onSelectStudent ? 'group-hover:text-blue-600 transition-colors' : ''}`}>
                            {log.member_name}
                          </span>
                          {log.role === 'student' && onSelectStudent && (
                            <span className="text-[10px] text-blue-500 font-medium">Click for stats</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500">{log.member_id}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{log.department}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{log.date}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{checkInTime}</td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          isLate ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isLate ? <ClockAlert className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          <span>{log.status === 'present' ? 'On-Time' : 'Late'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 capitalize">
                        {log.verification_mode ? log.verification_mode.replace(/_/g, ' ') : 'Face Recognition'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
