// App shell: navigation, routing and rendering.
import { esc, I, countUp, toast } from "./util.js";
import { S, connect, setOnChange, setMe, followDue, updateDoc, sortedTeam } from "./data.js";
import { initDialog, openDialog, closeDialog, postForm } from "./ui.js";
import { dashboard, bindDashboard, outreach, bindOutreach, calls, bindCalls } from "./views/grow.js";
import { calendar, bindCalendar, clients, bindClients, team, bindTeam, portal, bindPortal } from "./views/deliver.js";
import { social, bindSocial } from "./views/social.js";
import { local, bindLocal, bookingForm } from "./views/local.js";
import { gear, bindGear } from "./views/gear.js";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dash", grp: 1 },
  { id: "outreach", label: "Outreach", icon: "send", grp: 1 },
  { id: "calls", label: "Call scripts", short: "Calls", icon: "phone", grp: 1 },
  { id: "social", label: "Social", icon: "chat", grp: 1 },
  { id: "calendar", label: "Calendar", icon: "cal", grp: 2 },
  { id: "clients", label: "Overseas clients", short: "Clients", icon: "users", grp: 2 },
  { id: "local", label: "Local shoots", short: "Shoots", icon: "star", grp: 2 },
  { id: "gear", label: "Equipment", short: "Gear", icon: "bag", grp: 2 },
  { id: "team", label: "Team", icon: "team", grp: 2 },
  { id: "portal", label: "Client portal", short: "Portal", icon: "eye", grp: 2 }
];
const VIEWS = {
  dashboard: [dashboard, bindDashboard], outreach: [outreach, bindOutreach], calls: [calls, bindCalls],
  social: [social, bindSocial], local: [local, bindLocal], gear: [gear, bindGear],
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
  if (r.startsWith("local")) return "local";
  return VIEWS[r] ? r : "dashboard";
}

function badge(id) {
  const n = id === "outreach" ? S.leads.filter(l => l.status === "Ready").length + S.leads.filter(followDue).length
    : id === "portal" ? S.posts.filter(p => p.status === "Ready for review").length
    : id === "social" ? S.messages.filter(m => m.status === "New").length + S.posts.filter(p => p.status === "Approved").length
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
  ["whoami", "whoami2"].forEach(id => {
    const who = document.getElementById(id);
    if (who && document.activeElement !== who) who.innerHTML = `<option value="">Who are you?</option>` + sortedTeam().map(m => `<option value="${esc(m.id)}"${m.id === S.me ? " selected" : ""}>${esc(m.name)}</option>`).join("");
  });
}

let pending = false;
export function render() {
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
  S.ui.animate = true; pending = false;
  if (!route().startsWith("client-") && !route().startsWith("portal")) S.ui.clientMonth = 0;
  if (!route().startsWith("local")) S.ui.localMonth = 0;
  document.activeElement?.blur?.(); render(); try { window.scrollTo(0, 0); } catch (e) {}
});
["whoami", "whoami2"].forEach(id => document.getElementById(id)?.addEventListener("change", e => { setMe(e.target.value); e.target.blur(); toast(e.target.value ? "Welcome back!" : "Profile cleared"); }));

setOnChange(render);
render();
connect();
