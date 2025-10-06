const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 4000;

function resolveDataDir() {
  const fromEnv = process.env.CALENDAR_DATA_DIR || process.env.DATA_DIR;
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  const railwayVolume = '/data';
  try {
    const stats = fs.statSync(railwayVolume);
    if (stats.isDirectory()) {
      return railwayVolume;
    }
  } catch (error) {
    // Ignore errors and fall back to the server directory.
  }
  return __dirname;
}

function resolveDataFile() {
  const fromEnv = process.env.CALENDAR_DATA_FILE || process.env.DATA_FILE;
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  const dir = resolveDataDir();
  return path.join(dir, 'data.json');
}

const DATA_FILE = resolveDataFile();
const DATA_DIR = path.dirname(DATA_FILE);
const CLIENT_DIR = path.join(__dirname, '..', 'client');

function ensureDataDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create data directory at ${DATA_DIR}: ${error.message}`);
  }
}

function ensureDataFile() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      categories: [
        { id: 'default-personal', name: 'Personal', emoji: '🏡', color: '#4caf50' },
        { id: 'default-work', name: 'Work', emoji: '💼', color: '#2196f3' },
        { id: 'default-social', name: 'Social', emoji: '🎉', color: '#ff9800' }
      ],
      events: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
  }
}

function readData() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeData(data) {
  ensureDataDir();
  const payload = JSON.stringify(data, null, 2);
  const tempFile = `${DATA_FILE}.tmp`;
  try {
    fs.writeFileSync(tempFile, payload);
    fs.renameSync(tempFile, DATA_FILE);
  } catch (error) {
    try {
      fs.unlinkSync(tempFile);
    } catch (cleanupError) {
      // Ignore cleanup errors.
    }
    throw new Error(`Failed to persist data: ${error.message}`);
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk.toString();
      if (data.length > 1e6) {
        req.socket.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function validateCategory(input) {
  if (!input || typeof input !== 'object') {
    return 'Category must be an object';
  }
  const { name, emoji, color } = input;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Category name is required';
  }
  if (!emoji || typeof emoji !== 'string') {
    return 'Category emoji is required';
  }
  if (!color || typeof color !== 'string' || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
    return 'Category color must be a hex value like #ff0000';
  }
  return null;
}

function validateEvent(input, categories) {
  if (!input || typeof input !== 'object') {
    return 'Event must be an object';
  }
  const { title, description, startDate, endDate, categoryId } = input;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return 'Event title is required';
  }
  const start = new Date(startDate);
  if (!startDate || Number.isNaN(start.getTime())) {
    return 'Valid startDate is required';
  }
  if (endDate) {
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) {
      return 'endDate must be a valid date when provided';
    }
    if (end < start) {
      return 'endDate cannot be before startDate';
    }
  }
  if (!categoryId || !categories.find(cat => cat.id === categoryId)) {
    return 'A valid categoryId is required';
  }
  if (description && typeof description !== 'string') {
    return 'Description must be a string when provided';
  }
  return null;
}

function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    });
    res.end();
    return true;
  }

  if (url.pathname === '/api/categories' && req.method === 'GET') {
    const data = readData();
    sendJson(res, 200, data.categories);
    return true;
  }

  if (url.pathname === '/api/categories' && req.method === 'POST') {
    parseBody(req)
      .then(body => {
        const error = validateCategory(body);
        if (error) {
          sendError(res, 400, error);
          return;
        }
        const data = readData();
        const newCategory = {
          id: randomUUID(),
          name: body.name.trim(),
          emoji: body.emoji,
          color: body.color
        };
        data.categories.push(newCategory);
        try {
          writeData(data);
        } catch (error) {
          sendError(res, 500, error.message);
          return;
        }
        sendJson(res, 201, newCategory);
      })
      .catch(err => {
        sendError(res, 400, err.message);
      });
    return true;
  }

  if (url.pathname === '/api/events' && req.method === 'GET') {
    const data = readData();
    const eventsWithCategory = data.events.map(event => ({
      ...event,
      category: data.categories.find(cat => cat.id === event.categoryId) || null
    }));
    sendJson(res, 200, eventsWithCategory);
    return true;
  }

  if (url.pathname === '/api/events' && req.method === 'POST') {
    parseBody(req)
      .then(body => {
        const data = readData();
        const error = validateEvent(body, data.categories);
        if (error) {
          sendError(res, 400, error);
          return;
        }
        const newEvent = {
          id: randomUUID(),
          title: body.title.trim(),
          description: body.description ? body.description.trim() : '',
          startDate: body.startDate,
          endDate: body.endDate || body.startDate,
          categoryId: body.categoryId
        };
        data.events.push(newEvent);
        try {
          writeData(data);
        } catch (error) {
          sendError(res, 500, error.message);
          return;
        }
        sendJson(res, 201, {
          ...newEvent,
          category: data.categories.find(cat => cat.id === newEvent.categoryId) || null
        });
      })
      .catch(err => {
        sendError(res, 400, err.message);
      });
    return true;
  }

  const eventIdMatch = url.pathname.match(/^\/api\/events\/([^/]+)$/);
  if (eventIdMatch) {
    const eventId = eventIdMatch[1];
    if (req.method === 'PUT') {
      parseBody(req)
        .then(body => {
          const data = readData();
          const existingIndex = data.events.findIndex(event => event.id === eventId);
          if (existingIndex === -1) {
            sendError(res, 404, 'Event not found');
            return;
          }
          const merged = { ...data.events[existingIndex], ...body };
          const error = validateEvent(merged, data.categories);
          if (error) {
            sendError(res, 400, error);
            return;
          }
          merged.title = merged.title.trim();
          if (merged.description) {
            merged.description = merged.description.trim();
          }
          merged.endDate = merged.endDate || merged.startDate;
          data.events[existingIndex] = merged;
          try {
            writeData(data);
          } catch (error) {
            sendError(res, 500, error.message);
            return;
          }
          sendJson(res, 200, {
            ...merged,
            category: data.categories.find(cat => cat.id === merged.categoryId) || null
          });
        })
        .catch(err => {
          sendError(res, 400, err.message);
        });
      return true;
    }

    if (req.method === 'DELETE') {
      const data = readData();
      const existingIndex = data.events.findIndex(event => event.id === eventId);
      if (existingIndex === -1) {
        sendError(res, 404, 'Event not found');
        return true;
      }
      const [removed] = data.events.splice(existingIndex, 1);
      try {
        writeData(data);
      } catch (error) {
        sendError(res, 500, error.message);
        return true;
      }
      sendJson(res, 200, removed);
      return true;
    }
  }

  return false;
}

const server = http.createServer((req, res) => {
  if (handleApi(req, res)) {
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = path.join(CLIENT_DIR, url.pathname);
  if (url.pathname === '/') {
    filePath = path.join(CLIENT_DIR, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
