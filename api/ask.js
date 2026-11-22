export const config = { maxDuration: 60 };

const MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-2.5-flash-lite'];

async function callGemini(model, prompt, key) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4000 }
        }),
        signal: ctrl.signal
      }
    );
    const d = await r.json();
    if (!r.ok) throw new Error((d.error && d.error.message) || ('HTTP ' + r.status));
    const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    const text = parts.map(p => p.text || '').join('\n').trim();
    if (!text) throw new Error('ഉത്തരം ശൂന്യം');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Not allowed' });
  const { prompt } = req.body || {};
  if (!prompt || prompt.length > 3000) {
    return res.status(400).json({ error: 'ചോദ്യം ശരിയല്ല' });
  }
  let lastErr = '';
  for (const model of MODELS) {
    try {
      const text = await callGemini(model, prompt, process.env.GEMINI_API_KEY);
      return res.status(200).json({ text, model });
    } catch (e) {
      lastErr = model + ': ' + (e.name === 'AbortError' ? 'സമയം കഴിഞ്ഞു' : e.message);
    }
  }
  return res.status(500).json({ error: lastErr });
}
