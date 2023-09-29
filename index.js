const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const wss = new WebSocket.Server({ noServer: true });
const streams = {};
const tokenToWs = new Map(); // Map to store tokens and their associated WebSocket connections

wss.on('connection', (ws) => {
    console.log('Client connected');

    // Generate a unique token for this connection
    const token = crypto.randomBytes(16).toString('hex');

    // Store the token and WebSocket connection in the map
    tokenToWs.set(token, ws);

    // Send the token back to the client
    ws.send(JSON.stringify({ type: 'token', token }));
});

const server = http.createServer(app);

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request);
    });
});



app.post('/stream/:type/create', (req, res) => {
    const type = req.params.type;
    const token = req.query.token;
    const ws = tokenToWs.get(token);

    if (!ws) {
        return res.status(400).json({ msg: 'WebSocket connection not found' });
    }

    if (type !== 'cpu' && type !== 'memory') {
        return res.status(400).json({ msg: 'Invalid stream type' });
    }

    const id = Date.now().toString();
    streams[id] = { type, active: false, wsId: ws.id }; // Associate stream with WebSocket ID
    res.json({ msg: `${type} stream created`, id })
});

app.post('/stream/:id/start', (req, res) => {
    const id = req.params.id;
    const stream = streams[id];
    const token = req.query.token;
    const ws = tokenToWs.get(token);

    if (!stream) {
        return res.status(404).json({ msg: 'Stream not found' });
    }

    if (!ws || stream.wsId !== ws.id) {
        return res.status(403).json({ msg: 'Not authorized to start this stream' });
    }

    if (stream.type === 'cpu') {
        stream.interval = setInterval(() => {
            const cpuUsage = (Math.random() * 100).toFixed(2);
            ws.send(`CPU Usage: ${cpuUsage.trim()}%`);
        }, 1000); // 1 time per second
    } else if (stream.type === 'memory') {
        // TODO: mimicking memory usage by executing the `free` command
    }
    stream.active = true;
    res.json({ msg: `${stream.type} stream started`, id });
});

app.post('/stream/:id/stop', (req, res) => {
    const id = req.params.id;
    const stream = streams[id];
    const token = req.query.token;
    const ws = tokenToWs.get(token);
    if (!stream) {
        return res.status(404).json({ msg: 'Stream not found' });
    }

    if (!ws || stream.wsId !== ws.id) {
        return res.status(403).json({ msg: 'Not authorized to stop this stream' });
    }

    clearInterval(stream.interval);
    stream.active = false;
    res.json({ msg: `${stream.type} stream stopped`, id });
});

app.post('/stream/:id/destroy', (req, res) => {
    const id = req.params.id;
    const stream = streams[id];
    const token = req.query.token;
    const ws = tokenToWs.get(token);

    if (!stream) {
        return res.status(404).json({ msg: 'Stream not found' });
    }

    if (!ws || stream.wsId !== ws.id) {
        return res.status(403).json({ msg: 'Not authorized to destroy this stream' });
    }

    if (stream.active) {
        clearInterval(stream.interval);
    }

    // Send a message to the client before closing
    if (ws.readyState === WebSocket.OPEN) {
        ws.send('Your stream is being destroyed and the connection will be closed.');
    }

    // Close the WebSocket connection
    ws.close();

    // Remove the token from the Map object
    tokenToWs.delete(token);

    // Remove the stream from the streams object
    delete streams[id];

    res.json({ msg: `${stream.type} stream destroyed`, id });
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
