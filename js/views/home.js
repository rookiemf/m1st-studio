// Dashboard: what's due, which applications need a nudge, money this month, quick links to job sites.
import { esc, I, head, cnt, empty, today, addDays, fmt, ago } from "../util.js";
import { S, nameOf, myEmail, project, toPhp, invoiceStatus, followUpDue, site } from "../data.js";
import { whoChip, pill } from "../ui.js";
import { openTask, openJob, openProject, openInvoice, openEvent } from "../schemas.js";
import { favicon } from "./jobs.js";
import { projectDetail } from "./work.js";

const peso = n => "₱" + Math.round(n).toLocaleString();

function dueSoon() {
  const end = addDays(today(), 7), out = [];
  S.tasks.filter(t => !t.done && t.due && t.due <= end).forEach(t => out.push({ d: t.due, kind: "Task", t: t.title, who: t.who, open: `task:${t.id}`, late: t.due < today() }));
  S.projects.filter(p => p.status !== "Done" && p.due && p.due <= end).forEach(p => out.push({ d: p.due, kind: "Deadline", t: p.title, who: p.who, open: `project:${p.id}`, late: p.due < today() }));
  S.jobs.filter(j => j.interview && j.interview >= today() && j.interview <= end).forEach(j => out.push({ d: j.interview, kind: "Interview", t: `${j.role}${j.company ? " · " + j.company : ""}`, who: j.who, open: `job:${j.id}` }));
  S.events.filter(e => e.date >= today() && e.date <= end).forEach(e => out.push({ d: e.date, kind: e.time || "Event", t: e.title, who: e.who, open: `event:${e.id}` }));
  S.invoices.filter(i => ["Sent", "Overdue"].includes(invoiceStatus(i)) && i.due && i.due <= end).forEach(i => out.push({ d: i.due, kind: "Payment due", t: `${i.number || "Invoice"} · ${i.currency} ${(+i.amount || 0).toLocaleString()}`, who: i.who, open: `invoice:${i.id}`, late: i.due < today() }));
  return out.sort((a, b) => a.d.localeCompare(b.d));
}

export function home() {
  const first = (S.user?.displayName || nameOf(myEmail())).split(" ")[0];
  const hr = new Date().getHours(), hi = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const active = S.projects.filter(p => !["Done", "Idea"].includes(p.status));
  const weekAgo = addDays(today(), -6);
  const appliedWeek = S.jobs.filter(j => j.applied && j.applied >= weekAgo && j.status !== "Saved").length;
  const interviews = S.jobs.filter(j => j.status === "Interview" || (j.interview && j.interview >= today())).length;
  const ym = today().slice(0, 7);
  const paidMonth = S.invoices.filter(i => i.status === "Paid" && (i.paidOn || i.issued || "").startsWith(ym)).reduce((s, i) => s + toPhp(i.amount, i.currency), 0);
  const waiting = S.invoices.filter(i => ["Sent", "Overdue"].includes(invoiceStatus(i))).reduce((s, i) => s + toPhp(i.amount, i.currency), 0);
  const due = dueSoon(), nudges = S.jobs.filter(followUpDue).sort((a, b) => a.followUp.localeCompare(b.followUp));
  const pinned = S.sites.filter(s => s.pinned).slice(0, 12);
  const sites = pinned.length ? pinned : S.sites.slice(0, 8);
  const lastChat = S.chat.slice(-4).reverse();

  return head(`${hi}, ${first}`, new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
    `<button class="btn ghost" data-add="task">${I.plus}Task</button><button class="btn primary" data-add="job">${I.plus}Log an application</button>`) + `
  <div class="kpis">
    <a class="kpi hero" href="#work"><span class="lbl">${I.brief}Active projects</span><span class="val">${cnt(active.length)}</span><span class="sub">${S.projects.filter(p => p.status === "In review").length} waiting on client review</span></a>
    <a class="kpi" href="#jobs"><span class="lbl">${I.send}Applied this week</span><span class="val">${cnt(appliedWeek)}</span><span class="sub">${S.jobs.filter(j => j.status === "Applied").length} still waiting to hear back</span></a>
    <a class="kpi${nudges.length ? " attn" : ""}" href="#jobs"><span class="lbl">${I.chat}Interviews</span><span class="val">${cnt(interviews)}</span><span class="sub">${nudges.length ? `${nudges.length} application${nudges.length > 1 ? "s" : ""} to follow up` : "No follow-ups due"}</span></a>
    <a class="kpi" href="#money"><span class="lbl">${I.money}Paid this month</span><span class="val">${cnt(Math.round(paidMonth), "₱")}</span><span class="sub">${waiting ? peso(waiting) + " still to be paid" : "Nothing outstanding"}</span></a>
  </div>
  <div class="cols">
    <section class="panel"><header><h2>Next 7 days</h2><span class="count">${due.length}</span></header><div class="body">${due.length ? due.map(x => `
      <button class="rowitem btnrow" data-open="${esc(x.open)}"><span class="datebox${x.late ? " late" : ""}"><b>${esc(x.d === today() ? "Today" : fmt(x.d))}</b></span><span class="main"><span class="t">${esc(x.t)}</span><span class="m">${esc(x.kind)}${x.late ? " · overdue" : ""}</span></span>${whoChip(x.who)}</button>`).join("") : empty("cal", "Nothing due this week", "Deadlines, interviews and payments will show up here.")}</div></section>
    <section class="panel"><header><h2>Follow up on these</h2><a class="count" href="#jobs">All applications</a></header><div class="body">${nudges.length ? nudges.slice(0, 6).map(j => `
      <button class="rowitem btnrow" data-open="job:${esc(j.id)}">${site(j.siteId) ? favicon(site(j.siteId).url, 28) : `<span class="fav">${I.brief}</span>`}<span class="main"><span class="t">${esc(j.role)}${j.company ? ` · ${esc(j.company)}` : ""}</span><span class="m">Applied ${esc(fmt(j.applied))} · nudge was due ${esc(fmt(j.followUp))}</span></span>${whoChip(j.who)}</button>`).join("") : empty("check", "You're all caught up", "When an application needs a follow-up message, it shows here.")}</div></section>
  </div>
  <section class="panel"><header><h2>Job sites</h2><a class="count" href="#jobs-sites">Manage</a></header>
    ${sites.length ? `<div class="sitestrip">${sites.map(s => `<a class="sitepill" href="${esc(s.url)}" target="_blank" rel="noopener">${favicon(s.url, 22)}<span>${esc(s.name)}</span></a>`).join("")}</div>` : `<div class="body">${empty("globe", "Add your job sites", "Save the sites you both use to find work, and open them from here.", `<a class="btn primary sm" href="#jobs-sites">${I.plus}Add sites</a>`)}</div>`}
  </section>
  <div class="cols" style="margin-top:16px">
    <section class="panel"><header><h2>Projects in progress</h2><a class="count" href="#work">All projects</a></header><div class="body">${active.length ? active.sort((a, b) => (a.due || "9").localeCompare(b.due || "9")).slice(0, 6).map(p => `
      <button class="rowitem btnrow" data-open="project:${esc(p.id)}"><span class="main"><span class="t">${esc(p.title)}</span><span class="m">${esc(p.type || "")}${p.due ? ` · due ${esc(fmt(p.due))}` : ""}</span></span>${pill(p.status, p.status === "In review" ? "warn" : "brand")}${whoChip(p.who)}</button>`).join("") : empty("brief", "No active projects", "", `<button class="btn primary sm" data-add="project">${I.plus}Add a project</button>`)}</div></section>
    <section class="panel"><header><h2>Latest in chat</h2><a class="count" href="#chat">Open chat</a></header><div class="body">${lastChat.length ? lastChat.map(m => `
      <a class="rowitem" href="#chat" style="text-decoration:none;color:inherit"><span class="main"><span class="t" style="font-weight:400"><b>${esc(nameOf(m.createdByEmail))}:</b> ${esc(m.text)}</span><span class="m">#${esc(m.channel || "General")} · ${esc(ago(m.createdAt))}</span></span></a>`).join("") : empty("chat", "No messages yet", "Leave each other notes about work here.")}</div></section>
  </div>`;
}

export function openByKey(key) {
  const [kind, id] = key.split(":");
  const find = (col) => S[col].find(x => x.id === id);
  if (kind === "task") openTask(find("tasks"));
  else if (kind === "project") { const p = find("projects"); if (p) projectDetail(p); }
  else if (kind === "job") openJob(find("jobs"));
  else if (kind === "event") openEvent(find("events"));
  else if (kind === "invoice") openInvoice(find("invoices"));
}

export function bindHome(v) {
  v.querySelectorAll("[data-open]").forEach(b => b.onclick = () => openByKey(b.dataset.open));
  v.querySelectorAll("[data-add]").forEach(b => b.onclick = () => ({ task: openTask, job: openJob, project: openProject })[b.dataset.add]());
}
