// agents.js
const planEventAgents = [
  {
    name: "TitleAndDescriptionAgent",
    fields: ["eventTitle", "eventDescription"],
    prompt: "Please provide the event title and a short description.",
    extractSystem:
      'Given the current and previous user messages, extract the event title and description as creatively and flexibly as possible, even if the user is informal or provides partial info. Reply as JSON: {"eventTitle": "...", "eventDescription": "..."}',
    validate: (v) => !!v.eventTitle && !!v.eventDescription,
    confirm: (v) =>
      `Event Title: ${v.eventTitle}\nEvent Description: ${v.eventDescription}\nIs this correct? (yes/no)`,
  },
  {
    name: "TimeAgent",
    fields: ["startTime", "endTime"],
    prompt: "What is the start and end time for your event? (To ensure accuracy, use correct date and time format, e.g., '2025-06-01 18:00' or '2025-06-01 18:00 to 2025-06-01 20:00')",
    extractSystem:
      'Given the current and previous user messages, extract the start and end time for the event. Be extremely flexible and creative: accept any natural language, creative, or ambiguous date/time expressions (e.g., "all day", "from 1st June to 3rd June", "for the whole weekend", etc.). Do your best to infer reasonable start and end times, and if the user says "all day" or similar, use 00:00 to 23:59 for that day. Reply as JSON: {"startTime": "...", "endTime": "..."}. If only one is provided, leave the other as null.',
    validate: (v) => {
      if (!v.startTime || !v.endTime) return false;
      const start = new Date(v.startTime);
      const end = new Date(v.endTime);
      const now = new Date();
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      if (start <= now || end <= now) return false;
      if (end <= start) return false;
      return true;
    },
    confirm: (v) =>
      `Start Time: ${v.startTime}\nEnd Time: ${v.endTime}\nIs this correct? (yes/no)`
  },
  {
    name: "TicketAgent",
    fields: ["ticketQuantity", "ticketPrice"],
    prompt:
      'How many tickets will be available, and what is the price per ticket? (Say "free" if no charge)',
    extractSystem:
      'Given the current and previous user messages, extract the ticket quantity and price as flexibly as possible, even if the user is informal, creative, or provides partial info. Reply as JSON: {"ticketQuantity": "...", "ticketPrice": "..."}',
    validate: (v) => {
      // Validate ticketQuantity: must be a positive integer
      const quantity = parseInt(v.ticketQuantity, 10);
      const validQuantity = Number.isInteger(quantity) && quantity > 0;
      // Validate ticketPrice: must be a positive number, or 'free', or a string like '$30' or '30'
      const price = v.ticketPrice;
      let validPrice = false;
      if (typeof price === 'string') {
        const trimmed = price.trim().toLowerCase();
        if (trimmed === 'free') {
          validPrice = true;
        } else if (/^\$?\d+(\.\d{1,2})?$/.test(trimmed.replace(/\s/g, ''))) {
          validPrice = parseFloat(trimmed.replace(/[^\d.]/g, '')) > 0;
        }
      } else if (typeof price === 'number') {
        validPrice = price > 0;
      }
      return validQuantity && validPrice;
    },
    confirm: (v) =>
      `Ticket Quantity: ${v.ticketQuantity}\nTicket Price: ${v.ticketPrice}\nIs this correct? (yes/no)`,
  },
  {
    name: "VenueAgent",
    fields: ["venue"],
    prompt:
      "Where will the event take place? Please provide the venue or location.",
    extractSystem:
      'Given the current and previous user messages, extract the venue/location as flexibly as possible, even if the user is informal, creative, or provides partial info. Reply as JSON: {"venue": "..."}',
    validate: (v) => !!v.venue,
    confirm: (v) => `Venue: ${v.venue}\nIs this correct? (yes/no)`,
  },
  {
    name: "BudgetAgent",
    fields: ["budget"],
    prompt: "What is your budget for the event?",
    extractSystem:
      'Given the current and previous user messages, extract the budget as flexibly as possible, even if the user is informal, creative, or provides partial info. Reply as JSON: {"budget": "..."}',
    validate: (v) => !!v.budget,
    confirm: (v) => `Budget: ${v.budget}\nIs this correct? (yes/no)`,
  },
  {
    name: "ImageAgent",
    fields: ["wantsImage", "imageDescription", "generatedImageUrl"],
    prompt:
      "Would you like to create an image for your event using AI? (yes/no)",
    extractSystem:
      'Given the current and previous user messages, extract whether the user wants to generate an image (yes/no). If yes, ask for a description for the image. If the user provides a description and presses enter, proceed to generate the image. Reply as JSON: {"wantsImage": "yes/no", "imageDescription": "...", "generatedImageUrl": "..."}',
    validate: (v) => {
      if (v.wantsImage && v.wantsImage.toLowerCase() === 'yes') {
        return !!v.imageDescription && !!v.generatedImageUrl;
      }
      return v.wantsImage && v.wantsImage.toLowerCase() === 'no';
    },
    confirm: (v) => {
      if (v.wantsImage && v.wantsImage.toLowerCase() === 'yes') {
        return `AI Image Description: ${v.imageDescription}\nImage generated: ${v.generatedImageUrl ? v.generatedImageUrl : 'Not generated yet.'}\nIs this correct? (yes/no)`;
      }
      return `No AI image will be generated. Is this correct? (yes/no)`;
    },
  },
  {
    name: "NftTicketingAndPaymentAgent",
    fields: ["nftTicketingAndPayment"],
    prompt:
      "Would you like to set up NFT ticketing and payment? Please provide details.",
    extractSystem:
      'Given the current and previous user messages, extract NFT ticketing and payment setup info as flexibly as possible, even if the user is informal, creative, or provides partial info. Reply as JSON: {"nftTicketingAndPayment": "..."}',
    validate: (v) => !!v.nftTicketingAndPayment,
    confirm: (v) =>
      `NFT Ticketing & Payment: ${v.nftTicketingAndPayment}\nIs this correct? (yes/no)`,
  },
];

module.exports = { planEventAgents }; 