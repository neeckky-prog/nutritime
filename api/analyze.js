// NutriTime — Vercel Serverless Function (Google Gemini FREE)
// File location: api/analyze.js

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY not set. Go to Vercel → Settings → Environment Variables'
    });
  }

  const { base64 } = req.body || {};
  if (!base64) return res.status(400).json({ error: 'No image received' });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
            {
              text: `You are a clinical nutrition AI. Look at this food photo carefully.
Identify every distinct food item visible.

Return ONLY a valid JSON array — no markdown, no code fences, no explanation, nothing else:
[
  {
    "name": "Food Name",
    "portionG": 150,
    "calories": 280,
    "energyKJ": 1172,
    "proteinG": 12,
    "carbsG": 35,
    "fatG": 8,
    "calciumMg": 120,
    "ironMg": 2,
    "vitaminCMg": 5,
    "sodiumMg": 320,
    "fiberG": 3
  }
]

Rules:
- One object per distinct food item
- Estimate realistic portion sizes from what is visible
- energyKJ = calories × 4.184
- Return ONLY the JSON array, starting with [ and ending with ]`
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(geminiRes.status).json({ error: 'Gemini error: ' + errText });
    }

    const data    = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Strip markdown code fences if present (safety net)
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const foods = JSON.parse(cleaned);
    return res.json(Array.isArray(foods) ? foods : [foods]);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

handler.config = { api: { bodyParser: { sizeLimit: '6mb' } } };
module.exports = handler;
