import readlineSync from "readline-sync";
import { GoogleGenAI } from "@google/genai";
import { exec } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";
dotenv.config();

const asyncExecute = promisify(exec);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const history = [];

// tool create which can open terminal and can execute commands
async function executeCommand({ command }) {
  try {
    const { standardOutput, standardError } = await asyncExecute(command);

    if (standardError) {
      return `Error: ${standardError}`;
    }

    return `Success: ${standardOutput} || Task Executed Successfully`;
  } catch (error) {
    return `Error: ${error}`;
  }
}

const executeCommandDeclaration = {
  name: "executeCommand",
  description:
    "Execute a single terminal/shell command. A command can be create a folder, file, write a file, edit the file or delete the file.",
  parameters: {
    type: "OBJECT",
    properties: {
      command: {
        type: "STRING",
        description: "It will be the crypto currency name, like button",
      },
    },
    required: ["command"],
  },
};

const availableTools = {
  sum: sum,
  prime: prime,
  getCryptoPrice: getCryptoPrice,
};

async function runAgent(userProblem) {
  history.push({
    role: "user",
    parts: [{ text: userProblem }],
  });

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: history,
      config: {
        systemInstruction: `You are a helpful assistant that can answer questions and help with tasks. You have access to the following functions: ${JSON.stringify(sumDeclaration)}, ${JSON.stringify(primeDeclaration)}, ${JSON.stringify(cryptoDeclaration)}. You can also answer any question that is not related to the functions you have access to.`,
        tools: [
          {
            functionDeclarations: [sumDeclaration, primeDeclaration, cryptoDeclaration],
          },
        ],
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log(response.functionCalls[0]);

      const modelParts = response.candidates?.[0]?.content?.parts;

      const functionCallPart = modelParts.find((part) => part.functionCall);
      const { name, args } = functionCallPart.functionCall;

      const funCall = availableTools[name];
      const result = await funCall(args);

      const functionResponsePart = {
        name: name,
        response: {
          result: result,
        },
      };

      history.push({
        role: "model",
        parts: modelParts,
      });

      // push result to history
      history.push({
        role: "tool",
        parts: [
          {
            functionResponse: functionResponsePart,
          },
        ],
      });
    } else {
      history.push({
        role: "model",
        parts: [{ text: response.text }],
      });
      console.log(response.text);
      break;
    }
  }
}

async function main() {
  const userProblem = readlineSync.question("Ask anything: ");
  await runAgent(userProblem);
  main();
}

main();

// getCryptoPrice('bitcoin').catch(console.error);
