const axios = require('axios');
const repository = require('../db/repository');
const { uploadToStorage, avatarsBucket } = require('../config/supabase');

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://localhost:5001';

/**
 * Notify Python engine to refresh its in-memory face embeddings cache
 */
async function syncPythonEngineCache() {
  try {
    const allMembers = await repository.getMembers();
    const enrolledOnly = allMembers.filter(m => m.face_embedding && Array.isArray(m.face_embedding));
    await axios.post(`${PYTHON_ENGINE_URL}/api/sync-cache`, {
      members: enrolledOnly
    }, { timeout: 3000 });
    console.log(`[SYNC] Python engine cache updated with ${enrolledOnly.length} face embeddings.`);
  } catch (err) {
    console.warn('[SYNC] Warning: Could not notify Python engine:', err.message);
  }
}

exports.getAllMembers = async (req, res) => {
  try {
    const { role, department, search } = req.query;
    const members = await repository.getMembers({ role, department, search });
    res.json({
      success: true,
      count: members.length,
      members
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getMemberById = async (req, res) => {
  try {
    const member = await repository.getMemberById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    const history = await repository.getAttendanceLogs({
      search: member.member_id,
      limit: 30
    });
    res.json({
      success: true,
      member,
      attendance_history: history
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createMember = async (req, res) => {
  try {
    const {
      member_id,
      name,
      email,
      phone,
      role,
      department,
      designation,
      batch_or_shift,
      image_base64
    } = req.body;

    if (!member_id || !name || !role || !department) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: member_id, name, role, department'
      });
    }

    // Check if member_id already exists
    const existing = await repository.getMemberById(member_id);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Member ID "${member_id}" is already registered.`
      });
    }

    let faceEmbedding = null;
    let avatarUrl = req.body.avatar_url || null;

    // If an image was supplied, extract face embedding via Python engine
    if (image_base64) {
      try {
        const pyRes = await axios.post(`${PYTHON_ENGINE_URL}/api/extract-embedding`, {
          image_base64
        }, { timeout: 8000 });

        if (!pyRes.data.success) {
          return res.status(422).json({
            success: false,
            error: pyRes.data.error || 'Face extraction failed. Please ensure a clear photo with one face.'
          });
        }

        faceEmbedding = pyRes.data.embedding;

        // Upload avatar to Supabase Cloud Storage if configured
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${role}_${member_id}_${Date.now()}.jpg`;
        const cloudUrl = await uploadToStorage(avatarsBucket, filename, buffer, 'image/jpeg');

        if (cloudUrl) {
          avatarUrl = cloudUrl;
        } else {
          // If Supabase storage is not configured, save as data URL
          avatarUrl = image_base64.startsWith('data:') ? image_base64 : `data:image/jpeg;base64,${image_base64}`;
        }
      } catch (pyErr) {
        console.warn('[PYTHON ENGINE] Embedding extraction error:', pyErr.message);
        return res.status(502).json({
          success: false,
          error: `Face recognition engine unreachable: ${pyErr.message}. Ensure python service is running on port 5001.`
        });
      }
    }

    const newMember = await repository.createMember({
      member_id,
      name,
      email: email || '',
      phone: phone || '',
      role: role.toLowerCase(),
      department,
      designation: designation || '',
      batch_or_shift: batch_or_shift || 'Default',
      avatar_url: avatarUrl,
      face_embedding: faceEmbedding,
      is_active: true
    });

    // Notify Python service cache asynchronously
    if (faceEmbedding) {
      syncPythonEngineCache();
    }

    res.status(201).json({
      success: true,
      message: `Enrolled ${role} ${name} successfully!`,
      member: newMember,
      face_enrolled: !!faceEmbedding
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateMember = async (req, res) => {
  try {
    const updated = await repository.updateMember(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    if (req.body.face_embedding) {
      syncPythonEngineCache();
    }
    res.json({ success: true, member: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteMember = async (req, res) => {
  try {
    const deleted = await repository.deleteMember(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    syncPythonEngineCache();
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.syncCache = async (req, res) => {
  await syncPythonEngineCache();
  res.json({ success: true, message: 'Triggered Python cache synchronization.' });
};
