const fs = require('fs');
const path = require('path');

const [, , pastaArg] = process.argv;

if (!pastaArg) {
  console.error('Uso: node --env-file=.env scripts/postar-facebook.js marketing/conteudo/<pasta-do-carrossel>');
  process.exit(1);
}

const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
const pageId = process.env.META_PAGE_ID;
const siteUrl = process.env.SITE_URL;

if (!pageToken || !pageId || !siteUrl) {
  console.error('Faltam META_PAGE_ACCESS_TOKEN, META_PAGE_ID ou SITE_URL no .env');
  process.exit(1);
}

const pastaAbs = path.resolve(pastaArg);
const nomePasta = path.basename(pastaAbs);
const match = nomePasta.match(/^carrossel-(.+)-\d{4}-\d{2}-\d{2}$/);

if (!match) {
  console.error(`Não consegui extrair o slug de "${nomePasta}". Esperado formato: carrossel-<slug>-YYYY-MM-DD`);
  process.exit(1);
}

const slug = match[1];
const instagramDir = path.join(pastaAbs, 'instagram');
const legendaPath = path.join(pastaAbs, 'legenda.md');

if (!fs.existsSync(instagramDir)) {
  console.error(`Pasta não encontrada: ${instagramDir}`);
  process.exit(1);
}
if (!fs.existsSync(legendaPath)) {
  console.error(`legenda.md não encontrado em ${pastaAbs}`);
  process.exit(1);
}

const slides = fs
  .readdirSync(instagramDir)
  .filter((f) => /^slide-\d+\.png$/.test(f))
  .sort();

if (slides.length === 0) {
  console.error(`Nenhum slide encontrado em ${instagramDir}`);
  process.exit(1);
}

const legenda = fs.readFileSync(legendaPath, 'utf-8').trim();

const GRAPH = 'https://graph.facebook.com/v21.0';

async function graphPost(edge, params) {
  const url = new URL(`${GRAPH}/${edge}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: pageToken }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Erro na Graph API (${edge}): ${JSON.stringify(data.error || data)}`);
  }
  return data;
}

(async () => {
  console.log(`Publicando carrossel "${slug}" (${slides.length} slides) na Página do Facebook ${pageId}...`);

  const mediaFbids = [];
  for (const slide of slides) {
    const imageUrl = `${siteUrl}/img/posts/${slug}/${slide}`;
    console.log(`  Enviando ${slide} (${imageUrl})...`);
    const photo = await graphPost(`${pageId}/photos`, {
      url: imageUrl,
      published: 'false',
    });
    mediaFbids.push(photo.id);
  }

  console.log('  Publicando post...');
  const attachedMedia = mediaFbids.map((id) => JSON.stringify({ media_fbid: id }));
  const post = await graphPost(`${pageId}/feed`, {
    message: legenda,
    ...Object.fromEntries(attachedMedia.map((m, i) => [`attached_media[${i}]`, m])),
  });

  console.log('');
  console.log('✓ Publicado no Facebook');
  console.log(`  post id: ${post.id}`);
  console.log(`  link: https://facebook.com/${post.id}`);
})().catch((err) => {
  console.error('Falha ao publicar no Facebook:', err.message);
  process.exitCode = 1;
});
