import 'dotenv/config';
import OpenAI from 'openai';

async function listModels() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('API Key missing');
    return;
  }
  const client = new OpenAI({ apiKey });
  try {
    const response = await client.models.list();
    console.log('Available models:');
    for await (const model of response) {
      console.log(`- ${model.id}`);
    }
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

listModels();
