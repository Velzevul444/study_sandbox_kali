const labels = {
  context: {
    html: "HTML body",
    attribute: "HTML attribute",
    url: "URL href",
    script: "Script string",
  },
  protection: {
    vulnerable: "Уязвимо",
    escape: "Экранирование",
    sanitize: "Sanitizer",
  },
};

const presets = [
  {
    name: "HTML image error",
    context: "html",
    payload: `<img src=x onerror="alert('img onerror')">`,
  },
  {
    name: "SVG onload",
    context: "html",
    payload: `<svg onload="alert('svg onload')"></svg>`,
  },
  {
    name: "Attribute break",
    context: "attribute",
    payload: `" autofocus onfocus="alert('attribute context')" data-x="`,
  },
  {
    name: "JavaScript URL",
    context: "url",
    payload: `javascript:alert('url context')`,
  },
  {
    name: "Script string break",
    context: "script",
    payload: `'; alert('script context'); //`,
  },
  {
    name: "Harmless markup",
    context: "html",
    payload: `<strong>Привет</strong> <code>safe text</code>`,
  },
];

const state = {
  context: "html",
  protection: "vulnerable",
  viewport: "desktop",
  scripts: true,
  payload: presets[0].payload,
  siteUrl: "",
  runs: 0,
  alerts: 0,
  blockedTotal: 0,
  events: [],
};

const els = {};
const storageKey = "xss-sandbox-state";

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  loadInitialState();
  renderPresets();
  bindEvents();
  syncControls();
  runPayload("init");
});

function cacheElements() {
  els.contextSelect = document.getElementById("contextSelect");
  els.protectionSelect = document.getElementById("protectionSelect");
  els.viewportSelect = document.getElementById("viewportSelect");
  els.scriptsToggle = document.getElementById("scriptsToggle");
  els.payloadInput = document.getElementById("payloadInput");
  els.siteUrlInput = document.getElementById("siteUrlInput");
  els.runButton = document.getElementById("runButton");
  els.copyButton = document.getElementById("copyButton");
  els.clearLogButton = document.getElementById("clearLogButton");
  els.resetButton = document.getElementById("resetButton");
  els.shareButton = document.getElementById("shareButton");
  els.previewFrame = document.getElementById("previewFrame");
  els.browserShell = document.getElementById("browserShell");
  els.contextBadge = document.getElementById("contextBadge");
  els.modeBadge = document.getElementById("modeBadge");
  els.runsStat = document.getElementById("runsStat");
  els.alertsStat = document.getElementById("alertsStat");
  els.blockedStat = document.getElementById("blockedStat");
  els.presetList = document.getElementById("presetList");
  els.eventLog = document.getElementById("eventLog");
}

function loadInitialState() {
  const params = new URLSearchParams(window.location.search);
  const saved = readSavedState();

  Object.assign(state, {
    context: coerceValue(params.get("context") || saved.context, labels.context, state.context),
    protection: coerceValue(params.get("protection") || saved.protection, labels.protection, state.protection),
    viewport: coerceValue(params.get("viewport") || saved.viewport, { desktop: true, tablet: true, mobile: true }, state.viewport),
    scripts: params.has("scripts") ? params.get("scripts") !== "false" : saved.scripts ?? state.scripts,
    payload: params.get("payload") || saved.payload || state.payload,
    siteUrl: params.get("site") || saved.siteUrl || state.siteUrl,
  });
}

function readSavedState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}

function persistState() {
  const value = {
    context: state.context,
    protection: state.protection,
    viewport: state.viewport,
    scripts: state.scripts,
    payload: state.payload,
    siteUrl: state.siteUrl,
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    pushLog("blocked", "localStorage недоступен");
  }
}

function coerceValue(value, allowed, fallback) {
  return value && Object.prototype.hasOwnProperty.call(allowed, value) ? value : fallback;
}

function bindEvents() {
  els.runButton.addEventListener("click", () => runPayload("manual"));
  els.payloadInput.addEventListener("input", () => {
    state.payload = els.payloadInput.value;
    persistState();
  });

  [els.contextSelect, els.protectionSelect, els.viewportSelect, els.scriptsToggle].forEach((control) => {
    control.addEventListener("change", () => {
      readControls();
      runPayload("control");
    });
  });

  els.copyButton.addEventListener("click", () => {
    copyText(state.payload);
    pushLog("info", "Payload скопирован");
  });

  els.shareButton.addEventListener("click", () => {
    copyShareUrl();
  });

  els.clearLogButton.addEventListener("click", () => {
    state.events = [];
    state.alerts = 0;
    renderLog();
    updateStats();
  });

  els.resetButton.addEventListener("click", () => {
    applyPreset(presets[0]);
  });

  window.addEventListener("message", handleFrameMessage);
}

function syncControls() {
  els.contextSelect.value = state.context;
  els.protectionSelect.value = state.protection;
  els.viewportSelect.value = state.viewport;
  els.scriptsToggle.checked = state.scripts;
  els.payloadInput.value = state.payload;
  els.siteUrlInput.value = state.siteUrl;
  els.addressBar.textContent = state.siteUrl || "sandbox://xss-lab/frame";
  renderBadges();
  setViewportClass();
  updateStats();
}

function readControls() {
  state.context = els.contextSelect.value;
  state.protection = els.protectionSelect.value;
  state.viewport = els.viewportSelect.value;
  state.scripts = els.scriptsToggle.checked;
  state.payload = els.payloadInput.value;
  state.siteUrl = els.siteUrlInput.value.trim();
}

function renderPresets() {
  els.presetList.replaceChildren(
    ...presets.map((preset) => {
      const button = document.createElement("button");
      const title = document.createElement("strong");
      const code = document.createElement("code");

      button.className = "preset-card";
      button.type = "button";
      title.textContent = preset.name;
      code.textContent = preset.payload;
      button.append(title, code);
      button.addEventListener("click", () => applyPreset(preset));
      return button;
    }),
  );
}

function applyPreset(preset) {
  state.context = preset.context;
  state.payload = preset.payload;
  state.protection = "vulnerable";
  state.scripts = true;
  syncControls();
  runPayload("preset");
}

function runPayload(reason) {
  readControls();
  persistState();

  state.runs += 1;
  els.previewFrame.setAttribute("sandbox", state.scripts ? "allow-scripts" : "");

  if (state.siteUrl) {
    els.previewFrame.removeAttribute("srcdoc");
    els.previewFrame.src = state.siteUrl;
  } else {
    const frame = buildFrameDocument();
    state.blockedTotal += frame.blocked;
    els.previewFrame.removeAttribute("src");
    els.previewFrame.srcdoc = frame.html;
  }

  els.addressBar.textContent = state.siteUrl || "sandbox://xss-lab/frame";
  renderBadges();
  setViewportClass();
  updateStats();

  if (reason !== "init") {
    if (state.siteUrl) {
      pushLog("info", `Загружен сайт: ${state.siteUrl}`);
    } else {
      pushLog("info", `${labels.context[state.context]} / ${labels.protection[state.protection]}`);
    }
  }

  if (frame.blocked > 0) {
    pushLog("blocked", `Фильтр изменил фрагментов: ${frame.blocked}`);
  }
}

function renderBadges() {
  els.contextBadge.textContent = labels.context[state.context];
  els.modeBadge.textContent = labels.protection[state.protection];
}

function setViewportClass() {
  els.browserShell.classList.toggle("is-tablet", state.viewport === "tablet");
  els.browserShell.classList.toggle("is-mobile", state.viewport === "mobile");
}

function updateStats() {
  els.runsStat.textContent = String(state.runs);
  els.alertsStat.textContent = String(state.alerts);
  els.blockedStat.textContent = String(state.blockedTotal);
}

function handleFrameMessage(event) {
  if (event.source !== els.previewFrame.contentWindow) {
    return;
  }

  const data = event.data || {};
  if (data.source !== "xss-sandbox-frame") {
    return;
  }

  if (data.kind === "alert") {
    state.alerts += 1;
    updateStats();
    pushLog("alert", `alert: ${String(data.value)}`);
    return;
  }

  if (data.kind === "ready") {
    pushLog("info", "iframe готов");
    return;
  }

  if (data.kind === "console" || data.kind === "error" || data.kind === "confirm" || data.kind === "prompt") {
    pushLog(data.kind === "error" ? "blocked" : "info", `${data.kind}: ${String(data.value)}`);
  }
}

function pushLog(kind, message) {
  state.events.unshift({
    kind,
    message,
    time: new Date(),
  });

  state.events = state.events.slice(0, 48);
  renderLog();
}

function renderLog() {
  if (state.events.length === 0) {
    const item = document.createElement("li");
    const time = document.createElement("time");
    const text = document.createElement("span");
    time.textContent = "--:--:--";
    text.textContent = "Событий пока нет";
    item.append(time, text);
    els.eventLog.replaceChildren(item);
    return;
  }

  els.eventLog.replaceChildren(
    ...state.events.map((entry) => {
      const item = document.createElement("li");
      const time = document.createElement("time");
      const text = document.createElement("span");

      item.className = entry.kind === "alert" ? "is-alert" : entry.kind === "blocked" ? "is-blocked" : "";
      time.dateTime = entry.time.toISOString();
      time.textContent = entry.time.toLocaleTimeString("ru-RU");
      text.textContent = entry.message;
      item.append(time, text);
      return item;
    }),
  );
}

function buildFrameDocument() {
  const sink = buildSink();
  const instrumentation = `
(() => {
  const send = (kind, value = "") => {
    parent.postMessage({
      source: "xss-sandbox-frame",
      kind,
      value: String(value),
      time: new Date().toISOString()
    }, "*");
  };

  window.alert = (value) => send("alert", value);
  window.confirm = (value) => {
    send("confirm", value);
    return false;
  };
  window.prompt = (value) => {
    send("prompt", value);
    return null;
  };

  ["log", "warn", "error"].forEach((method) => {
    const original = console[method];
    console[method] = (...args) => {
      send("console", args.map(String).join(" "));
      if (original) original.apply(console, args);
    };
  });

  window.addEventListener("error", (event) => {
    send("error", event.message || "runtime error");
  });

  document.addEventListener("DOMContentLoaded", () => send("ready", "DOM ready"));
})();
`;

  const frameCss = `
:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
body {
  min-height: 100vh;
  margin: 0;
  color: #161a22;
  background: #ffffff;
}
main {
  display: grid;
  align-content: start;
  gap: 18px;
  min-height: 100vh;
  padding: 28px;
}
.frame-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid #d9dee8;
  border-radius: 8px;
  background: #fbfcff;
}
.frame-card h1 {
  margin: 0;
  font-size: 1.2rem;
  letter-spacing: 0;
}
.sink {
  min-height: 132px;
  padding: 16px;
  overflow-wrap: anywhere;
  background: #ffffff;
  border: 1px dashed #aeb8c9;
  border-radius: 8px;
}
.demo-link,
.demo-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 14px;
  color: #ffffff;
  background: #0f766e;
  border: 0;
  border-radius: 8px;
  font: inherit;
  font-weight: 740;
  text-decoration: none;
}
.demo-input {
  width: min(100%, 520px);
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #bac3d4;
  border-radius: 8px;
  font: inherit;
}
code,
pre {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
pre {
  margin: 0;
  min-height: 96px;
  padding: 14px;
  overflow: auto;
  color: #f5f7fb;
  background: #10151f;
  border-radius: 8px;
}
.caption {
  margin: 0;
  color: #667085;
  line-height: 1.5;
}
`;

  const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>${frameCss}</style>
    <script>${instrumentation}<\/script>
  </head>
  <body>
    <main>
      ${sink.html}
    </main>
  </body>
</html>`;

  return {
    html,
    blocked: sink.blocked,
  };
}

function buildSink() {
  if (state.context === "html") {
    return buildHtmlSink();
  }

  if (state.context === "attribute") {
    return buildAttributeSink();
  }

  if (state.context === "url") {
    return buildUrlSink();
  }

  return buildScriptSink();
}

function buildHtmlSink() {
  const payload = String(state.payload);

  if (state.protection === "escape") {
    const escaped = escapeHtml(payload);
    return {
      blocked: escaped === payload ? 0 : 1,
      html: `
<section class="frame-card">
  <h1>HTML body</h1>
  <div class="sink">${escaped}</div>
</section>`,
    };
  }

  if (state.protection === "sanitize") {
    const sanitized = sanitizeHtml(payload);
    return {
      blocked: sanitized.removed,
      html: `
<section class="frame-card">
  <h1>HTML body</h1>
  <div class="sink">${sanitized.html}</div>
</section>`,
    };
  }

  return {
    blocked: 0,
    html: `
<section class="frame-card">
  <h1>HTML body</h1>
  <div class="sink">${payload}</div>
</section>`,
  };
}

function buildAttributeSink() {
  const payload = String(state.payload);
  const value = state.protection === "vulnerable" ? payload : escapeAttr(payload);

  return {
    blocked: value === payload ? 0 : 1,
    html: `
<section class="frame-card">
  <h1>HTML attribute</h1>
  <button class="demo-button" id="attrButton" data-note="${value}">target</button>
  <input class="demo-input" value="${value}" placeholder="attribute value">
  <p class="caption">data-note: <code id="attrMirror"></code></p>
</section>
<script>
  const target = document.getElementById("attrButton");
  const mirror = document.getElementById("attrMirror");
  if (target && mirror) {
    mirror.textContent = target.getAttribute("data-note") || "";
  }
<\/script>`,
  };
}

function buildUrlSink() {
  const payload = String(state.payload);
  const safe = state.protection === "vulnerable" ? payload : safeUrl(payload);
  const value = state.protection === "vulnerable" ? payload : escapeAttr(safe);
  const blocked = state.protection === "vulnerable" || safe === payload ? 0 : 1;

  return {
    blocked,
    html: `
<section class="frame-card">
  <h1>URL href</h1>
  <a class="demo-link" href="${value}">Открыть ссылку</a>
  <p class="caption"><code>${escapeHtml(value)}</code></p>
</section>`,
  };
}

function buildScriptSink() {
  const payload = String(state.payload);

  if (state.protection === "vulnerable") {
    return {
      blocked: 0,
      html: `
<section class="frame-card">
  <h1>Script string</h1>
  <pre id="scriptSink"></pre>
</section>
<script>
  const injected = '${payload}';
  document.getElementById("scriptSink").textContent = injected;
<\/script>`,
    };
  }

  return {
    blocked: 1,
    html: `
<section class="frame-card">
  <h1>Script string</h1>
  <pre id="scriptSink"></pre>
</section>
<script>
  const injected = ${JSON.stringify(payload)};
  document.getElementById("scriptSink").textContent = injected;
<\/script>`,
  };
}

function sanitizeHtml(input) {
  const template = document.createElement("template");
  template.innerHTML = String(input);

  const allowedTags = new Set([
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "div",
    "em",
    "i",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "span",
    "strong",
    "ul",
  ]);
  const urlAttrs = new Set(["href", "src"]);
  let removed = 0;

  const clean = (root) => {
    [...root.childNodes].forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const tagName = node.tagName.toLowerCase();
      if (!allowedTags.has(tagName)) {
        node.replaceWith(document.createTextNode(node.textContent || ""));
        removed += 1;
        return;
      }

      [...node.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim();
        if (name.startsWith("on") || name === "style" || name === "srcdoc") {
          node.removeAttribute(attr.name);
          removed += 1;
          return;
        }

        if (urlAttrs.has(name) && safeUrl(value) !== value) {
          node.removeAttribute(attr.name);
          removed += 1;
        }
      });

      clean(node);
    });
  };

  clean(template.content);

  return {
    html: template.innerHTML,
    removed,
  };
}

function safeUrl(value) {
  const url = String(value).trim();

  if (!url || url.startsWith("#") || url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
    return url || "#";
  }

  try {
    const parsed = new URL(url, "https://sandbox.local/");
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return url;
    }
  } catch {
    return "#blocked";
  }

  return "#blocked";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function escapeAttr(value) {
  return escapeHtml(value);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function copyShareUrl() {
  const url = new URL(window.location.href);
  url.search = new URLSearchParams({
    context: state.context,
    protection: state.protection,
    viewport: state.viewport,
    scripts: String(state.scripts),
    payload: state.payload,
    site: state.siteUrl,
  }).toString();

  copyText(url.href);
  pushLog("info", "Ссылка скопирована");
}
