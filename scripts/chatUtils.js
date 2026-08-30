// ============================================================
// General Utilities
// ============================================================

function randNum(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(array) {
  return array[randNum(0, array.length - 1)];
}

function normalizePrompt(message) {
  let normalized = message.trim().toLowerCase();

  normalized = normalized.replace(/[.,!?;:']+/g, '');

  normalized = normalized
    .replace(/^whats\b/, 'what is');
  
  // remove please, then, than (if word count is more than two)
  if (normalized.split(/\s+/).length > 2) {
    normalized = normalized.replace(/\b(please|then|than|so|me)\b/g, '');
  }

  // remove double spaces
  normalized = normalized.replace(/\s{2,}/g, ' ');
  normalized = normalized.trim();
  
  return normalized;
}

// ============================================================
// Load Common Prompts
// ============================================================

let commonPrompts;

async function loadCommonPrompts() {
  const response = await fetch('scripts/commonPrompts.json');

  if (!response.ok) {
    throw new Error('Failed to load common prompts');
  }

  commonPrompts = await response.json();
}

loadCommonPrompts();

// ============================================================
// Response Generation
// ============================================================

async function generateResponse(message) {
  const firstWord = message.split(/\s+/)[0];

  if (commonPrompts.prompts.includes(message)) {
    return commonPrompts.responses[
      commonPrompts.prompts.indexOf(message)
    ];
  }

  if (commonPrompts.jokePrompts.includes(message)) {
    return await getJoke();
  }

  if (commonPrompts.timePrompts.includes(message)) {
    return getTime();
  }

  if (commonPrompts.datePrompts.includes(message)) {
    return getDate();
  }

  if (commonPrompts.weatherPrompts.includes(message)) {
    return await getWeather();
  }

  if (commonPrompts.coinFlipPrompts.includes(message)) {
    return getCoinFlip();
  }

  if (commonPrompts.diceRollPrompts.includes(message)) {
    return getDiceRoll();
  }

  if (commonPrompts.randomCardPrompts.includes(message)) {
    return `I drew the ${getRandCard()}.`;
  }

  if (questionWords.includes(firstWord) || message.endsWith('?')) {
    return await getWikiResponse(message);
  }

  if (taskWords.includes(firstWord)) {
    return getTaskResponse();
  }

  return getRandomElement(unknownResponses);
}

// ============================================================
// Jokes
// ============================================================

async function getJoke() {
  try {
    const response = await fetch(
      'https://official-joke-api.appspot.com/random_joke'
    );

    if (!response.ok) {
      throw new Error('Failed to fetch joke');
    }

    const jokeData = await response.json();

    return `${jokeData.setup} ${jokeData.punchline}`;
  } catch (error) {
    console.error('Error fetching joke:', error);
    return "Sorry, I couldn't fetch a joke at the moment.";
  }
}

// ============================================================
// Time and Date
// ============================================================

function getTime() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const responses = [
    `The time is ${time}.`,
    `The current time is ${time}.`,
    `It is currently ${time}.`
  ];

  return getRandomElement(responses);
}

function getDate() {
  const now = new Date();
  const dayOfWeek = now.toLocaleString('default', { weekday: 'long' });
  const month = now.toLocaleString('default', { month: 'long' });
  const day = now.getDate();
  let dateSuffix = 'th';
  if (day % 10 === 1 && day !== 11) {
    dateSuffix = 'st';
  } else if (day % 10 === 2 && day !== 12) {
    dateSuffix = 'nd';
  } else if (day % 10 === 3 && day !== 13) {
    dateSuffix = 'rd';
  }
  const year = now.getFullYear();
  const date = `${dayOfWeek}, ${month} ${day}${dateSuffix}, ${year}`;
  
  if (randNum(0, 1) === 1) {
    return `Today is ${date}.`;
  } else {
    return `The date today is ${date}.`;
  }
}

// ============================================================
// Weather
// ============================================================

async function getWeather() {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const weather = await fetchWeather(latitude, longitude);

          resolve(
            `The current temperature is ${weather.fahrenheitTemp}°F or ${weather.celsiusTemp}°C.`
          );
        } catch (error) {
          resolve("Unable to fetch weather data for your location.");
        }
      },
      () => {
        resolve(
          "I couldn't determine your location, so I can't get your local weather."
        );
      }
    );
  });
}

async function fetchWeather(latitude, longitude) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&current=temperature_2m,weather_code` +
    `&temperature_unit=celsius`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable to fetch weather");
  }

  const data = await response.json();

  return {
    celsiusTemp: Math.round(data.current.temperature_2m),
    fahrenheitTemp: Math.round((data.current.temperature_2m * 9) / 5 + 32),
    weatherCode: data.current.weather_code,
  };
}

// ============================================================
// Random Generators
// ============================================================

function getCoinFlip() {
  const coinFlipResult = randNum(0, 1) === 1 ? 'Heads' : 'Tails';
  if (randNum(0, 1) === 1){
    return `The coin landed on ${coinFlipResult}.`;
  } else {
    return `It's ${coinFlipResult}.`;
  }
}

function getDiceRoll() {
  return `You rolled a ${randNum(1, 6)}.`;
}

function getRandCard() {
  const numbers = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  return `I drew the ${getRandomElement(numbers)} of ${getRandomElement(suits)}`;
}

// ============================================================
// Wikipedia / Question Answering Fallback
// ============================================================

function extractWikiQuestion(prompt) {
  const patterns = [
    /^(what|who)\s+(is|are)\s+(the\s+)?/i,
    /^(can you tell me about|do you know about|does anyone know about|is there any information about|are there any details about)\s+/i
  ];

  for (const pattern of patterns) {
    if (pattern.test(prompt)) {
      return prompt.replace(pattern, '').trim();
    }
  }

  return false;
}

async function searchWikipedia(query) {
  const url =
    `https://en.wikipedia.org/w/rest.php/v1/search/page` +
    `?q=${encodeURIComponent(query)}` +
    `&limit=1`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Wikipedia search failed');
  }

  const data = await response.json();

  return data.pages?.[0] ?? null;
}

async function getWikiResponse(message) {
  const wikiQuery = extractWikiQuestion(message);

  if (!wikiQuery) {
    return genericQuestionResponses(message);
  }

  try {
    const wikiResult = await searchWikipedia(wikiQuery);

    if (!wikiResult) {
      return genericQuestionResponses(message);
    }

    const title = wikiResult.title;
    const description =
      wikiResult.description ||
      wikiResult.excerpt ||
      '';

    if (!description) {
      return genericQuestionResponses(message);
    }

    const lowerDescription = description.toLowerCase();

    if (
      lowerDescription.includes('disambiguation') ||
      lowerDescription.includes(
        'topics referred to by the same term'
      )
    ) {
      return genericQuestionResponses(message);
    }

    if (message.startsWith('what is the ')) {
      return `The ${title} is a ${description.trim()}.`;
    } else if (message.startsWith('what is ')) {
      return `${title} is a ${description.trim()}.`;
    }

    return `${title}: ${description.trim()}.`;

  } catch (error) {
    console.error('Wikipedia error:', error);
    return genericQuestionResponses(message);
  }
}

// ============================================================
// Fallback Responses
// ============================================================

function genericQuestionResponses(message) {
  // Take raw prompt and remove any ending punctuation for better response generation
  message = rawPrompt.replace(/[.,!?;:]+$/, '');
  return getRandomElement([
    "That's an interesting question, let me help you with that!",
    `I understand you're asking about "${message}". Let me help you with that!`,
    `I see you're trying to figure out "${message}". I can help you with that!`
  ]);
}

const unknownResponses = [
  "I'm not sure about that one.",
  "I don't know the answer to that yet.",
  "That's beyond what I currently know.",
  "I don't have enough information to answer that.",
  "I'm still learning. I don't know how to answer that yet.",
  "I don't feel like doing that."
];

function getTaskResponse() {
  return getRandomElement([
    'Do it yourself.',
    'You should do it yourself, I believe in you!'
  ]);
}

// ============================================================
// Prompt Word Lists
// ============================================================

const questionWords = [
  'what',
  'how',
  'why',
  'when',
  'where',
  'who',
  'is',
  'are',
  'can',
  'do',
  'does',
  'did',
  'will',
  'would',
  'should',
  'could'
];

const taskWords = [
  'write',
  'create',
  'make',
  'generate',
  'build',
  'design',
  'develop',
  'compose',
  'produce',
  'construct',
  'form',
  'assemble',
  'fabricate',
  'engineer',
  'craft',
  'devise',
  'plan',
  'organize',
  'arrange',
  'prepare',
  'set up',
  'draw',
  'sketch',
  'illustrate',
  'paint'
];
