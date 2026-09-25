import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  UserCheck, 
  ClockAlert, 
  CalendarCheck, 
  Scan, 
  CheckCircle2, 
  Search, 
  Plus, 
  Building2, 
  GraduationCap,
  Sparkles,
  Check
} from 'lucide-react';

export default function TeacherPortal({ currentUser, onNavigateToKiosk, onOpenManualEntry, onSelectStudent }) {
  const [departmentStudents, setDepartmentStudents] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const teacherDept = currentUser?.department || 'Computer Science';
  const todayStr = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersRes, logsRes] = await Promise.all([
        axios.get('/api/members', { params: { role: 'student', department: teacherDept } }),
        axios.get('/api/attendance/logs', { params: { date: todayStr, department: teacherDept } })
      ]);

      if (membersRes.data.success) {
        setDepartmentStudents(membersRes.data.members || []);
      }
      if (logsRes.data.success) {
        setTodayLogs(logsRes.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load teacher data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teacherDept]);

  const presentStudentIds = new Set(todayLogs.map(l => l.member_id));
  const totalStudents = departmentStudents.length;
  const presentCount = departmentStudents.filter(s => presentStudentIds.has(s.member_id)).length;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  const filteredStudents = departmentStudents.filter(s => {
    const q = searchTerm.toLowerCase();
    return !searchTerm || s.name.toLowerCase().includes(q) || s.member_id.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Teacher Profile & Action Banner */}
      <div className="minimal-card rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={currentUser?.avatar_url || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256"}
            alt={currentUser?.name}
            className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{currentUser?.name || "Faculty Member"}</h2>
              <span className="text-xs px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                Faculty
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {currentUser?.member_id || "TCH-2001"}</p>
            <p className="text-xs text-slate-600 mt-1">
              Department of {teacherDept} • {currentUser?.designation || "Associate Professor"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenManualEntry && onOpenManualEntry()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Mark Student Attendance</span>
          </button>
        </div>
      </div>

      {/* Class KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="minimal-card p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Class Attendance</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{attendanceRate}%</span>
            <span className="text-xs text-slate-500">{presentCount} of {totalStudents} students</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full ${attendanceRate >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>

        <div className="minimal-card p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present Today</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{presentCount}</span>
            <span className="text-xs text-slate-400">students</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Verified via camera</p>
        </div>

        <div className="minimal-card p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Absent / Unmarked</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-600">{Math.max(0, totalStudents - presentCount)}</span>
            <span className="text-xs text-slate-400">students</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Not scanned yet today</p>
        </div>
      </div>

      {/* Class Student Roster with Real-time Check-In Status */}
      <div className="minimal-card rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Department Student Roster ({teacherDept})</h3>
            <p className="text-xs text-slate-500">Click any student to view detailed attendance statistics</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[11px] font-semibold">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Semester / Batch</th>
                <th className="py-3 px-4">Today's Status</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">Loading student roster...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">No students found.</td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const log = todayLogs.find(l => l.member_id === student.member_id);
                  const isPresent = !!log;
                  const isLate = log?.status === 'late';
                  const logTime = log?.check_in_time 
                    ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--';

                  return (
                    <tr key={student.member_id} className="hover:bg-slate-50/70 transition-colors">
                      <td 
                        className="py-3 px-4 flex items-center gap-3 cursor-pointer group"
                        onClick={() => onSelectStudent && onSelectStudent(student)}
                        title="Click to view student stats"
                      >
                        <img
                          src={student.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 group-hover:border-blue-400 transition-colors"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors block">
                            {student.name}
                          </span>
                          <span className="text-[10px] text-blue-500 font-medium">
                            Click for stats
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{student.member_id}</td>
                      <td className="py-3 px-4 text-slate-600">{student.designation || "3rd Year B.Tech"}</td>
                      <td className="py-3 px-4">
                        {isPresent ? (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            isLate ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{isLate ? 'Late' : 'Present'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            <span>Unmarked</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{logTime}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => onSelectStudent && onSelectStudent(student)}
                          className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          View Stats
                        </button>
                        {!isPresent && (
                          <button
                            onClick={() => onOpenManualEntry && onOpenManualEntry(student)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            Mark Present
                          </button>
                        )}
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
