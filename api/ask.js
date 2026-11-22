export const config = { maxDuration: 60 };

const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

async function callGemini(model, prompt, key) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000 }
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
  const errs = [];
  for (const model of MODELS) {
    const t0 = Date.now();
    try {
      const text = await callGemini(model, prompt, process.env.GEMINI_API_KEY);
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      const note = errs.length ? '\n\n[' + model + ', ' + sec + 's; മുമ്പത്തേത്: ' + errs.join(' | ') + ']' : '\n\n[' + model + ', ' + sec + 's]';
      return res.status(200).json({ text: text + note });
    } catch (e) {
      const msg = e.name === 'AbortError' ? 'സമയം കഴിഞ്ഞു' : String(e.message).slice(0, 120);
      errs.push(model + ': ' + msg);
    }
  }
  return res.status(500).json({ error: errs.join(' | ') });
}
