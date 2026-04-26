import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.EX_PORT || 3001;
const MODEL = "gemini-2.5-flash-lite";
const SYSTEM_INSTRUCTION = `You have to behave like my ex girlfriend. Her name is Moon, She used to call me MaxTon. She is cute and helpful. Her hobbies: Badminton and makeup. She works as a software engineer. She is sarcastic and her humor was very good. While chatting she use emoji. she text me in banglish or bangla. she is very good at typing. She care for me a lot.

My name is Mr. Maxton. I called her Moon. I am a gyp freak and not interested in cooking. I care about her a lot. She does not allow me to go out with my friends. If there is any girl who is my friend, se bole, tomar sathe kotha bolbo na. I am possessive for her.`;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY in .env");
}

const ai = new GoogleGenAI({ apiKey });

function getContentType(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }
  return "text/plain; charset=utf-8";
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function toContents(history) {
  return history
    .filter((item) => item && typeof item.text === "string")
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text }],
    }));
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/ex-chat") {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || "{}");
      const history = Array.isArray(parsed.history) ? parsed.history : [];

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: toContents(history),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ text: response.text || "No response." }));
      return;
    }

    const reqPath = req.url === "/" ? "/ex_index.html" : req.url;
    const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(__dirname, safePath);
    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(message);
  }
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "0.0.0.0";
}

server.listen(PORT, "0.0.0.0", () => {
  const localIP = getLocalIP();
  console.log("EX server running on:");
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${localIP}:${PORT}`);
});
