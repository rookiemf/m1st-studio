// Projects and clients.
import { esc, I, head, empty, fmt, today } from "../util.js";
import { S, client, project, toPhp, updateDoc, addDoc } from "../data.js";
import { whoChip, pill, seg, bindSeg, peopleFilter, byWho, linkBtn } from "../ui.js";
import { openProject, openClient, openTask, openInvoice, PROJECT_STATUS } from "../schemas.js";

const kind = s => ({ Idea: "muted", "In progress": "brand", "In review": "warn", "On hold": "muted", Done: "ok" })[s] || "";
const money = (n, c) => n ? `${c === "USD" ? "$" : "₱"}${(+n).toLocaleString()}` : "";

function projectCard(p) {
  const c = client(p.clientId), open = S.tasks.filter(t => t.projectId === p.id), left = open.filter(t => !t.done).length;
  const late = p.due && p.due < today() && p.status !== "Done";
  return `<article class="pcard" data-proj="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.title)}">
    <div class="ph"><b>${esc(p.title)}</b>${pill(p.status || "In progress", kind(p.status))}</div>
    <div class="pm">${c ? `<span>${I.users}${esc(c.name)}</span>` : ""}${p.type ? `<span>${esc(p.type)}</span>` : ""}${p.fee ? `<span class="num">${esc(money(p.fee, p.currency))}</span>` : ""}</div>
    ${open.length ? `<div class="pbar" aria-label="${open.length - left} of ${open.length} tasks done"><i style="width:${Math.round((open.length - left) / open.length * 100)}%"></i></div>` : ""}
    <div class="pf">${whoChip(p.who)}<span class="${late ? "warntx" : "muted"} small">${p.due ? (late ? "Overdue · " : "Due ") + esc(fmt(p.due)) : "No deadline"}</span>${open.length ? `<span class="muted small">${left} task${left === 1 ? "" : "s"} left</span>` : ""}</div>
  </article>`;
}

function projects() {
  const f = S.ui.projFilter;
  let list = byWho(S.projects, S.ui.who);
  list = f === "active" ? list.filter(p => !["Done", "Idea"].includes(p.status)) : f === "ideas" ? list.filter(p => p.status === "Idea") : f === "done" ? list.filter(p => p.status === "Done") : list;
  list = list.slice().sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  return `<div class="toolbar">${peopleFilter(S.ui.who)}${seg("projFilter", [["active", "Active"], ["ideas", "Ideas"], ["done", "Done"], ["all", "All"]], f)}</div>
  ${list.length ? `<div class="pgrid">${list.map(projectCard).join("")}</div>` : `<section class="panel"><div class="body">${empty("brief", f === "ideas" ? "No ideas saved" : "No projects here", "Client work and personal projects both go here.", `<button class="btn primary sm" data-addproj>${I.plus}Add a project</button>`)}</div></section>`}`;
}

function clients() {
  const list = byWho(S.clients, S.ui.who).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const earned = id => S.invoices.filter(i => i.clientId === id && i.status === "Paid").reduce((s, i) => s + toPhp(i.amount, i.currency), 0);
  return `<div class="toolbar">${peopleFilter(S.ui.who)}</div>
  ${list.length ? `<section class="panel"><div class="body">${list.map(c => { const n = S.projects.filter(p => p.clientId === c.id).length, e = earned(c.id); return `
    <button class="rowitem btnrow" data-client="${esc(c.id)}"><span class="avatar">${esc((c.name || "?")[0].toUpperCase())}</span><span class="main"><span class="t">${esc(c.name)}</span><span class="m">${[c.contact, c.country, c.platform].filter(Boolean).map(esc).join(" · ")}</span></span><span class="muted small">${n} project${n === 1 ? "" : "s"}${e ? ` · ₱${Math.round(e).toLocaleString()} paid` : ""}</span>${whoChip(c.who)}</button>`; }).join("")}</div></section>` :
  `<section class="panel"><div class="body">${empty("users", "No clients yet", "Keep each client's contact details and history together.", `<button class="btn primary sm" data-addclient>${I.plus}Add a client</button>`)}</div></section>`}`;
}

export function work() {
  const tab = S.ui.workTab;
  return head("Projects", "Client work and personal projects, for both of you.",
    tab === "clients" ? `<button class="btn primary" data-addclient>${I.plus}Add a client</button>` : `<button class="btn primary" data-addproj>${I.plus}Add a project</button>`) +
    `<nav class="subtabs"><button type="button" data-wtab="projects"${tab === "projects" ? ' aria-current="page"' : ""}>Projects <span class="count">${S.projects.length}</span></button><button type="button" data-wtab="clients"${tab === "clients" ? ' aria-current="page"' : ""}>Clients <span class="count">${S.clients.length}</span></button></nav>` +
    (tab === "clients" ? clients() : projects());
}

// A project's own page in a dialog: details, its tasks and quick actions.
function projectDetail(p) {
  const c = client(p.clientId), tasks = S.tasks.filter(t => t.projectId === p.id).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || (a.due || "9").localeCompare(b.due || "9"));
  const d = document.getElementById("dlg");
  document.getElementById("dlgbody").innerHTML = `<header><h2>${esc(p.title)}</h2><button class="btn ghost sm icon" type="button" id="dlgX" aria-label="Close">${I.x}</button></header>
  <div class="db">
    <div class="facts">${[["Status", p.status], ["Client", c?.name], ["Type", p.type], ["Deadline", fmt(p.due)], ["Fee", money(p.fee, p.currency)]].filter(x => x[1]).map(([k, v]) => `<span>${k}<b>${esc(v)}</b></span>`).join("")}<span>Whose<b>${whoChip(p.who)}</b></span></div>
    ${p.notes ? `<p class="pnotes">${esc(p.notes)}</p>` : ""}
    <h3 class="h3">Tasks</h3>
    <div class="tlist">${tasks.map(t => `<label class="trow${t.done ? " done" : ""}"><input type="checkbox" data-tdone="${esc(t.id)}"${t.done ? " checked" : ""}><span>${esc(t.title)}</span>${t.due ? `<span class="muted small">${esc(fmt(t.due))}</span>` : ""}</label>`).join("") || `<p class="muted small" style="margin:0">No tasks yet.</p>`}</div>
    <form id="qtask" class="qadd"><input name="t" placeholder="Add a task and press Enter" aria-label="New task" autocomplete="off"><button class="btn ghost sm" type="submit">${I.plus}Add</button></form>
  </div>
  <footer>${linkBtn(p.link, "Files")}<button class="btn ghost" id="pdInv">${I.money}Invoice</button><button class="btn" id="pdEdit">${I.edit}Edit</button></footer>`;
  if (!d.open) d.showModal();
  document.getElementById("dlgX").onclick = () => d.close();
  document.getElementById("pdEdit").onclick = () => openProject(p);
  document.getElementById("pdInv").onclick = () => openInvoice(null, { projectId: p.id, clientId: p.clientId || "", amount: p.fee || "", currency: p.currency || "PHP", who: p.who || undefined, items: p.fee ? `${p.title} | ${p.fee}` : "" });
  d.querySelectorAll("[data-tdone]").forEach(cb => cb.onchange = () => updateDoc("tasks", cb.dataset.tdone, { done: cb.checked }));
  document.getElementById("qtask").onsubmit = async e => {
    e.preventDefault(); const t = e.target.elements.t.value.trim(); if (!t) return; e.target.reset();
    await addDoc("tasks", { title: t, projectId: p.id, who: p.who || "", done: false, priority: "Normal" });
    projectDetail(project(p.id) || p);
  };
}
export { projectDetail };

export function bindWork(v, r, render) {
  bindSeg(v, S, render);
  v.querySelectorAll("[data-wtab]").forEach(b => b.onclick = () => { S.ui.workTab = b.dataset.wtab; render(); });
  v.querySelectorAll("[data-addproj]").forEach(b => b.onclick = () => openProject());
  v.querySelectorAll("[data-addclient]").forEach(b => b.onclick = () => openClient());
  v.querySelectorAll("[data-client]").forEach(b => b.onclick = () => openClient(client(b.dataset.client)));
  v.querySelectorAll("[data-proj]").forEach(el => { const go = () => projectDetail(project(el.dataset.proj)); el.onclick = go; el.onkeydown = e => { if (e.key === "Enter") go(); }; });
}
export { PROJECT_STATUS, openTask };
