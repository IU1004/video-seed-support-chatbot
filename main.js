// main.js
const { getInitialState, getCurrentWorkflow, setWorkflowStatus, getOrCreateUserState } = require('./state');
const { runPlanEventWorkflow, detectIntent, intentToWorkflowKey } = require('./workflow');
const { getEmojiForContext } = require('./emoji');
const readlineSync = require('readline-sync');
const { extractFields } = require('./extract');

async function getParentAgentPrompt() {
  // Use a static prompt string for emoji generation and display
  const promptText = "Welcome! How can I assist you today? Would you like to plan an event, discover exciting events, or go live streaming? Just let me know your preference, and I'll guide you through the process.";
  const parentEmoji = await getEmojiForContext(promptText);
  return `${parentEmoji} ${promptText}`;
}

async function main() {
  let parentPrompt = await getParentAgentPrompt();
  console.log('Chatbot started. Type your message and press Enter. Type "exit" to quit.');
  while (true) {
    // Prompt for userId before each message (simulate multi-user)
    const userId = readlineSync.question("User ID: ").trim();
    if (!userId) {
      console.log("User ID cannot be empty.");
      continue;
    }
    const userState = getOrCreateUserState(userId);
    const current = getCurrentWorkflow(userState);
    if (!current) {
      console.log(parentPrompt);
      const userInput = readlineSync.question("You: ");
      if (userInput.trim().toLowerCase() === "exit") break;
      const intent = await detectIntent(userInput);
      const workflowKey = intentToWorkflowKey(intent);
      if (workflowKey) {
        setWorkflowStatus(userState, workflowKey, "Ongoing");
        continue;
      } else {
        console.log("Sorry, I didn't understand. Please try phrases like:");
        console.log("- Plan an event");
        console.log("- Discover events");
        console.log("- Go live streaming");
        continue;
      }
    }
    if (current.workflow === "planEvent") {
      const result = await runPlanEventWorkflow(userState, current);
      if (result === false) break;
      if (result === "switch") continue;
      setWorkflowStatus(userState, current.workflow, "Stop");
    } else if (current.workflow === "discoverEvent") {
      console.log("Discover Event is not implemented yet. Returning to main menu.");
      setWorkflowStatus(userState, current.workflow, "Stop");
      continue;
    } else if (current.workflow === "liveStreaming") {
      console.log("Live Streaming is not implemented yet. Returning to main menu.");
      setWorkflowStatus(userState, current.workflow, "Stop");
      continue;
    }
  }
  console.log("Chatbot ended.");
}

main(); 