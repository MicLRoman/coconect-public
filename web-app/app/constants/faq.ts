export type FaqEntry = {
  question: string;
  answer: string;
};

// Single source of truth for the landing FAQ — consumed both by the rendered
// accordion and by the FAQPage JSON-LD structured data in app/page.tsx.
export const FAQ_ITEMS: FaqEntry[] = [
  {
    question: "What is Coconect?",
    answer:
      "Coconect is a new way to meet ambitious people in real life. We match founders, operators, investors, entrepreneurs, and young professionals into small Saturday dinners based on who they are, what they're building, and who they actually want to meet. This is a new approach to networking.",
  },
  {
    question: "Who is this platform for?",
    answer:
      "Founders, operators, builders, developers, freelancers, and investors, mostly between 18 and 35. If you're ambitious, hungry to grow, and tired of boring networking, this is for you.",
  },
  {
    question: "How does the matching actually work?",
    answer:
      "Our 5-minute onboarding asks what inspires you, what you're building, your industry, your budget per dinner, and which Saturdays you're free. Then, every Tuesday, our AI matches you into a table of six or seven people based on shared interests, similar stage, and what each person brings to the table.",
  },
  {
    question: "What happens at a Coconect event?",
    answer:
      "You show up to a dinner with six or seven people, every Saturday. There is no stage, no panel, no forced pitching, and no awkward networking games. We handle the group, the table, and the logistics. You just arrive and talk to people who were intentionally matched with you. It's dinners for now; activities like padel, sauna, golf, and more are on the way.",
  },
  {
    question:
      "Does the membership cover the dinner cost or do I pay separately?",
    answer:
      "Separately. The membership covers matching, curation and the platform. The restaurant bill you pay for yourself. We match you into dinners that fit your budget, so everyone feels comfortable.",
  },
  {
    question:
      "What happens after the event, and do I stay connected with people?",
    answer:
      "Yes. Coconect isn't just about one dinner, it's about building real relationships over time. After each event, you can stay connected with your table, follow what people are working on, and get matched with them again later through future events or the quarterly Inner Circle.",
  },
  {
    question: "Is this a dating app?",
    answer:
      "No. Coconect is built for professional relationships, not dating. The goal is to meet people who can become part of your real network: collaborators, friends, future partners, mentors, clients, or just people who understand what you're building.",
  },
  {
    question: "What if I don't click with anyone at the table?",
    answer:
      "It happens maybe one in ten dinners. Tell us after what happened; it makes our algorithm better. Next Saturday you will meet different people.",
  },
  {
    question: "What if I want to skip a week?",
    answer:
      "Just pause your plan with one tap. No survey, no hassle. If you're traveling, you can pause for a month and resume whenever you're back.",
  },
  {
    question: "Where is Coconect available?",
    answer:
      "We're launching in Toronto first. More cities are coming based on waitlist demand. Join the waitlist and help us bring Coconect to your city.",
  },
];
