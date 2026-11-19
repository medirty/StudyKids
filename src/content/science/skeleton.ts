/**
 * Skeleton Builder content (Grade 3). A friendly cartoon skeleton seen from the front.
 * Names follow a UK primary textbook ("backbone", "kneecap", "thigh bone").
 *
 * The shoulder blades are left out on purpose: from the front they are hidden behind the ribs,
 * so a child could not find them in the picture. They get a note in Explore instead.
 */
export const BONE_IDS = [
  'skull', 'jaw', 'spine', 'ribs', 'collarbone', 'pelvis',
  'armBones', 'handBones', 'thighBone', 'kneecap', 'shinBones', 'footBones',
] as const;
export type BoneId = (typeof BONE_IDS)[number];

export interface Bone {
  /** Spoken, and used in "Tap the backbone". */
  name: string;
  /** Another name children may meet, shown in brackets in Explore ("backbone (spine)"). */
  aka?: string;
  /** "These are the ribs" (true) or "This is the skull" (false). */
  isPlural: boolean;
  /** What the bone does: shown in Explore and used as the hint and the explanation. */
  job: string;
}

export const BONES: Record<BoneId, Bone> = {
  skull: { name: 'skull', isPlural: false, job: 'The skull protects our brain.' },
  jaw: { name: 'jaw', isPlural: false, job: 'The jaw lets us chew and talk.' },
  spine: { name: 'backbone', aka: 'spine', isPlural: false, job: 'The backbone holds us up and lets us bend.' },
  ribs: { name: 'ribs', isPlural: true, job: 'The ribs protect our heart and lungs.' },
  collarbone: { name: 'collarbone', isPlural: false, job: 'The collarbone joins our shoulder to our chest.' },
  pelvis: { name: 'pelvis', aka: 'hips', isPlural: false, job: 'The pelvis supports our body and joins it to our legs.' },
  armBones: { name: 'arm bones', isPlural: true, job: 'Our arm bones work with muscles to help us lift and reach.' },
  handBones: { name: 'hand bones', isPlural: true, job: 'Our hand bones work with muscles to help us grip and write.' },
  thighBone: { name: 'thigh bone', aka: 'femur', isPlural: false, job: 'The thigh bone is the longest bone in our body. It works with muscles to help us walk and run.' },
  kneecap: { name: 'kneecap', isPlural: false, job: 'The kneecap protects our knee when it bends.' },
  shinBones: { name: 'shin bones', isPlural: true, job: 'Our shin bones work with muscles to help us walk, run and jump.' },
  footBones: { name: 'foot bones', isPlural: true, job: 'Our foot bones help us stand and balance.' },
};

/** "Backbone (spine)" for Explore; just the name when there is no other name. */
export function displayName(id: BoneId): string {
  const b = BONES[id];
  const text = b.aka ? `${b.name} (${b.aka})` : b.name;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "This is the skull." / "These are the ribs." */
export function introSentence(id: BoneId): string {
  const b = BONES[id];
  return `${b.isPlural ? 'These are' : 'This is'} the ${b.name}.`;
}

export interface JobQuestion {
  /** Built around one fact that only this bone has, so exactly one bone is right. */
  prompt: string;
  /** A location clue shown after a try. It does not repeat the question or name the bone. */
  hint: string;
  /** The bones that are right. The question never names them. */
  accepts: readonly BoneId[];
}

/** One job question per bone, each answered by tapping the picture. */
export const JOB_QUESTIONS: Record<BoneId, JobQuestion> = {
  skull: { prompt: 'Which bone protects the brain?', hint: 'Look at the top of the head.', accepts: ['skull'] },
  jaw: { prompt: 'Which bone lets us chew and talk?', hint: 'Look at the bottom of the face, where the teeth are.', accepts: ['jaw'] },
  spine: { prompt: 'Which bone runs down our back and lets us bend and twist?', hint: 'Look at the middle of your back.', accepts: ['spine'] },
  ribs: { prompt: 'Which bones protect the heart and lungs?', hint: 'Look at the sides of your chest.', accepts: ['ribs'] },
  collarbone: { prompt: 'Which bone lies across the top of our chest, from our shoulder to the middle?', hint: 'Look just under your neck, near your shoulders.', accepts: ['collarbone'] },
  pelvis: { prompt: 'Which wide, bowl-shaped bone holds up our tummy?', hint: 'Look below the ribs, in the middle of the body.', accepts: ['pelvis'] },
  armBones: { prompt: 'Which bones are between our shoulder and our wrist?', hint: 'Look at the long bones that hang down from the shoulders.', accepts: ['armBones'] },
  handBones: { prompt: 'Which bones are in our fingers and palms?', hint: 'Look at the very ends of the arms.', accepts: ['handBones'] },
  thighBone: { prompt: 'Which is the longest bone in our body?', hint: 'Look at the top part of the leg, above the knee.', accepts: ['thighBone'] },
  kneecap: { prompt: 'Which bone protects our knee when it bends?', hint: 'Look at the middle of the leg, where it bends.', accepts: ['kneecap'] },
  shinBones: { prompt: 'Which bones are between our knee and our foot?', hint: 'Look at the lower part of the leg, below the knee.', accepts: ['shinBones'] },
  footBones: { prompt: 'Which bones are at the bottom of our legs and help us balance?', hint: 'Look at the very bottom of the picture.', accepts: ['footBones'] },
};

export const MOVE_NOTE = 'Bones work with muscles to help us move.';
export const SHOULDER_BLADE_NOTE = 'Our shoulder blades are on our back, so we cannot see them from the front.';
