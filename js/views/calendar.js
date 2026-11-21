// Calendar: one month with every deadline, task, interview, follow-up, payment and event.
import { esc, I, head, today, parse, ymd, fmtLong } from "../util.js";
import { S, colorOf, invoiceStatus } from "../data.js";
import { peopleFilter, bindSeg, whoChip, byWho } from "../ui.js";
import { openEvent } from "../schemas.js";
import { openByKey } from "./home.js";

function items() {
  const out = [];
  S.tasks.filter(t => t.due && !t.done).forEach(t => out.push({ d: t.due, t: t.title, who: t.who, k: "task", open: `task:${t.id}` }));
  S.projects.filter(p => p.due && p.status !== "Done").forEach(p => out.push({ d: p.due, t: "Due: " + p.title, who: p.who, k: "deadline", open: `project:${p.id}` }));
  S.jobs.filter(j => j.interview).forEach(j => out.push({ d: j.interview, t: "Interview: " + j.role, who: j.who, k: "interview", open: `job:${j.id}` }));
  S.jobs.filter(j => j.followUp && ["Applied", "Interview"].includes(j.status)).forEach(j => out.push({ d: j.followUp, t: "Follow up: " + j.role, who: j.who, k: "follow", open: `job:${j.id}` }));
  S.events.forEach(e => out.push({ d: e.date, t: (e.time ? e.time + " " : "") + e.title, who: e.who, k: "event", open: `event:${e.id}`, time: e.time || "" }));
  S.invoices.filter(i => i.due && invoiceStatus(i) !== "Paid" && invoiceStatus(i) !== "Draft").forEach(i => out.push({ d: i.due, t: "Payment: " + (i.number || "invoice"), who: i.who, k: "money", open: `invoice:${i.id}` }));
  return byWho(out, S.ui.who);
}
const KINDS = [["deadline", "Deadline"], ["task", "Task"], ["interview", "Interview"], ["follow", "Follow-up"], ["event", "Event"], ["money", "Payment"]];

export function calendar() {
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + S.ui.calOffset);
  const y = base.getFullYear(), m = base.getMonth();
  const first = new Date(y, m, 1), startDow = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  const all = items(), byDay = {};
  all.forEach(x => (byDay[x.d] = byDay[x.d] || []).push(x));
  Object.values(byDay).forEach(l => l.sort((a, b) => (a.time || "").localeCompare(b.time || "")));
  let cells = "";
  for (let i = 0; i < startDow; i++) cells += `<div class="cell off"></div>`;
  for (let d = 1; d <= days; d++) {
    const key = ymd(new Date(y, m, d)), list = byDay[key] || [];
    cells += `<div class="cell${key === today() ? " today" : ""}" data-day="${key}"><span class="dn">${d}</span><div class="chips">${list.slice(0, 3).map(x => `<button class="chip k-${x.k}" data-open="${esc(x.open)}" style="--c:${esc(colorOf(x.who))}" title="${esc(x.t)}">${esc(x.t)}</button>`).join("")}${list.length > 3 ? `<button class="more" data-dayopen="${key}">+${list.length - 3} more</button>` : ""}</div></div>`;
  }
  const trail = (7 - (startDow + days) % 7) % 7;
  for (let i = 0; i < trail; i++) cells += `<div class="cell off"></div>`;
  const label = base.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const upcoming = all.filter(x => x.d >= today()).sort((a, b) => a.d.localeCompare(b.d) || (a.time || "").localeCompare(b.time || "")).slice(0, 8);
  return head("Calendar", "Deadlines, tasks, interviews, follow-ups and payments in one view.", `<button class="btn primary" data-addevent>${I.plus}Add an event</button>`) + `
  <div class="toolbar">${peopleFilter(S.ui.who)}<div class="monthnav"><button class="btn ghost sm icon" data-cal="-1" aria-label="Previous month">${I.left}</button><b>${esc(label)}</b><button class="btn ghost sm icon" data-cal="1" aria-label="Next month">${I.right}</button>${S.ui.calOffset ? `<button class="btn ghost sm" data-cal="0">Today</button>` : ""}</div></div>
  <section class="panel"><div class="month">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(w => `<div class="wd">${w}</div>`).join("")}${cells}</div>
  <div class="legend">${KINDS.map(([k, l]) => `<span><i class="lk k-${k}"></i>${l}</span>`).join("")}<span class="muted">Colour = whose it is</span></div></section>
  <section class="panel" style="margin-top:16px"><header><h2>Coming up</h2></header><div class="body">${upcoming.map(x => `<button class="rowitem btnrow" data-open="${esc(x.open)}"><span class="datebox"><b>${esc(x.d === today() ? "Today" : parse(x.d).toLocaleDateString(undefined, { month: "short", day: "numeric" }))}</b></span><span class="main"><span class="t">${esc(x.t)}</span><span class="m">${esc(KINDS.find(k => k[0] === x.k)[1])}</span></span>${whoChip(x.who)}</button>`).join("") || `<p class="muted small">Nothing coming up.</p>`}</div></section>`;
}

function dayList(key) {
  const list = items().filter(x => x.d === key);
  const d = document.getElementById("dlg");
  document.getElementById("dlgbody").innerHTML = `<header><h2>${esc(fmtLong(key))}</h2><button class="btn ghost sm icon" type="button" id="dlgX" aria-label="Close">${I.x}</button></header><div class="db">${list.map(x => `<button class="rowitem btnrow" data-open="${esc(x.open)}"><span class="main"><span class="t">${esc(x.t)}</span></span>${whoChip(x.who)}</button>`).join("") || `<p class="muted">Nothing on this day.</p>`}</div><footer><button class="btn primary" id="dayAdd">${I.plus}Add an event</button></footer>`;
  if (!d.open) d.showModal();
  document.getElementById("dlgX").onclick = () => d.close();
  document.getElementById("dayAdd").onclick = () => openEvent(null, { date: key });
  d.querySelectorAll("[data-open]").forEach(b => b.onclick = () => openByKey(b.dataset.open));
}

export function bindCalendar(v, r, render) {
  bindSeg(v, S, render);
  v.querySelectorAll("[data-cal]").forEach(b => b.onclick = () => { const n = +b.dataset.cal; S.ui.calOffset = n === 0 ? 0 : S.ui.calOffset + n; render(); });
  v.querySelectorAll("[data-addevent]").forEach(b => b.onclick = () => openEvent());
  v.querySelectorAll("[data-open]").forEach(b => b.onclick = e => { e.stopPropagation(); openByKey(b.dataset.open); });
  v.querySelectorAll("[data-dayopen]").forEach(b => b.onclick = e => { e.stopPropagation(); dayList(b.dataset.dayopen); });
  v.querySelectorAll("[data-day]").forEach(c => c.onclick = () => dayList(c.dataset.day));
}
