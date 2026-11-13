// Tasks: Bob, Kim and Druwin hand out tasks; members work on them and send a report back for review.
import { esc, I, fmt, today, head, empty, cnt, toast, opts, ago, isUrl } from "../util.js";
import { S, addDoc, updateDoc, deleteDoc, member, memberName, clientName, sortedTeam, isLeader, leaderNames, myEmail } from "../data.js";
import { avatar, openDialog, closeDialog, confirmBox, formData, teamOptions } from "../ui.js";
import { OWN } from "../content.js";

export const TASK_STATUS = ["To do", "In progress", "For review", "Needs changes", "Done"];
const PRIORITIES = ["Normal", "High", "Urgent"];
const pill = s => `<span class="pill ${({ "To do": "muted", "In progress": "", "For review": "warn", "Needs changes": "bad", "Done": "ok" })[s] || "muted"}">${esc(s)}</span>`;
const open = t => t.status !== "Done";
const late = t => open(t) && t.status !== "For review" && t.due && t.due < today();
const mine = t => (S.me && t.assigneeId === S.me) || (t.assigneeEmail && t.assigneeEmail === myEmail());
export const myOpenTasks = () => S.tasks.filter(t => mine(t) && open(t) && t.status !== "For review");
export const tasksForReview = () => S.tasks.filter(t => t.status === "For review");
const order = (a, b) => (a.due || "9999").localeCompare(b.due || "9999") || PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority);

export function taskCard(t) {
  const m = member(t.assigneeId), lead = isLeader(), me = mine(t);
  return `<article class="tcard${late(t) ? " late" : ""}${t.status === "Done" ? " done" : ""}">
    <div class="thead"><span class="ttitle">${esc(t.title)}</span>${pill(t.status)}${t.priority && t.priority !== "Normal" ? `<span class="pill ${t.priority === "Urgent" ? "bad" : "warn"}">${esc(t.priority)}</span>` : ""}${late(t) ? '<span class="pill bad">Late</span>' : ""}</div>
    <div class="tmeta">${m ? `<span class="who">${avatar(m, "sm")}${esc(m.name)}</span>` : '<span class="who">Unassigned</span>'}${t.due ? `<span>${I.cal}Due ${esc(fmt(t.due))}</span>` : ""}${t.clientId ? `<span>${esc(clientName(t.clientId))}</span>` : ""}<span>From ${esc((memberName(t.createdBy) || "a leader").split(" ")[0])}</span></div>
    ${t.details ? `<p class="tdetails">${esc(t.details)}</p>` : ""}
    ${isUrl(t.link) ? `<a class="tlink" href="${esc(t.link)}" target="_blank" rel="noopener">${I.link}Brief or files</a>` : ""}
    ${t.report ? `<div class="treport"><b>Report${t.reportAt ? ` · ${esc(ago(t.reportAt))}` : ""}</b><span>${esc(t.report)}</span>${isUrl(t.reportLink) ? `<a href="${esc(t.reportLink)}" target="_blank" rel="noopener">${I.link}Open the work</a>` : ""}</div>` : ""}
    ${t.feedback && t.status !== "Done" ? `<div class="treport fb"><b>Feedback from ${esc((t.reviewedBy || "a leader").split(" ")[0])}</b><span>${esc(t.feedback)}</span></div>` : ""}
    <div class="actions">
      ${me && (t.status === "To do" || t.status === "Needs changes") ? `<button class="btn ghost sm" data-tstart="${esc(t.id)}">Start</button>` : ""}
      ${me && open(t) && t.status !== "For review" ? `<button class="btn primary sm" data-treport="${esc(t.id)}">${I.send}Send report</button>` : ""}
      ${lead && t.status === "For review" ? `<button class="btn primary sm" data-tok="${esc(t.id)}">${I.check}Approve</button><button class="btn ghost sm" data-tback="${esc(t.id)}">Send back</button>` : ""}
      ${lead ? `<button class="btn ghost sm" data-tedit="${esc(t.id)}">${I.edit}Edit</button>` : ""}
    </div></article>`;
}

export function tasks() {
  const lead = isLeader(), f = S.ui.taskFilter;
  const all = S.tasks.slice().sort(order);
  const L = f === "review" ? all.filter(t => t.status === "For review") : f === "all" ? all.filter(open) : f === "done" ? all.filter(t => t.status === "Done").reverse() : all.filter(t => mine(t) && open(t));
  const myN = all.filter(t => mine(t) && open(t)).length, revN = tasksForReview().length, lateN = all.filter(late).length, doneN = all.filter(t => t.status === "Done").length;
  const tabs = [["mine", "My tasks"], ["all", "Everyone's"], ["review", "For review"], ["done", "Done"]];
  const byPerson = f === "all" ? [...new Set(L.map(t => t.assigneeId || ""))] : [""];
  const list = f === "all"
    ? byPerson.map(id => `<section class="panel" style="margin-bottom:12px"><header><h2>${esc(memberName(id) || "Unassigned")}</h2><span class="count">${L.filter(t => (t.assigneeId || "") === id).length}</span></header><div class="tlist">${L.filter(t => (t.assigneeId || "") === id).map(taskCard).join("")}</div></section>`).join("")
    : `<section class="panel"><div class="tlist">${L.map(taskCard).join("")}</div></section>`;
  return head("Tasks", `Tasks come from ${leaderNames()}. When you finish one, send a report and a leader reviews it.`, lead ? `<button class="btn primary" id="newTask">${I.plus}Assign a task</button>` : "") + `
  <div class="kpis">
    <div class="kpi hero"><div class="lbl">${I.task}My open tasks</div><div class="val">${cnt(myN)}</div><div class="sub">${myN ? "Assigned to you" : "Nothing on your plate"}</div></div>
    <div class="kpi${revN && lead ? " attn" : ""}"><div class="lbl">${I.eye}Waiting for review</div><div class="val">${cnt(revN)}</div><div class="sub">${lead ? "Reports to check" : "With the leaders"}</div></div>
    <div class="kpi${lateN ? " attn" : ""}"><div class="lbl">${I.clock}Late</div><div class="val">${cnt(lateN)}</div><div class="sub">${lateN ? "Past the due date" : "Everything on time"}</div></div>
    <div class="kpi"><div class="lbl">${I.check}Done</div><div class="val">${cnt(doneN)}</div><div class="sub">Approved by a leader</div></div>
  </div>
  <div class="toolbar" style="padding:0 0 14px;border:none"><div class="seg" role="group" aria-label="Show">${tabs.map(([k, l]) => `<button type="button" data-tf="${k}" aria-pressed="${f === k}">${l}${k === "review" && revN ? ` (${revN})` : ""}</button>`).join("")}</div></div>
  ${L.length ? list : `<section class="panel">${empty("task", f === "mine" ? "No tasks for you right now" : f === "review" ? "No reports waiting" : f === "done" ? "Nothing finished yet" : "No open tasks", lead ? "Assign a task to anyone on the team. They'll see it here and on their dashboard." : `When ${leaderNames()} assign you something, it shows up here.`, lead && f !== "done" ? `<button class="btn primary sm" id="newTask2">${I.plus}Assign a task</button>` : "")}</section>`}
  ${!S.me && !lead ? `<p class="inline-note">Your Google account isn't linked to a team profile yet, so tasks can't be matched to you. Ask a leader to add your sign-in email to your profile.</p>` : ""}`;
}

export function taskForm(t, prefill = {}) {
  const isNew = !t; const p = t || { status: "To do", priority: "Normal", due: today(), assigneeId: "", ...prefill };
  openDialog(isNew ? "Assign a task" : "Edit task", `<form class="form db" id="tkForm">
    <label class="field" for="tk-title">Task<input id="tk-title" name="title" required autocomplete="off" value="${esc(p.title)}" placeholder="e.g. Edit the restaurant sample reel"></label>
    <div class="frow"><label class="field" for="tk-who">Assign to<select id="tk-who" name="assigneeId" required>${teamOptions(p.assigneeId, "Choose a member")}</select></label><label class="field" for="tk-due">Due<input id="tk-due" type="date" name="due" value="${esc(p.due)}"></label></div>
    <div class="frow"><label class="field" for="tk-pri">Priority<select id="tk-pri" name="priority">${opts(PRIORITIES, p.priority)}</select></label><label class="field" for="tk-client">For<select id="tk-client" name="clientId"><option value="">General</option><option value="${OWN}"${p.clientId === OWN ? " selected" : ""}>M1st (our page)</option>${S.clients.map(c => `<option value="${esc(c.id)}"${c.id === p.clientId ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>${isNew ? "" : `<label class="field" for="tk-status">Status<select id="tk-status" name="status">${opts(TASK_STATUS, p.status)}</select></label>`}</div>
    <label class="field" for="tk-details">What needs to be done<textarea id="tk-details" name="details" rows="4" placeholder="The goal, what to deliver, anything to watch out for">${esc(p.details)}</textarea></label>
    <label class="field" for="tk-link">Brief or files link (optional)<input id="tk-link" name="link" type="url" autocomplete="off" value="${esc(p.link)}" placeholder="Google Drive or Canva link"></label>
  </form>`, `${isNew ? "" : `<button class="btn ghost" type="button" id="tkDel" style="margin-right:auto">${I.trash}Delete</button>`}<button class="btn ghost" type="button" id="tkCancel">Cancel</button><button class="btn primary" type="submit" form="tkForm">${isNew ? "Assign" : "Save"}</button>`, () => {
    document.getElementById("tkCancel").onclick = closeDialog;
    const del = document.getElementById("tkDel"); if (del) del.onclick = () => confirmBox(`Delete "${p.title}"?`, () => deleteDoc("tasks", t.id));
    document.getElementById("tkForm").onsubmit = async e => {
      e.preventDefault(); const d = formData(e.target); d.title = d.title.trim(); if (!d.title) return;
      d.assigneeEmail = (member(d.assigneeId)?.email || "").toLowerCase();
      closeDialog();
      if (isNew) { d.status = "To do"; await addDoc("tasks", d); toast(`Assigned to ${memberName(d.assigneeId).split(" ")[0] || "the team"}`); }
      else { await updateDoc("tasks", t.id, d); toast("Saved"); }
    };
  });
}
function reportForm(t) {
  openDialog("Send your report", `<form class="form db" id="rpForm"><p class="muted" style="margin:0">${esc(t.title)}</p>
    <label class="field" for="rp-text">What did you do?<textarea id="rp-text" name="report" rows="4" required placeholder="What's finished, what's left, anything the leaders should know">${esc(t.report)}</textarea></label>
    <label class="field" for="rp-link">Link to the work (optional)<input id="rp-link" name="reportLink" type="url" autocomplete="off" value="${esc(t.reportLink)}" placeholder="Google Drive or Canva link"></label>
    <p class="inline-note" style="margin:0">This goes to ${esc(leaderNames())} for review.</p></form>`,
    `<button class="btn ghost" type="button" id="rpCancel">Cancel</button><button class="btn primary" type="submit" form="rpForm">Send report</button>`, () => {
      document.getElementById("rpCancel").onclick = closeDialog;
      document.getElementById("rpForm").onsubmit = async e => {
        e.preventDefault(); const d = formData(e.target); closeDialog();
        await updateDoc("tasks", t.id, { status: "For review", report: d.report.trim(), reportLink: d.reportLink || "", reportAt: new Date().toISOString() });
        toast("Report sent to the leaders");
      };
    });
}
function sendBack(t) {
  openDialog("Send back for changes", `<form class="form db" id="sbForm"><p class="muted" style="margin:0">${esc(t.title)} · ${esc(memberName(t.assigneeId))}</p><label class="field" for="sb-note">What should change?<textarea id="sb-note" name="feedback" rows="3" required></textarea></label></form>`,
    `<button class="btn ghost" type="button" id="sbCancel">Cancel</button><button class="btn primary" type="submit" form="sbForm">Send back</button>`, () => {
      document.getElementById("sbCancel").onclick = closeDialog;
      document.getElementById("sbForm").onsubmit = async e => {
        e.preventDefault(); const fb = new FormData(e.target).get("feedback"); closeDialog();
        await updateDoc("tasks", t.id, { status: "Needs changes", feedback: fb, reviewedBy: S.user?.displayName || "", reviewedAt: new Date().toISOString() });
        toast("Sent back with your feedback");
      };
    });
}
export function bindTaskButtons(v) {
  const find = id => S.tasks.find(t => t.id === id);
  v.querySelectorAll("[data-tstart]").forEach(b => b.onclick = async () => { await updateDoc("tasks", b.dataset.tstart, { status: "In progress" }); toast("Marked as in progress"); });
  v.querySelectorAll("[data-treport]").forEach(b => b.onclick = () => reportForm(find(b.dataset.treport)));
  v.querySelectorAll("[data-tok]").forEach(b => b.onclick = async () => { await updateDoc("tasks", b.dataset.tok, { status: "Done", reviewedBy: S.user?.displayName || "", reviewedAt: new Date().toISOString() }); toast("Approved"); });
  v.querySelectorAll("[data-tback]").forEach(b => b.onclick = () => sendBack(find(b.dataset.tback)));
  v.querySelectorAll("[data-tedit]").forEach(b => b.onclick = () => taskForm(find(b.dataset.tedit)));
}
export function bindTasks(v, r, render) {
  v.querySelector("#newTask")?.addEventListener("click", () => taskForm());
  v.querySelector("#newTask2")?.addEventListener("click", () => taskForm());
  v.querySelectorAll("[data-tf]").forEach(b => b.onclick = () => { S.ui.taskFilter = b.dataset.tf; render(); });
  bindTaskButtons(v);
}
