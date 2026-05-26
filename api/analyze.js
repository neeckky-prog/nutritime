// NutriTime — Vercel Serverless Function (Gemini AI — FREE)
// Place at: api/analyze.js

// api/analyze.js

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key missing in environment' });
  }

  const { base64 } = req.body || {};
  if (!base64) return res.status(400).json({ error: 'No image received' });

  try {
    // Using the stable model name confirmed by your curl test
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
            { text: "Identify every food visible. Return ONLY a valid JSON array." }
          ]
        }]
      })
    });

    const data = await geminiRes.json();
    
    // Check for API errors
    if (!geminiRes.ok) {
        return res.status(geminiRes.status).json({ error: data });
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    res.status(200).json(JSON.parse(rawText));

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// CRITICAL: This line is required for Vercel to find your function
module.exports = handler;
