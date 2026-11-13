// Local shoots: photography, videography and filmmaking bookings for clients in Eastern Samar.
import { esc, I, fmt, fmtLong, today, addDays, monthStart, parse, head, empty, cnt, toast, opts } from "../util.js";
import { S, addDoc, updateDoc, deleteDoc, member, memberName, sortedTeam } from "../data.js";
import { SERVICES, EVENT_TYPES, BOOKING_STATUS, LOCAL_REPLIES, peso } from "../content.js";
import { avatar, avatarStack, openDialog, closeDialog, confirmBox, copyText, teamOptions, formData, monthCalendar } from "../ui.js";
import { gearName, shootsUsing } from "./gear.js";

const statusPill = s => `<span class="pill ${({ Inquiry: "muted", Booked: "brand", Shot: "dark", Editing: "warn", Delivered: "ok", Cancelled: "muted" })[s] || ""}">${esc(s)}</span>`;
const balance = b => b.balancePaid ? 0 : Math.max(0, (+b.price || 0) - (b.depositPaid ? (+b.deposit || 0) : 0));
const paid = b => b.balancePaid ? (+b.price || 0) : (b.depositPaid ? (+b.deposit || 0) : 0);
const tabs = r => `<nav class="subtabs" aria-label="Local shoot views">${[["local", "Shoots"], ["local-calendar", "Shoot calendar"], ["local-replies", "Quick replies"]].map(([k, l]) => `<a href="#${k}"${r === k ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>`;

export function local(r) {
  const body = r === "local-calendar" ? shootCalendar() : r === "local-replies" ? replies() : board();
  return head("Local shoots", "Photography, videography and filmmaking for clients here at home.", `<button class="btn primary" id="addBooking">${I.plus}Add a booking</button>`) + tabs(r) + body;
}

function board() {
  const t = today(), ms = monthStart(0), me = addDays(monthStart(1), -1);
  const live = S.bookings.filter(b => b.status !== "Cancelled");
  const upcoming = live.filter(b => b.date >= t && (b.status === "Booked" || b.status === "Inquiry")).length;
  const month = live.filter(b => b.date >= ms && b.date <= me && b.status !== "Inquiry");
  const bookedAmt = month.reduce((n, b) => n + (+b.price || 0), 0);
  const collected = live.reduce((n, b) => n + paid(b), 0);
  const owed = live.filter(b => b.status !== "Inquiry").reduce((n, b) => n + balance(b), 0);
  const editing = live.filter(b => b.status === "Shot" || b.status === "Editing");
  const lateDelivery = editing.filter(b => b.deliveryDue && b.deliveryDue < t).length;
  const f = S.ui.localFilter;
  let L = S.bookings.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (f === "upcoming") L = L.filter(b => b.date >= t && b.status !== "Cancelled" && b.status !== "Delivered");
  else if (f) L = L.filter(b => b.status === f);
  const clashes = b => (b.gearIds || []).filter(g => shootsUsing(g, b.date).some(o => o.id !== b.id)).map(gearName);
  return `
  <div class="kpis">
    <div class="kpi"><div class="lbl">${I.cal}Upcoming shoots</div><div class="val">${cnt(upcoming)}</div><div class="sub">Booked or still inquiring</div></div>
    <div class="kpi hero"><div class="lbl">${I.bag}Booked this month</div><div class="val">${cnt(bookedAmt, "₱")}</div><div class="sub">${month.length} shoot${month.length === 1 ? "" : "s"}</div></div>
    <div class="kpi"><div class="lbl">${I.check}Collected</div><div class="val">${cnt(collected, "₱")}</div><div class="sub">Deposits and balances paid</div></div>
    <div class="kpi${owed ? " attn" : ""}"><div class="lbl">${I.clock}Still to collect</div><div class="val">${cnt(owed, "₱")}</div><div class="sub">Across booked shoots</div></div>
    <div class="kpi${lateDelivery ? " attn" : ""}"><div class="lbl">${I.edit}Being edited</div><div class="val">${cnt(editing.length)}</div><div class="sub">${lateDelivery ? `${lateDelivery} past the delivery date` : "On schedule"}</div></div>
  </div>
  <section class="panel">
    <div class="toolbar"><div class="seg" role="group" aria-label="Show">${[["", "All"], ["upcoming", "Upcoming"], ...BOOKING_STATUS.map(s => [s, s])].map(([k, l]) => `<button type="button" data-lf="${esc(k)}" aria-pressed="${f === k}">${esc(l)}</button>`).join("")}</div></div>
    ${L.length ? `<div class="tablebox"><table class="resp"><thead><tr><th>Client and event</th><th>Date</th><th>Crew</th><th>Price</th><th>Payment</th><th>Status</th><th class="right"><span class="hidden">Open</span></th></tr></thead><tbody>
    ${L.map(b => { const cl = clashes(b); const lead = member(b.leadId); return `<tr>
      <td class="c-main"><div class="t">${esc(b.clientName)}</div><div class="s">${esc(b.service)} · ${esc(b.eventType)}${b.location ? " · " + esc(b.location) : ""}</div>${cl.length ? `<span class="pill bad" style="margin-top:4px">Gear clash: ${esc(cl.join(", "))}</span>` : ""}</td>
      <td class="num" style="white-space:nowrap">${fmt(b.date)}${b.time ? `<div class="s">${esc(b.time)}</div>` : ""}</td>
      <td class="c-hide">${lead ? `<span style="display:inline-flex;align-items:center;gap:6px">${avatar(lead, "sm")}${esc(lead.name.split(" ")[0])}</span> ` : ""}${avatarStack((b.crewIds || []).filter(id => id !== b.leadId))}</td>
      <td class="num">${b.price ? peso(b.price) : "–"}</td>
      <td class="c-hide">${b.status === "Inquiry" ? '<span class="s">Not booked yet</span>' : b.balancePaid ? '<span class="pill ok">Paid in full</span>' : b.depositPaid ? `<span class="pill warn">${peso(balance(b))} left</span>` : '<span class="pill bad">No deposit yet</span>'}</td>
      <td>${statusPill(b.status)}</td>
      <td class="right"><button class="btn ghost sm" data-booking="${esc(b.id)}">${I.edit}Open</button></td></tr>`; }).join("")}</tbody></table></div>`
    : S.bookings.length ? empty("search", "Nothing here", "Try another filter.") : empty("cal", "No bookings yet", "Add inquiries as they come in, then update them as they're booked, shot, edited and delivered.", `<button class="btn primary sm" id="addBooking2">${I.plus}Add a booking</button>`)}
  </section>`;
}

function shootCalendar() {
  const off = S.ui.localMonth;
  const items = [];
  S.bookings.filter(b => b.status !== "Cancelled").forEach(b => {
    items.push({ id: b.id, due: b.date, title: `${b.clientName} · ${b.eventType}`, _attr: `data-booking="${esc(b.id)}"`, _cls: b.status === "Inquiry" ? "s-done" : "own" });
    if (b.deliveryDue && b.status !== "Delivered") items.push({ id: b.id + "-d", due: b.deliveryDue, title: `Deliver: ${b.clientName}`, _attr: `data-booking="${esc(b.id)}"`, _cls: "s-review" });
  });
  const label = parse(monthStart(off)).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const ms = monthStart(off), me = addDays(monthStart(off + 1), -1);
  const list = items.filter(i => i.due >= ms && i.due <= me).sort((a, b) => a.due.localeCompare(b.due));
  return `<section class="panel"><div class="toolbar"><button class="btn ghost sm icon" id="lmPrev" aria-label="Previous month">${I.left}</button><button class="btn ghost sm icon" id="lmNext" aria-label="Next month">${I.right}</button><strong style="font-size:15px">${esc(label)}</strong>${off ? `<button class="btn ghost sm" id="lmToday">This month</button>` : ""}</div>
    ${monthCalendar(items, off)}
    <div class="only-mobile">${list.length ? `<div class="body">${list.map(i => `<div class="rowitem"><div class="main"><div class="t"><a href="#" ${i._attr} style="color:inherit">${esc(i.title)}</a></div><div class="m"><span>${fmtLong(i.due)}</span></div></div></div>`).join("")}</div>` : `<div class="body">${empty("cal", "Nothing this month", "")}</div>`}</div>
    <div class="legend"><span><i class="dot own"></i>Shoot</span><span><i class="dot"></i>Inquiry, not booked yet</span><span style="color:var(--warn)">Orange outline: delivery due</span></div></section>`;
}

function fillReply(tpl, b) {
  const price = +b?.price || 0, dep = +b?.deposit || 0;
  const v = { name: b?.contactName || b?.clientName || "[name]", service: (b?.service || "[service]").toLowerCase(), event: (b?.eventType || "[event]").toLowerCase(), date: b?.date ? fmtLong(b.date) : "[date]", price: price ? peso(price) : "[price]", deposit: dep ? peso(dep) : "[reservation fee]", balance: price ? peso(Math.max(0, price - dep)) : "[balance]", location: b?.location || "[venue]" };
  return tpl.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
}
function replies() {
  const u = S.ui, b = S.bookings.find(x => x.id === u.replyBooking);
  const text = fillReply(LOCAL_REPLIES[u.replyKey][u.replyLang], b);
  return `<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin-bottom:16px">
      <div class="seg" role="group" aria-label="Message">${Object.keys(LOCAL_REPLIES).map(k => `<button type="button" data-rk="${esc(k)}" aria-pressed="${k === u.replyKey}">${esc(k)}</button>`).join("")}</div></div>
    <div class="cols" style="grid-template-columns:minmax(260px,1fr) minmax(0,2fr);align-items:start">
      <section class="panel"><header><h2>Fill in from a booking</h2></header><div class="body" style="padding-top:14px"><div class="form">
        <label class="field" for="rbk">Booking<select id="rbk"><option value="">None (leave blanks)</option>${S.bookings.slice().sort((a, x) => (x.date || "").localeCompare(a.date || "")).map(x => `<option value="${esc(x.id)}"${x.id === u.replyBooking ? " selected" : ""}>${esc(x.clientName)} · ${fmt(x.date)}</option>`).join("")}</select></label>
        <div class="seg" role="group" aria-label="Language"><button type="button" data-rl="en" aria-pressed="${u.replyLang === "en"}">English</button><button type="button" data-rl="fil" aria-pressed="${u.replyLang === "fil"}">Filipino</button></div>
        <p class="inline-note" style="margin:0">Blanks in [brackets] still need to be filled in by hand.</p></div></div></section>
      <section class="panel"><header><h2>${esc(u.replyKey)}</h2><button class="btn primary sm" id="copyReply">${I.copy}Copy</button></header><div class="body" style="padding-top:14px"><div class="tpl" id="replyText">${esc(text)}</div></div></section>
    </div>`;
}

export function bookingForm(bk, prefill = {}) {
  const isNew = !bk; const b = bk || { service: SERVICES[0], eventType: EVENT_TYPES[0], status: "Inquiry", date: today(), leadId: S.me || "", crewIds: [], gearIds: [], ...prefill };
  const gear = S.gear.slice().sort((a, x) => (a.name || "").localeCompare(x.name || ""));
  openDialog(isNew ? "Add a booking" : `${b.clientName}`, `<form class="form db" id="bkForm">
    <div class="frow"><label class="field" for="bk-client">Client name<input id="bk-client" name="clientName" required autocomplete="off" value="${esc(b.clientName)}" placeholder="e.g. Santos family"></label><label class="field" for="bk-contact">Contact person<input id="bk-contact" name="contactName" autocomplete="off" value="${esc(b.contactName)}"></label></div>
    <label class="field" for="bk-reach">Phone, Messenger or Facebook link<input id="bk-reach" name="contact" autocomplete="off" value="${esc(b.contact)}"></label>
    <div class="frow"><label class="field" for="bk-svc">Service<select id="bk-svc" name="service">${opts(SERVICES, b.service)}</select></label><label class="field" for="bk-ev">Event<select id="bk-ev" name="eventType">${opts(EVENT_TYPES, b.eventType)}</select></label></div>
    <div class="frow"><label class="field" for="bk-date">Shoot date<input id="bk-date" type="date" name="date" required value="${esc(b.date)}"></label><label class="field" for="bk-time">Time<input id="bk-time" name="time" autocomplete="off" value="${esc(b.time)}" placeholder="e.g. 2:00–8:00 PM"></label><label class="field" for="bk-loc">Venue<input id="bk-loc" name="location" autocomplete="off" value="${esc(b.location)}" placeholder="e.g. Borongan City"></label></div>
    <div class="frow"><label class="field" for="bk-price">Total price (₱)<input id="bk-price" type="number" min="0" step="100" name="price" value="${esc(b.price)}"></label><label class="field" for="bk-dep">Reservation fee (₱)<input id="bk-dep" type="number" min="0" step="100" name="deposit" value="${esc(b.deposit)}"></label></div>
    <div class="checks"><label><input type="checkbox" name="depositPaid"${b.depositPaid ? " checked" : ""}>Reservation fee paid</label><label><input type="checkbox" name="balancePaid"${b.balancePaid ? " checked" : ""}>Balance paid</label></div>
    <div class="frow"><label class="field" for="bk-lead">In charge<select id="bk-lead" name="leadId">${teamOptions(b.leadId, "Not set")}</select></label><label class="field" for="bk-status">Status<select id="bk-status" name="status">${opts(BOOKING_STATUS, b.status)}</select></label><label class="field" for="bk-due">Deliver by<input id="bk-due" type="date" name="deliveryDue" value="${esc(b.deliveryDue)}"></label></div>
    <fieldset style="border:none;padding:0;margin:0"><legend class="field" style="margin-bottom:6px">Crew</legend>${S.team.length ? `<div class="checks">${sortedTeam().map(m => `<label><input type="checkbox" name="crew" value="${esc(m.id)}"${(b.crewIds || []).includes(m.id) ? " checked" : ""}>${esc(m.name)}</label>`).join("")}</div>` : '<p class="inline-note" style="margin:0">Add the team on the Team page first.</p>'}</fieldset>
    <fieldset style="border:none;padding:0;margin:0"><legend class="field" style="margin-bottom:6px">Gear to bring</legend>${gear.length ? `<div class="checks" id="bkGear">${gear.map(g => `<label><input type="checkbox" name="gearpick" value="${esc(g.id)}"${(b.gearIds || []).includes(g.id) ? " checked" : ""}>${esc(g.name)}${g.repair ? " (needs repair)" : ""}</label>`).join("")}</div><div id="bkClash" class="banner hidden" style="margin:8px 0 0"></div>` : '<p class="inline-note" style="margin:0">Add your gear on the Equipment page first.</p>'}</fieldset>
    <label class="field" for="bk-deliv">What they get<input id="bk-deliv" name="deliverables" autocomplete="off" value="${esc(b.deliverables)}" placeholder="e.g. 200 edited photos and a 3-minute highlight video"></label>
    <label class="field" for="bk-notes">Notes<textarea id="bk-notes" name="notes" rows="2">${esc(b.notes)}</textarea></label>
  </form>`, `${isNew ? "" : `<button class="btn ghost" type="button" id="bkDel" style="margin-right:auto">${I.trash}Delete</button>`}<button class="btn ghost" type="button" id="bkCancel">Cancel</button><button class="btn primary" type="submit" form="bkForm">${isNew ? "Add booking" : "Save"}</button>`, () => {
    const f = document.getElementById("bkForm");
    document.getElementById("bkCancel").onclick = closeDialog;
    const del = document.getElementById("bkDel");
    if (del) del.onclick = () => confirmBox(`Delete the booking for ${b.clientName}?`, () => deleteDoc("bookings", bk.id));
    const checkClash = () => {
      const box = document.getElementById("bkClash"); if (!box) return;
      const date = f.elements.date.value;
      const picked = [...f.querySelectorAll('input[name="gearpick"]:checked')].map(x => x.value);
      const hits = picked.flatMap(id => shootsUsing(id, date).filter(o => !bk || o.id !== bk.id).map(o => `${gearName(id)} is already booked for ${o.clientName}`));
      box.textContent = hits.join(". "); box.classList.toggle("hidden", !hits.length);
    };
    f.addEventListener("change", checkClash); checkClash();
    f.onsubmit = async e => {
      e.preventDefault(); const d = formData(f); delete d.crew; delete d.gearpick;
      d.crewIds = [...f.querySelectorAll('input[name="crew"]:checked')].map(x => x.value);
      d.gearIds = [...f.querySelectorAll('input[name="gearpick"]:checked')].map(x => x.value);
      d.depositPaid = !!d.depositPaid; d.balancePaid = !!d.balancePaid;
      d.price = d.price ? +d.price : 0; d.deposit = d.deposit ? +d.deposit : 0;
      d.clientName = d.clientName.trim(); if (!d.clientName) return;
      closeDialog();
      if (isNew) { await addDoc("bookings", d); toast("Booking added"); } else { await updateDoc("bookings", bk.id, d); toast("Saved"); }
    };
  });
}

export function bindLocal(v, r, render) {
  v.querySelector("#addBooking")?.addEventListener("click", () => bookingForm());
  v.querySelector("#addBooking2")?.addEventListener("click", () => bookingForm());
  v.querySelectorAll("[data-lf]").forEach(b => b.onclick = () => { S.ui.localFilter = b.dataset.lf; render(); });
  v.querySelector("#lmPrev")?.addEventListener("click", () => { S.ui.localMonth--; render(); });
  v.querySelector("#lmNext")?.addEventListener("click", () => { S.ui.localMonth++; render(); });
  v.querySelector("#lmToday")?.addEventListener("click", () => { S.ui.localMonth = 0; render(); });
  v.querySelectorAll("[data-rk]").forEach(b => b.onclick = () => { S.ui.replyKey = b.dataset.rk; render(); });
  v.querySelectorAll("[data-rl]").forEach(b => b.onclick = () => { S.ui.replyLang = b.dataset.rl; render(); });
  v.querySelector("#rbk")?.addEventListener("change", e => { S.ui.replyBooking = e.target.value; e.target.blur(); render(); });
  v.querySelector("#copyReply")?.addEventListener("click", () => copyText(document.getElementById("replyText").textContent, "Copied. Paste it in Messenger."));
}
