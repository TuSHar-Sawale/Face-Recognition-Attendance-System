const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'attendance_db.json');

const INITIAL_DATA = {
  users: [
    {
      id: "usr-admin-1",
      email: "admin@school.edu",
      password: "admin123",
      name: "Arthur Vance",
      role: "admin",
      designation: "Head of Administration",
      department: "Administration",
      avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256"
    },
    {
      id: "usr-teacher-1",
      email: "teacher@school.edu",
      password: "teacher123",
      name: "Dr. Vikram Malhotra",
      role: "teacher",
      member_id: "TCH-2001",
      department: "Computer Science",
      designation: "Associate Professor",
      avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256"
    },
    {
      id: "usr-student-1",
      email: "student@school.edu",
      password: "student123",
      name: "Aarav Sharma",
      role: "student",
      member_id: "STU-1001",
      department: "Computer Science",
      designation: "3rd Year B.Tech (AI & ML)",
      avatar_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=256"
    }
  ],
  members: [
    {
      id: "mem-001",
      member_id: "STU-1001",
      name: "Aarav Sharma",
      email: "student@school.edu",
      phone: "+91 98765 43210",
      role: "student",
      department: "Computer Science",
      designation: "3rd Year B.Tech (AI & ML)",
      batch_or_shift: "Batch 2024-28",
      avatar_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=256",
      face_embedding: null,
      is_active: true,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "mem-002",
      member_id: "STU-1002",
      name: "Priya Patel",
      email: "priya.patel@school.edu",
      phone: "+91 98765 43211",
      role: "student",
      department: "Computer Science",
      designation: "3rd Year B.Tech",
      batch_or_shift: "Batch 2024-28",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256",
      face_embedding: null,
      is_active: true,
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "mem-003",
      member_id: "STU-1003",
      name: "Rohan Verma",
      email: "rohan.verma@school.edu",
      phone: "+91 98765 43212",
      role: "student",
      department: "Information Technology",
      designation: "2nd Year B.Tech",
      batch_or_shift: "Batch 2025-29",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256",
      face_embedding: null,
      is_active: true,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "mem-004",
      member_id: "TCH-2001",
      name: "Dr. Vikram Malhotra",
      email: "teacher@school.edu",
      phone: "+91 98111 22334",
      role: "teacher",
      department: "Computer Science",
      designation: "Associate Professor (AI Lab Head)",
      batch_or_shift: "Faculty (09:00 - 17:00)",
      avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256",
      face_embedding: null,
      is_active: true,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "mem-005",
      member_id: "TCH-2002",
      name: "Prof. Sarah Jenkins",
      email: "sarah.jenkins@school.edu",
      phone: "+91 98222 33445",
      role: "teacher",
      department: "Information Technology",
      designation: "Assistant Professor",
      batch_or_shift: "Faculty (09:00 - 17:00)",
      avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256",
      face_embedding: null,
      is_active: true,
      created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "mem-006",
      member_id: "ADM-001",
      name: "Arthur Vance",
      email: "admin@school.edu",
      phone: "+91 98000 11223",
      role: "admin",
      department: "Administration",
      designation: "Chief Administrator",
      batch_or_shift: "General (08:30 - 17:30)",
      avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256",
      face_embedding: null,
      is_active: true,
      created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  attendance_logs: [],
  settings: {
    recognition_threshold: 0.52,
    cooldown_minutes: 5,
    late_cutoff_time: "09:15:00",
    allow_multi_checkin: false
  }
};

class LocalStore {
  constructor() {
    this.ensureDataDirectory();
    this.data = this.loadData();
    // Re-seed attendance logs if empty or missing users
    if (!this.data.users || this.data.users.length === 0 || this.data.attendance_logs.length === 0) {
      this.seedInitialAttendance();
    }
    if (!this.data.members || this.data.members.length === 0) {
      this.data.members = INITIAL_DATA.members;
      this.saveData();
    }
  }

  ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  loadData() {
    if (fs.existsSync(STORE_FILE)) {
      try {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.users) {
          parsed.users = INITIAL_DATA.users;
        }
        return parsed;
      } catch (err) {
        console.error('[LOCAL STORE] Error reading store file, resetting to initial:', err.message);
      }
    }
    this.saveData(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  saveData(data) {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(data || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[LOCAL STORE] Error saving data:', err.message);
    }
  }

  seedInitialAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

    const sampleLogs = [
      {
        id: uuidv4(),
        member_id: "STU-1001",
        member_name: "Aarav Sharma",
        role: "student",
        department: "Computer Science",
        date: today,
        check_in_time: `${today}T08:52:14.000Z`,
        check_out_time: null,
        status: "present",
        confidence: 96.8,
        verification_mode: "face_recognition",
        snapshot_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=256",
        notes: "On-time arrival",
        created_at: `${today}T08:52:14.000Z`
      },
      {
        id: uuidv4(),
        member_id: "STU-1001",
        member_name: "Aarav Sharma",
        role: "student",
        department: "Computer Science",
        date: yesterday,
        check_in_time: `${yesterday}T08:48:00.000Z`,
        check_out_time: null,
        status: "present",
        confidence: 98.1,
        verification_mode: "face_recognition",
        snapshot_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=256",
        notes: "On-time arrival",
        created_at: `${yesterday}T08:48:00.000Z`
      },
      {
        id: uuidv4(),
        member_id: "STU-1001",
        member_name: "Aarav Sharma",
        role: "student",
        department: "Computer Science",
        date: dayBefore,
        check_in_time: `${dayBefore}T09:22:00.000Z`,
        check_out_time: null,
        status: "late",
        confidence: 95.4,
        verification_mode: "face_recognition",
        snapshot_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=256",
        notes: "Late arrival (after cut-off)",
        created_at: `${dayBefore}T09:22:00.000Z`
      },
      {
        id: uuidv4(),
        member_id: "STU-1002",
        member_name: "Priya Patel",
        role: "student",
        department: "Computer Science",
        date: today,
        check_in_time: `${today}T09:24:30.000Z`,
        check_out_time: null,
        status: "late",
        confidence: 94.2,
        verification_mode: "face_recognition",
        snapshot_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256",
        notes: "Arrived after 09:15 AM",
        created_at: `${today}T09:24:30.000Z`
      },
      {
        id: uuidv4(),
        member_id: "TCH-2001",
        member_name: "Dr. Vikram Malhotra",
        role: "teacher",
        department: "Computer Science",
        date: today,
        check_in_time: `${today}T08:40:10.000Z`,
        check_out_time: null,
        status: "present",
        confidence: 98.4,
        verification_mode: "face_recognition",
        snapshot_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256",
        notes: "Faculty morning check-in",
        created_at: `${today}T08:40:10.000Z`
      },
      {
        id: uuidv4(),
        member_id: "TCH-2002",
        member_name: "Prof. Sarah Jenkins",
        role: "teacher",
        department: "Information Technology",
        date: yesterday,
        check_in_time: `${yesterday}T08:55:00.000Z`,
        check_out_time: `${yesterday}T17:30:00.000Z`,
        status: "present",
        confidence: 97.1,
        verification_mode: "face_recognition",
        snapshot_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256",
        notes: "On-time arrival",
        created_at: `${yesterday}T08:55:00.000Z`
      }
    ];

    this.data.users = INITIAL_DATA.users;
    this.data.members = INITIAL_DATA.members;
    this.data.attendance_logs = sampleLogs;
    this.saveData();
  }

  // Auth
  authenticateUser(email, password, role) {
    if (!this.data.users) this.data.users = INITIAL_DATA.users;
    const user = this.data.users.find(u => {
      const matchEmail = u.email.toLowerCase() === (email || '').toLowerCase();
      const matchRole = !role || u.role === role;
      return matchEmail && matchRole;
    });

    if (!user) return null;
    if (password && user.password !== password) return null;

    // Return safe user object (omit password)
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  getUserById(id) {
    if (!this.data.users) return null;
    const user = this.data.users.find(u => u.id === id);
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  // Member CRUD
  getMembers({ role, department, search } = {}) {
    let result = [...this.data.members];
    if (role && role !== 'all') {
      result = result.filter(m => m.role === role);
    }
    if (department && department !== 'all') {
      result = result.filter(m => m.department.toLowerCase() === department.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.member_id.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q))
      );
    }
    return result;
  }

  getMemberById(idOrMemberId) {
    return this.data.members.find(m => m.id === idOrMemberId || m.member_id === idOrMemberId);
  }

  addMember(memberData) {
    const newMember = {
      id: memberData.id || uuidv4(),
      member_id: memberData.member_id,
      name: memberData.name,
      email: memberData.email || '',
      phone: memberData.phone || '',
      role: memberData.role || 'student',
      department: memberData.department || 'General',
      designation: memberData.designation || '',
      batch_or_shift: memberData.batch_or_shift || 'Default',
      avatar_url: memberData.avatar_url || '',
      face_embedding: memberData.face_embedding || null,
      is_active: memberData.is_active !== undefined ? memberData.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.members.unshift(newMember);
    this.saveData();
    return newMember;
  }

  updateMember(idOrMemberId, updateData) {
    const idx = this.data.members.findIndex(m => m.id === idOrMemberId || m.member_id === idOrMemberId);
    if (idx === -1) return null;
    this.data.members[idx] = {
      ...this.data.members[idx],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    this.saveData();
    return this.data.members[idx];
  }

  deleteMember(idOrMemberId) {
    const idx = this.data.members.findIndex(m => m.id === idOrMemberId || m.member_id === idOrMemberId);
    if (idx === -1) return false;
    this.data.members.splice(idx, 1);
    this.saveData();
    return true;
  }

  // Attendance
  getAttendanceLogs({ date, role, department, status, search, member_id, limit = 100 } = {}) {
    let result = [...this.data.attendance_logs];
    if (member_id) {
      result = result.filter(l => l.member_id === member_id);
    }
    if (date) {
      result = result.filter(l => l.date === date);
    }
    if (role && role !== 'all') {
      result = result.filter(l => l.role === role);
    }
    if (department && department !== 'all') {
      result = result.filter(l => l.department.toLowerCase() === department.toLowerCase());
    }
    if (status && status !== 'all') {
      result = result.filter(l => l.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => 
        l.member_name.toLowerCase().includes(q) || 
        l.member_id.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return result.slice(0, limit);
  }

  logAttendance(logData) {
    const today = new Date().toISOString().split('T')[0];
    const newLog = {
      id: logData.id || uuidv4(),
      member_id: logData.member_id,
      member_name: logData.member_name,
      role: logData.role,
      department: logData.department,
      date: logData.date || today,
      check_in_time: logData.check_in_time || new Date().toISOString(),
      check_out_time: logData.check_out_time || null,
      status: logData.status || 'present',
      confidence: logData.confidence || 95.0,
      verification_mode: logData.verification_mode || 'face_recognition',
      snapshot_url: logData.snapshot_url || null,
      notes: logData.notes || '',
      created_at: new Date().toISOString()
    };
    this.data.attendance_logs.unshift(newLog);
    this.saveData();
    return newLog;
  }

  getRecentLogForMember(memberId, minutesWindow = 5) {
    const cutoff = Date.now() - (minutesWindow * 60 * 1000);
    return this.data.attendance_logs.find(l => 
      l.member_id === memberId && new Date(l.created_at).getTime() >= cutoff
    );
  }

  getTodayLogForMember(memberId) {
    const today = new Date().toISOString().split('T')[0];
    return this.data.attendance_logs.find(l => l.member_id === memberId && l.date === today);
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.saveData();
    return this.data.settings;
  }
}

module.exports = new LocalStore();
