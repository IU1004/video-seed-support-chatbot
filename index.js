require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');
const readlineSync = require('readline-sync');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// --- Intent Detection ---
async function detectIntent(userInput) {
  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'Classify the user intent as one of: "plan event", "discover event", "go live streaming". Reply with only the intent.' },
      { role: 'user', content: userInput }
    ],
    temperature: 0,
  });
  return completion.data.choices[0].message.content.trim().toLowerCase();
}

// --- Plan Event Sub-Agents (6 logical groups) ---
const planEventAgents = [
  {
    name: 'TitleAndDescriptionAgent',
    fields: ['eventTitle', 'eventDescription'],
    prompt: 'Please provide the event title and a short description.',
    extractSystem: 'Extract the event title and description from the user input. Reply as JSON: {"eventTitle": "...", "eventDescription": "..."}',
    validate: (v) => !!v.eventTitle && !!v.eventDescription,
    confirm: (v) => `Event Title: ${v.eventTitle}\nEvent Description: ${v.eventDescription}\nIs this correct? (yes/no)`
  },
  {
    name: 'TimeAgent',
    fields: ['startTime', 'endTime'],
    prompt: 'What is the start and end time for your event?',
    extractSystem: 'Extract the start and end time from the user input. Reply as JSON: {"startTime": "...", "endTime": "..."}',
    validate: (v) => !!v.startTime && !!v.endTime,
    confirm: (v) => `Start Time: ${v.startTime}\nEnd Time: ${v.endTime}\nIs this correct? (yes/no)`
  },
  {
    name: 'TicketAgent',
    fields: ['ticketQuantity', 'ticketPrice'],
    prompt: 'How many tickets will be available, and what is the price per ticket? (Say "free" if no charge)',
    extractSystem: 'Extract the ticket quantity and price from the user input. Reply as JSON: {"ticketQuantity": "...", "ticketPrice": "..."}',
    validate: (v) => !!v.ticketQuantity && v.ticketPrice !== undefined && v.ticketPrice !== null,
    confirm: (v) => `Ticket Quantity: ${v.ticketQuantity}\nTicket Price: ${v.ticketPrice}\nIs this correct? (yes/no)`
  },
  {
    name: 'VenueAgent',
    fields: ['venue'],
    prompt: 'Where will the event take place? Please provide the venue or location.',
    extractSystem: 'Extract the venue/location from the user input. Reply as JSON: {"venue": "..."}',
    validate: (v) => !!v.venue,
    confirm: (v) => `Venue: ${v.venue}\nIs this correct? (yes/no)`
  },
  {
    name: 'BudgetAgent',
    fields: ['budget'],
    prompt: 'What is your budget for the event?',
    extractSystem: 'Extract the budget from the user input. Reply as JSON: {"budget": "..."}',
    validate: (v) => !!v.budget,
    confirm: (v) => `Budget: ${v.budget}\nIs this correct? (yes/no)`
  },
  {
    name: 'NftTicketingAndPaymentAgent',
    fields: ['nftTicketingAndPayment'],
    prompt: 'Would you like to set up NFT ticketing and payment? Please provide details.',
    extractSystem: 'Extract NFT ticketing and payment setup info. Reply as JSON: {"nftTicketingAndPayment": "..."}',
    validate: (v) => !!v.nftTicketingAndPayment,
    confirm: (v) => `NFT Ticketing & Payment: ${v.nftTicketingAndPayment}\nIs this correct? (yes/no)`
  },
];

// --- State Management ---
function getInitialState() {
  return [
    {
      workflow: 'planEvent',
      status: 'Stop',
      fields: {
        eventTitle: null,
        eventDescription: null,
        startTime: null,
        endTime: null,
        ticketQuantity: null,
        ticketPrice: null,
        venue: null,
        budget: null,
        nftTicketingAndPayment: null,
      }
    },
    {
      workflow: 'discoverEvent',
      status: 'Stop',
      fields: {}
    },
    {
      workflow: 'liveStreaming',
      status: 'Stop',
      fields: {}
    }
  ];
}

function getCurrentWorkflow(state) {
  return state.find((w) => w.status === 'Ongoing');
}

function setWorkflowStatus(state, workflowKey, status) {
  state.forEach((w) => {
    w.status = (w.workflow === workflowKey) ? status : 'Stop';
  });
}

// --- OpenAI Extraction Helper ---
async function extractFields(systemPrompt, userInput) {
  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput },
    ],
    temperature: 0.3,
  });
  try {
    return JSON.parse(completion.data.choices[0].message.content);
  } catch {
    return {};
  }
}

// --- Main Agent Runner for Plan Event ---
async function runPlanEventWorkflow(state, workflowState) {
  for (const agent of planEventAgents) {
    while (true) {
      // Prompt user for the required fields
      console.log(agent.prompt);
      const userInput = readlineSync.question('You: ');
      if (userInput.trim().toLowerCase() === 'exit') return false;
      // Allow parent agent to check for intent switch
      const intent = await detectIntent(userInput);
      if (intent !== 'plan event') {
        setWorkflowStatus(state, intentToWorkflowKey(intent), 'Ongoing');
        console.log(`Switching to ${intentToDisplayName(intent)}...`);
        return 'switch';
      }
      // Extract fields
      const extracted = await extractFields(agent.extractSystem, userInput);
      if (agent.validate(extracted)) {
        // Confirm with user
        console.log(agent.confirm(extracted));
        const confirmInput = readlineSync.question('You: ');
        if (confirmInput.trim().toLowerCase().startsWith('y')) {
          for (const f of agent.fields) {
            workflowState.fields[f] = extracted[f];
          }
          break;
        } else {
          console.log('Let\'s try again.');
        }
      } else {
        console.log('Sorry, I could not understand. Please try again.');
      }
    }
  }
  workflowState.status = 'Ready';
  console.log('All required information for planning event has been collected!');
  console.log('Final Data:', JSON.stringify(workflowState.fields, null, 2));
  return true;
}

function intentToWorkflowKey(intent) {
  if (intent === 'plan event') return 'planEvent';
  if (intent === 'discover event') return 'discoverEvent';
  if (intent === 'go live streaming') return 'liveStreaming';
  return null;
}
function intentToDisplayName(intent) {
  if (intent === 'plan event') return 'Plan Event';
  if (intent === 'discover event') return 'Discover Event';
  if (intent === 'go live streaming') return 'Go Live Streaming';
  return intent;
}

// --- Main Chatbot Loop ---
async function main() {
  let state = getInitialState();
  console.log('Chatbot started. Type your message and press Enter. Type "exit" to quit.');
  while (true) {
    const current = getCurrentWorkflow(state);
    if (!current) {
      // Parent agent: ask for main option
      console.log('What would you like to do? (Plan Event / Discover Event / Go Live Streaming)');
      const userInput = readlineSync.question('You: ');
      if (userInput.trim().toLowerCase() === 'exit') break;
      const intent = await detectIntent(userInput);
      const workflowKey = intentToWorkflowKey(intent);
      if (workflowKey) {
        setWorkflowStatus(state, workflowKey, 'Ongoing');
      } else {
        console.log('Sorry, I could not understand your intent. Please try again.');
        continue;
      }
    }
    // Run the workflow
    if (current.workflow === 'planEvent') {
      const result = await runPlanEventWorkflow(state, current);
      if (result === false) break;
      if (result === 'switch') continue;
      // After completion, reset to parent agent
      setWorkflowStatus(state, current.workflow, 'Stop');
    } else if (current.workflow === 'discoverEvent') {
      console.log('Discover Event is not implemented yet. Returning to main menu.');
      setWorkflowStatus(state, current.workflow, 'Stop');
      continue;
    } else if (current.workflow === 'liveStreaming') {
      console.log('Live Streaming is not implemented yet. Returning to main menu.');
      setWorkflowStatus(state, current.workflow, 'Stop');
      continue;
    }
  }
  console.log('Chatbot ended.');
}

main(); 