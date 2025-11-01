const state = {
  tokenData: [],
  userPreferences: {
    customMetrics: [],
    alerts: [],
  },
  charts: {},
};

const fallbackTokenData = [
  {
    id: "USDC",
    name: "USD Coin",
    type: "stablecoin",
    supply: 52000000000,
    volume: 3200000000,
    price: 1,
    volatility: 0.9,
    history: generateHistory(52000000000, 0.015),
    context: { supplyChain: 42, sentiment: 65 },
  },
  {
    id: "USDT",
    name: "Tether",
    type: "stablecoin",
    supply: 83000000000,
    volume: 4200000000,
    price: 1,
    volatility: 1.1,
    history: generateHistory(83000000000, 0.02),
    context: { supplyChain: 48, sentiment: 58 },
  },
  {
    id: "SGDCBDC",
    name: "Singapore CBDC Pilot",
    type: "cbdc",
    supply: 2800000000,
    volume: 210000000,
    price: 1,
    volatility: 0.6,
    history: generateHistory(2800000000, 0.025),
    context: { supplyChain: 38, sentiment: 72 },
  },
  {
    id: "TOKENDEP",
    name: "Tokenized Bank Deposits",
    type: "deposit",
    supply: 12000000000,
    volume: 560000000,
    price: 1,
    volatility: 1.5,
    history: generateHistory(12000000000, 0.018),
    context: { supplyChain: 51, sentiment: 61 },
  },
];

const contextSignals = [
  {
    id: "pci",
    label: "Port Congestion Index",
    value: 52,
    change: -3.2,
    impact: "Improving throughput reduces redemption pressure on CBDCs",
  },
  {
    id: "sentiment",
    label: "Fintech Adoption Pulse",
    value: 67,
    change: 4.1,
    impact: "Positive consumer sentiment boosts stablecoin demand",
  },
  {
    id: "manufacturing",
    label: "Manufacturing PMI",
    value: 48,
    change: -1.4,
    impact: "Below-50 PMI points to slower tokenized deposit velocity",
  },
];

const metricCatalog = {
  velocity: {
    label: "Token Velocity",
    description: "Turnover of circulating supply over 30 days",
    baseline: () => 1 + Math.random() * 0.5,
  },
  cbdcAdoption: {
    label: "CBDC Adoption Rate",
    description: "Eligible wallets actively transacting",
    baseline: () => 0.32 + Math.random() * 0.1,
  },
  depositCoverage: {
    label: "Tokenized Deposit Coverage",
    description: "Reserves vs. tokenized balance",
    baseline: () => 1.05 + Math.random() * 0.12,
  },
  stressScore: {
    label: "Stress Sensitivity Score",
    description: "Composite risk indicator",
    baseline: () => 0.45 + Math.random() * 0.2,
  },
  supplyChain: {
    label: "Supply Chain Friction",
    description: "Port congestion and shipping reliability",
    baseline: () => 45 + Math.random() * 8,
  },
  sentiment: {
    label: "Fintech Sentiment Index",
    description: "Social listening on tokenization",
    baseline: () => 60 + Math.random() * 10,
  },
};

function generateHistory(base, variance) {
  const points = [];
  let current = base;
  for (let i = 0; i < 14; i += 1) {
    const change = current * ((Math.random() - 0.5) * variance);
    current = Math.max(0, current + change);
    points.push(Math.round(current));
  }
  return points;
}

function formatCurrency(value) {
  if (value > 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value > 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `$${value.toLocaleString()}`;
}

function calculateTotals(data) {
  return data.reduce(
    (totals, token) => {
      totals.value += token.supply * token.price;
      totals.volume += token.volume;
      return totals;
    },
    { value: 0, volume: 0 },
  );
}

async function fetchStablecoinSnapshot() {
  try {
    const resp = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,tether&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true",
      { cache: "no-cache" },
    );
    if (!resp.ok) throw new Error("Bad response");
    const data = await resp.json();
    return [
      {
        id: "USDC",
        price: data["usd-coin"].usd,
        marketCap: data["usd-coin"].usd_market_cap,
        volume: data["usd-coin"].usd_24h_vol,
      },
      {
        id: "USDT",
        price: data.tether.usd,
        marketCap: data.tether.usd_market_cap,
        volume: data.tether.usd_24h_vol,
      },
    ];
  } catch (error) {
    console.warn("Falling back to mock stablecoin snapshot", error);
    return null;
  }
}

async function loadTokenData() {
  const snapshot = await fetchStablecoinSnapshot();
  const merged = fallbackTokenData.map((token) => {
    const live = snapshot?.find((item) => item.id === token.id);
    if (!live) return { ...token };
    const supply = live.marketCap && live.price ? live.marketCap / live.price : token.supply;
    return {
      ...token,
      price: live.price ?? token.price,
      supply: supply || token.supply,
      volume: live.volume || token.volume,
    };
  });
  state.tokenData = merged;
  return merged;
}

function detectAnomalies(data) {
  const alerts = [];
  data.forEach((token) => {
    const values = token.history;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(values.length - 1, 1);
    const stdDev = Math.sqrt(variance);
    const latest = values[values.length - 1];
    const zScore = stdDev ? (latest - mean) / stdDev : 0;
    if (Math.abs(zScore) >= 3) {
      alerts.push({
        id: `${token.id}-supply`,
        severity: "warning",
        message: `${token.name} supply deviated ${(zScore > 0 ? "above" : "below")} trend by ${Math.abs(zScore).toFixed(1)}σ`,
      });
    }
    if (token.volatility > 1.3) {
      alerts.push({
        id: `${token.id}-volatility`,
        severity: "warning",
        message: `${token.name} volatility elevated at ${token.volatility.toFixed(2)}%`,
      });
    }
  });
  state.userPreferences.alerts = alerts;
  return alerts;
}

function renderAlerts(listElement, alerts) {
  listElement.innerHTML = "";
  if (!alerts.length) {
    const li = document.createElement("li");
    li.textContent = "No anomalies detected. System operating within expected bounds.";
    listElement.appendChild(li);
    return;
  }
  alerts.forEach((alert) => {
    const li = document.createElement("li");
    li.textContent = alert.message;
    if (alert.severity === "warning") li.classList.add("warning");
    listElement.appendChild(li);
  });
}

function renderContextSignals(container) {
  container.innerHTML = "";
  contextSignals.forEach((signal) => {
    const div = document.createElement("div");
    div.className = "context-item";
    div.innerHTML = `
      <strong>${signal.label}</strong>
      <p class="value">${signal.value}</p>
      <p class="hint">Δ ${signal.change > 0 ? "+" : ""}${signal.change.toFixed(1)} · ${signal.impact}</p>
    `;
    container.appendChild(div);
  });
}

function setupDashboardCharts(tokenData) {
  const labels = tokenData.map((token) => token.name);
  const supplies = tokenData.map((token) => token.supply / 1_000_000_000);
  const volumes = tokenData.map((token) => token.volume / 1_000_000_000);

  const supplyCtx = document.getElementById("supplyChart");
  const volumeCtx = document.getElementById("volumeChart");

  if (state.charts.supply) state.charts.supply.destroy();
  if (state.charts.volume) state.charts.volume.destroy();

  state.charts.supply = new Chart(supplyCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Supply (Billions)",
          data: supplies,
          borderRadius: 12,
          backgroundColor: "rgba(56, 189, 248, 0.7)",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });

  state.charts.volume = new Chart(volumeCtx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "24h Volume (Billions)",
          data: volumes,
          fill: false,
          borderColor: "rgba(96, 165, 250, 0.8)",
          tension: 0.35,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
    },
  });
}

function refreshDashboard() {
  const totalValueEl = document.getElementById("totalValue");
  const anomalyCountEl = document.getElementById("anomalyCount");
  const alertsList = document.getElementById("alertsList");
  const contextContainer = document.getElementById("contextSignals");

  if (!totalValueEl) return;

  const totals = calculateTotals(state.tokenData);
  totalValueEl.textContent = formatCurrency(totals.value);
  const alerts = detectAnomalies(state.tokenData);
  anomalyCountEl.textContent = alerts.length;
  renderAlerts(alertsList, alerts);
  renderContextSignals(contextContainer);
  setupDashboardCharts(state.tokenData);
}

function simulateLiveUpdates() {
  state.tokenData = state.tokenData.map((token) => {
    const volatilityFactor = 1 + (Math.random() - 0.5) * token.volatility * 0.01;
    const volumeFactor = 1 + (Math.random() - 0.5) * 0.15;
    const updatedSupply = Math.max(0, token.supply * volatilityFactor);
    const updatedVolume = Math.max(0, token.volume * volumeFactor);
    const history = token.history.slice(1).concat(Math.round(updatedSupply));
    return {
      ...token,
      supply: updatedSupply,
      volume: updatedVolume,
      history,
    };
  });
  refreshDashboard();
}

function initDashboard() {
  loadTokenData().then(() => {
    refreshDashboard();
    window.clearInterval(state.dashboardInterval);
    state.dashboardInterval = window.setInterval(simulateLiveUpdates, 5000);
  });
}

// Metrics Analyzer
let activeMetricId = null;

function handleDragStart(event) {
  event.dataTransfer.setData("text/plain", event.target.dataset.metric);
}

function handleDragOver(event) {
  event.preventDefault();
}

function createMetricCard(metricId, config = {}) {
  const metric = metricCatalog[metricId];
  const defaults = {
    label: config.label || metric.label,
    weight: config.weight ?? 0.5,
    threshold: config.threshold ?? null,
    current: metric.baseline(),
  };

  const card = document.createElement("div");
  card.className = "metric-card";
  card.dataset.metricId = metricId;
  card.innerHTML = `
    <div class="meta">
      <strong>${defaults.label}</strong>
      <span>${(defaults.weight * 100).toFixed(0)}% weight</span>
    </div>
    <p class="hint">Threshold: ${defaults.threshold ?? "n/a"}</p>
    <p class="value">Current: ${defaults.current.toFixed(2)}</p>
  `;
  card.addEventListener("click", () => {
    document.querySelectorAll(".metric-card").forEach((el) => el.classList.remove("active"));
    card.classList.add("active");
    activeMetricId = metricId;
    document.getElementById("metricLabel").value = defaults.label;
    document.getElementById("metricWeight").value = defaults.weight;
    document.getElementById("metricThreshold").value = defaults.threshold ?? "";
    updateMetricPreview(metricId, defaults);
  });
  return { card, config: defaults };
}

function updateMetricPreview(metricId, config) {
  const ctx = document.getElementById("metricPreview");
  if (!ctx) return;
  const baseline = metricCatalog[metricId]?.baseline ?? (() => Math.random());
  const values = Array.from({ length: 10 }, baseline).map((value, index) => value - index * 0.03 + config.weight * 0.1);
  if (state.charts.metricPreview) state.charts.metricPreview.destroy();
  state.charts.metricPreview = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({ length: 10 }, (_, i) => `T${i + 1}`),
      datasets: [
        {
          label: config.label,
          data: values,
          borderColor: "rgba(56, 189, 248, 0.8)",
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
    },
  });
}

function persistPreferences() {
  try {
    localStorage.setItem("tokenTrack-preferences", JSON.stringify(state.userPreferences));
  } catch (error) {
    console.warn("Unable to persist preferences", error);
  }
}

function loadPreferences() {
  try {
    const raw = localStorage.getItem("tokenTrack-preferences");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.userPreferences = parsed;
  } catch (error) {
    console.warn("Unable to parse preferences", error);
  }
}

function renderCustomMetrics() {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;
  canvas.innerHTML = "";
  if (!state.userPreferences.customMetrics.length) {
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "Drop metrics here to track them. Click a card to edit parameters.";
    canvas.appendChild(hint);
    return;
  }
  state.userPreferences.customMetrics.forEach((metric) => {
    const { card } = createMetricCard(metric.metricId, metric);
    canvas.appendChild(card);
  });
}

function initMetricsAnalyzer() {
  const palette = document.querySelectorAll(".draggable");
  const canvas = document.getElementById("canvas");
  const saveBtn = document.getElementById("savePreferences");
  const clearBtn = document.getElementById("clearPreferences");
  const form = document.getElementById("metricForm");

  if (!canvas) return;

  loadPreferences();
  renderCustomMetrics();

  palette.forEach((item) => item.addEventListener("dragstart", handleDragStart));
  canvas.addEventListener("dragover", handleDragOver);
  canvas.addEventListener("drop", (event) => {
    event.preventDefault();
    const metricId = event.dataTransfer.getData("text/plain");
    if (!metricId || !metricCatalog[metricId]) return;
    state.userPreferences.customMetrics.push({ metricId, weight: 0.5, label: metricCatalog[metricId].label });
    renderCustomMetrics();
  });

  saveBtn?.addEventListener("click", () => {
    persistPreferences();
    saveBtn.textContent = "Saved";
    setTimeout(() => {
      saveBtn.textContent = "Save Layout";
    }, 1500);
  });

  clearBtn?.addEventListener("click", () => {
    state.userPreferences.customMetrics = [];
    persistPreferences();
    renderCustomMetrics();
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!activeMetricId) return;
    const label = document.getElementById("metricLabel").value;
    const weight = Number(document.getElementById("metricWeight").value);
    const thresholdRaw = document.getElementById("metricThreshold").value;
    const threshold = thresholdRaw === "" ? null : Number(thresholdRaw);

    state.userPreferences.customMetrics = state.userPreferences.customMetrics.map((metric) =>
      metric.metricId === activeMetricId
        ? { ...metric, label, weight, threshold }
        : metric,
    );
    renderCustomMetrics();
    persistPreferences();
    updateMetricPreview(activeMetricId, { label, weight, threshold });
  });
}

// Stress testing
function computeStressTrajectory({
  volatility,
  liquidity,
  adoption,
  supply,
  sentimentShock,
  horizon,
}) {
  const start = 100;
  const drag = volatility * 0.4 + liquidity * 0.35 + adoption * 0.25 + supply * 4 + sentimentShock * 3;
  const normalizedDrag = Math.min(drag / 10, 75);
  const recoveryRate = Math.max(1, horizon / 10);
  const series = [];
  let current = start - normalizedDrag;
  for (let day = 0; day <= horizon; day += 1) {
    if (day > 0) {
      const bounce = (start - current) / recoveryRate;
      current = Math.min(start, current + bounce * 0.6);
    }
    series.push(Number(current.toFixed(2)));
  }
  return series;
}

function renderStressChart(series, horizon) {
  const ctx = document.getElementById("stressChart");
  if (!ctx) return;
  if (state.charts.stress) state.charts.stress.destroy();
  state.charts.stress = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({ length: series.length }, (_, i) => `Day ${i}`),
      datasets: [
        {
          label: "System Stability Index",
          data: series,
          borderColor: series[0] < 80 ? "rgba(249, 115, 22, 0.85)" : "rgba(56, 189, 248, 0.8)",
          fill: true,
          backgroundColor: "rgba(56, 189, 248, 0.15)",
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0,
          max: 110,
        },
      },
    },
  });
}

function renderStressFindings(series, params) {
  const list = document.getElementById("stressFindings");
  if (!list) return;
  list.innerHTML = "";
  const nadir = Math.min(...series);
  const recoveryDay = series.findIndex((value) => value >= 95);
  const alerts = [];
  if (nadir < 60) {
    alerts.push({
      severity: "warning",
      text: `Stability drops to ${nadir.toFixed(1)}, triggering regulatory watch.`,
    });
  }
  if (recoveryDay === -1) {
    alerts.push({
      severity: "warning",
      text: "System does not recover within selected horizon. Consider liquidity backstops.",
    });
  } else {
    alerts.push({ severity: "info", text: `Recovery to baseline expected by day ${recoveryDay}.` });
  }
  if (params.sentimentShock > 6) {
    alerts.push({ severity: "warning", text: "Social sentiment shock may amplify redemption pressure." });
  }
  if (!alerts.length) {
    alerts.push({ severity: "info", text: "Scenario remains resilient across monitored indicators." });
  }
  alerts.forEach((alert) => {
    const li = document.createElement("li");
    li.textContent = alert.text;
    if (alert.severity === "warning") li.classList.add("warning");
    list.appendChild(li);
  });
}

function collectStressParams() {
  return {
    volatility: Number(document.getElementById("volatility")?.value ?? 0),
    liquidity: Number(document.getElementById("liquidity")?.value ?? 0),
    adoption: Number(document.getElementById("adoption")?.value ?? 0),
    supply: Number(document.getElementById("supply")?.value ?? 0),
    sentimentShock: Number(document.getElementById("sentimentShock")?.value ?? 0),
    horizon: Number(document.getElementById("horizon")?.value ?? 0),
  };
}

function applyStressParams(params) {
  document.getElementById("volatility").value = params.volatility;
  document.getElementById("liquidity").value = params.liquidity;
  document.getElementById("adoption").value = params.adoption;
  document.getElementById("supply").value = params.supply;
  document.getElementById("sentimentShock").value = params.sentimentShock;
  document.getElementById("horizon").value = params.horizon;
}

function buildShareLink(params) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function initStressTest() {
  const form = document.getElementById("stressForm");
  const shareBtn = document.getElementById("shareScenario");
  if (!form) return;

  const urlParams = Object.fromEntries(new URLSearchParams(window.location.search));
  if (Object.keys(urlParams).length) {
    applyStressParams({
      volatility: Number(urlParams.volatility ?? 25),
      liquidity: Number(urlParams.liquidity ?? 30),
      adoption: Number(urlParams.adoption ?? 15),
      supply: Number(urlParams.supply ?? 4),
      sentimentShock: Number(urlParams.sentimentShock ?? 3),
      horizon: Number(urlParams.horizon ?? 14),
    });
  }

  const initialParams = collectStressParams();
  const initialSeries = computeStressTrajectory(initialParams);
  renderStressChart(initialSeries, initialParams.horizon);
  renderStressFindings(initialSeries, initialParams);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const params = collectStressParams();
    const series = computeStressTrajectory(params);
    renderStressChart(series, params.horizon);
    renderStressFindings(series, params);
  });

  shareBtn?.addEventListener("click", async () => {
    const params = collectStressParams();
    const link = buildShareLink(params);
    try {
      await navigator.clipboard.writeText(link);
      shareBtn.textContent = "Copied!";
      window.setTimeout(() => {
        shareBtn.textContent = "Copy Scenario Link";
      }, 1500);
    } catch (error) {
      console.warn("Unable to copy link", error);
      shareBtn.textContent = "Copy failed";
      window.setTimeout(() => {
        shareBtn.textContent = "Copy Scenario Link";
      }, 1500);
    }
  });
}

function init() {
  const page = document.body.dataset.page;
  switch (page) {
    case "dashboard":
      initDashboard();
      break;
    case "metrics":
      initMetricsAnalyzer();
      break;
    case "stress-test":
      initStressTest();
      break;
    default:
      break;
  }
}

document.addEventListener("DOMContentLoaded", init);
