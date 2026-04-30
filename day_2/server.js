import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import os from 'node:os';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3005;
const MODEL = 'gemini-3-flash-preview';
const SYSTEM_INSTRUCTION =
  `You are a Data Structure and Algorithm Instructor. You will only reply to the problem related to Data Structure and Algorithms. You have to solve query of user in simplest way. If user ask any question which is not related to Data Structure and Algorithm, reply him like straight forward tone. Example: If user ask, How are you? You will reply: I am here to help you with your Data Structure and Algorithm problems. No need for introduction. Just ask question about Data Structure and Algorithm. 
        You have to reply him straight forward if question is not related to Data Structure and Algorithm. Else reply with simple explanation.
        `;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GEMINI_API_KEY in .env');
}

const ai = new GoogleGenAI({ apiKey });

function toGeminiContents(history) {
  return history.map((item) => ({
    role: item.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: item.text }],
  }));
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }
  if (filePath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }
  if (filePath.endsWith('.js')) {
    return 'application/javascript; charset=utf-8';
  }
  return 'text/plain; charset=utf-8';
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/chat') {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || '{}');
      const history = Array.isArray(parsed.history) ? parsed.history : [];

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: toGeminiContents(history),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          text: response.text || 'No response generated.',
        }),
      );
      return;
    }

    const requestPath = req.url === '/' ? '/index.html' : req.url;
    const safePath = path
      .normalize(requestPath)
      .replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(__dirname, safePath);
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(message);
  }
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '0.0.0.0';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`Server running on:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${localIP}:${PORT}`);
});
