require("dotenv").config();
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generates an AI image based on the provided description using OpenAI's DALL·E API.
 * @param {string} description - The description for the image to generate.
 * @returns {Promise<string>} - The URL of the generated image.
 */
async function generateImage(description) {
  if (!description || typeof description !== 'string' || !description.trim()) {
    throw new Error('A valid image description must be provided.');
  }
  try {
    const response = await openai.images.generate({
      model: "gpt-4.1",
      prompt: description,
      n: 1,
      size: "256x256"
    });
    if (
      response &&
      response.data &&
      Array.isArray(response.data) &&
      response.data[0]
    ) {
      if (response.data[0].url) {
        return response.data[0].url;
      } else if (response.data[0].b64_json) {
        // Return as a data URL for direct browser use
        return `data:image/png;base64,${response.data[0].b64_json}`;
      }
    }
    throw new Error('No image data returned from OpenAI.');
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Failed to generate image.');
  }
}

module.exports = { generateImage }; 