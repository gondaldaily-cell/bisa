// Three short, everyday scenarios for Indonesian learners.
// Each scenario is a single-turn prompt seed: the tutor's opening line and
// the situation, so every practice turn can be sent as one generateContent()
// call (on-device inference supports single-turn text only — see README).
export const LESSONS = [
  {
    id: "cafe",
    title: "☕ At a café",
    goal: "Order food and drinks politely, ask about prices, and say thank you.",
    opener:
      "Hello! Welcome to our café. What would you like to order today? We have coffee, tea, and fresh juice.",
  },
  {
    id: "introduce",
    title: "👋 Introducing yourself",
    goal: "Introduce yourself, talk about where you are from and what you like.",
    opener:
      "Hi, nice to meet you! My name is Alex. Where are you from, and what do you like to do in your free time?",
  },
  {
    id: "interview",
    title: "💼 Job interview",
    goal: "Answer simple interview questions about your experience and strengths.",
    opener:
      "Good morning, thank you for coming. Please tell me a little about yourself and why you want this job.",
  },
];
