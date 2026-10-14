import * as FileSystem from 'expo-file-system';

// ----------------------------------------------------------------
//  PLACEHOLDER: paste your own key from https://aistudio.google.com/apikey
// ----------------------------------------------------------------
export const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';

export const GEMINI_MODEL = 'gemini-3.6-flash';

const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// The prompt is used verbatim as specified. The JSON-only demand is additionally
// enforced by responseMimeType + responseSchema below, which is far more reliable
// than hoping the model avoids markdown fences.
const EXTRACTION_PROMPT =
  'You are an assistant for a wedding decoration and event management business. ' +
  'Look at this handwritten/printed Hindi contract bill. Extract the Customer Name ' +
  '(ग्राहक का नाम), Event Date (कार्यक्रम की तिथि), and Event Location/Address (पता). ' +
  'Return ONLY a JSON object with the keys: customerName, eventDate (format: YYYY-MM-DD), ' +
  'and location. Translate the Hindi text to English for the JSON values. ' +
  'Do not wrap the response in markdown blocks; return only the raw JSON.';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    customerName: { type: 'string', description: 'Customer name, translated to English.' },
    eventDate: { type: 'string', description: 'Event date in YYYY-MM-DD format.' },
    location: { type: 'string', description: 'Event location or address, translated to English.' },
  },
  required: ['customerName', 'eventDate', 'location'],
};

const MIME_BY_EXTENSION = {
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

function guessMimeType(uri) {
  const ext = (uri.split('.').pop() || '').toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? 'image/jpeg';
}

/**
 * Reads a picked image off disk and returns raw base64.
 * `readAsStringAsync` needs the `base64` encoding argument; expo-file-system v19+
 * removed the separate `EncodingType` enum in favour of that string literal.
 */
export async function uriToBase64(uri) {
  if (!uri) throw new Error('No image selected.');
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

/**
 * Strips code fences and stray prose so a model that ignored responseMimeType
 * still yields a parseable object.
 */
function parseModelJson(rawText) {
  let text = (rawText || '').trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  if (!text.startsWith('{')) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) text = text.slice(start, end + 1);
  }

  return JSON.parse(text);
}

/**
 * Sends the contract photo to Gemini and returns { customerName, eventDate, location }.
 * Throws on missing key, non-2xx responses, and unparseable output so the screen
 * can surface a real message instead of silently filling blank fields.
 */
export async function extractContractDetails(imageUri) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
    throw new Error('Add your Gemini API key to src/gemini.js (GEMINI_API_KEY).');
  }

  const base64 = await uriToBase64(imageUri);

  const body = {
    contents: [
      {
        parts: [
          { text: EXTRACTION_PROMPT },
          { inline_data: { mime_type: guessMimeType(imageUri), data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const response = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gemini request failed (${response.status}). ${detail.slice(0, 300)}`);
  }

  const payload = await response.json();

  const candidate = payload?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const text = candidate?.content?.parts?.map((part) => part?.text ?? '').join('') ?? '';

  if (!text) {
    throw new Error(
      finishReason
        ? `Gemini returned no text (finishReason: ${finishReason}).`
        : 'Gemini returned an empty response.'
    );
  }

  const parsed = parseModelJson(text);

  return {
    customerName: typeof parsed.customerName === 'string' ? parsed.customerName : '',
    eventDate: typeof parsed.eventDate === 'string' ? parsed.eventDate : '',
    location: typeof parsed.location === 'string' ? parsed.location : '',
  };
}
