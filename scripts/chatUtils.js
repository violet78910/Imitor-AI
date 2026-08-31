// ============================================================
// General Utilities
// ============================================================

function randNum(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(array) {
  return array[randNum(0, array.length - 1)];
}

async function normalizePrompt(message) {

  let normalized = message.replace(/\bsq\b/g, 'square');

  // run message through auto-corrector to fix common typos and misspellings
  normalized = await autoCorrect(normalized);

  normalized = normalized.trim().toLowerCase();

  normalized = normalized.replace(/[.,!?;:']+/g, '');

  normalized = normalized.replace(/^whats\b/, 'what is');

  // remove any trailing "for me" or "thanks" or "thank you" if longer than two words
  if (normalized.split(/\s+/).length > 2) {
    normalized = removeDoubleSpaces(normalized).replace(/\b(for me|thanks|thank you)\b/g, '');
  }

  // remove please, then, than (if word count is more than two)
  if (normalized.split(/\s+/).length > 2) {
    normalized = removeDoubleSpaces(normalized).replace(/\b(please|then|than|so|me)\b/g, '');
  }

  // remove any leading "can you" or "could you" or "would you" or "will you" or "shall you" if longer than two words
  if (normalized.split(/\s+/).length > 2) {
    normalized = removeDoubleSpaces(normalized).replace(/^(tell|show|can|could|would|will|shall)\s+you\s+/i, '');
    // remove any leading "give me a" or "i want to" or "i would like to" "i need" if longer than two words
    normalized = removeDoubleSpaces(normalized).replace(/^(give a|i want to|i would like to|i would like a|i need)\s+/i, '');
  }

  return normalized;
}

function sanitizeString(input) {
  // Remove any html tags
  let sanitized = input.replace(/<\/?[^>]+(>|$)/g, "");

  // If first word is the, remove it regardless of case
  sanitized = sanitized.replace(/^\s*the\s+/i, "");

  // Replace any html entity codes with their corresponding characters
  sanitized = sanitized.replace(/&amp;/g, "&");
  sanitized = sanitized.replace(/&lt;/g, "<");
  sanitized = sanitized.replace(/&gt;/g, ">");
  sanitized = sanitized.replace(/&quot;/g, '"');
  sanitized = sanitized.replace(/&#39;/g, "'");

  sanitized = sanitized.trim();
  sanitized = removeDoubleSpaces(sanitized);

  return sanitized;
}

function removeDoubleSpaces(input) {
  return input.replace(/\s{2,}/g, ' ').trim();
}

async function autoCorrect(message) {
  // if message contains "nuh uh" or "nuh uhh" or "yuh huh", return message as is
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("nuh uh") || lowerMessage.includes("nuh uhh") || lowerMessage.includes("yuh huh")) {
    return message;
  }
  try {
    const response = await fetch(
      'https://api.languagetool.org/v2/check',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          text: message,
          language: 'en-US'
        })
      }
    );

    if (!response.ok) {
      throw new Error('Spell check failed');
    }

    const data = await response.json();

    let corrected = message;

    // Apply corrections from the end of the sentence
    // so character offsets don't change.
    const matches = data.matches
      .filter(match => match.replacements?.length > 0)
      .sort((a, b) => b.offset - a.offset);

    for (const match of matches) {
      const replacement = match.replacements[0].value;

      corrected =
        corrected.slice(0, match.offset) +
        replacement +
        corrected.slice(match.offset + match.length);
    }
    return corrected;

  } catch (error) {

    // If the API fails, just use the original message.
    return message;
  }
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

  const mathResponse = getMathResponse(message);

  if (mathResponse !== null) {
    return mathResponse;
  }

  if (commonPrompts.repeatPrompts.includes(message)) {
    return repeatPreviousAssistantMessage();
  }

  const wikiResponse = await getWikiResponse(message);
  if (wikiResponse !== null) {
    return wikiResponse;
  }

  const dictionaryResponse = await getDictionaryResponse(message);
  if (dictionaryResponse !== null) {
    return dictionaryResponse;
  }

  if (questionWords.includes(firstWord) || rawPrompt.endsWith('?')) {
    return genericQuestionResponses();
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

    return `${sanitizeString(jokeData.setup)} ${sanitizeString(jokeData.punchline)}`;
  } catch (error) {
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
// Math Response
// ============================================================

function getMathResponse(message) {
  let expression = message.trim().toLowerCase();

  // Remove common question prefixes
  expression = expression
    .replace(/^(what is|calculate|compute|evaluate|solve)\s+/i, '')
    .trim();

  // Square root
  const sqrtMatch = expression.match(
    /^(?:the\s+)?(?:square\s+root|sq\s+root)\s+of\s+(.+)$/
  );

  if (sqrtMatch) {
    const numberExpression = convertNumberPhrases(
      sqrtMatch[1]
    );

    const number = Number(numberExpression);

    if (Number.isFinite(number)) {
      return `The square root of ${number} is ${formatMathResult(Math.sqrt(number))}.`;
    }

    return "I couldn't parse the number for the square root.";
  }

  // Cube root
  const cbrtMatch = expression.match(
    /^(?:the\s+)?(?:cube\s+root|cb\s+root)\s+of\s+(.+)$/
  );

  if (cbrtMatch) {
    const numberExpression = convertNumberPhrases(
      cbrtMatch[1]
    );

    const number = Number(numberExpression);

    if (Number.isFinite(number)) {
      return `The cube root of ${number} is ${formatMathResult(Math.cbrt(number))}.`;
    }

    return "I couldn't parse the number for the cube root.";
  }

  // Convert number words and operators
  expression = convertMathWords(expression);

  // Only evaluate actual math
  if (!isSafeMathExpression(expression)) {
    return null;
  }

  const result = evaluateEquation(expression);

  return `The answer is ${formatMathResult(result)}.`;
}

function convertMathWords(expression) {
  // Convert written numbers to digits
  expression = convertNumberPhrases(expression);

  // Convert mathematical words to operators
  expression = expression
    .replace(/\bplus\b/g, '+')
    .replace(/\bminus\b/g, '-')
    .replace(/\btimes\b/g, '*')
    .replace(/\bmultiplied\s+by\b/g, '*')
    .replace(/\bdivided\s+by\b/g, '/')
    .replace(/\bover\b/g, '/')
    .replace(/\bto\s+the\s+power\s+of\b/g, '**')
    .replace(/\braised\s+to\s+the\s+power\s+of\b/g, '**')
    .replace(/\bmodulus\b/g, '%')
    .replace(/\bmod\b/g, '%')
    .trim();

  return expression;
}

function convertNumberPhrases(expression) {
  const numberWords = Object.keys(Small)
    .concat(['hundred', ...Object.keys(Magnitude)]);

  const pattern = new RegExp(
    `\\b(?:${numberWords.join('|')})(?:[\\s-]+(?:${numberWords.join('|')}))*\\b`,
    'gi'
  );

  return expression.replace(pattern, match => {
    return text2num(match.toLowerCase());
  });
}

function isSafeMathExpression(expression) {
  return /^[\d\s+\-*/%.()]+$/.test(expression);
}

function evaluateEquation(expression) {
  if (typeof expression !== 'string') {
    return null;
  }

  if (!isSafeMathExpression(expression)) {
    return null;
  }

  try {
    const result = new Function(
      `"use strict"; return (${expression})`
    )();

    if (typeof result === 'number' && Number.isFinite(result)) {
      return result;
    }
  } catch (error) {
    return null;
  }

  return null;
}

function formatMathResult(result) {
  if (Number.isInteger(result)) {
    return String(result);
  }

  return Number(result.toFixed(10)).toString();
}

// ============================================================
// Repeat Previous Assistant Message
// ============================================================

function repeatPreviousAssistantMessage() {
  const assistantMessages = Array.from(
    document.querySelectorAll('.message.assistant .bubble')
  );

  if (assistantMessages.length === 0) {
    return "I haven't said anything yet to repeat.";
  }

  const lastMessage = assistantMessages[assistantMessages.length - 1].textContent;

  return lastMessage || "I haven't said anything yet to repeat.";
}

// ============================================================
// Wikipedia
// ============================================================

function extractWikiQuestion(prompt) {
  const patterns = [
    /^(what|who)\s+(is|are)\s+(the\s+)?/i,
    /^(can you tell about|do you know about|does anyone know about|is there any information about|are there any details about)\s+/i
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
    return null;
  }

  try {
    const wikiResult = await searchWikipedia(wikiQuery);

    if (!wikiResult) {
      return null;
    }

    const title = sanitizeString(wikiResult.title);
    const description =
      sanitizeString(wikiResult.description) ||
      sanitizeString(wikiResult.excerpt) ||
      '';

    if (!description) {
      return null;
    }

    const lowerDescription = description.toLowerCase();

    if (
      lowerDescription.includes('disambiguation') ||
      lowerDescription.includes(
        'topics referred to by the same term'
      )
    ) {
      return null;
    }

    // if definition starts with title, remove it
    if (lowerDescription.startsWith(title.toLowerCase())) {
      return description.trim();
    }

    if (message.startsWith('what is the ')) {
      // If first letter of description is a vowel, use "an" instead of "a"
      if (/^[aeiou]/i.test(description.trim())) {
        return `The ${title} is an ${description.trim()}.`;
      } else {
        return `The ${title} is a ${description.trim()}.`;
      };
    } else if (message.startsWith('what is a ')){
      return `A ${title} is a ${description.trim()}.`;
    } else if (message.startsWith('what is an ')){
      return `An ${title} is a ${description.trim()}.`;
    } else if (message.startsWith('what is ')) {
      return `${title}: ${description.trim()}.`;
    }
    return `${title}: ${description.trim()}.`;

  } catch (error) {
    return null;
  }
}

// ============================================================
// Dictionary
// ============================================================

async function getWordDefinition(word) {
  const url =
    `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(word)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Dictionary lookup failed');
  }

  const data = await response.json();

  return data ?? null;
}

async function getDictionaryResponse(message) {
  // Extract the word to define from the message
  const word = message
    .replace(
      /^(what is the definition of|what is the meaning of|define the word|what does|what are|what is|define)\s+/i,
      ''
    )
    .replace(/[?!.]+$/, '')
    .trim();

  // If the word is empty, return null
  if (!word) {
    return null;
  }

  const rawWord = rawPrompt.toLowerCase();

  rawWordMisspelled = word !== rawWord || !rawWord.includes(word);

  try {
    const definitionData = await getWordDefinition(word);

    if (!definitionData || !definitionData.entries) {
      return null;
    }

    // Find the first entry that has a definition
    for (const entry of definitionData.entries) {
      if (!entry.senses || entry.senses.length === 0) {
        continue;
      }

      for (const sense of entry.senses) {
        if (sense.definition) {
          const definition = sanitizeString(sense.definition);
          // if the raw word is not misspelled and the raw prompt is only one word, return the definition in a sentence format
          if (!rawWordMisspelled && rawPrompt.split(' ').length === 1) {
            return definition;
          } else if (randNum(0, 1) === 1) {
            return `The definition of "${word}" is: ${definition}`;
          } else {
            return `${word} is the ${definition}`;
          }
        }
      }
    }

    return null;

  } catch (error) {
    return null;
  }
}

// ============================================================
// Fallback Responses
// ============================================================

function genericQuestionResponses() {
  // Take raw prompt and remove any ending punctuation for better response generation
  let genericMessage = rawPrompt.replace(/[.!?;:]+$/, '');
  // Replace phrases like "do" with if and "you" with "I" to make the response more natural
  genericMessage = genericMessage
    .replace(/\bare you\b/g, 'if I\'m')
    .replace(/\byou\b/g, 'I')
    .replace(/\bme\b/g, 'you')
    .replace(/\bmy\b/g, 'your')
    .replace(/\bmine\b/g, 'yours')
    .replace(/\bwe\b/g, 'I')
    .replace(/\bus\b/g, 'me')
    .replace(/\bour\b/g, 'my')
    .replace(/\bours\b/g, 'mine')
    .replace(/\byour\b/g, 'my')
    .replace(/\byours\b/g, 'mine');

  return getRandomElement([
    "That's an interesting question, let me help you with that!",
    `I understand you're asking about "${genericMessage}". Let me help you with that!`,
    `I see you're trying to figure out "${genericMessage}". I can help you with that!`
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

const taskResponses = [
  "Do it yourself.",
  "You should do it yourself, I believe in you!",
  "I think you can do it yourself, give it a try!",
  "I don't feel like doing that, but I believe you can do it!"
];

function getTaskResponse() {
  return getRandomElement(taskResponses);
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
  'could',
  'define'
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
