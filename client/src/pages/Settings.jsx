import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings as SettingsIcon, 
  Database, 
  Sliders, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Clock, 
  Layers
} from 'lucide-react';

export default function Settings({ engineOnline, supabaseConfigured, onDataChanged }) {
  const [settings, setSettings] = useState({
    recognition_threshold: 0.52,
    cooldown_minutes: 5,
    late_cutoff_time: "09:15:00",
    allow_multi_checkin: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data.success) {
        setSettings(res.data.settings || {});
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await axios.post('/api/settings', settings);
      if (res.data.success) {
        setStatusMessage({ type: 'success', text: 'System policies updated successfully.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncCache = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      await axios.post('/api/members/sync-cache');
      setStatusMessage({ type: 'success', text: 'Face embeddings synced with Python recognition cache.' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Sync failed: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReSeed = async () => {
    if (!window.confirm('Reset and re-seed system with sample students, teachers, and logs?')) return;
    try {
      const res = await axios.post('/api/seed');
      setStatusMessage({ type: 'success', text: res.data.message });
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="minimal-card p-6 rounded-2xl bg-white border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          System Configuration & Rules
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure recognition tolerance, attendance schedules, and database connectivity
        </p>
      </div>

      {statusMessage && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {statusMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Supabase Connection */}
      <div className="minimal-card p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Database Storage Mode</h3>
          </div>
          <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${
            supabaseConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
          }`}>
            {supabaseConfigured ? 'Supabase PostgreSQL' : 'Local Storage Mode (Active)'}
          </span>
        </div>

        <p className="text-xs text-slate-500">
          The system operates locally without setup. To connect your cloud database, set <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">SUPABASE_URL</code> in <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">server/.env</code> and execute <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">supabase_schema.sql</code>.
        </p>
      </div>

      {/* Rules Form */}
      <form onSubmit={handleSaveSettings} className="minimal-card p-6 rounded-2xl bg-white border border-slate-200 space-y-6">
        <h3 className="text-sm font-bold text-slate-900">Attendance Policies</h3>

        <div className="space-y-5">
          {/* Tolerance */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-700">
                Face Distance Threshold: <span className="font-mono text-slate-900 font-bold">{settings.recognition_threshold}</span>
              </label>
              <span className="text-slate-400 text-[11px]">
                {settings.recognition_threshold <= 0.48 ? 'Strict' : settings.recognition_threshold <= 0.55 ? 'Balanced (Recommended)' : 'Lenient'}
              </span>
            </div>
            <input
              type="range"
              min="0.40"
              max="0.62"
              step="0.01"
              value={settings.recognition_threshold}
              onChange={(e) => setSettings({ ...settings, recognition_threshold: parseFloat(e.target.value) })}
              className="w-full accent-slate-900 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0.40 (Strict)</span>
              <span>0.52 (Standard)</span>
              <span>0.62 (Lenient)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cooldown Between Scans (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.cooldown_minutes}
                onChange={(e) => setSettings({ ...settings, cooldown_minutes: parseInt(e.target.value, 10) || 5 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Late Arrival Cut-Off Time
              </label>
              <input
                type="time"
                step="1"
                value={settings.late_cutoff_time}
                onChange={(e) => setSettings({ ...settings, late_cutoff_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Maintenance */}
      <div className="minimal-card p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Maintenance</h3>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncCache}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Face Cache with Python Service</span>
          </button>
          <button
            onClick={handleReSeed}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
