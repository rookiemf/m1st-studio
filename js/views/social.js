// Social: publish approved work with free tools, keep a shared inbox log, and list M1st's accounts.
// Nothing here connects to the social networks; buttons open each platform's own site.
import { esc, I, fmt, today, head, empty, cnt, toast, opts, ago, isUrl } from "../util.js";
import { S, addDoc, updateDoc, deleteDoc, member, memberName, clientName, postWho } from "../data.js";
import { PLATFORMS, MAIN_PLATFORMS, SOCIAL_TOOLS, MSG_TOPICS, MSG_STATUS, NICHES, OWN } from "../content.js";
import { avatar, openDialog, closeDialog, confirmBox, copyText, teamOptions, formData, postPill } from "../ui.js";
import { bookingForm } from "./local.js";

const tabs = r => {
  const ready = S.posts.filter(p => p.status === "Approved").length;
  const fresh = S.messages.filter(m => m.status === "New").length;
  return `<nav class="subtabs" aria-label="Social views"><a href="#social"${r === "social" ? ' aria-current="page"' : ""}>Ready to publish${ready ? ` <span class="badge">${ready}</span>` : ""}</a><a href="#social-inbox"${r === "social-inbox" ? ' aria-current="page"' : ""}>Messages${fresh ? ` <span class="badge">${fresh}</span>` : ""}</a><a href="#social-accounts"${r === "social-accounts" ? ' aria-current="page"' : ""}>Accounts and tools</a></nav>`;
};
const toolFor = plat => SOCIAL_TOOLS.find(t => t.for.includes(plat));

export function social(r) {
  const body = r === "social-inbox" ? inbox() : r === "social-accounts" ? accounts() : publish();
  const act = r === "social-inbox" ? `<button class="btn primary" id="logMsg">${I.plus}Log a message</button>` : r === "social-accounts" ? `<button class="btn primary" id="addAcct">${I.plus}Add an account</button>` : `<a class="btn ghost" href="#calendar">${I.cal}Calendar</a>`;
  return head("Social", "Publish finished work, and keep track of every message so nobody gets missed.", act) + tabs(r) + body;
}

function publish() {
  const t = today();
  const ready = S.posts.filter(p => p.status === "Approved").sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  const recent = S.posts.filter(p => p.status === "Posted" && p.postedAt).sort((a, b) => b.postedAt.localeCompare(a.postedAt)).slice(0, 5);
  return `<div class="banner" style="background:#F3F1F1;border-color:var(--line);color:var(--grey-900)">Approved work shows up here. Copy the caption, open Meta Business Suite (Facebook and Instagram together) or LinkedIn, post it, then tap <b>Mark as posted</b>.</div>
  ${ready.length ? `<div class="queue">${ready.map(p => {
    const plats = (p.platforms || []).length ? p.platforms : MAIN_PLATFORMS;
    return `<article class="qcard">
      <div class="qi"><div style="display:flex;justify-content:space-between;gap:8px"><div><div style="font-weight:600;font-size:16px">${esc(p.title)}</div><div class="inline-note">${esc(clientName(p.clientId))} · ${esc(p.type)}</div></div>${postPill(p.status)}</div>
        <div class="inline-note ${p.due < t ? "due" : ""}">${p.due < t ? "Was due" : "Post on"} ${fmt(p.due)}${postWho(p) ? ` · made by ${esc(postWho(p))}` : ""}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${plats.map(x => `<span class="tag">${esc(x)}</span>`).join("")}</div>
        ${isUrl(p.link) ? `<a class="btn ghost sm" href="${esc(p.link)}" target="_blank" rel="noopener" style="align-self:flex-start">${I.link}Get the file</a>` : `<span class="inline-note">Add a draft link to this work so the file is easy to find.</span>`}</div>
      <div class="qm"><div class="msg" id="cap-${esc(p.id)}">${esc(p.caption || "No caption yet. Edit this work in the Calendar to add one.")}</div>
        <div class="actions">${p.caption ? `<button class="btn ghost sm" data-copycap="${esc(p.id)}">${I.copy}Copy caption</button>` : `<button class="btn ghost sm" data-post="${esc(p.id)}">${I.edit}Add caption</button>`}
          ${[...new Set(plats.map(toolFor).filter(Boolean))].map(tl => `<a class="btn ghost sm" href="${esc(tl.post)}" target="_blank" rel="noopener">Open ${esc(tl.name)} ↗</a>`).join("")}
          <button class="btn primary sm" data-posted="${esc(p.id)}">${I.check}Mark as posted</button></div></div>
    </article>`; }).join("")}</div>`
  : `<section class="panel">${empty("send", "Nothing waiting to be posted", "When a client approves work (or you approve M1st's own posts), it lands here ready to publish.", `<a class="btn ghost sm" href="#calendar">Open the calendar</a>`)}</section>`}
  ${recent.length ? `<section class="panel" style="margin-top:16px"><header><h2>Recently posted</h2></header><div class="body">${recent.map(p => `<div class="rowitem"><span class="dot${p.clientId === OWN ? " own" : ""}" aria-hidden="true"></span><div class="main"><div class="t">${esc(p.title)}</div><div class="m"><span>${esc(clientName(p.clientId))}</span><span>${esc((p.platforms || []).join(", "))}</span><span>${ago(p.postedAt)}</span>${p.postedBy ? `<span>by ${esc(memberName(p.postedBy))}</span>` : ""}</div></div></div>`).join("")}</div></section>` : ""}`;
}

function inbox() {
  const f = S.ui.msgFilter;
  let L = S.messages.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  if (f === "open") L = L.filter(m => m.status !== "Closed"); else if (f === "mine") L = L.filter(m => m.assignedTo === S.me && m.status !== "Closed"); else if (f) L = L.filter(m => m.status === f);
  const fresh = S.messages.filter(m => m.status === "New");
  const old = fresh.filter(m => m.createdAt && (Date.now() - new Date(m.createdAt)) > 24 * 3600e3).length;
  return `<div class="kpis">
      <div class="kpi${fresh.length ? " attn" : ""}"><div class="lbl">${fresh.length ? '<span class="pulse" aria-hidden="true"></span>' : I.chat}Waiting for a reply</div><div class="val">${cnt(fresh.length)}</div><div class="sub">${old ? `${old} older than a day` : "Reply within a few hours"}</div></div>
      <div class="kpi"><div class="lbl">${I.users}Assigned to you</div><div class="val">${cnt(S.messages.filter(m => m.assignedTo === S.me && m.status !== "Closed").length)}</div><div class="sub">${S.me ? "Open messages" : "Pick your name in the sidebar"}</div></div>
      <div class="kpi"><div class="lbl">${I.check}Replied this month</div><div class="val">${cnt(S.messages.filter(m => m.repliedOn && m.repliedOn >= today().slice(0, 8) + "01").length)}</div><div class="sub">Messages answered</div></div>
    </div>
    <div class="cols" style="grid-template-columns:minmax(0,2fr) minmax(260px,1fr);align-items:start">
    <section class="panel"><div class="toolbar"><div class="seg" role="group" aria-label="Show">${[["open", "Open"], ["mine", "Mine"], ["New", "New"], ["Replied", "Replied"], ["Closed", "Closed"], ["", "All"]].map(([k, l]) => `<button type="button" data-mf="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div></div>
      ${L.length ? `<div class="body">${L.map(m => `<div class="rowitem" style="align-items:flex-start">
        ${avatar(member(m.assignedTo), "sm")}
        <div class="main"><div class="t">${esc(m.from)} <span class="tag" style="margin-left:4px">${esc(m.platform)}</span></div>
          <div class="m"><span>${esc(m.topic)}</span><span>${ago(m.createdAt)}</span>${m.assignedTo ? `<span>${esc(memberName(m.assignedTo))} replying</span>` : '<span class="due">Nobody assigned</span>'}</div>
          ${m.summary ? `<div style="font-size:14px;margin-top:6px;white-space:pre-wrap">${esc(m.summary)}</div>` : ""}
          <div class="actions" style="margin-top:8px">
            <select data-assign="${esc(m.id)}" aria-label="Who replies">${teamOptions(m.assignedTo, "Assign to…")}</select>
            ${isUrl(m.link) ? `<a class="btn ghost sm" href="${esc(m.link)}" target="_blank" rel="noopener">Open chat ↗</a>` : ""}
            ${m.status === "New" ? `<button class="btn primary sm" data-replied="${esc(m.id)}">${I.check}Replied</button>` : ""}
            ${m.status !== "Closed" ? `<button class="btn ghost sm" data-close="${esc(m.id)}">Close</button>` : ""}
            ${m.topic === "Booking a shoot" && !m.bookingMade ? `<button class="btn ghost sm" data-tobooking="${esc(m.id)}">Make a booking</button>` : ""}
            ${m.topic === "Overseas client lead" && !m.leadMade ? `<button class="btn ghost sm" data-tolead="${esc(m.id)}">Add to outreach</button>` : ""}
            <button class="btn ghost sm icon" data-delmsg="${esc(m.id)}" aria-label="Delete">${I.trash}</button></div></div>
        ${m.status === "New" ? '<span class="pill warn">New</span>' : m.status === "Replied" ? '<span class="pill ok">Replied</span>' : '<span class="pill muted">Closed</span>'}</div>`).join("")}</div>`
      : empty("chat", S.messages.length ? "Nothing here" : "No messages logged yet", "When someone messages any M1st page, log it here and assign who replies.")}</section>
    <section class="panel"><header><h2>Open an inbox</h2></header><div class="body">${SOCIAL_TOOLS.filter(t => t.inbox).map(t => `<div class="rowitem"><div class="main"><div class="t">${esc(t.name)}</div></div><a class="btn ghost sm" href="${esc(t.inbox)}" target="_blank" rel="noopener">Open ↗</a></div>`).join("")}<p class="inline-note">Check these at least twice a day: morning and evening.</p></div></section>
    </div>`;
}

function accounts() {
  return `<section class="panel" style="margin-bottom:16px"><header><h2>M1st's accounts</h2><span class="count">${S.socials.length}</span></header>
    ${S.socials.length ? `<div class="tablebox"><table class="resp"><thead><tr><th>Platform</th><th>Handle</th><th>Managed by</th><th class="right"><span class="hidden">Actions</span></th></tr></thead><tbody>${S.socials.slice().sort((a, b) => a.platform.localeCompare(b.platform)).map(a => `<tr><td class="c-main"><div class="t">${esc(a.platform)}</div>${a.notes ? `<div class="s">${esc(a.notes)}</div>` : ""}</td><td>${esc(a.handle)}</td><td>${a.ownerId ? `<span style="display:inline-flex;gap:6px;align-items:center">${avatar(member(a.ownerId), "sm")}${esc(memberName(a.ownerId))}</span>` : "–"}</td><td class="right" style="white-space:nowrap">${isUrl(a.url) ? `<a class="btn ghost sm" href="${esc(a.url)}" target="_blank" rel="noopener">${I.link}Open</a> ` : ""}<button class="btn ghost sm icon" data-editacct="${esc(a.id)}" aria-label="Edit">${I.edit}</button></td></tr>`).join("")}</tbody></table></div>`
    : `<div class="body">${empty("link", "No accounts listed yet", "List M1st's pages so the team knows where to post and who manages each one.")}</div>`}
    ${MAIN_PLATFORMS.filter(pl => !S.socials.some(a => a.platform === pl)).length ? `<div class="toolbar" style="border-top:1px solid var(--line);border-bottom:none"><span class="inline-note">Not listed yet:</span>${MAIN_PLATFORMS.filter(pl => !S.socials.some(a => a.platform === pl)).map(pl => `<button class="btn ghost sm" data-quickacct="${pl}">${I.plus}${pl}</button>`).join("")}</div>` : ""}</section>
    <section class="panel"><header><h2>Free tools to post and reply</h2></header><div class="body">${SOCIAL_TOOLS.map(t => `<div class="rowitem"><div class="main"><div class="t">${esc(t.name)}</div><div class="m"><span>${esc(t.what)}</span></div></div><a class="btn ghost sm" href="${esc(t.post)}" target="_blank" rel="noopener">Open ↗</a></div>`).join("")}</div></section>
    <p class="inline-note">Never save passwords in this app. Keep logins in each person's own password manager.</p>`;
}

function msgForm() {
  openDialog("Log a message", `<form class="form db" id="msgForm">
    <div class="frow"><label class="field" for="mg-from">From<input id="mg-from" name="from" required autocomplete="off" placeholder="Name or @handle"></label><label class="field" for="mg-plat">Platform<select id="mg-plat" name="platform">${opts(PLATFORMS)}</select></label></div>
    <div class="frow"><label class="field" for="mg-topic">About<select id="mg-topic" name="topic">${opts(MSG_TOPICS)}</select></label><label class="field" for="mg-who">Who replies<select id="mg-who" name="assignedTo">${teamOptions(S.me, "Not assigned")}</select></label></div>
    <label class="field" for="mg-sum">What did they say?<textarea id="mg-sum" name="summary" rows="3" placeholder="Short summary, or paste the message"></textarea></label>
    <label class="field" for="mg-link">Link to the chat (optional)<input id="mg-link" name="link" type="url" autocomplete="off"></label>
  </form>`, `<button class="btn ghost" type="button" id="mgCancel">Cancel</button><button class="btn primary" type="submit" form="msgForm">Save</button>`, () => {
    document.getElementById("mgCancel").onclick = closeDialog;
    document.getElementById("msgForm").onsubmit = async e => { e.preventDefault(); const d = formData(e.target); d.from = d.from.trim(); if (!d.from) return; d.status = "New"; closeDialog(); await addDoc("messages", d); toast("Message logged"); };
  });
}
function acctForm(a, prefill = {}) {
  const isNew = !a; const p = a || { platform: "Facebook", ...prefill };
  openDialog(isNew ? "Add an account" : "Edit account", `<form class="form db" id="acForm">
    <div class="frow"><label class="field" for="ac-plat">Platform<select id="ac-plat" name="platform">${opts(PLATFORMS, p.platform)}</select></label><label class="field" for="ac-handle">Page name or handle<input id="ac-handle" name="handle" required autocomplete="off" value="${esc(p.handle)}"></label></div>
    <label class="field" for="ac-url">Link<input id="ac-url" name="url" type="url" autocomplete="off" value="${esc(p.url)}"></label>
    <div class="frow"><label class="field" for="ac-own">Managed by<select id="ac-own" name="ownerId">${teamOptions(p.ownerId, "Not set")}</select></label><label class="field" for="ac-notes">Notes<input id="ac-notes" name="notes" autocomplete="off" value="${esc(p.notes)}" placeholder="e.g. Main page for local clients"></label></div>
  </form>`, `${isNew ? "" : `<button class="btn ghost" type="button" id="acDel" style="margin-right:auto">${I.trash}Delete</button>`}<button class="btn ghost" type="button" id="acCancel">Cancel</button><button class="btn primary" type="submit" form="acForm">Save</button>`, () => {
    document.getElementById("acCancel").onclick = closeDialog;
    const del = document.getElementById("acDel"); if (del) del.onclick = () => confirmBox(`Remove ${p.handle}?`, () => deleteDoc("socials", a.id), "Remove");
    document.getElementById("acForm").onsubmit = async e => { e.preventDefault(); const d = formData(e.target); closeDialog(); if (isNew) await addDoc("socials", d); else await updateDoc("socials", a.id, d); toast("Saved"); };
  });
}

export function bindSocial(v, r, render) {
  v.querySelector("#logMsg")?.addEventListener("click", msgForm);
  v.querySelector("#addAcct")?.addEventListener("click", () => acctForm());
  v.querySelectorAll("[data-quickacct]").forEach(b => b.onclick = () => { const pl = b.dataset.quickacct; acctForm(null, pl === "Facebook" ? { platform: pl, handle: "M1st Creatives", url: "https://www.facebook.com/profile.php?id=61566435001545", notes: "Main page for local clients" } : pl === "LinkedIn" ? { platform: pl, handle: "Bob Agda", url: "https://www.linkedin.com/in/bob-agda04", notes: "Bob's profile, used for overseas outreach" } : { platform: pl, handle: "", notes: "Portfolio" }); });
  v.querySelectorAll("[data-editacct]").forEach(b => b.onclick = () => acctForm(S.socials.find(a => a.id === b.dataset.editacct)));
  v.querySelectorAll("[data-copycap]").forEach(b => b.onclick = () => copyText(S.posts.find(p => p.id === b.dataset.copycap)?.caption || "", "Caption copied"));
  v.querySelectorAll("[data-posted]").forEach(b => b.onclick = async () => { await updateDoc("posts", b.dataset.posted, { status: "Posted", postedAt: new Date().toISOString(), postedBy: S.me || "" }); toast("Marked as posted"); });
  v.querySelectorAll("[data-mf]").forEach(b => b.onclick = () => { S.ui.msgFilter = b.dataset.mf; render(); });
  v.querySelectorAll("[data-assign]").forEach(s => s.onchange = async () => { const id = s.dataset.assign, val = s.value; s.blur(); await updateDoc("messages", id, { assignedTo: val }); toast(val ? `Assigned to ${memberName(val)}` : "Unassigned"); });
  v.querySelectorAll("[data-replied]").forEach(b => b.onclick = async () => { await updateDoc("messages", b.dataset.replied, { status: "Replied", repliedOn: today(), repliedBy: S.me || "" }); toast("Marked as replied"); });
  v.querySelectorAll("[data-close]").forEach(b => b.onclick = async () => { await updateDoc("messages", b.dataset.close, { status: "Closed" }); });
  v.querySelectorAll("[data-delmsg]").forEach(b => b.onclick = () => confirmBox("Delete this message?", () => deleteDoc("messages", b.dataset.delmsg)));
  v.querySelectorAll("[data-tobooking]").forEach(b => b.onclick = async () => { const m = S.messages.find(x => x.id === b.dataset.tobooking); bookingForm(null, { clientName: m.from, contact: m.link || m.from, notes: m.summary || "" }); await updateDoc("messages", m.id, { bookingMade: true }); });
  v.querySelectorAll("[data-tolead]").forEach(b => b.onclick = async () => { const m = S.messages.find(x => x.id === b.dataset.tolead); await addDoc("leads", { business: m.from, name: "", niche: NICHES[0], channel: ["Facebook", "Instagram", "LinkedIn"].includes(m.platform) ? m.platform : "Other", contact: m.link || "", notes: m.summary || "", status: "Replied", sentOn: today(), followedUp: true }); await updateDoc("messages", m.id, { leadMade: true }); toast("Added to the Sent log as Replied"); });
}
