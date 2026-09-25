import React, { useState } from 'react';
import axios from 'axios';
import { 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  GraduationCap, 
  Briefcase, 
  ShieldCheck, 
  AlertCircle
} from 'lucide-react';

export default function Members({ 
  members = [], 
  onRefresh, 
  onOpenEnroll, 
  isAdmin = false, 
  lockedDepartment = null,
  onSelectStudent = null 
}) {
  // If not admin, lock tab to student and department to teacher's branch
  const [activeTab, setActiveTab] = useState(isAdmin ? 'all' : 'student');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState(lockedDepartment || 'all');
  const [deletingId, setDeletingId] = useState(null);

  const departments = Array.from(new Set(members.map(m => m.department))).filter(Boolean);

  const filteredMembers = members.filter(m => {
    // If not admin (teacher), strictly enforce student role and teacher's department
    if (!isAdmin) {
      if (m.role !== 'student') return false;
      if (lockedDepartment && m.department?.toLowerCase() !== lockedDepartment.toLowerCase()) return false;
    } else {
      if (activeTab !== 'all' && m.role !== activeTab) return false;
      if (selectedDept !== 'all' && m.department !== selectedDept) return false;
    }

    const q = searchTerm.toLowerCase();
    return !searchTerm || 
      m.name?.toLowerCase().includes(q) || 
      m.member_id?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q);
  });

  const handleDelete = async (memberId, memberName) => {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to remove "${memberName}"?`)) return;
    setDeletingId(memberId);
    try {
      await axios.delete(`/api/members/${memberId}`);
      onRefresh();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="minimal-card p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {isAdmin 
              ? 'Campus Member Directory & Face Enrollment' 
              : `${lockedDepartment || 'Department'} Students Roster`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin 
              ? 'Full campus directory. Only administrators can register new profiles and enroll face biometrics.'
              : `Viewing enrolled students strictly in the ${lockedDepartment || ''} department.`}
          </p>
        </div>

        {/* Only Admin can enroll new members */}
        {isAdmin && (
          <button
            onClick={onOpenEnroll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll New Profile</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Role Switcher: Visible ONLY for Admin */}
        {isAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('student')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Students ({members.filter(m => m.role === 'student').length})
            </button>
            <button
              onClick={() => setActiveTab('teacher')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'teacher' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Teachers ({members.filter(m => m.role === 'teacher').length})
            </button>
          </div>
        )}

        {/* Search & Department Selector */}
        <div className={`flex items-center gap-2 flex-1 ${isAdmin ? 'md:max-w-md' : 'w-full'}`}>
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isAdmin ? "Search by name or ID..." : `Search ${lockedDepartment || ''} students...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* Department filter: ONLY shown to Admin (Teacher is locked to their branch) */}
          {isAdmin && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:border-slate-900"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full py-12 text-center minimal-card rounded-2xl bg-white border border-slate-200">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No students found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAdmin 
                ? 'Try adjusting your search criteria.' 
                : `No students enrolled yet in ${lockedDepartment}.`}
            </p>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const hasFace = !!(member.face_embedding && member.face_embedding.length > 0);
            return (
              <div 
                key={member.id || member.member_id}
                className="minimal-card rounded-2xl p-5 bg-white border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div 
                      onClick={() => member.role === 'student' && onSelectStudent && onSelectStudent(member)}
                      className={`flex items-center gap-3 ${member.role === 'student' ? 'cursor-pointer group' : ''}`}
                      title={member.role === 'student' ? 'Click to view student stats' : ''}
                    >
                      <img
                        src={member.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 group-hover:border-blue-400 transition-colors"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {member.name}
                        </h4>
                        <p className="text-xs font-mono text-slate-500">{member.member_id}</p>
                        {member.role === 'student' && (
                          <span className="text-[10px] text-blue-500 font-medium">Click for stats</span>
                        )}
                      </div>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                      member.role === 'student'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      {member.role}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-1 text-xs text-slate-600">
                    <p className="truncate"><span className="text-slate-400">Department:</span> {member.department}</p>
                    {member.designation && <p className="truncate"><span className="text-slate-400">Batch/Year:</span> {member.designation}</p>}
                    {member.email && <p className="truncate text-slate-500 font-mono text-[11px]">{member.email}</p>}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className={`flex items-center gap-1 text-[11px] font-medium ${hasFace ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {hasFace ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{hasFace ? 'Face Enrolled' : 'No Template'}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {member.role === 'student' && onSelectStudent && (
                      <button
                        onClick={() => onSelectStudent(member)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        View Stats
                      </button>
                    )}

                    {/* Only Admin can delete profiles */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(member.member_id, member.name)}
                        disabled={deletingId === member.member_id}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remove Profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
