// App shell: navigation, routing and rendering.
import { esc, I, countUp } from "./util.js";
import { S, start, setOnChange, signIn, signOutNow, nameOf, colorOf, myEmail, followUpDue, invoiceStatus } from "./data.js";
import { initDialog } from "./ui.js";
import { home, bindHome } from "./views/home.js";
import { work, bindWork } from "./views/work.js";
import { jobs, bindJobs } from "./views/jobs.js";
import { tasks, bindTasks, myOpenTasks } from "./views/tasks.js";
import { calendar, bindCalendar } from "./views/calendar.js";
import { chat, bindChat, chatUnread } from "./views/chat.js";
import { money, bindMoney } from "./views/money.js";
import { peoplePage, bindPeople } from "./views/people.js";

const NAV = [
  { id: "home", label: "Home", icon: "home" },
  { id: "work", label: "Projects", icon: "brief" },
  { id: "jobs", label: "Job hunt", short: "Jobs", icon: "send" },
  { id: "tasks", label: "Tasks", icon: "task" },
  { id: "calendar", label: "Calendar", icon: "cal" },
  { id: "money", label: "Money", icon: "money" },
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "people", label: "People", icon: "users" }
];
const VIEWS = { home: [home, bindHome], work: [work, bindWork], jobs: [jobs, bindJobs], tasks: [tasks, bindTasks], calendar: [calendar, bindCalendar], money: [money, bindMoney], chat: [chat, bindChat], people: [peoplePage, bindPeople] };

const route = () => (location.hash || "#home").slice(1) || "home";
const routeBase = () => { const r = route(); if (r.startsWith("jobs")) return "jobs"; return VIEWS[r] ? r : "home"; };

function badge(id) {
  const n = id === "jobs" ? S.jobs.filter(j => followUpDue(j) && j.who === myEmail()).length
    : id === "tasks" ? myOpenTasks().length
    : id === "money" ? S.invoices.filter(i => invoiceStatus(i) === "Overdue").length
    : id === "chat" ? (routeBase() === "chat" ? 0 : chatUnread()) : 0;
  return n ? `<span class="badge${id === "chat" || id === "money" ? " hot" : ""}">${n}</span>` : "";
}
const navHTML = mobile => NAV.map(n => `<a href="#${n.id}"${routeBase() === n.id ? ' aria-current="page"' : ""}>${I[n.icon]}<span>${mobile ? (n.short || n.label) : n.label}</span>${badge(n.id)}</a>`).join("");

function renderShell() {
  document.getElementById("nav").innerHTML = navHTML(false);
  document.getElementById("mnav").innerHTML = navHTML(true);
  const u = S.user, nm = nameOf(myEmail());
  const av = u?.photoURL ? `<img class="avatar sm" src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : `<span class="avatar sm" style="background:${esc(colorOf(myEmail()))}">${esc((nm || "?")[0])}</span>`;
  document.getElementById("userchip").innerHTML = u ? `${av}<span class="un"><b>${esc(nm)}</b><span>${esc(myEmail())}</span></span><button class="btn ghost sm" id="so1">Sign out</button>` : "";
  document.getElementById("userchip2").innerHTML = u ? `${av}<button class="btn ghost sm" id="so2">Sign out</button>` : "";
  document.getElementById("so1")?.addEventListener("click", signOutNow);
  document.getElementById("so2")?.addEventListener("click", signOutNow);
}

const GLOGO = `<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
function gate() {
  const g = document.getElementById("gate"), shell = document.getElementById("shell"), mnav = document.getElementById("mnav");
  const show = html => { g.innerHTML = html; g.classList.remove("hidden"); shell.classList.add("hidden"); mnav.classList.add("hidden"); };
  const card = inner => `<div class="gatecard"><img src="assets/logo.svg" alt="" class="gatelogo"><h1>Freelance HQ</h1>${inner}</div>`;
  if (!S.authReady) { show(card(`<p>Loading…</p>`)); return true; }
  if (!S.user) {
    show(card(`<p>Projects, job hunting, money and tasks for the two of us. Sign in with the Google account Bob added.</p><button class="gbtn" id="gIn">${GLOGO}Sign in with Google</button>`));
    document.getElementById("gIn").onclick = signIn; return true;
  }
  if (S.denied) {
    show(card(`<p><b>${esc(S.user.email)}</b> hasn't been invited yet.</p><p>Ask Bob to add this email under People.</p><button class="btn ghost" id="gOut">Use a different account</button>`));
    document.getElementById("gOut").onclick = signOutNow; return true;
  }
  g.classList.add("hidden"); shell.classList.remove("hidden"); mnav.classList.remove("hidden");
  return false;
}

let pending = false;
export function render() {
  if (gate()) return;
  renderShell();
  const v = document.getElementById("view"), ae = document.activeElement;
  if (ae && v.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ae.dataset.live !== "1") { pending = true; return; }
  if (document.getElementById("dlg").open) { pending = true; return; }
  const keepId = ae && ae.dataset && ae.dataset.live === "1" && v.contains(ae) ? ae.id : "";
  const pos = keepId ? ae.selectionStart : 0;
  const [view, bind] = VIEWS[routeBase()];
  v.innerHTML = view(route());
  v.classList.toggle("anim", S.ui.animate);
  bind(v, route(), render);
  if (S.ui.animate) countUp(v);
  S.ui.animate = false;
  if (keepId) { const n = document.getElementById(keepId); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
}
const flush = () => { if (pending) { pending = false; setTimeout(render, 0); } };
document.addEventListener("focusout", flush);
initDialog(flush);
window.addEventListener("hashchange", () => { S.ui.animate = true; pending = false; S.ui.calOffset = 0; document.activeElement?.blur?.(); render(); try { window.scrollTo(0, 0); } catch (e) {} });
setOnChange(render);
render();
start();
