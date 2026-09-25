import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  Camera, 
  Upload, 
  Check, 
  AlertCircle, 
  Loader2, 
  GraduationCap, 
  Briefcase 
} from 'lucide-react';

export default function EnrollModal({ isOpen, onClose, onMemberAdded }) {
  const [role, setRole] = useState('student');
  const [formData, setFormData] = useState({
    member_id: '',
    name: '',
    email: '',
    phone: '',
    department: 'Computer Science',
    designation: '',
    batch_or_shift: ''
  });

  const [captureMode, setCaptureMode] = useState('camera');
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const departments = [
    'Computer Science',
    'Information Technology',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Human Resources',
    'Research & Development',
    'Finance & Accounting',
    'Administration'
  ];

  const startCamera = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Modal camera error:', err);
      setErrorMsg('Could not open webcam. You can upload an image file instead.');
      setCaptureMode('file');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isOpen && captureMode === 'camera' && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, captureMode, capturedImage]);

  if (!isOpen) return null;

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formData.member_id.trim() || !formData.name.trim()) {
      setErrorMsg('Member ID and Full Name are required.');
      return;
    }

    if (!capturedImage) {
      setErrorMsg('Please capture or upload a face photo for enrollment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        role,
        image_base64: capturedImage
      };

      const res = await axios.post('/api/members', payload);
      if (res.data.success) {
        setSuccessMsg(`Enrolled ${formData.name} successfully!`);
        setTimeout(() => {
          onMemberAdded();
          onClose();
        }, 1000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Enrollment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl p-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Enroll New Member</h3>
            <p className="text-xs text-slate-500">Capture face photo to register biometrics into the system</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl my-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setRole('student');
              if (!formData.member_id) setFormData(p => ({ ...p, member_id: `STU-${Math.floor(1000 + Math.random() * 9000)}` }));
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors ${
              role === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>Student</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('teacher');
              if (!formData.member_id) setFormData(p => ({ ...p, member_id: `TCH-${Math.floor(2000 + Math.random() * 8000)}` }));
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors ${
              role === 'teacher' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4 text-purple-600" />
            <span>Teacher / Faculty</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Photo Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700">Face Photo *</label>
              <div className="flex items-center gap-2 text-slate-500">
                <button
                  type="button"
                  onClick={() => { setCaptureMode('camera'); setCapturedImage(null); }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded ${captureMode === 'camera' ? 'bg-slate-200 text-slate-900 font-semibold' : ''}`}
                >
                  <Camera className="w-3 h-3" /> Camera
                </button>
                <button
                  type="button"
                  onClick={() => { setCaptureMode('file'); setCapturedImage(null); }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded ${captureMode === 'file' ? 'bg-slate-200 text-slate-900 font-semibold' : ''}`}
                >
                  <Upload className="w-3 h-3" /> Upload
                </button>
              </div>
            </div>

            <div className="relative aspect-video rounded-xl bg-slate-900 border border-slate-200 overflow-hidden flex items-center justify-center">
              {capturedImage ? (
                <div className="relative w-full h-full">
                  <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setCapturedImage(null); if (captureMode === 'camera') startCamera(); }}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black text-white text-[11px]"
                  >
                    Retake
                  </button>
                </div>
              ) : captureMode === 'camera' ? (
                <>
                  <video ref={videoRef} playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="absolute bottom-3 px-4 py-1.5 rounded-lg bg-white text-slate-900 font-semibold text-xs shadow flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Capture Photo</span>
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-800 transition-colors w-full h-full text-white">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold">Select image file</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {role === 'student' ? 'Student ID / Roll No *' : 'Teacher ID *'}
              </label>
              <input
                type="text"
                required
                value={formData.member_id}
                onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                placeholder={role === 'student' ? 'STU-1005' : 'TCH-2003'}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sahil Kapoor"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-slate-900"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {role === 'student' ? 'Course / Semester' : 'Designation'}
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder={role === 'student' ? '3rd Year B.Tech' : 'Associate Professor'}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@school.edu"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Shift / Batch</label>
              <input
                type="text"
                value={formData.batch_or_shift}
                onChange={(e) => setFormData({ ...formData, batch_or_shift: e.target.value })}
                placeholder="General"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
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
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm disabled:opacity-60 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing Embedding...</span>
                </>
              ) : (
                <span>Register & Enroll Face</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
