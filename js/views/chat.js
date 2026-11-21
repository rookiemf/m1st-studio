// Chat: a few simple channels for the two of you.
import { esc, I, head, empty, toast } from "../util.js";
import { S, addDoc, deleteDoc, myEmail, isOwner, nameOf, colorOf } from "../data.js";
import { confirmBox } from "../ui.js";

export const CHANNELS = ["General", "Job leads", "Projects", "Ideas"];
const seenKey = () => "fhq-chat-seen-" + myEmail();
const getSeen = () => { try { return JSON.parse(localStorage.getItem(seenKey()) || "{}"); } catch (e) { return {}; } };
const setSeen = ch => { try { const s = getSeen(); s[ch] = new Date().toISOString(); localStorage.setItem(seenKey(), JSON.stringify(s)); } catch (e) {} };
const unreadIn = ch => { const seen = getSeen()[ch] || ""; return S.chat.filter(m => (m.channel || "General") === ch && m.createdByEmail !== myEmail() && (m.createdAt || "") > seen).length; };
export const chatUnread = () => CHANNELS.reduce((n, ch) => n + unreadIn(ch), 0);

const pad = n => String(n).padStart(2, "0");
const timeOf = iso => { const d = new Date(iso); const h = d.getHours(); return `${((h + 11) % 12) + 1}:${pad(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`; };
const dayOf = iso => { const d = new Date(iso), n = new Date(); const same = (a, b) => a.toDateString() === b.toDateString(); const y = new Date(n); y.setDate(n.getDate() - 1); return same(d, n) ? "Today" : same(d, y) ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); };
// Turn links into clickable links, safely.
const linkify = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);

export function chat() {
  const ch = CHANNELS.includes(S.ui.chatChannel) ? S.ui.chatChannel : "General";
  const msgs = S.chat.filter(m => (m.channel || "General") === ch).sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  let lastDay = "", lastWho = "";
  const body = msgs.map(m => {
    const name = nameOf(m.createdByEmail) || "Someone", mine = m.createdByEmail === myEmail();
    const day = dayOf(m.createdAt), newDay = day !== lastDay, grouped = !newDay && lastWho === m.createdByEmail;
    lastDay = day; lastWho = m.createdByEmail;
    return `${newDay ? `<div class="cday"><span>${esc(day)}</span></div>` : ""}<div class="cmsg${mine ? " mine" : ""}${grouped ? " grouped" : ""}">
      ${grouped ? '<span class="cav"></span>' : `<span class="cav"><span class="avatar" style="background:${esc(colorOf(m.createdByEmail))}">${esc(name[0].toUpperCase())}</span></span>`}
      <div class="cbody">${grouped ? "" : `<div class="cwho"><b>${esc(name.split(" ")[0])}</b><span>${esc(timeOf(m.createdAt))}</span></div>`}<div class="ctext">${linkify(m.text || "")}</div></div>
      ${mine || isOwner() ? `<button class="cdel" data-cdel="${esc(m.id)}" aria-label="Delete message">${I.trash}</button>` : ""}</div>`;
  }).join("");
  return head("Chat", "Notes, job leads and ideas for each other.") + `
  <div class="chatwrap panel">
    <nav class="chans" aria-label="Channels">${CHANNELS.map(c => { const n = c === ch ? 0 : unreadIn(c); return `<button type="button" data-chan="${esc(c)}" aria-pressed="${c === ch}"><span># ${esc(c)}</span>${n ? `<span class="badge hot">${n}</span>` : ""}</button>`; }).join("")}</nav>
    <div class="chatmain">
      <div class="clog" id="clog" aria-live="polite">${body || empty("chat", `Nothing in #${ch} yet`, "Start the conversation. You can both read and reply here.")}</div>
      <form class="cform" id="cform"><textarea id="cinput" data-live="1" rows="1" maxlength="2000" placeholder="Message #${esc(ch)}" aria-label="Message">${esc(S.ui.chatDraft)}</textarea><button class="btn primary" type="submit" aria-label="Send">${I.send}<span>Send</span></button></form>
    </div>
  </div>
  <p class="inline-note">Press Enter to send, Shift+Enter for a new line. The newest 300 messages are shown. For files, paste a Google Drive link.</p>`;
}

export function bindChat(v, r, render) {
  const ch = CHANNELS.includes(S.ui.chatChannel) ? S.ui.chatChannel : "General";
  setSeen(ch);
  const log = v.querySelector("#clog"); if (log) log.scrollTop = log.scrollHeight;
  v.querySelectorAll("[data-chan]").forEach(b => b.onclick = () => { S.ui.chatChannel = b.dataset.chan; S.ui.chatDraft = ""; render(); });
  v.querySelectorAll("[data-cdel]").forEach(b => b.onclick = () => confirmBox("Delete this message for everyone?", () => deleteDoc("chat", b.dataset.cdel)));
  const input = v.querySelector("#cinput"), form = v.querySelector("#cform");
  const send = async () => {
    const text = input.value.trim(); if (!text) return;
    input.value = ""; S.ui.chatDraft = "";
    const id = await addDoc("chat", { channel: ch, text, name: nameOf(myEmail()) });
    if (!id) { input.value = text; S.ui.chatDraft = text; toast("Message not sent. Try again."); }
  };
  input.oninput = () => { S.ui.chatDraft = input.value; };
  input.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
  form.onsubmit = e => { e.preventDefault(); send(); input.focus(); };
}
