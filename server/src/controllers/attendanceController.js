const repository = require('../db/repository');
const { uploadToStorage, snapshotsBucket } = require('../config/supabase');

/**
 * Determine status (present vs late) based on cutoff time
 */
function evaluateAttendanceStatus(cutoffTimeStr = "09:15:00") {
  const now = new Date();
  const [cutoffH, cutoffM, cutoffS] = (cutoffTimeStr || "09:15:00").split(':').map(Number);
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const cutoffMinutes = (cutoffH || 9) * 60 + (cutoffM || 15);

  return currentMinutes > cutoffMinutes ? 'late' : 'present';
}

exports.markAttendance = async (req, res) => {
  try {
    const { member_id, confidence, verification_mode, snapshot_base64, notes } = req.body;

    if (!member_id) {
      return res.status(400).json({ success: false, error: 'member_id is required' });
    }

    const member = await repository.getMemberById(member_id);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: `Member with ID "${member_id}" not found.`
      });
    }

    if (member.is_active === false) {
      return res.status(403).json({
        success: false,
        error: `Member "${member.name}" is marked inactive.`
      });
    }

    const settings = await repository.getSettings();
    const cooldownMins = settings.cooldown_minutes || 5;

    // Check duplicate check-in cooldown
    const recentLog = await repository.getRecentLogForMember(member.member_id, cooldownMins);
    if (recentLog) {
      const logTime = new Date(recentLog.check_in_time || recentLog.created_at).toLocaleTimeString();
      return res.status(200).json({
        success: true,
        already_marked: true,
        message: `Attendance already recorded for ${member.name} at ${logTime} (cooldown: ${cooldownMins}m).`,
        log: recentLog,
        member: {
          name: member.name,
          member_id: member.member_id,
          role: member.role,
          department: member.department,
          avatar_url: member.avatar_url
        }
      });
    }

    // Determine status (present / late)
    const status = evaluateAttendanceStatus(settings.late_cutoff_time);

    let snapshotUrl = null;
    if (snapshot_base64) {
      try {
        const base64Data = snapshot_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `snap_${member.member_id}_${Date.now()}.jpg`;
        snapshotUrl = await uploadToStorage(snapshotsBucket, filename, buffer, 'image/jpeg');
      } catch (snapErr) {
        console.warn('[STORAGE] Snapshot upload failed:', snapErr.message);
      }
    }

    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];

    const newLog = await repository.logAttendance({
      member_id: member.member_id,
      member_name: member.name,
      role: member.role,
      department: member.department,
      date: today,
      check_in_time: nowIso,
      status: status,
      confidence: confidence ? Number(confidence) : 95.0,
      verification_mode: verification_mode || 'face_recognition',
      snapshot_url: snapshotUrl || member.avatar_url,
      notes: notes || (status === 'late' ? 'Marked late (after cut-off)' : 'Verified on-time')
    });

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const greeting = status === 'present' 
      ? `Welcome, ${member.name}! Verified at ${timeString}` 
      : `Welcome, ${member.name}! Marked Late at ${timeString}`;

    res.status(201).json({
      success: true,
      already_marked: false,
      message: greeting,
      status,
      log: newLog,
      member: {
        name: member.name,
        member_id: member.member_id,
        role: member.role,
        department: member.department,
        avatar_url: member.avatar_url
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAttendanceLogs = async (req, res) => {
  try {
    const { date, role, department, status, search, limit } = req.query;
    const logs = await repository.getAttendanceLogs({
      date,
      role,
      department,
      status,
      search,
      limit: limit ? parseInt(limit, 10) : 100
    });
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await repository.getAttendanceStats();
    res.json({
      success: true,
      stats
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.exportAttendanceCsv = async (req, res) => {
  try {
    const { date, role, department } = req.query;
    const logs = await repository.getAttendanceLogs({ date, role, department, limit: 5000 });

    const rows = [
      ['Log ID', 'Member ID', 'Member Name', 'Role', 'Department', 'Date', 'Check-in Time', 'Status', 'Confidence %', 'Mode', 'Notes']
    ];

    for (const log of logs) {
      const checkInLocal = log.check_in_time ? new Date(log.check_in_time).toLocaleString() : '';
      rows.push([
        log.id || '',
        `"${log.member_id || ''}"`,
        `"${log.member_name || ''}"`,
        log.role || '',
        `"${log.department || ''}"`,
        log.date || '',
        `"${checkInLocal}"`,
        log.status || '',
        log.confidence || '',
        log.verification_mode || '',
        `"${log.notes || ''}"`
      ]);
    }

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const filename = `attendance_report_${date || new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
