import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoBranca from "@/assets/logo-branca.png";
import logoPreta from "@/assets/logo-preta.png";

// Carrega imagem como dataURL
const loadImageAsDataUrl = (src: string): Promise<{ dataUrl: string; w: number; h: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas ctx"));
      ctx.drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = src;
  });

// ──────────────────────────────────────────────────────────
// Canvas chart renderers (retornam dataURL PNG para pdf.addImage)
// ──────────────────────────────────────────────────────────
const CP = [
  "#1e3a5f", "#d97757", "#16a34a", "#dc2626", "#d97706",
  "#2563eb", "#7c3aed", "#0891b2", "#be185d", "#65a30d",
];

// Helper para criar canvas em alta resolução (DPR otimizado p/ tamanho do PDF)
const _mkCanvas = (pw: number, ph: number): { ctx: CanvasRenderingContext2D; cvs: HTMLCanvasElement } => {
  const dpr = 1.5;
  const cvs = document.createElement("canvas");
  cvs.width = pw * dpr;
  cvs.height = ph * dpr;
  const ctx = cvs.getContext("2d")!;
  ctx.scale(dpr, dpr);
  // Fundo branco para nitidez no PDF
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pw, ph);
  return { ctx, cvs };
};

// Rounded rectangle path (cross-browser, sem roundRect)
const _rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// Rounded rectangle apenas nos cantos do topo
const _rrTop = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  r = Math.max(0, Math.min(r, w / 2, h));
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
};

// Converte hex para rgba com alpha
const _hexA = (hex: string, alpha: number): string => {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Clareia uma cor hex (mistura com branco)
const _lighten = (hex: string, amount: number): string => {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);
  return `rgb(${nr}, ${ng}, ${nb})`;
};

// Formata valor de forma compacta para labels (k/M)
// Mostra até 2 casas decimais, sem arredondar para o milhar inteiro
// (ex.: 3700 → "3,7k", 12000 → "12k", 3750 → "3,75k").
const _compact = (v: number): string => {
  const abs = Math.abs(v);
  const f = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  if (abs >= 1_000_000) return `${f(v / 1_000_000)}M`;
  if (abs >= 1_000) return `${f(v / 1_000)}k`;
  return f(v);
};

// ──────────────────────────────────────────────────────────
// Gráfico Donut — Categorias com gradiente, legenda lateral e sombra
// ──────────────────────────────────────────────────────────
const canvasDonut = (
  items: Array<{ label: string; value: number }>,
  pw: number, ph: number
): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!total) return cvs.toDataURL();

  // Posicionamento: donut à esquerda, legenda à direita
  const cx = pw * 0.28;
  const cy = ph / 2;
  const OR = Math.min(pw * 0.26, ph * 0.46);
  const IR = OR * 0.58;

  // Sombra suave atrás do donut
  ctx.save();
  ctx.shadowColor = "rgba(20, 30, 50, 0.18)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, OR + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Segmentos com gradiente radial
  let a = -Math.PI / 2;
  items.forEach((item, i) => {
    const sweep = (item.value / total) * 2 * Math.PI;
    const color = CP[i % CP.length];
    const grad = ctx.createRadialGradient(cx, cy, IR, cx, cy, OR);
    grad.addColorStop(0, _lighten(color, 0.35));
    grad.addColorStop(1, color);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, OR, a, a + sweep);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    // Separadores brancos
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    a += sweep;
  });

  // Furo interno branco
  ctx.beginPath();
  ctx.arc(cx, cy, IR, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Centro: total de categorias
  const biggest = items.reduce((a, b) => (a.value > b.value ? a : b));
  const centerNumSize = Math.max(Math.round(OR * 0.38), 18);
  const centerLblSize = Math.max(Math.round(OR * 0.16), 10);
  ctx.fillStyle = "#1e3a5f";
  ctx.font = `bold ${centerNumSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(String(items.length), cx, cy - 2);
  ctx.fillStyle = "#787880";
  ctx.font = `${centerLblSize}px Arial`;
  ctx.fillText("categorias", cx, cy + centerLblSize + 2);
  // Label da maior
  if (biggest && items.length <= 12) {
    ctx.font = `${Math.max(Math.round(OR * 0.14), 9)}px Arial`;
    ctx.fillStyle = "#a0a0a8";
    ctx.fillText(biggest.label.slice(0, 14), cx, cy + centerLblSize * 2 + 4);
  }

  // Legenda à direita
  const lx = pw * 0.60;
  const rx = pw - 8;
  const fs = Math.max(Math.round(pw * 0.030), 11);
  ctx.font = `${fs}px Arial`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const maxI = Math.min(items.length, 7);
  const rowH = Math.min((ph - 24) / maxI, fs * 1.9);
  const startY = cy - ((maxI - 1) * rowH) / 2;
  const sorted = items.slice().sort((a, b) => b.value - a.value).slice(0, maxI);
  sorted.forEach((it, i) => {
    const orig = items.indexOf(it);
    const color = CP[orig % CP.length];
    const ly = startY + i * rowH;
    // Marcador arredondado
    const dotR = Math.max(fs * 0.42, 5);
    ctx.beginPath();
    ctx.arc(lx + dotR, ly, dotR, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    // Texto
    const pct = ((it.value / total) * 100).toFixed(0);
    ctx.fillStyle = "#404050";
    ctx.font = `${fs}px Arial`;
    const maxChars = Math.max(10, Math.floor((rx - (lx + dotR * 2 + 8) - fs * 3) / (fs * 0.55)));
    const lbl = it.label.length > maxChars ? it.label.slice(0, maxChars) + "…" : it.label;
    ctx.textAlign = "left";
    ctx.fillText(lbl, lx + dotR * 2 + 8, ly);
    // Porcentagem em negrito alinhada à direita
    ctx.fillStyle = color;
    ctx.font = `bold ${fs}px Arial`;
    ctx.textAlign = "right";
    ctx.fillText(`${pct}%`, rx, ly);
  });

  return cvs.toDataURL("image/jpeg", 0.9);
};


// ──────────────────────────────────────────────────────────
// Barras verticais — gradiente, top arredondado, grid claro
// ──────────────────────────────────────────────────────────
const canvasBarV = (
  bars: Array<{ label: string; value: number; color: string }>,
  pw: number, ph: number,
  fmtFn: (v: number) => string
): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);
  const pL = 14;
  const pR = 10;
  const pT = 30;
  const pB = 34;
  const cW = pw - pL - pR;
  const cH = ph - pT - pB;
  const maxV = Math.max(...bars.map((b) => b.value), 1);
  const bSpace = cW / bars.length;
  const bW = Math.min(bSpace * 0.58, 64);

  // Grid horizontal (5 níveis) + labels Y compactas
  ctx.strokeStyle = "#eef0f3";
  ctx.lineWidth = 0.8;
  ctx.fillStyle = "#a8a8b0";
  ctx.font = `${Math.max(Math.round(pw * 0.022), 9)}px Arial`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const gy = pT + cH * (1 - t);
    ctx.beginPath();
    ctx.moveTo(pL, gy);
    ctx.lineTo(pL + cW, gy);
    ctx.stroke();
    const v = maxV * t;
    ctx.fillText(_compact(v), pL - 2, gy);
  }

  // Barras
  const fsVal = Math.max(Math.round(pw * 0.034), 11);
  const fsLbl = Math.max(Math.round(pw * 0.028), 10);
  bars.forEach((bar, i) => {
    const bH = Math.max((bar.value / maxV) * cH, 2);
    const x = pL + bSpace * i + bSpace / 2 - bW / 2;
    const y = pT + cH - bH;

    // Gradiente vertical: top claro -> brand color embaixo
    const grad = ctx.createLinearGradient(0, y, 0, y + bH);
    grad.addColorStop(0, _lighten(bar.color, 0.25));
    grad.addColorStop(1, bar.color);

    ctx.fillStyle = grad;
    _rrTop(ctx, x, y, bW, bH, Math.min(6, bW / 2));
    ctx.fill();

    // Valor acima da barra (bold)
    ctx.font = `bold ${fsVal}px Arial`;
    ctx.fillStyle = "#1e1e23";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const vStr = bar.value >= 1000
      ? `R$ ${_compact(bar.value)}`
      : fmtFn(bar.value);
    ctx.fillText(vStr, x + bW / 2, y - 6);

    // Label abaixo (cinza)
    ctx.font = `${fsLbl}px Arial`;
    ctx.fillStyle = "#787880";
    ctx.textBaseline = "top";
    ctx.fillText(bar.label.slice(0, 14), x + bW / 2, pT + cH + 8);
  });

  return cvs.toDataURL("image/jpeg", 0.9);
};

// ──────────────────────────────────────────────────────────
// Barras horizontais — gradiente, track cinza, ends arredondados
// ──────────────────────────────────────────────────────────
const canvasBarH = (
  bars: Array<{ label: string; value: number; color: string }>,
  pw: number, ph: number,
  fmtFn: (v: number) => string
): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);
  const pL = Math.min(pw * 0.32, 220);
  const pR = Math.min(pw * 0.18, 130);
  const pT = 12;
  const pB = 12;
  const cW = pw - pL - pR;
  const cH = ph - pT - pB;
  const rowH = cH / Math.max(bars.length, 1);
  const bH = Math.min(rowH * 0.55, 18);
  const maxV = Math.max(...bars.map((b) => b.value), 1);
  const total = bars.reduce((s, b) => s + b.value, 0) || 1;

  const fs = Math.max(Math.round(ph * 0.06), 10);

  bars.forEach((bar, i) => {
    const y = pT + rowH * i + (rowH - bH) / 2;
    const bW = Math.max((bar.value / maxV) * cW, 2);

    // Track de fundo (cinza claro arredondado)
    ctx.fillStyle = "#f0f0f4";
    _rr(ctx, pL, y, cW, bH, bH / 2);
    ctx.fill();

    // Barra colorida com gradiente horizontal
    const grad = ctx.createLinearGradient(pL, 0, pL + bW, 0);
    grad.addColorStop(0, bar.color);
    grad.addColorStop(1, _lighten(bar.color, 0.35));
    ctx.fillStyle = grad;
    _rr(ctx, pL, y, bW, bH, bH / 2);
    ctx.fill();

    // Label esquerda
    ctx.fillStyle = "#1e1e23";
    ctx.font = `bold ${fs}px Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const lbl = bar.label.length > 22 ? bar.label.slice(0, 22) + "…" : bar.label;
    ctx.fillText(lbl, pL - 8, y + bH / 2);

    // Valor à direita
    ctx.fillStyle = "#1e1e23";
    ctx.font = `bold ${fs}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText(fmtFn(bar.value), pL + bW + 6, y + bH / 2);

    // Porcentagem em texto suave
    const pct = ((bar.value / total) * 100).toFixed(0);
    const vTextWidth = ctx.measureText(fmtFn(bar.value)).width;
    ctx.fillStyle = "#a0a0a8";
    ctx.font = `${Math.round(fs * 0.85)}px Arial`;
    ctx.fillText(`(${pct}%)`, pL + bW + 6 + vTextWidth + 4, y + bH / 2);
  });

  return cvs.toDataURL("image/jpeg", 0.9);
};

// ──────────────────────────────────────────────────────────
// Area/Line chart — Evolução patrimonial (3 séries)
// ──────────────────────────────────────────────────────────
const canvasAreaLine = (
  series: Array<{ label: string; patrimonio: number; ativos: number; dividas: number }>,
  pw: number, ph: number
): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);
  if (series.length === 0) return cvs.toDataURL();

  const pL = 56;
  const pR = 18;
  const pT = 20;
  const pB = series.length > 6 ? 50 : 38;
  const cW = pw - pL - pR;
  const cH = ph - pT - pB;

  const allVals = series.flatMap((s) => [s.patrimonio, s.ativos, s.dividas]);
  const rawMax = Math.max(...allVals, 1);
  const rawMin = Math.min(...allVals, 0);
  const niceMax = Math.ceil(rawMax / 1000) * 1000 || 1000;
  const niceMin = rawMin < 0 ? Math.floor(rawMin / 1000) * 1000 : 0;
  const range = niceMax - niceMin || 1;

  const yToPx = (v: number) => pT + cH - ((v - niceMin) / range) * cH;
  const xToPx = (i: number) =>
    series.length === 1 ? pL + cW / 2 : pL + (i / (series.length - 1)) * cW;

  // Grid + labels Y
  ctx.strokeStyle = "#eef0f3";
  ctx.lineWidth = 0.8;
  ctx.fillStyle = "#a0a0a8";
  ctx.font = "10px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const v = niceMin + (range * i) / ySteps;
    const py = yToPx(v);
    ctx.beginPath();
    ctx.moveTo(pL, py);
    ctx.lineTo(pL + cW, py);
    ctx.stroke();
    ctx.fillText(`R$ ${_compact(v)}`, pL - 4, py);
  }

  // Linha zero
  if (niceMin < 0) {
    ctx.strokeStyle = "#787880";
    ctx.lineWidth = 1;
    const y0 = yToPx(0);
    ctx.beginPath();
    ctx.moveTo(pL, y0);
    ctx.lineTo(pL + cW, y0);
    ctx.stroke();
  }

  // X labels
  ctx.fillStyle = "#787880";
  ctx.font = "9px Arial";
  ctx.textBaseline = "top";
  const stepX = Math.max(1, Math.ceil(series.length / 8));
  series.forEach((s, i) => {
    if (i % stepX !== 0 && i !== series.length - 1) return;
    const px = xToPx(i);
    ctx.save();
    if (series.length > 6) {
      ctx.translate(px, pT + cH + 6);
      ctx.rotate(-Math.PI / 6);
      ctx.textAlign = "right";
      ctx.fillText(s.label, 0, 0);
    } else {
      ctx.textAlign = "center";
      ctx.fillText(s.label, px, pT + cH + 6);
    }
    ctx.restore();
  });

  // Função auxiliar de série
  const patrimVals = series.map((s) => s.patrimonio);
  const ativoVals = series.map((s) => s.ativos);
  const dividaVals = series.map((s) => s.dividas);

  // Área Patrimônio (preenchida com gradiente)
  const patrimColor = "#16a34a";
  const baseY = yToPx(Math.max(niceMin, 0));
  const gradFill = ctx.createLinearGradient(0, pT, 0, pT + cH);
  gradFill.addColorStop(0, _hexA(patrimColor, 0.45));
  gradFill.addColorStop(1, _hexA(patrimColor, 0.02));

  ctx.beginPath();
  ctx.moveTo(xToPx(0), baseY);
  patrimVals.forEach((v, i) => ctx.lineTo(xToPx(i), yToPx(v)));
  ctx.lineTo(xToPx(patrimVals.length - 1), baseY);
  ctx.closePath();
  ctx.fillStyle = gradFill;
  ctx.fill();

  // Linha Patrimônio
  ctx.strokeStyle = patrimColor;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  patrimVals.forEach((v, i) => {
    const x = xToPx(i), py = yToPx(v);
    if (i === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  });
  ctx.stroke();

  // Linha Ativos (azul)
  const ativoColor = "#2563eb";
  ctx.strokeStyle = ativoColor;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([]);
  ctx.beginPath();
  ativoVals.forEach((v, i) => {
    const x = xToPx(i), py = yToPx(v);
    if (i === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  });
  ctx.stroke();

  // Linha Dívidas (vermelho, tracejada)
  const dividaColor = "#dc2626";
  ctx.strokeStyle = dividaColor;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  dividaVals.forEach((v, i) => {
    const x = xToPx(i), py = yToPx(v);
    if (i === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // Pontos com marcadores
  const drawDots = (vals: number[], color: string) => {
    vals.forEach((v, i) => {
      const x = xToPx(i), py = yToPx(v);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, py, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  };
  drawDots(patrimVals, patrimColor);
  drawDots(ativoVals, ativoColor);
  drawDots(dividaVals, dividaColor);

  // Legenda no rodapé
  const legendItems = [
    { label: "Patrimônio Líquido", color: patrimColor },
    { label: "Ativos", color: ativoColor },
    { label: "Dívidas", color: dividaColor },
  ];
  ctx.font = "10px Arial";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  let lx = pL;
  const ly = ph - 10;
  legendItems.forEach((lg) => {
    ctx.fillStyle = lg.color;
    ctx.beginPath();
    ctx.arc(lx + 5, ly, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#404050";
    ctx.fillText(lg.label, lx + 14, ly);
    lx += ctx.measureText(lg.label).width + 30;
  });

  return cvs.toDataURL("image/jpeg", 0.9);
};

// ──────────────────────────────────────────────────────────
// Gauge semicircular — Risco
// ──────────────────────────────────────────────────────────
const canvasGauge = (risk: string, pw: number, ph: number): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);

  const cx = pw / 2;
  const cy = ph * 0.62;
  const r = Math.min(pw * 0.36, ph * 0.45);
  const stroke = 18;

  // Mapping
  const order: Array<"A" | "B" | "C" | "D" | "E"> = ["A", "B", "C", "D", "E"];
  const colors: Record<string, string> = {
    A: "#16a34a",
    B: "#2563eb",
    C: "#d97706",
    D: "#ea580c",
    E: "#dc2626",
  };
  const labels: Record<string, string> = {
    A: "Excelente",
    B: "Bom",
    C: "Regular",
    D: "Atenção",
    E: "Crítico",
  };

  const startA = Math.PI;
  const endA = 2 * Math.PI;
  const totalAngle = endA - startA;
  const seg = totalAngle / 5;

  // 5 segmentos coloridos
  order.forEach((k, i) => {
    const s = startA + seg * i;
    const e = s + seg - 0.03; // pequeno gap
    ctx.beginPath();
    ctx.strokeStyle = colors[k];
    ctx.lineWidth = stroke;
    ctx.lineCap = "round";
    ctx.arc(cx, cy, r, s, e);
    ctx.stroke();
  });

  // Calcular ponteiro
  const idx = Math.max(0, order.indexOf(risk as "A" | "B" | "C" | "D" | "E"));
  const needleA = startA + seg * (idx + 0.5);
  const needleLen = r - stroke / 2 - 2;
  const nx = cx + Math.cos(needleA) * needleLen;
  const ny = cy + Math.sin(needleA) * needleLen;

  // Ponteiro
  ctx.strokeStyle = "#1e1e23";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.stroke();

  // Centro do ponteiro
  ctx.fillStyle = "#1e1e23";
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Letra grande embaixo
  const curColor = colors[risk] || "#787880";
  ctx.fillStyle = curColor;
  ctx.font = `bold ${Math.round(ph * 0.22)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(risk, cx, ph - 8);

  // Label
  ctx.fillStyle = "#787880";
  ctx.font = `${Math.round(ph * 0.07)}px Arial`;
  ctx.fillText(labels[risk] || "—", cx, cy + r - 4);

  // Labels A-E nas extremidades
  ctx.font = `${Math.round(ph * 0.06)}px Arial`;
  ctx.fillStyle = "#a0a0a8";
  order.forEach((k, i) => {
    const a = startA + seg * (i + 0.5);
    const lr = r + stroke / 2 + 8;
    const lxp = cx + Math.cos(a) * lr;
    const lyp = cy + Math.sin(a) * lr;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(k, lxp, lyp);
  });

  // Título no topo
  ctx.fillStyle = "#404050";
  ctx.font = `bold ${Math.round(ph * 0.07)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Classificação", cx, 6);

  return cvs.toDataURL("image/jpeg", 0.9);
};

// ──────────────────────────────────────────────────────────
// Stacked bar — Composição da Renda (despesas / poupança / restante)
// ──────────────────────────────────────────────────────────
const canvasBarStacked = (
  data: { income: number; expenses: number; savings: number },
  pw: number, ph: number
): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);

  const income = Math.max(data.income, 1);
  const expenses = Math.max(0, data.expenses);
  const savings = Math.max(0, data.savings);
  const remaining = Math.max(0, income - expenses - savings);

  // Título
  ctx.fillStyle = "#404050";
  ctx.font = `bold ${Math.round(ph * 0.10)}px Arial`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Composição da Renda", 10, 6);

  ctx.fillStyle = "#787880";
  ctx.font = `${Math.round(ph * 0.07)}px Arial`;
  ctx.fillText(`Renda total: R$ ${_compact(income)}`, 10, 6 + ph * 0.13);

  // Barra
  const barY = ph * 0.5;
  const barH = ph * 0.22;
  const barX = 10;
  const barW = pw - 20;

  // Track
  ctx.fillStyle = "#f0f0f4";
  _rr(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();

  // Segmentos
  const segments = [
    { v: expenses, color: "#dc2626", label: "Despesas" },
    { v: savings, color: "#16a34a", label: "Poupança" },
    { v: remaining, color: "#a0a0a8", label: "Outros" },
  ];

  let cur = 0;
  segments.forEach((seg, i) => {
    if (seg.v <= 0) return;
    const w = (seg.v / income) * barW;
    ctx.save();
    // clip ao retangulo arredondado
    _rr(ctx, barX, barY, barW, barH, barH / 2);
    ctx.clip();
    // Gradiente vertical leve
    const grad = ctx.createLinearGradient(0, barY, 0, barY + barH);
    grad.addColorStop(0, _lighten(seg.color, 0.2));
    grad.addColorStop(1, seg.color);
    ctx.fillStyle = grad;
    ctx.fillRect(barX + cur, barY, w, barH);
    ctx.restore();
    cur += w;
  });

  // Labels com porcentagem em cada segmento
  let curL = 0;
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(ph * 0.08)}px Arial`;
  segments.forEach((seg) => {
    if (seg.v <= 0) return;
    const w = (seg.v / income) * barW;
    const cxp = barX + curL + w / 2;
    const pct = ((seg.v / income) * 100).toFixed(0);
    if (w > 40) {
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(`${pct}%`, cxp, barY + barH / 2);
    }
    curL += w;
  });

  // Legenda abaixo
  const legY = barY + barH + ph * 0.10;
  let lx = 10;
  ctx.font = `${Math.round(ph * 0.07)}px Arial`;
  ctx.textBaseline = "middle";
  segments.forEach((seg) => {
    const sq = Math.round(ph * 0.06);
    ctx.fillStyle = seg.color;
    _rr(ctx, lx, legY - sq / 2, sq, sq, 2);
    ctx.fill();
    ctx.fillStyle = "#404050";
    ctx.textAlign = "left";
    const txt = `${seg.label}  R$ ${_compact(seg.v)}`;
    ctx.fillText(txt, lx + sq + 4, legY);
    lx += sq + 8 + ctx.measureText(txt).width + 14;
  });

  return cvs.toDataURL("image/jpeg", 0.9);
};

// ──────────────────────────────────────────────────────────
// Donut com cores customizadas + total no centro (para Status / Categoria)
// ──────────────────────────────────────────────────────────
const canvasColoredDonut = (
  items: Array<{ label: string; value: number; color: string }>,
  pw: number, ph: number,
  centerLabel: string
): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!total) return cvs.toDataURL();

  // Donut à esquerda, legenda à direita
  const cx = pw * 0.30;
  const cy = ph / 2;
  const OR = Math.min(pw * 0.26, ph * 0.46);
  const IR = OR * 0.58;

  // Sombra suave
  ctx.save();
  ctx.shadowColor = "rgba(20, 30, 50, 0.18)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, OR + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Segmentos
  let a = -Math.PI / 2;
  items.forEach((item) => {
    const sweep = (item.value / total) * 2 * Math.PI;
    const grad = ctx.createRadialGradient(cx, cy, IR, cx, cy, OR);
    grad.addColorStop(0, _lighten(item.color, 0.35));
    grad.addColorStop(1, item.color);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, OR, a, a + sweep);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    a += sweep;
  });

  // Furo interno
  ctx.beginPath();
  ctx.arc(cx, cy, IR, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Total no centro
  const centerNumSize = Math.max(Math.round(OR * 0.42), 20);
  const centerLblSize = Math.max(Math.round(OR * 0.16), 10);
  ctx.fillStyle = "#1e3a5f";
  ctx.font = `bold ${centerNumSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(String(total), cx, cy + centerNumSize * 0.15);
  ctx.fillStyle = "#787880";
  ctx.font = `${centerLblSize}px Arial`;
  ctx.fillText(centerLabel, cx, cy + centerNumSize * 0.15 + centerLblSize + 4);

  // Legenda à direita
  const lx = pw * 0.62;
  const rx = pw - 8;
  const fs = Math.max(Math.round(pw * 0.028), 11);
  ctx.font = `${fs}px Arial`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const maxI = Math.min(items.length, 7);
  const rowH = Math.min((ph - 24) / Math.max(maxI, 1), fs * 2.0);
  const startY = cy - ((maxI - 1) * rowH) / 2;
  const sorted = items.slice().sort((a, b) => b.value - a.value).slice(0, maxI);
  sorted.forEach((it, i) => {
    const ly = startY + i * rowH;
    const dotR = Math.max(fs * 0.42, 5);
    ctx.beginPath();
    ctx.arc(lx + dotR, ly, dotR, 0, 2 * Math.PI);
    ctx.fillStyle = it.color;
    ctx.fill();
    const pct = ((it.value / total) * 100).toFixed(0);
    ctx.fillStyle = "#404050";
    ctx.font = `${fs}px Arial`;
    const maxChars = Math.max(8, Math.floor((rx - (lx + dotR * 2 + 8) - fs * 4) / (fs * 0.55)));
    const lbl = it.label.length > maxChars ? it.label.slice(0, maxChars) + "…" : it.label;
    ctx.textAlign = "left";
    ctx.fillText(lbl, lx + dotR * 2 + 8, ly);
    ctx.fillStyle = it.color;
    ctx.font = `bold ${fs}px Arial`;
    ctx.textAlign = "right";
    ctx.fillText(`${it.value} (${pct}%)`, rx, ly);
  });

  return cvs.toDataURL("image/jpeg", 0.9);
};

// ──────────────────────────────────────────────────────────
// Anel de progresso (KPI em "pizza") — um único indicador
// ──────────────────────────────────────────────────────────
const canvasKpiRing = (
  pct: number,
  color: string,
  centerText: string,
  sublabel: string,
  pw: number,
  ph: number
): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);
  const cx = pw / 2;
  const cy = ph * 0.46;
  const R = Math.min(pw, ph * 0.92) * 0.40;
  const lw = Math.max(R * 0.26, 7);
  const p = Math.max(0, Math.min(pct, 100)) / 100;

  ctx.lineCap = "round";
  // Trilha
  ctx.strokeStyle = "#eef0f3";
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  // Progresso
  const start = -Math.PI / 2;
  if (p > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, R, start, start + p * Math.PI * 2);
    ctx.stroke();
  }
  // Centro
  ctx.fillStyle = "#1e1e23";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const numSize = Math.max(Math.round(R * 0.52), 15);
  ctx.font = `bold ${numSize}px Arial`;
  ctx.fillText(centerText, cx, cy - (sublabel ? R * 0.06 : 0));
  if (sublabel) {
    const sSize = Math.max(Math.round(R * 0.22), 9);
    ctx.fillStyle = "#787880";
    ctx.font = `${sSize}px Arial`;
    ctx.fillText(sublabel, cx, cy + R * 0.42);
  }
  return cvs.toDataURL("image/jpeg", 0.9);
};

// ──────────────────────────────────────────────────────────
// Pizza/Rosca flexível — centro custom + legenda com valor
// ──────────────────────────────────────────────────────────
const canvasPie = (
  items: Array<{ label: string; value: number; color?: string }>,
  pw: number,
  ph: number,
  opts?: {
    centerTop?: string;
    centerBottom?: string;
    fmtVal?: (v: number) => string;
    showLegend?: boolean;
  }
): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);
  const list = items.filter((i) => i.value > 0);
  const total = list.reduce((s, i) => s + i.value, 0);
  if (!total) return cvs.toDataURL();
  const showLegend = opts?.showLegend !== false;
  const fmtVal = opts?.fmtVal;

  const cx = showLegend ? pw * 0.28 : pw * 0.5;
  const cy = ph / 2;
  const OR = Math.min(showLegend ? pw * 0.24 : pw * 0.42, ph * 0.46);
  const IR = OR * 0.60;

  // Sombra suave
  ctx.save();
  ctx.shadowColor = "rgba(20, 30, 50, 0.18)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, OR + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Segmentos com gradiente + separadores brancos
  let a = -Math.PI / 2;
  list.forEach((item, i) => {
    const color = item.color || CP[i % CP.length];
    const sweep = (item.value / total) * 2 * Math.PI;
    const grad = ctx.createRadialGradient(cx, cy, IR, cx, cy, OR);
    grad.addColorStop(0, _lighten(color, 0.35));
    grad.addColorStop(1, color);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, OR, a, a + sweep);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    a += sweep;
  });

  // Furo interno
  ctx.beginPath();
  ctx.arc(cx, cy, IR, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Centro custom — fonte ajustada para caber dentro do furo (IR)
  ctx.textAlign = "center";
  if (opts?.centerTop) {
    const maxTextW = IR * 2 * 0.82; // margem interna para não tocar o anel
    let numSize = Math.max(Math.round(OR * 0.40), 14);
    ctx.font = `bold ${numSize}px Arial`;
    while (ctx.measureText(opts.centerTop).width > maxTextW && numSize > 10) {
      numSize -= 1;
      ctx.font = `bold ${numSize}px Arial`;
    }
    ctx.fillStyle = "#1e3a5f";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(opts.centerTop, cx, cy + (opts.centerBottom ? 0 : numSize * 0.18));
    if (opts.centerBottom) {
      const sSize = Math.max(Math.round(numSize * 0.40), 9);
      ctx.fillStyle = "#787880";
      ctx.font = `${sSize}px Arial`;
      ctx.textBaseline = "top";
      ctx.fillText(opts.centerBottom, cx, cy + sSize * 0.4);
    }
  }

  // Legenda à direita — rótulo "principal — detalhe" quebra em 2 linhas
  // (principal em cima, detalhe embaixo em cinza) para não cortar o texto.
  if (showLegend) {
    const lx = pw * 0.54;
    const rx = pw - 6;
    const fs = Math.max(Math.round(pw * 0.0205), 10);
    const fs2 = Math.max(Math.round(fs * 0.82), 8);
    ctx.textBaseline = "middle";
    const maxI = Math.min(list.length, 7);
    const rowH = Math.min((ph - 14) / Math.max(maxI, 1), fs * 2.25);
    const startY = cy - ((maxI - 1) * rowH) / 2;
    const sorted = list.slice().sort((x, y) => y.value - x.value).slice(0, maxI);

    // Desenha texto reduzindo a fonte até caber (só corta como último recurso)
    const drawFit = (
      text: string, x: number, ly: number, maxW: number,
      startPx: number, minPx: number, color: string
    ) => {
      let px = startPx;
      ctx.font = `${px}px Arial`;
      while (px > minPx && ctx.measureText(text).width > maxW) {
        px -= 1;
        ctx.font = `${px}px Arial`;
      }
      let t = text;
      if (ctx.measureText(t).width > maxW) {
        while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
        t = t.trimEnd() + "…";
      }
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.fillText(t, x, ly);
    };

    sorted.forEach((it, i) => {
      const orig = list.indexOf(it);
      const color = it.color || CP[orig % CP.length];
      const ly = startY + i * rowH;
      const dotR = Math.max(fs * 0.38, 5);
      ctx.beginPath();
      ctx.arc(lx + dotR, ly, dotR, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      const pct = ((it.value / total) * 100).toFixed(0);
      const valStr = fmtVal ? fmtVal(it.value) : `${pct}%`;
      ctx.font = `bold ${fs}px Arial`;
      const valW = ctx.measureText(valStr).width;
      const labelStart = lx + dotR * 2 + 8;
      const labelMaxW = rx - valW - 12 - labelStart;

      // separa "principal — detalhe"
      const parts = it.label.split(/\s[—–-]\s/);
      const main = parts[0];
      const detail = parts.length > 1 ? parts.slice(1).join(" - ") : "";

      if (detail) {
        drawFit(main, labelStart, ly - fs * 0.55, labelMaxW, fs, Math.round(fs * 0.70), "#33373f");
        drawFit(detail, labelStart, ly + fs * 0.62, labelMaxW, fs2, Math.round(fs2 * 0.66), "#9098a4");
      } else {
        drawFit(main, labelStart, ly, labelMaxW, fs, Math.round(fs * 0.70), "#33373f");
      }

      ctx.fillStyle = color;
      ctx.font = `bold ${fs}px Arial`;
      ctx.textAlign = "right";
      ctx.fillText(valStr, rx, ly);
    });
  }

  return cvs.toDataURL("image/jpeg", 0.9);
};

// ──────────────────────────────────────────────────────────
// Ícones de linha (estilo premium) — desenhados em canvas 24x24
// ──────────────────────────────────────────────────────────
const canvasIcon = (name: string, hex: string): string => {
  const unit = 24, px = 64, dpr = 2;
  const cvs = document.createElement("canvas");
  cvs.width = px * dpr;
  cvs.height = px * dpr;
  const ctx = cvs.getContext("2d")!;
  const k = (px * dpr) / unit;
  ctx.scale(k, k);
  ctx.strokeStyle = hex;
  ctx.fillStyle = hex;
  ctx.lineWidth = 1.9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const S = (fn: () => void) => { ctx.beginPath(); fn(); ctx.stroke(); };
  const dot = (x: number, y: number, r: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

  switch (name) {
    case "compass":
      S(() => ctx.arc(12, 12, 9, 0, Math.PI * 2));
      S(() => { ctx.moveTo(16, 8); ctx.lineTo(10.5, 10.5); ctx.lineTo(8, 16); ctx.lineTo(13.5, 13.5); ctx.closePath(); });
      break;
    case "gauge":
      S(() => ctx.arc(12, 14, 8, Math.PI, 2 * Math.PI));
      S(() => { ctx.moveTo(12, 14); ctx.lineTo(16, 10); });
      dot(12, 14, 1.3);
      break;
    case "scale":
      S(() => { ctx.moveTo(12, 4); ctx.lineTo(12, 20); });
      S(() => { ctx.moveTo(5, 7); ctx.lineTo(19, 7); });
      S(() => { ctx.moveTo(8.5, 20); ctx.lineTo(15.5, 20); });
      S(() => { ctx.moveTo(2.5, 12); ctx.lineTo(5, 7); ctx.lineTo(7.5, 12); ctx.arc(5, 12, 2.5, 0, Math.PI); });
      S(() => { ctx.moveTo(16.5, 12); ctx.lineTo(19, 7); ctx.lineTo(21.5, 12); ctx.arc(19, 12, 2.5, 0, Math.PI); });
      dot(12, 5.2, 1.1);
      break;
    case "trending-up":
      S(() => { ctx.moveTo(3, 17); ctx.lineTo(9, 11); ctx.lineTo(13, 15); ctx.lineTo(21, 7); });
      S(() => { ctx.moveTo(16, 7); ctx.lineTo(21, 7); ctx.lineTo(21, 12); });
      break;
    case "card":
      S(() => { const r = 2.5; ctx.moveTo(3 + r, 6); ctx.arcTo(21, 6, 21, 18, r); ctx.arcTo(21, 18, 3, 18, r); ctx.arcTo(3, 18, 3, 6, r); ctx.arcTo(3, 6, 21, 6, r); ctx.closePath(); });
      S(() => { ctx.moveTo(3, 10); ctx.lineTo(21, 10); });
      S(() => { ctx.moveTo(6, 14.5); ctx.lineTo(10, 14.5); });
      break;
    case "shield":
      S(() => { ctx.moveTo(12, 3); ctx.lineTo(19.5, 6); ctx.lineTo(19.5, 12); ctx.bezierCurveTo(19.5, 16.5, 16, 19.5, 12, 21); ctx.bezierCurveTo(8, 19.5, 4.5, 16.5, 4.5, 12); ctx.lineTo(4.5, 6); ctx.closePath(); });
      S(() => { ctx.moveTo(9, 12); ctx.lineTo(11, 14); ctx.lineTo(15, 9.5); });
      break;
    case "target":
      S(() => ctx.arc(12, 12, 8.5, 0, Math.PI * 2));
      S(() => ctx.arc(12, 12, 5, 0, Math.PI * 2));
      dot(12, 12, 1.8);
      break;
    case "checklist":
      S(() => { ctx.moveTo(4, 6); ctx.lineTo(6, 8); ctx.lineTo(9, 5); });
      S(() => { ctx.moveTo(4, 13); ctx.lineTo(6, 15); ctx.lineTo(9, 12); });
      S(() => { ctx.moveTo(12, 7); ctx.lineTo(20, 7); });
      S(() => { ctx.moveTo(12, 14); ctx.lineTo(20, 14); });
      S(() => { ctx.moveTo(4, 19.5); ctx.lineTo(20, 19.5); });
      break;
    case "percent":
      S(() => { ctx.moveTo(19, 5); ctx.lineTo(5, 19); });
      S(() => ctx.arc(7.5, 7.5, 2.5, 0, Math.PI * 2));
      S(() => ctx.arc(16.5, 16.5, 2.5, 0, Math.PI * 2));
      break;
    case "activity":
      S(() => { ctx.moveTo(3, 12); ctx.lineTo(8, 12); ctx.lineTo(11, 5); ctx.lineTo(14, 19); ctx.lineTo(17, 12); ctx.lineTo(21, 12); });
      break;
    case "pie":
      S(() => ctx.arc(12, 12, 9, 0, Math.PI * 2));
      S(() => { ctx.moveTo(12, 12); ctx.lineTo(12, 3); });
      S(() => { ctx.moveTo(12, 12); ctx.lineTo(20, 15); });
      break;
    case "calendar":
      S(() => { const r = 2; ctx.moveTo(4 + r, 6); ctx.arcTo(20, 6, 20, 20, r); ctx.arcTo(20, 20, 4, 20, r); ctx.arcTo(4, 20, 4, 6, r); ctx.arcTo(4, 6, 20, 6, r); ctx.closePath(); });
      S(() => { ctx.moveTo(4, 10); ctx.lineTo(20, 10); });
      S(() => { ctx.moveTo(8, 4); ctx.lineTo(8, 7.5); });
      S(() => { ctx.moveTo(16, 4); ctx.lineTo(16, 7.5); });
      dot(9, 14, 0.9); dot(12, 14, 0.9); dot(15, 14, 0.9);
      break;
    case "file":
    default:
      S(() => { ctx.moveTo(6, 3); ctx.lineTo(14, 3); ctx.lineTo(19, 8); ctx.lineTo(19, 21); ctx.lineTo(6, 21); ctx.closePath(); });
      S(() => { ctx.moveTo(14, 3); ctx.lineTo(14, 8); ctx.lineTo(19, 8); });
      S(() => { ctx.moveTo(9, 12); ctx.lineTo(16, 12); });
      S(() => { ctx.moveTo(9, 15.5); ctx.lineTo(16, 15.5); });
      S(() => { ctx.moveTo(9, 19); ctx.lineTo(13, 19); });
      break;
  }
  return cvs.toDataURL("image/png");
};

// Ícone temático por título de seção
const ICON_BY_TITLE: Record<string, string> = {
  "Método Novare": "compass",
  "Classificação de Risco": "gauge",
  "Balanço Patrimonial": "scale",
  "Fluxo de Caixa Mensal": "activity",
  "Mapa de Dívidas": "card",
  "Proteção e Seguros": "shield",
  "Objetivos Financeiros": "target",
  "Plano de Ação": "checklist",
  "Projeção de Ganhos": "trending-up",
  "Plano de Ação Aplicado": "checklist",
  "Evolução Patrimonial": "trending-up",
  "Evolução da Taxa de Poupança": "percent",
  "Acompanhamento de Metas": "activity",
  "Análise Visual das Metas": "pie",
  "Fechamentos Mensais": "calendar",
  "Parecer Técnico": "file",
  "Cronograma de Acompanhamento": "calendar",
  "Glossário Financeiro": "file",
};

// ──────────────────────────────────────────────────────────
// Assinatura manuscrita (caligrafia) — nome em fonte cursiva
// ──────────────────────────────────────────────────────────
const canvasSignature = (name: string): { dataUrl: string; aspect: number } => {
  // Tamanho de fonte FIXO para todas as assinaturas → mesma altura de letra.
  // A largura do canvas é proporcional ao texto (nomes longos ficam mais largos,
  // não menores).
  const fontPx = 58;
  const padX = 10;
  const ph = 84;
  const font = `italic ${fontPx}px 'Segoe Script', 'Brush Script MT', 'Lucida Handwriting', 'Bradley Hand', 'Comic Sans MS', cursive`;

  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;
  const tw = measure.measureText(name).width;
  const pw = Math.ceil(tw + padX * 2);

  const dpr = 2;
  const cvs = document.createElement("canvas");
  cvs.width = pw * dpr;
  cvs.height = ph * dpr;
  const ctx = cvs.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#15233a";
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(name, padX, ph * 0.72);
  return { dataUrl: cvs.toDataURL("image/png"), aspect: pw / ph };
};

// ──────────────────────────────────────────────────────────
// Barras horizontais com "trilha" cinza (Progresso por meta)
// ──────────────────────────────────────────────────────────
const canvasBarHWithTrack = (
  bars: Array<{ label: string; value: number; color: string }>,
  pw: number, ph: number,
  maxValue: number,
  fmtFn: (v: number) => string
): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);
  const pL = Math.min(pw * 0.34, 240);
  const pR = Math.min(pw * 0.14, 90);
  const pT = 10;
  const pB = 10;
  const cW = pw - pL - pR;
  const cH = ph - pT - pB;
  const rowH = cH / Math.max(bars.length, 1);
  const bH = Math.min(rowH * 0.55, 16);
  const maxV = Math.max(maxValue, 1);

  const fs = Math.max(Math.round(rowH * 0.42), 10);

  bars.forEach((bar, i) => {
    const y = pT + rowH * i + (rowH - bH) / 2;
    // Trilha (100% width = maxV)
    ctx.fillStyle = "#e5e7eb";
    _rr(ctx, pL, y, cW, bH, bH / 2);
    ctx.fill();

    // Barra
    const ratio = Math.min(bar.value / maxV, 1);
    const bW = Math.max(ratio * cW, 2);
    const grad = ctx.createLinearGradient(pL, 0, pL + bW, 0);
    grad.addColorStop(0, bar.color);
    grad.addColorStop(1, _lighten(bar.color, 0.30));
    ctx.fillStyle = grad;
    _rr(ctx, pL, y, bW, bH, bH / 2);
    ctx.fill();

    // Label esquerda
    ctx.fillStyle = "#1e1e23";
    ctx.font = `bold ${fs}px Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const maxLblChars = Math.max(20, Math.floor((pL - 12) / (fs * 0.55)));
    const lbl = bar.label.length > maxLblChars ? bar.label.slice(0, maxLblChars - 1) + "…" : bar.label;
    ctx.fillText(lbl, pL - 8, y + bH / 2);

    // Valor à direita
    ctx.fillStyle = bar.color;
    ctx.font = `bold ${fs}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText(fmtFn(bar.value), pL + bW + 6, y + bH / 2);
  });

  return cvs.toDataURL("image/jpeg", 0.9);
};

// ──────────────────────────────────────────────────────────
// Barras agrupadas (Alvo vs Atual)
// ──────────────────────────────────────────────────────────
const canvasBarGrouped = (
  groups: Array<{ label: string; series: Array<{ name: string; value: number; color: string }> }>,
  pw: number, ph: number,
  fmtCompact: (v: number) => string
): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);
  if (groups.length === 0) return cvs.toDataURL();

  const pL = 42;
  const pR = 14;
  const pT = 28; // espaço pra legenda no topo
  const pB = 58; // espaço pra labels rotacionados embaixo
  const cW = pw - pL - pR;
  const cH = ph - pT - pB;

  const allVals = groups.flatMap((g) => g.series.map((s) => s.value));
  const rawMax = Math.max(...allVals, 1);
  const niceMax = Math.ceil(rawMax / 1000) * 1000 || rawMax;

  const yToPx = (v: number) => pT + cH - (v / niceMax) * cH;

  // Legenda no topo (usa nomes da primeira group)
  const legend = groups[0]?.series.map((s) => ({ name: s.name, color: s.color })) || [];
  let legX = pL;
  const legY = 10;
  const legFs = 10;
  ctx.font = `${legFs}px Arial`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  legend.forEach((lg) => {
    ctx.fillStyle = lg.color;
    _rr(ctx, legX, legY - 5, 10, 10, 2);
    ctx.fill();
    ctx.fillStyle = "#404050";
    ctx.fillText(lg.name, legX + 14, legY);
    legX += 14 + ctx.measureText(lg.name).width + 18;
  });

  // Grid + Y labels
  ctx.strokeStyle = "#eef0f3";
  ctx.lineWidth = 0.8;
  ctx.fillStyle = "#a0a0a8";
  ctx.font = "10px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const gy = pT + cH * (1 - t);
    ctx.beginPath();
    ctx.moveTo(pL, gy);
    ctx.lineTo(pL + cW, gy);
    ctx.stroke();
    const v = niceMax * t;
    ctx.fillText(fmtCompact(v), pL - 4, gy);
  }

  // Barras
  const groupW = cW / groups.length;
  const innerGap = 4;
  const seriesCount = legend.length || 1;
  const bW = Math.min((groupW - 14) / seriesCount - innerGap, 24);

  groups.forEach((g, gi) => {
    const groupCx = pL + groupW * gi + groupW / 2;
    g.series.forEach((s, si) => {
      const totalSeriesW = bW * seriesCount + innerGap * (seriesCount - 1);
      const x = groupCx - totalSeriesW / 2 + si * (bW + innerGap);
      const bH = Math.max((s.value / niceMax) * cH, 1);
      const yy = pT + cH - bH;
      const grad = ctx.createLinearGradient(0, yy, 0, yy + bH);
      grad.addColorStop(0, _lighten(s.color, 0.25));
      grad.addColorStop(1, s.color);
      ctx.fillStyle = grad;
      _rrTop(ctx, x, yy, bW, bH, Math.min(4, bW / 2));
      ctx.fill();
    });
    // Label rotacionado
    ctx.save();
    ctx.translate(groupCx, pT + cH + 6);
    ctx.rotate(-Math.PI / 6);
    ctx.fillStyle = "#787880";
    ctx.font = "9px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    const lbl = g.label.length > 16 ? g.label.slice(0, 15) + "…" : g.label;
    ctx.fillText(lbl, 0, 0);
    ctx.restore();
  });

  return cvs.toDataURL("image/jpeg", 0.9);
};

// ──────────────────────────────────────────────────────────
// Linhas múltiplas — Evolução de várias séries (% no eixo Y)
// ──────────────────────────────────────────────────────────
const canvasMultiLine = (
  xLabels: string[],
  series: Array<{ name: string; color: string; points: Array<number | null> }>,
  pw: number, ph: number
): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);
  if (xLabels.length === 0 || series.length === 0) return cvs.toDataURL();

  const pL = 40;
  const pR = 14;
  const pT = 14;
  const pB = 50; // espaço pra X labels + legenda
  const cW = pw - pL - pR;
  const cH = ph - pT - pB;

  // domínio Y 0 - 110 (ou maior se algum ponto excede)
  const allVals = series.flatMap((s) => s.points.filter((p): p is number => p != null));
  const maxV = Math.max(110, Math.ceil((Math.max(...allVals, 0) + 10) / 10) * 10);

  const yToPx = (v: number) => pT + cH - (v / maxV) * cH;
  const xToPx = (i: number) =>
    xLabels.length === 1 ? pL + cW / 2 : pL + (i / (xLabels.length - 1)) * cW;

  // Grid + Y labels
  ctx.strokeStyle = "#eef0f3";
  ctx.lineWidth = 0.8;
  ctx.fillStyle = "#a0a0a8";
  ctx.font = "10px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const v = (maxV * i) / steps;
    const py = yToPx(v);
    ctx.beginPath();
    ctx.moveTo(pL, py);
    ctx.lineTo(pL + cW, py);
    ctx.stroke();
    ctx.fillText(`${Math.round(v)}%`, pL - 4, py);
  }

  // X labels
  ctx.fillStyle = "#787880";
  ctx.font = "9px Arial";
  ctx.textBaseline = "top";
  const stepX = Math.max(1, Math.ceil(xLabels.length / 8));
  xLabels.forEach((lbl, i) => {
    if (i % stepX !== 0 && i !== xLabels.length - 1) return;
    const px = xToPx(i);
    ctx.save();
    if (xLabels.length > 6) {
      ctx.translate(px, pT + cH + 6);
      ctx.rotate(-Math.PI / 6);
      ctx.textAlign = "right";
      ctx.fillText(lbl, 0, 0);
    } else {
      ctx.textAlign = "center";
      ctx.fillText(lbl, px, pT + cH + 6);
    }
    ctx.restore();
  });

  // Linhas (uma por série), pulando gaps de null
  series.forEach((s) => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.0;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    let started = false;
    ctx.beginPath();
    s.points.forEach((p, i) => {
      if (p == null) {
        started = false;
        return;
      }
      const x = xToPx(i);
      const y = yToPx(p);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Pontos
    s.points.forEach((p, i) => {
      if (p == null) return;
      const x = xToPx(i);
      const y = yToPx(p);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(x, y, 2.3, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // Legenda no rodapé (com wrap se muitas)
  const fsL = 10;
  ctx.font = `${fsL}px Arial`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  let lgx = pL;
  let lgy = ph - 16;
  const maxX = pw - pR;
  series.forEach((s) => {
    const txt = s.name;
    const itemW = 14 + ctx.measureText(txt).width + 16;
    if (lgx + itemW > maxX) {
      lgx = pL;
      lgy += 14;
    }
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(lgx + 5, lgy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#404050";
    ctx.fillText(txt, lgx + 14, lgy);
    lgx += itemW;
  });

  return cvs.toDataURL("image/jpeg", 0.9);
};

// ──────────────────────────────────────────────────────────
// Barras empilhadas por série (Lançamentos por mês por categoria)
// ──────────────────────────────────────────────────────────
const canvasBarStackedSeries = (
  buckets: Array<{ label: string; counts: Record<string, number> }>,
  categories: Array<{ key: string; label: string; color: string }>,
  pw: number, ph: number
): string => {
  const { ctx, cvs } = _mkCanvas(pw, ph);
  if (buckets.length === 0 || categories.length === 0) return cvs.toDataURL();

  const pL = 32;
  const pR = 14;
  const pT = 28;
  const pB = 38;
  const cW = pw - pL - pR;
  const cH = ph - pT - pB;

  // Total por bucket (para domínio Y)
  const totals = buckets.map((b) => categories.reduce((s, c) => s + (b.counts[c.key] || 0), 0));
  const rawMax = Math.max(...totals, 1);
  const niceMax = Math.max(rawMax, Math.ceil(rawMax / 5) * 5);

  const yToPx = (v: number) => pT + cH - (v / niceMax) * cH;

  // Legenda topo
  let legX = pL;
  const legY = 10;
  const legFs = 10;
  ctx.font = `${legFs}px Arial`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const maxX = pw - pR;
  categories.forEach((c) => {
    const txt = c.label;
    const itemW = 14 + ctx.measureText(txt).width + 16;
    if (legX + itemW > maxX) {
      legX = pL;
    }
    ctx.fillStyle = c.color;
    _rr(ctx, legX, legY - 5, 10, 10, 2);
    ctx.fill();
    ctx.fillStyle = "#404050";
    ctx.fillText(txt, legX + 14, legY);
    legX += itemW;
  });

  // Grid + Y labels
  ctx.strokeStyle = "#eef0f3";
  ctx.lineWidth = 0.8;
  ctx.fillStyle = "#a0a0a8";
  ctx.font = "10px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const v = (niceMax * i) / ySteps;
    const py = yToPx(v);
    ctx.beginPath();
    ctx.moveTo(pL, py);
    ctx.lineTo(pL + cW, py);
    ctx.stroke();
    ctx.fillText(String(Math.round(v)), pL - 4, py);
  }

  // Barras
  const groupW = cW / buckets.length;
  const bW = Math.min(groupW * 0.6, 40);

  buckets.forEach((b, gi) => {
    const cxp = pL + groupW * gi + groupW / 2;
    let yCursor = pT + cH;
    let totalThis = 0;
    categories.forEach((c) => {
      const v = b.counts[c.key] || 0;
      if (v <= 0) return;
      const segH = (v / niceMax) * cH;
      const yy = yCursor - segH;
      const grad = ctx.createLinearGradient(0, yy, 0, yy + segH);
      grad.addColorStop(0, _lighten(c.color, 0.18));
      grad.addColorStop(1, c.color);
      ctx.fillStyle = grad;
      ctx.fillRect(cxp - bW / 2, yy, bW, segH);
      yCursor = yy;
      totalThis += v;
    });

    // Label X
    ctx.fillStyle = "#787880";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(b.label, cxp, pT + cH + 6);

    // Total acima
    if (totalThis > 0) {
      ctx.fillStyle = "#404050";
      ctx.font = "bold 10px Arial";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(String(totalThis), cxp, yCursor - 4);
    }
  });

  return cvs.toDataURL("image/jpeg", 0.9);
};

// ──────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────
export interface ReportData {
  clientName: string;
  clientEmail?: string;
  cpf?: string;
  profession?: string;
  risk: string;
  riskLabel: string;
  riskDescription: string;
  savingsRate: number;
  debtRatio: number;
  expenseRatio: number;
  totalIncome: number;
  totalExpenses: number;
  totalDebts: number;
  monthlyDebtPayments: number;
  totalAssets: number;
  netWorth: number;
  netCashFlow: number;
  incomes: Array<{ description: string; amount: number; frequency?: string; is_primary?: boolean }>;
  expensesByCategory: Array<{ category: string; amount: number; percentage: number }>;
  debts: Array<{ type: string; creditor?: string; total_amount?: number; monthly_payment?: number; interest_rate?: number; remaining_months?: number }>;
  assets: Array<{ type: string; description?: string; estimated_value?: number }>;
  insurance: Array<{ type: string; provider?: string; monthly_premium?: number; coverage_amount?: number }>;
  goals: Array<{ description: string; priority?: string; target_amount?: number; deadline?: string; pct: number; tasksDone: number; tasksTotal: number }>;
  actionItems: Array<{ title: string; status?: string; priority?: string; financial_impact?: number; deadline?: string }>;
  totalImpact: number;
  completedActions: number;
  totalActions: number;
  planPct: number;
  snapshots?: Array<{ snapshot_date: string; total_assets?: number; total_debts?: number; savings_rate?: number }>;
  parecerMetas?: Array<{
    sourceLabel: string;
    sourceTable: string;
    metaValor?: number;
    metaText?: string;
    prazo?: string;
    latestValor?: number;
    latestEstado?: string;
    progressPct?: number;
    history?: Array<{ date: string; valor: number | null; pct: number | null; estado: string | null }>;
    totalLancamentos?: number;
  }>;
  monthlyClosings?: Array<{
    date: string;
    totalAssets?: number;
    totalDebts?: number;
    savingsRate?: number;
    metas: Array<{ label: string; valor?: number; estado?: string; pct?: number }>;
  }>;
  // V9: plano aplicado e variantes geradas pela IA
  activePlan?: {
    objective: string | null;
    appliedVariant: string | null;
    appliedAt: string | null;
    variants: Array<{
      letter: "A" | "B" | "C";
      title: string;
      approach: string;
      horizon_months: number;
      monthly_impact: number;
      actions: Array<{
        area: string;
        description: string;
        objective: string;
        financial_impact: number;
        deadline_offset_days: number;
      }>;
    }> | null;
  } | null;
  goalsAnalysisComment?: string;
  consultants?: Array<{ name: string; role?: string; certs?: string }>;
  parecer?: { title: string; content: string };
  periodLabel?: string;
}

// ──────────────────────────────────────────────────────────
// Paleta (RGB para jsPDF)
// ──────────────────────────────────────────────────────────
const C = {
  primary: [30, 58, 95] as [number, number, number],          // azul Novare
  primaryLight: [99, 140, 192] as [number, number, number],
  accent: [217, 119, 87] as [number, number, number],         // terracota
  text: [30, 30, 35] as [number, number, number],
  muted: [120, 120, 130] as [number, number, number],
  border: [228, 228, 232] as [number, number, number],
  bgSoft: [248, 248, 250] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  warning: [217, 119, 6] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const RISK_COLORS: Record<string, [number, number, number]> = {
  A: C.success,
  B: [37, 99, 235],
  C: C.warning,
  D: [234, 88, 12],
  E: C.danger,
};

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
const fmt = (v: number) =>
  `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${(v || 0).toFixed(1)}%`;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Converte HTML simples (parecer do consultor) em blocos de texto
const htmlToBlocks = (html: string): Array<{ bullet: boolean; text: string }> => {
  const MARK = "@@BULLET@@";
  let s = (html || "").replace(/\r/g, "");
  s = s.replace(/<\/(p|div|h[1-6])>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, MARK).replace(/<\/li>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&hellip;/g, "...");
  const blocks: Array<{ bullet: boolean; text: string }> = [];
  for (const raw of s.split(/\n/)) {
    const bullet = raw.includes(MARK);
    const text = raw.split(MARK).join("").replace(/\s+/g, " ").trim();
    if (text) blocks.push({ bullet, text });
  }
  return blocks;
};

// ──────────────────────────────────────────────────────────
// Geração
// ──────────────────────────────────────────────────────────
export async function generateReportPdf(data: ReportData): Promise<void> {
  // Senha = primeiros 4 dígitos do CPF (apenas dígitos)
  const cpfDigits = (data.cpf || "").replace(/\D/g, "");
  const pdfPassword = cpfDigits.slice(0, 4);
  const pdfOptions: any = { unit: "mm", format: "a4", orientation: "portrait" };
  if (pdfPassword.length === 4) {
    pdfOptions.encryption = {
      userPassword: pdfPassword,
      ownerPassword: pdfPassword,
      userPermissions: ["print", "copy"],
    };
  }
  const pdf = new jsPDF(pdfOptions);
  let y = 0;
  let pageNumber = 1;
  let sectionNum = 0;

  // Carrega logos (silenciosamente em caso de erro)
  let logoWhite: { dataUrl: string; w: number; h: number } | null = null;
  let logoBlack: { dataUrl: string; w: number; h: number } | null = null;
  try {
    [logoWhite, logoBlack] = await Promise.all([
      loadImageAsDataUrl(logoBranca),
      loadImageAsDataUrl(logoPreta),
    ]);
  } catch (e) {
    console.warn("Falha ao carregar logo do PDF:", e);
  }
  // logoBlack disponível para uso futuro
  void logoBlack;

  // ─── Helpers internos ────────────────────────────────
  const HEADER_H = 13;
  const addHeader = () => {
    pdf.setFillColor(...C.primary);
    pdf.rect(0, 0, PAGE_W, HEADER_H, "F");
    // Logo branca no header (maior)
    if (logoWhite) {
      const ratio = logoWhite.w / logoWhite.h;
      const h = 8.5;
      const w = h * ratio;
      try { pdf.addImage(logoWhite.dataUrl, "PNG", MARGIN, (HEADER_H - h) / 2, w, h); } catch {}
    }
    // Nome do cliente fica SOMENTE na capa. No cabeçalho: título + mês de fechamento.
    pdf.setTextColor(...C.white);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("Relatório de Consultoria", PAGE_W / 2, HEADER_H / 2 + 1, { align: "center" });
    const period = data.periodLabel
      ? data.periodLabel.charAt(0).toUpperCase() + data.periodLabel.slice(1)
      : "";
    if (period) {
      pdf.setFontSize(7.5);
      pdf.setGState(pdf.GState({ opacity: 0.82 }));
      pdf.text(`Fechamento · ${period}`, PAGE_W - MARGIN, HEADER_H / 2 + 1, { align: "right" });
      pdf.setGState(pdf.GState({ opacity: 1 }));
    }
  };

  const addFooter = () => {
    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
    pdf.setTextColor(...C.muted);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      MARGIN,
      PAGE_H - 7
    );
    pdf.text(`Página ${pageNumber}`, PAGE_W - MARGIN, PAGE_H - 7, { align: "right" });
  };

  const newPage = () => {
    addFooter();
    pdf.addPage();
    pageNumber++;
    addHeader();
    y = 20;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - 18) newPage();
  };

  // keepWith = altura do 1º bloco de conteúdo que deve ficar junto do título
  // (evita título de seção sozinho no fim da página)
  const sectionHeader = (title: string, subtitle?: string, keepWith = 28) => {
    sectionNum++;
    ensureSpace(20 + keepWith);
    // Bullet com número
    pdf.setFillColor(...C.primary);
    pdf.roundedRect(MARGIN, y, 8, 8, 1.5, 1.5, "F");
    pdf.setTextColor(...C.white);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(String(sectionNum), MARGIN + 4, y + 5.7, { align: "center" });

    // Ícone temático entre o número e o título
    const iconName = ICON_BY_TITLE[title];
    let titleX = MARGIN + 12;
    if (iconName) {
      try {
        const ic = canvasIcon(iconName, "#1e3a5f");
        pdf.addImage(ic, "PNG", MARGIN + 11, y + 1, 6, 6);
        titleX = MARGIN + 19.5;
      } catch { /* ignora */ }
    }

    pdf.setTextColor(...C.text);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(title, titleX, y + 4);
    if (subtitle) {
      pdf.setTextColor(...C.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.text(subtitle, titleX, y + 8.5);
    }
    y += subtitle ? 14 : 11;

    // Linha separadora
    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
  };

  const paragraph = (text: string, size = 9.5, color: [number, number, number] = C.text) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, CONTENT_W);
    ensureSpace(lines.length * (size * 0.42));
    pdf.text(lines, MARGIN, y);
    y += lines.length * (size * 0.42) + 2;
  };

  // Cartões de KPI coloridos por "tom" (verde/azul/âmbar/vermelho/neutro)
  type KpiTone = "emerald" | "blue" | "amber" | "red" | "muted";
  const TONE: Record<KpiTone, { bg: [number, number, number]; text: [number, number, number]; border: [number, number, number] }> = {
    emerald: { bg: [236, 250, 242], text: C.success, border: [176, 224, 196] },
    blue: { bg: [235, 242, 252], text: [37, 99, 235], border: [178, 200, 236] },
    amber: { bg: [254, 248, 235], text: C.warning, border: [240, 216, 165] },
    red: { bg: [252, 236, 236], text: C.danger, border: [240, 185, 185] },
    muted: { bg: C.bgSoft, text: C.muted, border: C.border },
  };
  const drawKpiCards = (
    cards: Array<{ label: string; value: string; hint?: string; tone: KpiTone }>,
    cardH = 26
  ) => {
    const n = cards.length;
    if (n === 0) return;
    const gap = 4;
    const cw = (CONTENT_W - gap * (n - 1)) / n;
    ensureSpace(cardH + 4);
    cards.forEach((c, i) => {
      const cx = MARGIN + i * (cw + gap);
      const t = TONE[c.tone];
      pdf.setFillColor(...t.bg);
      pdf.setDrawColor(...t.border);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(cx, y, cw, cardH, 2, 2, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...C.muted);
      const lblLines = pdf.splitTextToSize(c.label.toUpperCase(), cw - 6).slice(0, 2);
      pdf.text(lblLines, cx + 4, y + 5);
      const lblH = lblLines.length * 3;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(...t.text);
      pdf.text(c.value, cx + 4, y + 6 + lblH + 4.5);
      if (c.hint) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.8);
        pdf.setTextColor(...C.muted);
        const hintLines = pdf.splitTextToSize(c.hint, cw - 6).slice(0, 2);
        pdf.text(hintLines, cx + 4, y + 6 + lblH + 9.5);
      }
    });
    y += cardH + 5;
  };

  // ═════════════ CAPA ═════════════
  pdf.setFillColor(...C.primary);
  pdf.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Detalhes decorativos
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.04 }));
  pdf.circle(PAGE_W - 20, 40, 60, "F");
  pdf.circle(20, PAGE_H - 60, 80, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));

  // Logo grande no topo da capa
  if (logoWhite) {
    const ratio = logoWhite.w / logoWhite.h;
    const h = 20;
    const w = h * ratio;
    try { pdf.addImage(logoWhite.dataUrl, "PNG", MARGIN, 26, w, h); } catch {}
  } else {
    pdf.setTextColor(...C.white);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("M É T O D O   N O V A R E", MARGIN, 50);
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(34);
  pdf.text("Relatório de", MARGIN, 95);
  pdf.text("Consultoria", MARGIN, 108);
  pdf.text("Financeira", MARGIN, 121);

  // Linha
  pdf.setDrawColor(...C.accent);
  pdf.setLineWidth(1);
  pdf.line(MARGIN, 132, MARGIN + 50, 132);

  // Dados do cliente
  const dy = 150;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.5 }));
  pdf.text("CLIENTE", MARGIN, dy);
  pdf.setGState(pdf.GState({ opacity: 1 }));
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(data.clientName, MARGIN, dy + 6);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setGState(pdf.GState({ opacity: 0.5 }));
  pdf.text("DATA DE EMISSÃO", MARGIN, dy + 18);
  pdf.setGState(pdf.GState({ opacity: 1 }));
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(
    new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
    MARGIN,
    dy + 24
  );

  if (data.profession) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setGState(pdf.GState({ opacity: 0.5 }));
    pdf.text("PROFISSÃO", MARGIN, dy + 36);
    pdf.setGState(pdf.GState({ opacity: 1 }));
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(data.profession, MARGIN, dy + 42);
  }

  if (data.cpf) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setGState(pdf.GState({ opacity: 0.5 }));
    pdf.text("CPF", MARGIN, dy + 54);
    pdf.setGState(pdf.GState({ opacity: 1 }));
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(data.cpf, MARGIN, dy + 60);
  }

  // Rodapé da capa
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setGState(pdf.GState({ opacity: 0.4 }));
  pdf.text("Documento confidencial · Para uso exclusivo do cliente", MARGIN, PAGE_H - 22);
  if (pdfPassword.length === 4) {
    pdf.text(`Protegido por senha · 4 primeiros dígitos do CPF`, MARGIN, PAGE_H - 17);
  }
  pdf.setGState(pdf.GState({ opacity: 1 }));

  // ═════════════ Páginas internas ═════════════
  newPage();

  // ── Carta de abertura
  {
    const firstName = data.clientName.trim().split(/\s+/)[0];
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(...C.primary);
    pdf.text(`Olá, ${firstName}.`, MARGIN, y);
    y += 7;
    paragraph(
      "Este relatório reúne o diagnóstico completo da sua vida financeira e o plano para os próximos meses. Mais do que números, ele mostra onde você está hoje, aonde quer chegar e o caminho para conseguir — com o acompanhamento da Novare ao seu lado.",
      9.5,
      C.text
    );
    y += 2;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...C.text);
    pdf.text("O que você vai encontrar neste relatório:", MARGIN, y);
    y += 5.5;
    const toc = [
      "Diagnóstico da sua saúde financeira e classificação de risco",
      "Balanço patrimonial, fluxo de caixa e mapa de dívidas",
      "Seus objetivos, plano de ação e projeção de ganhos",
      "Acompanhamento da evolução, mês a mês",
      "Parecer do consultor e cronograma dos próximos passos",
    ];
    toc.forEach((t) => {
      const lines = pdf.splitTextToSize(t, CONTENT_W - 8);
      ensureSpace(lines.length * 4 + 1);
      pdf.setFillColor(...C.accent);
      pdf.circle(MARGIN + 2, y - 1.2, 0.9, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...C.text);
      pdf.text(lines, MARGIN + 6, y);
      y += lines.length * 4 + 1.5;
    });
    y += 4;
    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 7;
  }

  // ── 1. Metodologia
  sectionHeader("Método Novare", "Nossa abordagem em 5 etapas");
  paragraph(
    "O Método Novare é uma abordagem estruturada para organização, clareza e direção financeira, desenvolvida para oferecer resultados mensuráveis em cada etapa do processo."
  );
  y += 2;

  const steps = [
    { n: "1", title: "Mapear", desc: "Coleta estruturada" },
    { n: "2", title: "Diagnosticar", desc: "Análise completa" },
    { n: "3", title: "Planejar", desc: "Plano personalizado" },
    { n: "4", title: "Implementar", desc: "Execução assistida" },
    { n: "5", title: "Acompanhar", desc: "Monitoramento contínuo" },
  ];
  const stepW = (CONTENT_W - 4 * 2) / 5;
  ensureSpace(28);
  steps.forEach((s, i) => {
    const sx = MARGIN + i * (stepW + 2);
    pdf.setFillColor(...C.bgSoft);
    pdf.roundedRect(sx, y, stepW, 26, 2, 2, "F");
    pdf.setFillColor(...C.accent);
    pdf.roundedRect(sx + stepW / 2 - 4, y + 3, 8, 8, 1.5, 1.5, "F");
    pdf.setTextColor(...C.white);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(s.n, sx + stepW / 2, y + 8.7, { align: "center" });
    pdf.setTextColor(...C.text);
    pdf.setFontSize(8.5);
    pdf.text(s.title, sx + stepW / 2, y + 16, { align: "center" });
    pdf.setTextColor(...C.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.text(s.desc, sx + stepW / 2, y + 21, { align: "center" });
  });
  y += 32;

  // ── 2. Classificação de Risco
  sectionHeader("Classificação de Risco", "Saúde financeira baseada na capacidade de poupança", 42);
  const riskColor = RISK_COLORS[data.risk] || C.warning;

  // Card principal com letra de risco + descrição
  ensureSpace(40);
  pdf.setFillColor(...C.bgSoft);
  pdf.roundedRect(MARGIN, y, CONTENT_W, 36, 2, 2, "F");

  // Letra grande
  pdf.setFillColor(...riskColor);
  pdf.roundedRect(MARGIN + 4, y + 4, 28, 28, 2, 2, "F");
  pdf.setTextColor(...C.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.text(data.risk, MARGIN + 18, y + 22, { align: "center" });
  pdf.setFontSize(7);
  pdf.text(data.riskLabel.toUpperCase(), MARGIN + 18, y + 28, { align: "center" });

  // Descrição + métricas ao lado
  pdf.setTextColor(...C.text);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const desc = pdf.splitTextToSize(data.riskDescription, CONTENT_W - 50);
  pdf.text(desc, MARGIN + 38, y + 9);

  const metrics = [
    { l: "Poupança", v: fmtPct(data.savingsRate), c: riskColor },
    { l: "Comprometimento", v: fmtPct(data.debtRatio), c: data.debtRatio > 30 ? C.danger : C.text },
    { l: "Despesas/Renda", v: fmtPct(data.expenseRatio), c: data.expenseRatio > 80 ? C.warning : C.text },
  ];
  const mw = (CONTENT_W - 42) / 3;
  metrics.forEach((m, i) => {
    const mx = MARGIN + 38 + i * mw;
    pdf.setTextColor(...C.muted);
    pdf.setFontSize(6.5);
    pdf.text(m.l.toUpperCase(), mx, y + 25);
    pdf.setTextColor(...m.c);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(m.v, mx, y + 31);
  });
  y += 42;

  // Gráficos: Gauge + Composição da Renda lado a lado
  {
    const halfW = (CONTENT_W - 4) / 2;
    const blockH = 56;
    ensureSpace(blockH + 4);

    // Gauge à esquerda
    const gaugeImg = canvasGauge(data.risk, 520, 320);
    pdf.addImage(gaugeImg, "PNG", MARGIN, y, halfW, blockH);

    // Composição da Renda à direita (rosca)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...C.text);
    pdf.text("Composição da Renda", MARGIN + halfW + 4, y + 2);
    const savings = Math.max(0, data.totalIncome * (data.savingsRate / 100));
    const expensesTot = data.totalExpenses + data.monthlyDebtPayments;
    const outros = Math.max(0, data.totalIncome - expensesTot - savings);
    const rendaImg = canvasPie(
      [
        { label: "Despesas", value: expensesTot, color: "#dc2626" },
        { label: "Poupança", value: savings, color: "#16a34a" },
        { label: "Outros", value: outros, color: "#a0a0a8" },
      ],
      820, Math.round(820 * (blockH / halfW)),
      {
        centerTop: `R$ ${_compact(data.totalIncome)}`,
        centerBottom: "renda",
        fmtVal: (v) => `R$ ${_compact(v)}`,
      }
    );
    pdf.addImage(rendaImg, "PNG", MARGIN + halfW + 4, y + 3, halfW, blockH - 3);

    y += blockH + 4;
  }

  // Por que este nível? — explicação consultiva em tópicos
  {
    const sr = data.savingsRate, dr = data.debtRatio, er = data.expenseRatio;
    type Verdict = true | "warn" | false;
    const bullets: Array<{ ok: Verdict; title: string; text: string }> = [
      {
        ok: sr >= 20 ? true : sr >= 10 ? "warn" : false,
        title: `Taxa de poupança: ${fmtPct(sr)}`,
        text: sr >= 20
          ? "Acima do recomendado (20%). Excelente capacidade de transformar renda em patrimônio."
          : sr >= 10
            ? "Positiva, mas abaixo do ideal de 20%. Há espaço para acelerar a construção de reserva."
            : "Abaixo do ideal de 20%. Sobra pouco no fim do mês para investir e proteger o futuro.",
      },
      {
        ok: dr <= 30 ? true : dr <= 40 ? "warn" : false,
        title: `Comprometimento com dívidas: ${fmtPct(dr)}`,
        text: dr <= 30
          ? "Dentro da faixa saudável (até 30% da renda). As parcelas cabem no orçamento."
          : dr <= 40
            ? "Pouco acima do limite saudável de 30%. Vale priorizar a quitação das dívidas mais caras."
            : "Acima do limite de 30%. As parcelas pressionam o orçamento e limitam a poupança.",
      },
      {
        ok: er <= 70 ? true : er <= 85 ? "warn" : false,
        title: `Despesas sobre a renda: ${fmtPct(er)}`,
        text: er <= 70
          ? "Controladas (até 70% da renda), deixando margem para metas e imprevistos."
          : er <= 85
            ? "Elevadas: consomem boa parte da renda. Revisar gastos libera dinheiro para os objetivos."
            : "Muito altas: quase toda a renda é consumida, exigindo ajuste imediato no orçamento.",
      },
    ];

    ensureSpace(20 + bullets.length * 13);
    pdf.setFillColor(...C.bgSoft);
    const boxLines = bullets.map((b) => pdf.splitTextToSize(b.text, CONTENT_W - 14).length);
    const boxH = 13 + bullets.reduce((s, _b, i) => s + 6 + boxLines[i] * 3.5 + 2, 0);
    pdf.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, "F");
    let by = y + 7;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...C.text);
    pdf.text(`Por que você está no nível ${data.risk} (${data.riskLabel})?`, MARGIN + 5, by);
    by += 6;

    bullets.forEach((b, i) => {
      const col: [number, number, number] = b.ok === true ? C.success : b.ok === "warn" ? C.warning : C.danger;
      pdf.setFillColor(...col);
      pdf.circle(MARGIN + 6.5, by + 1, 1.3, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.8);
      pdf.setTextColor(...C.text);
      pdf.text(b.title, MARGIN + 10, by + 2);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...C.muted);
      const lines = pdf.splitTextToSize(b.text, CONTENT_W - 18);
      pdf.text(lines, MARGIN + 10, by + 6);
      by += 6 + boxLines[i] * 3.5 + 2;
    });
    y += boxH + 4;
  }

  // ── 3. Balanço Patrimonial
  sectionHeader("Balanço Patrimonial", "Visão consolidada de ativos e passivos");
  paragraph(
    "O balanço mostra tudo o que você tem (ativos) menos tudo o que você deve (passivos). O resultado é o seu patrimônio líquido — o melhor termômetro da sua evolução financeira ao longo do tempo.",
    9,
    C.muted
  );
  ensureSpace(28);
  const cards = [
    { label: "Ativos Totais", value: fmt(data.totalAssets), color: [37, 99, 235] as [number, number, number] },
    { label: "Passivos Totais", value: fmt(data.totalDebts), color: C.danger },
    { label: "Patrimônio Líquido", value: fmt(data.netWorth), color: data.netWorth >= 0 ? C.success : C.danger },
  ];
  const cw = (CONTENT_W - 4 * 2) / 3;
  cards.forEach((c, i) => {
    const cx = MARGIN + i * (cw + 2);
    pdf.setFillColor(...C.white);
    pdf.setDrawColor(...C.border);
    pdf.roundedRect(cx, y, cw, 22, 2, 2, "FD");
    pdf.setFillColor(...c.color);
    pdf.rect(cx, y, 1.5, 22, "F");
    pdf.setTextColor(...C.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(c.label.toUpperCase(), cx + 5, y + 7);
    pdf.setTextColor(...c.color);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(c.value, cx + 5, y + 15);
  });
  y += 28;

  // ── Indicadores Patrimoniais (mesmas métricas do painel)
  {
    const monthlyOutflow = data.totalExpenses + data.monthlyDebtPayments;
    const annualIncome = data.totalIncome * 12;
    const liquidRegex = /poupanc|conta|cdb|tesouro|cdi|caixa|aplicac|renda fixa|fundo|liquid/i;
    const investRegex = /investiment|acao|ação|bolsa|fii|etf|cripto|previd/i;
    const realEstateRegex = /imove|imóvel|casa|apartamento|terreno|sala/i;
    const vehicleRegex = /carro|moto|veicul|veículo|caminh/i;
    let liquidValue = 0, investValue = 0, realEstateValue = 0, vehicleValue = 0, otherValue = 0;
    data.assets.forEach((a) => {
      const v = a.estimated_value || 0;
      const key = `${a.type || ""} ${a.description || ""}`;
      if (liquidRegex.test(key)) liquidValue += v;
      else if (investRegex.test(key)) investValue += v;
      else if (realEstateRegex.test(key)) realEstateValue += v;
      else if (vehicleRegex.test(key)) vehicleValue += v;
      else otherValue += v;
    });
    const liquidityMonths = monthlyOutflow > 0 ? liquidValue / monthlyOutflow : 0;
    const leverage = data.totalAssets > 0 ? (data.totalDebts / data.totalAssets) * 100 : 0;
    const pwYears = annualIncome > 0 ? data.netWorth / annualIncome : 0;
    const liquidPct = data.totalAssets > 0 ? ((liquidValue + investValue) / data.totalAssets) * 100 : 0;

    ensureSpace(10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...C.text);
    pdf.text("Indicadores patrimoniais", MARGIN, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.muted);
    pdf.text("Saúde estrutural do patrimônio: solvência, liquidez e ritmo de acumulação.", MARGIN, y + 4);
    y += 8;

    drawKpiCards([
      {
        label: "Reserva de emergência",
        value: liquidValue > 0 && monthlyOutflow > 0 ? `${liquidityMonths.toFixed(1)}m` : "—",
        hint: liquidityMonths >= 6 ? "Cobertura saudável (>= 6 meses)" : liquidityMonths >= 3 ? "Construir até 6 meses" : "Insuficiente — meta mínima 3 meses",
        tone: liquidValue > 0 && liquidityMonths >= 6 ? "emerald" : liquidityMonths >= 3 ? "amber" : "red",
      },
      {
        label: "Alavancagem",
        value: data.totalAssets > 0 ? fmtPct(leverage) : "—",
        hint: leverage <= 30 ? "Endividamento saudável" : leverage <= 50 ? "Atenção — meta abaixo de 30%" : "Elevado — priorizar quitação",
        tone: leverage <= 30 ? "emerald" : leverage <= 50 ? "amber" : "red",
      },
      {
        label: "Patrimônio x Renda anual",
        value: annualIncome > 0 ? `${pwYears.toFixed(1)}x` : "—",
        hint: pwYears >= 3 ? "Trajetória sólida de acumulação" : pwYears >= 1 ? "Em construção — manter aporte" : "Acelerar acumulação patrimonial",
        tone: pwYears >= 3 ? "emerald" : pwYears >= 1 ? "blue" : "amber",
      },
      {
        label: "Liquidez do patrimônio",
        value: data.totalAssets > 0 ? fmtPct(liquidPct) : "—",
        hint: liquidPct >= 30 ? "Boa proporção líquida/investida" : liquidPct >= 15 ? "Aumentar parcela investida" : "Patrimônio muito imobilizado",
        tone: liquidPct >= 30 ? "emerald" : liquidPct >= 15 ? "amber" : "red",
      },
    ]);

    // Qualidade do patrimônio — barra de composição
    const hx = (h: string): [number, number, number] => {
      const s = h.replace("#", "");
      return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    };
    const comp = [
      { label: "Líquido", value: liquidValue, color: "#2563eb" },
      { label: "Investido", value: investValue, color: "#16a34a" },
      { label: "Imóveis", value: realEstateValue, color: "#7c3aed" },
      { label: "Veículos", value: vehicleValue, color: "#ea580c" },
      { label: "Outros", value: otherValue, color: "#64748b" },
    ].filter((c) => c.value > 0);
    const compTotal = comp.reduce((s, c) => s + c.value, 0);
    if (compTotal > 0) {
      const legRows = Math.ceil(comp.length / 4);
      ensureSpace(12 + legRows * 6);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(...C.muted);
      pdf.text("QUALIDADE DO PATRIMÔNIO", MARGIN, y);
      y += 3;
      const barH = 4;
      let bx = MARGIN;
      comp.forEach((c) => {
        const w = (c.value / compTotal) * CONTENT_W;
        pdf.setFillColor(...hx(c.color));
        pdf.rect(bx, y, w, barH, "F");
        bx += w;
      });
      y += barH + 5;
      const legCols = Math.min(comp.length, 4);
      const legW = CONTENT_W / legCols;
      comp.forEach((c, i) => {
        const col = i % legCols, row = Math.floor(i / legCols);
        const lx = MARGIN + col * legW, ly = y + row * 6;
        pdf.setFillColor(...hx(c.color));
        pdf.circle(lx + 1.5, ly - 1, 1.2, "F");
        const pct = Math.round((c.value / compTotal) * 100);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...C.text);
        pdf.text(`${c.label}: ${pct}% · ${fmt(c.value)}`, lx + 4, ly);
      });
      y += legRows * 6 + 2;
    }
  }

  if (data.assets.length > 0) {
    autoTable(pdf, {
      startY: y,
      head: [["Tipo", "Descrição", "Valor"]],
      body: data.assets.map((a) => [
        (a.type || "").charAt(0).toUpperCase() + (a.type || "").slice(1),
        a.description || "—",
        fmt(a.estimated_value || 0),
      ]),
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2.5, textColor: C.text },
      headStyles: { fillColor: C.bgSoft, textColor: C.muted, fontSize: 7.5, fontStyle: "bold" },
      columnStyles: { 2: { halign: "right", fontStyle: "bold" } },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 4;

    // Gráfico de barras horizontais — composição de ativos
    if (data.assets.length >= 2) {
      const assetBars = data.assets
        .filter((a) => (a.estimated_value || 0) > 0)
        .sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0))
        .slice(0, 8)
        .map((a, i) => ({
          label: a.description || a.type || "Ativo",
          value: a.estimated_value || 0,
          color: CP[i % CP.length],
        }));
      if (assetBars.length >= 2) {
        const chartH = 62;
        ensureSpace(chartH + 12);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9.5);
        pdf.setTextColor(...C.text);
        pdf.text("Composição do Patrimônio", MARGIN, y);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...C.muted);
        pdf.text("Como seus ativos estão distribuídos hoje", MARGIN, y + 4);
        const img = canvasPie(assetBars, 1300, Math.round(1300 * chartH / CONTENT_W), {
          centerTop: `R$ ${_compact(data.totalAssets)}`,
          centerBottom: "em ativos",
          fmtVal: (v) => `R$ ${_compact(v)}`,
        });
        pdf.addImage(img, "PNG", MARGIN, y + 6, CONTENT_W, chartH);
        y += chartH + 8;
      }
    }
  }

  // ── 4. Fluxo de Caixa
  sectionHeader("Fluxo de Caixa Mensal", "Receitas, despesas e saldo líquido");

  // Receitas
  if (data.incomes.length > 0) {
    autoTable(pdf, {
      startY: y,
      head: [[{ content: "Receitas", colSpan: 2, styles: { halign: "left", textColor: C.success, fontSize: 9.5 } }]],
      body: [
        ...data.incomes.map((i) => [
          i.description + (i.is_primary ? "  (principal)" : ""),
          fmt(i.frequency === "anual" ? (i.amount || 0) / 12 : i.amount || 0),
        ]),
        [{ content: "Total Receitas", styles: { fontStyle: "bold" } }, { content: fmt(data.totalIncome), styles: { fontStyle: "bold", textColor: C.success } }],
      ],
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2.2 },
      headStyles: { fillColor: C.bgSoft },
      columnStyles: { 1: { halign: "right" } },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 4;
  }

  // Despesas
  if (data.expensesByCategory.length > 0) {
    autoTable(pdf, {
      startY: y,
      head: [[{ content: "Despesas por categoria", colSpan: 3, styles: { halign: "left", textColor: C.danger, fontSize: 9.5 } }]],
      body: [
        ...data.expensesByCategory.map((e) => [e.category, `${e.percentage}%`, fmt(e.amount)]),
        ...(data.monthlyDebtPayments > 0
          ? [["Parcelas de dívidas", "—", fmt(data.monthlyDebtPayments)]]
          : []),
        [
          { content: "Total Saídas", styles: { fontStyle: "bold" } },
          "",
          { content: fmt(data.totalExpenses + data.monthlyDebtPayments), styles: { fontStyle: "bold", textColor: C.danger } },
        ],
      ],
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2.2 },
      headStyles: { fillColor: C.bgSoft },
      columnStyles: { 1: { halign: "right", textColor: C.muted, cellWidth: 20 }, 2: { halign: "right" } },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 4;
  }

  // Saldo líquido
  ensureSpace(20);
  const saldoColor = data.netCashFlow >= 0 ? C.success : C.danger;
  pdf.setFillColor(...C.bgSoft);
  pdf.roundedRect(MARGIN, y, CONTENT_W, 16, 2, 2, "F");
  pdf.setFillColor(...saldoColor);
  pdf.rect(MARGIN, y, 1.5, 16, "F");
  pdf.setTextColor(...C.text);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Saldo Líquido Mensal", MARGIN + 5, y + 7);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...C.muted);
  pdf.text("Receitas - Despesas - Parcelas", MARGIN + 5, y + 12);
  pdf.setTextColor(...saldoColor);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(
    `${data.netCashFlow >= 0 ? "+" : ""}${fmt(data.netCashFlow)}`,
    PAGE_W - MARGIN - 3,
    y + 11,
    { align: "right" }
  );
  y += 22;

  // Gráficos do fluxo de caixa — rosca "uso da renda" + donut de despesas
  {
    const halfW = (CONTENT_W - 6) / 2;
    const chartH = 66;
    // Reserva títulos + roscas + caption juntos (evita separar de página)
    ensureSpace(chartH + 26);

    // Títulos das duas roscas
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...C.text);
    pdf.text("Para onde vai sua renda", MARGIN, y);
    pdf.text("Despesas por categoria", MARGIN + halfW + 6, y);
    const py = y + 4;

    const saidas = data.totalExpenses + data.monthlyDebtPayments;
    const sobra = Math.max(data.netCashFlow, 0);
    const sobraPct = data.totalIncome > 0 ? Math.round((sobra / data.totalIncome) * 100) : 0;

    // Rosca "uso da renda" à esquerda (Saídas vs Sobra)
    const usoImg = canvasPie(
      [
        { label: "Saídas", value: saidas, color: "#dc2626" },
        { label: "Sobra", value: sobra, color: data.netCashFlow >= 0 ? "#16a34a" : "#d97706" },
      ],
      900, Math.round(900 * (chartH / halfW)),
      { centerTop: `${sobraPct}%`, centerBottom: "sobra", fmtVal: (v) => `R$ ${_compact(v)}` }
    );
    pdf.addImage(usoImg, "PNG", MARGIN, py, halfW, chartH);

    // Donut de despesas à direita
    if (data.expensesByCategory.length >= 2) {
      const donutImg = canvasDonut(
        data.expensesByCategory.map((e) => ({ label: e.category, value: e.amount })),
        900, Math.round(900 * (chartH / halfW))
      );
      pdf.addImage(donutImg, "PNG", MARGIN + halfW + 6, py, halfW, chartH);
    }

    y = py + chartH + 4;

    // Caption explicativo (mantido junto das roscas pela reserva acima)
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...C.muted);
    const usoMsg = data.netCashFlow >= 0
      ? `Neste mês, ${sobraPct}% da sua renda sobrou após despesas e parcelas — esse é o combustível das suas metas.`
      : `As saídas superaram a renda neste mês. A prioridade imediata é reequilibrar o fluxo de caixa.`;
    pdf.text(pdf.splitTextToSize(usoMsg, CONTENT_W), MARGIN, y);
    y += 8;
  }


  // ── 5. Mapa de Dívidas
  if (data.debts.length > 0) {
    sectionHeader("Mapa de Dívidas", `${data.debts.length} dívida${data.debts.length !== 1 ? "s" : ""} ativa${data.debts.length !== 1 ? "s" : ""}`);
    paragraph(
      "Mapeamos cada dívida com saldo, parcela e prazo. A estratégia é priorizar a quitação das mais caras (maiores juros) para liberar a sua renda mais rápido.",
      9,
      C.muted
    );

    const highInterest = data.debts.filter((d) => (d.interest_rate || 0) > 5).length;
    const shortTerm = data.debts.filter((d) => d.remaining_months != null && d.remaining_months <= 12).length;
    const debtCommit = data.totalIncome > 0 ? (data.monthlyDebtPayments / data.totalIncome) * 100 : 0;
    drawKpiCards([
      { label: "Total devedor", value: fmt(data.totalDebts), hint: `${data.debts.length} dívida${data.debts.length !== 1 ? "s" : ""} ativa${data.debts.length !== 1 ? "s" : ""}`, tone: "red" },
      { label: "Parcela mensal", value: fmt(data.monthlyDebtPayments), hint: `${fmtPct(debtCommit)} da sua renda`, tone: debtCommit > 30 ? "red" : debtCommit > 20 ? "amber" : "emerald" },
      { label: "Juros > 5% a.m.", value: String(highInterest), hint: highInterest > 0 ? "Priorizar quitação" : "Custo financeiro controlado", tone: highInterest > 0 ? "red" : "amber" },
      { label: "Curto prazo (<=12m)", value: String(shortTerm), hint: shortTerm > 0 ? `${shortTerm} quita${shortTerm !== 1 ? "m" : ""} em até 1 ano` : "Todas de médio/longo prazo", tone: "blue" },
    ]);

    autoTable(pdf, {
      startY: y,
      head: [["Tipo", "Credor", "Saldo", "Parcela", "Juros", "Prazo"]],
      body: [
        ...data.debts.map((d) => [
          (d.type || "").charAt(0).toUpperCase() + (d.type || "").slice(1),
          d.creditor || "—",
          fmt(d.total_amount || 0),
          fmt(d.monthly_payment || 0),
          d.interest_rate ? `${d.interest_rate}% a.m.` : "—",
          d.remaining_months ? `${d.remaining_months} m` : "—",
        ]),
        [
          { content: "Total", colSpan: 2, styles: { fontStyle: "bold" } },
          { content: fmt(data.totalDebts), styles: { fontStyle: "bold" } },
          { content: fmt(data.monthlyDebtPayments), styles: { fontStyle: "bold" } },
          "",
          "",
        ],
      ],
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 7.5 },
      alternateRowStyles: { fillColor: C.bgSoft },
      columnStyles: {
        0: { cellWidth: 34 },
        1: { cellWidth: 36 },
        2: { halign: "right", cellWidth: 28 },
        3: { halign: "right", cellWidth: 26 },
        4: { halign: "right", cellWidth: 22 },
        5: { halign: "right", cellWidth: "auto" },
      },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;

    // Composição das dívidas + análise da consultoria
    {
      const sorted = [...data.debts].sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
      const biggest = sorted[0];
      const biggestPct = data.totalDebts > 0 ? Math.round(((biggest.total_amount || 0) / data.totalDebts) * 100) : 0;
      const halfW = (CONTENT_W - 6) / 2;
      const chartH = 48;
      ensureSpace(chartH + 10);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...C.text);
      pdf.text("Composição das dívidas", MARGIN, y);
      pdf.text("Análise da consultoria", MARGIN + halfW + 6, y);
      const py = y + 4;

      const debtPie = sorted.slice(0, 6).map((d, i) => ({ label: d.type || "Dívida", value: d.total_amount || 0, color: CP[i % CP.length] }));
      const dImg = canvasPie(debtPie, 820, Math.round(820 * (chartH / halfW)), {
        centerTop: `R$ ${_compact(data.totalDebts)}`,
        centerBottom: "em dívidas",
        fmtVal: (v) => `R$ ${_compact(v)}`,
      });
      pdf.addImage(dImg, "PNG", MARGIN, py, halfW, chartH);

      const ax = MARGIN + halfW + 6;
      pdf.setFillColor(...C.bgSoft);
      pdf.roundedRect(ax, py, halfW, chartH, 2, 2, "F");
      const insights = [
        `Sua maior dívida é "${biggest.type || "—"}" (${biggestPct}% do saldo total).`,
        debtCommit > 30
          ? `As parcelas comprometem ${fmtPct(debtCommit)} da renda — acima do saudável (30%).`
          : `As parcelas comprometem ${fmtPct(debtCommit)} da renda, dentro do saudável.`,
        highInterest > 0
          ? `Há ${highInterest} dívida${highInterest !== 1 ? "s" : ""} com juros altos (> 5% a.m.) — foco de quitação.`
          : `Quitar primeiro as de maior parcela acelera a liberação da sua renda.`,
      ];
      let iy = py + 6;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.8);
      insights.forEach((t) => {
        const lines = pdf.splitTextToSize(t, halfW - 12);
        pdf.setFillColor(...C.accent);
        pdf.circle(ax + 5, iy - 1.2, 0.8, "F");
        pdf.setTextColor(...C.muted);
        pdf.text(lines, ax + 8, iy);
        iy += lines.length * 3.4 + 2.5;
      });
      y = py + chartH + 6;
    }
  }

  // ── 6. Proteção e Seguros
  if (data.insurance.length > 0) {
    sectionHeader("Proteção e Seguros", "Cobertura de riscos e seguros ativos");
    paragraph(
      "Seguros protegem seu patrimônio e sua família de imprevistos que poderiam comprometer todo o planejamento. Abaixo, as coberturas ativas que avaliamos no seu diagnóstico.",
      9,
      C.muted
    );

    const totalPremium = data.insurance.reduce((s, i) => s + (i.monthly_premium || 0), 0);
    const totalCoverage = data.insurance.reduce((s, i) => s + (i.coverage_amount || 0), 0);
    const lifeRegex = /vida|life|familiar/i;
    const hasLife = data.insurance.some((i) => lifeRegex.test(i.type || "") && (i.coverage_amount || 0) > 0);
    drawKpiCards([
      { label: "Prêmio mensal total", value: fmt(totalPremium), hint: `${data.insurance.length} apólice${data.insurance.length !== 1 ? "s" : ""} ativa${data.insurance.length !== 1 ? "s" : ""}`, tone: "blue" },
      { label: "Cobertura total", value: fmt(totalCoverage), hint: "Soma das indenizações contratadas", tone: totalCoverage > 0 ? "emerald" : "red" },
      { label: "Cobertura de vida", value: hasLife ? "Sim" : "Não", hint: hasLife ? "Família protegida" : "Lacuna importante a cobrir", tone: hasLife ? "emerald" : "red" },
    ]);

    autoTable(pdf, {
      startY: y,
      head: [["Tipo", "Seguradora", "Prêmio Mensal", "Cobertura"]],
      body: data.insurance.map((i) => [
        i.type,
        i.provider || "—",
        fmt(i.monthly_premium || 0),
        fmt(i.coverage_amount || 0),
      ]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 8 },
      alternateRowStyles: { fillColor: C.bgSoft },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 5;

    // Análise da cobertura
    const annualIncomeSeg = data.totalIncome * 12;
    const idealLife = annualIncomeSeg * 5;
    const segMsg = !hasLife
      ? `Atenção: você não possui cobertura de vida ativa. Em caso de imprevisto, sua família ficaria desprotegida — é a proteção mais importante a contratar (referência: ~5x a renda anual, cerca de ${fmt(idealLife)}).`
      : totalCoverage < idealLife
        ? `Você tem proteção de vida, mas a cobertura (${fmt(totalCoverage)}) está abaixo da referência de ~5x a renda anual (${fmt(idealLife)}). Vale reavaliar o valor segurado.`
        : `Sua cobertura está adequada ao seu momento de vida. Mantenha as apólices em dia e revise os valores a cada ano.`;
    // Define a fonte ANTES de medir/quebrar o texto (evita overflow)
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.2);
    const segLines = pdf.splitTextToSize(segMsg, CONTENT_W - 12);
    const segBoxH = segLines.length * 3.8 + 7;
    ensureSpace(segBoxH + 4);
    pdf.setFillColor(...(hasLife ? C.bgSoft : ([252, 236, 236] as [number, number, number])));
    pdf.roundedRect(MARGIN, y, CONTENT_W, segBoxH, 2, 2, "F");
    pdf.setFillColor(...(hasLife ? C.success : C.danger));
    pdf.roundedRect(MARGIN, y, 2, segBoxH, 2, 2, "F");
    pdf.rect(MARGIN + 1, y, 1, segBoxH, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.2);
    pdf.setTextColor(...C.text);
    pdf.text(segLines, MARGIN + 6, y + 5);
    y += segBoxH + 6;
  }

  // ── 7. Objetivos Financeiros
  if (data.goals.length > 0) {
    sectionHeader(
      "Objetivos Financeiros",
      `${data.goals.length} objetivo${data.goals.length !== 1 ? "s" : ""} • Progresso: ${data.planPct}%`
    );

    paragraph(
      "Seus objetivos são o destino do plano financeiro. Acompanhamos cada um por valor-alvo, prazo e progresso, sinalizando o que está no rumo certo e o que merece atenção.",
      9,
      C.muted
    );
    y += 1;

    // Visão analítica — dois gráficos lado a lado (situação + valor-alvo)
    {
      const t0 = new Date();
      t0.setHours(0, 0, 0, 0);
      let cConcl = 0, cNoPrazo = 0, cBreve = 0, cVenc = 0, cSem = 0;
      data.goals.forEach((g) => {
        const dl = g.deadline ? new Date(g.deadline + "T12:00:00") : null;
        if (g.pct >= 100) cConcl++;
        else if (dl && dl < t0) cVenc++;
        else if (dl) {
          const days = Math.round((dl.getTime() - t0.getTime()) / 86400000);
          if (days <= 60) cBreve++; else cNoPrazo++;
        } else cSem++;
      });
      const statusItems = [
        { label: "Concluído", value: cConcl, color: "#16a34a" },
        { label: "No prazo", value: cNoPrazo, color: "#2563eb" },
        { label: "Vence em breve", value: cBreve, color: "#d97706" },
        { label: "Vencido", value: cVenc, color: "#dc2626" },
        { label: "Sem prazo", value: cSem, color: "#94a3b8" },
      ].filter((s) => s.value > 0);
      const alvoItems = data.goals
        .filter((g) => (g.target_amount || 0) > 0)
        .sort((a, b) => (b.target_amount || 0) - (a.target_amount || 0))
        .slice(0, 7)
        .map((g, i) => ({ label: g.description, value: g.target_amount || 0, color: CP[i % CP.length] }));

      if (statusItems.length > 0 || alvoItems.length >= 2) {
        const halfW = (CONTENT_W - 6) / 2;
        const chartH = 52;
        ensureSpace(chartH + 12);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(...C.text);
        pdf.text("Situação dos objetivos", MARGIN, y);
        pdf.text("Onde está concentrado o esforço", MARGIN + halfW + 6, y);
        const py = y + 4;
        if (statusItems.length > 0) {
          const stImg = canvasColoredDonut(statusItems, 720, Math.round(720 * (chartH / halfW)), "objetivos");
          pdf.addImage(stImg, "PNG", MARGIN, py, halfW, chartH);
        }
        if (alvoItems.length >= 2) {
          const totalAlvo = alvoItems.reduce((s, a) => s + a.value, 0);
          const avImg = canvasPie(alvoItems, 720, Math.round(720 * (chartH / halfW)), {
            centerTop: `R$ ${_compact(totalAlvo)}`,
            centerBottom: "em metas",
            fmtVal: (v) => `R$ ${_compact(v)}`,
          });
          pdf.addImage(avImg, "PNG", MARGIN + halfW + 6, py, halfW, chartH);
        }
        y = py + chartH + 7;
      }
    }

    // Barra geral
    ensureSpace(18);
    pdf.setFillColor(...C.bgSoft);
    pdf.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, "F");
    pdf.setTextColor(...C.text);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("Progresso Geral", MARGIN + 4, y + 5);
    pdf.setTextColor(...C.accent);
    pdf.text(`${data.planPct}%`, PAGE_W - MARGIN - 4, y + 5, { align: "right" });
    // Barra
    const barW = CONTENT_W - 8;
    pdf.setFillColor(220, 220, 225);
    pdf.roundedRect(MARGIN + 4, y + 8, barW, 2.5, 1, 1, "F");
    pdf.setFillColor(...C.accent);
    pdf.roundedRect(MARGIN + 4, y + 8, (barW * data.planPct) / 100, 2.5, 1, 1, "F");
    y += 18;

    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);

    data.goals.forEach((g) => {
      ensureSpace(23);
      const cardH = 21;

      // Status do objetivo (situação em relação ao prazo)
      const dl = g.deadline ? new Date(g.deadline + "T12:00:00") : null;
      let statusLabel = "Sem prazo";
      let statusColor: [number, number, number] = C.muted;
      if (g.pct >= 100) {
        statusLabel = "Concluído"; statusColor = C.success;
      } else if (dl && dl < today0) {
        statusLabel = "Vencido"; statusColor = C.danger;
      } else if (dl) {
        const days = Math.round((dl.getTime() - today0.getTime()) / 86400000);
        if (days <= 60) { statusLabel = "Vence em breve"; statusColor = C.warning; }
        else { statusLabel = "No prazo"; statusColor = [37, 99, 235]; }
      }

      pdf.setDrawColor(...C.border);
      pdf.setFillColor(...C.white);
      pdf.roundedRect(MARGIN, y, CONTENT_W, cardH, 2, 2, "FD");
      // Faixa lateral colorida pelo status
      pdf.setFillColor(...statusColor);
      pdf.roundedRect(MARGIN, y, 2, cardH, 2, 2, "F");
      pdf.rect(MARGIN + 1, y, 1, cardH, "F");

      // Título
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      const gtitle = pdf.splitTextToSize(g.description, CONTENT_W - 52)[0];
      pdf.text(gtitle, MARGIN + 6, y + 6);

      // Chip de prioridade
      const prio = (g.priority || "media").toLowerCase();
      const prioColor = prio === "alta" ? C.danger : prio === "baixa" ? [37, 99, 235] as [number, number, number] : C.warning;
      const prioLabel = prio === "alta" ? "Alta" : prio === "baixa" ? "Baixa" : "Média";
      pdf.setFillColor(...prioColor);
      pdf.setGState(pdf.GState({ opacity: 0.12 }));
      pdf.roundedRect(PAGE_W - MARGIN - 22, y + 2.5, 18, 5, 1, 1, "F");
      pdf.setGState(pdf.GState({ opacity: 1 }));
      pdf.setTextColor(...prioColor);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(prioLabel, PAGE_W - MARGIN - 13, y + 5.8, { align: "center" });

      // Linha de informações (valor-alvo · prazo · ações)
      pdf.setTextColor(...C.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      const meta: string[] = [];
      if (g.target_amount) meta.push(`Valor-alvo: ${fmt(g.target_amount)}`);
      if (dl) meta.push(`Prazo: ${dl.toLocaleDateString("pt-BR")}`);
      meta.push(`${g.tasksDone}/${g.tasksTotal} ações`);
      pdf.text(meta.join("   •   "), MARGIN + 6, y + 11.5);

      // Status (palavra colorida) à esquerda + barra de progresso à direita
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...statusColor);
      pdf.text(statusLabel, MARGIN + 6, y + 17);

      const barX = MARGIN + 44;
      const barW = PAGE_W - MARGIN - 12 - barX;
      pdf.setFillColor(220, 220, 225);
      pdf.roundedRect(barX, y + 15.4, barW, 2, 1, 1, "F");
      pdf.setFillColor(...C.accent);
      pdf.roundedRect(barX, y + 15.4, (barW * g.pct) / 100, 2, 1, 1, "F");
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(`${g.pct}%`, PAGE_W - MARGIN - 4, y + 17.2, { align: "right" });

      y += cardH + 3;
    });
  }

  // ── 8. Plano de Ação
  if (data.actionItems.length > 0) {
    sectionHeader("Plano de Ação", `${data.completedActions}/${data.totalActions} ações concluídas`);
    paragraph(
      "Cada ação foi priorizada pelo seu impacto financeiro e prazo. Juntas, formam o caminho prático para melhorar seus indicadores e acelerar a chegada nas suas metas.",
      9,
      C.muted
    );
    autoTable(pdf, {
      startY: y,
      head: [["Ação", "Prioridade", "Status", "Impacto", "Prazo"]],
      body: data.actionItems.slice(0, 30).map((a) => [
        a.title,
        (a.priority || "—").charAt(0).toUpperCase() + (a.priority || "—").slice(1),
        a.status === "concluido" ? "Concluído" : a.status === "em_andamento" ? "Em andamento" : "Pendente",
        a.financial_impact ? fmt(a.financial_impact) : "—",
        a.deadline ? new Date(a.deadline).toLocaleDateString("pt-BR") : "—",
      ]),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2.2, valign: "middle" },
      headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 7.5 },
      alternateRowStyles: { fillColor: C.bgSoft },
      columnStyles: {
        0: { cellWidth: "auto" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;

    // Impacto total
    ensureSpace(14);
    pdf.setFillColor(...C.bgSoft);
    pdf.roundedRect(MARGIN, y, CONTENT_W, 12, 2, 2, "F");
    pdf.setTextColor(...C.text);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("Impacto Financeiro Estimado", MARGIN + 4, y + 7.5);
    pdf.setTextColor(...C.success);
    pdf.setFontSize(13);
    pdf.text(fmt(data.totalImpact), PAGE_W - MARGIN - 4, y + 8, { align: "right" });
    y += 18;

    // Gráfico: Top 6 ações por impacto financeiro
    const topActions = data.actionItems
      .filter((a) => (a.financial_impact || 0) > 0)
      .sort((a, b) => (b.financial_impact || 0) - (a.financial_impact || 0))
      .slice(0, 6)
      .map((a, i) => ({
        label: a.title,
        value: a.financial_impact || 0,
        color: CP[i % CP.length],
      }));
    if (topActions.length >= 2) {
      const aChartH = 60;
      ensureSpace(aChartH + 12);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...C.text);
      pdf.text("Distribuição do impacto financeiro", MARGIN, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...C.muted);
      pdf.text("Peso de cada ação no ganho mensal estimado", MARGIN, y + 4);

      const img = canvasPie(topActions, 1300, Math.round(1300 * aChartH / CONTENT_W), {
        centerTop: `R$ ${_compact(data.totalImpact)}`,
        centerBottom: "por mês",
        fmtVal: (v) => `R$ ${_compact(v)}`,
      });
      pdf.addImage(img, "PNG", MARGIN, y + 6, CONTENT_W, aChartH);
      y += aChartH + 8;
    }
  }

  // ── Projeção de Ganhos (impacto após implementar o plano)
  if (data.totalImpact > 0) {
    sectionHeader("Projeção de Ganhos", "Estimativa de impacto após implementar o plano", 56);
    paragraph(
      "Veja o efeito esperado do plano no seu bolso: comparamos a sua situação atual com o cenário após colocar em prática as ações recomendadas.",
      9,
      C.muted
    );

    const colW = (CONTENT_W - 6) / 2;
    const boxH = 42;
    ensureSpace(boxH + 4);
    const novoSaldo = data.netCashFlow + data.totalImpact;

    pdf.setFillColor(...C.bgSoft);
    pdf.roundedRect(MARGIN, y, colW, boxH, 2, 2, "F");
    pdf.setFillColor(240, 247, 242);
    pdf.roundedRect(MARGIN + colW + 6, y, colW, boxH, 2, 2, "F");
    pdf.setFillColor(...C.success);
    pdf.roundedRect(MARGIN + colW + 6, y, 2, boxH, 2, 2, "F");
    pdf.rect(MARGIN + colW + 7, y, 1, boxH, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...C.muted);
    pdf.text("SITUAÇÃO ATUAL", MARGIN + 5, y + 7);
    pdf.setTextColor(...C.success);
    pdf.text("APÓS IMPLEMENTAÇÃO", MARGIN + colW + 11, y + 7);

    const rowAtual: Array<[string, string]> = [
      ["Saldo mensal", fmt(data.netCashFlow)],
      ["Poupança em 12 meses", fmt(Math.max(0, data.netCashFlow * 12))],
      ["Patrimônio líquido", fmt(data.netWorth)],
    ];
    const rowApos: Array<[string, string]> = [
      ["Ganho mensal estimado", `+ ${fmt(data.totalImpact)}`],
      ["Novo saldo mensal", fmt(novoSaldo)],
      ["Poupança em 12 meses", fmt(Math.max(0, novoSaldo * 12))],
    ];

    let ry = y + 16;
    rowAtual.forEach(([l, v]) => {
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.3); pdf.setTextColor(...C.muted);
      pdf.text(l, MARGIN + 5, ry);
      pdf.setFont("helvetica", "bold"); pdf.setTextColor(...C.text);
      pdf.text(v, MARGIN + colW - 5, ry, { align: "right" });
      ry += 8.5;
    });
    ry = y + 16;
    rowApos.forEach(([l, v]) => {
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.3); pdf.setTextColor(...C.muted);
      pdf.text(l, MARGIN + colW + 11, ry);
      pdf.setFont("helvetica", "bold"); pdf.setTextColor(...C.success);
      pdf.text(v, MARGIN + colW * 2 + 1, ry, { align: "right" });
      ry += 8.5;
    });
    y += boxH + 6;
  }

  // ── 8.5 Plano de Ação Aplicado (V9)
  if (
    data.activePlan &&
    data.activePlan.appliedVariant &&
    data.activePlan.variants &&
    data.activePlan.variants.length > 0
  ) {
    const applied = data.activePlan.variants.find(
      (v) => v.letter === data.activePlan!.appliedVariant,
    );
    const alternatives = data.activePlan.variants.filter(
      (v) => v.letter !== data.activePlan!.appliedVariant,
    );

    const variantColor: Record<"A" | "B" | "C", [number, number, number]> = {
      A: [37, 99, 235],
      B: C.success,
      C: C.accent,
    };
    const variantLabel: Record<"A" | "B" | "C", string> = {
      A: "Cauteloso",
      B: "Equilibrado",
      C: "Acelerado",
    };

    const areaLabels: Record<string, string> = {
      renda: "Renda",
      despesas: "Despesas",
      dividas: "Dívidas",
      investimentos: "Investimentos",
      protecao: "Proteção",
      impostos: "Impostos",
    };

    if (applied) {
      newPage();
      sectionHeader(
        "Plano de Ação Aplicado",
        data.activePlan.objective
          ? `Objetivo traçado: ${data.activePlan.objective}`
          : `Plano ${applied.letter} · ${variantLabel[applied.letter]}`,
      );

      const headerH = 26;
      ensureSpace(headerH + 6);
      pdf.setFillColor(...C.bgSoft);
      pdf.roundedRect(MARGIN, y, CONTENT_W, headerH, 2, 2, "F");
      pdf.setFillColor(...variantColor[applied.letter]);
      pdf.rect(MARGIN, y, 2.5, headerH, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(...variantColor[applied.letter]);
      pdf.text(`Plano ${applied.letter} · ${variantLabel[applied.letter]}`, MARGIN + 6, y + 7);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...C.text);
      pdf.text(applied.title, MARGIN + 6, y + 13);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...C.muted);
      const approachLines = pdf.splitTextToSize(applied.approach, CONTENT_W - 12);
      pdf.text(approachLines, MARGIN + 6, y + 18);

      y += headerH + 2;

      const metaH = 10;
      ensureSpace(metaH + 4);
      pdf.setFontSize(8);
      pdf.setTextColor(...C.muted);
      pdf.text(
        `Horizonte: ${applied.horizon_months} ${applied.horizon_months === 1 ? "mês" : "meses"}   ·   Impacto estimado: ${fmt(applied.monthly_impact)}/mês   ·   ${applied.actions.length} ações`,
        MARGIN,
        y + 4,
      );
      y += metaH;

      ensureSpace(10);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...C.text);
      pdf.text("Ações do plano", MARGIN, y);
      y += 4;
      pdf.setDrawColor(...C.border);
      pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 4;

      applied.actions.forEach((a) => {
        const descLines = pdf.splitTextToSize(a.description, CONTENT_W - 14);
        const objLines = a.objective
          ? pdf.splitTextToSize(`» ${a.objective}`, CONTENT_W - 14)
          : [];
        const blockH = 5 + descLines.length * 3.5 + objLines.length * 3.2 + 3;
        ensureSpace(blockH);

        pdf.setFillColor(...variantColor[applied.letter]);
        pdf.circle(MARGIN + 1.5, y + 2.5, 0.8, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(...C.muted);
        const areaText = (areaLabels[a.area] || a.area).toUpperCase();
        pdf.text(areaText, MARGIN + 4, y + 2.5);

        if (a.financial_impact && a.financial_impact > 0) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(...C.success);
          pdf.text(
            `${fmt(a.financial_impact)}/mês`,
            PAGE_W - MARGIN,
            y + 2.5,
            { align: "right" },
          );
        }

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(...C.text);
        pdf.text(descLines, MARGIN + 4, y + 6);

        if (objLines.length > 0) {
          pdf.setFontSize(8);
          pdf.setTextColor(...C.muted);
          pdf.text(objLines, MARGIN + 4, y + 6 + descLines.length * 3.5);
        }

        y += blockH;
      });

      y += 4;
    }

    if (alternatives.length > 0) {
      ensureSpace(20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...C.text);
      pdf.text("Alternativas consideradas pela IA", MARGIN, y);
      y += 6;

      for (const alt of alternatives) {
        const altH = 18;
        ensureSpace(altH + 3);

        pdf.setFillColor(...C.bgSoft);
        pdf.roundedRect(MARGIN, y, CONTENT_W, altH, 2, 2, "F");
        pdf.setFillColor(...variantColor[alt.letter]);
        pdf.rect(MARGIN, y, 1.5, altH, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(...variantColor[alt.letter]);
        pdf.text(`Plano ${alt.letter} · ${variantLabel[alt.letter]}`, MARGIN + 5, y + 5);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...C.text);
        pdf.text(alt.title, MARGIN + 5, y + 10);

        pdf.setFontSize(7.5);
        pdf.setTextColor(...C.muted);
        pdf.text(
          `${alt.horizon_months}m · ${fmt(alt.monthly_impact)}/mês · ${alt.actions.length} ações`,
          PAGE_W - MARGIN,
          y + 10,
          { align: "right" },
        );

        const approachLines = pdf.splitTextToSize(alt.approach, CONTENT_W - 10);
        pdf.setFontSize(7.5);
        pdf.setTextColor(...C.muted);
        pdf.text(approachLines.slice(0, 1), MARGIN + 5, y + 15);

        y += altH + 2;
      }
    }
  }

  // ── 9. Evolução Patrimonial — usa canvasAreaLine
  if (data.snapshots && data.snapshots.length >= 2) {
    newPage();
    sectionHeader(
      "Evolução Patrimonial",
      `Linha temporal com ${data.snapshots.length} registro${data.snapshots.length !== 1 ? "s" : ""} de acompanhamento`
    );

    const snaps = data.snapshots
      .slice()
      .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());

    const series = snaps.map((s) => ({
      label: new Date(s.snapshot_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      ativos: s.total_assets || 0,
      dividas: s.total_debts || 0,
      patrimonio: (s.total_assets || 0) - (s.total_debts || 0),
    }));

    // Gráfico de área/linhas (75mm)
    const chartH = 75;
    ensureSpace(chartH + 6);
    const areaImg = canvasAreaLine(series, 1400, 720);
    pdf.addImage(areaImg, "PNG", MARGIN, y, CONTENT_W, chartH);
    y += chartH + 4;

    // Tabela resumo
    const first = { ...series[0], date: new Date(snaps[0].snapshot_date) };
    const last = { ...series[series.length - 1], date: new Date(snaps[snaps.length - 1].snapshot_date) };
    const deltaPat = last.patrimonio - first.patrimonio;
    const deltaPct = first.patrimonio !== 0 ? (deltaPat / Math.abs(first.patrimonio)) * 100 : 0;

    autoTable(pdf, {
      startY: y,
      head: [["Período", "Ativos", "Dívidas", "Patrimônio Líquido"]],
      body: [
        [
          first.date.toLocaleDateString("pt-BR"),
          fmt(first.ativos),
          fmt(first.dividas),
          fmt(first.patrimonio),
        ],
        [
          last.date.toLocaleDateString("pt-BR"),
          fmt(last.ativos),
          fmt(last.dividas),
          fmt(last.patrimonio),
        ],
        [
          { content: "Variação", styles: { fontStyle: "bold" } },
          { content: fmt(last.ativos - first.ativos), styles: { fontStyle: "bold" } },
          { content: fmt(last.dividas - first.dividas), styles: { fontStyle: "bold" } },
          {
            content: `${deltaPat >= 0 ? "+" : ""}${fmt(deltaPat)}  (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`,
            styles: { fontStyle: "bold", textColor: deltaPat >= 0 ? C.success : C.danger },
          },
        ],
      ],
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 8 },
      alternateRowStyles: { fillColor: C.bgSoft },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;
  }

  // ── Evolução da Taxa de Poupança
  const rateSnaps = (data.snapshots ?? []).filter((s) => s.savings_rate != null);
  if (rateSnaps.length >= 2) {
    newPage();
    sectionHeader("Evolução da Taxa de Poupança", `${rateSnaps.length} registros históricos`);

    const rateSorted = rateSnaps
      .slice()
      .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());

    const rVals = rateSorted.map((s) => s.savings_rate!);
    const firstRate = rVals[0];
    const lastRate = rVals[rVals.length - 1];
    const deltaRate = lastRate - firstRate;
    const avgRate = rVals.reduce((a, b) => a + b, 0) / rVals.length;

    const hx = (h: string): [number, number, number] => {
      const s = h.replace("#", "");
      return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    };
    const bandColor = lastRate >= 30 ? "#16a34a" : lastRate >= 10 ? "#2563eb" : lastRate >= 0 ? "#d97706" : "#dc2626";

    // Texto explicativo
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...C.text);
    const explLines = pdf.splitTextToSize(
      "A taxa de poupança mostra quanto da sua renda você guarda a cada mês. Quanto maior e mais estável, mais rápido suas metas se realizam.",
      CONTENT_W
    );
    ensureSpace(explLines.length * 4 + 64);
    pdf.text(explLines, MARGIN, y);
    y += explLines.length * 4 + 4;

    // Anel de KPI (taxa atual) à esquerda
    const panelH = 52;
    const ringSize = 52;
    const ringImg = canvasKpiRing(
      Math.min(lastRate, 100), bandColor, `${lastRate.toFixed(1)}%`, "poupança atual", 520, 520
    );
    pdf.addImage(ringImg, "PNG", MARGIN, y, ringSize, ringSize);

    // Cartões de indicadores à direita (2x2)
    const rX = MARGIN + ringSize + 6;
    const rW = PAGE_W - MARGIN - rX;
    const cW = (rW - 4) / 2;
    const cH = (panelH - 4) / 2;
    const kpis: Array<{ l: string; v: string; c: [number, number, number] }> = [
      { l: "INÍCIO", v: `${firstRate.toFixed(1)}%`, c: C.muted },
      { l: "ATUAL", v: `${lastRate.toFixed(1)}%`, c: hx(bandColor) },
      { l: "VARIAÇÃO", v: `${deltaRate >= 0 ? "+" : ""}${deltaRate.toFixed(1)} p.p.`, c: deltaRate >= 0 ? C.success : C.danger },
      { l: "MÉDIA", v: `${avgRate.toFixed(1)}%`, c: C.text },
    ];
    kpis.forEach((k, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const kx = rX + col * (cW + 4);
      const ky = y + row * (cH + 4);
      pdf.setFillColor(...C.bgSoft);
      pdf.roundedRect(kx, ky, cW, cH, 2, 2, "F");
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(...C.muted);
      pdf.text(k.l, kx + 4, ky + 6);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(...k.c);
      pdf.text(k.v, kx + 4, ky + cH - 5);
    });
    y += panelH + 6;
  }

  // ── Acompanhamento de Metas — tabela resumo + cards de histórico por meta
  if (data.parecerMetas && data.parecerMetas.length > 0) {
    ensureSpace(20);
    sectionHeader("Acompanhamento de Metas", `${data.parecerMetas.length} metas definidas`);
    paragraph(
      "Aqui transformamos seus objetivos em metas mensuráveis e acompanhamos cada uma ao longo dos meses. A cada fechamento registramos o valor atual e o progresso — é assim que o plano sai do papel e vira resultado.",
      9,
      C.muted
    );

    const metasArr = data.parecerMetas;
    const totalAlvoM = metasArr.reduce((s, m) => s + (m.metaValor || 0), 0);
    const emAcomp = metasArr.filter((m) => (m.totalLancamentos ?? 0) > 0).length;
    const comPct = metasArr.filter((m) => m.progressPct != null);
    const progMedio = comPct.length > 0 ? Math.round(comPct.reduce((s, m) => s + (m.progressPct || 0), 0) / comPct.length) : null;
    drawKpiCards([
      { label: "Metas definidas", value: String(metasArr.length), hint: "objetivos virando metas", tone: "blue" },
      { label: "Valor-alvo total", value: `R$ ${_compact(totalAlvoM)}`, hint: "soma de todas as metas", tone: "muted" },
      { label: "Em acompanhamento", value: `${emAcomp}/${metasArr.length}`, hint: emAcomp > 0 ? "com lançamentos" : "aguardando 1º lançamento", tone: emAcomp > 0 ? "emerald" : "amber" },
      { label: "Progresso médio", value: progMedio != null ? `${progMedio}%` : "—", hint: progMedio != null ? "média de atingimento" : "começa após os lançamentos", tone: progMedio != null ? (progMedio >= 60 ? "emerald" : progMedio >= 30 ? "amber" : "red") : "muted" },
    ]);

    // Gráfico: valor-alvo por categoria
    const catLabel2: Record<string, string> = { income: "Renda", expenses: "Despesa", debts: "Dívida", assets: "Patrimônio", insurance: "Seguro" };
    const catColor2: Record<string, string> = { income: "#16a34a", expenses: "#dc2626", debts: "#ea580c", assets: "#2563eb", insurance: "#7c3aed" };
    const catMap = new Map<string, number>();
    metasArr.forEach((m) => { if ((m.metaValor || 0) > 0) catMap.set(m.sourceTable, (catMap.get(m.sourceTable) ?? 0) + (m.metaValor || 0)); });
    const catPie = Array.from(catMap.entries())
      .map(([k, v]) => ({ label: catLabel2[k] || k, value: v, color: catColor2[k] || "#64748b" }))
      .sort((a, b) => b.value - a.value);
    if (catPie.length >= 2) {
      const chartH = 50;
      ensureSpace(chartH + 12);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...C.text);
      pdf.text("Valor-alvo por categoria", MARGIN, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...C.muted);
      pdf.text("Onde estão concentradas as suas metas por área financeira", MARGIN, y + 4);
      const img = canvasPie(catPie, 1300, Math.round(1300 * chartH / CONTENT_W), {
        centerTop: `R$ ${_compact(totalAlvoM)}`,
        centerBottom: "em metas",
        fmtVal: (v) => `R$ ${_compact(v)}`,
      });
      pdf.addImage(img, "PNG", MARGIN, y + 6, CONTENT_W, chartH);
      y += chartH + 8;
    }

    ensureSpace(14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...C.text);
    pdf.text("Detalhamento das metas", MARGIN, y);
    y += 5;

    ensureSpace(10);
    pdf.setFillColor(...C.primary);
    pdf.rect(MARGIN, y, CONTENT_W, 7, "F");
    pdf.setTextColor(...C.white);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    const mCols = [0, 65, 105, 135, 158];
    ["Meta", "Categoria", "Valor Alvo", "Valor Atual", "Progresso"].forEach((h, i) => {
      pdf.text(h, MARGIN + mCols[i] + 2, y + 5);
    });
    y += 9;

    const catLabel: Record<string, string> = {
      income: "Renda", expenses: "Despesa", debts: "Dívida",
      assets: "Patrimônio", insurance: "Seguro",
    };

    data.parecerMetas.forEach((m, idx) => {
      ensureSpace(10);
      if (idx % 2 === 0) {
        pdf.setFillColor(...C.bgSoft);
        pdf.rect(MARGIN, y, CONTENT_W, 9, "F");
      }

      const pct = m.progressPct ?? 0;
      const pctColor: [number, number, number] = pct >= 100 ? C.success : pct >= 60 ? [37, 99, 235] : pct >= 30 ? C.warning : C.danger;

      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(pdf.splitTextToSize(m.sourceLabel, 60)[0], MARGIN + mCols[0] + 2, y + 5.5);

      pdf.setTextColor(...C.muted);
      pdf.setFontSize(7.5);
      pdf.text(catLabel[m.sourceTable] || m.sourceTable, MARGIN + mCols[1] + 2, y + 5.5);

      pdf.setTextColor(...C.text);
      pdf.setFontSize(8);
      const targetStr = m.metaValor ? fmt(m.metaValor) : (m.metaText?.slice(0, 18) || "—");
      pdf.text(targetStr, MARGIN + mCols[2] + 2, y + 5.5);

      const currentStr = m.latestValor != null ? fmt(m.latestValor) : (m.latestEstado?.slice(0, 18) || "—");
      pdf.text(currentStr, MARGIN + mCols[3] + 2, y + 5.5);

      if (m.progressPct != null) {
        const barX = MARGIN + mCols[4] + 2;
        const barW = CONTENT_W - mCols[4] - 20;
        pdf.setFillColor(220, 220, 225);
        pdf.roundedRect(barX, y + 3.5, barW, 2.5, 1, 1, "F");
        pdf.setFillColor(...pctColor);
        pdf.roundedRect(barX, y + 3.5, (barW * Math.min(pct, 100)) / 100, 2.5, 1, 1, "F");
        pdf.setTextColor(...pctColor);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.text(`${pct}%`, MARGIN + CONTENT_W - 2, y + 5.5, { align: "right" });
      } else {
        pdf.setTextColor(...C.muted);
        pdf.setFontSize(7.5);
        pdf.text("—", MARGIN + mCols[4] + 2, y + 5.5);
      }

      pdf.setDrawColor(...C.border);
      pdf.setLineWidth(0.15);
      pdf.line(MARGIN, y + 9, MARGIN + CONTENT_W, y + 9);
      y += 10;
    });
    y += 6;

    // ── Histórico Detalhado por Meta (cards individuais) ──
    const metasComHistorico = data.parecerMetas.filter((m) => m.history && m.history.length > 0);
    if (metasComHistorico.length === 0) {
      // Estado inicial — ainda sem lançamentos
      const noteMsg = "As metas acima foram definidas e o acompanhamento mensal já está ativo. A partir do próximo fechamento, esta seção passará a mostrar o valor atual, a evolução e o progresso de cada meta, mês a mês.";
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      const nLines = pdf.splitTextToSize(noteMsg, CONTENT_W - 12);
      const nH = nLines.length * 3.8 + 7;
      ensureSpace(nH + 4);
      pdf.setFillColor(...C.bgSoft);
      pdf.roundedRect(MARGIN, y, CONTENT_W, nH, 2, 2, "F");
      pdf.setFillColor(...C.primaryLight);
      pdf.roundedRect(MARGIN, y, 2, nH, 2, 2, "F");
      pdf.rect(MARGIN + 1, y, 1, nH, "F");
      pdf.setTextColor(...C.text);
      pdf.text(nLines, MARGIN + 6, y + 5);
      y += nH + 6;
    }
    if (metasComHistorico.length > 0) {
      ensureSpace(20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...C.primary);
      pdf.text("Histórico de Evolução por Meta", MARGIN, y);
      y += 2;
      pdf.setDrawColor(...C.primary);
      pdf.setLineWidth(0.5);
      pdf.line(MARGIN, y, MARGIN + 60, y);
      y += 6;

      metasComHistorico.forEach((m) => {
        const hist = m.history || [];
        const cardHeight = 12 + Math.min(hist.length, 6) * 5 + 6;
        ensureSpace(cardHeight + 4);

        // Card background
        pdf.setFillColor(...C.bgSoft);
        pdf.roundedRect(MARGIN, y, CONTENT_W, cardHeight, 2, 2, "F");
        pdf.setDrawColor(...C.border);
        pdf.setLineWidth(0.2);
        pdf.roundedRect(MARGIN, y, CONTENT_W, cardHeight, 2, 2, "S");

        // Cor lateral (categoria)
        const isReducing = m.sourceTable === "expenses" || m.sourceTable === "debts" || m.sourceTable === "insurance";
        const accentColor: [number, number, number] = isReducing ? [217, 119, 6] : [22, 163, 74];
        pdf.setFillColor(...accentColor);
        pdf.rect(MARGIN, y, 1.5, cardHeight, "F");

        // Header da meta
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(...C.text);
        pdf.text(pdf.splitTextToSize(m.sourceLabel, 110)[0], MARGIN + 4, y + 5);

        // Tags: categoria | alvo | atingido
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(...C.muted);
        const tagParts: string[] = [catLabel[m.sourceTable] || m.sourceTable];
        if (m.metaValor) tagParts.push(`Alvo ${fmt(m.metaValor)}`);
        if (m.progressPct != null) tagParts.push(`${m.progressPct}% atingido`);
        if (m.totalLancamentos) tagParts.push(`${m.totalLancamentos} lançamentos`);
        pdf.text(tagParts.join("  ·  "), MARGIN + 4, y + 9.5);

        // Mini-tabela de evolução cronológica (do mais recente para o mais antigo, até 6)
        const headerY = y + 13;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(...C.muted);
        pdf.text("DATA", MARGIN + 4, headerY);
        pdf.text("VALOR", MARGIN + 35, headerY);
        pdf.text("VARIAÇÃO", MARGIN + 70, headerY);
        pdf.text("PROGRESSO", MARGIN + CONTENT_W - 30, headerY);

        let rowY = headerY + 4;
        // hist está em ordem DESC (mais recente primeiro), pegamos os 6 mais recentes
        const histAsc = [...hist].reverse(); // ASC para calcular delta
        const recentEntries = hist.slice(0, 6); // os mais recentes
        recentEntries.forEach((e) => {
          // Encontra o anterior em ordem ASC para calcular delta
          const ascIdx = histAsc.findIndex((h) => h.date === e.date);
          const prev = ascIdx > 0 ? histAsc[ascIdx - 1] : null;
          const dValor = prev?.valor != null && e.valor != null ? e.valor - prev.valor : null;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          pdf.setTextColor(...C.text);
          pdf.text(new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }), MARGIN + 4, rowY);
          if (e.valor != null) {
            pdf.setFont("helvetica", "bold");
            pdf.text(fmt(e.valor), MARGIN + 35, rowY);
          } else {
            pdf.setTextColor(...C.muted);
            pdf.text("—", MARGIN + 35, rowY);
          }
          if (dValor != null && dValor !== 0) {
            const goingRight = (isReducing && dValor > 0) || (!isReducing && dValor < 0);
            const dColor: [number, number, number] = goingRight ? C.danger : C.success;
            pdf.setTextColor(...dColor);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(6.5);
            pdf.text(`${dValor > 0 ? "+" : ""}${fmt(dValor)}`, MARGIN + 70, rowY);
          }
          if (e.pct != null) {
            const pctC: [number, number, number] = e.pct >= 100 ? C.success : e.pct >= 60 ? [37, 99, 235] : e.pct >= 30 ? C.warning : C.danger;
            pdf.setTextColor(...pctC);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7);
            pdf.text(`${Math.round(e.pct)}%`, MARGIN + CONTENT_W - 4, rowY, { align: "right" });
          }
          rowY += 5;
        });

        y += cardHeight + 4;
      });
    }

    y += 4;
  }

  // ── Análise Visual das Metas (6 gráficos)
  if (data.parecerMetas && data.parecerMetas.length > 0) {
    const metasAll = data.parecerMetas;

    // ── Helpers de categoria
    const CAT_DEFS: Array<{ key: string; label: string; color: string }> = [
      { key: "income", label: "Renda", color: "#16a34a" },
      { key: "expenses", label: "Despesa", color: "#dc2626" },
      { key: "debts", label: "Dívida", color: "#ea580c" },
      { key: "assets", label: "Patrimônio", color: "#2563eb" },
      { key: "insurance", label: "Seguro", color: "#7c3aed" },
    ];
    const catColorByKey = new Map(CAT_DEFS.map((c) => [c.key, c.color]));
    const catLabelByKey = new Map(CAT_DEFS.map((c) => [c.key, c.label]));

    // ── 1. Status das Metas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let cConcluidas = 0, cAndamento = 0, cSemLanc = 0, cAtrasadas = 0;
    metasAll.forEach((m) => {
      const pct = m.progressPct;
      const isAtrasada = m.prazo && new Date(m.prazo + "T12:00:00") < today && (pct == null || pct < 100);
      const semLanc = m.latestValor == null && !m.latestEstado && (m.totalLancamentos ?? 0) === 0;
      if (isAtrasada) cAtrasadas++;
      else if (pct != null && pct >= 100) cConcluidas++;
      else if (semLanc) cSemLanc++;
      else if (pct != null && pct >= 1) cAndamento++;
      else cSemLanc++; // sem dados/sem lançamentos vão pro "sem lançamentos"
    });
    const statusItems = [
      { label: "Concluídas", value: cConcluidas, color: "#16a34a" },
      { label: "Em andamento", value: cAndamento, color: "#2563eb" },
      { label: "Sem lançamentos", value: cSemLanc, color: "#94a3b8" },
      { label: "Atrasadas", value: cAtrasadas, color: "#dc2626" },
    ].filter((s) => s.value > 0);

    // ── 2. Metas por Categoria
    const catCount = new Map<string, number>();
    metasAll.forEach((m) => {
      const k = m.sourceTable;
      catCount.set(k, (catCount.get(k) ?? 0) + 1);
    });
    const categoryItems = Array.from(catCount.entries())
      .map(([k, v]) => ({
        label: catLabelByKey.get(k) || k,
        value: v,
        color: catColorByKey.get(k) || "#787880",
      }))
      .sort((a, b) => b.value - a.value);

    // ── 3. Progresso por Meta (top 12)
    const progressoMetas = metasAll
      .filter((m) => m.progressPct != null)
      .map((m) => {
        const pct = m.progressPct ?? 0;
        const color =
          pct >= 100 ? "#16a34a" :
          pct >= 60 ? "#2563eb" :
          pct >= 30 ? "#d97706" :
          "#dc2626";
        return { label: m.sourceLabel, value: pct, color };
      })
      .sort((a, b) => b.value - a.value);
    let progressoBars: Array<{ label: string; value: number; color: string }> = [];
    if (progressoMetas.length > 12) {
      progressoBars = progressoMetas.slice(0, 11);
      const restantes = progressoMetas.slice(11);
      const avg = restantes.reduce((s, p) => s + p.value, 0) / restantes.length;
      progressoBars.push({ label: `Outras (${restantes.length})`, value: avg, color: "#94a3b8" });
    } else {
      progressoBars = progressoMetas;
    }

    // ── 4. Alvo vs Atual (top 8)
    const alvoVsAtualGroups = metasAll
      .filter((m) => (m.metaValor ?? 0) > 0)
      .sort((a, b) => (b.metaValor ?? 0) - (a.metaValor ?? 0))
      .slice(0, 8)
      .map((m) => {
        const alvo = m.metaValor ?? 0;
        const atual = m.latestValor ?? 0;
        const atingiu = atual >= alvo;
        return {
          label: m.sourceLabel,
          series: [
            { name: "Alvo", value: alvo, color: "#94a3b8" },
            { name: "Atual", value: atual, color: atingiu ? "#16a34a" : "#2563eb" },
          ],
        };
      });

    // ── 5. Evolução Mensal (top 6 metas com mais lançamentos)
    const metasParaEvolucao = metasAll
      .filter((m) => (m.totalLancamentos ?? 0) >= 2 && m.history && m.history.length >= 2)
      .sort((a, b) => (b.totalLancamentos ?? 0) - (a.totalLancamentos ?? 0))
      .slice(0, 6);

    // Coletar todas as datas (ym) ordenadas ASC
    const ymSet = new Set<string>();
    metasParaEvolucao.forEach((m) => {
      (m.history || []).forEach((h) => {
        if (h.date) ymSet.add(h.date.slice(0, 7));
      });
    });
    const ymSorted = Array.from(ymSet).sort();
    const xLabels = ymSorted.map((ym) => {
      const [yyyy, mm] = ym.split("-");
      return `${mm}/${yyyy.slice(2)}`;
    });
    const evolucaoSeries = metasParaEvolucao.map((m, i) => {
      // último pct por ym
      const pctByYm = new Map<string, number | null>();
      (m.history || []).forEach((h) => {
        if (!h.date) return;
        const ym = h.date.slice(0, 7);
        pctByYm.set(ym, h.pct ?? null);
      });
      const points = ymSorted.map((ym) => (pctByYm.has(ym) ? pctByYm.get(ym)! : null));
      const short = m.sourceLabel.length > 22 ? m.sourceLabel.slice(0, 20) + "…" : m.sourceLabel;
      return { name: short, color: CP[i % CP.length], points };
    });

    // ── 6. Lançamentos por Mês (por categoria)
    const monthCatMap = new Map<string, Record<string, number>>();
    metasAll.forEach((m) => {
      const cat = m.sourceTable;
      (m.history || []).forEach((h) => {
        if (!h.date) return;
        const ym = h.date.slice(0, 7);
        const row = monthCatMap.get(ym) ?? {};
        row[cat] = (row[cat] ?? 0) + 1;
        monthCatMap.set(ym, row);
      });
    });
    const lancamentosBuckets = Array.from(monthCatMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, counts]) => {
        const [yyyy, mm] = ym.split("-");
        return { label: `${mm}/${yyyy.slice(2)}`, counts };
      });
    const catsPresentes = new Set<string>();
    lancamentosBuckets.forEach((b) => {
      Object.keys(b.counts).forEach((k) => catsPresentes.add(k));
    });
    const categoriesForStacked = CAT_DEFS.filter((c) => catsPresentes.has(c.key));

    // Há ao menos algum gráfico para mostrar?
    const hasAnyChart =
      statusItems.length > 0 ||
      categoryItems.length > 0 ||
      progressoBars.length > 0 ||
      alvoVsAtualGroups.length > 0 ||
      (evolucaoSeries.length > 0 && xLabels.length >= 2) ||
      lancamentosBuckets.length >= 2;

    if (hasAnyChart) {
      sectionHeader("Análise Visual das Metas", "Distribuição, progresso e evolução das metas em gráficos", 64);

      // Linha 1: Status (esq) + Categoria (dir)
      if (statusItems.length > 0 || categoryItems.length > 0) {
        const chartH = 56;
        ensureSpace(chartH + 12);
        const halfW = (CONTENT_W - 6) / 2;

        if (statusItems.length > 0) {
          // Título
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9.5);
          pdf.setTextColor(...C.text);
          pdf.text("Status das Metas", MARGIN, y);
          // Canvas com a MESMA proporção do espaço (halfW x chartH) → rosca redonda
          const img = canvasColoredDonut(statusItems, 720, Math.round(720 * (chartH / halfW)), "metas");
          pdf.addImage(img, "PNG", MARGIN, y + 3, halfW, chartH);
        }
        if (categoryItems.length > 0) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9.5);
          pdf.setTextColor(...C.text);
          pdf.text("Metas por Categoria", MARGIN + halfW + 6, y);
          const img = canvasColoredDonut(categoryItems, 720, Math.round(720 * (chartH / halfW)), "categorias");
          pdf.addImage(img, "PNG", MARGIN + halfW + 6, y + 3, halfW, chartH);
        }
        y += chartH + 6;
      }

      // Linha 2: Progresso por Meta (anéis de KPI — "pizza")
      const ringMetas = progressoMetas.slice(0, 8);
      if (ringMetas.length > 0) {
        const perRow = Math.min(4, ringMetas.length);
        const cellW = CONTENT_W / perRow;
        const ringD = Math.min(cellW - 10, 30);
        const rowH = ringD + 11;
        const rows = Math.ceil(ringMetas.length / perRow);
        // Reserva título + todos os anéis juntos (evita órfãos)
        ensureSpace(9 + rows * rowH + 2);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9.5);
        pdf.setTextColor(...C.text);
        pdf.text("Progresso por Meta", MARGIN, y);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...C.muted);
        pdf.text("Percentual de atingimento de cada meta", MARGIN, y + 4);
        y += 9;
        const rowStartY = y;
        ringMetas.forEach((m, i) => {
          const col = i % perRow;
          const row = Math.floor(i / perRow);
          const cellX = MARGIN + col * cellW;
          const rx = cellX + (cellW - ringD) / 2;
          const ry = rowStartY + row * rowH;
          const img = canvasKpiRing(m.value, m.color, `${Math.round(m.value)}%`, "", 360, 360);
          pdf.addImage(img, "PNG", rx, ry, ringD, ringD);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          pdf.setTextColor(...C.muted);
          const lbl = m.label.length > 20 ? m.label.slice(0, 19) + "…" : m.label;
          pdf.text(lbl, cellX + cellW / 2, ry + ringD + 4, { align: "center" });
        });
        y = rowStartY + rows * rowH + 5;
      }

      // Linha 3: Distribuição do valor-alvo entre as metas (rosca)
      const alvoPie = metasAll
        .filter((m) => (m.metaValor ?? 0) > 0)
        .sort((a, b) => (b.metaValor ?? 0) - (a.metaValor ?? 0))
        .slice(0, 7)
        .map((m, i) => ({ label: m.sourceLabel, value: m.metaValor ?? 0, color: CP[i % CP.length] }));
      if (alvoPie.length >= 2) {
        const chartH = Math.min(72, 40 + alvoPie.length * 6);
        ensureSpace(chartH + 12);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9.5);
        pdf.setTextColor(...C.text);
        pdf.text("Distribuição do Valor-Alvo entre as Metas", MARGIN, y);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...C.muted);
        pdf.text("Onde estão concentrados os seus maiores objetivos", MARGIN, y + 4);
        const totalAlvo = alvoPie.reduce((s, a) => s + a.value, 0);
        const img = canvasPie(alvoPie, 1300, Math.round(1300 * chartH / CONTENT_W), {
          centerTop: `R$ ${_compact(totalAlvo)}`,
          centerBottom: "em metas",
          fmtVal: (v) => `R$ ${_compact(v)}`,
        });
        pdf.addImage(img, "PNG", MARGIN, y + 6, CONTENT_W, chartH);
        y += chartH + 8;
      }

      // Linha 4: Evolução Mensal (full)
      if (evolucaoSeries.length > 0 && xLabels.length >= 2) {
        const chartH = 70;
        ensureSpace(chartH + 12);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9.5);
        pdf.setTextColor(...C.text);
        pdf.text("Evolução Mensal das Metas Ativas", MARGIN, y);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...C.muted);
        pdf.text("Trajetória de progresso (%) ao longo dos meses", MARGIN, y + 4);
        const img = canvasMultiLine(xLabels, evolucaoSeries, 1300, 540);
        pdf.addImage(img, "PNG", MARGIN, y + 6, CONTENT_W, chartH);
        y += chartH + 8;
      }

      // Linha 5: Lançamentos por Categoria (rosca)
      const lancByCat = new Map<string, number>();
      metasAll.forEach((m) => {
        (m.history || []).forEach((h) => {
          if (h.date) lancByCat.set(m.sourceTable, (lancByCat.get(m.sourceTable) ?? 0) + 1);
        });
      });
      const lancPie = CAT_DEFS
        .filter((c) => (lancByCat.get(c.key) ?? 0) > 0)
        .map((c) => ({ label: c.label, value: lancByCat.get(c.key) ?? 0, color: c.color }));
      const totalLanc = lancPie.reduce((s, a) => s + a.value, 0);
      if (lancPie.length >= 1 && totalLanc >= 2) {
        const chartH = 58;
        ensureSpace(chartH + 12);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9.5);
        pdf.setTextColor(...C.text);
        pdf.text("Lançamentos por Categoria", MARGIN, y);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...C.muted);
        pdf.text("Volume de registros de acompanhamento por área financeira", MARGIN, y + 4);
        const img = canvasPie(lancPie, 1300, Math.round(1300 * chartH / CONTENT_W), {
          centerTop: String(totalLanc),
          centerBottom: "lançamentos",
          fmtVal: (v) => `${v}`,
        });
        pdf.addImage(img, "PNG", MARGIN, y + 6, CONTENT_W, chartH);
        y += chartH + 8;
      }
    }
  }

  // ── Fechamentos Mensais (linha do tempo)
  if (data.monthlyClosings && data.monthlyClosings.length > 0) {
    const closings = data.monthlyClosings; // ordenado asc por data
    sectionHeader("Fechamentos Mensais", `${closings.length} fechamento${closings.length !== 1 ? "s" : ""} registrado${closings.length !== 1 ? "s" : ""}`, 48);
    paragraph(
      "O fechamento mensal é a foto da sua evolução a cada mês: registramos patrimônio, dívidas, taxa de poupança e o progresso de cada meta. É a linha do tempo da sua jornada — e o que nos guia para ajustar a rota.",
      9,
      C.muted
    );
    y += 1;

    const netOf = (c: { totalAssets?: number; totalDebts?: number }): number | null =>
      c.totalAssets != null ? c.totalAssets - (c.totalDebts ?? 0) : null;
    const first = closings[0], last = closings[closings.length - 1];
    const firstNet = netOf(first), lastNet = netOf(last);
    const totalMetas = closings.reduce((s, c) => s + c.metas.length, 0);

    // Hero — KPIs adaptativos (mostra evolução quando houver dado financeiro)
    const heroCards: Array<{ label: string; value: string; hint?: string; tone: KpiTone }> = [
      { label: "Fechamentos", value: String(closings.length), hint: "fotos mensais registradas", tone: "blue" },
    ];
    if (firstNet != null && lastNet != null && closings.length >= 2) {
      const d = lastNet - firstNet;
      const dpct = firstNet !== 0 ? (d / Math.abs(firstNet)) * 100 : 0;
      heroCards.push({ label: "Patrimônio líquido", value: `R$ ${_compact(lastNet)}`, hint: `de R$ ${_compact(firstNet)} (${d >= 0 ? "+" : ""}${dpct.toFixed(0)}%)`, tone: d >= 0 ? "emerald" : "red" });
    } else if (lastNet != null) {
      heroCards.push({ label: "Patrimônio líquido", value: `R$ ${_compact(lastNet)}`, hint: "último fechamento", tone: "emerald" });
    }
    if (first.savingsRate != null && last.savingsRate != null && closings.length >= 2) {
      heroCards.push({ label: "Taxa de poupança", value: `${last.savingsRate.toFixed(1)}%`, hint: `de ${first.savingsRate.toFixed(1)}%`, tone: last.savingsRate >= first.savingsRate ? "emerald" : "amber" });
    } else if (last.savingsRate != null) {
      heroCards.push({ label: "Taxa de poupança", value: `${last.savingsRate.toFixed(1)}%`, hint: "último fechamento", tone: "blue" });
    }
    if (heroCards.length < 3) {
      heroCards.push({ label: "Metas acompanhadas", value: String(totalMetas), hint: "ao longo dos fechamentos", tone: "muted" });
    }
    drawKpiCards(heroCards.slice(0, 4));

    // Linha do tempo — do mais recente ao mais antigo
    const chipColor = (estado?: string): { bg: [number, number, number]; tx: [number, number, number] } => {
      const e = (estado || "").toLowerCase();
      if (/em dia|conclu|atingid/.test(e)) return { bg: [236, 250, 242], tx: C.success };
      if (/atras|vencid/.test(e)) return { bg: [252, 236, 236], tx: C.danger };
      return { bg: [238, 240, 244], tx: [86, 92, 102] };
    };
    const contentX = MARGIN + 17;
    const contentW = PAGE_W - MARGIN - contentX;
    const ordered = [...closings].reverse();
    ordered.forEach((mc, idx) => {
      const dt = new Date(mc.date + "T12:00:00");
      const day = dt.toLocaleDateString("pt-BR", { day: "2-digit" });
      const monAbbr = dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
      const fullDate = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      const chips = mc.metas.map((m) => {
        const lbl = m.label.length > 24 ? m.label.slice(0, 23) + "…" : m.label;
        return { lbl, ...chipColor(m.estado), w: pdf.getTextWidth(lbl) + 6 };
      });
      const finParts: string[] = [];
      if (netOf(mc) != null) finParts.push(`Patrimônio R$ ${_compact(netOf(mc)!)}`);
      if (mc.totalDebts != null) finParts.push(`Dívidas R$ ${_compact(mc.totalDebts)}`);
      if (mc.savingsRate != null) finParts.push(`Poupança ${mc.savingsRate.toFixed(1)}%`);
      const hasFin = finParts.length > 0;

      const chipH = 5.4, chipGap = 2, chipsTop = hasFin ? 17 : 13;
      let measureX = contentX, rows = chips.length > 0 ? 1 : 1;
      chips.forEach((c) => { if (measureX + c.w > contentX + contentW) { measureX = contentX; rows++; } measureX += c.w + chipGap; });
      const nodeH = chipsTop + rows * (chipH + chipGap) + 1;
      ensureSpace(nodeH + 2);
      const ny = y;

      // Círculo com o dia
      pdf.setFillColor(...C.primary);
      pdf.circle(MARGIN + 6, ny + 5.5, 6, "F");
      pdf.setTextColor(...C.white);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(day, MARGIN + 6, ny + 5.2, { align: "center" });
      pdf.setFontSize(5.2);
      pdf.text(monAbbr, MARGIN + 6, ny + 8.8, { align: "center" });
      // Conector
      if (idx < ordered.length - 1) {
        pdf.setDrawColor(...C.border);
        pdf.setLineWidth(0.4);
        pdf.line(MARGIN + 6, ny + 12, MARGIN + 6, ny + nodeH + 2);
      }
      // Título + contagem
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(fullDate, contentX, ny + 4);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...C.muted);
      pdf.text(`${mc.metas.length} meta${mc.metas.length !== 1 ? "s" : ""} acompanhada${mc.metas.length !== 1 ? "s" : ""}`, contentX, ny + 8.5);
      if (hasFin) {
        pdf.setFontSize(8);
        pdf.setTextColor(...C.text);
        pdf.text(finParts.join("   ·   "), contentX, ny + 13.5);
      }
      // Chips
      if (chips.length === 0) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...C.muted);
        pdf.text("Sem metas registradas neste fechamento.", contentX, ny + chipsTop + 2);
      } else {
        let chx = contentX, chy = ny + chipsTop;
        chips.forEach((c) => {
          if (chx + c.w > contentX + contentW) { chx = contentX; chy += chipH + chipGap; }
          pdf.setFillColor(...c.bg);
          pdf.roundedRect(chx, chy, c.w, chipH, 1.2, 1.2, "F");
          pdf.setTextColor(...c.tx);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          pdf.text(c.lbl, chx + 3, chy + chipH / 2 + 1.1);
          chx += c.w + chipGap;
        });
      }
      y = ny + nodeH + 3;
    });
  }

  // ── Parecer Técnico (análise escrita do consultor)
  if (data.parecer && data.parecer.content) {
    const blocks = htmlToBlocks(data.parecer.content);
    if (blocks.length > 0) {
      sectionHeader("Parecer Técnico", "Análise e recomendações do seu consultor", 34);
      if (data.parecer.title && data.parecer.title.trim()) {
        ensureSpace(10);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(...C.text);
        pdf.text(pdf.splitTextToSize(data.parecer.title.trim(), CONTENT_W), MARGIN, y);
        y += 6;
      }
      for (const b of blocks) {
        if (b.bullet) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(...C.text);
          const lines = pdf.splitTextToSize(b.text, CONTENT_W - 8);
          ensureSpace(lines.length * 4 + 2);
          pdf.setFillColor(...C.accent);
          pdf.circle(MARGIN + 2, y - 1.2, 0.9, "F");
          pdf.text(lines, MARGIN + 6, y);
          y += lines.length * 4 + 1.5;
        } else {
          paragraph(b.text, 9, C.text);
          y += 1;
        }
      }
      y += 2;
    }
  }

  // ── Análise de Metas e Objetivos (gerada pela IA, validada pelo consultor)
  if (data.goalsAnalysisComment && data.goalsAnalysisComment.trim()) {
    ensureSpace(40);
    y += 4;
    pdf.setDrawColor(...C.accent);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN, y, MARGIN + 30, y);
    y += 6;
    pdf.setTextColor(...C.text);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Análise de Metas e Objetivos", MARGIN, y);
    y += 6;
    const paragraphs = data.goalsAnalysisComment.trim().split(/\n\s*\n/);
    for (const p of paragraphs) {
      paragraph(p.replace(/\s+/g, " ").trim(), 9.5, C.text);
      y += 2;
    }
  }

  // ── Glossário Financeiro (educativo)
  {
    sectionHeader("Glossário Financeiro", "Os termos deste relatório, explicados de forma simples", 30);
    const glossary: Array<[string, string]> = [
      ["Patrimônio líquido", "Tudo o que você tem (ativos) menos tudo o que você deve (dívidas). É o seu valor real."],
      ["Taxa de poupança", "Percentual da renda que sobra e é guardado a cada mês. Quanto maior, mais rápido você constrói patrimônio."],
      ["Reserva de emergência", "Dinheiro de fácil acesso para imprevistos. O ideal é ter de 3 a 6 meses das suas despesas guardados."],
      ["Alavancagem", "Quanto do seu patrimônio está comprometido com dívidas. Abaixo de 30% é considerado saudável."],
      ["Liquidez do patrimônio", "Proporção do patrimônio que vira dinheiro rapidamente (ao contrário de imóveis, que demoram a vender)."],
      ["Comprometimento de renda", "Parte da renda mensal usada para pagar parcelas de dívidas. O recomendado é não passar de 30%."],
      ["Valor-alvo", "O valor que você definiu como meta para um objetivo (ex.: R$ 100 mil para a reserva)."],
      ["Juros (a.m.)", "Custo da dívida ao mês. Acima de 5% a.m. é considerado caro e deve ser priorizado na quitação."],
    ];
    glossary.forEach(([term, def]) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      const defLines = pdf.splitTextToSize(def, CONTENT_W - 5);
      const blockH = 4.5 + defLines.length * 3.6 + 2.5;
      ensureSpace(blockH);
      pdf.setFillColor(...C.accent);
      pdf.circle(MARGIN + 1.5, y - 1.2, 0.9, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...C.text);
      pdf.text(term, MARGIN + 5, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...C.muted);
      pdf.text(defLines, MARGIN + 5, y + 4);
      y += blockH;
    });
    y += 2;
  }

  // ── Cronograma de Acompanhamento (próximas fases)
  {
    sectionHeader("Cronograma de Acompanhamento", "As próximas fases da sua jornada financeira", 52);
    paragraph(
      "A consultoria não termina neste relatório. Veja as fases previstas para colocar o plano em prática e manter a evolução constante.",
      9,
      C.muted
    );
    y += 1;
    const phases: Array<{ phase: string; title: string; desc: string; color: [number, number, number] }> = [
      { phase: "Mês 1–2", title: "Implementação das ações prioritárias", desc: "Ajustes de orçamento, renegociação de dívidas e organização da reserva de emergência.", color: C.accent },
      { phase: "Mês 3–4", title: "Estruturação de investimentos", desc: "Direcionamento da poupança, adequação de portfólio ao seu perfil e diversificação.", color: C.primary },
      { phase: "Mês 5–6", title: "Consolidação e ajustes finos", desc: "Revisão dos resultados, ajustes tributários e educação financeira continuada.", color: C.success },
      { phase: "Contínuo", title: "Acompanhamento recorrente", desc: "Registros mensais, evolução de indicadores e realinhamento de metas a cada ciclo.", color: C.muted },
    ];
    phases.forEach((p, i) => {
      const descLines = pdf.splitTextToSize(p.desc, CONTENT_W - 16);
      const blockH = Math.max(13, 9 + descLines.length * 3.6);
      ensureSpace(blockH + 2);
      // Círculo numerado
      pdf.setFillColor(...p.color);
      pdf.circle(MARGIN + 4, y + 4, 4, "F");
      pdf.setTextColor(...C.white);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text(String(i + 1), MARGIN + 4, y + 5.4, { align: "center" });
      // Linha conectora
      if (i < phases.length - 1) {
        pdf.setDrawColor(...C.border);
        pdf.setLineWidth(0.4);
        pdf.line(MARGIN + 4, y + 8.5, MARGIN + 4, y + blockH + 2);
      }
      // Fase + título + descrição
      pdf.setTextColor(...p.color);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.text(p.phase.toUpperCase(), MARGIN + 12, y + 2.5);
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.text(p.title, MARGIN + 12, y + 6.5);
      pdf.setTextColor(...C.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.text(descLines, MARGIN + 12, y + 10.5);
      y += blockH + 3;
    });
    y += 2;
  }

  // ── Fechamento + Assinatura dos consultores
  // O bloco inteiro fica na MESMA página e a assinatura é ancorada ao rodapé,
  // para nunca ficar sozinha/órfã em uma página quase vazia.
  const consultants = data.consultants ?? [];
  ensureSpace(94);

  // Logo Novare (versão escura) centralizado — marca de encerramento do relatório
  if (logoBlack) {
    const ratio = logoBlack.w / logoBlack.h;
    const lh = 13;
    const lw = lh * ratio;
    try { pdf.addImage(logoBlack.dataUrl, "PNG", (PAGE_W - lw) / 2, y, lw, lh); } catch { /* ignora */ }
    y += lh + 7;
  }

  y += 4;
  pdf.setDrawColor(...C.accent);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y, MARGIN + 30, y);
  y += 6;
  pdf.setTextColor(...C.text);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Próximos passos", MARGIN, y);
  y += 6;
  paragraph(
    "Este relatório consolida seu diagnóstico, plano de ação e indicadores de acompanhamento. O próximo passo é simples: manter os lançamentos em dia e revisar os números na sua próxima reunião. A consultoria Novare segue ao seu lado para ajustar a rota sempre que for preciso.",
    9,
    C.muted
  );

  // Marca de fechamento — ancorada acima do rodapé
  const brandSepY = PAGE_H - 24;
  const brandTextY = PAGE_H - 19.5;

  // Assinatura dos consultores — ancorada logo acima da marca
  if (consultants.length > 0) {
    const sigLineY = brandSepY - 14;
    pdf.setTextColor(...C.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.text("Com você nesta jornada,", MARGIN, sigLineY - 13);

    const n = Math.min(consultants.length, 3);
    const colW = CONTENT_W / n;
    const lineW = colW - 12;
    const maxW = lineW - 2;
    const baseH = 10;
    // 1ª passada: gera as imagens e mede; depois usa UMA altura única para todas
    // (assim o tamanho da letra é idêntico — o nome mais longo é quem define a escala)
    const sigImgs = consultants.slice(0, n).map((c) => {
      try { return canvasSignature(c.name); } catch { return null; }
    });
    const maxNatW = Math.max(...sigImgs.map((s) => (s ? baseH * s.aspect : 0)), 1);
    const uniformH = maxNatW > maxW ? baseH * (maxW / maxNatW) : baseH;

    consultants.slice(0, n).forEach((c, i) => {
      const cx = MARGIN + i * colW;
      const s = sigImgs[i];
      if (s) {
        const w = uniformH * s.aspect;
        try { pdf.addImage(s.dataUrl, "PNG", cx + 2, sigLineY - uniformH - 1.5, w, uniformH); } catch { /* ignora */ }
      }
      pdf.setDrawColor(...C.text);
      pdf.setLineWidth(0.3);
      pdf.line(cx, sigLineY, cx + lineW, sigLineY);
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.text(c.name, cx, sigLineY + 4.5);
      const sub = [c.role, c.certs].filter(Boolean).join(" · ");
      if (sub) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...C.muted);
        pdf.text(pdf.splitTextToSize(sub, colW - 6)[0], cx, sigLineY + 8.8);
      }
    });
  }

  pdf.setDrawColor(...C.border);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN, brandSepY, PAGE_W - MARGIN, brandSepY);
  pdf.setTextColor(...C.primary);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("Método Novare · Consultoria Financeira", MARGIN, brandTextY);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...C.muted);
  pdf.text("Documento confidencial · para uso exclusivo do cliente", PAGE_W - MARGIN, brandTextY, { align: "right" });

  // Footer última página
  addFooter();

  // Salvar
  const fileName = `Relatorio_${data.clientName.replace(/\s+/g, "_")}_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  pdf.save(fileName);
}
