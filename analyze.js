// NutriTime — Vercel serverless function using Google Gemini (FREE)
// 
// SETUP:
// 1. Go to aistudio.google.com → Get API Key → Create API Key → copy it
// 2. Vercel dashboard → Settings → Environment Variables → Add:
//    Name:  GEMINI_API_KEY
//    Value: your key (starts with AIza...)
// 3. Upload this file to your api/ folder and redeploy

export const config = {
  api: { bodyParser: { sizeLimit: '6mb' } }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY not set — add it in Vercel → Settings → Environment Variables'
    });
  }

  try {
    const { base64 } = req.body;
    if (!base64) return res.status(400).json({ error: 'No image received' });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: { mimeType: 'image/jpeg', data: base64 }
              },
              {
                text: `You are a clinical nutrition AI. Identify every food item visible in this photo.

Return ONLY a valid JSON array — no markdown, no explanation, nothing else:
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

Rules: one object per food · estimate realistic portion from what is visible · energyKJ = calories × 4.184 · return ONLY the JSON array`
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return res.status(geminiRes.status).json({ error: 'Gemini error: ' + err });
    }

    const data    = await geminiRes.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const foods   = JSON.parse(cleaned);

    return res.json(foods);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
