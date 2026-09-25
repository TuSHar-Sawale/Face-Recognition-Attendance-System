import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveKiosk from './pages/LiveKiosk';
import Members from './pages/Members';
import AttendanceLogs from './pages/AttendanceLogs';
import Settings from './pages/Settings';
import StudentPortal from './pages/StudentPortal';
import TeacherPortal from './pages/TeacherPortal';
import EnrollModal from './components/EnrollModal';
import ManualCheckInModal from './components/ManualCheckInModal';
import StudentStatsModal from './components/StudentStatsModal';

export default function App() {
  // Starts unauthenticated (null) so app directly lands on the public attendance kiosk homepage
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('aura_attendance_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  // Default landing view is 'kiosk' (live facial recognition scanner)
  const [activeTab, setActiveTab] = useState('kiosk');
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [engineOnline, setEngineOnline] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [selectedStudentForStats, setSelectedStudentForStats] = useState(null);

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    localStorage.setItem('aura_attendance_user', JSON.stringify(user));
    // Route user to their dedicated portal upon login
    if (user.role === 'student') {
      setActiveTab('student-dashboard');
    } else if (user.role === 'teacher') {
      setActiveTab('teacher-dashboard');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('aura_attendance_user');
    // Return to public homepage kiosk
    setActiveTab('kiosk');
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/attendance/stats');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.warn('Could not fetch stats:', err.message);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await axios.get('/api/members');
      if (res.data.success) {
        setMembers(res.data.members || []);
      }
    } catch (err) {
      console.warn('Could not fetch members:', err.message);
    }
  };

  const checkEngineStatus = async () => {
    try {
      const res = await axios.get('/api/recognition/engine-status');
      setEngineOnline(!!res.data.online);
    } catch (err) {
      setEngineOnline(false);
    }
  };

  const checkSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data.success) {
        setSupabaseConfigured(!!res.data.supabase?.configured);
      }
    } catch (err) {
      console.warn('Settings check failed:', err.message);
    }
  };

  const refreshAll = () => {
    fetchStats();
    fetchMembers();
    checkEngineStatus();
    checkSettings();
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchStats();
      checkEngineStatus();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleExportCsv = () => {
    window.location.href = '/api/attendance/export';
  };

  // If activeTab is 'login' and user is not yet logged in, show Login page
  if (activeTab === 'login' && !currentUser) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onBackToKiosk={() => setActiveTab('kiosk')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => setActiveTab('login')}
        engineOnline={engineOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* KIOSK VIEW: Public Homepage Face Attendance Scanner (No login required to scan) */}
        {activeTab === 'kiosk' && (!currentUser || currentUser.role === 'admin') && (
          <LiveKiosk
            engineOnline={engineOnline}
            members={members}
            onAttendanceMarked={fetchStats}
          />
        )}

        {/* STUDENT VIEWS: Available when logged in as Student (No face scanner in profile) */}
        {currentUser?.role === 'student' && (
          <>
            {(activeTab === 'student-dashboard' || activeTab === 'student-logs' || activeTab === 'student-profile') && (
              <StudentPortal currentUser={currentUser} />
            )}
          </>
        )}

        {/* TEACHER VIEWS: Available when logged in as Teacher (No face scanner; roster view strictly for their department) */}
        {currentUser?.role === 'teacher' && (
          <>
            {activeTab === 'teacher-dashboard' && (
              <TeacherPortal
                currentUser={currentUser}
                onOpenManualEntry={() => setIsManualEntryOpen(true)}
                onSelectStudent={setSelectedStudentForStats}
              />
            )}
            {activeTab === 'members' && (
              <Members
                members={members.filter(m => 
                  m.role === 'student' && 
                  (!currentUser.department || m.department?.toLowerCase() === currentUser.department?.toLowerCase())
                )}
                onRefresh={fetchMembers}
                isAdmin={false}
                lockedDepartment={currentUser.department}
                onSelectStudent={setSelectedStudentForStats}
              />
            )}
            {activeTab === 'logs' && (
              <AttendanceLogs
                onOpenManualEntry={() => setIsManualEntryOpen(true)}
                lockedRole="student"
                lockedDepartment={currentUser.department}
                onSelectStudent={setSelectedStudentForStats}
              />
            )}
          </>
        )}

        {/* ADMIN VIEWS: Available when logged in as Admin (Only admin can make new profiles) */}
        {currentUser?.role === 'admin' && (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                stats={stats}
                onNavigate={(tab) => setActiveTab(tab)}
                onExportCsv={handleExportCsv}
              />
            )}
            {activeTab === 'members' && (
              <Members
                members={members}
                onRefresh={fetchMembers}
                onOpenEnroll={() => setIsEnrollOpen(true)}
                isAdmin={true}
                onSelectStudent={setSelectedStudentForStats}
              />
            )}
            {activeTab === 'logs' && (
              <AttendanceLogs
                onOpenManualEntry={() => setIsManualEntryOpen(true)}
                onSelectStudent={setSelectedStudentForStats}
              />
            )}
            {activeTab === 'settings' && (
              <Settings
                engineOnline={engineOnline}
                supabaseConfigured={supabaseConfigured}
                onDataChanged={refreshAll}
              />
            )}
          </>
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Campus Face Recognition Attendance System</span>
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <span>Signed in as <strong className="text-slate-800 capitalize">{currentUser.name} ({currentUser.role})</strong></span>
                <span>•</span>
                <button
                  onClick={handleLogout}
                  className="text-slate-600 hover:text-slate-900 font-semibold"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab('login')}
                className="text-slate-700 hover:text-slate-900 font-semibold"
              >
                Student / Teacher / Admin Sign In →
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modals - ONLY Admin can enroll new member profiles */}
      {currentUser?.role === 'admin' && (
        <EnrollModal
          isOpen={isEnrollOpen}
          onClose={() => setIsEnrollOpen(false)}
          onMemberAdded={() => {
            fetchMembers();
            fetchStats();
          }}
        />
      )}

      {/* Manual Check-in Modal: Admin or Teacher */}
      <ManualCheckInModal
        isOpen={isManualEntryOpen}
        onClose={() => setIsManualEntryOpen(false)}
        members={currentUser?.role === 'teacher'
          ? members.filter(m => 
              m.role === 'student' && 
              (!currentUser.department || m.department?.toLowerCase() === currentUser.department?.toLowerCase())
            )
          : members}
        targetRole={currentUser?.role === 'teacher' ? 'student' : null}
        onSuccess={() => {
          fetchStats();
        }}
      />

      {/* Student Statistics Modal: Accessible by Teacher & Admin */}
      <StudentStatsModal
        isOpen={!!selectedStudentForStats}
        student={selectedStudentForStats}
        onClose={() => setSelectedStudentForStats(null)}
        onOpenManualEntry={() => {
          setSelectedStudentForStats(null);
          setIsManualEntryOpen(true);
        }}
      />
    </div>
  );
}
