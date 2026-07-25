(function () {
  const FOLDER = window.__EDITOR_FOLDER__;
  let selectedEls = [];
  let dragState = null;
  let marqueeState = null;

  function px(n) {
    return Math.round(n) + 'px';
  }

  const hoverStyle = document.createElement('style');
  hoverStyle.setAttribute('data-editor-injected', 'true');
  hoverStyle.textContent = `
    .slide * { cursor: pointer; }
    .slide *:hover { outline: 1px dashed rgba(198,242,75,0.35); outline-offset: -1px; }
  `;
  document.head.appendChild(hoverStyle);

  const overlayPool = [];
  function getOverlayBox(i) {
    if (overlayPool[i]) return overlayPool[i];
    const box = document.createElement('div');
    box.setAttribute('data-editor-injected', 'true');
    box.style.cssText = 'position:fixed; border:2px dashed #C6F24B; pointer-events:none; z-index:999998; display:none;';
    document.body.appendChild(box);
    overlayPool[i] = box;
    return box;
  }

  const handleResize = document.createElement('div');
  handleResize.setAttribute('data-editor-injected', 'true');
  handleResize.style.cssText = 'position:fixed; width:16px; height:16px; background:#C6F24B; border:2px solid #1A1714; cursor:nwse-resize; z-index:999999; display:none;';
  document.body.appendChild(handleResize);

  const imgToolbar = document.createElement('div');
  imgToolbar.setAttribute('data-editor-injected', 'true');
  imgToolbar.textContent = 'Trocar imagem';
  imgToolbar.style.cssText = 'position:fixed; background:#7C5CFF; color:white; font:600 13px sans-serif; padding:6px 12px; border-radius:4px; cursor:pointer; z-index:999999; display:none;';
  document.body.appendChild(imgToolbar);

  const fileInput = document.createElement('input');
  fileInput.setAttribute('data-editor-injected', 'true');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  const marqueeBox = document.createElement('div');
  marqueeBox.setAttribute('data-editor-injected', 'true');
  marqueeBox.style.cssText =
    'position:fixed; border:1px solid #C6F24B; background:rgba(198,242,75,0.12); z-index:999997; display:none; pointer-events:none;';
  document.body.appendChild(marqueeBox);

  function slideMaisVisivel() {
    const slides = Array.from(document.querySelectorAll('.slide'));
    let melhor = slides[0];
    let melhorArea = -1;
    const vh = window.innerHeight;
    for (const s of slides) {
      const r = s.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      if (overlap > melhorArea) {
        melhorArea = overlap;
        melhor = s;
      }
    }
    return melhor;
  }

  function elementosSelecionaveis(slide) {
    return Array.from(slide.children).filter(
      (el) => !el.classList.contains('grain') && !el.classList.contains('scanlines')
    );
  }

  function inserirForma(tipo) {
    const slide = slideMaisVisivel();
    if (!slide) return;
    const el = document.createElement('div');
    const base = 'position:absolute; z-index:4; background:#C6F24B; left:440px; top:600px;';
    if (tipo === 'retangulo') el.style.cssText = base + 'width:200px; height:120px;';
    if (tipo === 'linha') el.style.cssText = base + 'width:200px; height:4px;';
    if (tipo === 'circulo') el.style.cssText = base + 'width:140px; height:140px; border-radius:50%;';
    slide.appendChild(el);
    selectOnly(el);
  }

  // --- Seleção (única ou múltipla) ---
  function isSelected(el) {
    return selectedEls.includes(el);
  }
  function selectOnly(el) {
    selectedEls = el ? [el] : [];
    updateOverlay();
    reportSelection();
  }
  function selectMultiple(els) {
    selectedEls = els.slice();
    updateOverlay();
    reportSelection();
  }
  function toggleSelection(el) {
    const i = selectedEls.indexOf(el);
    if (i === -1) selectedEls.push(el);
    else selectedEls.splice(i, 1);
    updateOverlay();
    reportSelection();
  }
  function selectAllInSlide() {
    const slide = slideMaisVisivel();
    if (!slide) return;
    selectMultiple(elementosSelecionaveis(slide));
  }

  function updateOverlay() {
    overlayPool.forEach((b) => (b.style.display = 'none'));
    selectedEls.forEach((el, i) => {
      const box = getOverlayBox(i);
      const r = el.getBoundingClientRect();
      box.style.display = 'block';
      box.style.left = px(r.left);
      box.style.top = px(r.top);
      box.style.width = px(r.width);
      box.style.height = px(r.height);
    });

    const single = selectedEls.length === 1 ? selectedEls[0] : null;
    if (single) {
      const r = single.getBoundingClientRect();
      handleResize.style.display = 'block';
      handleResize.style.left = px(r.right - 10);
      handleResize.style.top = px(r.bottom - 10);
      if (single.tagName === 'IMG') {
        imgToolbar.style.display = 'block';
        imgToolbar.style.left = px(r.left);
        imgToolbar.style.top = px(Math.max(0, r.top - 30));
      } else {
        imgToolbar.style.display = 'none';
      }
    } else {
      handleResize.style.display = 'none';
      imgToolbar.style.display = 'none';
    }
  }

  // Reporta a seleção pra página pai, que desenha o painel de Propriedades
  // em tamanho real (fora da área reduzida do iframe).
  function reportSelection() {
    if (selectedEls.length === 0) {
      window.parent.postMessage({ type: 'selection', count: 0, el: null }, '*');
      return;
    }
    if (selectedEls.length > 1) {
      window.parent.postMessage({ type: 'selection', count: selectedEls.length, el: null }, '*');
      return;
    }
    const el = selectedEls[0];
    const parentEl = el.offsetParent || el.parentElement;
    const parentRect = parentEl.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    window.parent.postMessage(
      {
        type: 'selection',
        count: 1,
        el: {
          tag: el.tagName,
          isImage: el.tagName === 'IMG',
          left: Math.round(r.left - parentRect.left),
          top: Math.round(r.top - parentRect.top),
          width: Math.round(r.width),
          height: Math.round(r.height),
          color: el.style.color || '',
          background: el.style.backgroundColor || '',
        },
      },
      '*'
    );
  }

  function floatAbsolute(el) {
    const parentEl = el.offsetParent || el.parentElement;
    const parentRect = parentEl.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    el.style.position = 'absolute';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = px(rect.left - parentRect.left);
    el.style.top = px(rect.top - parentRect.top);
    el.style.margin = '0';
  }

  // --- Desfazer / Refazer (guarda o HTML interno de cada slide antes de cada mudança) ---
  const UNDO_LIMIT = 50;
  let undoStack = [];
  let redoStack = [];

  function getSlideSnapshots() {
    return Array.from(document.querySelectorAll('.slide')).map((s) => s.innerHTML);
  }
  function restoreSlideSnapshots(snaps) {
    const slides = document.querySelectorAll('.slide');
    slides.forEach((s, i) => {
      if (snaps[i] != null) s.innerHTML = snaps[i];
    });
  }
  function pushUndoSnapshot() {
    undoStack.push(getSlideSnapshots());
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    redoStack = [];
  }
  function doUndo() {
    if (!undoStack.length) return;
    const current = getSlideSnapshots();
    const prev = undoStack.pop();
    redoStack.push(current);
    selectOnly(null);
    restoreSlideSnapshots(prev);
  }
  function doRedo() {
    if (!redoStack.length) return;
    const current = getSlideSnapshots();
    const next = redoStack.pop();
    undoStack.push(current);
    selectOnly(null);
    restoreSlideSnapshots(next);
  }

  // --- Seleção em laço (arrastar num espaço vazio) ---
  function startMarquee(e) {
    marqueeState = { startX: e.clientX, startY: e.clientY };
    marqueeBox.style.display = 'block';
    updateMarqueeBox(e.clientX, e.clientY);
  }
  function updateMarqueeBox(x2, y2) {
    const x1 = Math.min(marqueeState.startX, x2);
    const y1 = Math.min(marqueeState.startY, y2);
    marqueeBox.style.left = px(x1);
    marqueeBox.style.top = px(y1);
    marqueeBox.style.width = px(Math.abs(x2 - marqueeState.startX));
    marqueeBox.style.height = px(Math.abs(y2 - marqueeState.startY));
  }
  function finishMarquee() {
    const rect = marqueeBox.getBoundingClientRect();
    marqueeBox.style.display = 'none';
    const slide = slideMaisVisivel();
    if (slide && rect.width > 3 && rect.height > 3) {
      const achados = elementosSelecionaveis(slide).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left < rect.right && r.right > rect.left && r.top < rect.bottom && r.bottom > rect.top;
      });
      selectMultiple(achados);
    }
    marqueeState = null;
  }

  document.addEventListener('mousedown', (e) => {
    if (e.target.closest && e.target.closest('[data-editor-injected]')) return;
    // Clicando dentro do texto que já está em edição: deixa o navegador
    // posicionar o cursor / iniciar seleção de texto normalmente.
    if (e.target.closest && e.target.closest('[contenteditable="true"]')) return;

    const el = e.target;
    const isBackground = el === document.body || el === document.documentElement || el.classList.contains('slide');

    if (isBackground) {
      e.preventDefault();
      if (!e.shiftKey) selectOnly(null);
      startMarquee(e);
      return;
    }

    e.preventDefault();
    let startedAsGroupDrag = false;
    if (e.shiftKey) {
      toggleSelection(el);
    } else if (isSelected(el) && selectedEls.length > 1) {
      startedAsGroupDrag = true; // mantém o grupo selecionado pra poder arrastar junto
    } else {
      selectOnly(el);
    }
    dragState = { el, startX: e.clientX, startY: e.clientY, moved: false, startedAsGroupDrag };
  });

  document.addEventListener('mousemove', (e) => {
    updateOverlay();
    if (marqueeState) {
      updateMarqueeBox(e.clientX, e.clientY);
      return;
    }
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (!dragState.moved) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      dragState.moved = true;
      pushUndoSnapshot();
      const grupo = dragState.startedAsGroupDrag ? selectedEls.slice() : [dragState.el];
      dragState.grupo = grupo.map((el) => {
        floatAbsolute(el);
        return { el, baseLeft: parseFloat(el.style.left) || 0, baseTop: parseFloat(el.style.top) || 0 };
      });
    }
    dragState.grupo.forEach(({ el, baseLeft, baseTop }) => {
      el.style.left = px(baseLeft + dx);
      el.style.top = px(baseTop + dy);
    });
    updateOverlay();
  });

  document.addEventListener('mouseup', () => {
    if (marqueeState) finishMarquee();
    if (dragState) {
      if (dragState.moved) {
        reportSelection();
      } else if (dragState.startedAsGroupDrag) {
        selectOnly(dragState.el);
      }
    }
    dragState = null;
  });

  document.addEventListener('scroll', updateOverlay, true);

  handleResize.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedEls.length !== 1) return;
    const selected = selectedEls[0];
    pushUndoSnapshot();
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = selected.getBoundingClientRect();
    const startW = rect.width;
    const startH = rect.height;

    function onMove(ev) {
      const dw = ev.clientX - startX;
      const dh = ev.clientY - startY;
      selected.style.width = px(Math.max(20, startW + dw));
      selected.style.height = px(Math.max(20, startH + dh));
      updateOverlay();
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      reportSelection();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  document.addEventListener('dblclick', (e) => {
    const el = e.target;
    if (el.tagName === 'IMG' || el === document.body) return;
    e.stopPropagation();
    pushUndoSnapshot();
    selectOnly(el);
    el.contentEditable = 'true';
    el.focus();
    const onBlur = () => {
      el.contentEditable = 'false';
      el.removeEventListener('blur', onBlur);
    };
    el.addEventListener('blur', onBlur);
  });

  imgToolbar.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    const single = selectedEls.length === 1 ? selectedEls[0] : null;
    if (!file || !single || single.tagName !== 'IMG') return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/__editor/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: FOLDER, dataUrl: reader.result }),
        });
        const data = await res.json();
        if (data.ok) {
          single.src = data.relPath + '?t=' + Date.now();
          updateOverlay();
        } else {
          alert('Falha no upload: ' + (data.erro || 'erro desconhecido'));
        }
      } catch (err) {
        alert('Falha no upload: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });

  document.addEventListener('keydown', (e) => {
    const editandoTexto = document.activeElement && document.activeElement.isContentEditable;
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      if (editandoTexto) return;
      e.preventDefault();
      doUndo();
      return;
    }
    if (ctrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      if (editandoTexto) return;
      e.preventDefault();
      doRedo();
      return;
    }
    if (ctrl && e.key.toLowerCase() === 'a') {
      if (editandoTexto) return; // deixa selecionar todo o texto do campo normalmente
      e.preventDefault();
      selectAllInSlide();
      return;
    }
    if (e.key === 'Escape') {
      selectOnly(null);
      return;
    }
    if (
      (e.key === 'Delete' || e.key === 'Backspace') &&
      selectedEls.length &&
      document.activeElement !== selectedEls[0]
    ) {
      e.preventDefault();
      pushUndoSnapshot();
      const remover = selectedEls.slice();
      selectOnly(null);
      remover.forEach((el) => el.remove());
    }
  });

  // Comandos vindos do painel da página pai (fora do iframe reduzido).
  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || !msg.type) return;

    if (msg.type === 'undo') return doUndo();
    if (msg.type === 'redo') return doRedo();

    if (msg.type === 'insert-shape') {
      pushUndoSnapshot();
      inserirForma(msg.tipo);
      return;
    }

    if (selectedEls.length === 0) return;

    if (msg.type === 'apply-color') {
      pushUndoSnapshot();
      selectedEls.forEach((el) => {
        if (msg.target === 'texto') el.style.color = msg.value;
        else el.style.backgroundColor = msg.value;
      });
    } else if (msg.type === 'apply-transparent-bg') {
      pushUndoSnapshot();
      selectedEls.forEach((el) => (el.style.backgroundColor = 'transparent'));
    } else if (msg.type === 'delete-selected') {
      pushUndoSnapshot();
      const remover = selectedEls.slice();
      selectOnly(null);
      remover.forEach((el) => el.remove());
      return;
    } else if (msg.type === 'apply-position' && selectedEls.length === 1) {
      pushUndoSnapshot();
      const el = selectedEls[0];
      floatAbsolute(el);
      if (msg.left != null) el.style.left = px(msg.left);
      if (msg.top != null) el.style.top = px(msg.top);
      if (msg.width != null) el.style.width = px(msg.width);
      if (msg.height != null) el.style.height = px(msg.height);
    } else {
      return;
    }
    updateOverlay();
    reportSelection();
  });
})();
