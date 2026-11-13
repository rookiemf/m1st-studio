// App shell: navigation, routing and rendering.
import { esc, I, countUp, toast, initials } from "./util.js";
import { S, start, setOnChange, followDue, updateDoc, sortedTeam, signIn, signOutNow, isTeam, myEmail, member } from "./data.js";
import { initDialog, openDialog, closeDialog, postForm } from "./ui.js";
import { dashboard, bindDashboard, outreach, bindOutreach, calls, bindCalls } from "./views/grow.js";
import { calendar, bindCalendar, clients, bindClients, team, bindTeam, portal, bindPortal } from "./views/deliver.js";
import { social, bindSocial } from "./views/social.js";
import { local, bindLocal, bookingForm } from "./views/local.js";
import { gear, bindGear } from "./views/gear.js";
import { marketing, bindMarketing } from "./views/marketing.js";
import { meetings, bindMeetings } from "./views/meetings.js";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dash", grp: 1 },
  { id: "outreach", label: "Outreach", icon: "send", grp: 1 },
  { id: "calls", label: "Call scripts", short: "Calls", icon: "phone", grp: 1 },
  { id: "marketing", label: "Marketing", icon: "star", grp: 1 },
  { id: "social", label: "Social", icon: "chat", grp: 1 },
  { id: "meetings", label: "Meetings", icon: "eye", grp: 2 },
  { id: "calendar", label: "Calendar", icon: "cal", grp: 2 },
  { id: "clients", label: "Overseas clients", short: "Clients", icon: "users", grp: 2 },
  { id: "local", label: "Local shoots", short: "Shoots", icon: "cam", grp: 2 },
  { id: "gear", label: "Equipment", short: "Gear", icon: "bag", grp: 2 },
  { id: "team", label: "Team", icon: "team", grp: 2 },
  { id: "portal", label: "Client portal", short: "Portal", icon: "users", grp: 2 }
];
const VIEWS = {
  dashboard: [dashboard, bindDashboard], outreach: [outreach, bindOutreach], calls: [calls, bindCalls],
  marketing: [marketing, bindMarketing], meetings: [meetings, bindMeetings], social: [social, bindSocial], local: [local, bindLocal], gear: [gear, bindGear],
  calendar: [calendar, bindCalendar], clients: [clients, bindClients], team: [team, bindTeam], portal: [portal, bindPortal]
};

const route = () => (location.hash || "#dashboard").slice(1) || "dashboard";
function routeBase() {
  const r = route();
  if (r.startsWith("portal")) return "portal";
  if (r.startsWith("client-")) return "clients";
  if (r.startsWith("outreach")) return "outreach";
  if (r.startsWith("team")) return "team";
  if (r.startsWith("social")) return "social";
  if (r.startsWith("marketing")) return "marketing";
  if (r.startsWith("local")) return "local";
  return VIEWS[r] ? r : "dashboard";
}

function badge(id) {
  const n = id === "outreach" ? S.leads.filter(l => l.status === "Ready").length + S.leads.filter(followDue).length
    : id === "portal" ? S.posts.filter(p => p.status === "Ready for review").length
    : id === "social" ? S.messages.filter(m => m.status === "New").length + S.posts.filter(p => p.status === "Approved").length
    : id === "marketing" ? S.posts.filter(p => p.clientId === "m1st" && p.status === "Ready for review").length
    : id === "meetings" ? S.meetings.filter(m => m.date === new Date().toISOString().slice(0, 10) && m.status !== "Cancelled" && m.status !== "Done").length
    : id === "gear" ? S.gear.filter(g => g.outBy).length : 0;
  const hot = (id === "outreach" && S.leads.some(followDue)) || (id === "social" && S.messages.some(m => m.status === "New"));
  return n ? `<span class="badge${hot ? " hot" : ""}">${n}</span>` : "";
}
function navHTML(grp) {
  const base = routeBase();
  return NAV.filter(n => grp == null || n.grp === grp).map(n => `<a href="#${n.id}"${base === n.id ? ' aria-current="page"' : ""}>${I[n.icon]}<span>${grp == null ? (n.short || n.label) : n.label}</span>${grp != null ? badge(n.id) : ""}</a>`).join("");
}
function renderShell() {
  document.getElementById("nav1").innerHTML = navHTML(1);
  document.getElementById("nav2").innerHTML = navHTML(2);
  document.getElementById("mnav").innerHTML = navHTML(null);
  const u = S.user, m = member(S.me);
  const photo = u?.photoURL ? `<img class="avatar sm" src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : `<span class="avatar sm" aria-hidden="true">${esc(initials(u?.displayName || ""))}</span>`;
  const chip = u ? `${photo}<span class="un"><b>${esc(m?.name || u.displayName || "Signed in")}</b><span>${esc(S.role === "admin" ? "Admin" : S.role === "team" ? (m?.role || "Team") : "Client")}</span></span><button class="btn ghost sm" id="signOutBtn" style="background:transparent;color:inherit;border-color:#ffffff33">Sign out</button>` : "";
  document.getElementById("userchip").innerHTML = chip;
  document.getElementById("userchip2").innerHTML = u ? `${photo}<button class="btn ghost sm" id="signOutBtn2" style="background:transparent;color:#fff;border-color:#ffffff33">Sign out</button>` : "";
  document.getElementById("signOutBtn")?.addEventListener("click", signOutNow);
  document.getElementById("signOutBtn2")?.addEventListener("click", signOutNow);
}

let pending = false;
function gate() {
  const g = document.getElementById("gate"), shell = document.getElementById("shell"), mnav = document.getElementById("mnav");
  const show = html => { g.innerHTML = html; g.classList.remove("hidden"); shell.classList.add("hidden"); mnav.classList.add("hidden"); };
  const card = inner => `<div class="gatecard"><img src="assets/logo-white.png" alt="" class="gatelogo"><h1>M1st Studio</h1>${inner}</div>`;
  if (!S.authReady) { show(card(`<p>Loading…</p>`)); return true; }
  if (!S.user) {
    show(card(`<p>The M1st Creatives workspace. Sign in with the Google account the team added for you.</p><button class="gbtn" id="gSignIn"><svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Sign in with Google</button><p class="fine">Clients: use the email you gave M1st Creatives.</p>`));
    document.getElementById("gSignIn").onclick = signIn; return true;
  }
  if (S.denied) {
    show(card(`<p><b>${esc(S.user.email)}</b> doesn't have access yet.</p><p>Ask Bob, Kim or Druwin to add this email in M1st Studio under Team → Access.</p><button class="btn ghost" id="gOut" style="color:#fff;border-color:#ffffff44;background:transparent">Use a different account</button>`));
    document.getElementById("gOut").onclick = signOutNow; return true;
  }
  g.classList.add("hidden"); shell.classList.remove("hidden"); mnav.classList.remove("hidden");
  // Clients only ever see their own portal.
  if (S.role === "client" && route() !== "portal-" + S.clientId) { history.replaceState(null, "", "#portal-" + S.clientId); }
  return false;
}

export function render() {
  if (gate()) return;
  document.body.classList.toggle("portal-only", route().startsWith("portal-"));
  renderShell();
  const v = document.getElementById("view");
  const ae = document.activeElement;
  // Don't wipe a field someone is typing in; render again when they leave it.
  if (ae && v.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ae.dataset.live !== "1") { pending = true; return; }
  if (document.getElementById("dlg").open) { pending = true; return; }
  const keepId = ae && ae.dataset && ae.dataset.live === "1" && v.contains(ae) ? ae.id : "";
  const pos = keepId ? ae.selectionStart : 0;
  const base = routeBase(), r = route();
  const [view, bind] = VIEWS[base];
  v.innerHTML = view(r);
  v.classList.toggle("anim", S.ui.animate);
  bind(v, r, render, changesBox);
  if (S.ui.animate) countUp(v);
  S.ui.animate = false;
  if (keepId) { const n = document.getElementById(keepId); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
}
const flush = () => { if (pending) { pending = false; setTimeout(render, 0); } };

function changesBox(p) {
  openDialog("Request changes", `<form class="form db" id="chForm"><p class="muted" style="margin:0">${esc(p.title)}</p><label class="field" for="ch-note">What should we change?<textarea id="ch-note" name="note" required></textarea></label></form>`,
    `<button class="btn ghost" type="button" id="chNo">Cancel</button><button class="btn primary" type="submit" form="chForm">Send to the team</button>`, () => {
      document.getElementById("chNo").onclick = closeDialog;
      document.getElementById("chForm").onsubmit = async e => {
        e.preventDefault(); const note = new FormData(e.target).get("note"); closeDialog();
        await updateDoc("posts", p.id, { status: "Changes requested", clientNote: note, reviewedAt: new Date().toISOString() });
        toast("Sent. The team will update it.");
      };
    });
}

// Any element with data-post opens that piece of work; data-booking opens a local shoot.
document.getElementById("view").addEventListener("click", e => {
  const t = e.target.closest("[data-post],[data-booking]");
  if (!t) return;
  e.preventDefault();
  if (t.dataset.booking) { const b = S.bookings.find(x => x.id === t.dataset.booking); if (b) bookingForm(b); return; }
  const p = S.posts.find(x => x.id === t.dataset.post);
  if (p) postForm(p);
});
document.addEventListener("focusout", flush);
initDialog(flush);
window.addEventListener("hashchange", () => {
  if (S.role === "client" && route() !== "portal-" + S.clientId) { location.hash = "#portal-" + S.clientId; return; }
  S.ui.animate = true; pending = false;
  if (!route().startsWith("client-") && !route().startsWith("portal")) S.ui.clientMonth = 0;
  if (!route().startsWith("local")) S.ui.localMonth = 0;
  if (!route().startsWith("marketing")) S.ui.mkMonth = 0;
  document.activeElement?.blur?.(); render(); try { window.scrollTo(0, 0); } catch (e) {}
});

setOnChange(render);
render();
start();
