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

// Helper para criar canvas em alta resolução (2x DPR)
const _mkCanvas = (pw: number, ph: number): { ctx: CanvasRenderingContext2D; cvs: HTMLCanvasElement } => {
  const dpr = 2;
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
const _compact = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return `${v.toFixed(0)}`;
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
  const cx = pw * 0.30;
  const cy = ph / 2;
  const OR = Math.min(pw * 0.27, ph * 0.42);
  const IR = OR * 0.55;

  // Sombra suave atrás do donut
  ctx.save();
  ctx.shadowColor = "rgba(20, 30, 50, 0.18)";
  ctx.shadowBlur = 10;
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
    // Separadores brancos de 3px
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
  ctx.fillStyle = "#1e3a5f";
  ctx.font = `bold ${Math.max(Math.round(pw * 0.05), 14)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(String(items.length), cx, cy - 2);
  ctx.fillStyle = "#787880";
  ctx.font = `${Math.max(Math.round(pw * 0.025), 9)}px Arial`;
  ctx.fillText("categorias", cx, cy + 12);
  // Label da maior
  if (biggest && items.length <= 12) {
    ctx.font = `${Math.max(Math.round(pw * 0.022), 9)}px Arial`;
    ctx.fillStyle = "#a0a0a8";
    ctx.fillText(biggest.label.slice(0, 14), cx, cy + 24);
  }

  // Legenda à direita
  const lx = pw * 0.62;
  const fs = Math.max(Math.round(pw * 0.028), 10);
  ctx.font = `${fs}px Arial`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const maxI = Math.min(items.length, 8);
  const rowH = Math.min((ph - 20) / maxI, fs * 1.7);
  const startY = cy - ((maxI - 1) * rowH) / 2;
  const sorted = items.slice().sort((a, b) => b.value - a.value).slice(0, maxI);
  sorted.forEach((it, i) => {
    const orig = items.indexOf(it);
    const color = CP[orig % CP.length];
    const ly = startY + i * rowH;
    // Círculo
    ctx.beginPath();
    ctx.arc(lx + 4, ly, 4, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    // Texto
    const pct = ((it.value / total) * 100).toFixed(0);
    ctx.fillStyle = "#404050";
    ctx.font = `${fs}px Arial`;
    const lbl = it.label.length > 16 ? it.label.slice(0, 16) + "…" : it.label;
    ctx.fillText(lbl, lx + 12, ly);
    // Porcentagem em negrito
    ctx.fillStyle = color;
    ctx.font = `bold ${fs}px Arial`;
    ctx.textAlign = "right";
    ctx.fillText(`${pct}%`, pw - 6, ly);
    ctx.textAlign = "left";
  });

  return cvs.toDataURL("image/png");
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

  return cvs.toDataURL("image/png");
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

  return cvs.toDataURL("image/png");
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

  return cvs.toDataURL("image/png");
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

  return cvs.toDataURL("image/png");
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

  return cvs.toDataURL("image/png");
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
  const addHeader = () => {
    pdf.setFillColor(...C.primary);
    pdf.rect(0, 0, PAGE_W, 10, "F");
    // Logo branca pequena no header
    if (logoWhite) {
      const ratio = logoWhite.w / logoWhite.h;
      const h = 5;
      const w = h * ratio;
      try { pdf.addImage(logoWhite.dataUrl, "PNG", MARGIN, 2.5, w, h); } catch {}
    }
    pdf.setTextColor(...C.white);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text("Relatório de Consultoria", PAGE_W / 2, 6.5, { align: "center" });
    pdf.text(data.clientName, PAGE_W - MARGIN, 6.5, { align: "right" });
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

  const sectionHeader = (title: string, subtitle?: string) => {
    sectionNum++;
    ensureSpace(20);
    // Bullet com número
    pdf.setFillColor(...C.primary);
    pdf.roundedRect(MARGIN, y, 8, 8, 1.5, 1.5, "F");
    pdf.setTextColor(...C.white);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(String(sectionNum), MARGIN + 4, y + 5.7, { align: "center" });

    pdf.setTextColor(...C.text);
    pdf.setFontSize(13);
    pdf.text(title, MARGIN + 12, y + 4);
    if (subtitle) {
      pdf.setTextColor(...C.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.text(subtitle, MARGIN + 12, y + 8.5);
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
    const h = 14;
    const w = h * ratio;
    try { pdf.addImage(logoWhite.dataUrl, "PNG", MARGIN, 28, w, h); } catch {}
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
  sectionHeader("Classificação de Risco", "Saúde financeira baseada na capacidade de poupança");
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

    // Composição da Renda à direita
    const savings = Math.max(0, data.totalIncome * (data.savingsRate / 100));
    const stackedImg = canvasBarStacked(
      {
        income: data.totalIncome,
        expenses: data.totalExpenses + data.monthlyDebtPayments,
        savings,
      },
      520, 320
    );
    pdf.addImage(stackedImg, "PNG", MARGIN + halfW + 4, y, halfW, blockH);

    y += blockH + 4;
  }

  // ── 3. Balanço Patrimonial
  sectionHeader("Balanço Patrimonial", "Visão consolidada de ativos e passivos");
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
        const chartH = Math.min(assetBars.length * 10 + 12, 76);
        ensureSpace(chartH + 4);
        const img = canvasBarH(assetBars, 1100, assetBars.length * 38 + 24, fmt);
        pdf.addImage(img, "PNG", MARGIN, y, CONTENT_W, chartH);
        y += chartH + 6;
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
          i.description + (i.is_primary ? "  ★" : ""),
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
  pdf.text("Receitas − Despesas − Parcelas", MARGIN + 5, y + 12);
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

  // Gráficos do fluxo de caixa — barra de comparação + donut de despesas
  {
    const halfW = (CONTENT_W - 4) / 2;
    const chartH = 60;

    // Barra de comparação: Receitas | Despesas | Saldo
    const flowBars = [
      { label: "Receitas",  value: data.totalIncome,    color: "#16a34a" },
      { label: "Despesas",  value: data.totalExpenses + data.monthlyDebtPayments, color: "#dc2626" },
      { label: "Saldo",     value: Math.max(data.netCashFlow, 0), color: data.netCashFlow >= 0 ? "#2563eb" : "#d97706" },
    ];

    ensureSpace(chartH + 6);

    // Barra de comparação à esquerda
    const barImg = canvasBarV(flowBars, 640, 360, fmt);
    pdf.addImage(barImg, "PNG", MARGIN, y, halfW, chartH);

    // Donut de despesas à direita
    if (data.expensesByCategory.length >= 2) {
      const donutImg = canvasDonut(
        data.expensesByCategory.map((e) => ({ label: e.category, value: e.amount })),
        680, 360
      );
      pdf.addImage(donutImg, "PNG", MARGIN + halfW + 4, y, halfW, chartH);
    }

    y += chartH + 4;
  }

  // ── 5. Mapa de Dívidas
  if (data.debts.length > 0) {
    sectionHeader("Mapa de Dívidas", `${data.debts.length} dívida${data.debts.length !== 1 ? "s" : ""} ativa${data.debts.length !== 1 ? "s" : ""}`);
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
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 8 },
      alternateRowStyles: { fillColor: C.bgSoft },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;
  }

  // ── 6. Proteção e Seguros
  if (data.insurance.length > 0) {
    sectionHeader("Proteção e Seguros", "Cobertura de riscos e seguros ativos");
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
    y = (pdf as any).lastAutoTable.finalY + 6;
  }

  // ── 7. Objetivos Financeiros
  if (data.goals.length > 0) {
    sectionHeader(
      "Objetivos Financeiros",
      `${data.goals.length} objetivo${data.goals.length !== 1 ? "s" : ""} • Progresso: ${data.planPct}%`
    );

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

    data.goals.forEach((g) => {
      ensureSpace(20);
      pdf.setDrawColor(...C.border);
      pdf.setFillColor(...C.white);
      pdf.roundedRect(MARGIN, y, CONTENT_W, 18, 2, 2, "FD");

      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      const gtitle = pdf.splitTextToSize(g.description, CONTENT_W - 50)[0];
      pdf.text(gtitle, MARGIN + 4, y + 5.5);

      // Prioridade
      const prio = (g.priority || "media").toLowerCase();
      const prioColor = prio === "alta" ? C.danger : prio === "baixa" ? [37, 99, 235] as [number, number, number] : C.warning;
      const prioLabel = prio === "alta" ? "Alta" : prio === "baixa" ? "Baixa" : "Média";
      pdf.setFillColor(...prioColor);
      pdf.setGState(pdf.GState({ opacity: 0.12 }));
      pdf.roundedRect(PAGE_W - MARGIN - 22, y + 2.5, 18, 4.5, 1, 1, "F");
      pdf.setGState(pdf.GState({ opacity: 1 }));
      pdf.setTextColor(...prioColor);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(prioLabel, PAGE_W - MARGIN - 13, y + 5.5, { align: "center" });

      // Subline
      pdf.setTextColor(...C.muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      const meta: string[] = [];
      if (g.target_amount) meta.push(`Meta: ${fmt(g.target_amount)}`);
      if (g.deadline) meta.push(`Prazo: ${new Date(g.deadline).toLocaleDateString("pt-BR")}`);
      meta.push(`${g.tasksDone}/${g.tasksTotal} ações`);
      pdf.text(meta.join("  •  "), MARGIN + 4, y + 10);

      // Progress bar
      pdf.setFillColor(220, 220, 225);
      pdf.roundedRect(MARGIN + 4, y + 13, CONTENT_W - 30, 1.8, 0.8, 0.8, "F");
      pdf.setFillColor(...C.accent);
      pdf.roundedRect(MARGIN + 4, y + 13, ((CONTENT_W - 30) * g.pct) / 100, 1.8, 0.8, 0.8, "F");
      pdf.setTextColor(...C.text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(`${g.pct}%`, PAGE_W - MARGIN - 4, y + 14.5, { align: "right" });

      y += 22;
    });
  }

  // ── 8. Plano de Ação
  if (data.actionItems.length > 0) {
    sectionHeader("Plano de Ação", `${data.completedActions}/${data.totalActions} ações concluídas`);

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
      const aChartH = Math.min(topActions.length * 10 + 14, 76);
      ensureSpace(aChartH + 8);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...C.text);
      pdf.text("Top ações por impacto financeiro", MARGIN, y);
      y += 4;

      const img = canvasBarH(topActions, 1100, topActions.length * 38 + 24, fmt);
      pdf.addImage(img, "PNG", MARGIN, y, CONTENT_W, aChartH);
      y += aChartH + 4;
    }
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
          ? `Objetivo entrelaçado: ${data.activePlan.objective}`
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
          ? pdf.splitTextToSize(`→ ${a.objective}`, CONTENT_W - 14)
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

    const rateBars = rateSorted.map((s) => {
      const v = s.savings_rate!;
      const color = v >= 30 ? "#16a34a" : v >= 10 ? "#2563eb" : v >= 0 ? "#d97706" : "#dc2626";
      const lbl = new Date(s.snapshot_date).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      return { label: lbl, value: Math.max(v, 0.1), color };
    });

    const rChartMmH = 70;
    ensureSpace(rChartMmH + 6);
    const rImg = canvasBarV(rateBars, Math.max(rateBars.length * 110 + 80, 720), 360, (v) => `${v.toFixed(0)}%`);
    pdf.addImage(rImg, "PNG", MARGIN, y, CONTENT_W, rChartMmH);
    y += rChartMmH + 4;

    ensureSpace(14);
    pdf.setFillColor(...C.bgSoft);
    pdf.roundedRect(MARGIN, y, CONTENT_W, 12, 2, 2, "F");
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(...C.muted);
    pdf.text(
      `Início: ${firstRate.toFixed(1)}%   ·   Atual: ${lastRate.toFixed(1)}%   ·   Variação: ${deltaRate >= 0 ? "+" : ""}${deltaRate.toFixed(1)} p.p.   ·   Média: ${avgRate.toFixed(1)}%`,
      MARGIN + 4, y + 7.5
    );
    y += 18;
  }

  // ── Acompanhamento de Metas
  if (data.parecerMetas && data.parecerMetas.length > 0) {
    ensureSpace(20);
    sectionHeader("Acompanhamento de Metas", `${data.parecerMetas.length} metas definidas`);

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
    y += 4;
  }

  // ── Fechamentos Mensais
  if (data.monthlyClosings && data.monthlyClosings.length > 0) {
    sectionHeader("Fechamentos Mensais", `${data.monthlyClosings.length} fechamento${data.monthlyClosings.length !== 1 ? "s" : ""} registrado${data.monthlyClosings.length !== 1 ? "s" : ""}`);

    autoTable(pdf, {
      startY: y,
      head: [["Período", "Ativos", "Dívidas", "Poupança", "Metas Registradas"]],
      body: data.monthlyClosings.map((mc) => [
        new Date(mc.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
        mc.totalAssets != null ? fmt(mc.totalAssets) : "—",
        mc.totalDebts != null ? fmt(mc.totalDebts) : "—",
        mc.savingsRate != null ? fmtPct(mc.savingsRate) : "—",
        `${mc.metas.length} item${mc.metas.length !== 1 ? "s" : ""}`,
      ]),
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 8 },
      alternateRowStyles: { fillColor: C.bgSoft },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "center" } },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => { addHeader(); },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;

    for (const mc of data.monthlyClosings) {
      if (mc.metas.length === 0) continue;
      const periodLabel = new Date(mc.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      ensureSpace(14 + mc.metas.length * 7);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(...C.text);
      pdf.text(`Detalhes — ${periodLabel}`, MARGIN, y);
      y += 4;

      autoTable(pdf, {
        startY: y,
        head: [["Meta", "Valor", "Estado", "Progresso"]],
        body: mc.metas.map((m) => [
          m.label.length > 40 ? m.label.slice(0, 40) + "…" : m.label,
          m.valor != null ? fmt(m.valor) : "—",
          m.estado || "—",
          m.pct != null ? `${m.pct}%` : "—",
        ]),
        theme: "plain",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: C.bgSoft, textColor: C.muted, fontSize: 7.5, fontStyle: "bold" },
        columnStyles: { 1: { halign: "right" }, 3: { halign: "right" } },
        margin: { left: MARGIN + 4, right: MARGIN },
        didDrawPage: () => { addHeader(); },
      });
      y = (pdf as any).lastAutoTable.finalY + 6;
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

  // ── Fechamento
  ensureSpace(30);
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
    "Este relatório consolida o diagnóstico, plano e indicadores do seu acompanhamento financeiro. Recomendamos revisão a cada 90 dias para reavaliar metas, atualizar dados e ajustar o plano conforme novas oportunidades.",
    9,
    C.muted
  );

  // Footer última página
  addFooter();

  // Salvar
  const fileName = `Relatorio_${data.clientName.replace(/\s+/g, "_")}_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  pdf.save(fileName);
}
