/* ============================================
   BS Finances — Quiz Logic + PDF + Sheets
   ============================================ */

// ----- Configuração Google Sheets -----
// 1) Abra um Google Sheets novo com colunas: timestamp, nome, telefone, email, categoria, credito, parcelas, economia, total_consorcio, total_financiamento
// 2) Extensões → Apps Script → cole o código do arquivo google-apps-script.js
// 3) Deploy → New deployment → Web app → Execute as: Me | Access: Anyone → Deploy
// 4) Cole a URL abaixo:
const SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxNz85fQfSgI_SA6ssOVcVQ8D7n1tzc24e4FAiv74YF0lNqif2cP4pzXrZ3lJh2_aqTsw/exec';

// Contato
const CONTACT = {
  whatsapp: '(34) 99923-8855',
  whatsappDigits: '5534999238855',
  instagram: '@bsfinances',
  instagramUrl: 'https://instagram.com/bsfinances'
};

// ----- Category configuration -----
// Base: BB Consórcio (Banco do Brasil) rates — ranking 2026.
// Taxa = Taxa de Administração + Fundo de Reserva (composição média).
// Sem juros, sem IOF. Fonte: bb.com.br/consorcios · idinheiro.com.br.
const CATEGORIES = {
  imovel: {
    name: 'Imóvel',
    icon: 'home',
    minCredit: 50000,
    maxCredit: 10000000,           // Até R$ 10 milhões
    defaultCredit: 500000,
    quickAmounts: [300000, 500000, 1000000, 2500000, 5000000],
    installmentOptions: [120, 150, 180, 200],   // BB: 120 a 200 meses
    financingRateAnnual: 0.115,    // SBPE ~11,5% a.a.
    adminRate: 0.17,               // BB: a partir de 17%
    reserveFund: 0.01,             // Fundo de reserva ~1%
    get consortiumAdminTotal() { return this.adminRate + this.reserveFund; },
    description: 'Casa, apartamento, terreno ou comercial · BB Imóveis'
  },
  veiculo: {
    name: 'Veículo',
    icon: 'car',
    minCredit: 15000,              // BB: a partir de R$ 15 mil
    maxCredit: 500000,
    defaultCredit: 80000,
    quickAmounts: [40000, 60000, 80000, 120000, 200000],
    installmentOptions: [60, 75, 84, 100],       // BB: 84 a 100 meses
    financingRateAnnual: 0.237,    // CDC veículos ~23,7% a.a.
    adminRate: 0.1106,             // BB: a partir de 11,06% (clientes)
    reserveFund: 0.015,
    get consortiumAdminTotal() { return this.adminRate + this.reserveFund; },
    description: 'Carros novos, seminovos ou utilitários · BB Automóveis'
  },
  moto: {
    name: 'Motos',
    icon: 'bike',
    minCredit: 8000,
    maxCredit: 80000,
    defaultCredit: 20000,
    quickAmounts: [12000, 18000, 22000, 35000, 60000],
    installmentOptions: [36, 48, 60, 72],        // BB: 64 a 72 meses
    financingRateAnnual: 0.265,
    adminRate: 0.15,               // BB Motos: ~15%
    reserveFund: 0.02,
    get consortiumAdminTotal() { return this.adminRate + this.reserveFund; },
    description: 'Motocicletas de qualquer cilindrada · BB Motos'
  },
  trator: {
    name: 'Trator',
    icon: 'tractor',
    minCredit: 50000,
    maxCredit: 1500000,
    defaultCredit: 250000,
    quickAmounts: [120000, 180000, 250000, 400000, 700000],
    installmentOptions: [60, 84, 100, 120],      // BB Agro: até 120 meses
    financingRateAnnual: 0.182,
    adminRate: 0.15,               // BB Agro: ~15%
    reserveFund: 0.015,
    get consortiumAdminTotal() { return this.adminRate + this.reserveFund; },
    description: 'Tratores, colheitadeiras, implementos · BB Agro'
  },
  maquinas: {
    name: 'Máquinas',
    icon: 'cog',
    minCredit: 30000,
    maxCredit: 1000000,
    defaultCredit: 150000,
    quickAmounts: [80000, 120000, 150000, 250000, 500000],
    installmentOptions: [60, 84, 100, 120],
    financingRateAnnual: 0.198,
    adminRate: 0.14,               // BB Pesados/Máquinas: ~14%
    reserveFund: 0.015,
    get consortiumAdminTotal() { return this.adminRate + this.reserveFund; },
    description: 'Equipamentos pesados e industriais · BB Pesados'
  }
};

// ----- State -----
const state = {
  currentStep: 1,
  category: null,
  credit: null,
  installments: null,
  lead: { name: '', phone: '', email: '' },
  results: null
};

// ----- Helpers -----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const formatBRL = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const formatNumber = (value) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);

const formatShortBRL = (value) => {
  if (value >= 1000000) {
    const v = value / 1000000;
    return `R$ ${v % 1 === 0 ? v : v.toFixed(1).replace('.', ',')} mi`;
  }
  if (value >= 1000) return `R$ ${Math.round(value / 1000)} mil`;
  return formatBRL(value).replace(',00', '');
};

const formatPercent = (value, decimals = 2) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value * 100) + '%';

const formatPhone = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// ----- Step navigation -----
function goToStep(n) {
  state.currentStep = n;
  $$('.step').forEach((s) => {
    s.classList.toggle('active', Number(s.dataset.step) === n);
  });
  $('#progressFill').style.width = `${(n / 5) * 100}%`;
  $$('.step-label').forEach((l) => {
    const ln = Number(l.dataset.step);
    l.classList.toggle('active', ln === n);
    l.classList.toggle('done', ln < n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ----- Step 1: Categories -----
$$('.category-card[data-category]').forEach((card) => {
  card.addEventListener('click', () => {
    $$('.category-card[data-category]').forEach((c) => c.classList.remove('selected'));
    card.classList.add('selected');
    state.category = card.dataset.category;
    setupCreditStep();
    setTimeout(() => goToStep(2), 280);
  });
});

// ----- Step 2: Credit value -----
function setupCreditStep() {
  const cat = CATEGORIES[state.category];
  state.credit = cat.defaultCredit;

  const slider = $('#creditSlider');
  slider.min = cat.minCredit;
  slider.max = cat.maxCredit;
  // passo adaptativo conforme a faixa
  if (cat.maxCredit >= 2000000) slider.step = 25000;
  else if (cat.maxCredit >= 500000) slider.step = 5000;
  else if (cat.minCredit < 50000) slider.step = 500;
  else slider.step = 5000;
  slider.value = cat.defaultCredit;

  $('#sliderMin').textContent = formatShortBRL(cat.minCredit);
  $('#sliderMax').textContent = formatShortBRL(cat.maxCredit);
  $('#creditCategoryHint').textContent = `${cat.description} · de ${formatShortBRL(cat.minCredit)} até ${formatShortBRL(cat.maxCredit)}`;

  updateCreditDisplay(cat.defaultCredit);
  updateSliderFill();

  // Quick amounts
  const wrap = $('#quickAmounts');
  wrap.innerHTML = '';
  cat.quickAmounts.forEach((amt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quick-btn';
    btn.dataset.amount = amt;
    btn.textContent = formatShortBRL(amt);
    btn.addEventListener('click', () => {
      slider.value = amt;
      state.credit = amt;
      updateCreditDisplay(amt);
      updateSliderFill();
      $$('.quick-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
    wrap.appendChild(btn);
  });
}

function updateCreditDisplay(value) {
  $('#creditValueDisplay').value = formatNumber(value);
  state.credit = value;
}

function updateSliderFill() {
  const slider = $('#creditSlider');
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.backgroundSize = `${pct}% 100%`;
}

$('#creditSlider').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  updateCreditDisplay(v);
  updateSliderFill();
  $$('.quick-btn').forEach((b) => b.classList.remove('active'));
});

$('#creditValueDisplay').addEventListener('input', (e) => {
  const digits = e.target.value.replace(/\D/g, '');
  const n = Number(digits) || 0;
  state.credit = n;
  e.target.value = formatNumber(n);
});

$('#creditValueDisplay').addEventListener('blur', (e) => {
  const cat = CATEGORIES[state.category];
  let v = state.credit;
  if (v < cat.minCredit) v = cat.minCredit;
  if (v > cat.maxCredit) v = cat.maxCredit;
  state.credit = v;
  $('#creditSlider').value = v;
  updateCreditDisplay(v);
  updateSliderFill();
});

// ----- Step 3: Installments -----
function setupInstallmentsStep() {
  const cat = CATEGORIES[state.category];
  const wrap = $('#installmentsGrid');
  wrap.innerHTML = '';
  state.installments = null;

  cat.installmentOptions.forEach((months) => {
    const consorcioParcela = (state.credit * (1 + cat.consortiumAdminTotal)) / months;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'installment-card';
    card.dataset.months = months;
    card.innerHTML = `
      <span class="inst-months">${months}x</span>
      <span class="inst-label">${monthsToLabel(months)}</span>
      <span class="inst-parcela">${formatBRL(consorcioParcela)}</span>
    `;
    card.addEventListener('click', () => {
      $$('.installment-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      state.installments = months;
    });
    wrap.appendChild(card);
  });
}

function monthsToLabel(m) {
  const years = Math.round((m / 12) * 10) / 10;
  return years >= 1 ? `${years} anos` : `${m} meses`;
}

// ----- Calculations -----
function calculate() {
  const cat = CATEGORIES[state.category];
  const principal = state.credit;
  const n = state.installments;

  // Financiamento (Tabela Price)
  const i = Math.pow(1 + cat.financingRateAnnual, 1 / 12) - 1;
  const finParcela = (principal * i) / (1 - Math.pow(1 + i, -n));
  const finTotal = finParcela * n;
  const finJurosTotal = finTotal - principal;

  // Consórcio (admin diluído, sem juros)
  const conTotal = principal * (1 + cat.consortiumAdminTotal);
  const conParcela = conTotal / n;
  const conAdmTotal = conTotal - principal;

  const economy = finTotal - conTotal;
  const economyPercent = economy / principal;

  return {
    category: cat.name,
    categoryDescription: cat.description,
    principal,
    months: n,
    financingRateAnnual: cat.financingRateAnnual,
    adminRate: cat.adminRate,
    reserveFund: cat.reserveFund,
    consortiumAdminTotal: cat.consortiumAdminTotal,
    finParcela,
    finTotal,
    finJurosTotal,
    conParcela,
    conTotal,
    conAdmTotal,
    economy,
    economyPercent
  };
}

// ----- Step 4: Form -----
function updatePreview() {
  const cat = CATEGORIES[state.category];
  $('#previewCategory').textContent = cat?.name || '—';
  $('#previewCredit').textContent = state.credit ? formatBRL(state.credit) : '—';
  $('#previewInstallments').textContent = state.installments ? `${state.installments}x` : '—';
}

$('#leadPhone').addEventListener('input', (e) => {
  e.target.value = formatPhone(e.target.value);
});

function validateLeadForm() {
  let ok = true;
  const name = $('#leadName').value.trim();
  const phone = $('#leadPhone').value.replace(/\D/g, '');
  const email = $('#leadEmail').value.trim();
  const consent = $('#leadConsent').checked;

  // Reset
  $$('.form-field input').forEach((i) => i.classList.remove('invalid'));
  $$('.error-text').forEach((e) => (e.textContent = ''));

  if (name.length < 3) {
    $('#leadName').classList.add('invalid');
    $('#errorName').textContent = 'Informe seu nome completo';
    ok = false;
  }
  if (phone.length < 10) {
    $('#leadPhone').classList.add('invalid');
    $('#errorPhone').textContent = 'Telefone inválido';
    ok = false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    $('#leadEmail').classList.add('invalid');
    $('#errorEmail').textContent = 'E-mail inválido';
    ok = false;
  }
  if (!consent) {
    ok = false;
    alert('É necessário aceitar para continuar.');
  }

  if (ok) {
    state.lead = { name, phone, email };
  }
  return ok;
}

$('#leadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateLeadForm()) return;

  const btn = $('#submitLead');
  btn.classList.add('loading');
  btn.disabled = true;

  state.results = calculate();

  // Envia pro Google Sheets (não-bloqueante)
  sendToSheets().catch((err) => console.warn('Sheets:', err));

  // pequeno delay pra dar feedback visual
  setTimeout(() => {
    renderResults();
    btn.classList.remove('loading');
    btn.disabled = false;
    goToStep(5);
  }, 700);
});

async function sendToSheets() {
  if (!SHEETS_ENDPOINT || SHEETS_ENDPOINT.includes('REPLACE_WITH_YOUR_DEPLOYMENT_ID')) {
    console.info('[Sheets] Endpoint não configurado — configure SHEETS_ENDPOINT em script.js');
    return;
  }

  const r = state.results;
  const payload = {
    timestamp: new Date().toISOString(),
    nome: state.lead.name,
    telefone: state.lead.phone,
    email: state.lead.email,
    categoria: r.category,
    credito: r.principal,
    parcelas: r.months,
    parcela_consorcio: Math.round(r.conParcela * 100) / 100,
    parcela_financiamento: Math.round(r.finParcela * 100) / 100,
    total_consorcio: Math.round(r.conTotal * 100) / 100,
    total_financiamento: Math.round(r.finTotal * 100) / 100,
    economia: Math.round(r.economy * 100) / 100,
    economia_percent: Math.round(r.economyPercent * 10000) / 100,
    origem: location.hostname || 'local'
  };

  // Apps Script Web App aceita POST text/plain pra evitar preflight CORS
  const res = await fetch(SHEETS_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return res;
}

// ----- Step 5: Results -----
function renderResults() {
  const r = state.results;
  $('#resultName').textContent = state.lead.name.split(' ')[0];

  $('#economyValue').textContent = formatBRL(r.economy);
  $('#economyPercent').textContent = formatPercent(r.economyPercent, 1);

  // Financiamento
  $('#finPrincipal').textContent = formatBRL(r.principal);
  $('#finParcela').textContent = `${formatBRL(r.finParcela)} / mês`;
  $('#finJuros').textContent = formatPercent(r.financingRateAnnual, 2);
  $('#finTotalJuros').textContent = `+ ${formatBRL(r.finJurosTotal)}`;
  $('#finTotal').textContent = formatBRL(r.finTotal);

  // Consórcio
  $('#conPrincipal').textContent = formatBRL(r.principal);
  $('#conParcela').textContent = `${formatBRL(r.conParcela)} / mês`;
  $('#conTaxaAdm').textContent = formatPercent(r.adminRate, 2);
  $('#conFundoReserva').textContent = formatPercent(r.reserveFund, 2);
  $('#conTotalAdm').textContent = `+ ${formatBRL(r.conAdmTotal)}`;
  $('#conTotal').textContent = formatBRL(r.conTotal);
}

// ----- Navigation buttons -----
$$('[data-action="back"]').forEach((b) =>
  b.addEventListener('click', () => goToStep(Math.max(1, state.currentStep - 1)))
);

$('[data-action="next-2"]').addEventListener('click', () => {
  if (!state.credit || state.credit < CATEGORIES[state.category].minCredit) {
    alert('Informe um valor de crédito válido.');
    return;
  }
  setupInstallmentsStep();
  goToStep(3);
});

$('[data-action="next-3"]').addEventListener('click', () => {
  if (!state.installments) {
    alert('Selecione uma opção de parcelamento.');
    return;
  }
  updatePreview();
  goToStep(4);
});

$('#restartBtn').addEventListener('click', () => {
  state.category = null;
  state.credit = null;
  state.installments = null;
  state.results = null;
  $$('.category-card').forEach((c) => c.classList.remove('selected'));
  $('#leadForm').reset();
  goToStep(1);
});

// ----- Logo preload (for PDF) -----
let logoDataUrl = null;
function preloadLogo() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    logoDataUrl = canvas.toDataURL('image/png');
  };
  img.src = 'public/logo.png';
}

// ----- PDF Download -----
$('#downloadPdfBtn').addEventListener('click', () => {
  generatePDF();
});

function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const r = state.results;
  const lead = state.lead;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;

  // ----- Colors -----
  const green = [22, 163, 74];
  const greenDark = [21, 83, 45];
  const yellow = [250, 204, 21];
  const yellowDark = [202, 138, 4];
  const slate900 = [15, 23, 42];
  const slate600 = [71, 85, 105];
  const slate200 = [226, 232, 240];
  const slate50 = [248, 250, 252];

  // ===== Header bar =====
  doc.setFillColor(...greenDark);
  doc.rect(0, 0, pageW, 110, 'F');
  doc.setFillColor(...yellow);
  doc.rect(0, 110, pageW, 6, 'F');

  // Logo image
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, 28, 110, 55);
    } catch (e) {
      // fallback to text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('BS Finances', margin, 50);
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('BS Finances', margin, 50);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(220, 252, 231);
  doc.text('Simulação de Consórcio · Comparativo com Financiamento', margin, 95);

  // Date right side
  const today = new Date().toLocaleDateString('pt-BR');
  doc.setTextColor(253, 224, 71);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Gerado em ${today}`, pageW - margin, 50, { align: 'right' });
  doc.setTextColor(220, 252, 231);
  doc.text(`Protocolo: BSF-${Date.now().toString().slice(-8)}`, pageW - margin, 64, { align: 'right' });

  let y = 150;

  // ===== Lead block =====
  doc.setFillColor(...slate50);
  doc.roundedRect(margin, y, pageW - margin * 2, 70, 8, 8, 'F');
  doc.setTextColor(...slate600);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SOLICITANTE', margin + 16, y + 18);

  doc.setTextColor(...slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(lead.name, margin + 16, y + 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...slate600);
  doc.text(`${lead.email}  ·  ${lead.phone}`, margin + 16, y + 56);

  y += 90;

  // ===== Simulation summary =====
  doc.setTextColor(...slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Resumo da Simulação', margin, y);
  y += 8;

  doc.setDrawColor(...slate200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  // 3-col summary
  const cellW = (pageW - margin * 2) / 3;
  const drawSummaryCell = (label, value, x) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...slate600);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...greenDark);
    doc.text(value, x, y + 18);
  };

  drawSummaryCell('Categoria', r.category, margin);
  drawSummaryCell('Crédito', formatBRL(r.principal), margin + cellW);
  drawSummaryCell('Prazo', `${r.months} meses`, margin + cellW * 2);

  y += 50;

  // ===== Economy banner =====
  doc.setFillColor(...green);
  doc.roundedRect(margin, y, pageW - margin * 2, 90, 12, 12, 'F');

  doc.setTextColor(220, 252, 231);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('SUA ECONOMIA AO ESCOLHER CONSÓRCIO', margin + 24, y + 24);

  doc.setTextColor(253, 224, 71); // yellow-300
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(formatBRL(r.economy), margin + 24, y + 56);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Equivalente a ${formatPercent(r.economyPercent, 1)} de rentabilidade sobre o valor do crédito`,
    margin + 24,
    y + 78
  );

  y += 110;

  // ===== Comparison Table =====
  doc.setTextColor(...slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Comparativo Financiamento × Consórcio', margin, y);
  y += 16;

  const tableX = margin;
  const tableW = pageW - margin * 2;
  const colW = tableW / 3;
  const rowH = 28;

  // Table header
  doc.setFillColor(...slate900);
  doc.rect(tableX, y, tableW, rowH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Indicador', tableX + 12, y + 18);
  doc.text('Financiamento', tableX + colW + 12, y + 18);
  doc.text('Consórcio BB', tableX + colW * 2 + 12, y + 18);
  y += rowH;

  const rows = [
    ['Valor do crédito',          formatBRL(r.principal),                       formatBRL(r.principal)],
    ['Parcela mensal',            formatBRL(r.finParcela),                      formatBRL(r.conParcela)],
    ['Quantidade de parcelas',    `${r.months}x`,                               `${r.months}x`],
    ['Taxa administração',        '—',                                          formatPercent(r.adminRate, 2)],
    ['Fundo de reserva',          '—',                                          formatPercent(r.reserveFund, 2)],
    ['Juros a.a.',                `${formatPercent(r.financingRateAnnual, 2)} a.a.`, 'Sem juros'],
    ['Custo adicional',           formatBRL(r.finJurosTotal),                   formatBRL(r.conAdmTotal)],
    ['Total pago ao final',       formatBRL(r.finTotal),                        formatBRL(r.conTotal)]
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  rows.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(...slate50);
      doc.rect(tableX, y, tableW, rowH, 'F');
    }
    doc.setTextColor(...slate600);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], tableX + 12, y + 18);

    doc.setTextColor(...slate900);
    doc.text(row[1], tableX + colW + 12, y + 18);

    // Last row highlighted
    if (idx === rows.length - 1) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...greenDark);
    }
    doc.text(row[2], tableX + colW * 2 + 12, y + 18);

    y += rowH;
  });

  // Border around table
  doc.setDrawColor(...slate200);
  doc.setLineWidth(0.5);
  doc.rect(tableX, y - rowH * (rows.length + 1), tableW, rowH * (rows.length + 1));

  y += 18;

  // ===== Benefits row =====
  if (y > pageH - 200) {
    doc.addPage();
    y = margin;
  }

  doc.setTextColor(...slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Por que o Consórcio?', margin, y);
  y += 14;

  const benefits = [
    'Sem juros — você paga apenas a taxa de administração',
    'Parcelas menores — mais fôlego no orçamento mensal',
    'Possibilidade de lance livre para antecipar a contemplação',
    'FGTS aceito como lance ou para quitação (imóveis)'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...slate600);
  benefits.forEach((b) => {
    doc.setFillColor(...green);
    doc.circle(margin + 4, y + 4, 2.5, 'F');
    doc.text(b, margin + 14, y + 7);
    y += 18;
  });

  y += 12;

  // ===== Disclaimer =====
  if (y > pageH - 130) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(254, 252, 232); // yellow-50
  doc.roundedRect(margin, y, pageW - margin * 2, 100, 8, 8, 'F');

  doc.setDrawColor(...yellowDark);
  doc.setLineWidth(3);
  doc.line(margin, y, margin, y + 100);
  doc.setLineWidth(0.5);

  doc.setTextColor(...yellowDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('OBSERVAÇÃO IMPORTANTE', margin + 16, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...slate900);
  const disclaimerText = 'Valores sujeitos a taxas administrativas vigentes. Apenas simulação, para valor real consultar taxas vigentes. Cálculo baseado nas taxas públicas do BB Consórcio (Banco do Brasil) — a taxa efetiva pode variar conforme segmento do cliente, grupo e data da contratação.';
  const wrapped = doc.splitTextToSize(disclaimerText, pageW - margin * 2 - 32);
  doc.text(wrapped, margin + 16, y + 40);

  y += 120;

  // ===== Contato =====
  if (y > pageH - 160) {
    doc.addPage();
    y = margin;
  }

  // Faixa de contato
  doc.setFillColor(...greenDark);
  doc.roundedRect(margin, y, pageW - margin * 2, 110, 12, 12, 'F');

  // Destaque amarelo no topo
  doc.setFillColor(...yellow);
  doc.rect(margin + 12, y + 12, 4, 86, 'F');

  doc.setTextColor(253, 224, 71);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('FALE CONOSCO', margin + 28, y + 24);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Pronto para dar o próximo passo?', margin + 28, y + 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(220, 252, 231);
  doc.text('Nossa equipe vai te orientar em cada etapa:', margin + 28, y + 64);

  // WhatsApp line
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('WhatsApp:', margin + 28, y + 86);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(253, 224, 71);
  doc.textWithLink(CONTACT.whatsapp, margin + 92, y + 86, {
    url: `https://wa.me/${CONTACT.whatsappDigits}`
  });

  // Instagram line
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Instagram:', margin + 260, y + 86);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(253, 224, 71);
  doc.textWithLink(CONTACT.instagram, margin + 324, y + 86, {
    url: CONTACT.instagramUrl
  });

  // Mini logo right side
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', pageW - margin - 90, y + 32, 70, 35);
    } catch (e) { /* silent */ }
  }

  y += 130;

  // ===== Footer =====
  doc.setDrawColor(...slate200);
  doc.line(margin, pageH - 40, pageW - margin, pageH - 40);

  doc.setTextColor(...slate600);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('BS Finances · Consórcios · Simulação Online', margin, pageH - 24);
  doc.text(`Página 1`, pageW - margin, pageH - 24, { align: 'right' });

  // ----- Save -----
  const safeName = lead.name.replace(/\s+/g, '_').replace(/[^\w]/g, '');
  doc.save(`BS_Finances_Simulacao_${safeName}.pdf`);
}

// ----- Init -----
document.addEventListener('DOMContentLoaded', () => {
  preloadLogo();
  goToStep(1);
});
