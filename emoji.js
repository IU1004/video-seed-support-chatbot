require("dotenv").config();
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getEmojiForContext(contextText) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "Given a short context or question, reply with only the most relevant emoji or emoji sequence (no text, no explanation).",
      },
      { role: "user", content: contextText },
    ],
    temperature: 0.2,
  });
  return completion.choices[0].message.content.trim();
}

module.exports = { getEmojiForContext }; 