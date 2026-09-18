(function () {
    function redirectToLanding() {
        window.location.replace('../../Landing.html');
    }

    function enforceSession() {
        if (!localStorage.getItem('access_token')) redirectToLanding();
    }

    window.addEventListener('pageshow', enforceSession);
    window.addEventListener('popstate', enforceSession);
    document.addEventListener('click', function (event) {
        const logoutButton = event.target.closest('#logoutBtn');
        if (!logoutButton) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        const token = localStorage.getItem('access_token');
        fetch('http://localhost:3000/api/auth/logout', {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }).catch(() => {}).finally(() => {
            localStorage.clear();
            redirectToLanding();
        });
    }, true);
    enforceSession();
})();
