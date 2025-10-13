// Minimal Client-Side Router with Template Rendering
// Framework-style routing with full page replacements

(function (window) {
    'use strict';

    // Router state
    const routes = [];
    let currentRoute = null;
    let currentState = null;

    // Router API
    const Router = {
        // Register a route
        addRoute(path, handlers = {}) {
            routes.push({
                path: path,
                pattern: pathToRegex(path),
                template: handlers.template || null,
                onEnter: handlers.onEnter || (() => {}),
                onLeave: handlers.onLeave || (() => {}),
            });
        },

        // Navigate to a path with optional state
        navigate(path, options = {}) {
            const { replace = false, state = null } = options;

            if (replace) {
                window.history.replaceState({ path, state }, '', path);
            } else {
                window.history.pushState({ path, state }, '', path);
            }

            this.handleRoute(path, state);
        },

        // Go back
        back() {
            window.history.back();
        },

        // Go forward
        forward() {
            window.history.forward();
        },

        // Get current route info
        getCurrentRoute() {
            return currentRoute;
        },

        // Get current state
        getCurrentState() {
            return currentState;
        },

        // Handle route change
        async handleRoute(path, state = null) {
            // Find matching route
            const matchedRoute = routes.find((route) => route.pattern.test(path));

            if (!matchedRoute) {
                console.warn(`[Router] No route found for: ${path}`);
                // Fallback to home
                this.navigate('/', { replace: true });
                return;
            }

            // Call onLeave for current route
            if (currentRoute && currentRoute.onLeave) {
                try {
                    currentRoute.onLeave();
                } catch (error) {
                    console.error('[Router] Error in onLeave:', error);
                }
            }

            // Render template if specified
            if (matchedRoute.template) {
                await this.renderTemplate(matchedRoute.template);
            }

            // Update current route and state
            currentRoute = matchedRoute;
            currentState = state;

            // Extract params from path (future: support for /user/:id)
            const params = {};

            // Call onEnter for new route
            try {
                matchedRoute.onEnter(params, state);
            } catch (error) {
                console.error('[Router] Error in onEnter:', error);
            }

            console.log(`[Router] Navigated to: ${path}`, state ? { state } : '');
        },

        // Render template into #app
        async renderTemplate(templateSource) {
            const app = document.getElementById('app');

            if (!app) {
                console.error('[Router] #app container not found');
                return;
            }

            // Check if it's a selector (starts with #) or a file path
            if (templateSource.startsWith('#')) {
                // Inline template (existing behavior)
                const template = document.querySelector(templateSource);

                if (!template) {
                    console.error(`[Router] Template not found: ${templateSource}`);
                    return;
                }

                // Clone template content
                const content = template.content.cloneNode(true);

                // Clear app and insert new content
                app.innerHTML = '';
                app.appendChild(content);

                console.log(`[Router] Rendered template: ${templateSource}`);
            } else {
                // External HTML file - fetch and inject
                try {
                    const response = await fetch(templateSource);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const html = await response.text();

                    // Clear app and insert new content
                    app.innerHTML = html;

                    console.log(`[Router] Loaded and rendered template: ${templateSource}`);
                } catch (error) {
                    console.error(`[Router] Failed to load template: ${templateSource}`, error);
                    app.innerHTML = '<div style="padding: 20px; color: red;">Failed to load page</div>';
                }
            }
        },

        // Initialize router
        init() {
            // Handle browser back/forward
            window.addEventListener('popstate', (e) => {
                const path = e.state?.path || window.location.pathname;
                const state = e.state?.state || null;
                this.handleRoute(path, state);
            });

            // Hijack internal links
            document.addEventListener('click', (e) => {
                // Check if click is on a link or inside a link
                const link = e.target.closest('a');

                if (!link) return;

                const href = link.getAttribute('href');

                // Only handle internal links (starts with /)
                if (!href || !href.startsWith('/')) return;

                // Ignore if has target="_blank" or download attribute
                if (link.hasAttribute('target') || link.hasAttribute('download')) return;

                // Prevent default and use router
                e.preventDefault();
                this.navigate(href);
            });

            // Handle initial route
            const initialPath = window.location.pathname;
            const initialState = window.history.state?.state || null;
            this.handleRoute(initialPath, initialState);

            console.log('[Router] Initialized');
        },
    };

    // Convert path to regex pattern
    function pathToRegex(path) {
        // Exact match for now (can extend with params later)
        const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^${escapedPath}$`);
    }

    // Expose Router globally
    window.Router = Router;

    console.log('[Router] Loaded');
})(window);
