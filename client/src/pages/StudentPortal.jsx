import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, 
  ClockAlert, 
  Calendar, 
  ShieldCheck, 
  GraduationCap, 
  Building2, 
  UserCheck, 
  ArrowUpRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function StudentPortal({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const studentId = currentUser?.member_id || "STU-1001";
  const studentName = currentUser?.name || "Aarav Sharma";

  useEffect(() => {
    const fetchStudentLogs = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/attendance/logs', {
          params: { search: studentId, limit: 30 }
        });
        if (res.data.success) {
          setLogs(res.data.logs || []);
        }
      } catch (err) {
        console.error('Failed to load student logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentLogs();
  }, [studentId]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = logs.find(l => l.date === todayStr);

  const totalLogs = logs.length;
  const presentCount = logs.filter(l => l.status === 'present').length;
  const lateCount = logs.filter(l => l.status === 'late').length;
  const attendancePercentage = totalLogs > 0 ? Math.round(((presentCount + lateCount) / totalLogs) * 100) : 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Student Profile Header */}
      <div className="minimal-card rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={currentUser?.avatar_url || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=256"}
            alt={studentName}
            className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{studentName}</h2>
              <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                Student
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Roll No: {studentId}</p>
            <p className="text-xs text-slate-600 mt-1">
              {currentUser?.department || "Computer Science"} • {currentUser?.designation || "3rd Year B.Tech"}
            </p>
          </div>
        </div>

        {/* Today's Attendance Pill */}
        <div className="w-full md:w-auto">
          {todayLog ? (
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              todayLog.status === 'present' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${todayLog.status === 'present' ? 'text-emerald-600' : 'text-amber-600'}`} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  Checked In Today ({todayLog.status})
                </p>
                <p className="text-xs text-slate-600">
                  {new Date(todayLog.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Facial Recognition
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-3">
              <ClockAlert className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Pending Check-In
                </p>
                <p className="text-xs text-slate-500">
                  Please scan face at camera scanner
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Attendance Rate */}
        <div className="minimal-card p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Attendance</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{attendancePercentage}%</span>
            <span className="text-xs font-medium text-emerald-600">Above 75% threshold</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full ${attendancePercentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{ width: `${attendancePercentage}%` }}
            />
          </div>
        </div>

        {/* On-Time Sessions */}
        <div className="minimal-card p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">On-Time Check-ins</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{presentCount}</span>
            <span className="text-xs text-slate-400">sessions</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Punctual arrival before cut-off</p>
        </div>

        {/* Late Sessions */}
        <div className="minimal-card p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Late Arrivals</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{lateCount}</span>
            <span className="text-xs text-slate-400">days</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Logged after 09:15 AM</p>
        </div>
      </div>

      {/* Biometric Status Notice */}
      <div className="minimal-card p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Biometric Facial Enrollment</h4>
            <p className="text-xs text-slate-500">Your 128D facial template is enrolled and active in the system.</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Template Active
        </span>
      </div>

      {/* Personal Attendance History Table */}
      <div className="minimal-card rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">My Check-In History</h3>
            <p className="text-xs text-slate-500">Recent automated and verified attendance logs</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{logs.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[11px] font-semibold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">Loading your records...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">No attendance records found yet.</td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isLate = log.status === 'late';
                  const time = log.check_in_time 
                    ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">{log.date}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{time}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          isLate 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {log.status === 'present' ? 'On-Time' : 'Late'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 capitalize">
                        {log.verification_mode ? log.verification_mode.replace(/_/g, ' ') : 'Face Recognition'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {log.confidence ? `${Number(log.confidence).toFixed(1)}%` : '--'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{log.notes || 'Normal attendance'}</td>
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
