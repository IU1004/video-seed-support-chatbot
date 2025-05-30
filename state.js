// state.js

function createInitialUserState() {
  return [
    {
      workflow: "planEvent",
      status: "Stop",
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
      },
    },
    {
      workflow: "discoverEvent",
      status: "Stop",
      fields: {},
    },
    {
      workflow: "liveStreaming",
      status: "Stop",
      fields: {},
    },
  ];
}

// All user states in memory (for demo; use a DB for production)
const allUserStates = {};

function getOrCreateUserState(userId) {
  if (!allUserStates[userId]) {
    allUserStates[userId] = createInitialUserState();
  }
  return allUserStates[userId];
}

function getCurrentWorkflow(userState) {
  return userState.find((w) => w.status === "Ongoing");
}

function setWorkflowStatus(userState, workflowKey, status) {
  userState.forEach((w) => {
    w.status = w.workflow === workflowKey ? status : "Stop";
  });
}

module.exports = { getOrCreateUserState, getCurrentWorkflow, setWorkflowStatus }; 