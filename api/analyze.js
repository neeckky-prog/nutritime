// NutriTime — Vercel Serverless Function (Gemini AI — FREE)
// Place at: api/analyze.js

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY missing — go to Vercel → Settings → Environment Variables and add it'
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
            { text: `You are a nutrition AI. Identify every food item in this photo.
Return ONLY a valid JSON array, no markdown, no text outside the array:
[{"name":"Food","portionG":150,"calories":280,"energyKJ":1172,"proteinG":12,"carbsG":35,"fatG":8,"calciumMg":120,"ironMg":2,"vitaminCMg":5,"sodiumMg":320,"fiberG":3}]
One object per food item. Estimate realistic portions. Return ONLY the JSON array.` }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(geminiRes.status).json({ error: 'Gemini error: ' + errText });
    }

    const data    = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const foods   = JSON.parse(cleaned);

    return res.json(foods);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

handler.config = { api: { bodyParser: { sizeLimit: '6mb' } } };

module.exports = handler;
