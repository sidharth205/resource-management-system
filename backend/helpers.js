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

// Log audit using the new emp_id column
async function logAudit(empId, module, action, recordId = null) {
    try {
        await supabase.from('audit_logs').insert([{
            emp_id: empId,
            module: module,
            action: action,
            record_id: recordId
        }]);
    } catch (err) {
        console.error("Audit log failed:", err);
    }
}

module.exports = {
    supabase,
    createNotification,
    logAudit
};