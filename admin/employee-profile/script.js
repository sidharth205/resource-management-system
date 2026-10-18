document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    const empId = new URLSearchParams(window.location.search).get('id');
    const accessKey = 'adminEmployeeProfileId';
    let allowedEmployeeId = '';

    try {
        allowedEmployeeId = sessionStorage.getItem(accessKey) || '';
        sessionStorage.removeItem(accessKey);
    } catch (error) {
        console.error('Unable to verify employee profile navigation:', error);
    }

    if (!token || role !== 'admin') {
        window.location.replace('../login/index.html');
        return;
    }

    if (!empId || allowedEmployeeId !== empId) {
        window.location.replace('../user-management/index.html');
        return;
    }

    const adminName = localStorage.getItem('user_name') || 'Admin';
    document.getElementById('userName').textContent = adminName;
    document.getElementById('headerName').textContent = adminName;

    try {
        const response = await fetch(`http://localhost:3000/api/users/${encodeURIComponent(empId)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const employee = await response.json();
        if (!response.ok) throw new Error(employee.error || 'Failed to load employee profile');

        const fullName = employee.name || 'Unnamed employee';
        document.title = `RMS | ${fullName} Profile`;
        document.getElementById('employeeProfileHeading').textContent = `${fullName} Profile`;
        document.getElementById('bannerName').textContent = fullName;
        document.getElementById('bannerEmail').textContent = employee.email || 'Email not provided';
        document.getElementById('bannerPhone').textContent = employee.phone || 'Phone not provided';
        document.getElementById('bannerJoiningDate').textContent = employee.joining_date || 'N/A';
        document.getElementById('bannerStatus').textContent = employee.active === true ? 'Logged in' : 'Logged out';

        document.getElementById('metaEmpId').textContent = employee.emp_id || '--';
        document.getElementById('metaDepartment').textContent = employee.department || 'N/A';
        document.getElementById('metaReporting').textContent = employee.manager_id || 'N/A';
        document.getElementById('metaRole').textContent = employee.role || 'Unassigned';

        document.getElementById('detFullName').textContent = fullName;
        document.getElementById('detEmail').textContent = employee.email || 'N/A';
        document.getElementById('detPhone').textContent = employee.phone || 'N/A';
        document.getElementById('detDepartment').textContent = employee.department || 'N/A';
        document.getElementById('detRole').textContent = employee.role || 'Unassigned';
        document.getElementById('detEmploymentType').textContent = employee.employment_type || 'N/A';
        document.getElementById('detAccountStatus').textContent = employee.status || 'N/A';
    } catch (error) {
        console.error('Error loading employee profile:', error);
        document.getElementById('employeeProfileHeading').textContent = 'Employee Profile';
        document.getElementById('bannerName').textContent = 'Unable to load employee profile';
    }
});
