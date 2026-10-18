(function () {
    const root = document.documentElement;
    root.classList.add('admin-data-loading');

    const loaderArtwork = `
        <svg class="admin-loader-artwork" viewBox="0 0 300 300" aria-hidden="true" focusable="false">
            <g class="admin-loader-orbiting-icons">
                <g class="admin-loader-icon admin-loader-icon--users" transform="translate(150 45)">
                    <circle class="admin-loader-icon-disc" r="14"></circle>
                    <g class="admin-loader-symbol">
                        <circle class="admin-loader-icon-line" cx="-3" cy="-4" r="3"></circle>
                        <path class="admin-loader-icon-line" d="M-9 7a6 6 0 0 1 12 0m1-11a3 3 0 0 1 0 6m1 2a5 5 0 0 1 4 4"></path>
                    </g>
                </g>
                <g class="admin-loader-icon admin-loader-icon--settings" transform="translate(224 76)">
                    <circle class="admin-loader-icon-disc" r="14"></circle>
                    <g class="admin-loader-symbol">
                        <path class="admin-loader-icon-line" d="M0-9v3m0 12v3m-9-9h3m12 0h3m-17-6 2 2m10 10 2 2m0-14-2 2m-10 10-2 2"></path>
                        <circle class="admin-loader-icon-line" r="4"></circle>
                    </g>
                </g>
                <g class="admin-loader-icon admin-loader-icon--audit" transform="translate(255 150)">
                    <circle class="admin-loader-icon-disc" r="14"></circle>
                    <g class="admin-loader-symbol">
                        <path class="admin-loader-icon-line" d="M-7-8h10a2 2 0 0 1 2 2v14H-5a2 2 0 0 1-2-2zm4 4h6m-6 4h6m-6 4h4"></path>
                    </g>
                </g>
                <g class="admin-loader-icon admin-loader-icon--reports" transform="translate(224 224)">
                    <circle class="admin-loader-icon-disc" r="14"></circle>
                    <g class="admin-loader-symbol">
                        <path class="admin-loader-icon-line" d="M-8 7h16m-12-2v-5m5 5v-11m5 11v-8"></path>
                    </g>
                </g>
                <g class="admin-loader-icon admin-loader-icon--dashboard" transform="translate(150 255)">
                    <circle class="admin-loader-icon-disc" r="14"></circle>
                    <g class="admin-loader-symbol">
                        <rect class="admin-loader-icon-line" x="-8" y="-8" width="6" height="6" rx="1"></rect>
                        <rect class="admin-loader-icon-line" x="2" y="-8" width="6" height="6" rx="1"></rect>
                        <rect class="admin-loader-icon-line" x="-8" y="2" width="6" height="6" rx="1"></rect>
                        <rect class="admin-loader-icon-line" x="2" y="2" width="6" height="6" rx="1"></rect>
                    </g>
                </g>
                <g class="admin-loader-icon admin-loader-icon--notifications" transform="translate(76 224)">
                    <circle class="admin-loader-icon-disc" r="14"></circle>
                    <g class="admin-loader-symbol">
                        <path class="admin-loader-icon-line" d="M-8 5c2-2 2-4 2-8a6 6 0 0 1 12 0c0 4 0 6 2 8zm5 3a3 3 0 0 0 6 0"></path>
                    </g>
                </g>
                <g class="admin-loader-icon admin-loader-icon--roles" transform="translate(45 150)">
                    <circle class="admin-loader-icon-disc" r="14"></circle>
                    <g class="admin-loader-symbol">
                        <path class="admin-loader-icon-line" d="m0-9 8 3v6c0 5-4 8-8 10-4-2-8-5-8-10v-6z"></path>
                        <path class="admin-loader-icon-line" d="m-4 0 3 3 5-6"></path>
                    </g>
                </g>
                <g class="admin-loader-icon admin-loader-icon--projects" transform="translate(76 76)">
                    <circle class="admin-loader-icon-disc" r="14"></circle>
                    <g class="admin-loader-symbol">
                        <path class="admin-loader-icon-line" d="M-9-5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2z"></path>
                    </g>
                </g>
            </g>
        </svg>`;

    document.addEventListener('DOMContentLoaded', () => {
        const loaderScreen = document.querySelector('.admin-loading-screen');
        const visual = loaderScreen?.querySelector('.admin-loader-visual');

        if (visual) visual.innerHTML = loaderArtwork;
    }, { once: true });

    const fetch = window.fetch.bind(window);
    let pendingRequests = 0;
    let domReady = false;
    let idleTimer;

    function scheduleReveal() {
        if (!domReady || pendingRequests > 0) return;

        window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(() => {
            if (pendingRequests === 0) {
                root.classList.remove('admin-data-loading');
            }
        }, 400);
    }

    window.fetch = function (...args) {
        pendingRequests += 1;
        window.clearTimeout(idleTimer);

        return fetch(...args).finally(() => {
            pendingRequests -= 1;
            scheduleReveal();
        });
    };

    document.addEventListener('DOMContentLoaded', () => {
        domReady = true;
        scheduleReveal();
    }, { once: true });
})();
