// Deliver section: Calendar, Clients (list + per-client page with calendar), Team chart, Client portal.
import { esc, I, fmt, today, parse, addDays, weekStart, monthStart, head, empty, cnt, toast, isUrl } from "../util.js";
import { S, addDoc, setMe, updateDoc, member, memberName, client, clientName, postWho, sortedTeam, photoUrl } from "../data.js";
import { PRICE, OWN, DEPARTMENTS, STARTER_TEAM } from "../content.js";
import { postPill, avatar, avatarStack, postForm, clientForm, memberForm, copyText, monthCalendar, agendaList } from "../ui.js";

const monthLabel = off => parse(monthStart(off)).toLocaleDateString(undefined, { month: "long", year: "numeric" });

// ================= CALENDAR =================
export function calendar() {
  const u = S.ui;
  let P = S.posts;
  if (u.calClient) P = P.filter(p => p.clientId === u.calClient);
  if (u.calPerson) P = P.filter(p => u.calPerson === "none" ? !p.assigneeId : p.assigneeId === u.calPerson);
  const filters = `
    <select id="calClient" aria-label="Filter by client"><option value="">All clients</option><option value="${OWN}"${u.calClient === OWN ? " selected" : ""}>M1st (our page)</option>${S.clients.map(c => `<option value="${esc(c.id)}"${c.id === u.calClient ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
    <select id="calPerson" aria-label="Filter by team member"><option value="">Everyone</option>${S.me ? `<option value="${esc(S.me)}"${u.calPerson === S.me ? " selected" : ""}>Only my work</option>` : ""}${sortedTeam().filter(m => m.id !== S.me).map(m => `<option value="${esc(m.id)}"${m.id === u.calPerson ? " selected" : ""}>${esc(m.name)}</option>`).join("")}<option value="none"${u.calPerson === "none" ? " selected" : ""}>Unassigned</option></select>
    <div class="seg" role="group" aria-label="View"><button type="button" data-calview="week" aria-pressed="${u.calView === "week"}">Week</button><button type="button" data-calview="month" aria-pressed="${u.calView === "month"}">Month</button></div>`;
  const shoots = (u.calClient ? [] : S.bookings.filter(b => b.status !== "Cancelled" && (!u.calPerson || (b.crewIds || []).includes(u.calPerson) || b.leadId === u.calPerson)));
  let body, label;
  if (u.calView === "month") {
    P = P.concat(shoots.map(b => ({ id: "b" + b.id, due: b.date, title: "Shoot: " + b.clientName, _attr: `data-booking="${esc(b.id)}"`, _cls: "shoot" })));
    label = monthLabel(u.monthOffset);
    const ms = monthStart(u.monthOffset), me = addDays(monthStart(u.monthOffset + 1), -1);
    body = monthCalendar(P, u.monthOffset) + `<div class="only-mobile">${agendaList(P.filter(p => p.due >= ms && p.due <= me)) || `<div class="body">${empty("cal", "Nothing this month", "")}</div>`}</div>`;
  } else {
    const ws = weekStart(u.weekOffset), t = today(); const days = [...Array(7)].map((_, i) => addDays(ws, i));
    label = `${fmt(days[0])} – ${fmt(days[6])}, ${parse(days[6]).getFullYear()}`;
    body = `<div class="week">${days.map(d => { const D = P.filter(p => p.due === d); return `<div class="day${d === t ? " today" : ""}"><div class="dh"><span>${parse(d).toLocaleDateString(undefined, { weekday: "short" })}</span><b>${parse(d).getDate()}</b></div><div class="dl">${shoots.filter(b => b.date === d).map(b => `<button class="post" data-booking="${esc(b.id)}" style="background:var(--grey-900);color:#fff;border-color:var(--grey-900)"><span class="pt">${esc(b.clientName)}</span><span class="pc" style="color:#D9D4D5">Local shoot · ${esc(b.eventType)}</span>${b.time ? `<span class="pc" style="color:#D9D4D5">${esc(b.time)}</span>` : ""}</button>`).join("")}${D.map(p => `<button class="post" data-post="${esc(p.id)}"><span class="pt">${esc(p.title)}</span><span class="pc"><span class="dot${p.clientId === OWN ? " own" : ""}" aria-hidden="true"></span>${esc(clientName(p.clientId))}</span><span class="pc">${avatar(member(p.assigneeId), "sm")}${esc(postWho(p) || "Unassigned")}</span><span>${postPill(p.status)}</span></button>`).join("")}</div></div>`; }).join("")}</div>`;
  }
  return head("Calendar", "All work across clients. Anyone can add their work and see who's making what.", `<button class="btn primary" id="addPost">${I.plus}Add work</button>`) + `
  <section class="panel">
    <div class="toolbar">
      <button class="btn ghost sm icon" id="calPrev" aria-label="Previous">${I.left}</button><button class="btn ghost sm icon" id="calNext" aria-label="Next">${I.right}</button>
      <strong style="font-size:15px;min-width:150px">${esc(label)}</strong>
      ${(u.calView === "week" ? u.weekOffset : u.monthOffset) ? `<button class="btn ghost sm" id="calToday">Today</button>` : ""}
      <span style="flex:1"></span>${filters}
    </div>
    ${body}
    <div class="legend"><span><i class="dot own"></i>M1st's own page</span><span><i class="dot"></i>Client work</span><span><i class="dot" style="background:var(--grey-900)"></i>Local shoot</span><span style="color:var(--warn)">Orange outline: waiting for client</span></div>
  </section>`;
}
export function bindCalendar(v, r, render) {
  const u = S.ui, wk = u.calView === "week";
  v.querySelector("#calPrev").onclick = () => { wk ? u.weekOffset-- : u.monthOffset--; render(); };
  v.querySelector("#calNext").onclick = () => { wk ? u.weekOffset++ : u.monthOffset++; render(); };
  v.querySelector("#calToday")?.addEventListener("click", () => { u.weekOffset = 0; u.monthOffset = 0; render(); });
  v.querySelector("#addPost").onclick = () => postForm(null, u.calClient ? { clientId: u.calClient } : {});
  v.querySelector("#calClient").onchange = e => { u.calClient = e.target.value; e.target.blur(); render(); };
  v.querySelector("#calPerson").onchange = e => { u.calPerson = e.target.value; e.target.blur(); render(); };
  v.querySelectorAll("[data-calview]").forEach(b => b.onclick = () => { u.calView = b.dataset.calview; render(); });
}

// ================= CLIENTS =================
export function clients(r) {
  if (r.startsWith("client-")) return clientPage(r.slice(7));
  const act = S.clients.filter(c => c.status !== "Paused");
  const m = act.reduce((n, c) => n + (PRICE[c.pkg] || 0), 0);
  const rv = S.posts.filter(p => p.status === "Ready for review" && p.clientId !== OWN).length;
  const noLead = act.filter(c => !c.leadId).length;
  return head("Clients", "Who each client is, who's in charge, and their own calendar.", `<button class="btn primary" id="addClient">${I.plus}Add client</button>`) + `
  <div class="kpis"><div class="kpi"><div class="lbl">${I.users}Active clients</div><div class="val">${cnt(act.length)}</div><div class="sub">${S.clients.length - act.length} paused</div></div><div class="kpi"><div class="lbl">${I.bag}Monthly revenue</div><div class="val">${cnt(m, "$")}</div><div class="sub">USD packages only</div></div><div class="kpi${rv ? " attn" : ""}"><div class="lbl">${I.eye}Waiting on clients</div><div class="val">${cnt(rv)}</div><div class="sub">Posts ready for review</div></div><div class="kpi${noLead ? " attn" : ""}"><div class="lbl">${I.team}No one in charge</div><div class="val">${cnt(noLead)}</div><div class="sub">${noLead ? "Assign an account lead" : "Every client has a lead"}</div></div></div>
  <section class="panel">${S.clients.length ? `<div class="tablebox"><table class="resp"><thead><tr><th>Client</th><th>In charge</th><th>Team</th><th>Package</th><th>This month</th><th>Status</th><th class="right"><span class="hidden">Open</span></th></tr></thead><tbody>
  ${S.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => {
    const ms = monthStart(0), me = addDays(monthStart(1), -1);
    const P = S.posts.filter(p => p.clientId === c.id && p.due >= ms && p.due <= me); const rvc = P.filter(p => p.status === "Ready for review").length;
    const lead = member(c.leadId);
    return `<tr>
    <td class="c-main"><a href="#client-${esc(c.id)}" class="t" style="color:inherit">${esc(c.name)}</a><div class="s">${esc([c.niche, c.contact].filter(Boolean).join(" · "))}</div></td>
    <td>${lead ? `<span style="display:inline-flex;gap:8px;align-items:center">${avatar(lead, "sm")}${esc(lead.name)}</span>` : '<span class="pill warn">Not set</span>'}</td>
    <td class="c-hide">${avatarStack(c.teamIds || [])}</td>
    <td class="c-hide"><span class="tag">${esc(c.pkg)}</span></td>
    <td class="c-hide num">${P.length} pieces${rvc ? ` · <span style="color:var(--warn)">${rvc} to review</span>` : ""}</td>
    <td>${c.status === "Paused" ? '<span class="pill muted">Paused</span>' : '<span class="pill ok">Active</span>'}</td>
    <td class="right"><a class="btn sm" href="#client-${esc(c.id)}">Open</a></td></tr>`; }).join("")}</tbody></table></div>`
  : empty("users", "No clients yet", "When a lead says yes, mark it Won in the Sent log, then add it here.", `<button class="btn primary sm" id="addClient2">${I.plus}Add client</button>`)}</section>`;
}
function clientPage(id) {
  const c = client(id);
  if (!c) return head("Client", "") + `<section class="panel">${S.loaded.clients ? empty("x", "Client not found", "It may have been deleted.", `<a class="btn ghost sm" href="#clients">Back to clients</a>`) : empty("clock", "Loading", "")}</section>`;
  const off = S.ui.clientMonth;
  const P = S.posts.filter(p => p.clientId === c.id);
  const ms = monthStart(off), me = addDays(monthStart(off + 1), -1);
  const inMonth = P.filter(p => p.due >= ms && p.due <= me);
  const upcoming = P.filter(p => p.due >= today() && p.status !== "Posted").sort((a, b) => a.due.localeCompare(b.due)).slice(0, 8);
  const lead = member(c.leadId);
  const team = (c.teamIds || []).map(member).filter(Boolean);
  const rv = P.filter(p => p.status === "Ready for review").length;
  return `<div style="margin-bottom:10px"><a href="#clients" class="inline-note" style="color:var(--grey-600);text-decoration:none">${I.left.replace('aria-hidden="true"', 'aria-hidden="true" width="14" height="14" style="vertical-align:-2px"')} All clients</a></div>
  <div class="clienthero"><div class="ci"><h2>${esc(c.name)}</h2>
    <div class="facts" style="margin-top:8px"><div>Package<b>${esc(c.pkg)}</b></div><div>Niche<b>${esc(c.niche)}</b></div><div>Contact<b>${esc(c.contact || "–")}${c.email ? " · " + esc(c.email) : ""}</b></div><div>Client since<b>${fmt(c.start)}</b></div><div>Status<b>${esc(c.status || "Active")}</b></div></div></div>
    <div class="actions"><button class="btn ghost" id="editClient">${I.edit}Edit</button><button class="btn ghost" id="copyPortal">${I.copy}Portal link</button><a class="btn ghost" href="#portal-${esc(c.id)}">${I.eye}Portal</a><button class="btn primary" id="addClientWork">${I.plus}Add work</button></div></div>
  <div class="cols" style="grid-template-columns:minmax(0,2fr) minmax(280px,1fr);align-items:start">
    <section class="panel"><div class="toolbar"><button class="btn ghost sm icon" id="cmPrev" aria-label="Previous month">${I.left}</button><button class="btn ghost sm icon" id="cmNext" aria-label="Next month">${I.right}</button><strong style="font-size:15px">${esc(monthLabel(off))}</strong>${off ? `<button class="btn ghost sm" id="cmToday">This month</button>` : ""}<span class="muted num" style="margin-left:auto;font-size:13px">${inMonth.length} pieces${rv ? ` · ${rv} waiting for ${esc(c.contact || "client")}` : ""}</span></div>
      ${monthCalendar(P, off)}<div class="only-mobile">${agendaList(inMonth, { showClient: false })}</div></section>
    <div style="display:flex;flex-direction:column;gap:16px">
      <section class="panel"><header><h2>Who's in charge</h2><button class="btn ghost sm" id="editTeam">Change</button></header><div class="body">
        ${lead ? `<div class="rowitem">${avatar(lead)}<div class="main"><div class="t">${esc(lead.name)}</div><div class="m"><span>Account lead</span><span>${esc(lead.role || "")}</span></div></div><span class="pill brand">Lead</span></div>` : `<div class="rowitem"><div class="main"><div class="t">No account lead yet</div><div class="m">Choose who's in charge of this client.</div></div></div>`}
        ${team.filter(m => m.id !== c.leadId).map(m => `<div class="rowitem">${avatar(m)}<div class="main"><div class="t">${esc(m.name)}</div><div class="m"><span>${esc(m.role || "")}</span><span>${P.filter(p => p.assigneeId === m.id && p.status !== "Posted").length} open pieces</span></div></div></div>`).join("")}
      </div></section>
      <section class="panel"><header><h2>Coming up</h2><span class="count">${upcoming.length}</span></header><div class="body">${upcoming.length ? upcoming.map(p => `<div class="rowitem">${avatar(member(p.assigneeId), "sm")}<div class="main"><div class="t"><a href="#" data-post="${esc(p.id)}" style="color:inherit">${esc(p.title)}</a></div><div class="m"><span>${fmt(p.due)}</span><span>${esc(p.type)}</span><span>${esc(postWho(p) || "Unassigned")}</span></div></div>${postPill(p.status)}</div>`).join("") : empty("cal", "Nothing planned", "Add the first piece of work for this client.")}</div></section>
      ${c.notes ? `<section class="panel"><header><h2>Brand notes</h2></header><div class="body" style="padding-top:12px;white-space:pre-wrap;font-size:14px">${esc(c.notes)}</div></section>` : ""}
    </div>
  </div>`;
}
export function bindClients(v, r, render) {
  v.querySelector("#addClient")?.addEventListener("click", () => clientForm());
  v.querySelector("#addClient2")?.addEventListener("click", () => clientForm());
  if (!r.startsWith("client-")) return;
  const c = client(r.slice(7)); if (!c) return;
  v.querySelector("#editClient").onclick = () => clientForm(c);
  v.querySelector("#editTeam").onclick = () => clientForm(c);
  v.querySelector("#addClientWork").onclick = () => postForm(null, { clientId: c.id });
  v.querySelector("#copyPortal").onclick = () => copyText(location.href.split("#")[0] + "#portal-" + c.id, "Portal link copied");
  v.querySelector("#cmPrev").onclick = () => { S.ui.clientMonth--; render(); };
  v.querySelector("#cmNext").onclick = () => { S.ui.clientMonth++; render(); };
  v.querySelector("#cmToday")?.addEventListener("click", () => { S.ui.clientMonth = 0; render(); });
}

// ================= TEAM =================
const teamTabs = r => `<nav class="subtabs" aria-label="Team views">${[["team", "Team chart"], ["team-profiles", "Profiles"], ["team-assignments", "Who's in charge"]].map(([k, l]) => `<a href="#${k}"${r === k ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>`;
export function team(r) {
  const sub = r === "team-profiles" ? profiles() : r === "team-assignments" ? assignments() : orgChart();
  return head("Team", "Everyone at M1st, their roles, and who handles which client.", `<button class="btn primary" id="addMember">${I.plus}Add a profile</button>`) + teamTabs(r) + sub;
}
function orgChart() {
  if (!S.team.length) return `<section class="panel">${empty("team", "No profiles yet", "Add the whole M1st team in one tap (12 people, led by Bob, Kim and Druwin), or add profiles one by one.", `<div class="actions" style="justify-content:center"><button class="btn primary sm" id="seedTeam">${I.team}Add the M1st team</button><button class="btn ghost sm" id="addMember2">${I.plus}Add one profile</button></div>`)}</section>`;
  const ids = new Set(S.team.map(m => m.id));
  const kids = id => sortedTeam().filter(m => (m.reportsTo || "") === id && m.id !== id);
  const roots = sortedTeam().filter(m => !m.reportsTo || !ids.has(m.reportsTo));
  const seen = new Set();
  const node = m => {
    if (seen.has(m.id)) return ""; seen.add(m.id);
    const k = kids(m.id).filter(x => !seen.has(x.id));
    const lead = S.clients.filter(c => c.leadId === m.id).length;
    return `<li><button class="node${m.id === S.me ? " me" : ""}" data-member="${esc(m.id)}">${avatar(m, "lg")}<span class="dept">${esc(m.dept || "")}</span><b>${esc(m.name)}</b><span>${esc(m.role || "")}</span>${lead ? `<span class="pill brand" style="margin-top:2px">Leads ${lead} client${lead === 1 ? "" : "s"}</span>` : ""}</button>${k.length ? `<ul>${k.map(node).join("")}</ul>` : ""}</li>`;
  };
  const tree = roots.map(node).join("");
  const byDept = DEPARTMENTS.map(d => [d, S.team.filter(m => m.dept === d).length]).filter(x => x[1]);
  return `<section class="panel" style="margin-bottom:16px"><header><h2>Team chart</h2><span class="count">${S.team.length} people · tap anyone to see their profile</span></header><div class="org"><ul>${tree}</ul></div>
    <div class="legend" style="flex-wrap:wrap">${byDept.map(([d, n]) => `<span>${esc(d)} <b class="num">${n}</b></span>`).join("")}</div></section>
    <p class="inline-note">To change the chart, edit someone's profile and set who they report to.</p>`;
}
function profiles() {
  if (!S.team.length) return `<section class="panel">${empty("team", "No profiles yet", "", `<button class="btn primary sm" id="addMember2">${I.plus}Add my profile</button>`)}</section>`;
  return `<div class="profilegrid">${sortedTeam().map(m => {
    const lead = S.clients.filter(c => c.leadId === m.id), on = S.clients.filter(c => (c.teamIds || []).includes(m.id) && c.leadId !== m.id);
    const open = S.posts.filter(p => p.assigneeId === m.id && p.status !== "Posted" && p.status !== "Approved").length;
    return `<article class="pcard"><div class="top">${avatar(m, "lg")}<div><b>${esc(m.name)}${m.id === S.me ? ' <span class="pill brand">You</span>' : ""}</b><span>${esc(m.role || "")}</span><br><span class="dept" style="font-size:11px;color:var(--maroon);font-weight:600;text-transform:uppercase;letter-spacing:.05em">${esc(m.dept || "")}</span></div></div>
      ${m.bio ? `<p style="margin:0;font-size:14px">${esc(m.bio)}</p>` : ""}
      ${m.skills ? `<div class="skills">${m.skills.split(",").map(s => s.trim()).filter(Boolean).map(s => `<span class="tag">${esc(s)}</span>`).join("")}</div>` : ""}
      <div class="facts"><div>Reports to<b>${esc(memberName(m.reportsTo) || "–")}</b></div><div>Open work<b class="num">${open}</b></div></div>
      ${lead.length || on.length ? `<div class="inline-note">${lead.length ? `In charge of <b>${lead.map(c => esc(c.name)).join(", ")}</b>. ` : ""}${on.length ? `Works on ${on.map(c => esc(c.name)).join(", ")}.` : ""}</div>` : ""}
      <div class="actions" style="margin-top:auto">${m.contact ? `<span class="inline-note">${esc(m.contact)}</span>` : ""}${isUrl(m.portfolio) ? `<a class="btn ghost sm" href="${esc(m.portfolio)}" target="_blank" rel="noopener">${I.link}Portfolio</a>` : ""}<button class="btn ghost sm" data-member="${esc(m.id)}">${I.edit}Edit</button></div></article>`;
  }).join("")}</div>`;
}
function assignments() {
  if (!S.clients.length) return `<section class="panel">${empty("users", "No clients yet", "Add clients, then choose who's in charge of each one.", `<a class="btn ghost sm" href="#clients">Go to Clients</a>`)}</section>`;
  return `<section class="panel"><div class="tablebox"><table class="resp"><thead><tr><th>Client</th><th>In charge</th><th>Team on the account</th><th>Open work</th></tr></thead><tbody>
    ${S.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => {
      const open = S.posts.filter(p => p.clientId === c.id && p.status !== "Posted" && p.status !== "Approved");
      return `<tr><td class="c-main"><a class="t" href="#client-${esc(c.id)}" style="color:inherit">${esc(c.name)}</a><div class="s">${esc(c.pkg)}</div></td>
      <td><select data-setlead="${esc(c.id)}" aria-label="In charge of ${esc(c.name)}">${`<option value="">Not set</option>` + sortedTeam().map(m => `<option value="${esc(m.id)}"${m.id === c.leadId ? " selected" : ""}>${esc(m.name)}</option>`).join("")}</select></td>
      <td>${(c.teamIds || []).map(member).filter(Boolean).map(m => `<span style="display:inline-flex;align-items:center;gap:6px;margin:2px 10px 2px 0">${avatar(m, "sm")}<span style="font-size:13px">${esc(m.name.split(" ")[0])}</span></span>`).join("") || '<span class="inline-note">No one yet</span>'}</td>
      <td class="num">${open.length}</td></tr>`; }).join("")}
  </tbody></table></div></section>`;
}
export function bindTeam(v, r, render) {
  v.querySelector("#addMember")?.addEventListener("click", () => memberForm());
  v.querySelector("#addMember2")?.addEventListener("click", () => memberForm());
  v.querySelector("#seedTeam")?.addEventListener("click", async e => {
    if (S.team.length) return;
    e.target.disabled = true; toast("Adding the team…");
    const ids = {};
    for (const m of STARTER_TEAM) {
      const { key, reports, ...data } = m;
      data.reportsTo = reports ? (ids[reports] || "") : "";
      const id = await addDoc("team", data);
      if (!id) { toast("Couldn't add everyone. Check your access and try again."); return; }
      ids[key] = id;
    }
    toast("Team added. Pick your name under \"Who are you?\"");
  });
  v.querySelectorAll("[data-member]").forEach(b => b.onclick = () => memberForm(member(b.dataset.member)));
  v.querySelectorAll("[data-setlead]").forEach(s => s.onchange = async () => {
    const c = client(s.dataset.setlead), id = s.value; s.blur();
    const teamIds = c.teamIds || []; if (id && !teamIds.includes(id)) teamIds.unshift(id);
    await updateDoc("clients", c.id, { leadId: id, teamIds }); toast("Updated");
  });
}

// ================= PORTAL =================
export function portal(r) {
  const locked = r.startsWith("portal-") ? r.slice(7) : "";
  const cid = locked || S.ui.portalClient;
  const c = client(cid);
  const picker = locked ? "" : `<div style="margin-bottom:16px;max-width:360px"><label class="field" for="portalPick">Preview the portal for<select id="portalPick"><option value="">Choose a client</option>${S.clients.map(x => `<option value="${esc(x.id)}"${x.id === cid ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label></div>`;
  if (!c) return (locked ? "" : head("Client portal", "What a client sees: their calendar, their team, and posts to approve.")) + picker + `<section class="panel">${locked && !S.loaded.clients ? empty("clock", "Loading", "") : locked ? empty("x", "This portal link isn't valid", "Ask M1st Creatives for a new link.") : S.clients.length ? empty("eye", "Choose a client", "Pick a client above to preview their portal.") : empty("users", "No clients yet", "Add a client first.", `<a class="btn ghost sm" href="#clients">Go to Clients</a>`)}</section>`;
  const P = S.posts.filter(p => p.clientId === c.id);
  const review = P.filter(p => p.status === "Ready for review");
  const working = P.filter(p => ["Idea", "In progress", "Changes requested"].includes(p.status)).sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  const done = P.filter(p => ["Approved", "Posted"].includes(p.status)).sort((a, b) => (b.due || "").localeCompare(a.due || ""));
  const lead = member(c.leadId), teamM = (c.teamIds || []).map(member).filter(Boolean);
  const off = S.ui.clientMonth;
  const row = (p, act) => `<div class="reviewcard"><div style="flex:1;min-width:200px"><div style="font-weight:600">${esc(p.title)}</div><div class="muted" style="font-size:13px;display:flex;gap:10px;flex-wrap:wrap;margin-top:2px"><span>${esc(p.type)}</span><span>Planned for ${fmt(p.due)}</span>${postWho(p) ? `<span>Made by ${esc(postWho(p))}</span>` : ""}${isUrl(p.link) ? `<a href="${esc(p.link)}" target="_blank" rel="noopener" style="color:var(--maroon)">View draft ↗</a>` : ""}</div>${p.clientNote ? `<div style="font-size:13px;margin-top:6px">Your note: ${esc(p.clientNote)}</div>` : ""}</div>${act ? `<div class="actions"><button class="btn ghost sm" data-changes="${esc(p.id)}">Request changes</button><button class="btn primary sm" data-approve="${esc(p.id)}">${I.check}Approve</button></div>` : postPill(p.status)}</div>`;
  return picker + `
  <div class="portalhero"><img src="assets/logo-white.png" alt=""><div style="flex:1"><p>M1st Creatives · Client portal</p><h1>${esc(c.name)}</h1><p>${esc(c.pkg)} package</p></div>${lead ? `<div style="display:flex;align-items:center;gap:10px">${avatar(lead)}<div><p style="margin:0">Your account lead</p><b>${esc(lead.name)}</b></div></div>` : ""}</div>
  <div class="kpis"><div class="kpi${review.length ? " attn" : ""}"><div class="lbl">${I.eye}Needs your approval</div><div class="val">${cnt(review.length)}</div></div><div class="kpi"><div class="lbl">${I.clock}In production</div><div class="val">${cnt(working.length)}</div></div><div class="kpi"><div class="lbl">${I.check}Approved or posted</div><div class="val">${cnt(done.length)}</div></div></div>
  <section class="panel" style="margin-bottom:16px"><header><h2>Waiting for your approval</h2><span class="count">${review.length}</span></header><div class="body">${review.length ? review.map(p => row(p, true)).join("") : empty("check", "You're all caught up", "New drafts will appear here for your approval.")}</div></section>
  <section class="panel" style="margin-bottom:16px"><div class="toolbar"><button class="btn ghost sm icon" id="cmPrev" aria-label="Previous month">${I.left}</button><button class="btn ghost sm icon" id="cmNext" aria-label="Next month">${I.right}</button><strong style="font-size:15px">Your content calendar · ${esc(monthLabel(off))}</strong></div>${monthCalendar(P, off, { onlyView: true })}<div class="only-mobile">${agendaList(P.filter(p => p.due >= monthStart(off) && p.due < monthStart(off + 1)), { onlyView: true, showClient: false })}</div></section>
  <div class="cols">
    <section class="panel"><header><h2>Being made by our team</h2><span class="count">${working.length}</span></header><div class="body">${working.length ? working.map(p => row(p, false)).join("") : empty("clock", "Nothing in production", "")}</div></section>
    <section class="panel"><header><h2>Your team</h2></header><div class="body">${teamM.length ? teamM.map(m => `<div class="rowitem">${avatar(m)}<div class="main"><div class="t">${esc(m.name)}</div><div class="m"><span>${esc(m.role || "")}</span>${m.id === c.leadId ? "<span>Account lead</span>" : ""}</div></div></div>`).join("") : empty("team", "Your team is being set up", "")}</div></section>
  </div>
  <section class="panel" style="margin-top:16px"><header><h2>Approved and posted</h2><span class="count">${done.length}</span></header><div class="body">${done.length ? done.map(p => row(p, false)).join("") : empty("check", "No approved posts yet", "")}</div></section>`;
}
export function bindPortal(v, r, render, changesBox) {
  const pick = v.querySelector("#portalPick"); if (pick) pick.onchange = () => { S.ui.portalClient = pick.value; pick.blur(); render(); };
  v.querySelector("#cmPrev")?.addEventListener("click", () => { S.ui.clientMonth--; render(); });
  v.querySelector("#cmNext")?.addEventListener("click", () => { S.ui.clientMonth++; render(); });
  v.querySelectorAll("[data-approve]").forEach(b => b.onclick = async () => { await updateDoc("posts", b.dataset.approve, { status: "Approved", reviewedAt: new Date().toISOString() }); toast("Approved. Thank you!"); });
  v.querySelectorAll("[data-changes]").forEach(b => b.onclick = () => { const p = S.posts.find(x => x.id === b.dataset.changes); if (p) changesBox(p); });
  v.querySelectorAll("[data-viewpost]").forEach(b => b.onclick = () => { const p = S.posts.find(x => x.id === b.dataset.viewpost); if (p) toast(`${p.title} · ${p.status} · ${fmt(p.due)}`); });
}
