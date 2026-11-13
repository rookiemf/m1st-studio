// Meetings: schedule calls with clients, leads and the team. Uses free Google links:
// meet.google.com/new for instant calls, and a pre-filled Google Calendar event (add Meet there) for scheduled ones.
import { esc, I, fmt, fmtLong, today, addDays, parse, head, empty, cnt, toast, opts, isUrl } from "../util.js";
import { S, addDoc, updateDoc, deleteDoc, member, memberName, client, clientName, sortedTeam, myEmail, isTeam } from "../data.js";
import { avatar, avatarStack, openDialog, closeDialog, confirmBox, copyText, formData } from "../ui.js";

export const MEET_TYPES = ["Discovery call", "Client check-in", "Team meeting", "Shoot planning", "Other"];
const NEW_MEET = "https://meet.google.com/new";
const pad = n => String(n).padStart(2, "0");

function calStamp(date, time, addMin = 0) {
  const [y, m, d] = date.split("-").map(Number); const [hh, mm] = (time || "09:00").split(":").map(Number);
  const t = new Date(y, m - 1, d, hh, mm + addMin);
  return `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}T${pad(t.getHours())}${pad(t.getMinutes())}00`;
}
export function calendarLink(mt) {
  const emails = [...(mt.attendeeIds || []).map(id => member(id)?.email).filter(Boolean), ...String(mt.guests || "").split(/[,\s]+/).filter(x => x.includes("@"))];
  const details = [mt.agenda ? "Agenda:\n" + mt.agenda : "", mt.clientId ? "Client: " + clientName(mt.clientId) : "", "Planned in M1st Studio"].filter(Boolean).join("\n\n");
  const q = new URLSearchParams({ action: "TEMPLATE", text: mt.title, dates: `${calStamp(mt.date, mt.time)}/${calStamp(mt.date, mt.time, +mt.duration || 30)}`, ctz: "Asia/Manila", details });
  if (emails.length) q.set("add", [...new Set(emails)].join(","));
  return "https://calendar.google.com/calendar/render?" + q.toString();
}
const when = mt => `${mt.date || ""}T${mt.time || "00:00"}`;
const nowKey = () => { const n = new Date(); return `${today()}T${pad(n.getHours())}:${pad(n.getMinutes())}`; };
const timeLabel = t => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; };
const typePill = t => `<span class="pill ${({ "Discovery call": "brand", "Client check-in": "dark", "Team meeting": "", "Shoot planning": "warn" })[t] || "muted"}">${esc(t)}</span>`;

export function meetingCard(mt, { client: forClient = false } = {}) {
  const past = when(mt) < nowKey().slice(0, 10) + "T00:00" || mt.status === "Done";
  const lead = S.leads.find(l => l.id === mt.leadId);
  return `<article class="mcard${mt.status === "Cancelled" ? " cancelled" : ""}">
    <div class="mtime"><b>${esc(timeLabel(mt.time))}</b><span>${esc(mt.duration || 30)} min</span></div>
    <div class="mbody"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span style="font-weight:600;font-size:15.5px">${esc(mt.title)}</span>${forClient ? "" : typePill(mt.type)}${mt.status === "Cancelled" ? '<span class="pill muted">Cancelled</span>' : mt.status === "Done" ? '<span class="pill ok">Done</span>' : ""}</div>
      <div class="m" style="display:flex;flex-wrap:wrap;gap:4px 12px;font-size:13px;color:var(--grey-600);margin-top:3px">${fmtLong(mt.date) ? `<span>${esc(fmtLong(mt.date))}</span>` : ""}${mt.clientId && !forClient ? `<span>${esc(clientName(mt.clientId))}</span>` : ""}${lead && !forClient ? `<span>${esc(lead.business)}</span>` : ""}</div>
      ${(mt.attendeeIds || []).length ? `<div style="display:flex;align-items:center;gap:8px;margin-top:6px">${avatarStack(mt.attendeeIds)}<span class="inline-note">${(mt.attendeeIds || []).map(memberName).filter(Boolean).map(n => esc(n.split(" ")[0])).join(", ")}</span></div>` : ""}
      ${mt.agenda ? `<div style="font-size:13.5px;margin-top:6px;white-space:pre-wrap">${esc(mt.agenda)}</div>` : ""}
      ${mt.notes && !forClient ? `<div class="banner" style="margin:8px 0 0;background:#F3F1F1;border-color:var(--line);color:var(--ink);white-space:pre-wrap"><b>Notes:</b> ${esc(mt.notes)}</div>` : ""}
      <div class="actions" style="margin-top:10px">
        ${mt.status !== "Cancelled" && !past ? (isUrl(mt.meetLink) ? `<a class="btn primary sm" href="${esc(mt.meetLink)}" target="_blank" rel="noopener">${I.eye}Join Google Meet</a>` : forClient ? `<span class="inline-note">The meeting link will appear here.</span>` : `<a class="btn ghost sm" href="${esc(calendarLink(mt))}" target="_blank" rel="noopener">${I.cal}Add to Google Calendar</a><button class="btn ghost sm" data-meetlink="${esc(mt.id)}">${I.link}Paste Meet link</button>`) : ""}
        ${!forClient && isUrl(mt.meetLink) ? `<button class="btn ghost sm icon" data-copymeet="${esc(mt.id)}" aria-label="Copy meeting link">${I.copy}</button>` : ""}
        ${!forClient ? `<button class="btn ghost sm" data-editmeet="${esc(mt.id)}">${I.edit}${past && !mt.notes ? "Add notes" : "Edit"}</button>` : ""}
      </div></div>
  </article>`;
}

export function meetings() {
  const f = S.ui.meetFilter, nk = nowKey(), t = today();
  const all = S.meetings.slice().sort((a, b) => when(a).localeCompare(when(b)));
  const upcoming = all.filter(m => m.date >= t && m.status !== "Done" && m.status !== "Cancelled");
  const past = all.filter(m => m.date < t || m.status === "Done").reverse();
  let L = f === "past" ? past : f === "mine" ? upcoming.filter(m => (m.attendeeIds || []).includes(S.me)) : upcoming;
  const ws = addDays(t, -((parse(t).getDay() + 6) % 7)), we = addDays(ws, 6);
  const todayN = upcoming.filter(m => m.date === t).length;
  const weekN = all.filter(m => m.date >= ws && m.date <= we && m.status !== "Cancelled").length;
  const clientN = upcoming.filter(m => m.clientId || m.leadId).length;
  const noNotes = past.filter(m => m.status !== "Cancelled" && !m.notes).length;
  const days = [...new Set(L.map(m => m.date))];
  return head("Meetings", "Calls with clients, leads and the team, on Google Meet.", `<a class="btn ghost" href="${NEW_MEET}" target="_blank" rel="noopener">${I.eye}Start a Meet now</a><button class="btn primary" id="newMeet">${I.plus}Schedule a meeting</button>`) + `
  <div class="kpis">
    <div class="kpi hero"><div class="lbl">${I.clock}Today</div><div class="val">${cnt(todayN)}</div><div class="sub">${todayN ? "meeting" + (todayN === 1 ? "" : "s") + " left today" : "No meetings today"}</div></div>
    <div class="kpi"><div class="lbl">${I.cal}This week</div><div class="val">${cnt(weekN)}</div><div class="sub">Scheduled or done</div></div>
    <div class="kpi"><div class="lbl">${I.users}With clients and leads</div><div class="val">${cnt(clientN)}</div><div class="sub">Coming up</div></div>
    <div class="kpi${noNotes ? " attn" : ""}"><div class="lbl">${I.doc}Missing notes</div><div class="val">${cnt(noNotes)}</div><div class="sub">${noNotes ? "Past meetings with no notes" : "All written up"}</div></div>
  </div>
  <div class="toolbar" style="padding:0 0 14px;border:none"><div class="seg" role="group" aria-label="Show">${[["upcoming", "Upcoming"], ["mine", "Mine"], ["past", "Past"]].map(([k, l]) => `<button type="button" data-mf2="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div></div>
  ${L.length ? days.map(d => `<section class="panel" style="margin-bottom:12px"><header><h2>${d === t ? "Today" : d === addDays(t, 1) ? "Tomorrow" : esc(fmtLong(d))}</h2><span class="count">${L.filter(m => m.date === d).length}</span></header><div class="mlist">${L.filter(m => m.date === d).map(m => meetingCard(m)).join("")}</div></section>`).join("")
  : `<section class="panel">${empty("cal", f === "past" ? "No past meetings yet" : "Nothing scheduled", "Schedule a meeting, add it to Google Calendar, and turn on Google Meet there. Everyone you invite gets the link.", f === "past" ? "" : `<button class="btn primary sm" id="newMeet2">${I.plus}Schedule a meeting</button>`)}</section>`}
  <p class="inline-note">How it works: after you save, tap <b>Add to Google Calendar</b>. In Google Calendar, click <b>Add Google Meet video conferencing</b> and save. Then copy the Meet link and paste it back here so the client sees a Join button in their portal.</p>`;
}

export function meetingForm(mt, prefill = {}) {
  const isNew = !mt; const p = mt || { type: MEET_TYPES[0], date: today(), time: "10:00", duration: 30, attendeeIds: S.me ? [S.me] : [], status: "Scheduled", ...prefill };
  const leads = S.leads.filter(l => l.status !== "Lost").sort((a, b) => (a.business || "").localeCompare(b.business || ""));
  openDialog(isNew ? "Schedule a meeting" : "Meeting", `<form class="form db" id="mtForm">
    <label class="field" for="mt-title">Title<input id="mt-title" name="title" required autocomplete="off" value="${esc(p.title)}" placeholder="e.g. Discovery call with Bright Spark"></label>
    <div class="frow"><label class="field" for="mt-type">Type<select id="mt-type" name="type">${opts(MEET_TYPES, p.type)}</select></label><label class="field" for="mt-status">Status<select id="mt-status" name="status">${opts(["Scheduled", "Done", "Cancelled"], p.status)}</select></label></div>
    <div class="frow"><label class="field" for="mt-date">Date<input id="mt-date" type="date" name="date" required value="${esc(p.date)}"></label><label class="field" for="mt-time">Time (Philippine time)<input id="mt-time" type="time" name="time" required value="${esc(p.time)}"></label><label class="field" for="mt-dur">Minutes<input id="mt-dur" type="number" min="5" step="5" name="duration" value="${esc(p.duration)}"></label></div>
    <div class="frow"><label class="field" for="mt-client">Client<select id="mt-client" name="clientId"><option value="">None</option>${S.clients.map(c => `<option value="${esc(c.id)}"${c.id === p.clientId ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label><label class="field" for="mt-lead">Or a lead<select id="mt-lead" name="leadId"><option value="">None</option>${leads.map(l => `<option value="${esc(l.id)}"${l.id === p.leadId ? " selected" : ""}>${esc(l.business)}</option>`).join("")}</select></label></div>
    <fieldset style="border:none;padding:0;margin:0"><legend class="field" style="margin-bottom:6px">Team joining</legend><div class="checks">${sortedTeam().map(m => `<label><input type="checkbox" name="att" value="${esc(m.id)}"${(p.attendeeIds || []).includes(m.id) ? " checked" : ""}>${esc(m.name)}</label>`).join("")}</div></fieldset>
    <label class="field" for="mt-guests">Guest emails (client or lead, comma separated)<input id="mt-guests" name="guests" autocomplete="off" value="${esc(p.guests)}" placeholder="owner@business.com"></label>
    <label class="field" for="mt-link">Google Meet link<input id="mt-link" name="meetLink" type="url" autocomplete="off" value="${esc(p.meetLink)}" placeholder="https://meet.google.com/abc-defg-hij"></label>
    <label class="field" for="mt-agenda">Agenda<textarea id="mt-agenda" name="agenda" rows="3">${esc(p.agenda)}</textarea></label>
    <label class="field" for="mt-notes">Notes after the call (team only)<textarea id="mt-notes" name="notes" rows="3" placeholder="What was decided, next steps">${esc(p.notes)}</textarea></label>
  </form>`, `${isNew ? "" : `<button class="btn ghost" type="button" id="mtDel" style="margin-right:auto">${I.trash}Delete</button>`}<button class="btn ghost" type="button" id="mtCancel">Cancel</button><button class="btn primary" type="submit" form="mtForm">${isNew ? "Save meeting" : "Save"}</button>`, () => {
    document.getElementById("mtCancel").onclick = closeDialog;
    const del = document.getElementById("mtDel"); if (del) del.onclick = () => confirmBox(`Delete "${p.title}"?`, () => deleteDoc("meetings", mt.id));
    document.getElementById("mtForm").onsubmit = async e => {
      e.preventDefault(); const d = formData(e.target); delete d.att;
      d.attendeeIds = [...e.target.querySelectorAll('input[name="att"]:checked')].map(x => x.value);
      d.duration = +d.duration || 30; d.title = d.title.trim(); if (!d.title) return;
      closeDialog();
      if (isNew) {
        const id = await addDoc("meetings", d);
        if (id && !d.meetLink) openDialog("Meeting saved", `<div class="db"><p style="margin:0 0 12px">Next, add it to Google Calendar so everyone gets an invite. In Calendar, click <b>Add Google Meet video conferencing</b>, then save.</p><a class="btn primary" href="${esc(calendarLink(d))}" target="_blank" rel="noopener">${I.cal}Open in Google Calendar</a></div>`, `<button class="btn ghost" id="mtDone">Done</button>`, () => { document.getElementById("mtDone").onclick = closeDialog; });
        else toast("Meeting saved");
      } else { await updateDoc("meetings", mt.id, d); toast("Saved"); }
    };
  });
}
function pasteLink(mt) {
  openDialog("Paste the Google Meet link", `<form class="form db" id="plForm"><p class="inline-note" style="margin:0">Open the event in Google Calendar and copy the "Join with Google Meet" link.</p><label class="field" for="pl-url">Meet link<input id="pl-url" name="meetLink" type="url" required placeholder="https://meet.google.com/abc-defg-hij"></label></form>`,
    `<button class="btn ghost" type="button" id="plCancel">Cancel</button><button class="btn primary" type="submit" form="plForm">Save</button>`, () => {
      document.getElementById("plCancel").onclick = closeDialog;
      document.getElementById("plForm").onsubmit = async e => { e.preventDefault(); const v = new FormData(e.target).get("meetLink"); closeDialog(); await updateDoc("meetings", mt.id, { meetLink: v }); toast("Join button is ready"); };
    });
}
export function bindMeetingButtons(v) {
  v.querySelectorAll("[data-editmeet]").forEach(b => b.onclick = () => meetingForm(S.meetings.find(m => m.id === b.dataset.editmeet)));
  v.querySelectorAll("[data-meetlink]").forEach(b => b.onclick = () => pasteLink(S.meetings.find(m => m.id === b.dataset.meetlink)));
  v.querySelectorAll("[data-copymeet]").forEach(b => b.onclick = () => copyText(S.meetings.find(m => m.id === b.dataset.copymeet)?.meetLink || "", "Meet link copied"));
}
export function bindMeetings(v, r, render) {
  v.querySelector("#newMeet")?.addEventListener("click", () => meetingForm());
  v.querySelector("#newMeet2")?.addEventListener("click", () => meetingForm());
  v.querySelectorAll("[data-mf2]").forEach(b => b.onclick = () => { S.ui.meetFilter = b.dataset.mf2; render(); });
  bindMeetingButtons(v);
}
