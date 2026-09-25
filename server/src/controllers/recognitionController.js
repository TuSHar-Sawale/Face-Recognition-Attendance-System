const axios = require('axios');
const repository = require('../db/repository');
const attendanceController = require('./attendanceController');

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://localhost:5001';

exports.processFrame = async (req, res) => {
  try {
    const { image_base64, auto_mark = true, tolerance } = req.body;

    if (!image_base64) {
      return res.status(400).json({ success: false, error: 'image_base64 is required' });
    }

    const settings = await repository.getSettings();
    const effectiveTol = tolerance !== undefined ? tolerance : (settings.recognition_threshold || 0.52);

    // Get all enrolled members with embeddings
    const allMembers = await repository.getMembers();
    const enrolledMembers = allMembers.filter(m => m.face_embedding && Array.isArray(m.face_embedding));

    // Call Python recognition service
    let pyResponse;
    try {
      pyResponse = await axios.post(`${PYTHON_ENGINE_URL}/api/recognize-frame`, {
        image_base64,
        tolerance: effectiveTol,
        members: enrolledMembers
      }, { timeout: 6000 });
    } catch (pyErr) {
      return res.status(502).json({
        success: false,
        error: `Python face recognition engine offline: ${pyErr.message}`
      });
    }

    const recData = pyResponse.data;
    const results = recData.results || [];
    const attendanceEvents = [];

    // If auto_mark is enabled, automatically mark attendance for verified faces
    if (auto_mark && results.length > 0) {
      for (const item of results) {
        if (item.matched && item.member_id) {
          // Check cooldown first
          const recent = await repository.getRecentLogForMember(item.member_id, settings.cooldown_minutes || 5);
          if (recent) {
            attendanceEvents.push({
              member_id: item.member_id,
              name: item.name,
              status: recent.status,
              already_marked: true,
              message: `Already checked in at ${new Date(recent.check_in_time).toLocaleTimeString()}`
            });
          } else {
            // Mark attendance
            const mockReq = {
              body: {
                member_id: item.member_id,
                confidence: item.confidence,
                verification_mode: 'web_kiosk_camera',
                snapshot_base64: image_base64
              }
            };
            let markedResult = null;
            const mockRes = {
              status: (code) => ({
                json: (data) => { markedResult = data; }
              })
            };

            await attendanceController.markAttendance(mockReq, mockRes);
            if (markedResult) {
              attendanceEvents.push(markedResult);
            }
          }
        }
      }
    }

    res.json({
      success: true,
      detected: recData.detected,
      faces_count: recData.faces_count,
      results: results,
      attendance_events: attendanceEvents
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getEngineStatus = async (req, res) => {
  try {
    const pyRes = await axios.get(`${PYTHON_ENGINE_URL}/health`, { timeout: 2500 });
    res.json({
      success: true,
      online: true,
      data: pyRes.data
    });
  } catch (err) {
    res.json({
      success: true,
      online: false,
      message: 'Python face recognition service is currently offline or unreachable on port 5001.'
    });
  }
};
