export default async function handler(req, res) {
  const KEY = process.env.JSONBIN_KEY;
  const BIN = process.env.JSONBIN_BIN;

  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!KEY || !BIN) return res.status(503).json({ error: 'env vars missing' });

  const base = `https://api.jsonbin.io/v3/b/${BIN}`;
  const authHeaders = { 'X-Master-Key': KEY };

  if (req.method === 'GET') {
    const r = await fetch(`${base}/latest?meta=false`, { headers: authHeaders });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: txt });
    }
    const data = await r.json();
    return res.status(200).json(data.record ?? data);
  }

  if (req.method === 'PUT') {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const r = await fetch(base, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body
    });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: txt });
    }
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
