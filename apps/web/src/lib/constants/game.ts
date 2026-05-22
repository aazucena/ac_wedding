// lib/constants/game.ts
// Shared source of truth for the "Find a Guest" reception icebreaker.
// Used by: print/game.astro (card layout) · game/dashboard.astro (reference panel).

export interface GameSquare {
  prompt: string;
  hint?: string;
  star?: boolean; // highlighted squares on the printed card
}

export const GAME_SQUARES: GameSquare[] = [
  {
    prompt: "Knows how the couple first met",
    hint: "Ask them to tell the story",
    star: true,
  },
  { prompt: "Knows groom from his hometown", hint: "OG crew", star: true },
  {
    prompt: "Has cried at a wedding before",
    hint: "No shame — it happens to everyone",
  },
  {
    prompt: "Can explain the 13 arras coins",
    hint: "Filipino Catholic tradition",
  },
  { prompt: "Cooked adobo from scratch", hint: "Chicken or pork?" },
  { prompt: "Classmate of the bride or groom", hint: "Which school?" },
  {
    prompt: "Knows their dating start year",
    hint: "No guessing — must be certain",
    star: true,
  },
  { prompt: "Says congrats in 3+ languages", hint: "Maligayang bati!" },
  {
    prompt: "Was there for their big moment",
    hint: "They'll know which moment",
  },
  {
    prompt: "Is the best singer in the room",
    hint: "They must sing a line to prove it",
  },
  { prompt: "Anniversary falls in September", hint: "September solidarity" },
  { prompt: "Flew in just for this wedding", hint: "That's dedication" },
  {
    prompt: 'Does the "Tita/Tito" lip point',
    hint: "Pointing with lips — no hands!",
  },
  {
    prompt: "Has Tupperware in bag or car",
    hint: 'Filipino "Sharon" takeout spirit',
  },
  {
    prompt: "Has a photo of a napping guest",
    hint: "Check the barkada group chats!",
  },
];
