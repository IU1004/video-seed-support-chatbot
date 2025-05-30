// workflow.js
const { planEventAgents } = require('./agents');
const { extractFields } = require('./extract');
const { getEmojiForContext } = require('./emoji');
const { getCurrentWorkflow, setWorkflowStatus } = require('./state');
const readlineSync = require('readline-sync');
const { generateImage } = require('./generateImage');

async function detectIntent(userInput) {
  const { extractFields } = require('./extract');
  const systemPrompt = `
You are an intent classifier for a chatbot. The user may use any natural language to express their intent.
Classify the user's intent as exactly one of these:
- plan event
- discover event
- go live streaming

Reply with ONLY one of the above phrases, and nothing else. Be flexible and infer intent even if the user uses indirect or creative language.
`;

  const result = await extractFields(systemPrompt, userInput);
  let normalized = '';
  if (typeof result === 'string') {
    normalized = result.toLowerCase();
  } else if (typeof result === 'object' && result !== null) {
    const values = Object.values(result);
    if (values.length > 0 && typeof values[0] === 'string') {
      normalized = values[0].toLowerCase();
    }
  }
  // Accept only exact matches
  if (normalized === 'plan event') return 'plan event';
  if (normalized === 'discover event') return 'discover event';
  if (normalized === 'go live streaming') return 'go live streaming';
  // Fallback: keyword matching in original user input
  const fallback = userInput.toLowerCase();
  if (fallback.includes('plan') && fallback.includes('event')) return 'plan event';
  if (fallback.includes('discover') && fallback.includes('event')) return 'discover event';
  if (fallback.includes('live') || fallback.includes('stream')) return 'go live streaming';
  // Optionally log ambiguous output for debugging
  // console.log('Ambiguous intent output:', result);
  return '';
}

function intentToWorkflowKey(intent) {
  if (intent === "plan event") return "planEvent";
  if (intent === "discover event") return "discoverEvent";
  if (intent === "go live streaming") return "liveStreaming";
  return null;
}
function intentToDisplayName(intent) {
  if (intent === "plan event") return "Plan Event";
  if (intent === "discover event") return "Discover Event";
  if (intent === "go live streaming") return "Go Live Streaming";
  return intent;
}

async function runPlanEventWorkflow(userState, workflowState) {
  for (const agent of planEventAgents) {
    let agentComplete = false;
    // Special handling for ImageAgent
    if (agent.name === "ImageAgent") {
      // Step 1: Ask if user wants an AI image
      while (true) {
        if (!workflowState.fields.wantsImage) {
          const emoji = await getEmojiForContext(agent.prompt);
          console.log(`${emoji} ${agent.prompt}`);
          const userInput = readlineSync.question("You: ");
          if (userInput.trim().toLowerCase() === "exit") return false;
          const extracted = await extractFields(agent.extractSystem, userInput);
          if (extracted.wantsImage) workflowState.fields.wantsImage = extracted.wantsImage.toLowerCase();
        }
        if (workflowState.fields.wantsImage === "no") {
          // User does not want an image, skip to next agent
          agentComplete = true;
          break;
        } else if (workflowState.fields.wantsImage === "yes") {
          // Step 2: Ask for image description, generate image, confirm
          while (true) {
            // Ask for image description
            const descPrompt = "Please provide a description for the AI image you'd like to generate.";
            const emoji = await getEmojiForContext(descPrompt);
            console.log(`${emoji} ${descPrompt}`);
            const descInput = readlineSync.question("You: ");
            if (descInput.trim().toLowerCase() === "exit") return false;
            workflowState.fields.imageDescription = descInput.trim();
            // Step 3: Generate image
            try {
              console.log("Generating AI image, please wait...");
              const url = await generateImage(workflowState.fields.imageDescription);
              workflowState.fields.generatedImageUrl = url;
              // Step 4: Show image URL and ask for confirmation
              const confirmPrompt = `AI Image Description: ${workflowState.fields.imageDescription}\nImage generated: ${url}\nIs this image good? (yes/no)`;
              const confirmEmoji = await getEmojiForContext(confirmPrompt);
              console.log(`${confirmEmoji} ${confirmPrompt}`);
              const confirmInput = readlineSync.question("You: ");
              if (confirmInput.trim().toLowerCase().startsWith("y")) {
                agentComplete = true;
                break;
              } else if (confirmInput.trim().toLowerCase() === "exit") {
                return false;
              } else {
                // User wants to try again, clear description and image URL
                workflowState.fields.imageDescription = null;
                workflowState.fields.generatedImageUrl = null;
                console.log("Let's try generating a new image. Please provide a new description.");
              }
            } catch (err) {
              console.log("Failed to generate image:", err.message);
              workflowState.fields.generatedImageUrl = null;
              const retryInput = readlineSync.question("Would you like to try a different description? (yes/no): ");
              if (retryInput.trim().toLowerCase() !== "yes") {
                // User does not want to retry, skip image
                workflowState.fields.wantsImage = "no";
                agentComplete = true;
                break;
              }
              workflowState.fields.imageDescription = null;
            }
          }
          if (agentComplete) break;
        } else {
          // Invalid input, ask again
          console.log("Please answer 'yes' or 'no'.");
          workflowState.fields.wantsImage = null;
        }
      }
      continue; // Move to next agent
    }
    // Default agent logic for all other agents
    while (!agentComplete) {
      let missingFields = agent.fields.filter((f) => !workflowState.fields[f]);
      while (missingFields.length > 0 || !agent.validate(workflowState.fields)) {
        if (missingFields.length === 0 && !agent.validate(workflowState.fields)) {
          for (const f of agent.fields) {
            workflowState.fields[f] = null;
          }
          missingFields = agent.fields.slice();
        }
        let prompt = agent.prompt;
        if (missingFields.length < agent.fields.length) {
          prompt = `Please provide the following information: ${missingFields.join(", ")}`;
        }
        const emoji = await getEmojiForContext(prompt);
        console.log(`${emoji} ${prompt}`);
        const userInput = readlineSync.question("You: ");
        if (userInput.trim().toLowerCase() === "exit") return false;
        const switchKeywords = ["switch", "change", "go to", "main menu", "plan event", "discover event", "go live streaming", "menu", "option", "back"];
        const lowerInput = userInput.trim().toLowerCase();
        const isSwitch = switchKeywords.some(k => lowerInput.includes(k));
        if (isSwitch) {
          const intent = await detectIntent(userInput);
          if (intent !== "plan event") {
            setWorkflowStatus(userState, intentToWorkflowKey(intent), "Ongoing");
            console.log(`Switching to ${intentToDisplayName(intent)}...`);
            return "switch";
          }
        }
        let extractPrompt = agent.extractSystem;
        if (missingFields.length === 1) {
          extractPrompt = `Extract the ${missingFields[0]} from the user input. Reply as JSON: {\"${missingFields[0]}\": \"...\"}`;
        } else if (missingFields.length < agent.fields.length) {
          extractPrompt = `Extract the following fields from the user input. Reply as JSON: {${missingFields.map(f => `\\\"${f}\\\": \\\"...\\\"`).join(", ")}}`;
        }
        const extracted = await extractFields(extractPrompt, userInput);
        for (const f of missingFields) {
          if (extracted[f]) workflowState.fields[f] = extracted[f];
        }
        missingFields = agent.fields.filter((f) => !workflowState.fields[f]);
        if (missingFields.length > 0) {
          if (agent.name === "TimeAgent") {
            console.log("Sorry, I could not understand your event time. Please try to rephrase, e.g., 'from June 1st to June 3rd, all day', 'next Friday 7pm to 10pm', or 'tomorrow evening'.");
          } else {
            console.log(`Sorry, you missed: ${missingFields.join(", ")}. Please provide all required information before continuing.`);
          }
        }
      }
      if (agent.validate(workflowState.fields)) {
        while (true) {
          const emoji = await getEmojiForContext(agent.confirm(workflowState.fields));
          console.log(`${emoji} ${agent.confirm(workflowState.fields)}`);
          const confirmInput = readlineSync.question("You: ");
          const lowerConfirm = confirmInput.trim().toLowerCase();

          // Check for workflow switch intent
          const switchIntent = await detectIntent(confirmInput);
          if (switchIntent && switchIntent !== "plan event") {
            setWorkflowStatus(userState, intentToWorkflowKey(switchIntent), "Ongoing");
            console.log(`Switching to ${intentToDisplayName(switchIntent)}...`);
            return "switch";
          }

          if (lowerConfirm.startsWith("y")) {
            agentComplete = true;
            break;
          } else if (lowerConfirm === "exit") {
            return false;
          } else {
            let correctionPrompt = agent.extractSystem;
            if (agent.fields.length === 1) {
              correctionPrompt = `Extract the ${agent.fields[0]} from the user input. Reply as JSON: {\"${agent.fields[0]}\": \"...\"}`;
            } else {
              correctionPrompt = `Extract any updated or corrected fields from the user input. Reply as JSON: {${agent.fields.map(f => `\\\"${f}\\\": \\\"...\\\"`).join(", ")}}`;
            }
            const correction = await extractFields(correctionPrompt, confirmInput);
            let updated = false;
            for (const f of agent.fields) {
              if (correction[f]) {
                workflowState.fields[f] = correction[f];
                updated = true;
              }
            }
            if (!agent.validate(workflowState.fields)) {
              break;
            }
            if (!updated) {
              console.log("Sorry, I could not understand your correction. Please try again or type 'yes' to confirm.");
            }
          }
        }
      } else {
        if (agent.name === "TimeAgent") {
          console.log("Sorry, I could not understand your event time. Please try to rephrase, e.g., 'from June 1st to June 3rd, all day', 'next Friday 7pm to 10pm', or 'tomorrow evening'.");
        } else {
          console.log("Sorry, there was an error with your input. Please try again.");
        }
      }
    }
  }
  workflowState.status = "Ready";
  console.log(
    "All required information for planning event has been collected!"
  );
  console.log("Final Data:", JSON.stringify(workflowState.fields, null, 2));
  return true;
}

module.exports = {
  runPlanEventWorkflow,
  detectIntent,
  intentToWorkflowKey,
  intentToDisplayName,
}; 