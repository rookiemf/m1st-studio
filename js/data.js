// Data layer: who is signed in, what they may see, and live sync with Firestore.
import { banner, toast, addDays, today } from "./util.js";
import { OWN, FOLLOW_UP_DAYS } from "./content.js";
import { auth, fs, provider, OWNER_EMAILS, signInWithPopup, onAuthStateChanged, signOut, collection, query, where, onSnapshot, addDoc as fsAdd, updateDoc as fsUpdate, deleteDoc as fsDelete, doc, setDoc, getDoc } from "./firebase.js";

export const TEAM_COLLECTIONS = ["leads", "clients", "posts", "team", "calls", "socials", "messages", "bookings", "gear", "campaigns", "meetings", "access"];

export const S = {
  leads: [], clients: [], posts: [], team: [], calls: [], socials: [], messages: [], bookings: [], gear: [], campaigns: [], meetings: [], access: [],
  loaded: {}, user: null, role: "", clientId: "", authReady: false, denied: false,
  readOnly: false, assets: null, me: "",
  ui: {
    animate: true, dataAnimated: false,
    weekOffset: 0, monthOffset: 0, calView: "week", calClient: "", calPerson: "",
    clientMonth: 0, leadFilter: { niche: "", status: "", q: "" },
    portalClient: "", mkMonth: 0, reviewFilter: "review", msgFilter: "open", localMonth: 0, localFilter: "",
    replyKey: "Inquiry reply", replyLang: "en", replyBooking: "", meetFilter: "upcoming",
    script: "discovery", scriptLead: "", scriptBig: false, scriptChecks: {}
  }
};

let onChange = () => {};
export const setOnChange = fn => { onChange = fn; };
const email = () => (S.user?.email || "").toLowerCase();
export const isTeam = () => S.role === "admin" || S.role === "team";
export const isAdmin = () => S.role === "admin";

// ---------- sign in ----------
export async function signIn() {
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return;
    if (e?.code === "auth/popup-blocked") toast("Your browser blocked the sign-in window. Allow pop-ups for this site and try again.");
    else if (e?.code === "auth/unauthorized-domain") toast("This web address isn't allowed to sign in yet. Ask Bob to add it in Firebase.");
    else toast("Couldn't sign in. Please try again.");
  }
}
export async function signOutNow() { await signOut(auth); location.hash = ""; location.reload(); }

let unsubs = [];
function stopAll() { unsubs.forEach(u => { try { u(); } catch (e) {} }); unsubs = []; }

export function start() {
  onAuthStateChanged(auth, async user => {
    stopAll();
    S.user = user; S.role = ""; S.clientId = ""; S.denied = false; S.me = "";
    if (!user) { S.authReady = true; onChange(); return; }
    // Work out the role: owners are always admins; everyone else needs an access entry.
    if (OWNER_EMAILS.includes(email())) S.role = "admin";
    else {
      try {
        const snap = await getDoc(doc(fs, "access", email()));
        if (snap.exists()) { const a = snap.data(); S.role = a.role || ""; S.clientId = a.clientId || ""; }
      } catch (e) { /* no access */ }
    }
    if (!S.role || (S.role === "client" && !S.clientId)) { S.denied = true; S.authReady = true; onChange(); return; }
    S.authReady = true;
    subscribe();
    onChange();
  });
}

function watch(col, q) {
  S.loaded[col] = false;
  const u = onSnapshot(q, snap => {
    S[col] = snap.docs ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : (snap.exists() ? [{ id: snap.id, ...snap.data() }] : []);
    S.loaded[col] = true;
    if (col === "team") S.me = (S.team.find(m => (m.email || "").toLowerCase() === email()) || {}).id || "";
    if (Object.values(S.loaded).every(Boolean) && !S.ui.dataAnimated) { S.ui.dataAnimated = true; S.ui.animate = true; banner(""); }
    onChange();
  }, err => {
    S.loaded[col] = true;
    if (err?.code === "permission-denied") banner("Some data couldn't load because of your access level. Ask an admin if something is missing.");
    else banner("Lost the connection. Check your internet and refresh the page.");
    onChange();
  });
  unsubs.push(u);
}
function subscribe() {
  const timer = setTimeout(() => { if (!Object.values(S.loaded).every(Boolean)) banner("Still connecting. Your data may take a moment to appear."); }, 10000);
  unsubs.push(() => clearTimeout(timer));
  if (isTeam()) {
    TEAM_COLLECTIONS.forEach(col => watch(col, collection(fs, col)));
  } else {
    // Clients only ever load what belongs to them.
    watch("clients", doc(fs, "clients", S.clientId));
    watch("posts", query(collection(fs, "posts"), where("clientId", "==", S.clientId)));
    watch("meetings", query(collection(fs, "meetings"), where("clientId", "==", S.clientId)));
    watch("team", collection(fs, "team"));
  }
}

// ---------- writes ----------
const clean = o => JSON.parse(JSON.stringify(o)); // Firestore rejects undefined values
function writeError(e) {
  if (e?.code === "permission-denied") toast("You don't have permission to change that.");
  else if (e?.code === "resource-exhausted") toast("The free daily limit was reached. Try again tomorrow.");
  else toast("Couldn't save just now. Check your internet and try again.");
}
export async function addDoc(col, data) {
  data.createdAt = new Date().toISOString();
  if (S.me) data.createdBy = S.me;
  data.createdByEmail = email();
  try { const ref = await fsAdd(collection(fs, col), clean(data)); return ref.id; } catch (e) { writeError(e); return null; }
}
export async function updateDoc(col, id, patch) {
  patch.updatedAt = new Date().toISOString();
  try { await fsUpdate(doc(fs, col, id), clean(patch)); } catch (e) { writeError(e); }
}
export async function deleteDoc(col, id) {
  try { await fsDelete(doc(fs, col, id)); } catch (e) { writeError(e); }
}
export async function setAccess(addr, data) {
  try { await setDoc(doc(fs, "access", addr.toLowerCase().trim()), clean({ ...data, email: addr.toLowerCase().trim(), updatedAt: new Date().toISOString(), updatedBy: email() })); return true; }
  catch (e) { writeError(e); return false; }
}

// ---------- files ----------
// Firebase file storage needs a paid plan, so photos and drafts are shared as links (Google Drive, etc.).
export async function uploadPhoto() { toast("Paste a link to the photo instead (for example from Google Drive)."); return null; }
export async function uploadMedia() { toast("Paste a Google Drive link instead."); return null; }
export const photoUrl = v => !v ? "" : /^https?:\/\//i.test(v) ? driveImage(v) : "";
// Turn a Google Drive share link into a direct image link so it shows in the app.
export function driveImage(url) {
  const m = String(url).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000` : url;
}

// ---------- lookups ----------
export const setMe = () => {}; // identity now comes from the Google account
export const member = id => S.team.find(m => m.id === id);
export const memberName = id => member(id)?.name || "";
export const client = id => S.clients.find(c => c.id === id);
export const clientName = id => id === OWN ? "M1st (our page)" : (client(id)?.name || "Unknown client");
export const postWho = p => memberName(p.assigneeId) || p.assignee || "";
export const followDue = l => l.status === "Sent" && !l.followedUp && l.sentOn && addDays(l.sentOn, FOLLOW_UP_DAYS) <= today();
export const sortedTeam = () => S.team.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
export const myEmail = email;
