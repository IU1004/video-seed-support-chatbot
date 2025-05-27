# Console OpenAI Chatbot

This is a simple Node.js console chatbot that sends your input to OpenAI's GPT-3.5 model and prints both a chat reply and a JSON object with fields: `reply`, `sentiment`, and `keywords`.

## Setup

1. Clone this repository or copy the files to your project directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Usage

Run the chatbot with:
```bash
node index.js
```

Type your message and press Enter. Type `exit` to quit the chatbot. 