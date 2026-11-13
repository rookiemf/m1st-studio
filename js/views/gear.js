// Equipment: what M1st owns, and whether each item is free, in use, booked for a shoot, or being repaired.
import { esc, I, fmt, today, head, empty, cnt, toast, opts } from "../util.js";
import { S, addDoc, updateDoc, deleteDoc, member, memberName, sortedTeam, uploadPhoto, photoUrl } from "../data.js";
import { avatar, openDialog, closeDialog, confirmBox, teamOptions, formData } from "../ui.js";

export const GEAR_TYPES = ["Camera", "Lens", "Lighting", "Audio", "Stabilizer / tripod", "Drone", "Computer", "Drawing tablet", "Storage / cards", "Accessory"];
export const STARTER_GEAR = [
  { name: "Canon M50", type: "Camera" },
  { name: "Nikon D500 #1", type: "Camera" },
  { name: "Nikon D500 #2", type: "Camera" },
  { name: "Nikon D700", type: "Camera" },
  { name: "Godox flash", type: "Lighting" }
];

// A shoot "holds" gear on its date when it is booked or being shot.
const activeShoot = b => b.status === "Booked" || b.status === "Shot";
export const shootsUsing = (gearId, date) => S.bookings.filter(b => activeShoot(b) && (b.gearIds || []).includes(gearId) && (!date || b.date === date));
export function gearState(g) {
  if (g.repair) return { key: "repair", label: "Needs repair", cls: "bad" };
  if (g.outBy) return { key: "out", label: "In use", cls: "warn", who: g.outBy };
  const t = shootsUsing(g.id, today());
  if (t.length) return { key: "shoot", label: "Booked for a shoot today", cls: "brand", shoot: t[0] };
  return { key: "free", label: "Available", cls: "ok" };
}
export const gearName = id => S.gear.find(g => g.id === id)?.name || "";

export function gear() {
  const items = S.gear.slice().sort((a, b) => (a.type || "").localeCompare(b.type || "") || (a.name || "").localeCompare(b.name || ""));
  const states = items.map(g => [g, gearState(g)]);
  const n = k => states.filter(([, s]) => s.key === k).length;
  const upcoming = S.bookings.filter(b => activeShoot(b) && b.date >= today() && (b.gearIds || []).length).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  return head("Equipment", "Everything M1st owns, and who has it right now.", `<button class="btn primary" id="addGear">${I.plus}Add equipment</button>`) + `
  <div class="kpis">
    <div class="kpi"><div class="lbl">${I.check}Available</div><div class="val">${cnt(n("free"))}</div><div class="sub">of ${items.length} items</div></div>
    <div class="kpi${n("out") ? " attn" : ""}"><div class="lbl">${I.users}In use</div><div class="val">${cnt(n("out"))}</div><div class="sub">Checked out by the team</div></div>
    <div class="kpi"><div class="lbl">${I.cal}On a shoot today</div><div class="val">${cnt(n("shoot"))}</div><div class="sub">From local bookings</div></div>
    <div class="kpi${n("repair") ? " attn" : ""}"><div class="lbl">${I.x}Needs repair</div><div class="val">${cnt(n("repair"))}</div><div class="sub">${n("repair") ? "Can't be used" : "Everything works"}</div></div>
  </div>
  ${items.length ? `<div class="cols" style="grid-template-columns:minmax(0,2fr) minmax(280px,1fr);align-items:start">
    <section class="panel"><div class="tablebox"><table class="resp"><thead><tr><th>Item</th><th>Type</th><th>Status</th><th>Who / where</th><th class="right"><span class="hidden">Actions</span></th></tr></thead><tbody>
    ${states.map(([g, s]) => `<tr>
      <td class="c-main"><div style="display:flex;gap:10px;align-items:center">${g.photoId ? `<img src="${esc(photoUrl(g.photoId))}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover">` : `<span class="avatar" style="border-radius:8px;background:#EFEDED;color:var(--grey-900)" aria-hidden="true">${I.bag.replace('aria-hidden="true"', 'aria-hidden="true" width="18" height="18"')}</span>`}<div><div class="t">${esc(g.name)}</div>${g.notes ? `<div class="s">${esc(g.notes)}</div>` : ""}</div></div></td>
      <td class="c-hide"><span class="tag">${esc(g.type)}</span></td>
      <td><span class="pill ${s.cls}">${esc(s.label)}</span></td>
      <td>${s.key === "out" ? `<span style="display:inline-flex;gap:6px;align-items:center">${avatar(member(s.who), "sm")}${esc(memberName(s.who) || "Someone")}</span><div class="s">${esc(g.outFor || "")}${g.returnBy ? ` · back ${fmt(g.returnBy)}` : ""}</div>` : s.key === "shoot" ? `<a href="#local" class="s" style="color:var(--maroon)">${esc(s.shoot.clientName)} · ${esc(s.shoot.eventType)}</a>` : s.key === "repair" ? `<span class="s">${esc(g.repairNote || "")}</span>` : `<span class="s">In the studio</span>`}</td>
      <td class="right" style="white-space:nowrap">${s.key === "out" ? `<button class="btn primary sm" data-return="${esc(g.id)}">${I.check}Returned</button>` : s.key === "repair" ? `<button class="btn ghost sm" data-fixed="${esc(g.id)}">Fixed</button>` : `<button class="btn sm" data-checkout="${esc(g.id)}">Use it</button>`} <button class="btn ghost sm icon" data-editgear="${esc(g.id)}" aria-label="Edit ${esc(g.name)}">${I.edit}</button></td>
    </tr>`).join("")}</tbody></table></div></section>
    <section class="panel"><header><h2>Booked for upcoming shoots</h2><span class="count">${upcoming.length}</span></header><div class="body">
      ${upcoming.length ? upcoming.map(b => `<div class="rowitem"><div class="main"><div class="t">${esc(b.clientName)} · ${esc(b.eventType)}</div><div class="m"><span>${fmt(b.date)}</span><span>${(b.gearIds || []).map(gearName).filter(Boolean).map(esc).join(", ")}</span></div></div></div>`).join("") : empty("cal", "No gear booked yet", "Pick gear when you add a local shoot, and it shows up here.")}
    </div></section>
  </div>` : `<section class="panel">${empty("bag", "No equipment listed yet", "Add the gear you have now in one tap, then add the rest as you go.", `<div class="actions" style="justify-content:center"><button class="btn primary sm" id="seedGear">${I.bag}Add our current gear</button><button class="btn ghost sm" id="addGear2">${I.plus}Add one item</button></div>`)}</section>`}`;
}

function gearForm(g) {
  const isNew = !g; const p = g || { type: GEAR_TYPES[0] };
  openDialog(isNew ? "Add equipment" : "Edit equipment", `<form class="form db" id="gearForm">
    <div class="frow"><label class="field" for="gf-name">Name<input id="gf-name" name="name" required autocomplete="off" value="${esc(p.name)}" placeholder="e.g. Sony 50mm f/1.8"></label><label class="field" for="gf-type">Type<select id="gf-type" name="type">${opts(GEAR_TYPES, p.type)}</select></label></div>
    <label class="field" for="gf-notes">Notes (serial number, what's in the bag, batteries)<input id="gf-notes" name="notes" autocomplete="off" value="${esc(p.notes)}"></label>
    ${S.assets ? `<label class="field" for="gf-photo">Photo<input id="gf-photo" type="file" accept="image/*"></label><input type="hidden" name="photoId" value="${esc(p.photoId)}">` : ""}
    <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="repair" style="width:16px;height:16px;min-height:0;accent-color:var(--maroon)"${p.repair ? " checked" : ""}> Needs repair</label>
    <label class="field" for="gf-rnote">What's wrong (if it needs repair)<input id="gf-rnote" name="repairNote" autocomplete="off" value="${esc(p.repairNote)}"></label>
  </form>`, `${isNew ? "" : `<button class="btn ghost" type="button" id="gfDel" style="margin-right:auto">${I.trash}Delete</button>`}<button class="btn ghost" type="button" id="gfCancel">Cancel</button><button class="btn primary" type="submit" form="gearForm">${isNew ? "Add" : "Save"}</button>`, () => {
    const f = document.getElementById("gearForm");
    document.getElementById("gfCancel").onclick = closeDialog;
    const ph = document.getElementById("gf-photo");
    if (ph) ph.onchange = async () => { const file = ph.files[0]; if (!file) return; ph.disabled = true; const id = await uploadPhoto(file); ph.disabled = false; if (id) { f.elements.photoId.value = id; toast("Photo ready. Save to keep it."); } };
    const del = document.getElementById("gfDel");
    if (del) del.onclick = () => confirmBox(`Delete ${p.name}?`, () => deleteDoc("gear", g.id));
    f.onsubmit = async e => {
      e.preventDefault(); const d = formData(f); d.repair = !!d.repair; d.name = d.name.trim(); if (!d.name) return; closeDialog();
      if (isNew) { await addDoc("gear", d); toast("Added"); } else { await updateDoc("gear", g.id, d); toast("Saved"); }
    };
  });
}
function checkoutForm(g) {
  const clash = shootsUsing(g.id).filter(b => b.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0];
  openDialog(`Use ${g.name}`, `<form class="form db" id="coForm">
    <label class="field" for="co-who">Who has it?<select id="co-who" name="outBy" required>${teamOptions(S.me, "Choose a person")}</select></label>
    <label class="field" for="co-for">What for?<input id="co-for" name="outFor" autocomplete="off" placeholder="e.g. Product shoot for Bean Café"></label>
    <label class="field" for="co-back">Bringing it back by<input id="co-back" type="date" name="returnBy" value="${today()}"></label>
    ${clash ? `<div class="banner" style="margin:0">Heads up: this is booked for ${esc(clash.clientName)}'s ${esc(clash.eventType)} on ${fmt(clash.date)}.</div>` : ""}
  </form>`, `<button class="btn ghost" type="button" id="coCancel">Cancel</button><button class="btn primary" type="submit" form="coForm">Mark as in use</button>`, () => {
    document.getElementById("coCancel").onclick = closeDialog;
    document.getElementById("coForm").onsubmit = async e => {
      e.preventDefault(); const d = formData(e.target); if (!d.outBy) { toast("Choose who has it"); return; }
      closeDialog(); await updateDoc("gear", g.id, { ...d, outSince: today() }); toast(`${g.name} marked as in use`);
    };
  });
}
export function bindGear(v) {
  v.querySelector("#addGear")?.addEventListener("click", () => gearForm());
  v.querySelector("#addGear2")?.addEventListener("click", () => gearForm());
  v.querySelector("#seedGear")?.addEventListener("click", async e => {
    if (S.gear.length) return; e.target.disabled = true;
    for (const g of STARTER_GEAR) if (!(await addDoc("gear", { ...g, repair: false }))) return;
    toast("Gear added. Add lenses, tripods and the rest with Add equipment.");
  });
  v.querySelectorAll("[data-editgear]").forEach(b => b.onclick = () => gearForm(S.gear.find(g => g.id === b.dataset.editgear)));
  v.querySelectorAll("[data-checkout]").forEach(b => b.onclick = () => checkoutForm(S.gear.find(g => g.id === b.dataset.checkout)));
  v.querySelectorAll("[data-return]").forEach(b => b.onclick = async () => { await updateDoc("gear", b.dataset.return, { outBy: "", outFor: "", returnBy: "", outSince: "" }); toast("Marked as returned"); });
  v.querySelectorAll("[data-fixed]").forEach(b => b.onclick = async () => { await updateDoc("gear", b.dataset.fixed, { repair: false, repairNote: "" }); toast("Marked as fixed"); });
}
