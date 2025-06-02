// main.js
const {
  getInitialState,
  getCurrentWorkflow,
  setWorkflowStatus,
  getOrCreateUserState,
} = require("./state");
const {
  runPlanEventWorkflow,
  detectIntent,
  intentToWorkflowKey,
} = require("./workflow");
const { getEmojiForContext } = require("./emoji");
const readlineSync = require("readline-sync");
const { extractFields } = require("./extract");

// --- Add summarize utility ---
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function summarizeText(text) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "Summarize the following event description in 2-3 sentences, focusing on what makes it interesting or unique.",
      },
      { role: "user", content: text },
    ],
    temperature: 0.4,
  });
  return completion.choices[0].message.content.trim();
}

// --- Sample Festigo events ---
const festigoEvents = [
  {
    id: "E001",
    title: "Sunset Beach Music Festival",
    description:
      "Join us for an unforgettable evening of live music, food trucks, and beach games as the sun sets over the ocean. Featuring top local bands and a vibrant crowd, this festival is perfect for music lovers and families alike. Enjoy a variety of cuisines, fun activities for all ages, and a breathtaking sunset view.",
    url: "https://festigo.com/events/sunset-beach-music-festival",
  },
  {
    id: "E002",
    title: "Downtown Art Walk",
    description:
      "Explore the city's creative side with our monthly Downtown Art Walk. Stroll through galleries, meet local artists, and enjoy live painting demonstrations. Food stalls and pop-up shops line the streets, making this a must-visit for art enthusiasts and casual visitors alike.",
    url: "https://festigo.com/events/downtown-art-walk",
  },
  {
    id: "E003",
    title: "Tech Innovators Conference",
    description:
      "A gathering of the brightest minds in technology, featuring keynote speeches, hands-on workshops, and networking opportunities. Whether you're a startup founder, developer, or tech enthusiast, this conference offers insights into the latest trends and innovations.",
    url: "https://festigo.com/events/tech-innovators-conference",
  },
];

async function getParentAgentPrompt() {
  // Use a static prompt string for emoji generation and display
  const promptText =
    "Welcome! How can I assist you today? Would you like to plan an event, discover exciting events, or go live streaming? Just let me know your preference, and I'll guide you through the process.";
  const parentEmoji = await getEmojiForContext(promptText);
  return `${parentEmoji} ${promptText}`;
}

// --- Add Festigo event suggestion flow ---
async function festigoSuggestionFlow() {
  festigoEvents.forEach((ev, idx) => {
    console.log(`${idx + 1}. ${ev.title}`);
  });
  // Ask which event
  const whichPrompt =
    "Which event are you interested in? (Type the number or event title)";
  console.log(whichPrompt);
  let eventInput = readlineSync.question("You: ").trim();
  let selectedEvent = null;
  // Try to match by number
  const num = parseInt(eventInput, 10);
  if (!isNaN(num) && num >= 1 && num <= festigoEvents.length) {
    selectedEvent = festigoEvents[num - 1];
  } else {
    // Try to match by title (case-insensitive)
    selectedEvent = festigoEvents.find(
      (ev) => ev.title.toLowerCase() === eventInput.toLowerCase()
    );
  }
  if (!selectedEvent) {
    console.log("Sorry, I couldn't find that event. Returning to main menu.");
    return false;
  }
  // Summarize description
  console.log("Summarizing event description, please wait...");
  const summary = await summarizeText(selectedEvent.description);
  console.log(`\n${selectedEvent.title}\n${summary}\n`);
  // Ask if want detailed description
  const detailPrompt =
    "Would you like to see the detailed description and be redirected to the event page? (yes/no)";
  console.log(detailPrompt);
  let detailAnswer = readlineSync.question("You: ").trim().toLowerCase();
  if (detailAnswer === "yes" || detailAnswer === "y") {
    console.log(`Redirect to URL... ${selectedEvent.url}`);
    return true;
  } else {
    // Continue to main workflow
    return false;
  }
}

async function main() {
  let parentPrompt = await getParentAgentPrompt();
  console.log(
    'Chatbot started. Type your message and press Enter. Type "exit" to quit.'
  );
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
      // --- Festigo suggestion flow ---
      const festigoHandled = await festigoSuggestionFlow();
      if (festigoHandled) continue;
      // --- End Festigo suggestion flow ---
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
      console.log(
        "Discover Event is not implemented yet. Returning to main menu."
      );
      setWorkflowStatus(userState, current.workflow, "Stop");
      continue;
    } else if (current.workflow === "liveStreaming") {
      console.log(
        "Live Streaming is not implemented yet. Returning to main menu."
      );
      setWorkflowStatus(userState, current.workflow, "Stop");
      continue;
    }
  }
  console.log("Chatbot ended.");
}

main();
