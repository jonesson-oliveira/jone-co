const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const EDITOR_USER = process.env.EDITOR_USER;
const EDITOR_PASSWORD = process.env.EDITOR_PASSWORD;

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function checkAuth(req) {
  if (!EDITOR_USER || !EDITOR_PASSWORD) return false; // nunca abre sem senha configurada
  const header = req.headers['authorization'] || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return false;
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const sep = decoded.indexOf(':');
  if (sep === -1) return false;
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  return timingSafeStringEqual(user, EDITOR_USER) && timingSafeStringEqual(pass, EDITOR_PASSWORD);
}

const ROOT = path.resolve(__dirname, '..', '..', '..'); // .../ProjetosClaude
const JONECO_ROOT = path.join(ROOT, 'Jone&Co');
const CONTEUDO_DIR = path.join(JONECO_ROOT, 'marketing', 'conteudo');
const NODE_MODULES_FOR_PLAYWRIGHT = path.join(JONECO_ROOT, 'scripts', 'node_modules');
const JONECO_ENV = path.join(JONECO_ROOT, '.env');
const SITE_DIR = path.join(ROOT, 'JoneAndCo-Site');
const SITE_PUBLIC_POSTS = path.join(SITE_DIR, 'public', 'img', 'posts');
const SITE_URL = 'https://joneandco.com.br';
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = 4545;

function slugFromFolder(folderAbs) {
  const match = path.basename(folderAbs).match(/^carrossel-(.+)-\d{4}-\d{2}-\d{2}$/);
  return match ? match[1] : null;
}

function runChild(command, args, opts) {
  return new Promise((resolve) => {
    const child = spawn(command, args, opts);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
    child.on('error', (err) => resolve({ code: -1, stdout: '', stderr: err.message }));
  });
}

async function waitForPublicImage(url, timeoutMs = 60000, intervalMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.status === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function extractLink(stdout) {
  const match = stdout.match(/link:\s*(\S+)/);
  return match ? match[1] : null;
}

async function publicarCarrossel(folderAbs) {
  const slug = slugFromFolder(folderAbs);
  if (!slug) return { ok: false, steps: [], erro: 'Não consegui identificar o slug dessa pasta' };

  const instagramDir = path.join(folderAbs, 'instagram');
  let slides = [];
  try {
    slides = fs.readdirSync(instagramDir).filter((f) => /^slide-\d+\.png$/.test(f));
  } catch {}
  if (slides.length === 0) {
    return { ok: false, steps: [], erro: 'Nenhum slide renderizado — clique em "Renderizar PNGs" primeiro' };
  }

  const steps = [];

  const destDir = path.join(SITE_PUBLIC_POSTS, slug);
  fs.mkdirSync(destDir, { recursive: true });
  for (const slide of slides) {
    fs.copyFileSync(path.join(instagramDir, slide), path.join(destDir, slide));
  }
  steps.push({ nome: 'Copiar imagens pro site', ok: true });

  const deploy = await runChild('npx', ['wrangler', 'deploy'], { cwd: SITE_DIR, shell: true });
  steps.push({ nome: 'Deploy do site (wrangler)', ok: deploy.code === 0, log: deploy.stdout || deploy.stderr });
  if (deploy.code !== 0) return { ok: false, steps, erro: 'Deploy do site falhou' };

  const imageUrl = `${SITE_URL}/img/posts/${slug}/slide-01.png`;
  const live = await waitForPublicImage(imageUrl);
  steps.push({ nome: 'Confirmar imagem pública', ok: live, log: imageUrl });
  if (!live) return { ok: false, steps, erro: 'Imagem não ficou pública a tempo' };

  const folderArg = path.relative(JONECO_ROOT, folderAbs);
  const ig = await runChild(
    process.execPath,
    [`--env-file=${JONECO_ENV}`, path.join('scripts', 'postar-instagram.js'), folderArg],
    { cwd: JONECO_ROOT }
  );
  const instagramLink = extractLink(ig.stdout);
  steps.push({ nome: 'Publicar no Instagram', ok: ig.code === 0, log: ig.stdout || ig.stderr });
  if (ig.code !== 0) return { ok: false, steps, erro: 'Falha ao publicar no Instagram — Facebook não foi tentado' };

  const fb = await runChild(
    process.execPath,
    [`--env-file=${JONECO_ENV}`, path.join('scripts', 'postar-facebook.js'), folderArg],
    { cwd: JONECO_ROOT }
  );
  const facebookLink = extractLink(fb.stdout);
  steps.push({ nome: 'Publicar no Facebook', ok: fb.code === 0, log: fb.stdout || fb.stderr });

  const result = {
    ok: true,
    publishedAt: new Date().toISOString(),
    instagramLink,
    facebookLink: fb.code === 0 ? facebookLink : null,
    facebookFailed: fb.code !== 0,
    steps,
  };
  fs.writeFileSync(path.join(folderAbs, 'published.json'), JSON.stringify(result, null, 2));
  return result;
}

// --- Agenda ---
const AGENDA_PATH = path.join(CONTEUDO_DIR, 'agenda.json');
const AGENDA_CHECK_MS = 60 * 1000;
const AGENDA_LATE_MS = 2 * 60 * 60 * 1000; // 2h: depois disso, não publica sozinho, marca como atrasado

function readAgenda() {
  try {
    return JSON.parse(fs.readFileSync(AGENDA_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeAgenda(list) {
  fs.writeFileSync(AGENDA_PATH, JSON.stringify(list, null, 2));
}

async function checkAgenda() {
  const agenda = readAgenda();
  let changed = false;

  for (const item of agenda) {
    if (item.status !== 'agendado') continue;
    const when = new Date(item.scheduledFor).getTime();
    const now = Date.now();
    if (when > now) continue;

    if (now - when > AGENDA_LATE_MS) {
      item.status = 'atrasado';
      changed = true;
      continue;
    }

    const folderAbs = validCarrosselFolder(item.folder);
    if (!folderAbs) {
      item.status = 'erro';
      item.erro = 'Pasta não encontrada';
      changed = true;
      continue;
    }

    console.log(`[agenda] publicando automaticamente: ${item.folder}`);
    try {
      const result = await publicarCarrossel(folderAbs);
      item.status = result.ok ? 'publicado' : 'erro';
      item.resultado = result;
      if (!result.ok) item.erro = result.erro;
    } catch (e) {
      item.status = 'erro';
      item.erro = e.message;
    }
    changed = true;
  }

  if (changed) writeAgenda(agenda);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

function safeJoin(base, ...parts) {
  const resolved = path.resolve(base, ...parts);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error('Caminho fora da área permitida');
  }
  return resolved;
}

// Uma pasta de carrossel válida: Jone&Co/marketing/conteudo/carrossel-<slug>-YYYY-MM-DD
function validCarrosselFolder(folderRelPath) {
  const abs = safeJoin(ROOT, folderRelPath);
  if (!abs.startsWith(CONTEUDO_DIR + path.sep)) return null;
  const nome = path.basename(abs);
  if (!/^carrossel-.+-\d{4}-\d{2}-\d{2}$/.test(nome)) return null;
  if (path.dirname(abs) !== CONTEUDO_DIR) return null;
  return abs;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 30 * 1024 * 1024) {
        reject(new Error('Corpo da requisição muito grande'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function listPosts() {
  if (!fs.existsSync(CONTEUDO_DIR)) return [];
  return fs
    .readdirSync(CONTEUDO_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^carrossel-.+-\d{4}-\d{2}-\d{2}$/.test(d.name))
    .map((d) => {
      const abs = path.join(CONTEUDO_DIR, d.name);
      const match = d.name.match(/^carrossel-(.+)-(\d{4}-\d{2}-\d{2})$/);
      const slug = match[1];
      const data = match[2];
      const htmlPath = path.join(abs, 'carrossel.html');
      const instagramDir = path.join(abs, 'instagram');
      let numSlides = 0;
      try {
        numSlides = fs.readdirSync(instagramDir).filter((f) => /^slide-\d+\.png$/.test(f)).length;
      } catch {}
      return {
        folder: `Jone&Co/marketing/conteudo/${d.name}`,
        slug,
        data,
        titulo: slug.replace(/-/g, ' '),
        temHtml: fs.existsSync(htmlPath),
        numSlides,
        htmlUrl: `/Jone&Co/marketing/conteudo/${encodeURIComponent(d.name)}/carrossel.html`,
        instagramBaseUrl: `/Jone&Co/marketing/conteudo/${encodeURIComponent(d.name)}/instagram/`,
      };
    })
    .sort((a, b) => b.data.localeCompare(a.data));
}

function ensureUploadsDir(folderAbs) {
  const dir = path.join(folderAbs, 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function handleApi(req, res, urlPath, query) {
  if (urlPath === '/__editor/api/posts' && req.method === 'GET') {
    return sendJson(res, 200, listPosts());
  }

  if (urlPath === '/__editor/api/legenda' && req.method === 'GET') {
    const folderAbs = validCarrosselFolder(query.get('folder') || '');
    if (!folderAbs) return sendJson(res, 400, { erro: 'Pasta de carrossel inválida' });
    const legendaPath = path.join(folderAbs, 'legenda.md');
    const legenda = fs.existsSync(legendaPath) ? fs.readFileSync(legendaPath, 'utf-8') : '';
    return sendJson(res, 200, { legenda });
  }

  if (urlPath === '/__editor/api/legenda' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf-8'));
    const folderAbs = validCarrosselFolder(body.folder);
    if (!folderAbs) return sendJson(res, 400, { erro: 'Pasta de carrossel inválida' });
    if (typeof body.legenda !== 'string') return sendJson(res, 400, { erro: 'Legenda inválida' });
    const legendaPath = path.join(folderAbs, 'legenda.md');
    if (fs.existsSync(legendaPath)) {
      fs.copyFileSync(legendaPath, path.join(folderAbs, `legenda.backup-${Date.now()}.md`));
    }
    fs.writeFileSync(legendaPath, body.legenda, 'utf-8');
    return sendJson(res, 200, { ok: true });
  }

  if (urlPath === '/__editor/api/save' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf-8'));
    const folderAbs = validCarrosselFolder(body.folder);
    if (!folderAbs) return sendJson(res, 400, { erro: 'Pasta de carrossel inválida' });
    if (typeof body.html !== 'string' || body.html.length < 50) {
      return sendJson(res, 400, { erro: 'HTML vazio ou inválido' });
    }
    const htmlPath = path.join(folderAbs, 'carrossel.html');
    const backupPath = path.join(folderAbs, `carrossel.backup-${Date.now()}.html`);
    if (fs.existsSync(htmlPath)) fs.copyFileSync(htmlPath, backupPath);
    fs.writeFileSync(htmlPath, body.html, 'utf-8');
    return sendJson(res, 200, { ok: true, backup: path.basename(backupPath) });
  }

  if (urlPath === '/__editor/api/render' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf-8'));
    const folderAbs = validCarrosselFolder(body.folder);
    if (!folderAbs) return sendJson(res, 400, { erro: 'Pasta de carrossel inválida' });
    const renderJs = path.join(folderAbs, 'render.js');
    if (!fs.existsSync(renderJs)) return sendJson(res, 400, { erro: 'render.js não encontrado nessa pasta' });

    const child = spawn(process.execPath, ['render.js'], {
      cwd: folderAbs,
      env: { ...process.env, NODE_PATH: NODE_MODULES_FOR_PLAYWRIGHT },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      if (code === 0) {
        sendJson(res, 200, { ok: true, log: out.trim() });
      } else {
        sendJson(res, 500, { ok: false, erro: err.trim() || `render.js saiu com código ${code}` });
      }
    });
    return;
  }

  if (urlPath === '/__editor/api/upload-image' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf-8'));
    const folderAbs = validCarrosselFolder(body.folder);
    if (!folderAbs) return sendJson(res, 400, { erro: 'Pasta de carrossel inválida' });
    const match = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(body.dataUrl || '');
    if (!match) return sendJson(res, 400, { erro: 'dataUrl inválido' });
    const ext = { 'image/png': '.png', 'image/webp': '.webp', 'image/jpeg': '.jpg', 'image/svg+xml': '.svg' }[match[1]] || '.png';
    const safeName = `upload-${Date.now()}${ext}`;
    const uploadsDir = ensureUploadsDir(folderAbs);
    fs.writeFileSync(path.join(uploadsDir, safeName), Buffer.from(match[2], 'base64'));
    return sendJson(res, 200, { ok: true, relPath: `uploads/${safeName}` });
  }

  if (urlPath === '/__editor/api/publish' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf-8'));
    const folderAbs = validCarrosselFolder(body.folder);
    if (!folderAbs) return sendJson(res, 400, { erro: 'Pasta de carrossel inválida' });

    const markerPath = path.join(folderAbs, 'published.json');
    if (fs.existsSync(markerPath) && !body.force) {
      return sendJson(res, 409, {
        erro: 'ja-publicado',
        info: JSON.parse(fs.readFileSync(markerPath, 'utf-8')),
      });
    }

    const result = await publicarCarrossel(folderAbs);
    return sendJson(res, result.ok ? 200 : 500, result);
  }

  if (urlPath === '/__editor/api/agenda' && req.method === 'GET') {
    const posts = listPosts();
    const agenda = readAgenda().map((item) => {
      const post = posts.find((p) => p.folder === item.folder);
      return { ...item, titulo: post ? post.titulo : item.folder };
    });
    return sendJson(res, 200, agenda);
  }

  if (urlPath === '/__editor/api/agenda' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf-8'));
    const folderAbs = validCarrosselFolder(body.folder);
    if (!folderAbs) return sendJson(res, 400, { erro: 'Pasta de carrossel inválida' });
    if (fs.existsSync(path.join(folderAbs, 'published.json'))) {
      return sendJson(res, 400, { erro: 'Esse post já foi publicado, não dá pra agendar de novo' });
    }
    const when = new Date(body.scheduledFor);
    if (isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      return sendJson(res, 400, { erro: 'Data/hora inválida ou no passado' });
    }

    const agenda = readAgenda().filter((i) => i.folder !== body.folder);
    agenda.push({
      folder: body.folder,
      scheduledFor: when.toISOString(),
      status: 'agendado',
      createdAt: new Date().toISOString(),
    });
    writeAgenda(agenda);
    return sendJson(res, 200, { ok: true });
  }

  if (urlPath === '/__editor/api/agenda/cancelar' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf-8'));
    const agenda = readAgenda().filter((i) => i.folder !== body.folder);
    writeAgenda(agenda);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { erro: 'Rota não encontrada' });
}

function serveStatic(res, absPath) {
  fs.readFile(absPath, (err, data) => {
    if (err) return send(res, 404, 'Arquivo não encontrado: ' + absPath);
    const ext = path.extname(absPath).toLowerCase();
    send(res, 200, data, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (!checkAuth(req)) {
      res.writeHead(401, {
        'WWW-Authenticate': 'Basic realm="Editor de carrossel Jone&Co"',
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('Autenticação necessária.');
      return;
    }

    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const query = new URLSearchParams(req.url.split('?')[1] || '');

    if (urlPath.startsWith('/__editor/api/')) {
      return await handleApi(req, res, urlPath, query);
    }

    if (urlPath === '/') {
      res.writeHead(302, { Location: '/__editor' });
      return res.end();
    }

    if (urlPath === '/__editor' || urlPath === '/__editor/') {
      return serveStatic(res, path.join(PUBLIC_DIR, 'editor.html'));
    }

    if (urlPath.startsWith('/__editor/')) {
      const rel = urlPath.replace('/__editor/', '');
      const abs = safeJoin(PUBLIC_DIR, rel);
      return serveStatic(res, abs);
    }

    // Serve o restante como arquivos reais do projeto (pra resolver os caminhos
    // relativos de identidade/, logos do site, etc. exatamente como no disco)
    const abs = safeJoin(ROOT, '.' + urlPath);
    const stat = fs.existsSync(abs) && fs.statSync(abs);
    if (!stat || stat.isDirectory()) return send(res, 404, 'Não encontrado');
    return serveStatic(res, abs);
  } catch (e) {
    send(res, 403, 'Bloqueado: ' + e.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Editor de carrossel rodando em http://localhost:${PORT}/__editor`);
  checkAgenda().catch((e) => console.error('[agenda] erro na checagem inicial:', e.message));
  setInterval(() => {
    checkAgenda().catch((e) => console.error('[agenda] erro:', e.message));
  }, AGENDA_CHECK_MS);
});
