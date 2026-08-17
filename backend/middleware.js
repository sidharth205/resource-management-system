const { supabase } = require('./helpers');

async function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
        console.error("AUTH ERROR:", authError?.message);
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, emp_id')
        .eq('auth_id', user.id)
        .single();

    if (profileError || !profile) {
        console.error("PROFILE LOOKUP FAILED for auth_id:", user.id, profileError?.message);
        return res.status(401).json({ error: 'User profile not found in database' });
    }

    req.user = { 
        id: profile.emp_id, 
        authId: user.id, 
        role: profile.role 
    };
    console.log("Authenticated User:", req.user.id, "Role:", req.user.role);
    next();
}

function requirePermission(requiredPermission) {
    return async (req, res, next) => {
        // ABSOLUTE BYPASS FOR ADMIN
        if (req.user.role && req.user.role.toLowerCase() === 'admin') {
            return next();
        }

        try {
            const { data: roleData, error } = await supabase
                .from('custom_roles')
                .select('permissions')
                .ilike('name', req.user.role)
                .single();

            if (error || !roleData) {
                console.error("ROLE PERMISSION LOOKUP FAILED for role:", req.user.role);
                return res.status(403).json({ error: 'Role permissions not found in system' });
            }

            const userPermissions = roleData.permissions || [];
            if (userPermissions.includes('all') || userPermissions.includes(requiredPermission)) {
                return next();
            }

            return res.status(403).json({ error: `User not allowed: Lacks '${requiredPermission}'` });
        } catch (err) {
            console.error("PERMISSION CHECK CRASH:", err);
            return res.status(500).json({ error: 'Internal server error checking permissions' });
        }
    };
}

module.exports = { authenticateUser, requirePermission };