// Grow section: Dashboard, Outreach (ready-to-send queue + sent log), Call scripts.
import { esc, I, fmt, fmtLong, today, parse, addDays, weekStart, ago, head, empty, cnt, opts, toast, isUrl } from "../util.js";
import { S, updateDoc, member, memberName, client, clientName, postWho, followDue } from "../data.js";
import { NICHES, LEAD_STATUS, RESPONDED, PRICE, OWN, DAILY_TARGET, FOLLOW_UP, fillMessage, CALL_SCRIPTS, OBJECTIONS, NICHE_ANGLE, PKG_WHAT } from "../content.js";
import { leadPill, postPill, avatar, prepareLeadForm, logSentForm, copyText, confirmBox, clientForm, logCallForm, postForm } from "../ui.js";
import { deleteDoc } from "../data.js";

// ================= DASHBOARD =================
export function dashboard() {
  const t = today(), ws = weekStart(), we = addDays(ws, 6);
  const sent = S.leads.filter(l => l.sentOn);
  const sentToday = sent.filter(l => l.sentOn === t).length;
  const sentWeek = sent.filter(l => l.sentOn >= ws && l.sentOn <= we).length;
  const lastWeek = sent.filter(l => l.sentOn >= addDays(ws, -7) && l.sentOn <= addDays(ws, -1)).length;
  const responded = sent.filter(l => RESPONDED.includes(l.status)).length;
  const won = sent.filter(l => l.status === "Won").length;
  const rate = sent.length ? Math.round(responded / sent.length * 100) : 0;
  const ready = S.leads.filter(l => l.status === "Ready").length;
  const dueList = S.leads.filter(followDue);
  const weekPosts = S.posts.filter(p => p.due >= ws && p.due <= we && p.status !== "Posted").sort((a, b) => a.due.localeCompare(b.due));
  const pct = Math.min(100, Math.round(sentToday / DAILY_TARGET * 100));
  const active = S.clients.filter(c => c.status !== "Paused");
  const mrr = active.reduce((n, c) => n + (PRICE[c.pkg] || 0), 0);
  const byPkg = ["Starter ($500)", "Growth ($950)", "Premium ($1,600)"].map((k, i) => ({ k, v: active.filter(c => c.pkg === k).length * PRICE[k], col: ["#9B9B9B", "#2B2B2B", "#7A1F2B"][i] }));
  const days = [...Array(14)].map((_, i) => addDays(t, i - 13));
  const perDay = days.map(d => sent.filter(l => l.sentOn === d).length);
  const maxY = Math.max(DAILY_TARGET + 2, ...perDay), H = 170 - 14 - 19;
  const hitDays = perDay.filter(n => n >= DAILY_TARGET).length;
  const order = ["Sent", "Replied", "Sample sent", "Call booked", "Won"];
  const reached = st => sent.filter(l => order.indexOf(l.status) >= order.indexOf(st)).length;
  const funnel = [["Messaged", sent.length], ["Replied", reached("Replied")], ["Sample sent", reached("Sample sent")], ["Call booked", reached("Call booked")], ["Won", won]];
  const wl = {}; weekPosts.forEach(p => { const k = postWho(p) || "Unassigned"; (wl[k] = wl[k] || { n: 0, r: 0, d: 0, id: p.assigneeId }); wl[k].n++; (p.status === "Ready for review" || p.status === "Approved") ? wl[k].d++ : wl[k].r++; });
  const wlRows = Object.entries(wl).sort((a, b) => b[1].n - a[1].n), wlMax = Math.max(1, ...wlRows.map(r => r[1].n));
  const mine = S.me ? S.posts.filter(p => p.assigneeId === S.me && p.status !== "Posted" && p.status !== "Approved").sort((a, b) => (a.due || "").localeCompare(b.due || "")).slice(0, 6) : [];
  const ev = [];
  S.leads.forEach(l => l.sentOn && ev.push({ at: l.sentAt || l.createdAt, ic: "send", cls: "", tx: `Messaged <b>${esc(l.business)}</b> on ${esc(l.channel)}` }));
  S.clients.forEach(c => c.createdAt && ev.push({ at: c.createdAt, ic: "users", cls: "g", tx: `New client <b>${esc(c.name)}</b> · ${esc(c.pkg)}` }));
  S.posts.forEach(p => p.reviewedAt && ev.push({ at: p.reviewedAt, ic: p.status === "Approved" ? "check" : "chat", cls: p.status === "Approved" ? "g" : "m", tx: `${esc(clientName(p.clientId))} ${p.status === "Approved" ? "approved" : "asked for changes on"} <b>${esc(p.title)}</b>` }));
  S.calls.forEach(c => ev.push({ at: c.createdAt, ic: "phone", cls: "w", tx: `Call with <b>${esc(S.leads.find(l => l.id === c.leadId)?.business || "a lead")}</b>: ${esc(c.outcome)}` }));
  S.team.forEach(m => m.createdAt && ev.push({ at: m.createdAt, ic: "team", cls: "", tx: `<b>${esc(m.name)}</b> joined the team chart` }));
  const feed = ev.filter(e => e.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 7);
  const trend = sentWeek - lastWeek;
  const meName = memberName(S.me);
  return head(meName ? `Hi, ${meName.split(" ")[0]}` : "Dashboard", fmtLong(t), `<a class="btn ghost" href="#calls">${I.phone}Call scripts</a><button class="btn primary" id="quickPrep">${I.plus}Prepare a message</button>`) + `
  <div class="kpis">
    <div class="kpi hero"><div class="lbl">${I.send}Messages today</div><div class="val">${cnt(sentToday)} <span style="font-size:15px;font-weight:500;opacity:.8">/ ${DAILY_TARGET}</span></div><div class="progress" role="progressbar" aria-valuenow="${sentToday}" aria-valuemin="0" aria-valuemax="${DAILY_TARGET}" aria-label="Daily outreach goal"><i class="gx" style="width:${pct}%"></i></div><div class="sub">${ready ? `${ready} ready to send in the queue` : sentToday >= DAILY_TARGET ? "Daily goal reached" : (DAILY_TARGET - sentToday) + " left to hit today's goal"}</div></div>
    <div class="kpi"><div class="lbl">${I.cal}Sent this week</div><div class="val">${cnt(sentWeek)}</div><div class="sub">${lastWeek || sentWeek ? `<span style="color:${trend >= 0 ? "var(--ok)" : "var(--bad)"}">${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend)}</span> vs last week` : "No messages yet"}</div></div>
    <div class="kpi"><div class="lbl">${I.chat}Reply rate</div><div class="val">${cnt(rate, "", "%")}</div><div class="sub">${responded} replied · ${won} won</div></div>
    <div class="kpi${dueList.length ? " attn" : ""}"><div class="lbl">${dueList.length ? '<span class="pulse" aria-hidden="true"></span>' : I.clock}Follow-ups due</div><div class="val">${cnt(dueList.length)}</div><div class="sub">${dueList.length ? `<a href="#outreach" style="color:inherit">Open the queue</a>` : "All caught up"}</div></div>
    <div class="kpi"><div class="lbl">${I.bag}Monthly revenue</div><div class="val">${cnt(mrr, "$")}</div><div class="sub">${active.length} active client${active.length === 1 ? "" : "s"}</div></div>
  </div>
  ${S.me ? `<section class="panel" style="margin-bottom:16px"><header><h2>My work</h2><span class="actions"><button class="btn ghost sm" id="addMine">${I.plus}Add my work</button></span></header><div class="body">${mine.length ? mine.map(p => `<div class="rowitem"><span class="dot${p.clientId === OWN ? " own" : ""}" aria-hidden="true"></span><div class="main"><div class="t"><a href="#" data-post="${esc(p.id)}" style="color:inherit">${esc(p.title)}</a></div><div class="m"><span>${esc(clientName(p.clientId))}</span><span>${esc(p.type)}</span><span class="${p.due < t ? "due" : ""}">${p.due < t ? "Overdue · " : "Due "}${fmt(p.due)}</span></div></div>${postPill(p.status)}</div>`).join("") : empty("check", "Nothing on your plate", "Add work you're doing so the team can see it.")}</div></section>` : `<div class="banner" style="background:var(--maroon-50);border-color:#E7C3C8;color:var(--maroon)">Pick your name at the bottom of the sidebar (or add your profile on the Team page) to see your own work here.</div>`}
  <div class="cols">
    <section class="panel"><header><h2>Outreach, last 14 days</h2><span class="count">${hitDays} day${hitDays === 1 ? "" : "s"} at goal</span></header>
      <div class="chart" role="img" aria-label="Messages sent per day over the last 14 days, goal ${DAILY_TARGET} a day">
        <div class="goal" style="bottom:${Math.round(DAILY_TARGET / maxY * H) + 19}px"><span>Goal ${DAILY_TARGET}</span></div>
        ${perDay.map((n, i) => `<div class="col"><span class="v">${n || ""}</span><div class="bar gy${days[i] === t ? " today" : ""}${n >= DAILY_TARGET ? " hit" : ""}" style="height:${Math.max(2, Math.round(n / maxY * H))}px;animation-delay:${i * 0.035}s"></div></div>`).join("")}
      </div>
      <div class="xaxis" aria-hidden="true">${days.map((d, i) => `<span>${i % 2 === 1 || i === 13 ? parse(d).getDate() : ""}</span>`).join("")}</div>
    </section>
    <section class="panel"><header><h2>Sales pipeline</h2><span class="count">${sent.length ? Math.round(won / sent.length * 100) : 0}% messaged → won</span></header>
      <div class="funnel">${funnel.map(([lbl, n], i) => { const w = sent.length ? Math.max(4, Math.round(n / sent.length * 100)) : 4; const prev = i ? funnel[i - 1][1] : 0; return `<div class="fstep"><span>${lbl}</span><div class="ftrack"><div class="ffill gx" style="width:${w}%;animation-delay:${0.15 + i * 0.08}s">${n}</div></div><span class="conv">${i && prev ? Math.round(n / prev * 100) + "%" : i ? "–" : ""}</span></div>`; }).join("")}</div>
    </section>
  </div>
  <div class="cols">
    <section class="panel"><header><h2>Team workload this week</h2><span class="count">${weekPosts.length} open pieces</span></header>
      ${wlRows.length ? `<div class="load">${wlRows.map(([who, r], i) => `<div class="lrow"><span style="display:flex;gap:6px;align-items:center;overflow:hidden;white-space:nowrap">${avatar(member(r.id), "sm")}${esc(who.split(" ")[0])}</span><div class="ltrack" style="width:${Math.round(r.n / wlMax * 100)}%"><i class="gx" style="width:${r.d / r.n * 100}%;background:var(--ok);animation-delay:${i * 0.06}s"></i><i class="gx" style="width:${r.r / r.n * 100}%;background:var(--grey-900);animation-delay:${i * 0.06}s"></i></div><span class="num" style="text-align:right">${r.n}</span></div>`).join("")}<div class="keyrow"><span><i style="background:var(--grey-900)"></i>In progress</span><span><i style="background:var(--ok)"></i>With client or approved</span></div></div>`
      : `<div class="body">${empty("users", "No work this week", "Add work in the Calendar and choose who makes it.")}</div>`}
    </section>
    <section class="panel"><header><h2>Revenue by package</h2><span class="count">USD per month</span></header>
      <div class="mrr"><div class="big">${cnt(mrr, "$")}</div>
        <div class="stack3" role="img" aria-label="Monthly revenue split by package">${mrr ? byPkg.filter(x => x.v).map(x => `<i class="gx" style="width:${x.v / mrr * 100}%;background:${x.col}"></i>`).join("") : ""}</div>
        <div class="keyrow">${byPkg.map(x => `<span><i style="background:${x.col}"></i>${esc(x.k.split(" ")[0])} $${x.v.toLocaleString()}</span>`).join("")}</div>
        <p class="muted" style="margin:0;font-size:13px">Goal for month 6: about $6,900 a month from 8 clients.</p>
        <div class="progress" style="background:#F3F1F1;height:8px"><i class="gx" style="width:${Math.min(100, Math.round(mrr / 6900 * 100))}%;background:var(--maroon)"></i></div>
      </div>
    </section>
    <section class="panel"><header><h2>Recent activity</h2><span class="count">Live</span></header><div class="body">
      ${feed.length ? `<div class="feed">${feed.map(e => `<div class="fi"><span class="ic ${e.cls}">${I[e.ic]}</span><span class="tx">${e.tx}</span><span class="tm">${ago(e.at)}</span></div>`).join("")}</div>` : empty("clock", "No activity yet", "Prepare a message to get started.")}
    </div></section>
  </div>
  ${nicheTable()}`;
}
function nicheTable() {
  const sent = S.leads.filter(l => l.sentOn);
  const byNiche = NICHES.map(n => { const L = sent.filter(l => l.niche === n); return { n, sent: L.length, rep: L.filter(l => RESPONDED.includes(l.status)).length, won: L.filter(l => l.status === "Won").length }; });
  const best = byNiche.filter(r => r.sent >= 5).sort((a, b) => (b.won - a.won) || (b.rep / b.sent - a.rep / a.sent))[0];
  return `<section class="panel"><header><h2>Niche test</h2><span class="count">${best ? "Leading: " + esc(best.n) : "Needs 5+ messages per niche"}</span></header>
    <div class="tablebox"><table><thead><tr><th>Niche</th><th class="right">Sent</th><th class="right">Replies</th><th class="right">Won</th><th>Reply rate</th></tr></thead><tbody>
    ${byNiche.map((r, i) => { const rr = r.sent ? Math.round(r.rep / r.sent * 100) : 0; return `<tr><td class="t">${esc(r.n)}${best && best.n === r.n ? ' <span class="pill ok" style="margin-left:6px">Leading</span>' : ""}</td><td class="right num">${r.sent}</td><td class="right num">${r.rep}</td><td class="right num">${r.won}</td><td><div style="display:flex;align-items:center;gap:10px"><div style="flex:1;max-width:160px;height:6px;border-radius:999px;background:#EFEDED;overflow:hidden"><i class="gx" style="display:block;height:100%;width:${rr}%;background:var(--maroon);animation-delay:${0.2 + i * 0.06}s"></i></div><span class="num" style="font-size:13px">${rr}%</span></div></td></tr>`; }).join("")}
    </tbody></table></div></section>`;
}
export function bindDashboard(v) {
  v.querySelector("#quickPrep")?.addEventListener("click", () => prepareLeadForm());
  v.querySelector("#addMine")?.addEventListener("click", () => postForm(null, { assigneeId: S.me }));
}

// ================= OUTREACH =================
const outreachTabs = (r) => {
  const ready = S.leads.filter(l => l.status === "Ready").length + S.leads.filter(followDue).length;
  return `<nav class="subtabs" aria-label="Outreach views"><a href="#outreach"${r === "outreach" ? ' aria-current="page"' : ""}>Ready to send${ready ? ` <span class="badge">${ready}</span>` : ""}</a><a href="#outreach-sent"${r === "outreach-sent" ? ' aria-current="page"' : ""}>Sent log <span class="badge">${S.leads.filter(l => l.sentOn).length}</span></a></nav>`;
};
export function outreach(r) {
  return r === "outreach-sent" ? sentLog(r) : readyQueue(r);
}
function readyQueue(r) {
  const ready = S.leads.filter(l => l.status === "Ready").sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  const due = S.leads.filter(followDue).sort((a, b) => (a.sentOn || "").localeCompare(b.sentOn || ""));
  const link = l => isUrl(l.contact) ? `<a class="btn ghost sm" href="${esc(l.contact)}" target="_blank" rel="noopener">${I.link}Open profile</a>` : l.contact ? `<span class="inline-note">${esc(l.contact)}</span>` : "";
  const card = (l, fu) => {
    const msg = fu ? fillMessage(FOLLOW_UP, l) : (l.message || "");
    return `<article class="qcard${fu ? " fu" : ""}">
      <div class="qi"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><div class="t" style="font-weight:600;font-size:16px">${esc(l.business)}</div><div class="inline-note">${esc(l.name || "")}${l.name ? " · " : ""}${esc(l.channel)}</div></div>${fu ? '<span class="pill warn">Follow-up</span>' : '<span class="pill brand">Ready</span>'}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px"><span class="tag">${esc(l.niche)}</span>${fu ? `<span class="tag">First sent ${fmt(l.sentOn)}</span>` : l.createdBy ? `<span class="tag">Prepared by ${esc(memberName(l.createdBy) || "team")}</span>` : ""}</div>
        <div class="actions" style="margin-top:auto">${link(l)}</div></div>
      <div class="qm"><div class="msg" id="msg-${esc(l.id)}${fu ? "-fu" : ""}">${esc(msg)}</div>
        <div class="actions"><button class="btn ghost sm" data-copy="${esc(l.id)}${fu ? "-fu" : ""}">${I.copy}Copy</button>${fu ? `<button class="btn primary sm" data-followed="${esc(l.id)}">${I.check}Mark followed up</button>` : `<button class="btn ghost sm" data-edit-lead="${esc(l.id)}">${I.edit}Edit</button><button class="btn primary sm" data-mark-sent="${esc(l.id)}">${I.send}Mark as sent</button>`}</div></div>
    </article>`;
  };
  return head("Outreach", "Prepare messages, copy them, send them, then mark them as sent.", `<button class="btn ghost" id="logSent">Log a sent message</button><button class="btn primary" id="quickPrep">${I.plus}Prepare a message</button>`) + outreachTabs(r) + `
  ${due.length ? `<h2 style="font-size:15px;margin:0 0 10px">Follow-ups due (${due.length})</h2><div class="queue" style="margin-bottom:22px">${due.map(l => card(l, true)).join("")}</div>` : ""}
  <h2 style="font-size:15px;margin:0 0 10px">Ready to send (${ready.length})</h2>
  ${ready.length ? `<div class="queue">${ready.map(l => card(l, false)).join("")}</div>` : `<section class="panel">${empty("send", "The queue is empty", "Prepare messages in a batch, then send them one by one. Anyone on the team can add to the queue.", `<button class="btn primary sm" id="quickPrep2">${I.plus}Prepare a message</button>`)}</section>`}`;
}
function sentLog(r) {
  const f = S.ui.leadFilter;
  let L = S.leads.filter(l => l.sentOn).sort((a, b) => (b.sentOn || "").localeCompare(a.sentOn || ""));
  if (f.niche) L = L.filter(l => l.niche === f.niche);
  if (f.status === "due") L = L.filter(followDue); else if (f.status) L = L.filter(l => l.status === f.status);
  if (f.q) L = L.filter(l => (l.business + " " + (l.contact || "") + " " + (l.notes || "") + " " + (l.name || "")).toLowerCase().includes(f.q.toLowerCase()));
  const total = S.leads.filter(l => l.sentOn).length;
  return head("Outreach", "Everyone you've messaged, and where each lead stands.", `<button class="btn ghost" id="logSent">Log a sent message</button><button class="btn primary" id="quickPrep">${I.plus}Prepare a message</button>`) + outreachTabs(r) + `
  <section class="panel">
    <div class="toolbar">
      <div class="search">${I.search}<input id="lq" data-live="1" value="${esc(f.q)}" placeholder="Search business, contact or note" aria-label="Search leads"></div>
      <select id="lniche" aria-label="Filter by niche"><option value="">All niches</option>${opts(NICHES, f.niche)}</select>
      <select id="lstatus" aria-label="Filter by status"><option value="">All statuses</option><option value="due"${f.status === "due" ? " selected" : ""}>Follow-up due</option>${opts(LEAD_STATUS.filter(s => s !== "Ready"), f.status)}</select>
      <span class="muted num" style="font-size:13px;margin-left:auto">${L.length} of ${total}</span>
    </div>
    ${L.length ? `<div class="tablebox"><table class="resp"><thead><tr><th>Business</th><th>Niche</th><th>Channel</th><th>Sent</th><th>Status</th><th>Update</th><th class="right"><span class="hidden">Actions</span></th></tr></thead><tbody>
    ${L.map(l => `<tr>
      <td class="c-main"><div class="t">${esc(l.business)}</div>${l.contact || l.notes || l.name ? `<div class="s">${esc([l.name, l.contact, l.notes].filter(Boolean).join(" · "))}</div>` : ""}</td>
      <td class="c-hide"><span class="tag">${esc(l.niche)}</span></td>
      <td class="c-hide">${esc(l.channel)}</td>
      <td class="num" style="white-space:nowrap">${fmt(l.sentOn)}</td>
      <td>${leadPill(l)}</td>
      <td><select data-lstatus="${esc(l.id)}" aria-label="Status for ${esc(l.business)}">${opts(LEAD_STATUS.filter(s => s !== "Ready"), l.status)}</select></td>
      <td class="right" style="white-space:nowrap"><button class="btn ghost sm icon" data-call="${esc(l.id)}" aria-label="Log a call with ${esc(l.business)}">${I.phone}</button> ${l.status === "Won" && !S.clients.some(c => c.leadRef === l.id || c.name === l.business) ? `<button class="btn sm" data-makeclient="${esc(l.id)}">Add client</button> ` : ""}<button class="btn ghost sm icon" data-delete-lead="${esc(l.id)}" aria-label="Delete ${esc(l.business)}">${I.trash}</button></td>
    </tr>`).join("")}</tbody></table></div>`
    : total ? empty("search", "No matches", "Try a different search or filter.") : empty("send", "Nothing sent yet", "Messages you mark as sent show up here.")}
  </section>`;
}
export function bindOutreach(v, r, render) {
  const on = (sel, fn) => v.querySelector(sel)?.addEventListener("click", fn);
  on("#quickPrep", () => prepareLeadForm()); on("#quickPrep2", () => prepareLeadForm()); on("#logSent", () => logSentForm());
  v.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copyText(document.getElementById("msg-" + b.dataset.copy).textContent, "Message copied. Paste it and send."));
  v.querySelectorAll("[data-mark-sent]").forEach(b => b.onclick = async () => { await updateDoc("leads", b.dataset.markSent, { status: "Sent", sentOn: today(), sentAt: new Date().toISOString(), sentBy: S.me || "" }); toast("Marked as sent. Follow-up in 4 days."); });
  v.querySelectorAll("[data-edit-lead]").forEach(b => b.onclick = () => prepareLeadForm(S.leads.find(l => l.id === b.dataset.editLead)));
  v.querySelectorAll("[data-followed]").forEach(b => b.onclick = async () => { await updateDoc("leads", b.dataset.followed, { followedUp: true, followedOn: today() }); toast("Marked as followed up"); });
  if (r === "outreach-sent") {
    const q = v.querySelector("#lq"); q.oninput = () => { S.ui.leadFilter.q = q.value; render(); };
    v.querySelector("#lniche").onchange = e => { S.ui.leadFilter.niche = e.target.value; e.target.blur(); render(); };
    v.querySelector("#lstatus").onchange = e => { S.ui.leadFilter.status = e.target.value; e.target.blur(); render(); };
    v.querySelectorAll("[data-lstatus]").forEach(s => s.onchange = async () => { const id = s.dataset.lstatus, val = s.value; s.blur(); await updateDoc("leads", id, { status: val }); toast("Status updated"); });
    v.querySelectorAll("[data-delete-lead]").forEach(b => b.onclick = () => { const l = S.leads.find(x => x.id === b.dataset.deleteLead); if (l) confirmBox(`Delete ${l.business}?`, async () => { await deleteDoc("leads", l.id); toast("Deleted"); }); });
    v.querySelectorAll("[data-call]").forEach(b => b.onclick = () => logCallForm(b.dataset.call));
    v.querySelectorAll("[data-makeclient]").forEach(b => b.onclick = () => { const l = S.leads.find(x => x.id === b.dataset.makeclient); if (l) clientForm(null, { name: l.business, niche: l.niche, contact: l.name, email: l.contact, leadRef: l.id }); });
  }
}

// ================= CALL SCRIPTS =================
export function calls() {
  const key = S.ui.script, sc = CALL_SCRIPTS[key];
  const lead = S.leads.find(l => l.id === S.ui.scriptLead);
  const cl = lead ? S.clients.find(c => c.leadRef === lead.id || c.name === lead.business) : null;
  const niche = lead?.niche || cl?.niche || NICHES[0];
  const ang = NICHE_ANGLE[niche];
  const pkg = cl?.pkg && PKG_WHAT[cl.pkg] ? cl.pkg : "Growth ($950)";
  const vars = {
    name: lead?.name || cl?.contact || "[their name]", business: lead?.business || cl?.name || "[their business]",
    me: (memberName(S.me) || "Bob").split(" ")[0], pain: ang.pain, goal: ang.goal, proof: ang.proof,
    goalq: `Is it ${ang.goal}?`, pkg: pkg.replace(/ \(.+\)/, " at " + pkg.match(/\((.+)\)/)[1] + " a month"), pkgwhat: PKG_WHAT[pkg],
    date: fmt(addDays(today(), 7)), followdate: fmtLong(addDays(today(), 3))
  };
  const fill = s => esc(s).replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? `<b>${esc(vars[k])}</b>` : m);
  const checks = S.ui.scriptChecks[key] || {};
  const recent = S.calls.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 6);
  const leads = S.leads.filter(l => l.sentOn).sort((a, b) => (a.business || "").localeCompare(b.business || ""));
  const done = sc.steps.filter((_, i) => checks["s" + i]).length;
  return head("Call scripts", "Read these word for word on calls. Pick who you're calling and the names fill in.", `<button class="btn ghost" id="bigMode" aria-pressed="${S.ui.scriptBig}">${S.ui.scriptBig ? "Normal text" : "Large text"}</button><button class="btn primary" id="logCall">${I.phone}Log this call</button>`) + `
  <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin-bottom:16px">
    <div class="seg" role="group" aria-label="Script">${Object.entries(CALL_SCRIPTS).map(([k, s]) => `<button type="button" data-script="${k}" aria-pressed="${k === key}">${esc(s.title)}</button>`).join("")}</div>
    <label class="field" for="scLead" style="max-width:320px">Calling<select id="scLead"><option value="">Choose a lead</option>${leads.map(l => `<option value="${esc(l.id)}"${l.id === S.ui.scriptLead ? " selected" : ""}>${esc(l.business)}${l.name ? " (" + esc(l.name) + ")" : ""}</option>`).join("")}</select></label>
  </div>
  <div class="cols" style="grid-template-columns:minmax(0,2fr) minmax(280px,1fr);align-items:start">
    <div class="script${S.ui.scriptBig ? " big" : ""}">
      <div class="inline-note">${esc(sc.use)} About ${esc(sc.length)}. ${done}/${sc.steps.length} steps done.${done ? ` <a href="#" id="resetSteps" style="color:var(--maroon)">Reset</a>` : ""}</div>
      ${sc.steps.map((st, i) => `<section class="step${checks["s" + i] ? " done" : ""}"><header><span class="n">${checks["s" + i] ? "✓" : i + 1}</span><h3>${esc(st.h)}</h3><span class="time">${esc(st.time)}</span><button class="btn ghost sm" data-step="${i}">${checks["s" + i] ? "Undo" : "Done"}</button></header>
        <div class="say">${(st.say || []).map(s => `<p class="line">${fill(s)}</p>`).join("")}${(st.ask || []).map((q, j) => `<div class="q"><input type="checkbox" id="q-${key}-${i}-${j}" data-q="${i}-${j}"${checks["q" + i + "-" + j] ? " checked" : ""}><label for="q-${key}-${i}-${j}">${fill(q)}</label></div>`).join("")}${st.tip ? `<p class="tip">Tip: ${esc(st.tip)}</p>` : ""}</div></section>`).join("")}
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <section class="panel"><header><h2>If they say…</h2></header>${OBJECTIONS.map(o => `<details class="obj"><summary>${esc(o.q)}</summary><div class="say">${o.a.map(a => `<p class="line" style="font-size:15px">${fill(a)}</p>`).join("")}</div></details>`).join("")}</section>
      <section class="panel"><header><h2>Recent calls</h2><span class="count">${S.calls.length}</span></header><div class="body">${recent.length ? recent.map(c => `<div class="rowitem"><span class="avatar sm" aria-hidden="true">${I.phone.replace('aria-hidden="true"', 'aria-hidden="true" width="12" height="12"')}</span><div class="main"><div class="t">${esc(S.leads.find(l => l.id === c.leadId)?.business || "Unknown")}</div><div class="m"><span>${esc(c.outcome)}</span><span>${fmt(c.date)}</span>${c.by ? `<span>${esc(memberName(c.by))}</span>` : ""}</div>${c.next ? `<div class="m">Next: ${esc(c.next)}</div>` : ""}</div></div>`).join("") : empty("phone", "No calls logged yet", "Log each call so the team knows what was said.")}</div></section>
    </div>
  </div>`;
}
export function bindCalls(v, r, render) {
  const key = S.ui.script;
  v.querySelectorAll("[data-script]").forEach(b => b.onclick = () => { S.ui.script = b.dataset.script; render(); });
  v.querySelector("#scLead").onchange = e => { S.ui.scriptLead = e.target.value; e.target.blur(); S.ui.scriptChecks = {}; render(); };
  v.querySelector("#bigMode").onclick = () => { S.ui.scriptBig = !S.ui.scriptBig; render(); };
  v.querySelector("#logCall").onclick = () => logCallForm(S.ui.scriptLead);
  const c = S.ui.scriptChecks[key] = S.ui.scriptChecks[key] || {};
  v.querySelectorAll("[data-step]").forEach(b => b.onclick = () => { c["s" + b.dataset.step] = !c["s" + b.dataset.step]; render(); });
  v.querySelectorAll("[data-q]").forEach(x => x.onchange = () => { c["q" + x.dataset.q] = x.checked; });
  v.querySelector("#resetSteps")?.addEventListener("click", e => { e.preventDefault(); S.ui.scriptChecks[key] = {}; render(); });
}
