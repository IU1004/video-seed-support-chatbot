// workflow.js
const { planEventAgents } = require('./agents');
const { extractFields } = require('./extract');
const { getEmojiForContext } = require('./emoji');
const { getCurrentWorkflow, setWorkflowStatus } = require('./state');
const readlineSync = require('readline-sync');

async function detectIntent(userInput) {
  const { extractFields } = require('./extract');
  const systemPrompt = 'Classify the user intent as one of: "plan event", "discover event", "go live streaming". Be flexible - accept variations like "plan an event" or "I want to plan event". Reply with only the exact intent phrase.';
  const result = await extractFields(systemPrompt, userInput);
  // Normalize the result to match expected intents
  const normalized = (typeof result === 'string' ? result : '').toLowerCase();
  if (normalized.includes('plan')) return 'plan event';
  if (normalized.includes('discover')) return 'discover event';
  if (normalized.includes('live') || normalized.includes('stream')) return 'go live streaming';
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

async function runPlanEventWorkflow(state, workflowState) {
  for (const agent of planEventAgents) {
    let agentComplete = false;
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
            setWorkflowStatus(state, intentToWorkflowKey(intent), "Ongoing");
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
          if (confirmInput.trim().toLowerCase().startsWith("y")) {
            agentComplete = true;
            break;
          } else if (confirmInput.trim().toLowerCase() === "exit") {
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