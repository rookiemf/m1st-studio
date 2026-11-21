// Job hunt: an application tracker plus a hub of the job sites you both use.
import { esc, I, head, empty, today, fmt } from "../util.js";
import { S, site, followUpDue, updateDoc, addDoc } from "../data.js";
import { whoChip, pill, seg, bindSeg, peopleFilter, byWho, linkBtn, copyText } from "../ui.js";
import { openJob, openSite, JOB_STATUS, SITE_CATS } from "../schemas.js";

const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } };
export const favicon = (url, size = 32) => { const h = host(url); return h ? `<img class="fav" width="${size}" height="${size}" src="https://www.google.com/s2/favicons?domain=${esc(h)}&sz=64" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : `<span class="fav">${I.globe}</span>`; };

const statusKind = s => ({ Saved: "muted", Applied: "", Interview: "warn", Offer: "brand", Hired: "ok", Rejected: "bad", "No reply": "muted" })[s] || "";

// An optional starter list. Bob decides what stays; every one can be edited or deleted.
const STARTER = [
  ["OnlineJobs.ph", "https://www.onlinejobs.ph/", "Philippines"],
  ["Upwork", "https://www.upwork.com/", "Freelance marketplace"],
  ["Fiverr", "https://www.fiverr.com/", "Freelance marketplace"],
  ["LinkedIn Jobs", "https://www.linkedin.com/jobs/", "Social and community"],
  ["JobStreet Philippines", "https://ph.jobstreet.com/", "Philippines"],
  ["Indeed Philippines", "https://ph.indeed.com/", "Philippines"],
  ["We Work Remotely", "https://weworkremotely.com/", "Remote job board"],
  ["Remote OK", "https://remoteok.com/", "Remote job board"],
  ["Behance Jobs", "https://www.behance.net/joblist", "Creative and portfolio"],
  ["Contra", "https://contra.com/", "Freelance marketplace"]
];

function card(j) {
  const s = site(j.siteId), due = followUpDue(j);
  return `<article class="jcard${due ? " due" : ""}" data-job="${esc(j.id)}" tabindex="0" role="button" aria-label="${esc(j.role)}">
    <div class="jtop">${s ? favicon(s.url, 20) : ""}<b>${esc(j.role)}</b></div>
    ${j.company ? `<div class="jco">${esc(j.company)}</div>` : ""}
    <div class="jmeta">${whoChip(j.who)}${j.pay ? `<span>${esc(j.pay)}</span>` : ""}</div>
    <div class="jmeta">${j.interview && j.interview >= today() ? `<span class="pill warn">Interview ${esc(fmt(j.interview))}</span>` : due ? `<span class="pill warn">Follow up</span>` : j.applied ? `<span>Applied ${esc(fmt(j.applied))}</span>` : ""}</div>
  </article>`;
}

function tracker() {
  const jobs = byWho(S.jobs, S.ui.jobWho).slice().sort((a, b) => (b.applied || b.createdAt || "").localeCompare(a.applied || a.createdAt || ""));
  const total = S.jobs.filter(j => j.status !== "Saved").length;
  const replied = S.jobs.filter(j => ["Interview", "Offer", "Hired", "Rejected"].includes(j.status)).length;
  const toolbar = `<div class="toolbar">${peopleFilter(S.ui.jobWho, "jobWho")}${seg("jobView", [["board", "Board"], ["list", "List"]], S.ui.jobView)}<span class="muted small">${total} applied · ${replied} replies${total ? ` (${Math.round(replied / total * 100)}%)` : ""}</span></div>`;
  if (!S.jobs.length) return toolbar + `<section class="panel"><div class="body">${empty("brief", "No applications yet", "Log every job you apply to so you know who to follow up with.", `<button class="btn primary sm" data-addjob>${I.plus}Log an application</button>`)}</div></section>`;
  if (S.ui.jobView === "list") return toolbar + `<section class="panel"><div class="tablebox"><table class="resp"><thead><tr><th>Role</th><th>Who</th><th>Site</th><th>Applied</th><th>Follow up</th><th>Status</th><th></th></tr></thead><tbody>${jobs.map(j => `
    <tr data-job="${esc(j.id)}"><td class="c-main"><b>${esc(j.role)}</b>${j.company ? `<div class="muted small">${esc(j.company)}</div>` : ""}</td><td>${whoChip(j.who)}</td><td class="c-hide">${esc(site(j.siteId)?.name || "")}</td><td class="c-hide">${esc(fmt(j.applied))}</td><td>${j.followUp ? `<span class="${followUpDue(j) ? "warntx" : ""}">${esc(fmt(j.followUp))}</span>` : ""}</td><td>${pill(j.status, statusKind(j.status))}</td><td class="c-hide">${j.link ? `<a class="btn ghost sm icon" href="${esc(j.link)}" target="_blank" rel="noopener" aria-label="Open job post" data-stop>${I.ext}</a>` : ""}</td></tr>`).join("")}</tbody></table></div></section>`;
  return toolbar + `<div class="board">${JOB_STATUS.map(st => { const col = jobs.filter(j => (j.status || "Applied") === st); return `
    <section class="bcol" data-col="${esc(st)}"><header><span>${pill(st, statusKind(st))}</span><span class="count">${col.length}</span></header><div class="bl">${col.map(card).join("") || `<p class="bempty">Drop here</p>`}</div></section>`; }).join("")}</div>
  <p class="inline-note">Drag a card to change its status, or open it to edit. Applications past their follow-up date are marked so you can send a short check-in.</p>`;
}

function sites() {
  const q = S.ui.siteQ.toLowerCase();
  const list = S.sites.filter(s => (!S.ui.siteCat || s.category === S.ui.siteCat) && (!q || `${s.name} ${s.url} ${s.notes || ""}`.toLowerCase().includes(q)))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.name || "").localeCompare(b.name || ""));
  const cats = SITE_CATS.filter(c => S.sites.some(s => s.category === c));
  const counts = id => S.jobs.filter(j => j.siteId === id).length;
  return `<div class="toolbar"><label class="search">${I.search}<input id="siteQ" data-live="1" placeholder="Search sites" value="${esc(S.ui.siteQ)}" aria-label="Search sites"></label>${cats.length > 1 ? seg("siteCat", [["", "All"], ...cats.map(c => [c, esc(c)])], S.ui.siteCat) : ""}</div>
  ${S.sites.length ? `<div class="sitegrid">${list.map(s => `
    <article class="sitecard">
      <div class="sh">${favicon(s.url, 36)}<div class="sn"><b>${esc(s.name)}</b><span>${esc(host(s.url))}</span></div>${s.pinned ? `<span class="pin" title="Pinned to the dashboard">${I.star}</span>` : ""}<button class="btn ghost sm icon" data-editsite="${esc(s.id)}" aria-label="Edit ${esc(s.name)}">${I.edit}</button></div>
      <div class="jmeta">${pill(s.category || "Other", "muted")}${whoChip(s.who)}${counts(s.id) ? `<span class="small muted">${counts(s.id)} applied</span>` : ""}</div>
      ${s.notes ? `<p class="snote">${esc(s.notes)}</p>` : ""}
      <div class="sa"><a class="btn primary sm" href="${esc(s.url)}" target="_blank" rel="noopener">${I.ext}Open</a>${linkBtn(s.profile, "My profile")}<button class="btn ghost sm" data-logsite="${esc(s.id)}">${I.plus}Log application</button></div>
    </article>`).join("") || `<p class="muted">No sites match.</p>`}</div>` :
    `<section class="panel"><div class="body">${empty("globe", "Your job sites go here", "Add each site you look for work on, with a link to your profile there. Then open any of them in one tap.", `<button class="btn primary sm" data-addsite>${I.plus}Add a site</button> <button class="btn ghost sm" id="starter">Add a starter list</button>`)}</div></section>
    <p class="inline-note">The starter list adds ten common sites for remote and Philippine work. You can edit or delete any of them.</p>`}`;
}

export function jobs(r) {
  const tab = r === "jobs-sites" ? "sites" : "tracker";
  return head("Job hunt", tab === "sites" ? "Every site you look for work on, in one place." : "Every application, where it stands and when to follow up.",
    tab === "sites" ? `<button class="btn primary" data-addsite>${I.plus}Add a site</button>` : `<button class="btn primary" data-addjob>${I.plus}Log an application</button>`) +
    `<nav class="subtabs"><a href="#jobs"${tab === "tracker" ? ' aria-current="page"' : ""}>Applications <span class="count">${S.jobs.length}</span></a><a href="#jobs-sites"${tab === "sites" ? ' aria-current="page"' : ""}>Job sites <span class="count">${S.sites.length}</span></a></nav>` +
    (tab === "sites" ? sites() : tracker());
}

export function bindJobs(v, r, render) {
  bindSeg(v, S, render);
  v.querySelectorAll("[data-addjob]").forEach(b => b.onclick = () => openJob());
  v.querySelectorAll("[data-addsite]").forEach(b => b.onclick = () => openSite());
  v.querySelectorAll("[data-editsite]").forEach(b => b.onclick = () => openSite(site(b.dataset.editsite)));
  v.querySelectorAll("[data-logsite]").forEach(b => b.onclick = () => openJob(null, { siteId: b.dataset.logsite }));
  v.querySelectorAll("[data-stop]").forEach(a => a.addEventListener("click", e => e.stopPropagation()));
  v.querySelectorAll("[data-job]").forEach(el => {
    const open = () => openJob(S.jobs.find(j => j.id === el.dataset.job));
    el.onclick = open; el.onkeydown = e => { if (e.key === "Enter") open(); };
    if (el.classList.contains("jcard")) { el.draggable = true; el.ondragstart = e => { e.dataTransfer.setData("text/plain", el.dataset.job); el.classList.add("dragging"); }; el.ondragend = () => el.classList.remove("dragging"); }
  });
  v.querySelectorAll("[data-col]").forEach(col => {
    col.ondragover = e => { e.preventDefault(); col.classList.add("over"); };
    col.ondragleave = () => col.classList.remove("over");
    col.ondrop = e => { e.preventDefault(); col.classList.remove("over"); const id = e.dataTransfer.getData("text/plain"); const j = S.jobs.find(x => x.id === id); if (j && j.status !== col.dataset.col) updateDoc("jobs", id, { status: col.dataset.col }); };
  });
  const q = v.querySelector("#siteQ"); if (q) q.oninput = () => { S.ui.siteQ = q.value; render(); };
  const st = v.querySelector("#starter");
  if (st) st.onclick = async () => { st.disabled = true; for (const [name, url, category] of STARTER) await addDoc("sites", { name, url, category, who: "", pinned: true, notes: "" }); };
  v.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copyText(b.dataset.copy));
}
