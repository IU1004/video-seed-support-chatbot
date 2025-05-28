// state.js
function getInitialState() {
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

function getCurrentWorkflow(state) {
  return state.find((w) => w.status === "Ongoing");
}

function setWorkflowStatus(state, workflowKey, status) {
  state.forEach((w) => {
    w.status = w.workflow === workflowKey ? status : "Stop";
  });
}

module.exports = { getInitialState, getCurrentWorkflow, setWorkflowStatus }; 