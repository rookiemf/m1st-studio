// Reusable UI: dialogs, a form builder, pills and small pieces.
import { esc, I, toast } from "./util.js";
import { people, nameOf, colorOf, myEmail, addDoc, updateDoc, deleteDoc } from "./data.js";

// ---------- dialog ----------
const dlg = () => document.getElementById("dlg");
export function openDialog(title, body, foot, onBind, wide = false) {
  const d = dlg();
  d.classList.toggle("wide", wide);
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
  openDialog(msg, `<div class="db muted">This can't be undone.</div>`, `<button class="btn ghost" id="cNo">Cancel</button><button class="btn danger" id="cYes">${esc(label)}</button>`, () => {
    document.getElementById("cNo").onclick = closeDialog;
    document.getElementById("cYes").onclick = async () => { closeDialog(); await yes(); };
  });
}
export async function copyText(text, okMsg = "Copied") {
  try { await navigator.clipboard.writeText(text); toast(okMsg); } catch (e) { toast("Couldn't copy. Select the text and copy it."); }
}

// ---------- small pieces ----------
export const seg = (name, items, current) => `<div class="seg" role="group">${items.map(([v, label]) => `<button type="button" data-seg="${esc(name)}" data-val="${esc(v)}" aria-pressed="${v === current}">${label}</button>`).join("")}</div>`;
export function bindSeg(v, S, render) {
  v.querySelectorAll("[data-seg]").forEach(b => b.onclick = () => { S.ui[b.dataset.seg] = b.dataset.val; render(); });
}
export const whoChip = email => `<span class="who" style="--c:${esc(colorOf(email))}"><i></i>${esc(nameOf(email))}</span>`;
export const pill = (text, kind = "") => `<span class="pill ${kind}">${esc(text)}</span>`;
export const whoSelectOptions = (sel, withBoth = true) =>
  (withBoth ? `<option value=""${!sel ? " selected" : ""}>Both of us</option>` : "") +
  people().map(p => `<option value="${esc(p.email)}"${p.email === sel ? " selected" : ""}>${esc((p.name || p.email).split(" ")[0])}</option>`).join("");
export const peopleFilter = (current, key = "who") => seg(key, [["", "Everyone"], ...people().map(p => [p.email, esc((p.name || p.email).split(" ")[0])])], current);
export const byWho = (items, who) => !who ? items : items.filter(i => !i.who || i.who === who);
export const linkBtn = (url, label = "Open", cls = "btn ghost sm") => url ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${I.ext}<span>${esc(label)}</span></a>` : "";
export const fixUrl = u => { u = String(u || "").trim(); return !u ? "" : /^https?:\/\//i.test(u) ? u : "https://" + u; };

// ---------- form builder ----------
// fields: { name, label, type: text|url|date|time|number|select|textarea|who|check, options: [[value,label]] | [label], required, placeholder, half, hint }
function fieldHTML(f, item) {
  const id = "f-" + f.name, val = item[f.name] ?? f.default ?? "";
  const req = f.required ? " required" : "", ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : "";
  let input;
  if (f.type === "textarea") input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 4}"${ph}${req}>${esc(val)}</textarea>`;
  else if (f.type === "select") input = `<select id="${id}" name="${f.name}"${req}>${(typeof f.options === "function" ? f.options() : f.options).map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(val) ? " selected" : ""}>${esc(l)}</option>`; }).join("")}</select>`;
  else if (f.type === "who") input = `<select id="${id}" name="${f.name}">${whoSelectOptions(item[f.name] ?? f.default ?? myEmail(), f.both !== false)}</select>`;
  else if (f.type === "check") return `<label class="checkline" for="${id}"><input type="checkbox" id="${id}" name="${f.name}"${val ? " checked" : ""}> ${esc(f.label)}</label>`;
  else input = `<input id="${id}" name="${f.name}" type="${f.type === "url" ? "text" : f.type || "text"}"${f.type === "number" ? ' step="any" inputmode="decimal"' : ""}${f.type === "url" ? ' inputmode="url"' : ""} value="${esc(val)}" autocomplete="off"${ph}${req}>`;
  return `<label class="field${f.half ? " half" : ""}" for="${id}">${esc(f.label)}${input}${f.hint ? `<small>${esc(f.hint)}</small>` : ""}</label>`;
}
export function readForm(form, fields) {
  const out = {};
  fields.forEach(f => {
    const el = form.elements[f.name]; if (!el) return;
    if (f.type === "check") out[f.name] = el.checked;
    else if (f.type === "number") out[f.name] = el.value === "" ? "" : +el.value;
    else if (f.type === "url") out[f.name] = fixUrl(el.value);
    else out[f.name] = el.value.trim();
  });
  return out;
}
// Opens an add/edit form for any collection.
export function editForm({ col, title, fields, item = null, defaults = {}, extra = "", onSaved, onBind, deleteLabel = "Delete", wide = false }) {
  const isNew = !item?.id, data = { ...defaults, ...(item || {}) };
  openDialog(isNew ? `Add ${title}` : `Edit ${title}`, `<form class="form db" id="edForm"><div class="fgrid">${fields.map(f => fieldHTML(f, data)).join("")}</div>${extra}</form>`,
    `${isNew ? "" : `<button class="btn ghost" type="button" id="edDel" style="margin-right:auto">${I.trash}${esc(deleteLabel)}</button>`}<button class="btn ghost" type="button" id="edNo">Cancel</button><button class="btn primary" type="submit" form="edForm">${isNew ? "Add" : "Save"}</button>`, () => {
      const f = document.getElementById("edForm");
      document.getElementById("edNo").onclick = closeDialog;
      const del = document.getElementById("edDel");
      if (del) del.onclick = () => confirmBox(`Delete this ${title}?`, () => deleteDoc(col, item.id));
      f.onsubmit = async e => {
        e.preventDefault();
        const d = readForm(f, fields);
        closeDialog();
        if (isNew) { const id = await addDoc(col, { ...defaults, ...d }); if (id) { toast("Added"); onSaved && onSaved(id, d); } }
        else if (await updateDoc(col, item.id, d)) { toast("Saved"); onSaved && onSaved(item.id, d); }
      };
      onBind && onBind(f);
    }, wide);
}
