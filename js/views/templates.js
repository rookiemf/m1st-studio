// Templates: reusable layouts and captions for social posts and ads, so everything M1st posts looks consistent.
import { esc, I, head, empty, toast, opts, isUrl } from "../util.js";
import { S, addDoc, updateDoc, deleteDoc, photoUrl } from "../data.js";
import { openDialog, closeDialog, confirmBox, formData, copyText, postForm } from "../ui.js";
import { OWN, MAIN_PLATFORMS } from "../content.js";

export const TPL_KINDS = ["Ad", "Post", "Carousel", "Story or Reel", "Cover or banner"];
export const TPL_SIZES = ["1080 × 1350 (portrait post)", "1080 × 1080 (square)", "1080 × 1920 (Story, Reel)", "1200 × 627 (LinkedIn link post)", "851 × 315 (Facebook cover)", "1128 × 191 (LinkedIn cover)", "Other"];
const STARTERS = [
  { name: "Free content audit ad", kind: "Ad", platforms: ["Facebook", "Instagram"], size: TPL_SIZES[1], headline: "Is your page working for you?", caption: "We'll look at your [business type] page and send you 3 fixes you can do this week. Free for the first 10 businesses.\n\nMade by real people at M1st Creatives. Message us \"AUDIT\" to start.", notes: "Maroon background, white headline, octopus logo bottom right. One real work sample as the image." },
  { name: "Service ad: monthly content", kind: "Ad", platforms: ["Facebook", "Instagram", "LinkedIn"], size: TPL_SIZES[0], headline: "Your posts, handled.", caption: "You run [business]. We make the posts.\n\n• [number] posts and Reels a month\n• Designed, shot and edited by our team\n• You approve everything before it goes out\n\nMessage M1st Creatives to see samples for [niche].", notes: "Use a before/after or 3-up grid of real work. Keep text under 20% of the image." },
  { name: "Before and after", kind: "Carousel", platforms: ["Instagram", "Facebook"], size: TPL_SIZES[0], headline: "Raw footage → finished post", caption: "Slide 1 is what [client or concept name] sent us. Slide 2 is what we posted.\n\nEdited by [team member] at M1st. No AI, just hours.", notes: "Slide 1: raw frame, label 'Before'. Slide 2: final, label 'After'. Slide 3: who made it." },
  { name: "Meet the team", kind: "Post", platforms: ["Instagram", "Facebook", "LinkedIn"], size: TPL_SIZES[0], headline: "[Name], [role]", caption: "Meet [name], our [role]. [He/She] is the one behind [type of work]. Outside M1st: [one fun fact].\n\nReal creatives, not AI slop.", notes: "Portrait photo, name in white on a maroon strip at the bottom." },
  { name: "Tip for business owners", kind: "Carousel", platforms: ["Instagram", "LinkedIn"], size: TPL_SIZES[0], headline: "[Number] [things] every [niche] page needs", caption: "Save this for your next post day.\n\n1. [Tip]\n2. [Tip]\n3. [Tip]\n\nWant us to do it for you? Message M1st Creatives.", notes: "Cover slide with big number. One tip per slide, dark grey background, white text, maroon accents." },
  { name: "Local shoot promo", kind: "Ad", platforms: ["Facebook"], size: TPL_SIZES[1], headline: "Photo and video for your [event or business]", caption: "Para sa mga negosyo at okasyon dito sa Borongan at Eastern Samar: photography, videography at short films, gawa ng M1st Creatives.\n\nPackages start at ₱[price]. Message us for dates.", notes: "Use our best local photo. Add the packages as a second image if needed." },
  { name: "Reel cover", kind: "Story or Reel", platforms: ["Instagram", "Facebook"], size: TPL_SIZES[2], headline: "[Short hook, 3 to 5 words]", caption: "[One line about the video]. Made by [team member] at M1st.", notes: "Keep the title in the middle third so it isn't cut off in the grid." }
];
const kindPill = k => `<span class="pill ${({ "Ad": "brand", "Carousel": "dark", "Story or Reel": "warn" })[k] || ""}">${esc(k)}</span>`;

export function templates() {
  const f = S.ui.tplFilter;
  const all = S.templates.slice().sort((a, b) => (a.kind || "").localeCompare(b.kind || "") || (a.name || "").localeCompare(b.name || ""));
  const L = f ? all.filter(t => t.kind === f) : all;
  const cards = L.map(t => {
    const img = photoUrl(t.preview);
    return `<article class="tplcard">
      <div class="tplthumb">${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<div class="tplph"><b>${esc(t.headline || t.name)}</b><span>${esc((t.size || "").split(" (")[0])}</span></div>`}</div>
      <div class="tplbody"><div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${kindPill(t.kind)}${(t.platforms || []).map(p => `<span class="tag">${esc(p)}</span>`).join("")}</div>
        <b class="tplname">${esc(t.name)}</b>
        ${t.size ? `<span class="inline-note">${esc(t.size)}</span>` : ""}
        ${t.caption ? `<p class="tplcap">${esc(t.caption)}</p>` : ""}
        ${t.notes ? `<p class="inline-note" style="margin:0"><b>Design notes:</b> ${esc(t.notes)}</p>` : ""}
        <div class="actions" style="margin-top:auto">
          ${isUrl(t.link) ? `<a class="btn primary sm" href="${esc(t.link)}" target="_blank" rel="noopener">${I.link}Open design</a>` : ""}
          ${t.caption ? `<button class="btn ghost sm" data-tplcopy="${esc(t.id)}">${I.copy}Copy caption</button>` : ""}
          <button class="btn ghost sm" data-tpluse="${esc(t.id)}">${I.plus}Use in a post</button>
          <button class="btn ghost sm icon" data-tpledit="${esc(t.id)}" aria-label="Edit template">${I.edit}</button>
        </div></div></article>`;
  }).join("");
  return head("Templates", "Ready-made layouts and captions for our social posts and ads. Fill in the [brackets] and go.", `<button class="btn primary" id="newTpl">${I.plus}Add a template</button>`) + `
  <div class="toolbar" style="padding:0 0 14px;border:none"><div class="seg" role="group" aria-label="Type"><button type="button" data-tplf="" aria-pressed="${!f}">All</button>${TPL_KINDS.map(k => `<button type="button" data-tplf="${esc(k)}" aria-pressed="${f === k}">${esc(k)}</button>`).join("")}</div></div>
  ${L.length ? `<div class="tplgrid">${cards}</div>` : `<section class="panel">${empty("grid", all.length ? "No templates of this type yet" : "No templates yet", "Add your Canva, Figma or Drive designs here with a caption, so anyone on the team can make an on-brand post or ad.", all.length ? "" : `<div class="actions" style="justify-content:center"><button class="btn primary sm" id="seedTpl">${I.grid}Add 7 starter templates</button><button class="btn ghost sm" id="newTpl2">${I.plus}Add my own</button></div>`)}</section>`}
  <section class="panel" style="margin-top:16px"><header><h2>Sizes to design at</h2></header><div class="body" style="padding-top:12px"><div class="sizes">${[["Instagram and Facebook post", "1080 × 1350"], ["Square post or ad", "1080 × 1080"], ["Story and Reel", "1080 × 1920"], ["LinkedIn link post", "1200 × 627"], ["Facebook cover", "851 × 315"], ["LinkedIn cover", "1128 × 191"], ["Profile photo", "400 × 400"]].map(([a, b]) => `<div><span>${a}</span><b class="num">${b}</b></div>`).join("")}</div>
  <p class="inline-note" style="margin:12px 0 0">Brand colors: black #121212, white, maroon #7A1F2B, dark grey #2B2B2B. Always place the octopus logo.</p></div></section>`;
}

export function templateForm(t) {
  const isNew = !t; const p = t || { kind: "Ad", platforms: [...MAIN_PLATFORMS], size: TPL_SIZES[0] };
  openDialog(isNew ? "Add a template" : "Edit template", `<form class="form db" id="tpForm">
    <label class="field" for="tp-name">Name<input id="tp-name" name="name" required autocomplete="off" value="${esc(p.name)}" placeholder="e.g. Free content audit ad"></label>
    <div class="frow"><label class="field" for="tp-kind">Type<select id="tp-kind" name="kind">${opts(TPL_KINDS, p.kind)}</select></label><label class="field" for="tp-size">Size<select id="tp-size" name="size">${opts(TPL_SIZES, p.size)}</select></label></div>
    <fieldset style="border:none;padding:0;margin:0"><legend class="field" style="margin-bottom:6px">Platforms</legend><div class="checks">${MAIN_PLATFORMS.map(x => `<label><input type="checkbox" name="plat" value="${esc(x)}"${(p.platforms || []).includes(x) ? " checked" : ""}>${esc(x)}</label>`).join("")}</div></fieldset>
    <label class="field" for="tp-link">Design link (Canva, Figma or Google Drive)<input id="tp-link" name="link" type="url" autocomplete="off" value="${esc(p.link)}" placeholder="https://www.canva.com/design/..."></label>
    <label class="field" for="tp-prev">Preview image link (optional)<input id="tp-prev" name="preview" type="url" autocomplete="off" value="${esc(p.preview)}" placeholder="Google Drive share link to a PNG or JPG"></label>
    <label class="field" for="tp-head">Headline on the design<input id="tp-head" name="headline" autocomplete="off" value="${esc(p.headline)}" placeholder="e.g. Your posts, handled."></label>
    <label class="field" for="tp-cap">Caption or ad text<textarea id="tp-cap" name="caption" rows="5" placeholder="Use [brackets] for the parts to fill in">${esc(p.caption)}</textarea></label>
    <label class="field" for="tp-notes">Design notes<textarea id="tp-notes" name="notes" rows="2" placeholder="Colors, logo placement, what image to use">${esc(p.notes)}</textarea></label>
  </form>`, `${isNew ? "" : `<button class="btn ghost" type="button" id="tpDel" style="margin-right:auto">${I.trash}Delete</button>`}<button class="btn ghost" type="button" id="tpCancel">Cancel</button><button class="btn primary" type="submit" form="tpForm">Save</button>`, () => {
    document.getElementById("tpCancel").onclick = closeDialog;
    const del = document.getElementById("tpDel"); if (del) del.onclick = () => confirmBox(`Delete the template "${p.name}"?`, () => deleteDoc("templates", t.id));
    document.getElementById("tpForm").onsubmit = async e => {
      e.preventDefault(); const d = formData(e.target); delete d.plat;
      d.platforms = [...e.target.querySelectorAll('input[name="plat"]:checked')].map(x => x.value);
      d.name = d.name.trim(); if (!d.name) return; closeDialog();
      if (isNew) await addDoc("templates", d); else await updateDoc("templates", t.id, d);
      toast("Template saved");
    };
  });
}

export function bindTemplates(v, r, render) {
  const find = id => S.templates.find(t => t.id === id);
  v.querySelector("#newTpl")?.addEventListener("click", () => templateForm());
  v.querySelector("#newTpl2")?.addEventListener("click", () => templateForm());
  v.querySelector("#seedTpl")?.addEventListener("click", async e => { e.target.disabled = true; for (const t of STARTERS) await addDoc("templates", { ...t }); toast("Starter templates added. Edit them to fit."); });
  v.querySelectorAll("[data-tplf]").forEach(b => b.onclick = () => { S.ui.tplFilter = b.dataset.tplf; render(); });
  v.querySelectorAll("[data-tplcopy]").forEach(b => b.onclick = () => copyText(find(b.dataset.tplcopy)?.caption || "", "Caption copied"));
  v.querySelectorAll("[data-tpledit]").forEach(b => b.onclick = () => templateForm(find(b.dataset.tpledit)));
  v.querySelectorAll("[data-tpluse]").forEach(b => b.onclick = () => { const t = find(b.dataset.tpluse); if (!t) return; postForm(null, { clientId: OWN, title: t.name, type: t.kind === "Ad" ? "Ad creative" : t.kind === "Story or Reel" ? "Reel" : "Post", caption: t.caption || "", link: t.link || "", notes: t.notes ? "Template notes: " + t.notes : "", platforms: (t.platforms || []).length ? t.platforms : [...MAIN_PLATFORMS] }); });
}
