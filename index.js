require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');
const readlineSync = require('readline-sync');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function main() {
  console.log('Chatbot started. Type your message and press Enter. Type "exit" to quit.');
  while (true) {
    const userInput = readlineSync.question('You: ');
    if (userInput.trim().toLowerCase() === 'exit') break;

    try {
      const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant. When you reply, always include a JSON object with fields: reply, sentiment, and keywords. Example: {"reply": "...", "sentiment": "positive", "keywords": ["keyword1", "keyword2"]}' },
          { role: 'user', content: userInput },
        ],
        temperature: 0.7,
      });
      const response = completion.data.choices[0].message.content;
      console.log('Bot:', response);
    } catch (err) {
      console.error('Error:', err.response ? err.response.data : err.message);
    }
  }
  console.log('Chatbot ended.');
}

main(); 