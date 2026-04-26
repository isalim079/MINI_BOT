import readlineSync from "readline-sync";
import dotenv from "dotenv";
dotenv.config();

function sum(num1, num2) {
  return num1 + num2;
}

function prime(num) {
  if(num < 2) return false;

  for(let i = 2; i<= Math.sqrt(num); i++) {
    if(num % i === 0) return false;
  }
  return true;
}

async function getCryptoPrice(coin) {
  
  const response = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?start=1&limit=10&convert=usd&slug=${coin}`, {
    headers: {
      "X-CMC_PRO_API_KEY": process.env.COIN_MARKET_API_KEY,
    },
  });

  const data = await response.json();
  console.log(data);
}

const userProblem = readlineSync.question("Enter the crypto coin name: ");
console.log(userProblem)

// getCryptoPrice('bitcoin').catch(console.error);