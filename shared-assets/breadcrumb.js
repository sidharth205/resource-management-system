document.addEventListener('DOMContentLoaded', () => {
    // 1. Create the breadcrumb container
    const nav = document.createElement('nav');
    nav.className = 'breadcrumb-nav';
    nav.style.marginBottom = '20px';
    nav.style.fontSize = '0.9rem';
    nav.style.color = 'var(--text-muted, #567C8D)';

    // 2. Define your site structure
    const pathMap = {
        'dashboard': 'Dashboard',
        'user-management': 'User Management',
        'profile': 'Profile',
        'audit-monitoring': 'Audit',
        'system-configuration': 'Settings',
        'reports': 'Reports'
    };

    // 3. Generate breadcrumbs from URL
    const pathParts = window.location.pathname.split('/').filter(p => p && p !== 'index.html');
    let breadcrumbHTML = `<a href="../dashboard/index.html" style="color: var(--teal, #567C8D); text-decoration: none; font-weight: 600;">RMS</a>`;
    
    let currentPath = '';
    pathParts.forEach((part, index) => {
        if (part === 'admin') return; // Skip base folder
        
        currentPath += `../${part}/index.html`;
        const label = pathMap[part] || part.replace('-', ' ');
        
        breadcrumbHTML += ` <span style="margin: 0 5px; color: var(--text-muted, #567C8D);">></span> `;
        if (index === pathParts.length - 1) {
            breadcrumbHTML += `<strong style="color: var(--navy, #2F4156); text-transform: uppercase;">${label}</strong>`;
        } else {
            breadcrumbHTML += `<a href="${currentPath}" style="color: var(--teal, #567C8D); text-decoration: none; font-weight: 500;">${label}</a>`;
        }
    });

    nav.innerHTML = breadcrumbHTML;
    
    // 4. Inject before the top header
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.prepend(nav);
});