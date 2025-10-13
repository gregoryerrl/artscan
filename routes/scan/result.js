// Result Page Controller
// Displays scan results passed via router state

(function (window) {
    'use strict';

    // Initialize result page
    window.initResultPage = function (matchData) {
        console.log('[Result Page] Initializing with data:', matchData);

        if (!matchData) {
            console.error('[Result Page] No match data provided');
            // Navigate back to scanner
            Router.navigate('/scan', { replace: true });
            return;
        }

        // Render result content
        renderResult(matchData);

        // Attach event listeners
        attachEventListeners();
    };

    // Cleanup result page
    window.cleanupResultPage = function () {
        console.log('[Result Page] Cleaning up');
        // Nothing specific to clean up yet
    };

    // Render result content
    function renderResult(match) {
        const resultContent = document.getElementById('result-content');

        if (!resultContent) {
            console.error('[Result Page] result-content element not found');
            return;
        }

        // Handle inconclusive results
        if (match && match.inconclusive) {
            renderInconclusiveResult(resultContent, match);
            return;
        }

        // Handle successful match
        if (match && match.matches >= 20) {
            renderSuccessResult(resultContent, match);
            return;
        }

        // Handle no match
        renderNoMatchResult(resultContent, match);
    }

    // Render inconclusive result
    function renderInconclusiveResult(container, match) {
        const candidates = match.topCandidates || [];
        const reason =
            match.reason === 'tie'
                ? 'Results too close to determine'
                : 'Insufficient agreement across frames';

        let candidatesHTML = '';
        if (candidates.length >= 2) {
            candidatesHTML = `
                <div class="result-candidates">
                    <h4>Top candidates:</h4>
                    <ul>
                        ${candidates
                            .map(
                                (c) =>
                                    `<li>${c.name} (${c.voteCount}/${match.totalFrames} frames, avg ${c.avgMatches} matches)</li>`
                            )
                            .join('')}
                    </ul>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="result-inconclusive">
                <div class="result-icon">⚠️</div>
                <h2>Inconclusive Result</h2>
                <p class="result-reason">${reason}</p>

                <div class="result-tips">
                    <h4>Please try again:</h4>
                    <ul>
                        <li>Hold camera steady</li>
                        <li>Ensure good lighting</li>
                        <li>Center the portrait in frame</li>
                        <li>Avoid glare or shadows</li>
                    </ul>
                </div>

                ${candidatesHTML}
            </div>
        `;
    }

    // Render successful match result
    function renderSuccessResult(container, match) {
        const confidence = Math.min(95, Math.round((match.matches / 500) * 100 + 40));

        // Build stats HTML
        let statsHTML = `
            <div class="result-stat">
                <span class="stat-label">Confidence:</span>
                <span class="stat-value">${confidence}%</span>
            </div>
            <div class="result-stat">
                <span class="stat-label">Best Match:</span>
                <span class="stat-value">${match.matches} features</span>
            </div>
        `;

        // Add voting stats if available (multi-frame capture)
        if (match.voteCount && match.totalFrames) {
            statsHTML += `
                <div class="result-stat">
                    <span class="stat-label">Frame Consensus:</span>
                    <span class="stat-value">${match.voteCount}/${match.totalFrames} frames (${match.consensus}%)</span>
                </div>
                <div class="result-stat">
                    <span class="stat-label">Avg Matches:</span>
                    <span class="stat-value">${match.avgMatches} features</span>
                </div>
            `;
        }

        // Add recognition method badge
        const methodBadge = match.method === 'face-recognition'
            ? '<span class="method-badge face-recognition">Face Recognition</span>'
            : '<span class="method-badge orb-matching">ORB Matching</span>';

        container.innerHTML = `
            <div class="result-success">
                <div class="result-icon">✓</div>
                <h2>Match Found!</h2>

                ${methodBadge}

                <div class="result-image">
                    <img src="${match.url}" alt="${match.name}">
                </div>

                <h3 class="result-name">${match.name}</h3>
                <p class="result-description">${match.description}</p>

                <div class="result-stats">
                    ${statsHTML}
                </div>

                <button id="copy-logs-btn" class="btn btn-secondary btn-block">
                    📋 Copy Diagnostic Logs
                </button>
            </div>
        `;

        // Attach copy logs handler
        setTimeout(() => {
            const copyBtn = document.getElementById('copy-logs-btn');
            if (copyBtn && window.copyLogsToClipboard) {
                copyBtn.addEventListener('click', () => window.copyLogsToClipboard(copyBtn));
            }
        }, 0);
    }

    // Render no match result
    function renderNoMatchResult(container, match) {
        const matchCount = match ? match.matches : 0;
        const voteInfo =
            match && match.voteCount
                ? ` (${match.voteCount}/${match.totalFrames} frames agreed)`
                : '';

        container.innerHTML = `
            <div class="result-no-match">
                <div class="result-icon">⚠</div>
                <h2>No Match Found</h2>
                <p>Not enough matching features detected.</p>

                <div class="result-tips">
                    <h4>Try:</h4>
                    <ul>
                        <li>Better lighting</li>
                        <li>Different angle</li>
                        <li>Closer distance</li>
                    </ul>
                </div>

                <p class="result-details">
                    Found ${matchCount} matches (need 20+)${voteInfo}
                </p>
            </div>
        `;
    }

    // Attach event listeners
    function attachEventListeners() {
        // Back to scanner button
        const backBtn = document.getElementById('back-to-scan-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                Router.navigate('/scan');
            });
        }

        // Scan again button
        const scanAgainBtn = document.getElementById('scan-again-btn');
        if (scanAgainBtn) {
            scanAgainBtn.addEventListener('click', () => {
                Router.navigate('/scan');
            });
        }

        // View gallery button
        const viewGalleryBtn = document.getElementById('view-gallery-btn');
        if (viewGalleryBtn) {
            viewGalleryBtn.addEventListener('click', () => {
                Router.navigate('/');
            });
        }
    }

    console.log('[Result Page] Controller loaded');
})(window);
