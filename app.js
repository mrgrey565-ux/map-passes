// app.js
import { PASSES, REGIONS } from './data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEWBOX = { width: 1000, height: 1000 };

const state = {
  activeId: null,
  passes: PASSES
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
  nextBtn: document.getElementById('nextBtn')
};

/* ============================================================
   SVG Construction
   ============================================================ */

function buildGrid() {
  const frag = document.createDocumentFragment();
  const step = 50;
  for (let i = step; i < VIEWBOX.width; i += step) {
    const v = document.createElementNS(SVG_NS, 'line');
    v.setAttribute('x1', i);
    v.setAttribute('y1', 0);
    v.setAttribute('x2', i);
    v.setAttribute('y2', VIEWBOX.height);
    v.setAttribute('class', 'grid-line');
    frag.appendChild(v);
  }
  for (let i = step; i < VIEWBOX.height; i += step) {
    const h = document.createElementNS(SVG_NS, 'line');
    h.setAttribute('x1', 0);
    h.setAttribute('y1', i);
    h.setAttribute('x2', VIEWBOX.width);
    h.setAttribute('y2', i);
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
    ring.setAttribute('class', 'marker-ring');
    ring.setAttribute('r', 6);
    g.appendChild(ring);

    const pulse = document.createElementNS(SVG_NS, 'circle');
    pulse.setAttribute('class', 'marker-pulse');
    pulse.setAttribute('r', 6);
    g.appendChild(pulse);

    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('class', 'marker-dot');
    dot.setAttribute('r', 3);
    g.appendChild(dot);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('class', 'marker-label');
    label.setAttribute('x', 12);
    label.setAttribute('y', 4);
    label.textContent = pass.name;
    g.appendChild(label);

    frag.appendChild(g);
  });

  els.markers.appendChild(frag);
}

function buildPassList() {
  const frag = document.createDocumentFragment();

  state.passes.forEach((pass, idx) => {
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
   Selection / Rendering
   ============================================================ */

function select(id, { scroll = false } = {}) {
  if (!id) return;
  state.activeId = id;

  const idx = state.passes.findIndex(p => p.id === id);
  const pass = state.passes[idx];
  if (!pass) return;

  // Update list items
  document.querySelectorAll('.pass-item').forEach(el => {
    const isActive = el.dataset.id === id;
    el.classList.toggle('is-active', isActive);
    el.setAttribute('aria-selected', String(isActive));
  });

  // Update markers
  document.querySelectorAll('.marker').forEach(el => {
    el.classList.toggle('is-active', el.dataset.id === id);
  });

  // Highlight region
  document.querySelectorAll('.region').forEach(el => {
    el.classList.toggle('is-highlighted', el.dataset.region === pass.region);
  });

  // Render detail
  renderDetail(pass);

  // Update counter
  els.counterCurrent.textContent = String(idx + 1).padStart(2, '0');
  els.detailState.textContent = pass.state;

  // Update status
  if (els.status) els.status.textContent = `Viewing: ${pass.name}`;

  // Scroll list to active
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

  if (sig.includes('silk road') || sig.includes('lhasa') || sig.includes('historical')) {
    tags.push({ label: 'Historical', emphasis: false });
  }
  if (sig.includes('tibet') || sig.includes('lhasa')) {
    tags.push({ label: 'India–Tibet', emphasis: true });
  }
  if (sig.includes('myanmar')) {
    tags.push({ label: 'India–Myanmar', emphasis: true });
  }
  if (sig.includes('china') && sig.includes('myanmar')) {
    tags.push({ label: 'Tri-Junction', emphasis: true });
  }
  if (sig.includes('year-round') || sig.includes('critical') || sig.includes('primary')) {
    tags.push({ label: 'Strategic', emphasis: true });
  }

  // Elevation tag
  const elevNum = parseInt(pass.elevation.replace(/,/g, ''));
  if (!isNaN(elevNum)) {
    if (elevNum >= 4000) tags.push({ label: 'High Altitude', emphasis: false });
    else if (elevNum >= 2500) tags.push({ label: 'Mid Altitude', emphasis: false });
  }

  return tags.length ? tags : [{ label: 'Mountain Pass', emphasis: false }];
}

/* ============================================================
   Navigation
   ============================================================ */

function navigate(direction) {
  const idx = state.passes.findIndex(p => p.id === state.activeId);
  if (idx === -1) return;

  let nextIdx;
  if (direction === 'next') {
    nextIdx = (idx + 1) % state.passes.length;
  } else {
    nextIdx = (idx - 1 + state.passes.length) % state.passes.length;
  }

  select(state.passes[nextIdx].id, { scroll: true });
}

/* ============================================================
   Event Handlers
   ============================================================ */

function attachEvents() {
  // List clicks
  els.passList.addEventListener('click', e => {
    const item = e.target.closest('.pass-item');
    if (item) select(item.dataset.id);
  });

  // List keyboard
  els.passList.addEventListener('keydown', e => {
    const item = e.target.closest('.pass-item');
    if (!item) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(item.dataset.id);
    }
  });

  // Marker events (event delegation)
  els.markers.addEventListener('click', e => {
    const marker = e.target.closest('.marker');
    if (marker) select(marker.dataset.id);
  });

  els.markers.addEventListener('keydown', e => {
    const marker = e.target.closest('.marker');
    if (!marker) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(marker.dataset.id);
    }
  });

  // Global keyboard nav
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      navigate('next');
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      navigate('prev');
    } else if (e.key === 'Escape') {
      // Future: close detail
    }
  });

  // Navigation buttons
  els.prevBtn.addEventListener('click', () => navigate('prev'));
  els.nextBtn.addEventListener('click', () => navigate('next'));

  // Nav view buttons (decorative for now)
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
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

  // Set initial selection
  if (state.passes.length > 0) {
    select(state.passes[0].id);
  }
}

document.addEventListener('DOMContentLoaded', init);