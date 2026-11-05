import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import('dotenv').then(({ default: dotenv }) => {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
});

let groqInstance = null;

export const getGroq = async () => {
  if (!groqInstance) {
    const { default: Groq } = await import('groq-sdk');
    groqInstance = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groqInstance;
};
