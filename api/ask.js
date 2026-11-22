export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Not allowed' });
  try {
    const { prompt } = req.body || {};
    if (!prompt || prompt.length > 3000) {
      return res.status(400).json({ error: 'ചോദ്യം ശരിയല്ല' });
    }
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1500 }
        })
      }
    );
    const d = await r.json();
    if (!r.ok) {
      return res.status(500).json({ error: (d.error && d.error.message) || 'API error' });
    }
    const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    const text = parts.map(p => p.text || '').join('\n').trim();
    return res.status(200).json({ text: text || 'ഉത്തരം ഒന്നും കിട്ടിയില്ല.' });
  } catch (e) {
    return res.status(500).json({ error: 'സെർവർ പിശക്' });
  }
}
