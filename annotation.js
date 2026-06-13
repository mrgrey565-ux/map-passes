// annotation.js
import { PASSES } from './data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DPR_CAP = 2; // device pixel ratio cap for performance

export class AnnotationEngine {
  constructor({ canvas, shapeLayer, textLayer, host }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: false });
    this.shapeLayer = shapeLayer;
    this.textLayer = textLayer;
    this.host = host;

    // Tools
    this.tool = 'pen';
    this.color = '#f0d9a8';
    this.size = 3;
    this.opacity = 1;

    // Layers (each has its own canvas)
    this.layers = [];
    this.activeLayerIndex = 0;
    this.layerIdCounter = 0;

    // Drawing state
    this.isDrawing = false;
    this.currentStroke = null;
    this.activePointerId = null;

    // Undo/redo stacks (per layer snapshots)
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 30;

    // Shape drawing state
    this.shapeStart = null;
    this.previewShape = null;

    // Bind methods
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerCancel = this.onPointerCancel.bind(this);
  }

  /* ============================================================
     Initialization
     ============================================================ */

  init() {
    this.createLayer('Layer 1');
    this.resize();
    this.attachEvents();
  }

  attachEvents() {
    // Use Pointer Events for cross-platform (iPad + PC)
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('pointerleave', this.onPointerUp);

    // Prevent iOS Safari from interpreting touches as scroll/zoom
    this.canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    this.canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    this.canvas.addEventListener('touchend', e => e.preventDefault(), { passive: false });

    // Disable context menu on long-press / right-click
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Resize observer
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.canvas.parentElement);
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);

    // Resize all layer canvases
    this.layers.forEach(layer => {
      layer.canvas.width = rect.width * dpr;
      layer.canvas.height = rect.height * dpr;
      layer.canvas.style.width = `${rect.width}px`;
      layer.canvas.style.height = `${rect.height}px`;
      layer.ctx.scale(dpr, dpr);
      layer.dpr = dpr;
    });

    // Main canvas (for live drawing preview)
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(dpr, dpr);
    this.dpr = dpr;

    this.width = rect.width;
    this.height = rect.height;
  }

  /* ============================================================
     Layer Management
     ============================================================ */

  createLayer(name) {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const canvas = document.createElement('canvas');
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.cssText = `position:absolute;inset:0;width:${rect.width}px;height:${rect.height}px;pointer-events:none;`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const layer = {
      id: ++this.layerIdCounter,
      name: name || `Layer ${this.layers.length + 1}`,
      canvas,
      ctx,
      dpr,
      visible: true,
      shapes: [], // {type, ...}
      texts: []   // {text, x, y, color, size, fontSize}
    };

    this.layers.push(layer);
    this.shapeLayer.parentElement.insertBefore(canvas, this.shapeLayer);
    return layer;
  }

  removeLayer(id) {
    if (this.layers.length <= 1) return;
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx === -1) return;

    const layer = this.layers[idx];
    layer.canvas.remove();
    this.layers.splice(idx, 1);

    if (this.activeLayerIndex >= this.layers.length) {
      this.activeLayerIndex = this.layers.length - 1;
    }
  }

  setActiveLayer(id) {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx !== -1) this.activeLayerIndex = idx;
  }

  toggleLayerVisibility(id) {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.visible = !layer.visible;
      layer.canvas.style.display = layer.visible ? 'block' : 'none';
    }
  }

  renameLayer(id, name) {
    const layer = this.layers.find(l => l.id === id);
    if (layer) layer.name = name;
  }

  getActiveLayer() {
    return this.layers[this.activeLayerIndex];
  }

  /* ============================================================
     Tool Selection
     ============================================================ */

  setTool(tool) {
    this.tool = tool;
    this.host.dataset.tool = tool;
    this.isDrawing = false;
  }

  setColor(color) {
    this.color = color;
  }

  setSize(size) {
    this.size = size;
  }

  /* ============================================================
     Coordinate Helpers
     ============================================================ */

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5
    };
  }

  /* ============================================================
     Pointer Event Handlers
     ============================================================ */

  onPointerDown(e) {
    if (!this.host.classList.contains('is-active')) return;

    // Capture this pointer (critical for iPad)
    try { this.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    this.activePointerId = e.pointerId;

    const pos = this.getPos(e);
    this.isDrawing = true;

    if (this.tool === 'pen' || this.tool === 'highlighter') {
      this.currentStroke = {
        tool: this.tool,
        color: this.color,
        size: this.size,
        points: [{ ...pos }]
      };
    } else if (this.tool === 'eraser') {
      this.eraseAt(pos);
    } else if (['line', 'rect', 'ellipse', 'arrow'].includes(this.tool)) {
      this.shapeStart = { ...pos };
      this.previewShape = { type: this.tool, start: { ...pos }, end: { ...pos }, color: this.color, size: this.size };
    } else if (this.tool === 'text') {
      this.addText(pos, e);
    }
  }

  onPointerMove(e) {
    if (!this.isDrawing || e.pointerId !== this.activePointerId) return;

    const pos = this.getPos(e);

    if (this.tool === 'pen' || this.tool === 'highlighter') {
      this.currentStroke.points.push({ ...pos });
      this.drawStrokePreview(this.currentStroke);
    } else if (this.tool === 'eraser') {
      this.eraseAt(pos);
    } else if (['line', 'rect', 'ellipse', 'arrow'].includes(this.tool)) {
      this.previewShape.end = { ...pos };
      this.drawShapePreview(this.previewShape);
    }
  }

  onPointerUp(e) {
    if (!this.isDrawing) return;
    if (e.pointerId !== this.activePointerId) return;

    this.isDrawing = false;
    this.activePointerId = null;

    try { this.canvas.releasePointerCapture(e.pointerId); } catch (err) {}

    const layer = this.getActiveLayer();
    if (!layer || !layer.visible) {
      this.clearPreview();
      return;
    }

    if (this.tool === 'pen' || this.tool === 'highlighter') {
      if (this.currentStroke && this.currentStroke.points.length > 0) {
        layer.shapes.push({ type: 'stroke', data: this.currentStroke });
        this.commitStrokeToLayer(this.currentStroke, layer);
        this.saveHistory();
      }
    } else if (['line', 'rect', 'ellipse', 'arrow'].includes(this.tool)) {
      if (this.previewShape) {
        // Calculate bounding box for shape
        const shape = this.normalizeShape(this.previewShape);
        if (shape.width > 2 || shape.height > 2) {
          this.commitShapeToLayer(shape, layer);
          layer.shapes.push({ type: 'shape', data: shape });
          this.saveHistory();
        }
      }
    }

    this.currentStroke = null;
    this.shapeStart = null;
    this.previewShape = null;
    this.clearPreview();
  }

  onPointerCancel(e) {
    this.isDrawing = false;
    this.activePointerId = null;
    this.clearPreview();
  }

  /* ============================================================
     Stroke Rendering
     ============================================================ */

  drawStrokePreview(stroke) {
    this.clearPreview();
    this.drawStroke(this.ctx, stroke, true);
  }

  clearPreview() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawStroke(ctx, stroke, isPreview = false) {
    if (!stroke.points.length) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;

    if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = stroke.size * 4;
    } else {
      ctx.lineWidth = stroke.size;
    }

    ctx.beginPath();
    const pts = stroke.points;
    ctx.moveTo(pts[0].x, pts[0].y);

    if (pts.length === 1) {
      // Single point - draw a dot
      ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
    } else if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y);
    } else {
      // Smooth curve using quadratic bezier through midpoints
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    }

    ctx.stroke();
    ctx.restore();
  }

  commitStrokeToLayer(stroke, layer) {
    this.drawStroke(layer.ctx, stroke);
  }

  /* ============================================================
     Shape Rendering
     ============================================================ */

  normalizeShape(shape) {
    const { start, end, type, color, size } = shape;
    return {
      type,
      color,
      size,
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
      start, end
    };
  }

  drawShapePreview(shape) {
    this.clearPreview();
    const normalized = this.normalizeShape(shape);
    this.drawShape(this.ctx, normalized, true);
  }

  drawShape(ctx, shape, isPreview = false) {
    ctx.save();
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isPreview) {
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.7;
    }

    ctx.beginPath();

    if (shape.type === 'rect') {
      ctx.rect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === 'ellipse') {
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;
      const rx = shape.width / 2;
      const ry = shape.height / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    } else if (shape.type === 'line') {
      ctx.moveTo(shape.start.x, shape.start.y);
      ctx.lineTo(shape.end.x, shape.end.y);
    } else if (shape.type === 'arrow') {
      ctx.moveTo(shape.start.x, shape.start.y);
      ctx.lineTo(shape.end.x, shape.end.y);
      // Arrowhead
      const angle = Math.atan2(shape.end.y - shape.start.y, shape.end.x - shape.start.x);
      const headLen = Math.max(12, shape.size * 4);
      ctx.lineTo(
        shape.end.x - headLen * Math.cos(angle - Math.PI / 6),
        shape.end.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(shape.end.x, shape.end.y);
      ctx.lineTo(
        shape.end.x - headLen * Math.cos(angle + Math.PI / 6),
        shape.end.y - headLen * Math.sin(angle + Math.PI / 6)
      );
    }

    ctx.stroke();
    ctx.restore();
  }

  commitShapeToLayer(shape, layer) {
    this.drawShape(layer.ctx, shape);
  }

  /* ============================================================
     Eraser
     ============================================================ */

  eraseAt(pos) {
    const eraserSize = this.size * 6;
    const layer = this.getActiveLayer();
    if (!layer) return;

    // Erase from active layer canvas
    layer.ctx.save();
    layer.ctx.globalCompositeOperation = 'destination-out';
    layer.ctx.beginPath();
    layer.ctx.arc(pos.x, pos.y, eraserSize, 0, Math.PI * 2);
    layer.ctx.fill();
    layer.ctx.restore();

    // Also remove from shape data model
    this.eraseShapesAt(layer, pos, eraserSize);
  }

  eraseShapesAt(layer, pos, radius) {
    // For strokes: check if any point is within radius
    layer.shapes = layer.shapes.filter(shape => {
      if (shape.type === 'stroke') {
        return !shape.data.points.some(p => {
          const dx = p.x - pos.x;
          const dy = p.y - pos.y;
          return Math.sqrt(dx * dx + dy * dy) < radius;
        });
      }
      return true;
    });
  }

  /* ============================================================
     Text
     ============================================================ */

  addText(pos, e) {
    const text = prompt('Enter text:');
    if (!text) return;

    const layer = this.getActiveLayer();
    if (!layer) return;

    const textEl = document.createElement('div');
    textEl.className = 'text-annotation';
    textEl.contentEditable = true;
    textEl.textContent = text;
    textEl.style.left = `${pos.x}px`;
    textEl.style.top = `${pos.y}px`;
    textEl.style.color = this.color;
    textEl.style.fontSize = `${Math.max(12, this.size * 4)}px`;

    this.textLayer.appendChild(textEl);

    const textData = {
      type: 'text',
      el: textEl,
      x: pos.x,
      y: pos.y,
      text,
      color: this.color,
      size: Math.max(12, this.size * 4)
    };
    layer.texts.push(textData);

    this.makeTextDraggable(textEl, textData);
    this.saveHistory();

    setTimeout(() => {
      textEl.focus();
      document.execCommand('selectAll', false, null);
    }, 50);
  }

  makeTextDraggable(el, data) {
    let startX, startY, initialX, initialY, isDragging = false;

    el.addEventListener('pointerdown', e => {
      if (e.target === el || !window.getSelection().toString()) {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startY = e.clientY;
        initialX = data.x;
        initialY = data.y;
        isDragging = true;
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });

    el.addEventListener('pointermove', e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      data.x = initialX + dx;
      data.y = initialY + dy;
      el.style.left = `${data.x}px`;
      el.style.top = `${data.y}px`;
    });

    el.addEventListener('pointerup', e => {
      isDragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch (err) {}
    });
  }

  /* ============================================================
     Undo / Redo / History
     ============================================================ */

  saveHistory() {
    // Snapshot all layer canvas data
    const snapshot = this.layers.map(layer => ({
      id: layer.id,
      data: layer.canvas.toDataURL()
    }));

    // Trim forward history
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.restoreSnapshot(this.history[this.historyIndex]);
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.restoreSnapshot(this.history[this.historyIndex]);
  }

  restoreSnapshot(snapshot) {
    let pending = snapshot.length;
    snapshot.forEach(snap => {
      const layer = this.layers.find(l => l.id === snap.id);
      if (!layer) { pending--; return; }
      const img = new Image();
      img.onload = () => {
        layer.ctx.clearRect(0, 0, this.width, this.height);
        layer.ctx.drawImage(img, 0, 0, this.width, this.height);
        pending--;
      };
      img.src = snap.data;
    });
  }

  clearAll() {
    if (!confirm('Clear all annotations? This cannot be undone.')) return;
    this.layers.forEach(layer => {
      layer.ctx.clearRect(0, 0, this.width, this.height);
      layer.shapes = [];
      layer.texts.forEach(t => t.el.remove());
      layer.texts = [];
    });
    this.history = [];
    this.historyIndex = -1;
  }

  /* ============================================================
     Public State for UI
     ============================================================ */

  getLayers() {
    return this.layers.map((l, i) => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      isActive: i === this.activeLayerIndex,
      count: l.shapes.length + l.texts.length
    }));
  }
}
