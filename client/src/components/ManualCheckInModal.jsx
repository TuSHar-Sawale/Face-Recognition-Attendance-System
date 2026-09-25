import React, { useState } from 'react';
import axios from 'axios';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function ManualCheckInModal({ isOpen, onClose, members = [], onSuccess, targetRole = null }) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [status, setStatus] = useState('present');
  const [notes, setNotes] = useState('Manual check-in record');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const isStudentOnly = targetRole === 'student';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setErrorMsg(`Please select a ${isStudentOnly ? 'student' : 'member'}.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await axios.post('/api/attendance/mark', {
        member_id: selectedMemberId,
        verification_mode: 'manual_override',
        confidence: 100.0,
        notes
      });
      if (res.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            {isStudentOnly ? 'Record Student Attendance' : 'Manual Attendance Entry'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isStudentOnly ? 'Select Student *' : 'Select Member *'}
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white focus:outline-none focus:border-slate-900"
              required
            >
              <option value="">-- Choose {isStudentOnly ? 'Student' : 'Member'} --</option>
              {members.map((m) => (
                <option key={m.member_id} value={m.member_id}>
                  {m.name} ({m.member_id} • {m.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white focus:outline-none focus:border-slate-900"
            >
              <option value="present">Present (On-Time)</option>
              <option value="late">Late Arrival</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason / Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Excused, Official Duty, Medical"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm disabled:opacity-60 flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Record Check-In</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
