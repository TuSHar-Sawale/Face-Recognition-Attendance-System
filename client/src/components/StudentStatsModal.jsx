import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  CheckCircle2, 
  ClockAlert, 
  Calendar, 
  ShieldCheck, 
  AlertCircle,
  GraduationCap, 
  Building2, 
  TrendingUp, 
  UserCheck, 
  Loader2,
  Mail,
  Phone,
  Plus
} from 'lucide-react';

export default function StudentStatsModal({ 
  isOpen, 
  student, 
  onClose,
  onOpenManualEntry 
}) {
  const [details, setDetails] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const studentId = student?.member_id;

  useEffect(() => {
    if (!isOpen || !studentId) {
      setDetails(null);
      setLogs([]);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        const [memberRes, logsRes] = await Promise.all([
          axios.get(`/api/members/${studentId}`).catch(() => null),
          axios.get('/api/attendance/logs', { params: { search: studentId, limit: 50 } })
        ]);

        if (memberRes?.data?.success && memberRes.data.member) {
          setDetails(memberRes.data.member);
        } else {
          setDetails(student);
        }

        if (logsRes?.data?.success) {
          setLogs(logsRes.data.logs || []);
        }
      } catch (err) {
        console.error('Failed to load student statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isOpen, studentId]);

  if (!isOpen || !student) return null;

  const currentStudent = details || student;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = logs.find(l => l.date === todayStr);

  const totalLogs = logs.length;
  const presentCount = logs.filter(l => l.status === 'present').length;
  const lateCount = logs.filter(l => l.status === 'late').length;
  const attendanceRate = totalLogs > 0 ? Math.round(((presentCount + lateCount) / totalLogs) * 100) : 100;
  const hasFace = !!(currentStudent.face_embedding && currentStudent.face_embedding.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[92vh] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <img
              src={currentStudent.avatar_url || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=256"}
              alt={currentStudent.name}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">{currentStudent.name}</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  Student Profile
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5">Roll No: {currentStudent.member_id}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                <span>{currentStudent.department}</span>
                {currentStudent.designation && (
                  <>
                    <span>•</span>
                    <span>{currentStudent.designation}</span>
                  </>
                )}
                {currentStudent.email && (
                  <>
                    <span>•</span>
                    <span className="text-slate-400 font-mono text-[11px]">{currentStudent.email}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              <p className="text-xs">Loading student attendance statistics...</p>
            </div>
          ) : (
            <>
              {/* Today's Status Banner */}
              <div className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3">
                  {todayLog ? (
                    <div className={`p-2 rounded-xl ${todayLog.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-500">
                      <ClockAlert className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      {todayLog ? `Checked In Today (${todayLog.status.toUpperCase()})` : "Today's Status: Not Checked In Yet"}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {todayLog 
                        ? `Logged at ${new Date(todayLog.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} via ${todayLog.verification_mode ? todayLog.verification_mode.replace(/_/g, ' ') : 'Facial Recognition'}`
                        : "No attendance scan detected yet on campus today."
                      }
                    </p>
                  </div>
                </div>

                {onOpenManualEntry && !todayLog && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenManualEntry(currentStudent);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Mark Present</span>
                  </button>
                )}
              </div>

              {/* Statistical KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Attendance Rate</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">{attendanceRate}%</span>
                    <span className="text-[11px] font-medium text-emerald-600">
                      {attendanceRate >= 75 ? 'Above 75%' : 'Below 75%'}
                    </span>
                  </div>
                  <div className="mt-2.5 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${attendanceRate >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${attendanceRate}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">On-Time Sessions</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600">{presentCount}</span>
                    <span className="text-xs text-slate-400">sessions</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Punctual arrival before cut-off</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Late Arrivals</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-600">{lateCount}</span>
                    <span className="text-xs text-slate-400">sessions</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Recorded after cutoff time</p>
                </div>
              </div>

              {/* Biometric Face Template Status Notice */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${hasFace ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                    {hasFace ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Biometric Facial Template</h5>
                    <p className="text-[11px] text-slate-500">
                      {hasFace 
                        ? '128D mathematical embedding enrolled & verified for instant facial recognition.' 
                        : 'Biometric face photo not yet registered. Needs face enrollment by Administrator.'}
                    </p>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  hasFace 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {hasFace ? 'Template Enrolled' : 'Not Enrolled'}
                </span>
              </div>

              {/* Attendance Log History Table */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                <div className="p-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">Recent Attendance Audit Logs</h4>
                  <span className="text-[11px] text-slate-400 font-mono">{logs.length} records</span>
                </div>

                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold sticky top-0 border-b border-slate-100">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Mode</th>
                        <th className="py-2.5 px-3">Confidence</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                            No attendance history recorded yet for this student.
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => {
                          const isLate = log.status === 'late';
                          const time = log.check_in_time 
                            ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '--:--';
                          return (
                            <tr key={log.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-mono text-slate-700">{log.date}</td>
                              <td className="py-2 px-3 font-mono text-slate-500">{time}</td>
                              <td className="py-2 px-3">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
                                  isLate 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {log.status === 'present' ? 'On-Time' : 'Late'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-600 capitalize">
                                {log.verification_mode ? log.verification_mode.replace(/_/g, ' ') : 'Face Recognition'}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-500">
                                {log.confidence ? `${Number(log.confidence).toFixed(1)}%` : '--'}
                              </td>
                              <td className="py-2 px-3 text-slate-500 truncate max-w-[140px]">
                                {log.notes || 'Normal check-in'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
