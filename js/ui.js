// Reusable UI pieces: pills, avatars, dialogs, forms and the month calendar.
import { esc, I, opts, fmt, today, parse, addDays, monthStart, initials, toast, isUrl } from "./util.js";
import { S, addDoc, updateDoc, deleteDoc, member, memberName, clientName, postWho, followDue, sortedTeam, uploadPhoto, photoUrl } from "./data.js";
import { NICHES, CHANNELS, POST_TYPES, POST_STATUS, PACKAGES, DEPARTMENTS, OWN, TEMPLATES, DETAIL_HINT, fillMessage, CALL_OUTCOMES, PLATFORMS, MAIN_PLATFORMS, PILLARS } from "./content.js";

// ---------- small pieces ----------
export const leadPill = l => followDue(l) ? `<span class="pill warn">Follow-up due</span>` : ({
  Ready: '<span class="pill brand">Ready to send</span>', Sent: '<span class="pill">Sent</span>',
  Replied: '<span class="pill brand">Replied</span>', "Sample sent": '<span class="pill brand">Sample sent</span>',
  "Call booked": '<span class="pill dark">Call booked</span>', Won: '<span class="pill ok">Won</span>', Lost: '<span class="pill muted">Lost</span>'
}[l.status] || `<span class="pill">${esc(l.status)}</span>`);

export const postPill = s => `<span class="pill ${({ "Idea": "muted", "In progress": "", "Ready for review": "warn", "Changes requested": "bad", "Needs rework": "bad", "Approved": "ok", "Disapproved": "muted", "Posted": "dark" })[s] || ""}">${esc(s)}</span>`;

export function avatar(m, size = "") {
  if (!m) return `<span class="avatar ${size}" aria-hidden="true">?</span>`;
  if (m.photoId) return `<img class="avatar ${size}" src="${esc(photoUrl(m.photoId))}" alt="">`;
  return `<span class="avatar ${size}${m.dept === "Leadership" ? " m" : ""}" aria-hidden="true">${esc(initials(m.name))}</span>`;
}
export const avatarStack = ids => `<span class="avstack">${ids.map(id => member(id)).filter(Boolean).slice(0, 5).map(m => avatar(m, "sm")).join("")}</span>`;
export const teamOptions = (sel, blank = "Unassigned") => `<option value="">${esc(blank)}</option>` + sortedTeam().map(m => `<option value="${esc(m.id)}"${m.id === sel ? " selected" : ""}>${esc(m.name)}${m.role ? " · " + esc(m.role) : ""}</option>`).join("");

// ---------- dialog ----------
const dlg = () => document.getElementById("dlg");
let afterClose = null;
export function openDialog(title, body, foot, onBind) {
  const d = dlg();
  document.getElementById("dlgbody").innerHTML = `<header><h2>${esc(title)}</h2><button class="btn ghost sm icon" type="button" id="dlgX" aria-label="Close">${I.x}</button></header>${body}${foot ? `<footer>${foot}</footer>` : ""}`;
  if (!d.open) d.showModal();
  document.getElementById("dlgX").onclick = () => d.close();
  onBind && onBind();
}
export const closeDialog = () => dlg().close();
export function initDialog(onClosed) {
  const d = dlg();
  d.addEventListener("click", e => { if (e.target === d) d.close(); });
  d.addEventListener("close", () => onClosed());
}
export function confirmBox(msg, yes, label = "Delete") {
  openDialog(msg, `<div class="db muted">This can't be undone.</div>`, `<button class="btn ghost" id="cNo">Cancel</button><button class="btn primary" id="cYes">${esc(label)}</button>`, () => {
    document.getElementById("cNo").onclick = closeDialog;
    document.getElementById("cYes").onclick = async () => { closeDialog(); await yes(); };
  });
}
export async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch (e) {
    openDialog("Copy this", `<div class="db"><textarea id="cpy" rows="9" readonly>${esc(text)}</textarea><p class="muted" style="font-size:13px">Press and hold, or use Ctrl+C, to copy.</p></div>`, `<button class="btn" id="cpyOk">Done</button>`, () => {
      const t = document.getElementById("cpy"); t.focus(); t.select(); document.getElementById("cpyOk").onclick = closeDialog;
    });
  }
}
const formData = form => Object.fromEntries(new FormData(form));

// ---------- forms ----------
export function prepareLeadForm(lead) {
  const isNew = !lead;
  const l = lead || { niche: NICHES[0], channel: CHANNELS[0], name: "", business: "", contact: "", detail: "", message: "" };
  openDialog(isNew ? "Prepare a message" : "Edit message", `<form class="form db" id="prepForm">
    <div class="frow"><label class="field" for="pp-business">Business name<input id="pp-business" name="business" required autocomplete="off" value="${esc(l.business)}" placeholder="e.g. Bright Spark Electric"></label>
      <label class="field" for="pp-name">Their first name<input id="pp-name" name="name" autocomplete="off" value="${esc(l.name)}" placeholder="e.g. Sarah"></label></div>
    <div class="frow"><label class="field" for="pp-niche">Niche<select id="pp-niche" name="niche">${opts(NICHES, l.niche)}</select></label>
      <label class="field" for="pp-channel">Send on<select id="pp-channel" name="channel">${opts(CHANNELS, l.channel)}</select></label></div>
    <label class="field" for="pp-contact">Profile link, handle or email<input id="pp-contact" name="contact" autocomplete="off" value="${esc(l.contact)}" placeholder="https://instagram.com/... or name@business.com"></label>
    <label class="field" for="pp-detail">One thing you noticed on their page<input id="pp-detail" name="detail" autocomplete="off" value="${esc(l.detail)}" placeholder="${esc(DETAIL_HINT[l.niche] || "")}"></label>
    <label class="field" for="pp-msg">Message (edit freely)<textarea id="pp-msg" name="message" rows="9">${esc(l.message || "")}</textarea></label>
    <p class="inline-note" style="margin:0" id="pp-hint">The message fills in as you type. Once you edit it by hand, it stops updating.</p>
  </form>`, `${isNew ? "" : `<button class="btn ghost" type="button" id="ppDel" style="margin-right:auto">${I.trash}Delete</button>`}<button class="btn ghost" type="button" id="ppCancel">Cancel</button><button class="btn primary" type="submit" form="prepForm">${isNew ? "Add to queue" : "Save"}</button>`, () => {
    const f = document.getElementById("prepForm"), msg = f.elements.message;
    let touched = !!(l.message && !isNew);
    const regen = () => { if (touched) return; const v = formData(f); msg.value = fillMessage(TEMPLATES[v.niche], v); f.elements.detail.placeholder = DETAIL_HINT[v.niche] || ""; };
    msg.addEventListener("input", () => { touched = true; });
    ["business", "name", "detail", "niche"].forEach(n => f.elements[n].addEventListener(n === "niche" ? "change" : "input", regen));
    if (!msg.value) regen();
    document.getElementById("ppCancel").onclick = closeDialog;
    const del = document.getElementById("ppDel");
    if (del) del.onclick = () => confirmBox(`Delete ${l.business}?`, () => deleteDoc("leads", l.id));
    f.onsubmit = async e => {
      e.preventDefault(); const d = formData(f); d.business = d.business.trim(); if (!d.business) return;
      closeDialog();
      if (isNew) { d.status = "Ready"; d.followedUp = false; await addDoc("leads", d); toast("Added to the ready-to-send queue"); }
      else { await updateDoc("leads", l.id, d); toast("Saved"); }
    };
    setTimeout(() => document.getElementById("pp-business")?.focus(), 30);
  });
}

export function logSentForm() {
  openDialog("Log a sent message", `<form class="form db" id="leadForm">
    <label class="field" for="lf-business">Business name<input id="lf-business" name="business" required autocomplete="off"></label>
    <div class="frow"><label class="field" for="lf-niche">Niche<select id="lf-niche" name="niche">${opts(NICHES)}</select></label><label class="field" for="lf-channel">Channel<select id="lf-channel" name="channel">${opts(CHANNELS)}</select></label></div>
    <div class="frow"><label class="field" for="lf-contact">Contact or page<input id="lf-contact" name="contact" autocomplete="off"></label><label class="field" for="lf-sent">Date sent<input id="lf-sent" type="date" name="sentOn" value="${today()}" required></label></div>
    <label class="field" for="lf-notes">Note<input id="lf-notes" name="notes" autocomplete="off"></label>
  </form>`, `<button class="btn ghost" type="button" id="lfCancel">Cancel</button><button class="btn primary" type="submit" form="leadForm">Save</button>`, () => {
    document.getElementById("lfCancel").onclick = closeDialog;
    document.getElementById("leadForm").onsubmit = async e => {
      e.preventDefault(); const d = formData(e.target); d.business = d.business.trim(); if (!d.business) return;
      d.status = "Sent"; d.followedUp = false; d.sentBy = S.me || ""; closeDialog(); await addDoc("leads", d); toast("Logged");
    };
  });
}

export function clientForm(c, prefill) {
  const isNew = !c; const p = c || prefill || {};
  const teamIds = p.teamIds || [];
  openDialog(isNew ? "Add client" : "Edit client", `<form class="form db" id="clientForm">
    <label class="field" for="cf-name">Business name<input id="cf-name" name="name" required autocomplete="off" value="${esc(p.name)}"></label>
    <div class="frow"><label class="field" for="cf-pkg">Package<select id="cf-pkg" name="pkg">${opts(PACKAGES, p.pkg)}</select></label><label class="field" for="cf-niche">Niche<select id="cf-niche" name="niche">${opts(NICHES, p.niche)}</select></label></div>
    <div class="frow"><label class="field" for="cf-contact">Contact person<input id="cf-contact" name="contact" autocomplete="off" value="${esc(p.contact)}"></label><label class="field" for="cf-email">Contact email or handle<input id="cf-email" name="email" autocomplete="off" value="${esc(p.email)}"></label></div>
    <div class="frow"><label class="field" for="cf-lead">In charge (account lead)<select id="cf-lead" name="leadId">${teamOptions(p.leadId || S.me, "Not set")}</select></label><label class="field" for="cf-start">Start date<input id="cf-start" type="date" name="start" value="${esc(p.start || today())}"></label></div>
    <fieldset style="border:none;padding:0;margin:0"><legend class="field" style="margin-bottom:6px">Team on this account</legend>
      ${S.team.length ? `<div class="checks">${sortedTeam().map(m => `<label><input type="checkbox" name="team" value="${esc(m.id)}"${teamIds.includes(m.id) ? " checked" : ""}>${esc(m.name)}</label>`).join("")}</div>` : `<p class="inline-note" style="margin:0">Add people on the Team page first.</p>`}
    </fieldset>
    <label class="field" for="cf-notes">Notes (brand colors, tone, do's and don'ts)<textarea id="cf-notes" name="notes" rows="3">${esc(p.notes)}</textarea></label>
  </form>`, `${isNew ? "" : `<button class="btn ghost" type="button" id="cfDel" style="margin-right:auto">${I.trash}Delete</button>`}<button class="btn ghost" type="button" id="cfCancel">Cancel</button><button class="btn primary" type="submit" form="clientForm">${isNew ? "Add client" : "Save"}</button>`, () => {
    document.getElementById("cfCancel").onclick = closeDialog;
    const del = document.getElementById("cfDel");
    if (del) del.onclick = () => confirmBox(`Delete ${p.name}? Their posts stay in the calendar.`, async () => { await deleteDoc("clients", c.id); location.hash = "#clients"; });
    document.getElementById("clientForm").onsubmit = async e => {
      e.preventDefault(); const f = e.target; const d = formData(f); delete d.team;
      d.teamIds = [...f.querySelectorAll('input[name="team"]:checked')].map(x => x.value);
      if (d.leadId && !d.teamIds.includes(d.leadId)) d.teamIds.unshift(d.leadId);
      d.name = d.name.trim(); if (!d.name) return;
      if (isNew && S.clients.some(x => x.name.toLowerCase() === d.name.toLowerCase())) { toast("That client already exists"); return; }
      closeDialog();
      if (isNew) { d.status = "Active"; const id = await addDoc("clients", d); toast("Client added"); if (id) location.hash = "#client-" + id; }
      else { await updateDoc("clients", c.id, d); toast("Client saved"); }
    };
  });
}

export function postForm(p, defaults = {}) {
  const isNew = !p;
  p = p || { clientId: OWN, type: "Post", status: "Idea", due: today(), title: "", assigneeId: S.me || "", link: "", notes: "", platforms: [...MAIN_PLATFORMS], ...defaults };
  const legacy = !p.assigneeId && p.assignee ? `<p class="inline-note" style="margin:0">Previously assigned to: ${esc(p.assignee)}</p>` : "";
  openDialog(isNew ? "Add work" : "Edit work", `<form class="form db" id="postForm">
    <label class="field" for="pf-title">Title<input id="pf-title" name="title" required value="${esc(p.title)}" autocomplete="off" placeholder="e.g. Fall menu reel"></label>
    <div class="frow"><label class="field" for="pf-client">Client<select id="pf-client" name="clientId"><option value="${OWN}"${p.clientId === OWN ? " selected" : ""}>M1st (our page)</option>${S.clients.map(c => `<option value="${esc(c.id)}"${c.id === p.clientId ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
      <label class="field" for="pf-who">Made by<select id="pf-who" name="assigneeId">${teamOptions(p.assigneeId)}</select></label></div>
    ${legacy}
    <div class="frow"><label class="field" for="pf-type">Type<select id="pf-type" name="type">${opts(POST_TYPES, p.type)}</select></label><label class="field" for="pf-due">Due<input id="pf-due" type="date" name="due" required value="${esc(p.due)}"></label><label class="field" for="pf-status">Status<select id="pf-status" name="status">${opts(POST_STATUS, p.status)}</select></label></div>
    <div class="frow" id="pf-mk"><label class="field" for="pf-pillar">Content pillar (M1st posts)<select id="pf-pillar" name="pillar"><option value="">None</option>${PILLARS.map(x => `<option${x.name === p.pillar ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label><label class="field" for="pf-camp">Campaign<select id="pf-camp" name="campaignId"><option value="">None</option>${S.campaigns.map(c => `<option value="${esc(c.id)}"${c.id === p.campaignId ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label></div>
    <label class="field" for="pf-caption">Caption (for posting)<textarea id="pf-caption" name="caption" rows="3" placeholder="Write the caption and hashtags here">${esc(p.caption)}</textarea></label>
    <fieldset style="border:none;padding:0;margin:0"><legend class="field" style="margin-bottom:6px">Post on</legend><div class="checks">${MAIN_PLATFORMS.map(x => `<label><input type="checkbox" name="plat" value="${esc(x)}"${(p.platforms || []).includes(x) ? " checked" : ""}>${esc(x)}</label>`).join("")}</div></fieldset>
    <label class="field" for="pf-link">Draft link for the client<input id="pf-link" name="link" type="url" value="${esc(p.link)}" placeholder="https://drive.google.com/..." autocomplete="off"></label>
    <label class="field" for="pf-notes">Notes for the team<textarea id="pf-notes" name="notes" rows="2">${esc(p.notes)}</textarea></label>
    ${p.clientNote ? `<div class="banner" style="margin:0">Client note: ${esc(p.clientNote)}</div>` : ""}
  </form>`, `${isNew ? "" : `<button class="btn ghost" type="button" id="postDel" style="margin-right:auto">${I.trash}Delete</button>`}<button class="btn ghost" type="button" id="pfCancel">Cancel</button><button class="btn primary" type="submit" form="postForm">${isNew ? "Add work" : "Save changes"}</button>`, () => {
    document.getElementById("pfCancel").onclick = closeDialog;
    const cl = document.getElementById("pf-client"), mk = document.getElementById("pf-mk");
    const sync = () => mk.classList.toggle("hidden", cl.value !== OWN); cl.addEventListener("change", sync); sync();
    document.getElementById("postForm").onsubmit = async e => {
      e.preventDefault(); const d = formData(e.target); delete d.plat;
      d.platforms = [...e.target.querySelectorAll('input[name="plat"]:checked')].map(x => x.value); closeDialog();
      if (isNew) { await addDoc("posts", d); toast("Work added"); }
      else { const patch = {}; for (const k in d) if (JSON.stringify(d[k]) !== JSON.stringify(p[k] ?? (k === "platforms" ? [] : ""))) patch[k] = d[k]; if (Object.keys(patch).length) { await updateDoc("posts", p.id, patch); toast("Saved"); } }
    };
    const del = document.getElementById("postDel");
    if (del) del.onclick = () => confirmBox(`Delete "${p.title}"?`, async () => { await deleteDoc("posts", p.id); toast("Deleted"); });
  });
}

export function memberForm(m) {
  const isNew = !m; const p = m || { dept: DEPARTMENTS[1] };
  const others = sortedTeam().filter(x => !m || x.id !== m.id);
  openDialog(isNew ? "Add a profile" : "Edit profile", `<form class="form db" id="memForm">
    <div style="display:flex;gap:14px;align-items:center">${avatar(p.photoId || p.name ? p : null, "lg")}
      <div class="form" style="gap:6px;flex:1">${S.assets ? `<label class="field" for="mf-photo">Profile photo<input id="mf-photo" type="file" accept="image/*"></label><input type="hidden" name="photoId" value="${esc(p.photoId)}">` : `<p class="inline-note" style="margin:0">Photo upload works when the app is opened on claude.ai by an Editor.</p>`}</div></div>
    <div class="frow"><label class="field" for="mf-name">Full name<input id="mf-name" name="name" required autocomplete="off" value="${esc(p.name)}"></label><label class="field" for="mf-role">Role / title<input id="mf-role" name="role" required autocomplete="off" value="${esc(p.role)}" placeholder="e.g. Head Video Editor"></label></div>
    <div class="frow"><label class="field" for="mf-dept">Department<select id="mf-dept" name="dept">${opts(DEPARTMENTS, p.dept)}</select></label><label class="field" for="mf-reports">Reports to<select id="mf-reports" name="reportsTo"><option value="">Nobody (top of chart)</option>${others.map(o => `<option value="${esc(o.id)}"${o.id === p.reportsTo ? " selected" : ""}>${esc(o.name)}</option>`).join("")}</select></label></div>
    <label class="field" for="mf-skills">Skills (comma separated)<input id="mf-skills" name="skills" autocomplete="off" value="${esc(p.skills)}" placeholder="e.g. Premiere Pro, color grading, motion graphics"></label>
    <div class="frow"><label class="field" for="mf-contact">Contact (email, phone or handle)<input id="mf-contact" name="contact" autocomplete="off" value="${esc(p.contact)}"></label><label class="field" for="mf-portfolio">Portfolio link<input id="mf-portfolio" name="portfolio" type="url" autocomplete="off" value="${esc(p.portfolio)}" placeholder="https://behance.net/..."></label></div>
    <label class="field" for="mf-bio">Short bio<textarea id="mf-bio" name="bio" rows="3">${esc(p.bio)}</textarea></label>
    ${isNew ? `<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="isMe" style="width:16px;height:16px;min-height:0;accent-color:var(--maroon)" ${S.me ? "" : "checked"}> This is me</label>` : ""}
  </form>`, `${isNew ? "" : `<button class="btn ghost" type="button" id="mfDel" style="margin-right:auto">${I.trash}Remove</button>`}<button class="btn ghost" type="button" id="mfCancel">Cancel</button><button class="btn primary" type="submit" form="memForm">${isNew ? "Add profile" : "Save profile"}</button>`, () => {
    document.getElementById("mfCancel").onclick = closeDialog;
    const f = document.getElementById("memForm");
    const ph = document.getElementById("mf-photo");
    if (ph) ph.onchange = async () => {
      const file = ph.files[0]; if (!file) return;
      ph.disabled = true; toast("Uploading photo…");
      const id = await uploadPhoto(file); ph.disabled = false;
      if (id) { f.elements.photoId.value = id; toast("Photo ready. Save to keep it."); f.querySelector(".avatar")?.replaceWith(Object.assign(document.createElement("img"), { className: "avatar lg", src: photoUrl(id), alt: "" })); }
    };
    const del = document.getElementById("mfDel");
    if (del) del.onclick = () => confirmBox(`Remove ${p.name} from the team?`, async () => {
      await deleteDoc("team", m.id);
      for (const x of S.team.filter(t => t.reportsTo === m.id)) await updateDoc("team", x.id, { reportsTo: m.reportsTo || "" });
    }, "Remove");
    f.onsubmit = async e => {
      e.preventDefault(); const d = formData(f); const isMe = !!d.isMe; delete d.isMe;
      d.name = d.name.trim(); if (!d.name) return; closeDialog();
      if (isNew) { const id = await addDoc("team", d); if (id && isMe) { const { setMe } = await import("./data.js"); setMe(id); } toast("Profile added"); }
      else { await updateDoc("team", m.id, d); toast("Profile saved"); }
    };
  });
}

export function logCallForm(leadId) {
  const leads = S.leads.slice().sort((a, b) => (a.business || "").localeCompare(b.business || ""));
  openDialog("Log a call", `<form class="form db" id="callForm">
    <label class="field" for="lc-lead">Who did you call?<select id="lc-lead" name="leadId"><option value="">Choose a lead or client</option>${leads.map(l => `<option value="${esc(l.id)}"${l.id === leadId ? " selected" : ""}>${esc(l.business)}</option>`).join("")}</select></label>
    <div class="frow"><label class="field" for="lc-out">Outcome<select id="lc-out" name="outcome">${opts(CALL_OUTCOMES)}</select></label><label class="field" for="lc-date">Date<input id="lc-date" type="date" name="date" value="${today()}"></label></div>
    <label class="field" for="lc-next">Next step<input id="lc-next" name="next" autocomplete="off" placeholder="e.g. Send invoice for Growth"></label>
    <label class="field" for="lc-notes">Notes (their words, goals, budget)<textarea id="lc-notes" name="notes" rows="4"></textarea></label>
  </form>`, `<button class="btn ghost" type="button" id="lcCancel">Cancel</button><button class="btn primary" type="submit" form="callForm">Save call</button>`, () => {
    document.getElementById("lcCancel").onclick = closeDialog;
    document.getElementById("callForm").onsubmit = async e => {
      e.preventDefault(); const d = formData(e.target); if (!d.leadId) { toast("Choose who you called"); return; }
      d.by = S.me || ""; closeDialog(); await addDoc("calls", d);
      const map = { "Booked a sample": "Sample sent", "Won the client": "Won", "Not a fit": "Lost" };
      const l = S.leads.find(x => x.id === d.leadId);
      if (l && map[d.outcome] && l.status !== map[d.outcome]) await updateDoc("leads", l.id, { status: map[d.outcome] });
      toast("Call saved");
    };
  });
}

// ---------- month calendar ----------
export function monthCalendar(posts, offset, { onlyView = false } = {}) {
  const first = monthStart(offset), f = parse(first);
  const start = addDays(first, -((f.getDay() + 6) % 7));
  const t = today(), month = f.getMonth();
  const cells = [...Array(42)].map((_, i) => addDays(start, i));
  const rows = cells[35] && parse(cells[35]).getMonth() !== month ? 35 : 42;
  const cls = p => p.status === "Ready for review" ? " s-review" : p.status === "Changes requested" ? " s-changes" : (p.status === "Posted" || p.status === "Approved") ? " s-done" : "";
  return `<div class="month" role="grid" aria-label="${esc(f.toLocaleDateString(undefined, { month: "long", year: "numeric" }))}">
    ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => `<div class="wd" role="columnheader">${d}</div>`).join("")}
    ${cells.slice(0, rows).map(d => {
      const P = posts.filter(p => p.due === d); const show = P.slice(0, 3);
      return `<div class="cell${parse(d).getMonth() !== month ? " out" : ""}${d === t ? " today" : ""}" role="gridcell"><span class="dn">${parse(d).getDate()}</span><div class="chips">${show.map(p => p._attr ? `<button class="chipbtn ${p._cls || ""}" ${p._attr}${p._style ? ` style="${esc(p._style)}"` : ""} title="${esc(p.title)}">${esc(p.title)}</button>` : `<button class="chipbtn${p.clientId === OWN ? " own" : ""}${cls(p)}" ${onlyView ? `data-viewpost="${esc(p.id)}"` : `data-post="${esc(p.id)}"`} title="${esc(p.title)} · ${esc(p.status)}${postWho(p) ? " · " + esc(postWho(p)) : ""}">${esc(p.title)}</button>`).join("")}</div>${P.length > 3 ? `<span class="more">+${P.length - 3} more</span>` : ""}</div>`;
    }).join("")}
  </div>`;
}
export function agendaList(posts, { onlyView = false, showClient = true } = {}) {
  const dates = [...new Set(posts.map(p => p.due))].sort();
  if (!dates.length) return "";
  return `<div class="agenda">${dates.map(d => `<div class="ad"><div class="dd"><b>${parse(d).getDate()}</b><span>${parse(d).toLocaleDateString(undefined, { weekday: "short" })}</span></div><div class="its">${posts.filter(p => p.due === d).map(p => `
    <div class="rowitem" style="padding:4px 0;border:none">${avatar(member(p.assigneeId), "sm")}<div class="main"><div class="t">${onlyView ? esc(p.title) : `<a href="#" data-post="${esc(p.id)}" style="color:inherit">${esc(p.title)}</a>`}</div><div class="m"><span>${esc(p.type)}</span>${showClient ? `<span>${esc(clientName(p.clientId))}</span>` : ""}${postWho(p) && !onlyView ? `<span>${esc(postWho(p))}</span>` : ""}</div></div>${postPill(p.status)}</div>`).join("")}</div></div>`).join("")}</div>`;
}
export { isUrl, memberName, formData };
