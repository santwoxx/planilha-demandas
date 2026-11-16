// Pauta Comemorativa: guarda os dados da equipe no Upstash Redis pela API REST (sem dependências).
// Variáveis no Vercel:
//   KV_REST_API_URL e KV_REST_API_TOKEN  (criadas ao conectar "Upstash for Redis" ao projeto)
//   ou UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN
//   PAUTA_SENHA  senha que a equipe digita para abrir a pauta (recomendado)
import { timingSafeEqual } from 'node:crypto';

const URL_BANCO = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const SENHA = process.env.PAUTA_SENHA || '';
const P = 'pauta:';
const COLS = ['tarefas', 'empresas', 'equipe', 'datas'];
const ID = /^[A-Za-z0-9_-]{1,64}$/;

// Dados iniciais, gravados só na primeira vez que a pauta abre.
const SEMENTE = {
  empresas: {
    'central-moveis': { nome: 'Central Móveis', cor: '#B7791F', ordem: 1 },
    'central-pneus': { nome: 'Central Pneus', cor: '#306843', ordem: 2 },
    'central-autocenter': { nome: 'Central Autocenter', cor: '#2B6CB0', ordem: 3 },
    'central-autocar': { nome: 'Central Autocar', cor: '#718096', ordem: 4 },
  },
  equipe: {
    natan: { nome: 'Natan', funcao: 'Vídeos', cor: '#3B5BDB', ordem: 1 },
    isa: { nome: 'Isa', funcao: 'Posts', cor: '#C2410C', ordem: 2 },
  },
};

async function redis(cmds) {
  const r = await fetch(URL_BANCO + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error('Upstash respondeu ' + r.status);
  const out = await r.json();
  for (const o of out) if (o && o.error) throw new Error(o.error);
  return out.map(o => o.result);
}

function senhaOk(req) {
  if (!SENHA) return true;
  let v = req.headers['x-pauta-senha'] || '';
  try { v = decodeURIComponent(v); } catch { return false; }
  const a = Buffer.from(v), b = Buffer.from(SENHA);
  return a.length === b.length && timingSafeEqual(a, b);
}

let semeado = false;
async function semear() {
  if (semeado) return;
  const [novo] = await redis([['SETNX', P + 'semeado', '1']]);
  semeado = true;
  if (novo !== 1) return;
  const cmds = [];
  for (const [col, docs] of Object.entries(SEMENTE)) {
    for (const [id, d] of Object.entries(docs)) cmds.push(['HSETNX', P + col, id, JSON.stringify(d)]);
  }
  cmds.push(['INCR', P + 'v']);
  await redis(cmds);
}

function paraObj(arr) {
  const o = {};
  for (let i = 0; i + 1 < (arr || []).length; i += 2) {
    try { o[arr[i]] = JSON.parse(arr[i + 1]); } catch { /* ignora registro inválido */ }
  }
  return o;
}

async function lerCorpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let txt = '';
  for await (const c of req) txt += c;
  return JSON.parse(txt || '{}');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_BANCO || !TOKEN) return res.status(503).json({ erro: 'sem-banco' });
  if (!senhaOk(req)) return res.status(401).json({ erro: 'senha' });
  try {
    if (req.method === 'GET') {
      await semear();
      const desde = Number(new URL(req.url, 'http://local').searchParams.get('v') ?? -1);
      const [v] = await redis([['GET', P + 'v']]);
      if (Number(v || 0) === desde) return res.status(200).json({ v: desde, mudou: false });
      const r = await redis([['GET', P + 'v'], ...COLS.map(c => ['HGETALL', P + c])]);
      const out = { v: Number(r[0] || 0), mudou: true };
      COLS.forEach((c, i) => { out[c] = paraObj(r[i + 1]); });
      return res.status(200).json(out);
    }
    if (req.method === 'POST') {
      let corpo;
      try { corpo = await lerCorpo(req); } catch { return res.status(400).json({ erro: 'json' }); }
      const ops = Array.isArray(corpo.ops) ? corpo.ops : [];
      if (!ops.length || ops.length > 50) return res.status(400).json({ erro: 'ops' });
      const cmds = [];
      for (const op of ops) {
        if (!op || !COLS.includes(op.col) || !ID.test(op.id || '')) return res.status(400).json({ erro: 'caminho' });
        if (op.op === 'delete') { cmds.push(['HDEL', P + op.col, op.id]); continue; }
        if (!op.data || typeof op.data !== 'object' || Array.isArray(op.data)) return res.status(400).json({ erro: 'dados' });
        let doc = op.data;
        if (op.op === 'update') {
          const [atual] = await redis([['HGET', P + op.col, op.id]]);
          if (!atual) return res.status(404).json({ erro: 'nao-existe' });
          doc = Object.assign(JSON.parse(atual), op.data);
        } else if (op.op !== 'set') return res.status(400).json({ erro: 'op' });
        const txt = JSON.stringify(doc);
        if (txt.length > 50000) return res.status(413).json({ erro: 'grande' });
        cmds.push(['HSET', P + op.col, op.id, txt]);
      }
      cmds.push(['INCR', P + 'v']);
      const r = await redis(cmds);
      return res.status(200).json({ ok: true, v: r[r.length - 1] });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erro: 'metodo' });
  } catch (e) {
    return res.status(502).json({ erro: 'banco', detalhe: String((e && e.message) || e) });
  }
}
