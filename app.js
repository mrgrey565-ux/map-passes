// app.js
import { PASSES, REGIONS } from './data.js';
import { AnnotationEngine } from './annotation.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEWBOX = { width: 1000, height: 1000 };

const state = {
  activeId: null,
  passes: PASSES,
  isAnnotating: false
};

const els = {
  passList: document.getElementById('passList'),
  markers: document.getElementById('markers'),
  regions: document.getElementById('regions'),
  regionLabels: document.getElementById('regionLabels'),
  gridLines: document.getElementById('gridLines'),
  detailContent: document.getElementById('detailContent'),
  detailState: document.getElementById('detailState'),
  counterCurrent: document.getElementById('counterCurrent'),
  counterTotal: document.getElementById('counterTotal'),
  status: document.getElementById('statusIndicator'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  appMain: document.querySelector('.app-main'),
  // Annotation
  annotateToggle: document.getElementById('annotateToggle'),
  annotToolbar: document.getElementById('annotToolbar'),
  annotationHost: document.getElementById('annotationHost'),
  annotationCanvas: document.getElementById('annotationCanvas'),
  shapeLayer: document.getElementById('shapeLayer'),
  textLayer: document.getElementById('textLayer'),
  strokeSize: document.getElementById('strokeSize'),
  strokeValue: document.getElementById('strokeValue'),
  undoBtn: document.getElementById('undoBtn'),
  redoBtn: document.getElementById('redoBtn'),
  clearBtn: document.getElementById('clearBtn'),
  layersBtn: document.getElementById('layersBtn'),
  layersPanel: document.getElementById('layersPanel'),
  layersList: document.getElementById('layersList'),
  layersClose: document.getElementById('layersClose'),
  addLayerBtn: document.getElementById('addLayerBtn')
};

let engine = null;

/* ============================================================
   SVG Construction
   ============================================================ */

function buildGrid() {
  const frag = document.createDocumentFragment();
  const step = 50;
  for (let i = step; i < VIEWBOX.width; i += step) {
    const v = document.createElementNS(SVG_NS, 'line');
    v.setAttribute('x1', i); v.setAttribute('y1', 0);
    v.setAttribute('x2', i); v.setAttribute('y2', VIEWBOX.height);
    v.setAttribute('class', 'grid-line');
    frag.appendChild(v);
  }
  for (let i = step; i < VIEWBOX.height; i += step) {
    const h = document.createElementNS(SVG_NS, 'line');
    h.setAttribute('x1', 0); h.setAttribute('y1', i);
    h.setAttribute('x2', VIEWBOX.width); h.setAttribute('y2', i);
    h.setAttribute('class', 'grid-line');
    frag.appendChild(h);
  }
  els.gridLines.appendChild(frag);
}

function buildRegions() {
  const regionFrag = document.createDocumentFragment();
  const labelFrag = document.createDocumentFragment();

  REGIONS.forEach(region => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', region.path);
    path.setAttribute('class', 'region');
    path.dataset.region = region.id;
    regionFrag.appendChild(path);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', region.label.x * VIEWBOX.width);
    label.setAttribute('y', region.label.y * VIEWBOX.height);
    label.setAttribute('class', 'region-label');
    label.textContent = region.name;
    labelFrag.appendChild(label);
  });

  els.regions.appendChild(regionFrag);
  els.regionLabels.appendChild(labelFrag);
}

function buildMarkers() {
  const frag = document.createDocumentFragment();
  state.passes.forEach(pass => {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'marker');
    g.dataset.id = pass.id;
    g.setAttribute('transform', `translate(${pass.coords.x * VIEWBOX.width}, ${pass.coords.y * VIEWBOX.height})`);
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `${pass.name}, ${pass.state}, ${pass.elevation}`);

    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('class', 'marker-ring'); ring.setAttribute('r', 6);
    g.appendChild(ring);

    const pulse = document.createElementNS(SVG_NS, 'circle');
    pulse.setAttribute('class', 'marker-pulse'); pulse.setAttribute('r', 6);
    g.appendChild(pulse);

    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('class', 'marker-dot'); dot.setAttribute('r', 3);
    g.appendChild(dot);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('class', 'marker-label');
    label.setAttribute('x', 12); label.setAttribute('y', 4);
    label.textContent = pass.name;
    g.appendChild(label);

    frag.appendChild(g);
  });
  els.markers.appendChild(frag);
}

function buildPassList() {
  const frag = document.createDocumentFragment();
  state.passes.forEach(pass => {
    const li = document.createElement('li');
    li.className = 'pass-item';
    li.dataset.id = pass.id;
    li.setAttribute('role', 'option');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-selected', 'false');
    li.innerHTML = `
      <div class="pass-name">${pass.name}</div>
      <div class="pass-meta">
        <span>${pass.state}</span>
        <span class="pass-meta-sep">·</span>
        <span class="pass-elev">${pass.elevation}</span>
      </div>
    `;
    frag.appendChild(li);
  });
  els.passList.appendChild(frag);
  els.counterTotal.textContent = String(state.passes.length).padStart(2, '0');
}

/* ============================================================
   Selection
   ============================================================ */

function select(id, { scroll = false } = {}) {
  if (!id) return;
  if (state.isAnnotating) return;

  state.activeId = id;
  const idx = state.passes.findIndex(p => p.id === id);
  const pass = state.passes[idx];
  if (!pass) return;

  document.querySelectorAll('.pass-item').forEach(el => {
    const isActive = el.dataset.id === id;
    el.classList.toggle('is-active', isActive);
    el.setAttribute('aria-selected', String(isActive));
  });

  document.querySelectorAll('.marker').forEach(el => {
    el.classList.toggle('is-active', el.dataset.id === id);
  });

  document.querySelectorAll('.region').forEach(el => {
    el.classList.toggle('is-highlighted', el.dataset.region === pass.region);
  });

  renderDetail(pass);
  els.counterCurrent.textContent = String(idx + 1).padStart(2, '0');
  els.detailState.textContent = pass.state;
  if (els.status) els.status.textContent = `Viewing: ${pass.name}`;

  if (scroll) {
    const active = document.querySelector(`.pass-item[data-id="${id}"]`);
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function renderDetail(pass) {
  const isNA = pass.elevation === 'N/A';
  const tags = computeTags(pass);
  els.detailContent.innerHTML = `
    <div class="detail fade-in">
      <div class="detail-eyebrow">${pass.state}</div>
      <h3 class="detail-name">${pass.name}</h3>
      <div class="detail-divider"></div>
      <div class="data-grid">
        <div class="data-row">
          <div class="data-label">Elevation</div>
          <div class="data-value-elev ${isNA ? 'is-na' : ''}">${pass.elevation}</div>
        </div>
        <div class="data-row">
          <div class="data-label">State</div>
          <div class="data-value">${pass.state}</div>
        </div>
        <div class="data-row">
          <div class="data-label">Strategic Significance</div>
          <div class="data-value-note">${pass.significance}</div>
        </div>
        <div class="data-row">
          <div class="data-label">Classification</div>
          <div class="detail-tags">
            ${tags.map(t => `<span class="tag ${t.emphasis ? 'is-strategic' : ''}">${t.label}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function computeTags(pass) {
  const tags = [];
  const sig = pass.significance.toLowerCase();
  if (sig.includes('silk road') || sig.includes('lhasa') || sig.includes('historical')) tags.push({ label: 'Historical' });
  if (sig.includes('tibet') || sig.includes('lhasa')) tags.push({ label: 'India–Tibet', emphasis: true });
  if (sig.includes('myanmar')) tags.push({ label: 'India–Myanmar', emphasis: true });
  if (sig.includes('china') && sig.includes('myanmar')) tags.push({ label: 'Tri-Junction', emphasis: true });
  if (sig.includes('year-round') || sig.includes('critical') || sig.includes('primary')) tags.push({ label: 'Strategic', emphasis: true });
  const elevNum = parseInt(pass.elevation.replace(/,/g, ''));
  if (!isNaN(elevNum)) {
    if (elevNum >= 4000) tags.push({ label: 'High Altitude' });
    else if (elevNum >= 2500) tags.push({ label: 'Mid Altitude' });
  }
  return tags.length ? tags : [{ label: 'Mountain Pass' }];
}

function navigate(direction) {
  const idx = state.passes.findIndex(p => p.id === state.activeId);
  if (idx === -1) return;
  let nextIdx;
  if (direction === 'next') nextIdx = (idx + 1) % state.passes.length;
  else nextIdx = (idx - 1 + state.passes.length) % state.passes.length;
  select(state.passes[nextIdx].id, { scroll: true });
}

/* ============================================================
   Annotation Mode
   ============================================================ */

function toggleAnnotationMode(force) {
  const next = force !== undefined ? force : !state.isAnnotating;
  state.isAnnotating = next;

  els.annotateToggle.setAttribute('aria-pressed', String(next));
  els.annotationHost.classList.toggle('is-active', next);
  els.annotationHost.setAttribute('aria-hidden', String(!next));
  els.appMain.classList.toggle('is-annotating', next);
  els.annotToolbar.hidden = !next;

  if (next) {
    if (els.status) els.status.textContent = 'Annotation Mode Active';
    setTimeout(() => engine?.resize(), 50);
  } else {
    if (els.status) els.status.textContent = 'View Mode';
  }
}

function setTool(tool) {
  if (!engine) return;
  engine.setTool(tool);
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.tool === tool);
  });
}

function setColor(color) {
  if (!engine) return;
  engine.setColor(color);
  document.querySelectorAll('.color-swatch').forEach(sw => {
    const isActive = sw.dataset.color === color;
    sw.classList.toggle('is-active', isActive);
    sw.setAttribute('aria-checked', String(isActive));
  });
}

function setSize(size) {
  if (!engine) return;
  engine.setSize(size);
  els.strokeValue.textContent = String(size);
}

function renderLayersPanel() {
  if (!engine) return;
  const layers = engine.getLayers();
  els.layersList.innerHTML = layers.map(l => `
    <div class="layer-item ${l.isActive ? 'is-active' : ''}" data-layer-id="${l.id}">
      <button class="layer-visibility ${l.visible ? '' : 'is-hidden'}" data-action="toggle-vis" data-layer-id="${l.id}" type="button" aria-label="${l.visible ? 'Hide' : 'Show'} layer">
        ${l.visible ? '◉' : '○'}
      </button>
      <input class="layer-name" value="${l.name}" data-action="rename" data-layer-id="${l.id}" type="text" aria-label="Layer name">
      <span class="layer-count">${String(l.count).padStart(2, '0')}</span>
      <button class="layer-delete" data-action="delete" data-layer-id="${l.id}" type="button" aria-label="Delete layer">×</button>
    </div>
  `).join('');
}

function toggleLayersPanel(force) {
  const next = force !== undefined ? force : els.layersPanel.hidden;
  els.layersPanel.hidden = !next;
  if (next) renderLayersPanel();
}

/* ============================================================
   Event Handlers
   ============================================================ */

function attachEvents() {
  // Pass list
  els.passList.addEventListener('click', e => {
    const item = e.target.closest('.pass-item');
    if (item) select(item.dataset.id);
  });
  els.passList.addEventListener('keydown', e => {
    const item = e.target.closest('.pass-item');
    if (!item) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(item.dataset.id); }
  });

  // Markers
  els.markers.addEventListener('click', e => {
    const marker = e.target.closest('.marker');
    if (marker) select(marker.dataset.id);
  });
  els.markers.addEventListener('keydown', e => {
    const marker = e.target.closest('.marker');
    if (!marker) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(marker.dataset.id); }
  });

  // Global keyboard
  document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

    if (state.isAnnotating) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); engine?.undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault(); engine?.redo();
      } else if (e.key === 'p' || e.key === 'P') { setTool('pen'); }
      else if (e.key === 'h' || e.key === 'H') { setTool('highlighter'); }
      else if (e.key === 'e' || e.key === 'E') { setTool('eraser'); }
      else if (e.key === 't' || e.key === 'T') { setTool('text'); }
      else if (e.key === 'l' || e.key === 'L') { setTool('line'); }
      else if (e.key === 'r' || e.key === 'R') { setTool('rect'); }
      else if (e.key === 'o' || e.key === 'O') { setTool('ellipse'); }
      else if ((e.key === 'a' || e.key === 'A') && !e.metaKey && !e.ctrlKey) { setTool('arrow'); }
      else if (e.key === 'Escape') { toggleAnnotationMode(false); }
    } else {
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); navigate('next'); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); navigate('prev'); }
      else if (e.key === 'a' || e.key === 'A') { e.preventDefault(); toggleAnnotationMode(true); }
    }
  });

  els.prevBtn.addEventListener('click', () => navigate('prev'));
  els.nextBtn.addEventListener('click', () => navigate('next'));

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });

  /* ----- Annotation events ----- */

  els.annotateToggle.addEventListener('click', () => toggleAnnotationMode());

  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => setColor(sw.dataset.color));
  });

  els.strokeSize.addEventListener('input', e => setSize(parseInt(e.target.value)));

  els.undoBtn.addEventListener('click', () => engine?.undo());
  els.redoBtn.addEventListener('click', () => engine?.redo());
  els.clearBtn.addEventListener('click', () => engine?.clearAll());

  els.layersBtn.addEventListener('click', () => toggleLayersPanel());
  els.layersClose.addEventListener('click', () => toggleLayersPanel(false));
  els.addLayerBtn.addEventListener('click', () => {
    if (!engine) return;
    engine.createLayer(`Layer ${engine.layers.length + 1}`);
    engine.setActiveLayer(engine.layers[engine.layers.length - 1].id);
    renderLayersPanel();
  });

  // Layer interactions
  els.layersList.addEventListener('click', e => {
    const item = e.target.closest('.layer-item');
    if (item && !e.target.matches('input, button')) {
      engine.setActiveLayer(parseInt(item.dataset.layerId));
      renderLayersPanel();
      return;
    }
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.layerId);
    if (action === 'toggle-vis') engine.toggleLayerVisibility(id);
    else if (action === 'delete') engine.removeLayer(id);
    renderLayersPanel();
  });

  els.layersList.addEventListener('change', e => {
    if (e.target.matches('.layer-name')) {
      const id = parseInt(e.target.dataset.layerId);
      engine.renameLayer(id, e.target.value);
    }
  });
}

/* ============================================================
   Init
   ============================================================ */

function init() {
  buildGrid();
  buildRegions();
  buildMarkers();
  buildPassList();
  attachEvents();

  engine = new AnnotationEngine({
    canvas: els.annotationCanvas,
    shapeLayer: els.shapeLayer,
    textLayer: els.textLayer,
    host: els.annotationHost
  });
  engine.init();

  if (state.passes.length > 0) select(state.passes[0].id);
}

document.addEventListener('DOMContentLoaded', init);
