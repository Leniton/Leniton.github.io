const log = document.getElementById("log");
const tabsEl = document.getElementById("tabs");
const pane = document.getElementById("pane");
const input = document.getElementById("cmd");

const PAGES = {
  about: "pages/about.md",
  skills: "pages/skills.md",
  projects: "pages/projects.md",
  contact: "pages/contact.md",
};
const TAB_ORDER = Object.keys(PAGES);
const PROJECTS_DIR = "pages/projects/";

const history = [];
let histIndex = -1;
let activePage = "about";

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const isExternal = (url) => /^(?:https?:|mailto:)/i.test(url);
const isSafeImg = (url) => !/^[a-z][a-z0-9+.-]*:/i.test(url) || /^https?:/i.test(url);

const URL_PART = "((?:[^()]|\\([^()]*\\))+)";
const SOLO_IMG = new RegExp("^(\\s*)(?:[-*+]\\s+)?!\\[([^\\]]*)\\]\\(" + URL_PART + "\\)\\s*$");

function imageHTML(alt, url) {
  if (!isSafeImg(url)) return `<div class="md-p md-err">blocked image url: ${esc(url)}</div>`;
  return (
    `<figure class="md-img">` +
    `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" />` +
    (alt ? `<figcaption>${esc(alt)}</figcaption>` : ``) +
    `</figure>`
  );
}

function linkHTML(label, url) {
  const text = label.trim() || url;
  if (!url) return `<span class="md-a">${text}</span>`;
  if (isExternal(url)) {
    return `<a class="md-a" href="${url}" target="_blank" rel="noopener">${text}</a>`;
  }
  return `<button class="md-cmd md-a" data-cmd="${url}">${text}</button>`;
}

function inline(text) {
  const stash = [];
  const hold = (html) => {
    stash.push(html);
    return `\u0000${stash.length - 1}\u0000`;
  };

  let out = esc(text)
    .replace(/`([^`]+)`/g, (_, c) => hold(`<code class="md-c">${c}</code>`))
    .replace(
      new RegExp("(?<![!\\\\])\\[([^\\]]*)\\]\\(" + URL_PART + "\\)", "g"),
      (_, label, url) => hold(linkHTML(label, url))
    )
    .replace(/\*\*([^*]+)\*\*/g, '<b class="md-b">$1</b>')
    .replace(/(^|[\s([{>])[*_]([^*\n_]+)[*_](?=$|[\s)\]}.,!?;:`])/g, '$1<i class="md-i">$2</i>');

  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[+i]);
}

function renderMarkdown(md) {
  return md
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const image = line.match(SOLO_IMG);
      if (image) return imageHTML(image[2], image[3]);

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = Math.min(heading[1].length, 3);
        return `<h${level} class="md-h">${inline(heading[2])}</h${level}>`;
      }
      const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (bullet) {
        return `<div class="md-p">${bullet[1]}<span class="md-c">-</span> ${inline(bullet[2])}</div>`;
      }
      return `<div class="md-p">${inline(line)}</div>`;
    })
    .join("");
}

const docCache = new Map();

function loadDoc(file) {
  if (!docCache.has(file)) {
    docCache.set(
      file,
      fetch(file)
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error(res.status))))
        .then(renderMarkdown)
        .catch(
          () =>
            `<div class="md-p md-err">could not load ${esc(file)} &mdash; open this site over http://, browsers block fetch() on file://</div>`
        )
    );
  }
  return docCache.get(file);
}

function logLine(html, cls = "") {
  const div = document.createElement("div");
  if (cls) div.className = cls;
  div.innerHTML = html;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

/* ---------- pages ---------- */

function renderTabs() {
  tabsEl.innerHTML = TAB_ORDER.map(
    (id) =>
      `<button class="tab" role="tab" id="tab-${id}" data-page="${id}" ` +
      `aria-selected="${id === activePage}" aria-controls="pane" ` +
      `tabindex="${id === activePage ? 0 : -1}">${id}</button>`
  ).join("");
}

async function showDoc(file, tab) {
  activePage = tab;
  renderTabs();
  pane.innerHTML = `<div class="md-p md-c">loading ${esc(file)}&hellip;</div>`;
  pane.innerHTML = await loadDoc(file);
  pane.scrollTop = 0;
}

function showPage(id) {
  const file = PAGES[id];
  if (!file) return;
  return showDoc(file, id);
}

function showProject(slug) {
  const clean = slug.trim().toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(clean)) return;
  return showDoc(`${PROJECTS_DIR}${clean}.md`, "projects");
}

/* ---------- commands ---------- */

function run(line) {
  const [name, ...args] = line.trim().split(/\s+/);
  const cmd = name.toLowerCase();
  const arg = args.join(" ");

  if (cmd === "bio") return showPage("about");
  if (cmd === "ls") return showPage("projects");
  if (cmd === "projects") return arg ? showProject(arg) : showPage("projects");
  showPage(cmd);
}

/* ---------- events ---------- */

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const line = input.value;
    run(line);
    if (line.trim()) {
      history.push(line);
      histIndex = history.length;
    }
    input.value = "";
  } else if (e.key === "ArrowUp") {
    if (!history.length) return;
    histIndex = Math.max(0, histIndex - 1);
    input.value = history[histIndex] ?? "";
    e.preventDefault();
  } else if (e.key === "ArrowDown") {
    if (!history.length) return;
    histIndex = Math.min(history.length, histIndex + 1);
    input.value = history[histIndex] ?? "";
    e.preventDefault();
  } else if (e.key === "Tab") {
    const match = TAB_ORDER.find((id) => id.startsWith(input.value.trim().toLowerCase()));
    if (match) {
      input.value = match;
      e.preventDefault();
    }
  }
});

tabsEl.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) {
    showPage(tab.dataset.page);
    input.focus();
  }
});

pane.addEventListener("click", (e) => {
  const cmd = e.target.closest(".md-cmd");
  if (!cmd) return;
  run(cmd.dataset.cmd);
  input.focus();
});

log.addEventListener("click", () => input.focus());

/* ---------- boot ---------- */

(async function boot() {
  logLine(`Last login: ${new Date().toString().slice(0, 24)} on ttys001`, "dim");
  logLine("", "dim");
  logLine(
    `<span class="dim">Type a command below and press Enter, or click a tab.</span>`,
    "dim"
  );
  renderTabs();
  await showPage("about");
  input.focus();
})();
