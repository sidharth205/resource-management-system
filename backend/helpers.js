const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Send notification using the new emp_id column
async function createNotification({ empId, title, message, type }) {
    try {
        await supabase.from('notifications').insert([{
            emp_id: empId,
            title,
            message,
            type
        }]);
    } catch (err) {
        console.error("Failed to create notification:", err);
    }
}

// Log audit using either the legacy positional or the object call shape.
async function logAudit(empId, module, action, recordId = null) {
    try {
        const entry = typeof empId === 'object'
            ? empId
            : { empId, module, action, recordId };
        const auditRecord = {
            emp_id: entry.empId,
            module: entry.module,
            action: entry.action,
            record_id: entry.recordId ?? null
        };
        if (entry.previousValue !== undefined) auditRecord.previous_value = entry.previousValue;
        if (entry.newValue !== undefined) auditRecord.new_value = entry.newValue;
        await supabase.from('audit_logs').insert([auditRecord]);
    } catch (err) {
        console.error("Audit log failed:", err);
    }
}

module.exports = {
    supabase,
    createNotification,
    logAudit
};