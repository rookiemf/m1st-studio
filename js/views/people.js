// People: who can use Freelance HQ. Only Bob can invite or remove someone.
import { esc, I, head, empty, toast } from "../util.js";
import { S, people, isOwner, myEmail, setDocAt, deleteDoc, settings } from "../data.js";
import { whoChip, confirmBox, openDialog, closeDialog, copyText } from "../ui.js";
import { OWNER_EMAIL } from "../firebase.js";

const COLORS = ["#1F6F5F", "#C2547A", "#D9822B", "#4C6FBF", "#7A5AB8", "#2F8F9D"];

export function peoplePage() {
  const list = people();
  const url = location.origin + location.pathname;
  return head("People", "Who can sign in to Freelance HQ.", isOwner() ? `<button class="btn primary" id="invite">${I.plus}Invite someone</button>` : "") + `
  <section class="panel"><div class="body">${list.map(p => `
    <div class="rowitem"><span class="avatar" style="background:${esc(p.color || "#1F6F5F")}">${esc((p.name || p.email)[0].toUpperCase())}</span><span class="main"><span class="t">${esc(p.name || p.email)}${p.email === myEmail() ? ` <span class="muted small">(you)</span>` : ""}</span><span class="m">${esc(p.email)}${p.owner || p.email === OWNER_EMAIL ? " · owner" : ""}</span></span>
    ${isOwner() ? `<button class="btn ghost sm" data-editp="${esc(p.email)}">${I.edit}Edit</button>${p.email !== OWNER_EMAIL ? `<button class="btn ghost sm icon" data-rmp="${esc(p.email)}" aria-label="Remove ${esc(p.name || p.email)}">${I.trash}</button>` : ""}` : ""}</div>`).join("") || empty("users", "Just you so far", "")}</div></section>
  <section class="panel" style="margin-top:16px"><header><h2>How to invite</h2></header><div class="body steps">
    <p><b>1.</b> Tap <b>Invite someone</b> and enter the Gmail address they'll sign in with.</p>
    <p><b>2.</b> Send them this link: <a href="${esc(url)}">${esc(url)}</a> <button class="btn ghost sm" id="copyLink">${I.copy}Copy link</button></p>
    <p><b>3.</b> They tap <b>Sign in with Google</b> using that same email. That's it.</p>
    <p class="muted small">Everyone here can see and edit all projects, applications, tasks and invoices. Only you can add or remove people.</p>
  </div></section>`;
}

function personForm(p) {
  const isNew = !p;
  const used = S.access.map(a => a.color);
  const color = p?.color || COLORS.find(c => !used.includes(c)) || COLORS[1];
  openDialog(isNew ? "Invite someone" : "Edit person", `<form class="form db" id="pForm">
    <label class="field" for="p-email">Gmail address<input id="p-email" name="email" type="email" required autocomplete="off" value="${esc(p?.email || "")}"${isNew ? "" : " readonly"} placeholder="name@gmail.com"></label>
    <label class="field" for="p-name">Name<input id="p-name" name="name" required autocomplete="off" value="${esc(p?.name || "")}" placeholder="What to call them in the app"></label>
    <fieldset class="field"><legend>Colour</legend><div class="swatches">${COLORS.map(c => `<label class="sw" style="--c:${c}"><input type="radio" name="color" value="${c}"${c === color ? " checked" : ""}><i></i></label>`).join("")}</div></fieldset>
  </form>`, `<button class="btn ghost" type="button" id="pNo">Cancel</button><button class="btn primary" type="submit" form="pForm">${isNew ? "Invite" : "Save"}</button>`, () => {
    document.getElementById("pNo").onclick = closeDialog;
    document.getElementById("pForm").onsubmit = async e => {
      e.preventDefault(); const f = e.target;
      const email = f.elements.email.value.trim().toLowerCase(), name = f.elements.name.value.trim(), c = f.elements.color.value;
      if (!email.includes("@")) return;
      closeDialog();
      if (await setDocAt("access", email, { email, name, color: c, ...(isNew ? { addedAt: new Date().toISOString(), addedBy: myEmail() } : {}) })) toast(isNew ? `${name} can now sign in` : "Saved");
    };
  });
}

export function bindPeople(v) {
  const inv = v.querySelector("#invite"); if (inv) inv.onclick = () => personForm();
  v.querySelectorAll("[data-editp]").forEach(b => b.onclick = () => personForm(S.access.find(a => a.email === b.dataset.editp)));
  v.querySelectorAll("[data-rmp]").forEach(b => b.onclick = () => confirmBox(`Remove ${b.dataset.rmp}?`, () => deleteDoc("access", b.dataset.rmp), "Remove"));
  const cl = v.querySelector("#copyLink"); if (cl) cl.onclick = () => copyText(location.origin + location.pathname, "Link copied");
}
export { whoChip, settings };
