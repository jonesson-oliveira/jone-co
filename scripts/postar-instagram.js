const fs = require('fs');
const path = require('path');

const [, , pastaArg] = process.argv;

if (!pastaArg) {
  console.error('Uso: node --env-file=.env scripts/postar-instagram.js marketing/conteudo/<pasta-do-carrossel>');
  process.exit(1);
}

const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
const igUserId = process.env.META_IG_USER_ID;
const siteUrl = process.env.SITE_URL;

if (!pageToken || !igUserId || !siteUrl) {
  console.error('Faltam META_PAGE_ACCESS_TOKEN, META_IG_USER_ID ou SITE_URL no .env');
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

if (slides.length < 2) {
  console.error(`Preciso de pelo menos 2 slides pra montar um carrossel. Achei ${slides.length} em ${instagramDir}`);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function aguardarProcessamento(containerId, tentativas = 15, intervaloMs = 3000) {
  for (let i = 0; i < tentativas; i++) {
    const res = await fetch(
      `${GRAPH}/${containerId}?fields=status_code&access_token=${encodeURIComponent(pageToken)}`
    );
    const data = await res.json();
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') {
      throw new Error(`Container ${containerId} falhou no processamento: ${JSON.stringify(data)}`);
    }
    await sleep(intervaloMs);
  }
  throw new Error(`Container ${containerId} não terminou de processar a tempo`);
}

(async () => {
  console.log(`Publicando carrossel "${slug}" (${slides.length} slides) na conta Instagram ${igUserId}...`);

  const childrenIds = [];
  for (const slide of slides) {
    const imageUrl = `${siteUrl}/img/posts/${slug}/${slide}`;
    console.log(`  Enviando ${slide} (${imageUrl})...`);
    const item = await graphPost(`${igUserId}/media`, {
      image_url: imageUrl,
      is_carousel_item: 'true',
    });
    childrenIds.push(item.id);
  }

  console.log('  Criando container do carrossel...');
  const container = await graphPost(`${igUserId}/media`, {
    media_type: 'CAROUSEL',
    children: childrenIds.join(','),
    caption: legenda,
  });

  console.log('  Aguardando o carrossel terminar de processar...');
  await aguardarProcessamento(container.id);

  console.log('  Publicando...');
  const published = await graphPost(`${igUserId}/media_publish`, {
    creation_id: container.id,
  });

  const permalinkRes = await fetch(
    `${GRAPH}/${published.id}?fields=permalink&access_token=${encodeURIComponent(pageToken)}`
  );
  const permalinkData = await permalinkRes.json();

  console.log('');
  console.log('✓ Publicado no Instagram');
  console.log(`  post id: ${published.id}`);
  if (permalinkData.permalink) {
    console.log(`  link: ${permalinkData.permalink}`);
  }
})().catch((err) => {
  console.error('Falha ao publicar no Instagram:', err.message);
  process.exitCode = 1;
});
