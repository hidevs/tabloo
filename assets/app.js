/* global document, window */

// Keep JSON traffic off GitHub Pages. Raw GitHub's shorter cache window is preferable
// to the optional jsDelivr mirror for these frequently refreshed market snapshots.
const PUBLIC_ROOT = 'https://raw.githubusercontent.com/iran-market/iran-market.github.io/main/data';
const DATA_ROOT = PUBLIC_ROOT;
const POPULAR_SYMBOLS = new Set(['USD_IRR_FREE', 'GOLD_18K_IRR', 'COIN_EMAMI_IRR', 'USDT_IRR', 'EUR_IRR_FREE', 'GBP_IRR_FREE']);

const state = {
  all: [],
  popular: [],
  category: 'popular',
  query: '',
  historySymbol: 'USD_IRR_FREE',
  historyRange: 365,
  history: new Map(),
  historyDirectory: [],
  endpoint: 'popular',
  language: 'js',
  symbols: [],
  symbolQuery: '',
  symbolCategory: 'all',
  symbolLiveOnly: true,
  symbolLimit: 80,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const faNumber = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 });
const faDateTime = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' });
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const iconSvg = (name) => `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#icon-${name}"></use></svg>`;

async function json(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function flattenSnapshot(payload) {
  return Object.values(payload?.data?.categories ?? {}).flat();
}

function showToast(message = 'کپی شد') {
  const toast = $('#toast');
  toast.querySelector('span').textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1700);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast();
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    showToast();
  }
}

function iconFor(symbol) {
  const known = { USD_IRR_FREE: '$', EUR_IRR_FREE: '€', GBP_IRR_FREE: '£', GOLD_18K_IRR: 'Au', COIN_EMAMI_IRR: 'IR', USDT_IRR: '₮' };
  return known[symbol] ?? symbol.split('_')[0].slice(0, 2);
}

function categoryMatches(item, category) {
  if (category === 'popular') return POPULAR_SYMBOLS.has(item.symbol);
  if (category === 'all') return true;
  if (category === 'gold') return ['gold', 'coin', 'precious_metal'].includes(item.category);
  if (category === 'commodity') return ['commodity', 'energy', 'index'].includes(item.category);
  return item.category === category;
}

function filteredQuotes() {
  const source = state.category === 'popular' ? state.popular : state.all;
  const query = state.query.trim().toLocaleLowerCase('fa');
  return source.filter((item) => {
    const categoryOk = state.category === 'popular' || categoryMatches(item, state.category);
    const haystack = `${item.symbol} ${item.name_fa ?? ''} ${item.name_en ?? ''}`.toLocaleLowerCase('fa');
    return categoryOk && (!query || haystack.includes(query));
  });
}

function quoteCard(item) {
  const change = Number(item.change_pct ?? 0);
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const sign = change > 0 ? '+' : '';
  const currency = item.currency === 'IRT' ? 'تومان' : item.currency === 'IRR' ? 'ریال' : item.currency;
  return `<article class="market-card">
    <div class="card-head">
      <span class="symbol-icon">${escapeHtml(iconFor(item.symbol))}</span>
      <span class="card-name"><b>${escapeHtml(item.name_fa || item.symbol)}</b><small>${escapeHtml(item.symbol)}</small></span>
      <span class="change ${direction}">${sign}${faNumber.format(change)}%</span>
    </div>
    <div class="card-price">${item.price == null ? '—' : faNumber.format(item.price)} <small>${escapeHtml(currency)}</small></div>
  </article>`;
}

function renderMarket() {
  const items = filteredQuotes();
  const grid = $('#market-grid');
  grid.innerHTML = items.length ? items.slice(0, 12).map(quoteCard).join('') : '<div class="empty">نمادی با این عبارت پیدا نشد.</div>';
  $('#result-count').textContent = items.length > 12 ? `نمایش ۱۲ مورد از ${faNumber.format(items.length)} نماد` : `${faNumber.format(items.length)} نماد`;
}

function relativeFreshness(date) {
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 2) return 'همین حالا به‌روزرسانی شده';
  if (minutes < 60) return `${faNumber.format(minutes)} دقیقه پیش به‌روزرسانی شده`;
  return `آخرین انتشار: ${faDateTime.format(date)}`;
}

async function loadMarkets() {
  try {
    const [snapshot, popular] = await Promise.all([
      json(`${DATA_ROOT}/latest-toman.json`),
      json(`${DATA_ROOT}/popular.json`),
    ]);
    state.all = flattenSnapshot(snapshot);
    state.popular = popular.data ?? state.all.filter((item) => POPULAR_SYMBOLS.has(item.symbol));
    const published = new Date(popular.meta?.published_at ?? snapshot.meta?.published_at ?? snapshot.data?.generated_at);
    $('#freshness span:last-child').textContent = Number.isNaN(published.getTime()) ? 'دادهٔ بازار آماده است' : relativeFreshness(published);
    $('#instrument-count').textContent = `+${faNumber.format(state.all.length)}`;
    renderMarket();
  } catch (error) {
    $('#market-grid').innerHTML = '<div class="empty">دریافت داده موقتاً ممکن نیست؛ فایل JSON همچنان از لینک مستقیم قابل بررسی است.</div>';
    $('#result-count').textContent = 'خطا در دریافت داده';
    $('#freshness span:last-child').textContent = 'ارتباط با فایل داده برقرار نشد';
    console.error('market data load failed', error);
  }
}

const categoryNames = {
  currency: 'ارز',
  gold: 'طلا',
  coin: 'سکه',
  precious_metal: 'فلز گران‌بها',
  crypto: 'رمزارز',
  commodity: 'کالا',
  energy: 'انرژی',
  index: 'شاخص',
  stock: 'سهام',
  fund: 'صندوق',
  bond: 'اوراق',
  economic_indicator: 'شاخص اقتصادی',
  other: 'سایر',
};

function categoryName(category) {
  return categoryNames[category] ?? category;
}

function filteredSymbols() {
  const query = state.symbolQuery.trim().toLocaleLowerCase('fa');
  return state.symbols.filter((item) => {
    if (state.symbolLiveOnly && !item.has_latest) return false;
    if (state.symbolCategory !== 'all' && item.category !== state.symbolCategory) return false;
    const haystack = `${item.symbol} ${item.name_fa ?? ''} ${item.name_en ?? ''}`.toLocaleLowerCase('fa');
    return !query || haystack.includes(query);
  });
}

function symbolRow(item) {
  const name = item.name_fa || item.name_en;
  const unit = item.currency === 'IRR' ? 'ریال' : item.currency;
  const latest = item.has_latest
    ? `<a class="data-badge live" href="${PUBLIC_ROOT}/latest.json">${iconSvg('activity')}قیمت فعلی</a>`
    : `<span class="data-badge muted">${iconSvg('circle-x')}بدون قیمت فعلی</span>`;
  const history = item.history_file
    ? ` <a class="data-badge history" href="${PUBLIC_ROOT}/${escapeHtml(item.history_file)}">${iconSvg('history')}تاریخچه</a>`
    : '';
  return `<tr>
    <td><code>${escapeHtml(item.symbol)}</code></td>
    <td>${name ? escapeHtml(name) : '<span class="unresolved-name">نام حل‌نشده</span>'}</td>
    <td>${escapeHtml(categoryName(item.category))}</td>
    <td><span dir="ltr">${escapeHtml(unit)}</span></td>
    <td>${latest}${history}</td>
  </tr>`;
}

function renderSymbols() {
  const items = filteredSymbols();
  const visible = items.slice(0, state.symbolLimit);
  $('#symbols-body').innerHTML = visible.length
    ? visible.map(symbolRow).join('')
    : '<tr><td colspan="5">نمادی با این فیلتر پیدا نشد.</td></tr>';
  $('#symbol-summary').textContent = `${faNumber.format(items.length)} شناسه مطابق فیلتر؛ ${faNumber.format(state.symbols.filter((item) => item.has_latest).length)} شناسه دارای قیمت فعلی`;
  $('#symbols-more').hidden = visible.length >= items.length;
}

async function loadSymbols() {
  try {
    const payload = await json(`${DATA_ROOT}/symbols.json`);
    state.symbols = [...(payload.data ?? [])].sort((a, b) => {
      const aNamed = Boolean(a.name_fa || a.name_en);
      const bNamed = Boolean(b.name_fa || b.name_en);
      if (aNamed !== bNamed) return aNamed ? -1 : 1;
      return a.category.localeCompare(b.category) || a.symbol.localeCompare(b.symbol);
    });
    const select = $('#symbol-category');
    const categories = [...new Set(state.symbols.map((item) => item.category))].sort();
    select.insertAdjacentHTML(
      'beforeend',
      categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(categoryName(category))}</option>`).join(''),
    );
    renderSymbols();
  } catch (error) {
    $('#symbols-body').innerHTML = '<tr><td colspan="5">دریافت راهنمای نمادها موقتاً ممکن نیست.</td></tr>';
    $('#symbol-summary').textContent = 'خطا در دریافت symbols.json';
    $('#symbols-more').hidden = true;
    console.error('symbol catalog load failed', error);
  }
}

const historyNames = new Map([
  ['USD_IRR_FREE', 'دلار آزاد'],
  ['GOLD_18K_IRR', 'طلای ۱۸ عیار'],
  ['COIN_EMAMI_IRR', 'سکه امامی'],
  ['USDT_IRR', 'تتر'],
]);

function historyLabel(symbol) {
  return historyNames.get(symbol) ?? symbol;
}

function historyCurrency(symbol) {
  const entry = state.historyDirectory.find((item) => item.symbol === symbol);
  const currency = entry?.currency ?? state.history.get(symbol)?.meta?.currency;
  if (currency === 'IRT') return 'تومان';
  if (currency === 'IRR') return 'ریال';
  return currency || '';
}

function chartPoints() {
  const all = state.history.get(state.historySymbol)?.data ?? [];
  if (state.historyRange === 'all') return all;
  return all.slice(-Number(state.historyRange));
}

function drawChart() {
  const canvas = $('#history-chart');
  const wrap = canvas.parentElement;
  const points = chartPoints().filter((item) => Number.isFinite(Number(item.close)));
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(300, wrap.clientWidth);
  const height = Math.max(220, wrap.clientHeight);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);
  if (points.length < 2) {
    ctx.fillStyle = '#91a49d';
    ctx.font = '13px Vazirmatn';
    ctx.textAlign = 'center';
    ctx.fillText('دادهٔ کافی برای نمودار موجود نیست', width / 2, height / 2);
    return;
  }

  const values = points.map((item) => Number(item.close));
  let min = Math.min(...values);
  let max = Math.max(...values);
  const padding = Math.max((max - min) * 0.08, 1);
  min -= padding;
  max += padding;
  const x = (index) => 10 + (index / (points.length - 1)) * (width - 20);
  const y = (value) => 8 + ((max - value) / (max - min)) * (height - 22);

  ctx.strokeStyle = 'rgba(224,255,237,.065)';
  ctx.lineWidth = 1;
  for (let row = 1; row < 5; row += 1) {
    const gy = (height / 5) * row;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
  }

  const area = ctx.createLinearGradient(0, 0, 0, height);
  area.addColorStop(0, 'rgba(185,255,102,.28)');
  area.addColorStop(1, 'rgba(185,255,102,0)');
  ctx.beginPath();
  points.forEach((item, index) => index ? ctx.lineTo(x(index), y(Number(item.close))) : ctx.moveTo(x(index), y(Number(item.close))));
  ctx.lineTo(width - 10, height); ctx.lineTo(10, height); ctx.closePath();
  ctx.fillStyle = area; ctx.fill();

  ctx.beginPath();
  points.forEach((item, index) => index ? ctx.lineTo(x(index), y(Number(item.close))) : ctx.moveTo(x(index), y(Number(item.close))));
  ctx.strokeStyle = '#b9ff66'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  canvas._chart = { points, x, y, width };

  const last = points.at(-1);
  $('#chart-name').textContent = historyLabel(state.historySymbol);
  $('#chart-price').textContent = `${faNumber.format(last.close)} ${historyCurrency(state.historySymbol)}`.trim();
  $('#chart-start').textContent = points[0].date_jalali ?? points[0].t.slice(0, 10);
  $('#chart-end').textContent = last.date_jalali ?? last.t.slice(0, 10);
}

async function loadHistory(symbol) {
  state.historySymbol = symbol;
  if (!state.history.has(symbol)) {
    try {
      const payload = await json(`${DATA_ROOT}/history/${symbol}.json`);
      state.history.set(symbol, payload);
    } catch (error) {
      state.history.set(symbol, { data: [], meta: {} });
      console.error('history load failed', error);
    }
  }
  drawChart();
}

function chartHover(event) {
  const chart = event.currentTarget._chart;
  const tooltip = $('#chart-tooltip');
  if (!chart?.points?.length) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const relativeX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
  const index = Math.round((relativeX / rect.width) * (chart.points.length - 1));
  const point = chart.points[index];
  tooltip.innerHTML = `<b>${faNumber.format(point.close)} ${escapeHtml(historyCurrency(state.historySymbol))}</b><br><span>${escapeHtml(point.date_jalali ?? point.t.slice(0, 10))}</span>`;
  tooltip.style.display = 'block';
  tooltip.style.left = `${Math.min(relativeX + 12, rect.width - 145)}px`;
  tooltip.style.top = `${Math.max(8, event.clientY - rect.top - 48)}px`;
}

const endpointPaths = {
  popular: 'popular.json',
  latest: 'latest-toman.json',
  symbols: 'symbols.json',
  histories: 'history/index.json',
  usd: 'history/USD_IRR_FREE.json',
  gold: 'history/GOLD_18K_IRR.json',
};

async function loadHistoryDirectory() {
  try {
    const payload = await json(`${DATA_ROOT}/history/index.json`);
    state.historyDirectory = [...(payload.data ?? [])].sort((a, b) => {
      const categoryOrder = ['currency', 'gold', 'coin', 'precious_metal', 'crypto', 'energy', 'commodity', 'index'];
      const categoryDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      return categoryDiff || historyLabel(a.symbol).localeCompare(historyLabel(b.symbol), 'fa');
    });
    for (const item of state.historyDirectory) {
      historyNames.set(item.symbol, item.name_fa || item.name_en || item.symbol);
    }
    const select = $('#history-symbol');
    select.innerHTML = '';
    const grouped = new Map();
    for (const item of state.historyDirectory) {
      const category = item.category || 'other';
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push(item);
    }
    for (const [category, items] of grouped) {
      const group = document.createElement('optgroup');
      group.label = categoryName(category);
      for (const item of items) {
        const option = document.createElement('option');
        option.value = item.symbol;
        option.textContent = historyLabel(item.symbol);
        option.selected = item.symbol === state.historySymbol;
        group.append(option);
      }
      select.append(group);
    }
  } catch (error) {
    console.error('history directory load failed', error);
  }
}

function usageSnippet() {
  const url = `${PUBLIC_ROOT}/${endpointPaths[state.endpoint]}`;
  if (state.language === 'python') return `import requests\n\npayload = requests.get(\n    "${url}",\n    timeout=15,\n).json()\n\nprint(payload["data"][0])`;
  if (state.language === 'curl') return `curl --fail --silent \\\n  '${url}' | jq '.data[0]'`;
  return `const response = await fetch(\n  '${url}'\n);\nconst payload = await response.json();\n\nconsole.log(payload.data[0]);`;
}

function renderUsage() {
  $('#usage-code').textContent = usageSnippet();
}

function bindEvents() {
  $$('.tab').forEach((button) => button.addEventListener('click', () => {
    $$('.tab').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    state.category = button.dataset.category;
    renderMarket();
  }));
  $('#market-search').addEventListener('input', (event) => { state.query = event.target.value; renderMarket(); });
  $('#symbol-search').addEventListener('input', (event) => {
    state.symbolQuery = event.target.value;
    state.symbolLimit = 80;
    renderSymbols();
  });
  $('#symbol-category').addEventListener('change', (event) => {
    state.symbolCategory = event.target.value;
    state.symbolLimit = 80;
    renderSymbols();
  });
  $('#symbol-live-only').addEventListener('change', (event) => {
    state.symbolLiveOnly = event.target.checked;
    state.symbolLimit = 80;
    renderSymbols();
  });
  $('#symbols-more').addEventListener('click', () => {
    state.symbolLimit += 80;
    renderSymbols();
  });
  $('#history-symbol').addEventListener('change', (event) => loadHistory(event.target.value));
  $$('.chart-range button').forEach((button) => button.addEventListener('click', () => {
    $$('.chart-range button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    state.historyRange = button.dataset.range === 'all' ? 'all' : Number(button.dataset.range);
    drawChart();
  }));
  $('#history-chart').addEventListener('mousemove', chartHover);
  $('#history-chart').addEventListener('mouseleave', () => { $('#chart-tooltip').style.display = 'none'; });
  $$('.endpoint').forEach((button) => button.addEventListener('click', () => {
    $$('.endpoint').forEach((item) => item.classList.remove('active'));
    button.classList.add('active'); state.endpoint = button.dataset.endpoint; renderUsage();
  }));
  $$('.language-tabs button').forEach((button) => button.addEventListener('click', () => {
    $$('.language-tabs button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active'); state.language = button.dataset.lang; renderUsage();
  }));
  $$('[data-copy]').forEach((button) => button.addEventListener('click', () => copy(button.dataset.copy)));
  $('#copy-usage').addEventListener('click', () => copy(usageSnippet()));
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawChart, 120); });
}

bindEvents();
renderUsage();
loadMarkets();
loadSymbols();
loadHistoryDirectory().finally(() => loadHistory(state.historySymbol));
