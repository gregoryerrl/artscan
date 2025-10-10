import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;

// Enable JSON body parsing for logging endpoint
app.use(express.json());

// ============================================================================
// DIAGNOSTIC LOGGING SYSTEM - Server-Side
// ============================================================================

// In-memory storage for client logs
const logStorage = {
    sessions: new Map(),
    sseClients: [],
    maxSessionAge: 60 * 60 * 1000, // 1 hour
    maxLogsPerSession: 1000,
    maxSessions: 50
};

// Session management
function getOrCreateSession(sessionId) {
    if (!logStorage.sessions.has(sessionId)) {
        logStorage.sessions.set(sessionId, {
            sessionId,
            logs: [],
            metadata: {},
            stats: {
                totalEvents: 0,
                eventCounts: {},
                startTime: Date.now(),
                lastActivity: Date.now()
            }
        });

        // Cleanup old sessions if limit exceeded
        if (logStorage.sessions.size > logStorage.maxSessions) {
            const oldestSession = Array.from(logStorage.sessions.values())
                .sort((a, b) => a.stats.lastActivity - b.stats.lastActivity)[0];
            logStorage.sessions.delete(oldestSession.sessionId);
            console.log(`[Logging] Removed old session: ${oldestSession.sessionId}`);
        }
    }
    return logStorage.sessions.get(sessionId);
}

function updateSessionStats(session, event) {
    session.stats.totalEvents++;
    session.stats.lastActivity = Date.now();
    session.stats.eventCounts[event] = (session.stats.eventCounts[event] || 0) + 1;
}

// Cleanup old sessions periodically
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of logStorage.sessions.entries()) {
        if (now - session.stats.lastActivity > logStorage.maxSessionAge) {
            logStorage.sessions.delete(sessionId);
            console.log(`[Logging] Auto-cleanup: Removed inactive session ${sessionId}`);
        }
    }
}, 5 * 60 * 1000); // Check every 5 minutes

// Broadcast log to all SSE clients
function broadcastLog(log) {
    logStorage.sseClients.forEach(client => {
        client.write(`data: ${JSON.stringify(log)}\n\n`);
    });
}

// API: Receive logs from clients
app.post('/api/logs', (req, res) => {
    try {
        const { sessionId, event, timestamp, ...data } = req.body;

        if (!sessionId || !event) {
            return res.status(400).json({ error: 'Missing sessionId or event' });
        }

        const session = getOrCreateSession(sessionId);

        // Store session metadata from first log
        if (event === 'session_start') {
            session.metadata = {
                userAgent: data.userAgent,
                isMobile: data.isMobile,
                screen: data.screen,
                startTime: timestamp || Date.now()
            };
        }

        // Add log to session
        const logEntry = { sessionId, event, timestamp: timestamp || Date.now(), ...data };
        session.logs.push(logEntry);

        // Limit logs per session
        if (session.logs.length > logStorage.maxLogsPerSession) {
            session.logs.shift();
        }

        // Update stats
        updateSessionStats(session, event);

        // Broadcast to dashboard clients
        broadcastLog(logEntry);

        res.json({ success: true });
    } catch (error) {
        console.error('[Logging] Error receiving log:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API: Get logs (with optional filtering)
app.get('/api/logs', (req, res) => {
    try {
        const { sessionId, eventType, limit } = req.query;

        let logs = [];

        if (sessionId) {
            const session = logStorage.sessions.get(sessionId);
            if (session) {
                logs = session.logs;
            }
        } else {
            // Get all logs from all sessions
            for (const session of logStorage.sessions.values()) {
                logs.push(...session.logs);
            }
        }

        // Filter by event type
        if (eventType) {
            logs = logs.filter(log => log.event === eventType);
        }

        // Sort by timestamp (newest first)
        logs.sort((a, b) => b.timestamp - a.timestamp);

        // Limit results
        if (limit) {
            logs = logs.slice(0, parseInt(limit));
        }

        res.json({ logs, total: logs.length });
    } catch (error) {
        console.error('[Logging] Error retrieving logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API: Get active sessions
app.get('/api/sessions', (req, res) => {
    try {
        const sessions = Array.from(logStorage.sessions.values()).map(session => ({
            sessionId: session.sessionId,
            metadata: session.metadata,
            stats: session.stats,
            logCount: session.logs.length
        }));

        // Sort by last activity (most recent first)
        sessions.sort((a, b) => b.stats.lastActivity - a.stats.lastActivity);

        res.json({ sessions, total: sessions.length });
    } catch (error) {
        console.error('[Logging] Error retrieving sessions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API: Server-Sent Events stream for real-time logs
app.get('/api/logs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Add client to broadcast list
    logStorage.sseClients.push(res);
    console.log(`[Logging] SSE client connected. Total clients: ${logStorage.sseClients.length}`);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
    }, 30000);

    // Remove client on disconnect
    req.on('close', () => {
        clearInterval(heartbeat);
        logStorage.sseClients = logStorage.sseClients.filter(client => client !== res);
        console.log(`[Logging] SSE client disconnected. Total clients: ${logStorage.sseClients.length}`);
    });
});

// API: Delete logs for specific session
app.delete('/api/logs/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;

        if (logStorage.sessions.has(sessionId)) {
            logStorage.sessions.delete(sessionId);
            console.log(`[Logging] Deleted session: ${sessionId}`);
            res.json({ success: true, message: 'Session deleted' });
        } else {
            res.status(404).json({ error: 'Session not found' });
        }
    } catch (error) {
        console.error('[Logging] Error deleting session:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API: Delete all logs
app.delete('/api/logs', (req, res) => {
    try {
        const sessionCount = logStorage.sessions.size;
        logStorage.sessions.clear();
        console.log(`[Logging] Cleared all logs (${sessionCount} sessions)`);
        res.json({ success: true, message: `Deleted ${sessionCount} sessions` });
    } catch (error) {
        console.error('[Logging] Error clearing logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Train images list endpoint
app.get('/api/train-images', (req, res) => {
    const trainDir = path.join(__dirname, 'train');
    try {
        const files = fs.readdirSync(trainDir)
            .filter(file => file.endsWith('.jpg'))
            .sort();
        res.json(files);
    } catch (error) {
        console.error('Error reading train directory:', error);
        res.status(500).json({ error: 'Failed to read train directory' });
    }
});

// Image proxy endpoint to bypass CORS
app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;

    if (!imageUrl || !imageUrl.startsWith('https://openaccess-cdn.clevelandart.org/')) {
        return res.status(400).send('Invalid image URL');
    }

    try {
        https.get(imageUrl, (response) => {
            res.setHeader('Content-Type', response.headers['content-type']);
            res.setHeader('Access-Control-Allow-Origin', '*');
            response.pipe(res);
        }).on('error', (err) => {
            console.error('Proxy error:', err);
            res.status(500).send('Failed to fetch image');
        });
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send('Failed to fetch image');
    }
});

// Serve static files
app.use(express.static(__dirname));

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✓ Server running at http://localhost:${PORT}`);
    console.log(`✓ Image proxy enabled at /api/proxy-image`);
    console.log(`✓ Diagnostic logging API enabled at /api/logs`);
    console.log(`✓ Real-time dashboard at http://localhost:${PORT}/logs-dashboard.html`);
    console.log(`✓ Press Ctrl+C to stop`);
});
