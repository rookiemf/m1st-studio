// Tasks: a shared to-do list grouped by when things are due.
import { esc, I, head, empty, today, addDays, fmt } from "../util.js";
import { S, myEmail, project, updateDoc, addDoc } from "../data.js";
import { whoChip, seg, bindSeg } from "../ui.js";
import { openTask } from "../schemas.js";

export const myOpenTasks = () => S.tasks.filter(t => !t.done && (!t.who || t.who === myEmail()) && t.due && t.due <= today());

function row(t) {
  const p = project(t.projectId), late = !t.done && t.due && t.due < today();
  return `<div class="trow2${t.done ? " done" : ""}">
    <input type="checkbox" data-tdone="${esc(t.id)}"${t.done ? " checked" : ""} aria-label="Mark ${esc(t.title)} done">
    <button class="tmain" data-task="${esc(t.id)}"><span class="t">${t.priority === "High" ? `<span class="hi" title="High priority">!</span>` : ""}${esc(t.title)}</span><span class="m">${p ? esc(p.title) : ""}${t.due ? `${p ? " · " : ""}<span class="${late ? "warntx" : ""}">${late ? "Overdue · " : ""}${esc(t.due === today() ? "Today" : fmt(t.due))}</span>` : ""}</span></button>
    ${whoChip(t.who)}
  </div>`;
}

export function tasks() {
  const f = S.ui.taskFilter, me = myEmail();
  let list = S.tasks.filter(t => f === "done" ? t.done : !t.done);
  if (f === "mine") list = list.filter(t => !t.who || t.who === me);
  list.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || (a.priority === "High" ? -1 : 1));
  const endWeek = addDays(today(), 7);
  const groups = f === "done" ? [["Done", list.slice().reverse().slice(0, 60)]] : [
    ["Overdue", list.filter(t => t.due && t.due < today())],
    ["Today", list.filter(t => t.due === today())],
    ["Next 7 days", list.filter(t => t.due > today() && t.due <= endWeek)],
    ["Later", list.filter(t => t.due > endWeek)],
    ["No date", list.filter(t => !t.due)]
  ];
  return head("Tasks", "Small steps for your projects, and anything else to get done.", `<button class="btn primary" data-addtask>${I.plus}Add a task</button>`) + `
  <form id="quick" class="quick panel"><input name="t" placeholder="Quick add: type a task and press Enter" aria-label="Quick add task" autocomplete="off"><select name="d" aria-label="When"><option value="${today()}">Today</option><option value="${addDays(today(), 1)}">Tomorrow</option><option value="${addDays(today(), 7)}">Next week</option><option value="">No date</option></select><button class="btn primary sm" type="submit">${I.plus}Add</button></form>
  <div class="toolbar">${seg("taskFilter", [["mine", "Mine"], ["all", "Everyone's"], ["done", "Done"]], f)}</div>
  ${list.length ? groups.filter(g => g[1].length).map(([name, items]) => `<section class="panel tgroup"><header><h2${name === "Overdue" ? ' class="warntx"' : ""}>${name}</h2><span class="count">${items.length}</span></header><div class="body">${items.map(row).join("")}</div></section>`).join("") :
    `<section class="panel"><div class="body">${empty("task", f === "done" ? "Nothing finished yet" : "No tasks", f === "done" ? "" : "Type one above to get started.")}</div></section>`}`;
}

export function bindTasks(v, r, render) {
  bindSeg(v, S, render);
  v.querySelectorAll("[data-addtask]").forEach(b => b.onclick = () => openTask());
  v.querySelectorAll("[data-task]").forEach(b => b.onclick = () => openTask(S.tasks.find(t => t.id === b.dataset.task)));
  v.querySelectorAll("[data-tdone]").forEach(cb => cb.onchange = () => updateDoc("tasks", cb.dataset.tdone, { done: cb.checked, doneAt: cb.checked ? new Date().toISOString() : "" }));
  const q = v.querySelector("#quick");
  q.onsubmit = async e => { e.preventDefault(); const t = q.elements.t.value.trim(); if (!t) return; const due = q.elements.d.value; q.elements.t.value = ""; await addDoc("tasks", { title: t, due, who: myEmail(), done: false, priority: "Normal" }); };
}
