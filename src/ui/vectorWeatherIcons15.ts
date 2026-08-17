/**
 * V12.16.15 — TRUE VECTOR ICON SYSTEM
 *
 * Drop-in runtime helper for instagramDaily.ts and instagramOfficial24.ts.
 *
 * Goal:
 * - remove PNG/base64 weather icons from the hourly grid and main general box;
 * - draw weather icons directly in Canvas with a coherent premium vector style;
 * - keep the existing masters, texts, temperatures, layout system and engine.
 */

export const VECTOR_WEATHER_ICON_RUNTIME = String.raw`
const LOKA_VECTOR_ICON_SYSTEM = {
  version: '12.16.15',
  color: '#1B2F5B',
  lineCap: 'round',
  lineJoin: 'round',
  hourlyVisibleSize: 100,
  mainVisibleSize: 124,
  fogVisibleSize: 102,
  windVisibleSize: 104
};

function normalizeWeatherCondition(input) {
  const raw = String(input ?? '').trim().toLowerCase();
  const value = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!value) return 'cloud';

  if (
    value.includes('orage') ||
    value.includes('thunder') ||
    value.includes('storm')
  ) return 'thunder';

  if (
    value.includes('brouillard') ||
    value.includes('brume') ||
    value.includes('fog') ||
    value.includes('mist')
  ) return 'fog';

  if (
    value.includes('neige') ||
    value.includes('gel') ||
    value.includes('snow') ||
    value.includes('frost')
  ) return 'snow';

  if (
    value.includes('pluie') ||
    value.includes('averse') ||
    value.includes('rain') ||
    value.includes('drizzle')
  ) {
    if (value.includes('vent')) return 'rain_wind';
    return 'rain';
  }

  if (value.includes('vent') || value.includes('wind')) {
    if (value.includes('soleil')) return 'sun_wind';
    if (value.includes('eclaircie')) return 'partly_wind';
    if (value.includes('nuage')) return 'cloud_wind';
    return 'wind';
  }

  if (
    value.includes('soleil') ||
    value.includes('sunny') ||
    value.includes('grand soleil')
  ) {
    if (value.includes('voile')) return 'sun';
    if (value.includes('passages nuageux')) return 'partly';
    return 'sun';
  }

  if (
    value.includes('eclaircie') ||
    value.includes('peu nuageux') ||
    value.includes('variable lumineux') ||
    value.includes('grandes eclaircies') ||
    value.includes('sun passages nuageux') ||
    value.includes('partly')
  ) return 'partly';

  if (
    value.includes('couvert') ||
    value.includes('nuage') ||
    value.includes('cloud') ||
    value.includes('variable')
  ) return 'cloud';

  return 'cloud';
}

function iconMetrics(kind, size) {
  switch (kind) {
    case 'sun': return { width: size * 0.74, height: size * 0.74 };
    case 'fog': return { width: size * 0.88, height: size * 0.50 };
    case 'wind': return { width: size * 0.92, height: size * 0.46 };
    case 'snow': return { width: size * 0.82, height: size * 0.70 };
    case 'rain_wind':
    case 'cloud_wind':
    case 'partly_wind':
    case 'sun_wind': return { width: size * 0.90, height: size * 0.64 };
    default: return { width: size * 0.82, height: size * 0.60 };
  }
}

function getVectorIconMetrics(condition, size) {
  return iconMetrics(normalizeWeatherCondition(condition), size);
}

function withWeatherStroke(ctx, options, draw) {
  ctx.save();
  ctx.strokeStyle = options.stroke || LOKA_VECTOR_ICON_SYSTEM.color;
  ctx.lineWidth = options.lineWidth || 3.2;
  ctx.lineCap = LOKA_VECTOR_ICON_SYSTEM.lineCap;
  ctx.lineJoin = LOKA_VECTOR_ICON_SYSTEM.lineJoin;
  draw();
  ctx.restore();
}

function drawCloudCore(ctx, cx, cy, w, h) {
  const left = cx - w / 2;
  const right = cx + w / 2;
  const baseY = cy + h * 0.18;
  const topY = cy - h * 0.18;

  ctx.beginPath();
  ctx.moveTo(left + w * 0.16, baseY);
  ctx.arc(cx - w * 0.22, baseY, w * 0.14, Math.PI, Math.PI * 1.5, false);
  ctx.arc(cx, topY, w * 0.20, Math.PI, Math.PI * 2.02, false);
  ctx.arc(cx + w * 0.24, baseY - h * 0.02, w * 0.14, Math.PI * 1.5, Math.PI * 0.04, false);
  ctx.lineTo(right - w * 0.14, baseY);
  ctx.lineTo(left + w * 0.16, baseY);
  ctx.stroke();
}

function drawSunCore(ctx, cx, cy, size) {
  const r = size * 0.18;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const inner = r + size * 0.08;
  const outer = r + size * 0.16;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    const x1 = cx + Math.cos(a) * inner;
    const y1 = cy + Math.sin(a) * inner;
    const x2 = cx + Math.cos(a) * outer;
    const y2 = cy + Math.sin(a) * outer;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function drawRainLines(ctx, cx, cy, size, count = 4) {
  const startY = cy + size * 0.10;
  const spread = size * 0.42;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = cx - spread / 2 + spread * t;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.02, startY + i * size * 0.005);
    ctx.lineTo(x - size * 0.07, startY + size * 0.16);
    ctx.stroke();
  }
}

function drawLightning(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.02, cy - size * 0.02);
  ctx.lineTo(cx - size * 0.12, cy + size * 0.18);
  ctx.lineTo(cx - size * 0.02, cy + size * 0.16);
  ctx.lineTo(cx - size * 0.09, cy + size * 0.34);
  ctx.lineTo(cx + size * 0.08, cy + size * 0.08);
  ctx.lineTo(cx, cy + size * 0.10);
  ctx.lineTo(cx + size * 0.06, cy - size * 0.02);
  ctx.stroke();
}

function drawFogLines(ctx, cx, cy, size, rows = 4) {
  const width = size * 0.74;
  for (let i = 0; i < rows; i++) {
    const y = cy - size * 0.18 + i * size * 0.12;
    const wobble = i % 2 === 0 ? 0 : size * 0.03;
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.50 + wobble, y);
    ctx.lineTo(cx - width * 0.14 + wobble, y);
    ctx.moveTo(cx - width * 0.02 - wobble * 0.3, y);
    ctx.lineTo(cx + width * 0.26 - wobble * 0.3, y);
    if (i !== rows - 1) {
      ctx.moveTo(cx + width * 0.34, y);
      ctx.lineTo(cx + width * 0.52, y);
    }
    ctx.stroke();
  }
}

function drawWindLines(ctx, cx, cy, size, withCloud = false) {
  const y1 = cy - size * 0.12;
  const y2 = cy + size * 0.02;
  const y3 = cy + size * 0.16;
  const left = cx - size * 0.42;
  const right = cx + size * 0.32;

  function curl(y, tail = 0) {
    ctx.beginPath();
    ctx.moveTo(left + tail, y);
    ctx.lineTo(right - size * 0.12, y);
    ctx.arc(right, y, size * 0.12, Math.PI, Math.PI * 0.1, false);
    ctx.stroke();
  }

  curl(y1, size * 0.04);
  curl(y2, 0);
  ctx.beginPath();
  ctx.moveTo(left + size * 0.18, y3);
  ctx.lineTo(cx + size * 0.08, y3);
  ctx.arc(cx + size * 0.18, y3, size * 0.10, Math.PI, Math.PI * 0.1, false);
  ctx.stroke();

  if (withCloud) {
    drawCloudCore(ctx, cx - size * 0.02, cy - size * 0.10, size * 0.54, size * 0.34);
  }
}

function drawSnowFlakes(ctx, cx, cy, size) {
  const pts = [
    [cx - size * 0.16, cy + size * 0.16],
    [cx, cy + size * 0.22],
    [cx + size * 0.16, cy + size * 0.16]
  ];
  for (const [x, y] of pts) {
    ctx.beginPath();
    ctx.moveTo(x - size * 0.04, y);
    ctx.lineTo(x + size * 0.04, y);
    ctx.moveTo(x, y - size * 0.04);
    ctx.lineTo(x, y + size * 0.04);
    ctx.moveTo(x - size * 0.03, y - size * 0.03);
    ctx.lineTo(x + size * 0.03, y + size * 0.03);
    ctx.moveTo(x - size * 0.03, y + size * 0.03);
    ctx.lineTo(x + size * 0.03, y - size * 0.03);
    ctx.stroke();
  }
}

function drawVectorWeatherIcon(ctx, condition, centerX, centerY, size, options = {}) {
  const kind = normalizeWeatherCondition(condition);
  const stroke = options.stroke || LOKA_VECTOR_ICON_SYSTEM.color;
  let lineWidth = options.lineWidth || 3.2;
  if (kind === 'wind' || kind === 'fog') lineWidth = options.lineWidth || 3.0;
  if (kind === 'main' || options.zone === 'main') lineWidth = options.lineWidth || 3.8;

  withWeatherStroke(ctx, { stroke, lineWidth }, () => {
    switch (kind) {
      case 'sun':
        drawSunCore(ctx, centerX, centerY, size);
        break;

      case 'partly':
        drawSunCore(ctx, centerX + size * 0.10, centerY - size * 0.08, size * 0.92);
        drawCloudCore(ctx, centerX - size * 0.04, centerY + size * 0.06, size * 0.66, size * 0.42);
        break;

      case 'rain':
        drawCloudCore(ctx, centerX, centerY - size * 0.06, size * 0.68, size * 0.44);
        drawRainLines(ctx, centerX, centerY + size * 0.06, size, 4);
        break;

      case 'thunder':
        drawCloudCore(ctx, centerX, centerY - size * 0.08, size * 0.68, size * 0.44);
        drawLightning(ctx, centerX + size * 0.02, centerY + size * 0.06, size * 0.82);
        drawRainLines(ctx, centerX, centerY + size * 0.10, size * 0.74, 2);
        break;

      case 'fog':
        drawFogLines(ctx, centerX, centerY, size, 4);
        break;

      case 'wind':
        drawWindLines(ctx, centerX, centerY, size, false);
        break;

      case 'snow':
        drawCloudCore(ctx, centerX, centerY - size * 0.08, size * 0.68, size * 0.44);
        drawSnowFlakes(ctx, centerX, centerY + size * 0.06, size * 0.82);
        break;

      case 'cloud_wind':
        drawCloudCore(ctx, centerX - size * 0.02, centerY - size * 0.08, size * 0.62, size * 0.40);
        drawWindLines(ctx, centerX + size * 0.02, centerY + size * 0.06, size * 0.82, false);
        break;

      case 'partly_wind':
        drawSunCore(ctx, centerX + size * 0.10, centerY - size * 0.12, size * 0.84);
        drawCloudCore(ctx, centerX - size * 0.06, centerY - size * 0.02, size * 0.58, size * 0.36);
        drawWindLines(ctx, centerX + size * 0.02, centerY + size * 0.14, size * 0.72, false);
        break;

      case 'sun_wind':
        drawSunCore(ctx, centerX - size * 0.02, centerY - size * 0.04, size * 0.92);
        drawWindLines(ctx, centerX + size * 0.04, centerY + size * 0.18, size * 0.70, false);
        break;

      case 'rain_wind':
        drawCloudCore(ctx, centerX - size * 0.06, centerY - size * 0.10, size * 0.62, size * 0.40);
        drawRainLines(ctx, centerX - size * 0.02, centerY + size * 0.04, size * 0.82, 3);
        drawWindLines(ctx, centerX + size * 0.10, centerY + size * 0.16, size * 0.62, false);
        break;

      case 'cloud':
      default:
        drawCloudCore(ctx, centerX, centerY, size * 0.72, size * 0.46);
        break;
    }
  });

  return getVectorIconMetrics(kind, size);
}
`;
