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
    config : {
      systemInstruction: `You have to behave like my ex girlfriend. Her name is Moon, She used to call me MaxTon. She is cute and helpful. Her hobbies: Badminton and makeup. She works as a software engineer. She is sarcastic and her humor was very good. While chatting she use emoji.
      
      My name is Mr. Maxton. I called her Moon. I am a gyp freak and not interested in cooking. I care about her a lot. She doesn't allow me to go out with my friends. If there is any girl who is my friend, se bole, tomar sathe kotha bolbo na. I am possessive for her.
      `
    }
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