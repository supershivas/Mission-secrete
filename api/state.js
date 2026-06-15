export default async function handler(req, res) {
  const KEY = process.env.JSONBIN_KEY;
  const BIN = process.env.JSONBIN_STATE_BIN || process.env.JSONBIN_BIN;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!KEY || !BIN) return res.status(503).json({ error: 'env vars missing' });

  // On stocke l'état dans un sous-champ "_state" du même bin config
  const base = `https://api.jsonbin.io/v3/b/${BIN}`;
  const authHeaders = { 'X-Master-Key': KEY };

  if (req.method === 'GET') {
    const r = await fetch(`${base}/latest?meta=false`, { headers: authHeaders });
    if (!r.ok) return res.status(r.status).end();
    const data = await r.json();
    const record = data.record ?? data;
    return res.status(200).json(record._state || { phase: 'idle' });
  }

  if (req.method === 'PUT') {
    // Lire le bin, mettre à jour _state, réécrire
    const rGet = await fetch(`${base}/latest?meta=false`, { headers: authHeaders });
    if (!rGet.ok) return res.status(rGet.status).end();
    const existing = await rGet.json();
    const record = existing.record ?? existing;
    const newState = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    record._state = { ...newState, updatedAt: Date.now() };
    const rPut = await fetch(base, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!rPut.ok) return res.status(rPut.status).end();
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
