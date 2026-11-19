// Original stories for Story Time (Grade 3 reading comprehension). British spelling.
// Dialogue uses single quotes (‘…’) so quoted evidence reads cleanly inside "…".
// Every question's `evidence` is one whole sentence copied verbatim from a paragraph.

export type StoryQuestionKind = 'who' | 'what' | 'why' | 'order';

export interface StoryQuestionData {
  q: string;
  /** Three choices, the answer among them. The toy shuffles them. */
  options: [string, string, string];
  answer: string;
  kind: StoryQuestionKind;
  /** The sentence in the story that proves the answer. */
  evidence: string;
}

export interface Story {
  id: string;
  title: string;
  emoji: string;
  paragraphs: string[];
  questions: StoryQuestionData[];
}

export const STORIES: readonly Story[] = [
  {
    id: 'kite',
    title: 'The Lost Kite',
    emoji: '🪁',
    paragraphs: [
      'On a windy Saturday, Ravi took his new red kite to the park with his sister Ayu. The kite flew higher than the trees, and Ravi laughed as it danced in the sky.',
      'Suddenly, a strong gust pulled the string out of his hand. The kite floated away and landed in a tall oak tree. Ravi felt like crying because he could not reach it.',
      'Ayu had a good idea. She ran to find Mr Okafor, the park keeper. Mr Okafor fetched a long ladder from his shed and climbed up carefully. Soon he passed the kite down to Ravi. After that, Ravi tied the string around his wrist so his kite could never fly away again.',
    ],
    questions: [
      {
        q: 'What colour was Ravi’s kite?',
        options: ['Red', 'Blue', 'Yellow'], answer: 'Red', kind: 'what',
        evidence: 'On a windy Saturday, Ravi took his new red kite to the park with his sister Ayu.',
      },
      {
        q: 'Where did the kite land?',
        options: ['In a tall oak tree', 'In the duck pond', 'On a shed roof'], answer: 'In a tall oak tree', kind: 'what',
        evidence: 'The kite floated away and landed in a tall oak tree.',
      },
      {
        q: 'Why did Ravi feel like crying?',
        options: ['He could not reach his kite', 'He fell over in the park', 'It started to rain'], answer: 'He could not reach his kite', kind: 'why',
        evidence: 'Ravi felt like crying because he could not reach it.',
      },
      {
        q: 'Who climbed the ladder?',
        options: ['Mr Okafor', 'Ayu', 'Ravi'], answer: 'Mr Okafor', kind: 'who',
        evidence: 'Mr Okafor fetched a long ladder from his shed and climbed up carefully.',
      },
      {
        q: 'What happened first?',
        options: ['The kite flew higher than the trees', 'The kite landed in a tree', 'Mr Okafor fetched a ladder'], answer: 'The kite flew higher than the trees', kind: 'order',
        evidence: 'The kite flew higher than the trees, and Ravi laughed as it danced in the sky.',
      },
      {
        q: 'Why did Ravi tie the string around his wrist?',
        options: ['So his kite could never fly away again', 'So the kite would fly higher', 'So Ayu could hold it too'], answer: 'So his kite could never fly away again', kind: 'why',
        evidence: 'After that, Ravi tied the string around his wrist so his kite could never fly away again.',
      },
    ],
  },
  {
    id: 'rainyDay',
    title: 'Mia’s Rainy Day Plan',
    emoji: '🌧️',
    paragraphs: [
      'Mia had planned a picnic on the beach with her cousin Kofi. But when she woke up on Sunday, rain was tapping on the window and the sky was grey.',
      'Mia felt cross because they could not go to the beach. Then she looked at the picnic basket by the door and smiled. ‘Let’s have our picnic indoors!’ she said.',
      'Kofi spread a blue blanket on the living room floor. Mia made cheese sandwiches and cut up a juicy mango. They drew a big yellow sun on paper and stuck it on the wall, so the room felt bright and sunny. They even built a sandcastle out of cushions.',
      'In the afternoon, the rain stopped and a rainbow appeared. ‘This was the best picnic ever,’ laughed Kofi.',
    ],
    questions: [
      {
        q: 'Who was Mia going to have a picnic with?',
        options: ['Her cousin Kofi', 'Her teacher', 'Her grandma'], answer: 'Her cousin Kofi', kind: 'who',
        evidence: 'Mia had planned a picnic on the beach with her cousin Kofi.',
      },
      {
        q: 'Why did Mia feel cross?',
        options: ['They could not go to the beach', 'Kofi ate all the sandwiches', 'She lost the picnic basket'], answer: 'They could not go to the beach', kind: 'why',
        evidence: 'Mia felt cross because they could not go to the beach.',
      },
      {
        q: 'Where did they have their picnic?',
        options: ['On the living room floor', 'On the beach', 'In the garden'], answer: 'On the living room floor', kind: 'what',
        evidence: 'Kofi spread a blue blanket on the living room floor.',
      },
      {
        q: 'Why did they stick a paper sun on the wall?',
        options: ['So the room felt bright and sunny', 'To cover a hole in the wall', 'Because it was Kofi’s birthday'], answer: 'So the room felt bright and sunny', kind: 'why',
        evidence: 'They drew a big yellow sun on paper and stuck it on the wall, so the room felt bright and sunny.',
      },
      {
        q: 'What did they build out of cushions?',
        options: ['A sandcastle', 'A boat', 'A tent'], answer: 'A sandcastle', kind: 'what',
        evidence: 'They even built a sandcastle out of cushions.',
      },
      {
        q: 'What happened first?',
        options: ['Mia woke up and saw the rain', 'Kofi spread a blanket on the floor', 'A rainbow appeared'], answer: 'Mia woke up and saw the rain', kind: 'order',
        evidence: 'But when she woke up on Sunday, rain was tapping on the window and the sky was grey.',
      },
    ],
  },
  {
    id: 'crow',
    title: 'The Clever Crow',
    emoji: '🐦‍⬛',
    paragraphs: [
      'Pip was a young crow who lived in a big tree beside a school. Every day at lunchtime, she watched the children eat in the playground.',
      'One day, a boy called Daniel dropped a piece of bread into a narrow pipe by the wall. Pip hopped over to get it, but the pipe was too thin for her head. She pecked and pecked, but the bread stayed stuck.',
      'Pip did not give up. She flew back to her tree and snapped off a long, thin twig. She poked the twig into the pipe and pulled the bread out bit by bit.',
      'Daniel and his friend Lola had watched the whole thing. ‘What a clever crow!’ they cheered. From then on, they always saved a few crumbs for Pip.',
    ],
    questions: [
      {
        q: 'Where did Pip live?',
        options: ['In a big tree beside a school', 'On a farm', 'Under a bridge'], answer: 'In a big tree beside a school', kind: 'what',
        evidence: 'Pip was a young crow who lived in a big tree beside a school.',
      },
      {
        q: 'Who dropped the bread into the pipe?',
        options: ['Daniel', 'Lola', 'Pip'], answer: 'Daniel', kind: 'who',
        evidence: 'One day, a boy called Daniel dropped a piece of bread into a narrow pipe by the wall.',
      },
      {
        q: 'Why could Pip not reach the bread at first?',
        options: ['The pipe was too thin for her head', 'A cat was watching her', 'The bread was too heavy'], answer: 'The pipe was too thin for her head', kind: 'why',
        evidence: 'Pip hopped over to get it, but the pipe was too thin for her head.',
      },
      {
        q: 'What did Pip use to get the bread out?',
        options: ['A twig', 'Her feet', 'A feather'], answer: 'A twig', kind: 'what',
        evidence: 'She poked the twig into the pipe and pulled the bread out bit by bit.',
      },
      {
        q: 'What happened first?',
        options: ['Daniel dropped some bread', 'Pip snapped off a twig', 'Daniel and Lola cheered'], answer: 'Daniel dropped some bread', kind: 'order',
        evidence: 'One day, a boy called Daniel dropped a piece of bread into a narrow pipe by the wall.',
      },
      {
        q: 'What did the children do from then on?',
        options: ['Saved a few crumbs for Pip', 'Chased Pip away', 'Built Pip a nest'], answer: 'Saved a few crumbs for Pip', kind: 'what',
        evidence: 'From then on, they always saved a few crumbs for Pip.',
      },
    ],
  },
  {
    id: 'garden',
    title: 'Grandpa’s Garden',
    emoji: '🌻',
    paragraphs: [
      'Grandpa Hamid grew tomatoes, beans and sunflowers in his garden. Every weekend, his granddaughter Sofia, who lived next door, came to help him.',
      'One summer, Grandpa hurt his knee and had to rest in his chair for two weeks. Sofia was worried because the plants needed water every day and the weather was very hot.',
      'So Sofia made a plan. Each morning before school, she filled the green watering can and watered every plant. On Saturday, she pulled up the weeds and tied the tall beans to sticks.',
      'When Grandpa’s knee was better, he walked slowly into the garden. The tomatoes were red and the sunflowers were taller than Sofia! Grandpa gave her a big hug and said, ‘You are a wonderful gardener.’',
    ],
    questions: [
      {
        q: 'Who came to help Grandpa every weekend?',
        options: ['His granddaughter Sofia', 'His best friend', 'His son'], answer: 'His granddaughter Sofia', kind: 'who',
        evidence: 'Every weekend, his granddaughter Sofia, who lived next door, came to help him.',
      },
      {
        q: 'Why did Grandpa have to rest in his chair?',
        options: ['He hurt his knee', 'He was very sleepy', 'It was raining'], answer: 'He hurt his knee', kind: 'why',
        evidence: 'One summer, Grandpa hurt his knee and had to rest in his chair for two weeks.',
      },
      {
        q: 'Why was Sofia worried?',
        options: ['The plants needed water every day', 'She was late for school', 'A bird was eating the beans'], answer: 'The plants needed water every day', kind: 'why',
        evidence: 'Sofia was worried because the plants needed water every day and the weather was very hot.',
      },
      {
        q: 'What did Sofia tie the tall beans to?',
        options: ['Sticks', 'The fence', 'Grandpa’s chair'], answer: 'Sticks', kind: 'what',
        evidence: 'On Saturday, she pulled up the weeds and tied the tall beans to sticks.',
      },
      {
        q: 'What happened first?',
        options: ['Grandpa hurt his knee', 'Sofia pulled up the weeds', 'Grandpa gave Sofia a hug'], answer: 'Grandpa hurt his knee', kind: 'order',
        evidence: 'One summer, Grandpa hurt his knee and had to rest in his chair for two weeks.',
      },
      {
        q: 'What did Grandpa call Sofia?',
        options: ['A wonderful gardener', 'A fast runner', 'A good cook'], answer: 'A wonderful gardener', kind: 'what',
        evidence: 'Grandpa gave her a big hug and said, ‘You are a wonderful gardener.’',
      },
    ],
  },
];

export const storyText = (s: Story): string => s.paragraphs.join(' ');
export const wordCount = (s: Story): number => storyText(s).split(/\s+/).filter(Boolean).length;
export function storyOf(id: string): Story {
  const s = STORIES.find(x => x.id === id);
  if (!s) throw new Error(`unknown story ${id}`);
  return s;
}
