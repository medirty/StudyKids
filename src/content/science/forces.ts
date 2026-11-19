export type ForceKind = 'push' | 'pull';

export interface ForceScene {
  id: string;
  /** Shown and spoken. Written so the verb is plain but the answer is not simply announced where avoidable. */
  text: string;
  emoji: string;
  answer: ForceKind;
}

/** The rule, used as the Challenge hint and in every explanation. */
export const FORCE_HINT = 'A push moves something away from you. A pull moves it towards you.';

/**
 * Everyday scenes a six-year-old knows. Each is clearly a push or a pull from the person's side:
 * nothing here depends on which side of a door you stand, or on a mix of both.
 */
export const FORCE_SCENES: readonly ForceScene[] = [
  { id: 'kick-ball', text: 'Kick a ball', emoji: '⚽', answer: 'push' },
  { id: 'push-swing', text: "Get a friend's swing going", emoji: '🧒', answer: 'push' },
  { id: 'push-pram', text: 'Move a pram along in front of you', emoji: '👶', answer: 'push' },
  { id: 'push-trolley', text: 'Move a shopping trolley along the aisle', emoji: '🛒', answer: 'push' },
  { id: 'press-doorbell', text: 'Press a doorbell', emoji: '🔔', answer: 'push' },
  { id: 'push-door-shut', text: 'Close a door with your hands flat on it', emoji: '🚪', answer: 'push' },
  { id: 'throw-ball', text: 'Throw a ball to a friend', emoji: '⚾', answer: 'push' },
  { id: 'push-toy-car', text: 'Send a toy car across the floor', emoji: '🚗', answer: 'push' },
  { id: 'open-drawer', text: 'Open a drawer', emoji: '🗄️', answer: 'pull' },
  { id: 'tug-of-war', text: 'Play tug of war', emoji: '🧑‍🤝‍🧑', answer: 'pull' },
  { id: 'pull-carrot', text: 'Take a carrot out of the ground', emoji: '🥕', answer: 'pull' },
  { id: 'reel-fish', text: 'Bring a fish in with a fishing rod', emoji: '🎣', answer: 'pull' },
  { id: 'sledge-up-hill', text: 'Bring a sledge up the hill by its rope', emoji: '🛷', answer: 'pull' },
  { id: 'kite-down', text: 'Bring a kite down by its string', emoji: '🪁', answer: 'pull' },
  { id: 'drag-suitcase', text: 'Bring your suitcase along on its wheels', emoji: '🧳', answer: 'pull' },
  { id: 'take-tissue', text: 'Take a tissue out of the box', emoji: '🤧', answer: 'pull' },
];
