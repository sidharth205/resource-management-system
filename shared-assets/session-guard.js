(function () {
    const cachePrefix = 'rms-api-cache-v1:';
    const cacheLifetimeMs = 20 * 60 * 1000;
    const maxEntryChars = 450 * 1024;
    const maxCacheChars = 2 * 1024 * 1024;
    const apiOrigin = 'http://localhost:3000';
    const cacheableApiPaths = new Set(['/api/designations']);
    const originalFetch = window.fetch.bind(window);
    let refreshesInFlight = 0;
    let refreshedDataChanged = false;
    let refreshTimer;
    let mutationGeneration = 0;
    let hasUnsavedFormChanges = false;

    document.addEventListener('input', event => {
        if (event.target && event.target.closest && event.target.closest('form')) hasUnsavedFormChanges = true;
    });
    document.addEventListener('change', event => {
        if (event.target && event.target.closest && event.target.closest('form')) hasUnsavedFormChanges = true;
    });

    function cacheWarning(message, error) {
        console.warn(message, error);
    }

    function clearApiCache() {
        try {
            for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
                const key = sessionStorage.key(index);
                if (key && key.startsWith(cachePrefix)) sessionStorage.removeItem(key);
            }
        } catch (error) {
            cacheWarning('Could not clear the session API cache.', error);
        }
    }

    function purgeDisallowedCachedItems() {
        try {
            for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
                const key = sessionStorage.key(index);
                if (!key || !key.startsWith(cachePrefix) || key.includes(':reload:')) continue;
                const tokenSeparator = key.indexOf(':', cachePrefix.length);
                const path = tokenSeparator === -1 ? '' : key.slice(tokenSeparator + 1).split('?')[0];
                if (!cacheableApiPaths.has(path)) sessionStorage.removeItem(key);
            }
        } catch (error) {
            cacheWarning('Could not purge cached API responses that are no longer approved.', error);
        }
    }

    purgeDisallowedCachedItems();

    function readCachedItem(key) {
        try {
            const value = sessionStorage.getItem(key);
            if (!value) return null;
            const entry = JSON.parse(value);
            if (!entry || typeof entry.body !== 'string' || entry.expiresAt <= Date.now()) {
                sessionStorage.removeItem(key);
                return null;
            }
            return entry;
        } catch (error) {
            cacheWarning('Could not read the session API cache; using the live response.', error);
            try {
                sessionStorage.removeItem(key);
            } catch (removeError) {
                cacheWarning('Could not remove an invalid API cache entry.', removeError);
            }
            return null;
        }
    }

    function pruneApiCache() {
        try {
            const entries = [];
            let totalChars = 0;
            for (let index = 0; index < sessionStorage.length; index += 1) {
                const key = sessionStorage.key(index);
                if (!key || !key.startsWith(cachePrefix) || key.includes(':reload:')) continue;
                const value = sessionStorage.getItem(key);
                if (value === null) continue;
                totalChars += key.length + value.length;
                const entry = JSON.parse(value);
                entries.push({ key, value, savedAt: entry.savedAt || 0 });
            }

            entries.sort((left, right) => left.savedAt - right.savedAt);
            while (totalChars > maxCacheChars && entries.length) {
                const oldest = entries.shift();
                sessionStorage.removeItem(oldest.key);
                totalChars -= oldest.key.length + oldest.value.length;
            }
        } catch (error) {
            cacheWarning('Could not prune the session API cache.', error);
        }
    }

    function writeCachedItem(key, body, headers, status, statusText, generation) {
        if (generation !== mutationGeneration || body.length > maxEntryChars) return;
        const entry = {
            body,
            headers,
            status,
            statusText,
            savedAt: Date.now(),
            expiresAt: Date.now() + cacheLifetimeMs
        };
        try {
            sessionStorage.setItem(key, JSON.stringify(entry));
            pruneApiCache();
        } catch (error) {
            cacheWarning('Could not save an API response to the session cache.', error);
        }
    }

    async function fingerprintToken(token) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Secure token hashing is unavailable in this browser.');
        }
        const hash = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
        return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
    }

    function isJsonResponse(response) {
        return (response.headers.get('content-type') || '').toLowerCase().includes('application/json');
    }

    async function saveResponse(key, response, generation) {
        if (!response.ok || response.status === 204 || !isJsonResponse(response)) return;
        const body = await response.text();
        writeCachedItem(key, body, { 'Content-Type': response.headers.get('content-type') || 'application/json' },
            response.status, response.statusText, generation);
    }

    function responseFromCache(entry) {
        return new Response(entry.body, {
            status: entry.status || 200,
            statusText: entry.statusText || 'OK',
            headers: entry.headers
        });
    }

    function normalizeJson(body) {
        try {
            return JSON.stringify(JSON.parse(body));
        } catch {
            return body;
        }
    }

    function schedulePageRefresh(pageUrl, tokenFingerprint) {
        if (!refreshedDataChanged || refreshesInFlight || hasUnsavedFormChanges || window.location.href !== pageUrl) return;
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => {
            if (window.location.href !== pageUrl || refreshesInFlight || hasUnsavedFormChanges || !refreshedDataChanged) return;
            const reloadKey = `${cachePrefix}reload:${tokenFingerprint}:${window.location.pathname}`;
            let lastReload = 0;
            try {
                lastReload = Number(sessionStorage.getItem(reloadKey)) || 0;
            } catch (error) {
                cacheWarning('Could not check the session refresh marker.', error);
            }
            if (Date.now() - lastReload < 8000) return;
            try {
                sessionStorage.setItem(reloadKey, String(Date.now()));
            } catch (error) {
                cacheWarning('Could not save the session refresh marker.', error);
            }
            window.location.reload();
        }, 200);
    }

    function revalidateCachedResponse(input, init, cacheKey, cachedBody, pageUrl, tokenFingerprint) {
        const generation = mutationGeneration;
        refreshesInFlight += 1;
        window.clearTimeout(refreshTimer);
        const refreshOptions = Object.assign({}, init, { cacheRevalidation: true });

        originalFetch(input, refreshOptions)
            .then(async response => {
                if (response.status === 401) {
                    mutationGeneration += 1;
                    clearApiCache();
                    localStorage.removeItem('access_token');
                    window.location.replace(new URL('../../Landing.html', window.location.href).href);
                    return;
                }
                if (response.status === 403) {
                    mutationGeneration += 1;
                    refreshedDataChanged = true;
                    clearApiCache();
                    return;
                }
                if (!response.ok || !isJsonResponse(response)) return;
                const latestBody = await response.clone().text();
                if (generation !== mutationGeneration) return;
                writeCachedItem(cacheKey, latestBody, {
                    'Content-Type': response.headers.get('content-type') || 'application/json'
                }, response.status, response.statusText, generation);
                if (normalizeJson(latestBody) !== normalizeJson(cachedBody)) refreshedDataChanged = true;
            })
            .catch(error => {
                cacheWarning('Background API refresh failed; keeping the cached page data.', error);
            })
            .finally(() => {
                refreshesInFlight -= 1;
                schedulePageRefresh(pageUrl, tokenFingerprint);
            });
    }

    async function cachedApiFetch(input, init) {
        const options = init || {};
        if (options.cacheRevalidation) {
            const cleanOptions = Object.assign({}, options);
            delete cleanOptions.cacheRevalidation;
            return originalFetch(input, cleanOptions);
        }

        const request = input instanceof Request ? input : null;
        const requestUrl = request ? request.url : String(input);
        const method = String(options.method || (request && request.method) || 'GET').toUpperCase();
        if (!requestUrl.startsWith(`${apiOrigin}/api/`)) return originalFetch(input, init);
        const url = new URL(requestUrl, window.location.href);

        if (method !== 'GET') {
            const response = await originalFetch(input, init);
            if (response.ok) {
                mutationGeneration += 1;
                refreshedDataChanged = false;
                clearApiCache();
            }
            return response;
        }

        if (!cacheableApiPaths.has(url.pathname)) return originalFetch(input, init);

        const headers = new Headers(options.headers || (request && request.headers));
        const authorization = headers.get('Authorization') || '';
        const token = authorization.startsWith('Bearer ')
            ? authorization.slice(7)
            : localStorage.getItem('access_token');
        if (!token || /\/api\/auth\/(?:login|me|logout)(?:\?|$)/i.test(requestUrl)) {
            return originalFetch(input, init);
        }

        let tokenFingerprint;
        try {
            tokenFingerprint = await fingerprintToken(token);
        } catch (error) {
            cacheWarning('API response caching is unavailable; using the live response.', error);
            return originalFetch(input, init);
        }

        const cacheKey = `${cachePrefix}${tokenFingerprint}:${url.pathname}${url.search}`;
        const cachedEntry = readCachedItem(cacheKey);
        if (cachedEntry) {
            const pageUrl = window.location.href;
            revalidateCachedResponse(input, init, cacheKey, cachedEntry.body, pageUrl, tokenFingerprint);
            return responseFromCache(cachedEntry);
        }

        const generation = mutationGeneration;
        const response = await originalFetch(input, init);
        saveResponse(cacheKey, response.clone(), generation).catch(error => {
            cacheWarning('Could not cache the live API response.', error);
        });
        return response;
    }

    window.fetch = cachedApiFetch;

    window.getFirstName = function (name) {
        return String(name || '').trim().split(/\s+/)[0] || 'User';
    };

    const storedName = localStorage.getItem('user_name');
    if (storedName) localStorage.setItem('user_name', window.getFirstName(storedName));

    function redirectToLanding() {
        window.location.replace('../../Landing.html');
    }

    function setupSidebarToggle() {
        const appContainer = document.querySelector('.app-container');
        const sidebar = appContainer && appContainer.querySelector('.sidebar');
        if (!appContainer || !sidebar) return;

        const iconPaths = [
            { match: /dashboard/i, path: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z' },
            { match: /project/i, path: 'M3 7.5A1.5 1.5 0 0 1 4.5 6H10l2 2h7.5A1.5 1.5 0 0 1 21 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-11z' },
            { match: /task/i, path: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01' },
            { match: /timesheet/i, path: 'M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1zm3 8h3v3H8z' },
            { match: /employee|user management/i, path: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm6-7.5a4 4 0 0 1 0 7.8M20 21v-2a4 4 0 0 0-3-3.87' },
            { match: /report/i, path: 'M4 19V5m0 14h16M7 15l4-4 3 2 5-6' },
            { match: /notification/i, path: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4' },
            { match: /profile/i, path: 'M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
            { match: /system configuration/i, path: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-5v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0-1.42-1.42M7.06 7.06 5.64 5.64' },
            { match: /audit|monitoring/i, path: 'M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3zm-3 9 2 2 4-4' }
        ];

        function createIcon(path) {
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('viewBox', '0 0 24 24');
            icon.setAttribute('aria-hidden', 'true');
            icon.classList.add('ui-icon', 'nav-item-icon');
            const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            shape.setAttribute('d', path);
            icon.appendChild(shape);
            return icon;
        }

        sidebar.querySelectorAll('.nav-menu .nav-item').forEach(link => {
            const label = link.textContent.trim();
            const iconDefinition = iconPaths.find(item => item.match.test(label));
            if (!label || !iconDefinition) return;

            link.setAttribute('aria-label', label);
            link.dataset.navLabel = label;

            const labelElement = document.createElement('span');
            labelElement.className = 'nav-label';
            Array.from(link.childNodes).forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    labelElement.appendChild(node);
                }
            });
            link.insertBefore(createIcon(iconDefinition.path), link.firstChild);
            link.insertBefore(labelElement, link.children[1] || null);
        });

        if (!sidebar.id) sidebar.id = 'primary-navigation';
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'sidebar-collapse-toggle';
        toggle.setAttribute('aria-controls', sidebar.id);
        toggle.setAttribute('aria-expanded', 'true');

        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('aria-hidden', 'true');
        icon.classList.add('sidebar-toggle-icon');
        const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        iconPath.setAttribute('d', 'M14 5l-7 7 7 7');
        iconPath.setAttribute('class', 'sidebar-toggle-chevron');
        icon.appendChild(iconPath);
        toggle.appendChild(icon);

        function updateTogglePosition() {
            toggle.style.left = `${sidebar.getBoundingClientRect().right - 14}px`;
        }

        function setCollapsed(collapsed) {
            appContainer.classList.toggle('nav-collapsed', collapsed);
            toggle.setAttribute('aria-expanded', String(!collapsed));
            toggle.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
            toggle.title = collapsed ? 'Expand navigation' : 'Collapse navigation';
            iconPath.setAttribute('d', collapsed ? 'M10 5l7 7-7 7' : 'M14 5l-7 7 7 7');
        }

        setCollapsed(localStorage.getItem('rms-nav-collapsed') === 'true');
        toggle.addEventListener('click', function () {
            const collapsed = !appContainer.classList.contains('nav-collapsed');
            setCollapsed(collapsed);
            localStorage.setItem('rms-nav-collapsed', String(collapsed));
        });
        if (window.ResizeObserver) {
            const sidebarObserver = new ResizeObserver(updateTogglePosition);
            sidebarObserver.observe(sidebar);
        }
        window.addEventListener('resize', updateTogglePosition);
        sidebar.addEventListener('transitionend', updateTogglePosition);
        const logoutButton = sidebar.querySelector('#logoutBtn');
        if (logoutButton) {
            logoutButton.title = 'Logout';
            logoutButton.setAttribute('aria-label', 'Logout');
        }
        document.body.appendChild(toggle);
        updateTogglePosition();
    }

    setupSidebarToggle();

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
