let posts = [];
let currentPost = null;

const frame = document.getElementById('slide-frame');
const postSelect = document.getElementById('post-select');
const slideList = document.getElementById('slide-list');
const statusEl = document.getElementById('status');
const toolbarMsg = document.getElementById('toolbar-msg');
const previewStrip = document.getElementById('preview-strip');

async function loadPosts() {
  const res = await fetch('/__editor/api/posts');
  posts = await res.json();
  postSelect.innerHTML = posts
    .map((p, i) => `<option value="${i}">${p.titulo} (${p.data})</option>`)
    .join('');
  if (posts.length) selectPost(0);
  else toolbarMsg.textContent = 'Nenhum carrossel encontrado em marketing/conteudo/';
}

function selectPost(index) {
  currentPost = posts[index];
  postSelect.value = index;
  previewStrip.innerHTML = '';
  loadFrame();
  loadLegenda();
  loadAgendaStatusAtual();
}

const legendaText = document.getElementById('legenda-text');
const legendaMsg = document.getElementById('legenda-msg');

async function loadLegenda() {
  legendaText.value = '';
  legendaMsg.textContent = '';
  const res = await fetch(`/__editor/api/legenda?folder=${encodeURIComponent(currentPost.folder)}`);
  const data = await res.json();
  legendaText.value = data.legenda || '';
}

async function saveLegenda() {
  const res = await fetch('/__editor/api/legenda', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: currentPost.folder, legenda: legendaText.value }),
  });
  const data = await res.json();
  legendaMsg.textContent = data.ok ? 'Legenda salva.' : `Erro: ${data.erro}`;
  return data.ok;
}

document.getElementById('btn-save-legenda').addEventListener('click', saveLegenda);

function loadFrame() {
  toolbarMsg.textContent = 'Carregando...';
  document.getElementById('propriedades-secao').style.display = 'none';
  frame.src = currentPost.htmlUrl + '?t=' + Date.now();
}

frame.addEventListener('load', () => {
  try {
    frame.contentWindow.__EDITOR_FOLDER__ = currentPost.folder;
    const script = frame.contentDocument.createElement('script');
    script.setAttribute('data-editor-injected', 'true');
    script.src = '/__editor/inject.js';
    frame.contentDocument.head.appendChild(script);
  } catch (e) {
    toolbarMsg.textContent = 'Erro ao preparar edição: ' + e.message;
    return;
  }
  buildSlideList();
  toolbarMsg.textContent = 'Pronto';
});

function buildSlideList() {
  const slides = frame.contentDocument.querySelectorAll('.slide');
  slideList.innerHTML = '';
  slides.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'slide-item' + (i === 0 ? ' active' : '');
    item.textContent = `Slide ${i + 1}`;
    item.addEventListener('click', () => {
      document.querySelectorAll('.slide-item').forEach((el) => el.classList.remove('active'));
      item.classList.add('active');
      s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    slideList.appendChild(item);
  });
}

function cleanedHtml() {
  const clone = frame.contentDocument.documentElement.cloneNode(true);
  clone.querySelectorAll('[data-editor-injected]').forEach((el) => el.remove());
  clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
  return '<!DOCTYPE html>\n' + clone.outerHTML;
}

async function saveCurrent() {
  toolbarMsg.textContent = 'Salvando...';
  const res = await fetch('/__editor/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: currentPost.folder, html: cleanedHtml() }),
  });
  const data = await res.json();
  if (data.ok) {
    toolbarMsg.textContent = `Salvo (backup: ${data.backup})`;
  } else {
    toolbarMsg.textContent = `Erro ao salvar: ${data.erro}`;
  }
  return data.ok;
}

document.getElementById('btn-save').addEventListener('click', saveCurrent);

document.getElementById('btn-undo').addEventListener('click', () => {
  frame.contentWindow.postMessage({ type: 'undo' }, '*');
});
document.getElementById('btn-redo').addEventListener('click', () => {
  frame.contentWindow.postMessage({ type: 'redo' }, '*');
});

// Ctrl+Z/Ctrl+Y funcionam mesmo com o foco fora do iframe (ex: acabou de
// clicar numa forma na barra lateral). Se o foco estiver num campo de texto
// da própria página (legenda, campos numéricos), deixa o desfazer nativo do
// campo agir — não intercepta.
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT') return;
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    frame.contentWindow.postMessage({ type: 'undo' }, '*');
  } else if (ctrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    e.preventDefault();
    frame.contentWindow.postMessage({ type: 'redo' }, '*');
  }
});

document.getElementById('btn-reload').addEventListener('click', () => {
  if (!confirm('Descartar as alterações não salvas e recarregar o arquivo original?')) return;
  loadFrame();
});

document.getElementById('btn-render').addEventListener('click', async () => {
  const ok = await saveCurrent();
  if (!ok) return;
  toolbarMsg.textContent = 'Renderizando (pode levar alguns segundos)...';
  const res = await fetch('/__editor/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: currentPost.folder }),
  });
  const data = await res.json();
  if (data.ok) {
    toolbarMsg.textContent = 'Renderizado.';
    showPreview();
  } else {
    toolbarMsg.textContent = `Erro ao renderizar: ${data.erro}`;
  }
});

function showPreview() {
  const numSlides = frame.contentDocument.querySelectorAll('.slide').length;
  previewStrip.innerHTML = '';
  const t = Date.now();
  for (let i = 1; i <= numSlides; i++) {
    const num = String(i).padStart(2, '0');
    const img = document.createElement('img');
    img.src = `${currentPost.instagramBaseUrl}slide-${num}.png?t=${t}`;
    img.title = `Slide ${i} renderizado`;
    previewStrip.appendChild(img);
  }
}

// --- Agenda ---
const agendaStatusAtual = document.getElementById('agenda-status-atual');
const agendaDatetime = document.getElementById('agenda-datetime');
const btnAgendar = document.getElementById('btn-agendar');
const btnCancelarAgendamento = document.getElementById('btn-cancelar-agendamento');
const agendaMsg = document.getElementById('agenda-msg');
const agendaPanel = document.getElementById('agenda-panel');
const btnVerAgenda = document.getElementById('btn-ver-agenda');

function formatDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

async function loadAgendaStatusAtual() {
  agendaMsg.textContent = '';
  const res = await fetch('/__editor/api/agenda');
  const agenda = await res.json();
  const item = agenda.find((i) => i.folder === currentPost.folder);

  if (!item) {
    agendaStatusAtual.textContent = 'Não agendado.';
    agendaStatusAtual.className = '';
    btnCancelarAgendamento.style.display = 'none';
    btnAgendar.style.display = 'block';
    agendaDatetime.disabled = false;
    return;
  }

  if (item.status === 'agendado') {
    agendaStatusAtual.textContent = `Agendado pra ${formatDataHora(item.scheduledFor)}`;
    agendaStatusAtual.className = 'agendado';
    btnCancelarAgendamento.style.display = 'block';
    btnAgendar.textContent = 'Reagendar';
  } else if (item.status === 'publicado') {
    agendaStatusAtual.textContent = `Publicado automaticamente em ${formatDataHora(item.resultado?.publishedAt || item.scheduledFor)}`;
    agendaStatusAtual.className = 'publicado';
    btnCancelarAgendamento.style.display = 'none';
    btnAgendar.style.display = 'none';
  } else if (item.status === 'atrasado') {
    agendaStatusAtual.textContent = `Atrasado — era pra publicar em ${formatDataHora(item.scheduledFor)} e ninguém confirmou. Publica manualmente ou reagenda.`;
    agendaStatusAtual.className = '';
    btnCancelarAgendamento.style.display = 'block';
    btnAgendar.textContent = 'Reagendar';
  } else if (item.status === 'erro') {
    agendaStatusAtual.textContent = `Erro ao publicar automaticamente: ${item.erro || ''}`;
    agendaStatusAtual.className = '';
    btnCancelarAgendamento.style.display = 'block';
    btnAgendar.textContent = 'Reagendar';
  }
}

btnAgendar.addEventListener('click', async () => {
  if (!agendaDatetime.value) {
    agendaMsg.textContent = 'Escolhe uma data e hora primeiro.';
    return;
  }
  const scheduledFor = new Date(agendaDatetime.value).toISOString();
  const confirmMsg =
    `Confirma agendar "${currentPost.titulo}" pra ${formatDataHora(scheduledFor)}?\n\n` +
    `Na hora marcada, o sistema vai publicar sozinho no Instagram e Facebook, SEM pedir confirmação de novo. ` +
    `Só funciona se este computador estiver ligado nesse horário.`;
  if (!confirm(confirmMsg)) return;

  const okLegenda = await saveLegenda();
  if (!okLegenda) return;
  const okHtml = await saveCurrent();
  if (!okHtml) return;

  const res = await fetch('/__editor/api/agenda', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: currentPost.folder, scheduledFor }),
  });
  const data = await res.json();
  agendaMsg.textContent = data.ok ? 'Agendado.' : `Erro: ${data.erro}`;
  if (data.ok) {
    btnAgendar.textContent = 'Agendar publicação automática';
    loadAgendaStatusAtual();
  }
});

btnCancelarAgendamento.addEventListener('click', async () => {
  if (!confirm('Cancelar o agendamento desse post?')) return;
  await fetch('/__editor/api/agenda/cancelar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: currentPost.folder }),
  });
  btnAgendar.textContent = 'Agendar publicação automática';
  loadAgendaStatusAtual();
});

btnVerAgenda.addEventListener('click', async () => {
  if (agendaPanel.classList.contains('show')) {
    agendaPanel.classList.remove('show');
    return;
  }
  const res = await fetch('/__editor/api/agenda');
  const agenda = await res.json();
  agenda.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

  if (agenda.length === 0) {
    agendaPanel.innerHTML = '<p style="color:#8A93A0;">Nada agendado ainda.</p>';
  } else {
    const rows = agenda
      .map(
        (i) => `<tr>
          <td>${i.titulo}</td>
          <td>${formatDataHora(i.scheduledFor)}</td>
          <td><span class="tag ${i.status}">${i.status}</span></td>
        </tr>`
      )
      .join('');
    agendaPanel.innerHTML = `<table><thead><tr><th>Post</th><th>Quando</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  agendaPanel.classList.add('show');
});

const publishLog = document.getElementById('publish-log');
const btnPublish = document.getElementById('btn-publish');

function renderPublishSteps(steps) {
  publishLog.classList.add('show');
  publishLog.innerHTML = steps
    .map((s) => `<div class="step ${s.ok ? 'ok' : 'fail'}">${s.ok ? '✓' : '✗'} ${s.nome}${s.log ? ' — ' + escapeHtml(String(s.log)).slice(0, 200) : ''}</div>`)
    .join('');
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function doPublish(force) {
  btnPublish.disabled = true;
  publishLog.classList.add('show');
  publishLog.innerHTML = '<div class="step pending">Publicando — isso pode levar 1 a 2 minutos (deploy do site + Instagram + Facebook)...</div>';
  try {
    const res = await fetch('/__editor/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: currentPost.folder, force: !!force }),
    });
    const data = await res.json();

    if (res.status === 409 && data.erro === 'ja-publicado') {
      publishLog.classList.remove('show');
      btnPublish.disabled = false;
      const info = data.info;
      const republicar = confirm(
        `Esse post já foi publicado em ${new Date(info.publishedAt).toLocaleString('pt-BR')}.\nInstagram: ${info.instagramLink}\n\nQuer publicar de novo mesmo assim?`
      );
      if (republicar) return doPublish(true);
      return;
    }

    if (data.steps) renderPublishSteps(data.steps);

    if (data.ok) {
      const links = [];
      if (data.instagramLink) links.push(`<a href="${data.instagramLink}" target="_blank">Instagram</a>`);
      if (data.facebookLink) links.push(`<a href="${data.facebookLink}" target="_blank">Facebook</a>`);
      if (data.facebookFailed) links.push('Facebook FALHOU — tenta de novo depois só o Facebook');
      publishLog.innerHTML += `<div class="step ok">✓ Publicado! ${links.join(' · ')}</div>`;
      toolbarMsg.textContent = 'Publicado.';
    } else {
      toolbarMsg.textContent = `Erro ao publicar: ${data.erro}`;
    }
  } catch (err) {
    toolbarMsg.textContent = 'Erro ao publicar: ' + err.message;
  } finally {
    btnPublish.disabled = false;
  }
}

btnPublish.addEventListener('click', async () => {
  const ok = await saveCurrent();
  if (!ok) return;
  const legendaOk = await saveLegenda();
  if (!legendaOk) return;
  const numSlides = frame.contentDocument.querySelectorAll('.slide').length;
  const confirmMsg =
    `Confirma publicação de "${currentPost.titulo}" (${numSlides} slides)?\n\n` +
    `Isso vai: fazer deploy do site, publicar no Instagram (@jone.andco) e no Facebook (Jone&Co.).\n` +
    `Ação real e IRREVERSÍVEL.`;
  if (!confirm(confirmMsg)) return;
  await doPublish(false);
});

postSelect.addEventListener('change', () => selectPost(Number(postSelect.value)));

// --- Zoom ---
const zoomSelect = document.getElementById('zoom-select');
const iframeStage = document.getElementById('iframe-stage');
zoomSelect.addEventListener('change', () => {
  const z = parseFloat(zoomSelect.value);
  frame.style.transform = `scale(${z})`;
  iframeStage.style.width = 1080 * z + 'px';
  iframeStage.style.height = 1350 * z + 'px';
});

// --- Formas ---
document.querySelectorAll('.btn-forma').forEach((btn) => {
  btn.addEventListener('click', () => {
    frame.contentWindow.postMessage({ type: 'insert-shape', tipo: btn.dataset.shape }, '*');
  });
});

// --- Propriedades do elemento selecionado (cor, posição, tamanho) ---
const BRAND_COLORS = [
  { nome: 'Lime', valor: '#C6F24B' },
  { nome: 'Violet', valor: '#7C5CFF' },
  { nome: 'Bone', valor: '#F2EFE9' },
  { nome: 'Off-white', valor: '#E8ECF1' },
  { nome: 'Ink', valor: '#1A1714' },
  { nome: 'Dark', valor: '#0E1116' },
  { nome: 'Muted', valor: '#8A93A0' },
  { nome: 'Stone', valor: '#6B6258' },
  { nome: 'Red', valor: '#f87171' },
];

function buildSwatches(container, target) {
  container.innerHTML = '';
  BRAND_COLORS.forEach((c) => {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.title = c.nome;
    sw.style.background = c.valor;
    sw.addEventListener('click', () => {
      frame.contentWindow.postMessage({ type: 'apply-color', target, value: c.valor }, '*');
    });
    container.appendChild(sw);
  });
}
buildSwatches(document.getElementById('swatches-texto'), 'texto');
buildSwatches(document.getElementById('swatches-fundo'), 'fundo');

document.getElementById('btn-fundo-transparente').addEventListener('click', () => {
  frame.contentWindow.postMessage({ type: 'apply-transparent-bg' }, '*');
});

document.getElementById('btn-excluir-elemento').addEventListener('click', () => {
  if (!confirm('Excluir esse elemento?')) return;
  frame.contentWindow.postMessage({ type: 'delete-selected' }, '*');
});

const propSecao = document.getElementById('propriedades-secao');
const propTag = document.getElementById('prop-tag');
const blocoFundo = document.getElementById('bloco-fundo');
const blocoPosicao = document.getElementById('bloco-posicao');
const propX = document.getElementById('prop-x');
const propY = document.getElementById('prop-y');
const propW = document.getElementById('prop-w');
const propH = document.getElementById('prop-h');

function wireProp(input, campo) {
  input.addEventListener('change', () => {
    const v = parseInt(input.value, 10);
    if (isNaN(v)) return;
    frame.contentWindow.postMessage({ type: 'apply-position', [campo]: v }, '*');
  });
}
wireProp(propX, 'left');
wireProp(propY, 'top');
wireProp(propW, 'width');
wireProp(propH, 'height');

window.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg || msg.type !== 'selection') return;

  if (!msg.count) {
    propSecao.style.display = 'none';
    return;
  }

  propSecao.style.display = 'block';

  if (msg.count === 1) {
    propTag.textContent = `<${msg.el.tag.toLowerCase()}>`;
    blocoFundo.style.display = msg.el.isImage ? 'none' : 'block';
    blocoPosicao.style.display = 'block';
    propX.value = msg.el.left;
    propY.value = msg.el.top;
    propW.value = msg.el.width;
    propH.value = msg.el.height;
  } else {
    propTag.textContent = `${msg.count} elementos`;
    blocoFundo.style.display = 'block';
    blocoPosicao.style.display = 'none';
  }
});

loadPosts();
