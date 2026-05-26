// NutriTime AI proxy server
const express  = require('express');
const cors     = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app    = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static('.')); // serves your HTML file

app.post('/analyze', async (req, res) => {
  try {
    const { base64 } = req.body;
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64',
          media_type: 'image/jpeg', data: base64 } },
        { type: 'text', text: `Identify every food visible.
Return ONLY a JSON array, no extra text:
[{"name":"Pancakes","portionG":120,"calories":350,
  "energyKJ":1464,"proteinG":8,"carbsG":55,"fatG":10,
  "calciumMg":80,"ironMg":2,"vitaminCMg":0,
  "sodiumMg":400,"fiberG":2}]` }
      ]}]
    });
    res.json(JSON.parse(msg.content[0].text));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () =>
  console.log('NutriTime server running at http://localhost:3001'));