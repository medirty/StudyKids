/** Three-sound words built only from simple single-letter sounds. One emoji each, and it must show the word. */
export interface CvcWord { word: string; emoji: string }

export const CVC_WORDS: readonly CvcWord[] = [
  { word: 'cat', emoji: '🐱' }, { word: 'dog', emoji: '🐶' }, { word: 'sun', emoji: '☀️' },
  { word: 'pig', emoji: '🐷' }, { word: 'bed', emoji: '🛏️' }, { word: 'hat', emoji: '🎩' },
  { word: 'map', emoji: '🗺️' }, { word: 'cup', emoji: '☕' }, { word: 'fox', emoji: '🦊' },
  { word: 'bus', emoji: '🚌' }, { word: 'net', emoji: '🥅' }, { word: 'jet', emoji: '✈️' },
  { word: 'bat', emoji: '🦇' }, { word: 'hen', emoji: '🐔' }, { word: 'box', emoji: '📦' },
  { word: 'van', emoji: '🚐' }, { word: 'web', emoji: '🕸️' }, { word: 'pan', emoji: '🍳' },
  { word: 'log', emoji: '🪵' }, { word: 'red', emoji: '🔴' }, { word: 'pen', emoji: '🖊️' },
  { word: 'bug', emoji: '🐛' }, { word: 'tub', emoji: '🛁' }, { word: 'pin', emoji: '📌' },
  { word: 'kid', emoji: '🧒' }, { word: 'nut', emoji: '🥜' }, { word: 'rat', emoji: '🐀' },
  { word: 'bin', emoji: '🗑️' }, { word: 'cap', emoji: '🧢' }, { word: 'leg', emoji: '🦵' },
];
