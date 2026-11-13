// Marketing: M1st's own advertising. Campaign plan, content calendar, and an internal review board
// where visuals and videos are approved, sent back for rework, or disapproved.
import { esc, I, fmt, fmtLong, today, addDays, monthStart, parse, head, empty, cnt, toast, opts, ago, isUrl } from "../util.js";
import { S, addDoc, updateDoc, deleteDoc, member, memberName, postWho, uploadMedia, photoUrl } from "../data.js";
import { OWN, PILLARS, CAMPAIGN_GOALS, CAMPAIGN_AUDIENCE, CAMPAIGN_STATUS, WEEKLY_RHYTHM, PLATFORMS, peso } from "../content.js";
import { avatar, postPill, postForm, openDialog, closeDialog, confirmBox, teamOptions, formData, monthCalendar } from "../ui.js";

const own = () => S.posts.filter(p => p.clientId === OWN);
const pillar = name => PILLARS.find(x => x.name === name);
const campName = id => S.campaigns.find(c => c.id === id)?.name || "";
const tabs = r => {
  const n = own().filter(p => p.status === "Ready for review").length;
  return `<nav class="subtabs" aria-label="Marketing views">${[["marketing", "Plan"], ["marketing-calendar", "Content calendar"], ["marketing-review", "Review" + (n ? ` <span class="badge">${n}</span>` : "")]].map(([k, l]) => `<a href="#${k}"${r === k ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>`;
};

export function marketing(r) {
  const body = r === "marketing-calendar" ? calendarTab() : r === "marketing-review" ? reviewTab() : planTab();
  const act = r === "marketing" ? `<button class="btn primary" id="newCamp">${I.plus}New campaign</button>` : `<button class="btn primary" id="newContent">${I.plus}Add content</button>`;
  return head("Marketing", "How M1st advertises itself: what we post, when, and what's approved.", act) + tabs(r) + body;
}

// ---------- plan ----------
function planTab() {
  const t = today(), ms = monthStart(0), me = addDays(monthStart(1), -1);
  const month = own().filter(p => p.due >= ms && p.due <= me);
  const posted = month.filter(p => p.status === "Posted").length;
  const approved = month.filter(p => p.status === "Approved").length;
  const review = own().filter(p => p.status === "Ready for review").length;
  const rework = own().filter(p => p.status === "Needs rework").length;
  const mix = PILLARS.map(x => ({ ...x, n: month.filter(p => p.pillar === x.name).length }));
  const mixTotal = mix.reduce((n, x) => n + x.n, 0);
  const offerShare = mixTotal ? Math.round(mix.find(x => x.name === "Offer").n / mixTotal * 100) : 0;
  const camps = S.campaigns.slice().sort((a, b) => (CAMPAIGN_STATUS.indexOf(a.status) - CAMPAIGN_STATUS.indexOf(b.status)) || (a.start || "").localeCompare(b.start || ""));
  return `<div class="kpis">
    <div class="kpi hero"><div class="lbl">${I.cal}Planned this month</div><div class="val">${cnt(month.length)}</div><div class="sub">${posted} posted · ${approved} approved and ready</div></div>
    <div class="kpi${review ? " attn" : ""}"><div class="lbl">${I.eye}Waiting for review</div><div class="val">${cnt(review)}</div><div class="sub">${review ? `<a href="#marketing-review" style="color:inherit">Review them</a>` : "Nothing waiting"}</div></div>
    <div class="kpi${rework ? " attn" : ""}"><div class="lbl">${I.edit}Needs rework</div><div class="val">${cnt(rework)}</div><div class="sub">Sent back with notes</div></div>
    <div class="kpi"><div class="lbl">${I.star}Running campaigns</div><div class="val">${cnt(S.campaigns.filter(c => c.status === "Running").length)}</div><div class="sub">${S.campaigns.length} in total</div></div>
  </div>
  <div class="cols" style="grid-template-columns:minmax(0,1.6fr) minmax(280px,1fr);align-items:start">
    <section class="panel"><header><h2>Campaigns</h2><span class="count">${camps.length}</span></header><div class="body">
      ${camps.length ? camps.map(c => {
        const P = own().filter(p => p.campaignId === c.id), done = P.filter(p => p.status === "Posted").length;
        return `<div class="rowitem" style="align-items:flex-start"><div class="main">
          <div class="t" style="white-space:normal">${esc(c.name)}</div>
          <div class="m"><span>${esc(c.goal)}</span><span>${esc(c.audience)}</span><span>${fmt(c.start)}${c.end ? " – " + fmt(c.end) : ""}</span><span>${+c.budget ? peso(c.budget) + " ad budget" : "Organic (free)"}</span></div>
          ${c.message ? `<div style="font-size:13.5px;margin-top:6px">${esc(c.message)}</div>` : ""}
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px"><div class="progress" style="background:#F3F1F1;height:6px;flex:1;max-width:220px"><i class="gx" style="width:${P.length ? Math.round(done / P.length * 100) : 0}%;background:var(--maroon)"></i></div><span class="inline-note">${done}/${P.length} posted</span>${c.ownerId ? `<span style="display:inline-flex;gap:6px;align-items:center" class="inline-note">${avatar(member(c.ownerId), "sm")}${esc(memberName(c.ownerId))}</span>` : ""}</div></div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><span class="pill ${({ Planned: "muted", Running: "brand", Done: "ok", Paused: "" })[c.status] || ""}">${esc(c.status)}</span><button class="btn ghost sm" data-camp="${esc(c.id)}">${I.edit}Edit</button></div></div>`; }).join("")
      : empty("star", "No campaigns yet", "A campaign groups posts around one goal, like \"Free sample month\" for overseas leads or \"Wedding season\" for local bookings.", `<button class="btn primary sm" id="newCamp2">${I.plus}New campaign</button>`)}
    </div></section>
    <div style="display:flex;flex-direction:column;gap:16px">
      <section class="panel"><header><h2>Content pillars this month</h2><span class="count">${mixTotal} tagged</span></header><div class="body" style="padding-top:12px">
        <div class="stack3" style="margin-bottom:12px" role="img" aria-label="Mix of content pillars this month">${mixTotal ? mix.filter(x => x.n).map(x => `<i class="gx" style="width:${x.n / mixTotal * 100}%;background:${x.color}"></i>`).join("") : ""}</div>
        ${mix.map(x => `<div class="rowitem" style="padding:8px 0"><span class="dot" style="background:${x.color}" aria-hidden="true"></span><div class="main"><div class="t" style="font-size:14px">${esc(x.name)}</div><div class="m" style="white-space:normal"><span>${esc(x.what)}</span></div></div><span class="num">${x.n}</span></div>`).join("")}
        ${offerShare > 25 ? `<div class="banner" style="margin:8px 0 0">Offers are ${offerShare}% of this month's posts. Aim for about 1 in 5 so the page doesn't feel like ads.</div>` : ""}
      </div></section>
      <section class="panel"><header><h2>Weekly rhythm</h2></header><div class="body">${WEEKLY_RHYTHM.map(([d, w]) => `<div class="rowitem" style="padding:8px 0"><span class="tag" style="min-width:42px;text-align:center">${d}</span><div class="main"><div style="font-size:14px">${esc(w)}</div></div></div>`).join("")}</div></section>
    </div>
  </div>`;
}

// ---------- content calendar ----------
function calendarTab() {
  const off = S.ui.mkMonth;
  const items = own().filter(p => p.status !== "Disapproved").map(p => ({ ...p, _attr: `data-post="${esc(p.id)}"`, _style: `background:${pillar(p.pillar)?.color || "#5E5E5E"};color:#fff;${p.status === "Posted" ? "opacity:.55;" : ""}${p.status === "Ready for review" ? "box-shadow:inset 0 0 0 2px #E9A23B;" : ""}` }));
  const ideas = own().filter(p => p.status === "Idea").sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  const label = parse(monthStart(off)).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const ms = monthStart(off), me = addDays(monthStart(off + 1), -1);
  const list = items.filter(i => i.due >= ms && i.due <= me).sort((a, b) => a.due.localeCompare(b.due));
  return `<div class="cols" style="grid-template-columns:minmax(0,2.2fr) minmax(260px,1fr);align-items:start">
    <section class="panel"><div class="toolbar"><button class="btn ghost sm icon" id="mkPrev" aria-label="Previous month">${I.left}</button><button class="btn ghost sm icon" id="mkNext" aria-label="Next month">${I.right}</button><strong style="font-size:15px">${esc(label)}</strong>${off ? `<button class="btn ghost sm" id="mkToday">This month</button>` : ""}<span class="muted num" style="margin-left:auto;font-size:13px">${list.length} posts</span></div>
      ${monthCalendar(items, off)}
      <div class="only-mobile">${list.length ? `<div class="body">${list.map(p => `<div class="rowitem"><span class="dot" style="background:${pillar(p.pillar)?.color || "#5E5E5E"}" aria-hidden="true"></span><div class="main"><div class="t"><a href="#" data-post="${esc(p.id)}" style="color:inherit">${esc(p.title)}</a></div><div class="m"><span>${fmt(p.due)}</span><span>${esc(p.pillar || "No pillar")}</span></div></div>${postPill(p.status)}</div>`).join("")}</div>` : ""}</div>
      <div class="legend" style="flex-wrap:wrap">${PILLARS.map(x => `<span><i class="dot" style="background:${x.color}"></i>${esc(x.name)}</span>`).join("")}</div></section>
    <section class="panel"><header><h2>Ideas</h2><button class="btn ghost sm" id="newIdea">${I.plus}Idea</button></header><div class="body">
      ${ideas.length ? ideas.map(p => `<div class="rowitem"><span class="dot" style="background:${pillar(p.pillar)?.color || "#9B9B9B"}" aria-hidden="true"></span><div class="main"><div class="t"><a href="#" data-post="${esc(p.id)}" style="color:inherit">${esc(p.title)}</a></div><div class="m"><span>${esc(p.pillar || "No pillar")}</span>${campName(p.campaignId) ? `<span>${esc(campName(p.campaignId))}</span>` : ""}<span>${fmt(p.due)}</span></div></div><button class="btn ghost sm" data-start="${esc(p.id)}">Start</button></div>`).join("")
      : empty("star", "No ideas yet", "Jot ideas here as they come. Tap Start when someone begins making one.")}
    </div></section>
  </div>`;
}

// ---------- review ----------
const latest = p => (p.media || []).slice(-1)[0];
function mediaView(m, big) {
  if (!m) return `<div class="mediabox empty-media">${I.eye}<span>No visual or video yet</span></div>`;
  if (m.url && !m.id) return `<div class="mediabox"><a class="btn ghost" href="${esc(m.url)}" target="_blank" rel="noopener">${I.link}Open ${esc(m.kind === "video" ? "video" : "file")} link</a></div>`;
  const src = esc(photoUrl(m.id));
  return `<div class="mediabox">${m.kind === "video" ? `<video src="${src}" controls preload="metadata"${big ? "" : " muted"}></video>` : `<img src="${src}" alt="Draft visual for review">`}</div>`;
}
function reviewTab() {
  const f = S.ui.reviewFilter;
  const map = { review: ["Ready for review"], rework: ["Needs rework"], approved: ["Approved", "Posted"], disapproved: ["Disapproved"], making: ["In progress"] };
  const L = own().filter(p => map[f] ? map[f].includes(p.status) : p.status !== "Idea").sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  const count = k => own().filter(p => map[k].includes(p.status)).length;
  return `<div class="toolbar" style="padding:0 0 14px;border:none"><div class="seg" role="group" aria-label="Show">${[["review", "To review"], ["making", "Being made"], ["rework", "Needs rework"], ["approved", "Approved"], ["disapproved", "Disapproved"], ["all", "All"]].map(([k, l]) => `<button type="button" data-rf="${k}" aria-pressed="${f === k}">${l}${map[k] ? ` (${count(k)})` : ""}</button>`).join("")}</div></div>
    ${L.length ? `<div class="reviewgrid">${L.map(p => {
      const m = latest(p), hist = (p.reviews || []).slice().reverse();
      const canDecide = p.status === "Ready for review";
      return `<article class="rcard">
        ${mediaView(m, true)}
        ${(p.media || []).length > 1 ? `<div class="versions">${p.media.map((v, i) => `<span class="tag">v${i + 1}${i === p.media.length - 1 ? " (latest)" : ""} · ${esc(memberName(v.by) || "team")}</span>`).join("")}</div>` : ""}
        <div class="rbody">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><div style="font-weight:600;font-size:16px">${esc(p.title)}</div><div class="inline-note">${esc(p.type)} · post on ${fmt(p.due)}${postWho(p) ? ` · made by ${esc(postWho(p))}` : ""}</div></div>${postPill(p.status)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${p.pillar ? `<span class="tag" style="background:${pillar(p.pillar)?.color};color:#fff">${esc(p.pillar)}</span>` : ""}${campName(p.campaignId) ? `<span class="tag">${esc(campName(p.campaignId))}</span>` : ""}${(p.platforms || []).map(x => `<span class="tag">${esc(x)}</span>`).join("")}</div>
          ${p.caption ? `<div class="msg" style="max-height:120px">${esc(p.caption)}</div>` : ""}
          ${hist.length ? `<div class="hist">${hist.slice(0, 3).map(h => `<div class="hrow">${avatar(member(h.by), "sm")}<div><b>${esc(memberName(h.by) || "Someone")}</b> <span class="pill ${h.decision === "Approved" ? "ok" : h.decision === "Disapproved" ? "muted" : "bad"}">${esc(h.decision)}</span> <span class="inline-note">${ago(h.at)}</span>${h.note ? `<div style="font-size:13.5px;margin-top:2px">${esc(h.note)}</div>` : ""}</div></div>`).join("")}</div>` : ""}
          <div class="actions" style="margin-top:auto">
            ${canDecide ? `<button class="btn primary sm" data-decide="Approved" data-id="${esc(p.id)}">${I.check}Approve</button><button class="btn ghost sm" data-decide="Needs rework" data-id="${esc(p.id)}">${I.edit}Rework</button><button class="btn ghost sm" data-decide="Disapproved" data-id="${esc(p.id)}">${I.x}Disapprove</button>` : ""}
            ${p.status === "Needs rework" || p.status === "In progress" || !m ? `<label class="btn ${p.status === "Needs rework" ? "primary" : "ghost"} sm" for="up-${esc(p.id)}">${I.plus}${m ? "Upload new version" : "Upload visual or video"}<input id="up-${esc(p.id)}" type="file" accept="image/*,video/*" data-upload="${esc(p.id)}" class="hidden"></label><button class="btn ghost sm" data-addlink="${esc(p.id)}">${I.link}Link</button>` : ""}
            ${p.status === "In progress" && m ? `<button class="btn primary sm" data-submit="${esc(p.id)}">Send for review</button>` : ""}
            <button class="btn ghost sm icon" data-post="${esc(p.id)}" aria-label="Edit details">${I.doc}</button></div>
        </div></article>`; }).join("")}</div>`
    : `<section class="panel">${empty("eye", f === "review" ? "Nothing to review" : "Nothing here", f === "review" ? "When someone uploads a visual or video and sends it for review, it shows up here for Bob, Kim or Druwin to approve." : "", `<button class="btn primary sm" id="newContent2">${I.plus}Add content</button>`)}</section>`}`;
}

// ---------- dialogs ----------
function campForm(c) {
  const isNew = !c; const p = c || { goal: CAMPAIGN_GOALS[0], audience: CAMPAIGN_AUDIENCE[0], status: "Planned", start: today(), ownerId: S.me, platforms: [] };
  openDialog(isNew ? "New campaign" : "Edit campaign", `<form class="form db" id="cpForm">
    <label class="field" for="cp-name">Campaign name<input id="cp-name" name="name" required autocomplete="off" value="${esc(p.name)}" placeholder="e.g. Free sample month"></label>
    <div class="frow"><label class="field" for="cp-goal">Goal<select id="cp-goal" name="goal">${opts(CAMPAIGN_GOALS, p.goal)}</select></label><label class="field" for="cp-aud">Audience<select id="cp-aud" name="audience">${opts(CAMPAIGN_AUDIENCE, p.audience)}</select></label></div>
    <label class="field" for="cp-msg">Main message (one sentence)<input id="cp-msg" name="message" autocomplete="off" value="${esc(p.message)}" placeholder="e.g. Get one custom post free, made by real designers"></label>
    <div class="frow"><label class="field" for="cp-start">Start<input id="cp-start" type="date" name="start" value="${esc(p.start)}"></label><label class="field" for="cp-end">End<input id="cp-end" type="date" name="end" value="${esc(p.end)}"></label><label class="field" for="cp-budget">Ad budget (₱, 0 = free)<input id="cp-budget" type="number" min="0" step="100" name="budget" value="${esc(p.budget || 0)}"></label></div>
    <fieldset style="border:none;padding:0;margin:0"><legend class="field" style="margin-bottom:6px">Where</legend><div class="checks">${PLATFORMS.filter(x => x !== "Messenger" && x !== "Other").map(x => `<label><input type="checkbox" name="plat" value="${esc(x)}"${(p.platforms || []).includes(x) ? " checked" : ""}>${esc(x)}</label>`).join("")}</div></fieldset>
    <div class="frow"><label class="field" for="cp-own">In charge<select id="cp-own" name="ownerId">${teamOptions(p.ownerId, "Not set")}</select></label><label class="field" for="cp-status">Status<select id="cp-status" name="status">${opts(CAMPAIGN_STATUS, p.status)}</select></label></div>
    <label class="field" for="cp-notes">How we'll measure it<input id="cp-notes" name="measure" autocomplete="off" value="${esc(p.measure)}" placeholder="e.g. 10 sample requests, 3 new clients"></label>
  </form>`, `${isNew ? "" : `<button class="btn ghost" type="button" id="cpDel" style="margin-right:auto">${I.trash}Delete</button>`}<button class="btn ghost" type="button" id="cpCancel">Cancel</button><button class="btn primary" type="submit" form="cpForm">${isNew ? "Create" : "Save"}</button>`, () => {
    document.getElementById("cpCancel").onclick = closeDialog;
    const del = document.getElementById("cpDel"); if (del) del.onclick = () => confirmBox(`Delete ${p.name}? Its posts stay in the calendar.`, () => deleteDoc("campaigns", c.id));
    document.getElementById("cpForm").onsubmit = async e => {
      e.preventDefault(); const d = formData(e.target); delete d.plat; d.platforms = [...e.target.querySelectorAll('input[name="plat"]:checked')].map(x => x.value); d.budget = +d.budget || 0;
      d.name = d.name.trim(); if (!d.name) return; closeDialog();
      if (isNew) { await addDoc("campaigns", d); toast("Campaign created"); } else { await updateDoc("campaigns", c.id, d); toast("Saved"); }
    };
  });
}
function decideForm(p, decision) {
  const need = decision !== "Approved";
  openDialog(decision === "Approved" ? `Approve "${p.title}"` : decision === "Needs rework" ? "Send back for rework" : "Disapprove", `<form class="form db" id="dcForm">
    <p class="muted" style="margin:0">${decision === "Approved" ? "It will move to Social, ready to publish." : decision === "Needs rework" ? "Say exactly what to change so the maker can fix it in one go." : "Say why, so the team learns from it. It won't be posted."}</p>
    <label class="field" for="dc-note">${need ? "What should change?" : "Note (optional)"}<textarea id="dc-note" name="note" rows="3"${need ? " required" : ""}></textarea></label>
  </form>`, `<button class="btn ghost" type="button" id="dcCancel">Cancel</button><button class="btn primary" type="submit" form="dcForm">${decision === "Approved" ? "Approve" : decision === "Needs rework" ? "Send back" : "Disapprove"}</button>`, () => {
    document.getElementById("dcCancel").onclick = closeDialog;
    document.getElementById("dcForm").onsubmit = async e => {
      e.preventDefault(); const note = new FormData(e.target).get("note") || ""; closeDialog();
      const reviews = [...(p.reviews || []), { by: S.me || "", decision, note, at: new Date().toISOString() }];
      await updateDoc("posts", p.id, { status: decision, reviews, reviewedAt: new Date().toISOString() });
      toast(decision === "Approved" ? "Approved. It's ready to publish in Social." : decision === "Needs rework" ? "Sent back with your notes" : "Disapproved");
    };
  });
}
function linkForm(p) {
  openDialog("Add a link", `<form class="form db" id="lkForm"><label class="field" for="lk-url">Google Drive or other link<input id="lk-url" name="url" type="url" required></label><label class="field" for="lk-kind">It's a<select id="lk-kind" name="kind"><option value="image">Visual</option><option value="video">Video</option></select></label></form>`,
    `<button class="btn ghost" type="button" id="lkCancel">Cancel</button><button class="btn primary" type="submit" form="lkForm">Add</button>`, () => {
      document.getElementById("lkCancel").onclick = closeDialog;
      document.getElementById("lkForm").onsubmit = async e => { e.preventDefault(); const d = formData(e.target); closeDialog(); await addVersion(p, { url: d.url, kind: d.kind, name: "Link" }); };
    });
}
async function addVersion(p, m) {
  const media = [...(p.media || []), { ...m, by: S.me || "", at: new Date().toISOString() }];
  const patch = { media };
  if (p.status === "Needs rework") patch.status = "Ready for review";
  await updateDoc("posts", p.id, patch);
  toast(patch.status ? `Version ${media.length} sent for review` : `Version ${media.length} added`);
}

export function bindMarketing(v, r, render) {
  const on = (sel, fn) => v.querySelector(sel)?.addEventListener("click", fn);
  on("#newCamp", () => campForm()); on("#newCamp2", () => campForm());
  const newContent = () => postForm(null, { clientId: OWN, status: r === "marketing-review" ? "In progress" : "Idea", platforms: ["Facebook", "Instagram"] });
  on("#newContent", newContent); on("#newContent2", newContent);
  on("#newIdea", () => postForm(null, { clientId: OWN, status: "Idea" }));
  v.querySelectorAll("[data-camp]").forEach(b => b.onclick = () => campForm(S.campaigns.find(c => c.id === b.dataset.camp)));
  on("#mkPrev", () => { S.ui.mkMonth--; render(); }); on("#mkNext", () => { S.ui.mkMonth++; render(); }); on("#mkToday", () => { S.ui.mkMonth = 0; render(); });
  v.querySelectorAll("[data-start]").forEach(b => b.onclick = async () => { await updateDoc("posts", b.dataset.start, { status: "In progress", assigneeId: S.posts.find(p => p.id === b.dataset.start)?.assigneeId || S.me || "" }); toast("Started. Upload the draft in Review when it's ready."); });
  v.querySelectorAll("[data-rf]").forEach(b => b.onclick = () => { S.ui.reviewFilter = b.dataset.rf; render(); });
  v.querySelectorAll("[data-decide]").forEach(b => b.onclick = () => { const p = S.posts.find(x => x.id === b.dataset.id); if (p) decideForm(p, b.dataset.decide); });
  v.querySelectorAll("[data-upload]").forEach(inp => inp.onchange = async () => {
    const p = S.posts.find(x => x.id === inp.dataset.upload); const file = inp.files[0]; if (!p || !file) return;
    toast("Uploading…"); const m = await uploadMedia(file); inp.value = ""; if (m) await addVersion(p, m);
  });
  v.querySelectorAll("[data-addlink]").forEach(b => b.onclick = () => { const p = S.posts.find(x => x.id === b.dataset.addlink); if (p) linkForm(p); });
  v.querySelectorAll("[data-submit]").forEach(b => b.onclick = async () => { await updateDoc("posts", b.dataset.submit, { status: "Ready for review" }); toast("Sent for review"); });
}
