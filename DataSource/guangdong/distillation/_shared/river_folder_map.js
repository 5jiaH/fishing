/**
 * Shared canvas map for river/0/{水系}/map.html pages.
 * Loads per-folder river *.js modules, optional 440000 province boundary,
 * and optional static 1:100万 sheet images from /api/demo/440000/.
 */

const STYLE = {
  bg: '#f7f7f2',
  regionFill: 'rgba(170, 230, 170, 0.45)',
  regionStroke: 'rgba(60, 140, 60, 0.75)',
  tributaryStroke: 'rgba(100, 181, 246, 0.95)',
  mainStroke: 'rgba(198, 40, 40, 0.98)',
  tributaryWidth: 1.4,
  mainWidth: 2.4,
  regionWidth: 1.2,
  labelTributary: '#0d47a1',
  labelMain: '#b71c1c',
  labelHalo: 'rgba(255, 255, 255, 0.92)',
  labelMinScreenPx: 24,
};

function expandBounds(b, lng, lat) {
  b.minLng = Math.min(b.minLng, lng);
  b.maxLng = Math.max(b.maxLng, lng);
  b.minLat = Math.min(b.minLat, lat);
  b.maxLat = Math.max(b.maxLat, lat);
}

function boundsFromCoords(coords, b) {
  if (typeof coords[0] === 'number') {
    expandBounds(b, coords[0], coords[1]);
    return;
  }
  for (let i = 0; i < coords.length; i++) boundsFromCoords(coords[i], b);
}

function emptyBounds() {
  return { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity };
}

function geometryBounds(geom) {
  if (!geom) return null;
  const b = emptyBounds();
  boundsFromCoords(geom.coordinates, b);
  if (b.minLng === Infinity) return null;
  return b;
}

function unionBounds(a, b) {
  if (!a) return b;
  if (!b) return a;
  return {
    minLng: Math.min(a.minLng, b.minLng),
    maxLng: Math.max(a.maxLng, b.maxLng),
    minLat: Math.min(a.minLat, b.minLat),
    maxLat: Math.max(a.maxLat, b.maxLat),
  };
}

function padBounds(b, ratio) {
  const lngPad = (b.maxLng - b.minLng) * ratio;
  const latPad = (b.maxLat - b.minLat) * ratio;
  return {
    minLng: b.minLng - lngPad,
    maxLng: b.maxLng + lngPad,
    minLat: b.minLat - latPad,
    maxLat: b.maxLat + latPad,
  };
}

function resolveMapAppBase() {
  const script = document.querySelector('script[type="module"][src$="map_app.js"], script[type="module"][src*="map_app.js"]');
  if (!script || !script.src) {
    throw new Error('找不到 map_app.js，请通过 HTTP 服务打开 map.html');
  }
  return new URL('./', script.src);
}

function resolveMainStreamName(folderName, fileNames, rivers) {
  const exact = `${folderName}.js`;
  if (fileNames.includes(exact)) return rivers.find((r) => r.fileName === exact)?.name || folderName;

  const stem = folderName.replace(/水系$/, '');
  const stemFile = `${stem}.js`;
  if (stem !== folderName && fileNames.includes(stemFile)) {
    return rivers.find((r) => r.fileName === stemFile)?.name || stem;
  }

  const byRole = rivers.find((r) => r.role === '干流');
  if (byRole) return byRole.name;

  return null;
}

function normalizeRiverModule(fileName, mod) {
  const data = mod?.default ?? mod;
  if (!data) return null;

  if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    const lines = [];
    for (const feat of data.features) {
      const g = feat?.geometry;
      if (!g) continue;
      if (g.type === 'LineString') lines.push(g.coordinates);
      else if (g.type === 'MultiLineString') lines.push(...g.coordinates);
    }
    if (!lines.length) return null;
    return {
      fileName,
      name: data.name || fileName.replace(/\.js$/, ''),
      role: data.role || '',
      geometry: { type: 'MultiLineString', coordinates: lines },
    };
  }

  if (!data.geometry) return null;
  return {
    fileName,
    name: data.name || fileName.replace(/\.js$/, ''),
    role: data.role || '',
    geometry: data.geometry,
  };
}

async function loadBoundary() {
  const candidates = [
    new URL('./440000.json', import.meta.url).href,
    new URL('../入海河流/440000.json', import.meta.url).href,
  ];
  let lastErr = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('无法加载省界 440000.json');
}

function labelAnchorForGeometry(geom) {
  if (!geom) return null;

  const anchorFromLine = (coords) => {
    if (!coords?.length) return null;
    const i = Math.floor(coords.length / 2);
    return [coords[i][0], coords[i][1]];
  };

  if (geom.type === 'LineString') return anchorFromLine(geom.coordinates);

  if (geom.type === 'MultiLineString') {
    let best = null;
    let bestLen = -1;
    for (const line of geom.coordinates) {
      if (line?.length > bestLen) {
        bestLen = line.length;
        best = line;
      }
    }
    return anchorFromLine(best);
  }

  return null;
}

function lineScreenLength(coords, project) {
  if (!coords || coords.length < 2) return 0;
  let len = 0;
  let prev = project(coords[0][1], coords[0][0]);
  for (let i = 1; i < coords.length; i++) {
    const p = project(coords[i][1], coords[i][0]);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

function longestLineCoords(geom) {
  if (!geom) return null;
  if (geom.type === 'LineString') return geom.coordinates;
  if (geom.type === 'MultiLineString') {
    let best = null;
    let bestLen = -1;
    for (const line of geom.coordinates) {
      if (line?.length > bestLen) {
        bestLen = line.length;
        best = line;
      }
    }
    return best;
  }
  return null;
}

function drawRiverLabels(ctx, rivers, project, viewScale, mainName, canvasW, canvasH) {
  const fontPx = Math.max(10, Math.min(14, viewScale / 10000));
  ctx.font = `${fontPx}px system-ui, "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  for (const river of rivers) {
    const anchor = labelAnchorForGeometry(river.geometry);
    if (!anchor) continue;

    const line = longestLineCoords(river.geometry);
    if (line && lineScreenLength(line, project) < STYLE.labelMinScreenPx) continue;

    const pt = project(anchor[1], anchor[0]);
    if (pt.x < -80 || pt.y < -20 || pt.x > canvasW + 80 || pt.y > canvasH + 20) continue;

    const isMain = Boolean(mainName && river.name === mainName);
    const text = river.name;
    ctx.lineWidth = Math.max(3, fontPx * 0.35);
    ctx.strokeStyle = STYLE.labelHalo;
    ctx.strokeText(text, pt.x, pt.y);
    ctx.fillStyle = isMain ? STYLE.labelMain : STYLE.labelTributary;
    ctx.fillText(text, pt.x, pt.y);
  }
}

function drawLineGeometry(ctx, geom, project) {
  const drawCoords = (coords) => {
    if (!coords.length) return;
    const p0 = project(coords[0][1], coords[0][0]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < coords.length; i++) {
      const p = project(coords[i][1], coords[i][0]);
      ctx.lineTo(p.x, p.y);
    }
  };

  if (geom.type === 'LineString') drawCoords(geom.coordinates);
  else if (geom.type === 'MultiLineString') {
    for (const line of geom.coordinates) drawCoords(line);
  }
}

function drawRegion(ctx, regionGeo, project) {
  if (!regionGeo) return;
  const feats = regionGeo.type === 'FeatureCollection' ? regionGeo.features : [regionGeo];
  ctx.beginPath();
  for (const feat of feats) {
    const geom = feat.geometry;
    if (!geom) continue;
    if (geom.type === 'Polygon') {
      for (const ring of geom.coordinates) {
        const pts = ring.map(([lng, lat]) => project(lat, lng));
        if (!pts.length) continue;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
      }
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        for (const ring of poly) {
          const pts = ring.map(([lng, lat]) => project(lat, lng));
          if (!pts.length) continue;
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
        }
      }
    }
  }
  ctx.fillStyle = STYLE.regionFill;
  ctx.fill('evenodd');
  ctx.strokeStyle = STYLE.regionStroke;
  ctx.lineWidth = STYLE.regionWidth;
  ctx.stroke();
}

function createView(canvas, bounds) {
  const view = {
    bounds,
    centerLng: (bounds.minLng + bounds.maxLng) / 2,
    centerLat: (bounds.minLat + bounds.maxLat) / 2,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  };

  function fit() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.01);
    const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.01);
    const cosLat = Math.cos((view.centerLat * Math.PI) / 180);
    view.scale = Math.min(w / (lngSpan * cosLat), h / latSpan) * 0.92;
    view.offsetX = 0;
    view.offsetY = 0;
  }

  function project(lat, lng) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cosLat = Math.cos((view.centerLat * Math.PI) / 180);
    const x = (lng - view.centerLng) * cosLat * view.scale + w / 2 + view.offsetX;
    const y = (view.centerLat - lat) * view.scale + h / 2 + view.offsetY;
    return { x, y };
  }

  function screenToGeo(x, y) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cosLat = Math.cos((view.centerLat * Math.PI) / 180);
    const lng = (x - w / 2 - view.offsetX) / (cosLat * view.scale) + view.centerLng;
    const lat = view.centerLat - (y - h / 2 - view.offsetY) / view.scale;
    return { lat, lng };
  }

  fit();
  return { view, fit, project, screenToGeo };
}

function attachInteractions(canvas, viewState, redraw) {
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const before = viewState.screenToGeo(mx, my);
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      viewState.view.scale = Math.min(Math.max(viewState.view.scale * factor, 500), 2_000_000);
      const after = viewState.screenToGeo(mx, my);
      viewState.view.centerLng += before.lng - after.lng;
      viewState.view.centerLat += before.lat - after.lat;
      redraw();
    },
    { passive: false },
  );

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    viewState.view.dragging = true;
    viewState.view.lastX = e.clientX;
    viewState.view.lastY = e.clientY;
    canvas.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!viewState.view.dragging) return;
    viewState.view.offsetX += e.clientX - viewState.view.lastX;
    viewState.view.offsetY += e.clientY - viewState.view.lastY;
    viewState.view.lastX = e.clientX;
    viewState.view.lastY = e.clientY;
    redraw();
  });

  window.addEventListener('mouseup', () => {
    if (!viewState.view.dragging) return;
    viewState.view.dragging = false;
    canvas.classList.remove('dragging');
  });

  window.addEventListener('resize', () => {
    viewState.fit();
    redraw();
  });
}

export async function startSingleFolderRiverMap({ folderName, fileNames, statusEl, canvas }) {
  if (!canvas) throw new Error('缺少 canvas 元素');
  const base = resolveMapAppBase();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 2D 绘图上下文');

  if (statusEl) statusEl.textContent = '正在加载省界…';
  const regionGeo = await loadBoundary();

  const rivers = [];
  const errors = [];
  for (const fileName of fileNames) {
    try {
      const mod = await import(new URL(fileName, base).href);
      const river = normalizeRiverModule(fileName, mod);
      if (river) rivers.push(river);
      else errors.push(`${fileName}: 无有效 geometry`);
    } catch (e) {
      errors.push(`${fileName}: ${e?.message || e}`);
    }
  }

  if (!rivers.length) {
    throw new Error(`没有成功加载任何河流模块${errors.length ? `\n${errors.join('\n')}` : ''}`);
  }

  let bounds = null;
  for (const river of rivers) {
    bounds = unionBounds(bounds, geometryBounds(river.geometry));
  }
  const regionBounds = regionGeo ? geometryBounds(regionGeo.features?.[0]?.geometry || regionGeo.geometry) : null;
  bounds = padBounds(unionBounds(bounds, regionBounds) || bounds, 0.08);

  const mainName = resolveMainStreamName(folderName, fileNames, rivers);
  const viewState = createView(canvas, bounds);

  function redraw() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = STYLE.bg;
    ctx.fillRect(0, 0, rect.width, rect.height);

    drawRegion(ctx, regionGeo, viewState.project);

    const tributaries = [];
    const mains = [];
    for (const river of rivers) {
      if (mainName && river.name === mainName) mains.push(river);
      else tributaries.push(river);
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = STYLE.tributaryStroke;
    ctx.lineWidth = STYLE.tributaryWidth;
    ctx.beginPath();
    for (const river of tributaries) drawLineGeometry(ctx, river.geometry, viewState.project);
    ctx.stroke();

    if (mains.length) {
      ctx.strokeStyle = STYLE.mainStroke;
      ctx.lineWidth = STYLE.mainWidth;
      ctx.beginPath();
      for (const river of mains) drawLineGeometry(ctx, river.geometry, viewState.project);
      ctx.stroke();
    }

    drawRiverLabels(
      ctx,
      rivers,
      viewState.project,
      viewState.view.scale,
      mainName,
      rect.width,
      rect.height,
    );

    if (statusEl) {
      const errText = errors.length ? `\n警告 ${errors.length} 个文件未加载。` : '';
      statusEl.textContent =
        `${folderName}：已绘制 ${rivers.length} 条河流` +
        (mainName ? `，干流「${mainName}」红色高亮` : '（未识别干流）') +
        '；河名已标注（干流深红、支流深蓝）。滚轮缩放，左键拖拽。' +
        errText;
    }
  }

  attachInteractions(canvas, viewState, redraw);
  redraw();
}
