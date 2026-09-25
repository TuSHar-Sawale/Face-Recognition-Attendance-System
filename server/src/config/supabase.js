const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;
let isConfigured = false;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-id')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    isConfigured = true;
    console.log('[SUPABASE] Client initialized with URL:', supabaseUrl);
  } catch (err) {
    console.warn('[SUPABASE] Warning: Initialization failed:', err.message);
    supabase = null;
    isConfigured = false;
  }
} else {
  console.log('[SUPABASE] No active credentials found in .env. Operating in self-contained local storage mode.');
}

async function testConnection() {
  if (!isConfigured || !supabase) {
    return { connected: false, message: 'Supabase credentials not configured in .env' };
  }
  try {
    const { data, error } = await supabase.from('system_settings').select('*').limit(1);
    if (error) {
      // If table doesn't exist yet, we still know the project connection succeeded
      return { connected: true, message: `Connected to Supabase, but schema tables may need creation: ${error.message}` };
    }
    return { connected: true, message: 'Connected to Supabase PostgreSQL successfully!' };
  } catch (err) {
    return { connected: false, message: err.message };
  }
}

/**
 * Upload base64 image or buffer to Supabase Storage bucket
 */
async function uploadToStorage(bucketName, fileName, fileBuffer, mimeType = 'image/jpeg') {
  if (!isConfigured || !supabase) {
    return null;
  }
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.warn(`[SUPABASE STORAGE] Upload error to ${bucketName}:`, error.message);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicData?.publicUrl || null;
  } catch (err) {
    console.warn('[SUPABASE STORAGE] Upload exception:', err.message);
    return null;
  }
}

module.exports = {
  supabase,
  isConfigured: () => isConfigured,
  testConnection,
  uploadToStorage,
  supabaseUrl,
  avatarsBucket: process.env.SUPABASE_AVATARS_BUCKET || 'attendance-avatars',
  snapshotsBucket: process.env.SUPABASE_SNAPSHOTS_BUCKET || 'attendance-snapshots',
};
