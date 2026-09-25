const { supabase, isConfigured } = require('../config/supabase');
const localStore = require('./localStore');

class Repository {
  // MEMBERS
  async getMembers(filter = {}) {
    if (isConfigured() && supabase) {
      try {
        let query = supabase.from('members').select('*');
        if (filter.role && filter.role !== 'all') {
          query = query.eq('role', filter.role);
        }
        if (filter.department && filter.department !== 'all') {
          query = query.ilike('department', filter.department);
        }
        if (filter.search) {
          query = query.or(`name.ilike.%${filter.search}%,member_id.ilike.%${filter.search}%,email.ilike.%${filter.search}%`);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          return data;
        }
        console.warn('[REPO] Supabase getMembers error, falling back to local:', error?.message);
      } catch (e) {
        console.warn('[REPO] Supabase getMembers exception, fallback:', e.message);
      }
    }
    return localStore.getMembers(filter);
  }

  async getMemberById(idOrMemberId) {
    if (isConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .or(`id.eq.${idOrMemberId},member_id.eq.${idOrMemberId}`)
          .maybeSingle();
        if (!error && data) {
          return data;
        }
      } catch (e) {
        console.warn('[REPO] Supabase getMemberById fallback:', e.message);
      }
    }
    return localStore.getMemberById(idOrMemberId);
  }

  async createMember(memberData) {
    if (isConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('members')
          .insert([memberData])
          .select()
          .single();
        if (!error && data) {
          // Also save to local store as cache
          localStore.addMember(data);
          return data;
        }
        console.warn('[REPO] Supabase createMember error, fallback to local:', error?.message);
      } catch (e) {
        console.warn('[REPO] Supabase createMember exception:', e.message);
      }
    }
    return localStore.addMember(memberData);
  }

  async updateMember(idOrMemberId, updateData) {
    if (isConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('members')
          .update(updateData)
          .or(`id.eq.${idOrMemberId},member_id.eq.${idOrMemberId}`)
          .select()
          .single();
        if (!error && data) {
          localStore.updateMember(idOrMemberId, data);
          return data;
        }
      } catch (e) {
        console.warn('[REPO] Supabase updateMember exception:', e.message);
      }
    }
    return localStore.updateMember(idOrMemberId, updateData);
  }

  async deleteMember(idOrMemberId) {
    if (isConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('members')
          .delete()
          .or(`id.eq.${idOrMemberId},member_id.eq.${idOrMemberId}`);
        if (!error) {
          localStore.deleteMember(idOrMemberId);
          return true;
        }
      } catch (e) {
        console.warn('[REPO] Supabase deleteMember exception:', e.message);
      }
    }
    return localStore.deleteMember(idOrMemberId);
  }

  // ATTENDANCE LOGS
  async getAttendanceLogs(filter = {}) {
    if (isConfigured() && supabase) {
      try {
        let query = supabase.from('attendance_logs').select('*');
        if (filter.date) {
          query = query.eq('date', filter.date);
        }
        if (filter.role && filter.role !== 'all') {
          query = query.eq('role', filter.role);
        }
        if (filter.department && filter.department !== 'all') {
          query = query.ilike('department', filter.department);
        }
        if (filter.status && filter.status !== 'all') {
          query = query.eq('status', filter.status);
        }
        if (filter.search) {
          query = query.or(`member_name.ilike.%${filter.search}%,member_id.ilike.%${filter.search}%`);
        }
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(filter.limit || 100);

        if (!error && data) {
          return data;
        }
        console.warn('[REPO] Supabase getAttendanceLogs error, fallback:', error?.message);
      } catch (e) {
        console.warn('[REPO] Supabase getAttendanceLogs exception:', e.message);
      }
    }
    return localStore.getAttendanceLogs(filter);
  }

  async logAttendance(logData) {
    if (isConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('attendance_logs')
          .insert([logData])
          .select()
          .single();
        if (!error && data) {
          localStore.logAttendance(data);
          return data;
        }
        console.warn('[REPO] Supabase logAttendance error, fallback:', error?.message);
      } catch (e) {
        console.warn('[REPO] Supabase logAttendance exception:', e.message);
      }
    }
    return localStore.logAttendance(logData);
  }

  async getRecentLogForMember(memberId, minutesWindow = 5) {
    if (isConfigured() && supabase) {
      try {
        const cutoff = new Date(Date.now() - minutesWindow * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('member_id', memberId)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          return data[0];
        }
      } catch (e) {
        console.warn('[REPO] Supabase getRecentLogForMember fallback:', e.message);
      }
    }
    return localStore.getRecentLogForMember(memberId, minutesWindow);
  }

  async getTodayLogForMember(memberId) {
    const today = new Date().toISOString().split('T')[0];
    if (isConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('member_id', memberId)
          .eq('date', today)
          .maybeSingle();
        if (!error && data) {
          return data;
        }
      } catch (e) {
        console.warn('[REPO] Supabase getTodayLogForMember fallback:', e.message);
      }
    }
    return localStore.getTodayLogForMember(memberId);
  }

  // ANALYTICS & STATS
  async getAttendanceStats() {
    const today = new Date().toISOString().split('T')[0];
    const allMembers = await this.getMembers();
    const todayLogs = await this.getAttendanceLogs({ date: today, limit: 1000 });
    const allRecentLogs = await this.getAttendanceLogs({ limit: 10 });

    const totalStudents = allMembers.filter(m => m.role === 'student').length;
    const totalEmployees = allMembers.filter(m => m.role === 'employee').length;

    const studentTodayLogs = todayLogs.filter(l => l.role === 'student');
    const employeeTodayLogs = todayLogs.filter(l => l.role === 'employee');

    const onTimeCount = todayLogs.filter(l => l.status === 'present').length;
    const lateCount = todayLogs.filter(l => l.status === 'late').length;

    const totalMembers = totalStudents + totalEmployees;
    const overallRate = totalMembers > 0 ? Math.round((todayLogs.length / totalMembers) * 100) : 0;

    // Breakdown by department
    const departmentMap = {};
    for (const mem of allMembers) {
      if (!departmentMap[mem.department]) {
        departmentMap[mem.department] = { total: 0, present: 0 };
      }
      departmentMap[mem.department].total += 1;
    }
    for (const log of todayLogs) {
      if (departmentMap[log.department]) {
        departmentMap[log.department].present += 1;
      }
    }

    const departmentStats = Object.keys(departmentMap).map(dept => ({
      department: dept,
      total: departmentMap[dept].total,
      present: departmentMap[dept].present,
      rate: departmentMap[dept].total > 0 
        ? Math.round((departmentMap[dept].present / departmentMap[dept].total) * 100) 
        : 0
    }));

    // Hourly distribution for today (07:00 to 19:00)
    const hourlyCounts = {};
    for (let h = 7; h <= 19; h++) {
      const label = `${String(h).padStart(2, '0')}:00`;
      hourlyCounts[label] = 0;
    }
    for (const log of todayLogs) {
      const timeStr = log.check_in_time || log.created_at;
      if (timeStr) {
        const hour = new Date(timeStr).getHours();
        const label = `${String(hour).padStart(2, '0')}:00`;
        if (hourlyCounts[label] !== undefined) {
          hourlyCounts[label] += 1;
        }
      }
    }

    return {
      today: {
        total_present: todayLogs.length,
        on_time: onTimeCount,
        late: lateCount,
        rate_percentage: overallRate,
        students: {
          total: totalStudents,
          present: studentTodayLogs.length,
          rate: totalStudents > 0 ? Math.round((studentTodayLogs.length / totalStudents) * 100) : 0
        },
        employees: {
          total: totalEmployees,
          present: employeeTodayLogs.length,
          rate: totalEmployees > 0 ? Math.round((employeeTodayLogs.length / totalEmployees) * 100) : 0
        }
      },
      department_stats: departmentStats,
      hourly_trend: Object.entries(hourlyCounts).map(([hour, count]) => ({ hour, count })),
      recent_logs: allRecentLogs
    };
  }

  // SETTINGS
  async getSettings() {
    if (isConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('system_settings').select('*');
        if (!error && data && data.length > 0) {
          const mapped = {};
          data.forEach(item => {
            mapped[item.key] = item.value;
          });
          return mapped;
        }
      } catch (e) {
        console.warn('[REPO] Supabase getSettings fallback:', e.message);
      }
    }
    return localStore.getSettings();
  }

  async updateSettings(settingsData) {
    if (isConfigured() && supabase) {
      try {
        for (const [key, value] of Object.entries(settingsData)) {
          await supabase.from('system_settings').upsert({
            key,
            value,
            updated_at: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('[REPO] Supabase updateSettings fallback:', e.message);
      }
    }
    return localStore.updateSettings(settingsData);
  }

  // AUTH
  async authenticateUser(email, password, role) {
    if (isConfigured() && supabase) {
      try {
        let query = supabase.from('users').select('*').eq('email', email);
        if (role) query = query.eq('role', role);
        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          if (!password || data.password === password) {
            const { password: _, ...safeUser } = data;
            return safeUser;
          }
        }
      } catch (e) {
        console.warn('[REPO] Supabase authenticateUser fallback:', e.message);
      }
    }
    return localStore.authenticateUser(email, password, role);
  }

  async getUserById(id) {
    if (isConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          const { password: _, ...safeUser } = data;
          return safeUser;
        }
      } catch (e) {
        console.warn('[REPO] Supabase getUserById fallback:', e.message);
      }
    }
    return localStore.getUserById(id);
  }
}

module.exports = new Repository();

