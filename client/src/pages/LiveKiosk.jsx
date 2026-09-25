import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Camera, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  UserCheck, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  Play
} from 'lucide-react';
import { chime } from '../components/AudioChime';

export default function LiveKiosk({ engineOnline, members = [], onAttendanceMarked }) {
  const [isScanning, setIsScanning] = useState(false);
  const [autoMark, setAutoMark] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [detectionResults, setDetectionResults] = useState([]);
  const [lastVerifiedMember, setLastVerifiedMember] = useState(null);
  const [scanStatus, setScanStatus] = useState('Ready for check-in');
  const [streamError, setStreamError] = useState(null);
  const [processingFrame, setProcessingFrame] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const loadCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInputs);

      // Auto-detect laptop built-in camera
      const laptopCam = videoInputs.find(d =>
        /integrated|internal|built-in|front|hd webcam|webcam|laptop|uvc/i.test(d.label)
      ) || videoInputs[0];

      if (laptopCam && !selectedDeviceId) {
        setSelectedDeviceId(laptopCam.deviceId);
        return laptopCam.deviceId;
      }
    } catch (e) {
      console.warn('Could not enumerate video devices:', e);
    }
    return selectedDeviceId;
  };

  const startCamera = async (deviceIdToUse) => {
    try {
      setStreamError(null);
      stopCamera();

      // Constraints explicitly targeting user-facing laptop camera
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      };

      const devId = deviceIdToUse || selectedDeviceId;
      if (devId) {
        constraints.video.deviceId = { ideal: devId };
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        // Fallback to general user-facing laptop camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" }
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsScanning(true);
      setScanStatus('Laptop camera active');

      // Refresh device list to populate labels after permissions are granted
      loadCameraDevices();
    } catch (err) {
      console.error('Camera access error:', err);
      setStreamError('Laptop camera not accessible. Please ensure camera permissions are allowed in your browser.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsScanning(false);
    setDetectionResults([]);
  };

  useEffect(() => {
    startCamera(selectedDeviceId);
    return () => stopCamera();
  }, [selectedDeviceId]);

  useEffect(() => {
    if (!isScanning) return;

    intervalRef.current = setInterval(async () => {
      if (processingFrame || !videoRef.current || !canvasRef.current) return;
      if (videoRef.current.readyState !== 4) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = 640;
      canvas.height = 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL('image/jpeg', 0.75);

      setProcessingFrame(true);
      try {
        const response = await axios.post('/api/recognition/process-frame', {
          image_base64: base64Image,
          auto_mark: autoMark
        }, { timeout: 3500 });

        if (response.data.success && response.data.detected) {
          const results = response.data.results || [];
          setDetectionResults(results);

          const matched = results.find(r => r.matched);
          if (matched) {
            handleSuccessfulMatch(matched, response.data.attendance_events);
          } else {
            setScanStatus('Unrecognized face');
          }
        } else {
          setDetectionResults([]);
          setScanStatus('Scanning for face...');
        }
      } catch (err) {
        // Soft fail
      } finally {
        setProcessingFrame(false);
      }
    }, 1200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isScanning, processingFrame, autoMark]);

  const handleSuccessfulMatch = (matched, events = []) => {
    const isDuplicate = events.some(e => e.already_marked);
    const eventInfo = events[0];

    const displayInfo = {
      name: matched.name,
      member_id: matched.member_id,
      role: matched.role,
      department: matched.department,
      avatar_url: matched.avatar_url,
      confidence: matched.confidence,
      already_marked: isDuplicate,
      status: eventInfo?.status || 'present',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setLastVerifiedMember(displayInfo);

    if (soundEnabled) {
      if (isDuplicate) chime.playWarning();
      else chime.playSuccess();
    }

    if (isDuplicate) {
      setScanStatus(`${matched.name} is already checked in.`);
    } else {
      setScanStatus(`Checked In: ${matched.name}`);
      setRecentLogs(prev => [displayInfo, ...prev.slice(0, 15)]);
      if (onAttendanceMarked) onAttendanceMarked();
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Attendance Toolbar */}
      <div className="minimal-card rounded-2xl p-4 bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Face Recognition Attendance
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </h2>
          <p className="text-xs text-slate-500">{scanStatus}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Laptop Camera Indicator / Selector if multiple cameras exist */}
          {videoDevices.length > 1 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
              <Camera className="w-3.5 h-3.5 text-slate-600" />
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer"
                title="Select camera"
              >
                {videoDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700">
              <Camera className="w-3.5 h-3.5 text-slate-600" />
              <span>Laptop Camera</span>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) chime.playSuccess();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              soundEnabled ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-400'
            }`}
            title={soundEnabled ? 'Sound Enabled' : 'Muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-slate-700" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime On' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Main Kiosk Viewport Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Single Camera Feed Viewport (2 Cols) */}
        <div className="lg:col-span-2 minimal-card rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm relative aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Minimal Clean Target Box */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-64 sm:w-72 sm:h-80 border-2 border-white/40 rounded-2xl relative">
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-3 py-0.5 rounded-full text-[11px] font-medium">
                Position Face in Frame
              </div>
            </div>
          </div>

          {/* Clean Detection Badges */}
          {detectionResults.map((box, idx) => {
            const b = box.bounding_box || {
              top: box.box?.[0] || 0,
              right: box.box?.[1] || 0,
              bottom: box.box?.[2] || 0,
              left: box.box?.[3] || 0,
              width: (box.box?.[1] || 0) - (box.box?.[3] || 0),
              height: (box.box?.[2] || 0) - (box.box?.[0] || 0),
            };
            return (
              <div
                key={idx}
                className={`absolute pointer-events-none border-2 rounded-xl transition-all duration-200 ${
                  box.matched ? 'border-emerald-400 bg-emerald-500/10' : 'border-rose-400 bg-rose-500/10'
                }`}
                style={{
                  top: `${(b.top / 480) * 100}%`,
                  left: `${(1 - (b.right / 640)) * 100}%`,
                  width: `${(b.width / 640) * 100}%`,
                  height: `${(b.height / 480) * 100}%`,
                }}
              >
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded shadow ${
                  box.matched ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  {box.name}
                </span>
              </div>
            );
          })}

          {/* Processing indicator */}
          {processingFrame && (
            <div className="absolute top-3 right-3 bg-black/70 text-white px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 backdrop-blur-sm">
              <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
              <span>Verifying...</span>
            </div>
          )}

          {streamError && (
            <div className="absolute bottom-3 left-3 right-3 bg-rose-600 text-white px-3 py-2 rounded-xl text-xs">
              {streamError}
            </div>
          )}
        </div>

        {/* Verification Result Card & Recent Scans (1 Col) */}
        <div className="space-y-4 flex flex-col">
          {/* Latest Verified Card */}
          <div className="minimal-card rounded-2xl p-5 bg-white border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">
              Verification Result
            </span>

            {lastVerifiedMember ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={lastVerifiedMember.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {lastVerifiedMember.name}
                    </h3>
                    <p className="text-xs font-mono text-slate-500">{lastVerifiedMember.member_id}</p>
                    <p className="text-xs text-slate-600 capitalize">{lastVerifiedMember.role} • {lastVerifiedMember.department}</p>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  lastVerifiedMember.already_marked 
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : lastVerifiedMember.status === 'late'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {lastVerifiedMember.already_marked 
                        ? 'Already Checked In' 
                        : lastVerifiedMember.status === 'late' 
                          ? 'Marked Late' 
                          : 'Attendance Recorded'}
                    </span>
                  </span>
                  <span className="font-mono text-[11px]">{lastVerifiedMember.time}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400">
                <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">Waiting for next person</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Stand in front of the camera</p>
              </div>
            )}
          </div>

          {/* Recent Attendance Activity */}
          <div className="minimal-card rounded-2xl p-4 bg-white border border-slate-200 flex-1 flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Recent Check-Ins ({recentLogs.length})
            </span>
            <div className="space-y-1.5 overflow-y-auto max-h-72 flex-1 pr-1 text-xs">
              {recentLogs.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-xs">No check-ins recorded in this session yet.</p>
              ) : (
                recentLogs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-800 truncate max-w-[130px]">{log.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        log.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {log.status}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">{log.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
