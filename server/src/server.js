const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const { testConnection, isConfigured } = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing with 50mb limit for webcam frames & images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan('dev'));

// Mount API routes
app.use('/api', apiRoutes);

// Serve static frontend build if it exists (for single-container production deploys)
const path = require('path');
const fs = require('fs');

const possibleDistPaths = [
  path.join(__dirname, '../../client/dist'),
  path.join(__dirname, '../client/dist'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), '../client/dist')
];
const clientDist = possibleDistPaths.find(p => fs.existsSync(p));

if (clientDist) {
  console.log(`[STATIC] Serving compiled React frontend from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  // Root greeting for API-only mode
  app.get('/', (req, res) => {
    res.json({
      message: 'Face Recognition Attendance System API is running.',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        members: '/api/members',
        attendance_logs: '/api/attendance/logs',
        attendance_stats: '/api/attendance/stats',
        recognition_process: '/api/recognition/process-frame',
        settings: '/api/settings'
      }
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start listening
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('='.repeat(65));
  console.log(`  FACE RECOGNITION ATTENDANCE SERVER RUNNING ON PORT ${PORT}`);
  console.log(`  API Base: http://0.0.0.0:${PORT}/api`);
  console.log('='.repeat(65));

  // Check Supabase connection status
  if (isConfigured()) {
    const status = await testConnection();
    console.log(`[SUPABASE] Status: ${status.message}`);
  } else {
    console.log('[SUPABASE] Note: Supabase credentials not set in .env.');
    console.log('[SUPABASE] System running in resilient self-contained local storage mode.');
  }
});

// Export app for testing
module.exports = { app, server };
