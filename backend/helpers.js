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
async function logAudit({ empId, module, action, recordId, newValue, previousValue = null }) {
    try {
        await supabase.from('audit_logs').insert([{
            emp_id: empId, 
            module,
            action,
            record_id: recordId,
            previous_value: previousValue,
            new_value: newValue
        }]);
    } catch (err) {
        console.error("Failed to log audit:", err);
    }
}

module.exports = { supabase, createNotification, logAudit };