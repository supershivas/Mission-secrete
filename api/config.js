export default async function handler(req, res) {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!url || !token) return res.status(503).json({ error: 'KV not configured' });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  if (req.method === 'GET') {
    const r = await fetch(`${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(['GET', 'agent_config'])
    });
    const { result } = await r.json();
    if (!result) return res.status(404).json({ error: 'no config' });
    return res.status(200).json(JSON.parse(result));
  }

  if (req.method === 'PUT') {
    const value = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    await fetch(`${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(['SET', 'agent_config', value])
    });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
