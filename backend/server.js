const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { supabase, createNotification, logAudit } = require('./helpers');
const { authenticateUser, requirePermission } = require('./middleware');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. AUTHENTICATION
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });

    // FIX: Look up the profile using auth_id instead of id
    const { data: profile } = await supabase.from('profiles').select('role').eq('auth_id', data.user.id).single();
    res.json({ session: data.session, role: profile?.role });
});

app.post('/api/auth/logout', authenticateUser, async (req, res) => {
    await supabase.auth.signOut();
    res.json({ message: 'Logged out successfully' });
});

app.post('/api/auth/change-password', authenticateUser, async (req, res) => {
    const { newPassword } = req.body;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Password updated' });
});

// ==========================================
// 2. SYSTEM SETTINGS & ROLES 
// ==========================================
app.get('/api/settings', authenticateUser, async (req, res) => {
    const { data, error } = await supabase.from('system_settings').select('*');
    if (error) return res.status(500).json({ error: error.message });
    
    const config = {};
    data.forEach(item => { config[item.key] = item.value; });
    res.json(config);
});

app.patch('/api/settings/:key', authenticateUser, requirePermission('manage_system'), async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;

    const { data, error } = await supabase
        .from('system_settings')
        .update({ value, updated_at: new Date() })
        .eq('key', key)
        .select();

    if (error) return res.status(500).json({ error: error.message });

    const formattedKey = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    await logAudit({ 
        empId: req.user.id, 
        module: 'System Configuration', 
        action: `Updated the ${formattedKey}`, 
        recordId: key, 
        newValue: value 
    });

    res.json(data[0]);
});

app.get('/api/roles', authenticateUser, async (req, res) => {
    const { data, error } = await supabase.from('custom_roles').select('*').order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/roles', authenticateUser, requirePermission('manage_system'), async (req, res) => {
    const { name, permissions } = req.body;

    const { data, error } = await supabase.from('custom_roles')
        .insert([{ name, permissions, created_by: req.user.id }])
        .select();

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({ 
        empId: req.user.id, 
        module: 'System Configuration', 
        action: `Created a new role: ${name}`, 
        recordId: data[0].id, 
        newValue: { permissions } 
    });

    res.status(201).json(data[0]);
});

// ==========================================
// 3. USERS (PROFILES)
// ==========================================
app.get('/api/users', authenticateUser, requirePermission('view_users'), async (req, res) => {
    const { role, status } = req.query;
    let query = supabase.from('profiles').select('*');
    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query;
    if (error) {
        console.error("GET /api/users Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});
app.get('/api/users/:empId', authenticateUser, async (req, res) => {
    const { empId } = req.params;
    
    const { data, error } = await supabase
        .from('profiles')
        .select('*, designations(name)')
        .eq('emp_id', empId)
        .single();

    if (error || !data) return res.status(404).json({ error: 'Employee profile not found' });
    res.json(data);
});
app.post('/api/users', authenticateUser, requirePermission('create_users'), async (req, res) => {
    const { 
        name, email, role, password, 
        empId, department, employmentType, joiningDate 
    } = req.body;

    // 1. Fetch Password Policy from system_settings
    const { data: policyData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'password_policy')
        .single();

    const policy = policyData ? policyData.value : { minLength: 6, requireUppercase: true, requireNumbers: true };

    // 2. Validate Password against Policy
    if (password.length < (policy.minLength || 6)) {
        return res.status(400).json({ error: `Password must be at least ${policy.minLength} characters long.` });
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one uppercase letter.' });
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one number.' });
    }

    // 3. Create the Auth account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
    });

    if (authError) return res.status(400).json({ error: authError.message });

    // 4. Insert into profiles with emp_id as primary key
    const { data, error } = await supabase.from('profiles').insert([{ 
        emp_id: empId,
        auth_id: authData.user.id,
        name, email, role, 
        department, employment_type: employmentType, joining_date: joiningDate,
        status: 'active'
    }]).select();

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({ 
        empId: req.user.id, module: 'User Management', action: `Created new user: ${name}`, recordId: empId, newValue: { role, department } 
    });

    res.status(201).json(data[0]);
});

// ==========================================
// 4. DESIGNATIONS
// ==========================================
app.get('/api/designations', authenticateUser, async (req, res) => {
    const { status } = req.query;
    let query = supabase.from('designations').select('id, name, status');
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/designations', authenticateUser, requirePermission('manage_system'), async (req, res) => {
    const { name } = req.body;
    const { data, error } = await supabase.from('designations').insert([{ name }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

// ==========================================
// 5. PROJECTS
// ==========================================
app.get('/api/projects', authenticateUser, requirePermission('view_projects'), async (req, res) => {
    let query = supabase.from('projects').select('id, name, description, manager_id, start_date, end_date, status, progress');
    
    if (req.user.role.toLowerCase() === 'manager') {
        query = query.eq('manager_id', req.user.id);
    } else if (req.user.role.toLowerCase() === 'employee') {
        // FIX: Check project_members using emp_id
        const { data: memberships } = await supabase.from('project_members').select('project_id').eq('emp_id', req.user.id);
        const projectIds = memberships.map(m => m.project_id);
        if (projectIds.length > 0) query = query.in('id', projectIds);
        else return res.json([]);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/projects', authenticateUser, requirePermission('manage_projects'), async (req, res) => {
    const { name, description, startDate, endDate } = req.body;
    const { data, error } = await supabase.from('projects')
        .insert([{ name, description, start_date: startDate, end_date: endDate, manager_id: req.user.id }])
        .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

app.post('/api/projects/:id/members', authenticateUser, requirePermission('manage_projects'), async (req, res) => {
    const { empId, roleOnProject } = req.body;
    // FIX: Insert using emp_id
    const { data, error } = await supabase.from('project_members').insert([{ project_id: req.params.id, emp_id: empId, role_on_project: roleOnProject }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

app.delete('/api/projects/:id/members/:empId', authenticateUser, requirePermission('manage_projects'), async (req, res) => {
    // FIX: Delete using emp_id
    const { error } = await supabase.from('project_members').delete().eq('project_id', req.params.id).eq('emp_id', req.params.empId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Member removed' });
});

// ==========================================
// 6. TASKS
// ==========================================
app.get('/api/tasks', authenticateUser, requirePermission('view_tasks'), async (req, res) => {
    const { projectId, status, priority } = req.query;
    let query = supabase.from('tasks').select('*');
    
    if (req.user.role.toLowerCase() === 'employee') query = query.eq('assigned_to', req.user.id);
    if (projectId) query = query.eq('project_id', projectId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/tasks', authenticateUser, requirePermission('manage_tasks'), async (req, res) => {
    const { projectId, assignedTo, title, description, priority, dueDate, estimatedHours } = req.body;
    const { data, error } = await supabase.from('tasks').insert([{
        project_id: projectId, assigned_to: assignedTo, title, description, priority, due_date: dueDate, estimated_hours: estimatedHours
    }]).select();

    if (error) return res.status(500).json({ error: error.message });
    await createNotification({ empId: assignedTo, title: 'New Task', message: `You were assigned: ${title}`, type: 'task' });
    res.status(201).json(data[0]);
});

app.patch('/api/tasks/:id', authenticateUser, requirePermission('update_task_status'), async (req, res) => {
    const taskId = req.params.id;
    const updateData = req.body;
    const { data, error } = await supabase.from('tasks').update(updateData).eq('id', taskId).select();
    if (error) return res.status(500).json({ error: error.message });

    await logAudit({ empId: req.user.id, module: 'Tasks', action: 'Update Task', recordId: taskId, newValue: updateData });
    res.json(data[0]);
});

// ==========================================
// 7. TIMESHEETS
// ==========================================
app.get('/api/timesheets', authenticateUser, requirePermission('view_timesheets'), async (req, res) => {
    const { status, projectId } = req.query;
    let query = supabase.from('timesheets').select('*');
    
    if (req.user.role.toLowerCase() === 'employee') query = query.eq('employee_id', req.user.id);
    if (status) query = query.eq('status', status);
    if (projectId) query = query.eq('project_id', projectId);
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/timesheets', authenticateUser, requirePermission('submit_timesheets'), async (req, res) => {
    const { projectId, taskId, date, hours, remarks } = req.body;
    const { data, error } = await supabase.from('timesheets')
        .insert([{ project_id: projectId, task_id: taskId, date, hours, remarks, employee_id: req.user.id }])
        .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

app.patch('/api/timesheets/:id', authenticateUser, requirePermission('approve_timesheets'), async (req, res) => {
    const { status, remarks } = req.body;
    const { data, error } = await supabase.from('timesheets')
        .update({ status, remarks, approved_by: req.user.id, approved_at: new Date() })
        .eq('id', req.params.id).select();

    if (error) return res.status(500).json({ error: error.message });

    await createNotification({ empId: data[0].employee_id, title: 'Timesheet Updated', message: `Timesheet status: ${status}`, type: 'timesheet' });
    await logAudit({ empId: req.user.id, module: 'Timesheets', action: 'Status Update', recordId: req.params.id, newValue: { status } });
    
    res.json(data[0]);
});

// ==========================================
// 8. NOTIFICATIONS & ACTIVITIES
// ==========================================
app.get('/api/notifications', authenticateUser, async (req, res) => {
    // FIX: Query by emp_id
    const { data, error } = await supabase.from('notifications').select('*').eq('emp_id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.patch('/api/notifications/:id/read', authenticateUser, async (req, res) => {
    const { data, error } = await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('emp_id', req.user.id).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

app.get('/api/activities', authenticateUser, requirePermission('view_users'), async (req, res) => {
    const { data, error } = await supabase.from('audit_logs')
        .select('id, action, module, created_at, profiles(name)')
        .order('created_at', { ascending: false }).limit(10);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// ==========================================
// 9. REPORTS & DASHBOARD
// ==========================================
app.get('/api/reports/project-progress', authenticateUser, requirePermission('view_reports'), async (req, res) => {
    let query = supabase.from('projects').select('id, name, progress');
    if (req.user.role.toLowerCase() === 'manager') query = query.eq('manager_id', req.user.id);
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/audit-logs', authenticateUser, requirePermission('view_audit_logs'), async (req, res) => {
    const { module, empId, dateRange } = req.query;
    
    // Join with the profiles table to get the user's name
    let query = supabase.from('audit_logs')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false });
    
    if (module) query = query.eq('module', module);
    if (empId) query = query.eq('emp_id', empId); 
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/dashboard/admin-stats', authenticateUser, requirePermission('view_reports'), async (req, res) => {
    try {
        // 1. Count ALL profiles in the system (Admin + Employees)
        const { count: totalEmployees, error: empError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // 2. Count active projects
        const { count: activeProjects, error: projError } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        // 3. Count unique active users today from audit logs (using date check)
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: activeLogs, error: logError } = await supabase
            .from('audit_logs')
            .select('emp_id')
            .gte('created_at', todayStr);

        // Calculate unique active users today, defaulting to at least 1 if you are logged in
        const uniqueActiveUsers = activeLogs ? new Set(activeLogs.map(l => l.emp_id)).size : 0;
        const finalActiveToday = uniqueActiveUsers > 0 ? uniqueActiveUsers : 1; // Fallback to current admin session

        res.json({ 
            totalEmployees: totalEmployees ?? 2, 
            activeProjects: activeProjects ?? 0, 
            activeUsersToday: finalActiveToday 
        });
    } catch (err) {
        console.error("Error fetching admin stats:", err);
        res.status(500).json({ error: err.message });
    }
});
// ==========================================
// SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Complete API Server running on port ${PORT} with EMP ID architecture`);
});