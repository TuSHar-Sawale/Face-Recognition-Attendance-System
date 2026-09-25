import React, { useState } from 'react';
import { 
  Scan, 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Settings as SettingsIcon, 
  LogOut, 
  LogIn,
  CheckCircle2, 
  UserCheck, 
  ChevronDown
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onLogout, 
  onOpenLogin,
  engineOnline 
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const role = currentUser?.role || null;

  // Nav items based on role (No scanner in student/teacher profiles)
  const getNavItems = () => {
    if (!currentUser) {
      return [
        { id: 'kiosk', label: 'Face Attendance', icon: Scan }
      ];
    }
    if (role === 'student') {
      return [
        { id: 'student-dashboard', label: 'My Attendance', icon: LayoutDashboard },
        { id: 'student-logs', label: 'Check-in History', icon: CalendarCheck },
        { id: 'student-profile', label: 'Profile', icon: UserCheck }
      ];
    }
    if (role === 'teacher') {
      return [
        { id: 'teacher-dashboard', label: 'Class Overview', icon: LayoutDashboard },
        { id: 'members', label: 'Students Roster', icon: Users },
        { id: 'logs', label: 'Attendance Records', icon: CalendarCheck }
      ];
    }
    // Admin (Full System Management)
    return [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'members', label: 'Member Directory', icon: Users },
      { id: 'kiosk', label: 'Face Scanner', icon: Scan },
      { id: 'logs', label: 'Audit Logs', icon: CalendarCheck },
      { id: 'settings', label: 'Settings', icon: SettingsIcon }
    ];
  };

  const navItems = getNavItems();

  const handleBrandClick = () => {
    if (!currentUser) {
      setActiveTab('kiosk');
    } else if (role === 'student') {
      setActiveTab('student-dashboard');
    } else if (role === 'teacher') {
      setActiveTab('teacher-dashboard');
    } else {
      setActiveTab('dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div 
          onClick={handleBrandClick}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-sm shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm tracking-tight">Campus Attendance</span>
              {role && (
                <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md border ${
                  role === 'admin' 
                    ? 'bg-slate-100 text-slate-800 border-slate-300' 
                    : role === 'teacher' 
                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-900' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: Engine indicator & Auth */}
        <div className="flex items-center gap-3">
          {/* Subtle Engine Indicator */}
          <div 
            title={engineOnline ? 'Face Recognition Engine Online' : 'Face Recognition Engine Offline'}
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500"
          >
            <span className={`w-2 h-2 rounded-full ${engineOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-[11px] font-medium">{engineOnline ? 'Engine Online' : 'Engine Offline'}</span>
          </div>

          {currentUser ? (
            /* Logged In User Profile Pill */
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-xs"
              >
                <img
                  src={currentUser.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover border border-slate-200"
                />
                <span className="font-semibold text-slate-800 hidden sm:inline max-w-[110px] truncate">
                  {currentUser.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2 text-xs z-50 animate-in fade-in slide-in-from-top-1"
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-900 truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    <p className="text-[10px] text-slate-400 capitalize mt-0.5">{role} • {currentUser.department || 'Campus'}</p>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => { onLogout(); setDropdownOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 text-left font-medium transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Not Logged In: Portal Sign In */
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Portal Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {currentUser && (
        <div className="flex md:hidden items-center gap-1 overflow-x-auto pt-2 mt-2 border-t border-slate-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
