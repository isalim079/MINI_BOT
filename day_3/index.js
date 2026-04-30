import readlineSync from "readline-sync";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const history = [];

function sum({ num1, num2 }) {
  return num1 + num2;
}

function prime({ num }) {
  if (num < 2) return false;

  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
}

async function getCryptoPrice({ coin }) {
  const response = await fetch(
    `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?start=1&limit=10&convert=usd&slug=${coin}`,
    {
      headers: {
        "X-CMC_PRO_API_KEY": process.env.COIN_MARKET_API_KEY,
      },
    },
  );

  const data = await response.json();

  if(!data?.data || Object.keys(data?.data)?.length === 0) {
    return `No crypto coin found with the name ${coin}. Please provide a valid crypto coin name.`
  }

  const coinData = Object.values(data.data)[0];

  return {
    name: coinData.name,
    price: coinData.quote.USD.price,
  };
  // console.log(data);
}

const sumDeclaration = {
  name: "sum",
  description: "This function takes two number as input and gives the sum of the two numbers as output.",
  parameters: {
    type: "object",
    properties: {
      num1: {
        type: "number",
        description: "It will be first number for addition. ex: 10",
      },
      num2: {
        type: "number",
        description: "It will be second number for addition. ex: 20",
      },
    },
    required: ["num1", "num2"],
  },
};

const primeDeclaration = {
  name: "prime",
  description:
    "This function takes a number as input and gives true if the number is prime and false if the number is not prime.",
  parameters: {
    type: "object",
    properties: {
      num: {
        type: "number",
        description: "It will be the number to check if it is prime or not. ex: 11",
      },
    },
    required: ["num"],
  },
};

const cryptoDeclaration = {
  name: "getCryptoPrice",
  description:
    "This function takes a crypto coin name as input and gives the price of the crypto coin in USD as output.",
  parameters: {
    type: "object",
    properties: {
      coin: {
        type: "string",
        description: "It will be the name of the crypto coin. ex: bitcoin",
      },
    },
    required: ["coin"],
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
