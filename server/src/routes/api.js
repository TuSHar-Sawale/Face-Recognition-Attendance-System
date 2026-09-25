const express = require('express');
const router = express.Router();

const memberController = require('../controllers/memberController');
const attendanceController = require('../controllers/attendanceController');
const recognitionController = require('../controllers/recognitionController');
const repository = require('../db/repository');
const { testConnection, isConfigured } = require('../config/supabase');

// Health & Diagnostics
router.get('/health', async (req, res) => {
  const supabaseStatus = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Face Recognition Attendance Server',
    database: {
      supabase_configured: isConfigured(),
      supabase_status: supabaseStatus
    }
  });
});

// Authentication
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const user = await repository.authenticateUser(email, password, role);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials or user not found' });
    }
    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user,
      token: `demo-token-${user.id}-${Date.now()}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/auth/demo-users', async (req, res) => {
  const localStore = require('../db/localStore');
  const users = (localStore.data.users || []).map(({ password, ...u }) => u);
  res.json({ success: true, users });
});

// Member Management
router.get('/members', memberController.getAllMembers);
router.get('/members/:id', memberController.getMemberById);
router.post('/members', memberController.createMember);
router.put('/members/:id', memberController.updateMember);
router.delete('/members/:id', memberController.deleteMember);
router.post('/members/sync-cache', memberController.syncCache);

// Attendance Management
router.post('/attendance/mark', attendanceController.markAttendance);
router.get('/attendance/logs', attendanceController.getAttendanceLogs);
router.get('/attendance/stats', attendanceController.getStats);
router.get('/attendance/export', attendanceController.exportAttendanceCsv);

// Face Recognition
router.post('/recognition/process-frame', recognitionController.processFrame);
router.get('/recognition/engine-status', recognitionController.getEngineStatus);

// System Settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await repository.getSettings();
    const supabaseStatus = await testConnection();
    res.json({
      success: true,
      settings,
      supabase: {
        configured: isConfigured(),
        status: supabaseStatus
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const updated = await repository.updateSettings(req.body);
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Seed Initial Data
router.post('/seed', async (req, res) => {
  try {
    const localStore = require('../db/localStore');
    localStore.seedInitialAttendance();
    const members = await repository.getMembers();
    res.json({
      success: true,
      message: 'System re-seeded with demo students, employees, and attendance logs.',
      members_count: members.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
