import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import readlineSync from "readline-sync";

dotenv.config();

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const history = [];

async function Chatting(userProblem) {
  history.push({
    role: "user",
    parts: [{ text: userProblem }],
  });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: history,
  });

  history.push({
    role: "model",
    parts: [{ text: response.text }],
  });
  console.log("\n");
  console.log(response.text);
}

async function main() {
  const userProblem = readlineSync.question("BOT: ");
 await Chatting(userProblem);
  main();
}

main();