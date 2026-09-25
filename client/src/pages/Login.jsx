import React, { useState } from 'react';
import axios from 'axios';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function Login({ onLoginSuccess, onBackToKiosk }) {
  const [email, setEmail] = useState('student@school.edu');
  const [password, setPassword] = useState('student123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await axios.post('/api/auth/login', {
        email,
        password
      });

      if (res.data.success) {
        onLoginSuccess(res.data.user, res.data.token);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-slate-900 selection:text-white">
      <div className="w-full max-w-sm">
        {/* Back to Kiosk button */}
        {onBackToKiosk && (
          <button
            onClick={onBackToKiosk}
            className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Live Scanner</span>
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900 text-white shadow-sm mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Portal Sign In
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access your personal attendance records or administrative tools
          </p>
        </div>

        {/* Single Unified Login Card */}
        <div className="minimal-card rounded-2xl p-6 sm:p-7 bg-white border border-slate-200 shadow-sm">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.edu"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-slate-700">Password</label>
                <span className="text-[11px] text-slate-400">Default: password123</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm mt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Helper */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Fill demo account:</span>
            <div className="flex items-center gap-1.5 font-medium">
              <button
                type="button"
                onClick={() => fillCredentials('student@school.edu', 'student123')}
                className="px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors"
              >
                Student
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => fillCredentials('teacher@school.edu', 'teacher123')}
                className="px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors"
              >
                Teacher
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => fillCredentials('admin@school.edu', 'admin123')}
                className="px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Automated Facial Detection & Attendance Platform
        </p>
      </div>
    </div>
  );
}
