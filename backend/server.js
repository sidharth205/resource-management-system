const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const { supabase, createNotification, logAudit } = require('./helpers');
const { authenticateUser, requirePermission } = require('./middleware');

const app = express();
app.use(cors());
app.use(express.json());

// Update your multer configuration to accept documents
const upload = multer({ 
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        // Accept images, pdfs, and word documents
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc
            'application/pdf',
            'image/jpeg',
            'image/png',
            'text/plain'
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only .docx, .doc, .pdf, txt, and images are allowed.'), false);
        }
    }
});
// ==========================================
// 1. AUTHENTICATION
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return res.status(401).json({ error: error.message });

        const session = data.session;
        const user = data.user;

        const { data: profile } = await supabase
            .from('profiles')
            .select('name, role')
            .eq('auth_id', user.id)
            .single();

        res.json({
            session,
            role: profile?.role || 'employee',
            name: profile?.name || 'User'
        });
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ error: 'Internal server error during login' });
    }
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
        empId: req.user.empId || req.user.id, 
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
        empId: req.user.empId || req.user.id, 
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

    const { data: policyData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'password_policy')
        .single();

    const policy = policyData ? policyData.value : { minLength: 6, requireUppercase: true, requireNumbers: true };

    if (password.length < (policy.minLength || 6)) {
        return res.status(400).json({ error: `Password must be at least ${policy.minLength} characters long.` });
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one uppercase letter.' });
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one number.' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
    });

    if (authError) return res.status(400).json({ error: authError.message });

    const { data, error } = await supabase.from('profiles').insert([{ 
        emp_id: empId,
        auth_id: authData.user.id,
        name, email, role, 
        department, employment_type: employmentType, joining_date: joiningDate,
        status: 'active'
    }]).select();

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({ 
        empId: req.user.empId || req.user.id, 
        module: 'User Management', 
        action: `Created new user: ${name}`, 
        recordId: empId, 
        newValue: { role, department } 
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
        query = query.eq('manager_id', req.user.empId || req.user.id);
    } else if (req.user.role.toLowerCase() === 'employee') {
        const { data: memberships } = await supabase.from('project_members').select('project_id').eq('emp_id', req.user.empId || req.user.id);
        const projectIds = memberships ? memberships.map(m => m.project_id) : [];
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
        .insert([{ name, description, start_date: startDate, end_date: endDate, manager_id: req.user.empId || req.user.id }])
        .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

app.post('/api/projects/:id/members', authenticateUser, requirePermission('manage_projects'), async (req, res) => {
    const { empId, roleOnProject } = req.body;
    const { data, error } = await supabase.from('project_members').insert([{ project_id: req.params.id, emp_id: empId, role_on_project: roleOnProject }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

app.delete('/api/projects/:id/members/:empId', authenticateUser, requirePermission('manage_projects'), async (req, res) => {
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
    
    if (req.user.role.toLowerCase() === 'employee') query = query.eq('assigned_to', req.user.empId || req.user.id);
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

    await logAudit({ empId: req.user.empId || req.user.id, module: 'Tasks', action: 'Update Task', recordId: taskId, newValue: updateData });
    res.json(data[0]);
});

// ==========================================
// 7. TIMESHEETS
// ==========================================
app.get('/api/timesheets', authenticateUser, requirePermission('view_timesheets'), async (req, res) => {
    const { status, projectId } = req.query;
    let query = supabase.from('timesheets').select('*');
    
    if (req.user.role.toLowerCase() === 'employee') query = query.eq('employee_id', req.user.empId || req.user.id);
    if (status) query = query.eq('status', status);
    if (projectId) query = query.eq('project_id', projectId);
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/timesheets', authenticateUser, requirePermission('submit_timesheets'), async (req, res) => {
    const { projectId, taskId, date, hours, remarks } = req.body;
    const { data, error } = await supabase.from('timesheets')
        .insert([{ project_id: projectId, task_id: taskId, date, hours, remarks, employee_id: req.user.empId || req.user.id }])
        .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

app.patch('/api/timesheets/:id', authenticateUser, requirePermission('approve_timesheets'), async (req, res) => {
    const { status, remarks } = req.body;
    const { data, error } = await supabase.from('timesheets')
        .update({ status, remarks, approved_by: req.user.empId || req.user.id, approved_at: new Date() })
        .eq('id', req.params.id).select();

    if (error) return res.status(500).json({ error: error.message });

    await createNotification({ empId: data[0].employee_id, title: 'Timesheet Updated', message: `Timesheet status: ${status}`, type: 'timesheet' });
    await logAudit({ empId: req.user.empId || req.user.id, module: 'Timesheets', action: 'Status Update', recordId: req.params.id, newValue: { status } });
    
    res.json(data[0]);
});

// ==========================================
// 8. NOTIFICATIONS & ACTIVITIES
// ==========================================
app.get('/api/notifications', authenticateUser, async (req, res) => {
    const { data, error } = await supabase.from('notifications').select('*').eq('emp_id', req.user.empId || req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.patch('/api/notifications/:id/read', authenticateUser, async (req, res) => {
    const { data, error } = await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('emp_id', req.user.empId || req.user.id).select();
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
    if (req.user.role.toLowerCase() === 'manager') query = query.eq('manager_id', req.user.empId || req.user.id);
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/audit-logs', authenticateUser, requirePermission('view_audit_logs'), async (req, res) => {
    const { module, empId, dateRange } = req.query;
    
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
        const { count: totalEmployees } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        const { count: activeProjects } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        const todayStr = new Date().toISOString().split('T')[0];
        const { data: activeLogs } = await supabase
            .from('audit_logs')
            .select('emp_id')
            .gte('created_at', todayStr);

        const uniqueActiveUsers = activeLogs ? new Set(activeLogs.map(l => l.emp_id)).size : 0;
        const finalActiveToday = uniqueActiveUsers > 0 ? uniqueActiveUsers : 1;

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
// 10. EMPLOYEE API ENDPOINTS
// ==========================================

// Get logged-in employee profile
// Get logged-in employee profile joined with designation/department details if applicable
app.get('/api/employee/profile', authenticateUser, async (req, res) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*, designations(name)')
        .eq('auth_id', req.user.id)
        .single();
        
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Update employee password securely via Supabase Auth
app.put('/api/employee/profile/update-password', authenticateUser, async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const { error } = await supabase.auth.admin.updateUserById(req.user.id, { password });
    if (error) {
        // Fallback to standard user update if admin method isn't configured
        const { error: userError } = await supabase.auth.updateUser({ password });
        if (userError) return res.status(400).json({ error: userError.message });
    }
    
    res.json({ success: true, message: 'Password updated successfully' });
});
// Get employee tasks (Single clean definition)
// Get employee tasks (Fixed with robust custom EMP-ID resolution)
app.get('/api/employee/tasks', authenticateUser, async (req, res) => {
    try {
        // 1. Resolve the user's custom employee ID from profiles using their auth UUID
        const { data: profile } = await supabase
            .from('profiles')
            .select('emp_id')
            .eq('auth_id', req.user.id)
            .single();

        const empId = profile?.emp_id || req.user.empId || req.user.id;

        // 2. Query tasks checking both custom emp_id and auth UUID to ensure a match
        const { data, error } = await supabase
            .from('tasks')
            .select('*, projects(name, id), assigned_by_profile:profiles!tasks_assigned_by_fkey(name)')
            .or(`assigned_to.eq.${empId},assigned_to.eq.${req.user.id}`);
        
        if (error) throw error;
        
        // 3. Map fields consistently for the dashboard and other views
        const mapped = (data || []).map(t => ({
            ...t,
            task_name: t.title,
            project_name: t.projects?.name,
            project_id: t.project_id || t.projects?.id,
            assigned_by: t.assigned_by_profile?.name || 'Manager'
        }));
        
        res.json(mapped);
    } catch (err) {
        console.error("Error fetching employee tasks:", err.message);
        res.status(500).json({ error: err.message });
    }
});
app.put('/api/employee/tasks/:id', authenticateUser, async (req, res) => {
    const taskId = req.params.id;
    const updates = req.body; // e.g., status, description, title
    
    try {
        const { data: profile } = await supabase.from('profiles').select('emp_id').eq('auth_id', req.user.id).single();
        const empId = profile?.emp_id || req.user.empId || req.user.id;

        // Fetch original task for comparison
        const { data: oldTask } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (!oldTask) return res.status(404).json({ error: 'Task not found' });

        // Perform update
        const { data: updatedTask, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', taskId)
            .select()
            .single();

        if (error) throw error;

        // Log the change in audit_logs
        await supabase.from('audit_logs').insert([{
            emp_id: empId,
            module: 'Tasks',
            action: `updated task "${oldTask.title}"`,
            record_id: taskId,
            previous_value: oldTask,
            new_value: updatedTask
        }]);

        res.json({ success: true, task: updatedTask });
    } catch (err) {
        console.error("Task update error:", err.message);
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/projects/:projectId/activity', authenticateUser, async (req, res) => {
    const projectId = req.params.projectId;

    try {
        const { data: profile } = await supabase.from('profiles').select('emp_id').eq('auth_id', req.user.id).single();
        const empId = profile?.emp_id || req.user.empId || req.user.id;

        // 1. Verify project membership for security
        const { data: membership } = await supabase
            .from('project_members')
            .select('*')
            .eq('project_id', projectId)
            .eq('emp_id', empId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'Unauthorized access to project activity' });
        }

        // 2. Fetch all task IDs belonging to this project
        const { data: projectTasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('project_id', projectId);

        const taskIds = (projectTasks || []).map(t => t.id);
        if (taskIds.length === 0) return res.json([]);

        // 3. Fetch audit logs matching these tasks, including the profile name of who made the change
        const { data: logs, error } = await supabase
            .from('audit_logs')
            .select('id, module, action, created_at, profiles(name)')
            .in('record_id', taskIds)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = (logs || []).map(item => ({
            icon: item.module === 'Tasks' ? '📌' : '⚡',
            description: `${item.profiles?.name || 'A team member'} ${item.action}`,
            time_ago: new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Error fetching project activity:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get current active tasks
// Get current active tasks (Robust lookup for both Dashboard and Assigned Tasks)
app.get('/api/employee/tasks/current', authenticateUser, async (req, res) => {
    try {
        // 1. Try to fetch the employee's custom 'emp_id' using their auth UUID
        const { data: profile } = await supabase
            .from('profiles')
            .select('emp_id')
            .eq('auth_id', req.user.id)
            .single();

        const empId = profile?.emp_id || req.user.empId || req.user.id; 

        // 2. Query tasks checking both custom emp_id and auth id to guarantee a match
        const { data, error } = await supabase
            .from('tasks')
            .select('*, projects(name, id)')
            .or(`assigned_to.eq.${empId},assigned_to.eq.${req.user.id}`);
        
        if (error) throw error;
        
        // 3. Map fields precisely to what your dashboard and task templates expect
        const mappedTasks = (data || []).map(t => ({
            ...t,
            task_name: t.title,
            project_name: t.projects?.name,
            project_id: t.project_id || t.projects?.id,
            description: t.description
        }));

        res.json(mappedTasks);
    } catch (error) {
        console.error("Error fetching tasks for dashboard/assigned tasks:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Log work hours (Timesheets submission & hours reduction)
app.post('/api/employee/tasks/log', authenticateUser, async (req, res) => {
    const { task_id, project_id, hours, remarks } = req.body;

    try {
        const empId = req.user.empId || req.user.id;

        const { error: tsError } = await supabase
            .from('timesheets')
            .insert([{
                task_id, 
                project_id, 
                employee_id: empId, 
                date: new Date().toISOString().split('T')[0],
                hours, 
                remarks, 
                status: 'Pending'
            }]);
        
        if (tsError) throw tsError;

        const { data: task } = await supabase.from('tasks').select('estimated_hours').eq('id', task_id).single();
        
        if (task && task.estimated_hours !== null) {
            const newHours = Math.max(0, parseFloat(task.estimated_hours) - parseFloat(hours));
            await supabase.from('tasks').update({ estimated_hours: newHours }).eq('id', task_id);
        }

        res.json({ success: true });
        // After successful timesheet insert
await logAudit(empId, 'Tasks', `Logged ${hours} hrs: ${remarks || 'Work completed'}`, task_id);
    } catch (error) {
        console.error("Timesheet error:", error);
        res.status(400).json({ error: error.message });
    }
});

// File upload endpoint for tasks
app.post('/api/employee/tasks/upload', authenticateUser, upload.single('file'), async (req, res) => {
    const file = req.file;
    const { task_id } = req.body;

    if (!file) return res.status(400).json({ error: 'No file provided' });

    try {
        const empId = req.user.empId || req.user.id;
        const fileName = `${task_id}/${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
        
        const { error: uploadError } = await supabase
            .storage
            .from('task-files')
            .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('task-files').getPublicUrl(fileName);
        const fileUrl = publicUrlData.publicUrl;

        const { error: dbError } = await supabase
            .from('task_attachments')
            .insert([{
                task_id,
                emp_id: empId,
                file_url: fileUrl
            }]);

        if (dbError) throw dbError;

        res.json({ success: true, file_url: fileUrl });
        // After successful file upload insert
await logAudit(empId, 'Tasks', `Uploaded attachment: ${file.originalname}`, task_id);
    } catch (error) {
        console.error("Upload error:", error);
        res.status(400).json({ error: error.message });
    }
});

// Get employee projects
app.get('/api/employee/projects', authenticateUser, async (req, res) => {
    const empId = req.user.empId || req.user.id;
    const { data, error } = await supabase
        .from('project_members')
        .select('projects(*)')
        .eq('emp_id', empId);
        
    if (error) return res.status(400).json({ error: error.message });
    res.json((data || []).map(item => item.projects));
});

// Get specific project details
app.get('/api/employee/projects/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
        
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Get employee notifications
app.get('/api/employee/notifications', authenticateUser, async (req, res) => {
    const empId = req.user.empId || req.user.id;
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('emp_id', empId)
        .order('created_at', { ascending: false });
        
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Mark all notifications as read
app.post('/api/employee/notifications/mark-all-read', authenticateUser, async (req, res) => {
    const empId = req.user.empId || req.user.id;
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('emp_id', empId);
        
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// Employee activity log
app.get('/api/employee/activity', authenticateUser, async (req, res) => {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('emp_id')
            .eq('auth_id', req.user.id)
            .single();

        const empId = profile?.emp_id || req.user.empId || req.user.id;

        const { data, error } = await supabase
            .from('audit_logs')
            .select('action, module, created_at')
            .eq('emp_id', empId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        const formatted = (data || []).map(item => ({
            icon: item.module === 'Tasks' ? '📌' : '⚡',
            description: item.action,
            time_ago: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Error fetching activity timeline:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});