// Data layer: sign-in, who may use the workspace, and live sync with Firestore.
import { banner, toast, today } from "./util.js";
import { auth, fs, provider, OWNER_EMAIL, signInWithPopup, onAuthStateChanged, signOut, collection, query, orderBy, limitToLast, onSnapshot, addDoc as fsAdd, updateDoc as fsUpdate, deleteDoc as fsDelete, doc, setDoc, getDoc } from "./firebase.js";

export const COLLECTIONS = ["projects", "clients", "tasks", "jobs", "sites", "events", "invoices", "profiles", "access"];

export const S = {
  projects: [], clients: [], tasks: [], jobs: [], sites: [], events: [], invoices: [], profiles: [], access: [], chat: [],
  loaded: {}, user: null, authReady: false, denied: false,
  ui: {
    animate: true, dataAnimated: false,
    who: "", workTab: "projects", projFilter: "active", jobsTab: "tracker", jobView: "board", jobWho: "", siteCat: "", siteQ: "",
    taskFilter: "mine", calOffset: 0, moneyTab: "invoices", chatChannel: "General", chatDraft: ""
  }
};

let onChange = () => {};
export const setOnChange = fn => { onChange = fn; };
export const myEmail = () => (S.user?.email || "").toLowerCase();
export const isOwner = () => myEmail() === OWNER_EMAIL;

// ---------- sign in ----------
export async function signIn() {
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return;
    if (e?.code === "auth/popup-blocked") toast("Your browser blocked the sign-in window. Allow pop-ups for this site and try again.");
    else if (e?.code === "auth/unauthorized-domain") toast("This web address isn't allowed to sign in yet.");
    else toast("Couldn't sign in. Please try again.");
  }
}
export async function signOutNow() { await signOut(auth); location.hash = ""; location.reload(); }

let unsubs = [];
const stopAll = () => { unsubs.forEach(u => { try { u(); } catch (e) {} }); unsubs = []; };

export function start() {
  onAuthStateChanged(auth, async user => {
    stopAll();
    S.user = user; S.denied = false;
    if (!user) { S.authReady = true; onChange(); return; }
    if (!isOwner()) {
      try { const snap = await getDoc(doc(fs, "access", myEmail())); if (!snap.exists()) S.denied = true; }
      catch (e) { S.denied = true; }
      if (S.denied) { S.authReady = true; onChange(); return; }
    } else {
      // Make sure the owner shows up in the People list.
      try {
        const ref = doc(fs, "access", OWNER_EMAIL), snap = await getDoc(ref);
        if (!snap.exists()) await setDoc(ref, { email: OWNER_EMAIL, name: user.displayName || "Bob", color: "#1F6F5F", owner: true, addedAt: new Date().toISOString() });
      } catch (e) {}
    }
    S.authReady = true;
    subscribe();
    onChange();
  });
}

function watch(col, q) {
  S.loaded[col] = false;
  unsubs.push(onSnapshot(q, snap => {
    S[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    S.loaded[col] = true;
    if (Object.values(S.loaded).every(Boolean) && !S.ui.dataAnimated) { S.ui.dataAnimated = true; S.ui.animate = true; banner(""); }
    onChange();
  }, err => {
    S.loaded[col] = true;
    banner(err?.code === "permission-denied" ? "Some data couldn't load. Ask Bob to check your access." : "Lost the connection. Check your internet and refresh the page.");
    onChange();
  }));
}
function subscribe() {
  const timer = setTimeout(() => { if (!Object.values(S.loaded).every(Boolean)) banner("Still connecting. Your data may take a moment to appear."); }, 10000);
  unsubs.push(() => clearTimeout(timer));
  COLLECTIONS.forEach(col => watch(col, collection(fs, col)));
  watch("chat", query(collection(fs, "chat"), orderBy("createdAt"), limitToLast(300)));
}

// ---------- writes ----------
const clean = o => JSON.parse(JSON.stringify(o));
function writeError(e) {
  if (e?.code === "permission-denied") toast("You don't have permission to change that.");
  else if (e?.code === "resource-exhausted") toast("The free daily limit was reached. Try again tomorrow.");
  else toast("Couldn't save just now. Check your internet and try again.");
}
export async function addDoc(col, data) {
  data.createdAt = new Date().toISOString();
  data.createdByEmail = myEmail();
  try { return (await fsAdd(collection(fs, col), clean(data))).id; } catch (e) { writeError(e); return null; }
}
export async function updateDoc(col, id, patch) {
  patch.updatedAt = new Date().toISOString();
  try { await fsUpdate(doc(fs, col, id), clean(patch)); return true; } catch (e) { writeError(e); return false; }
}
export async function deleteDoc(col, id) {
  try { await fsDelete(doc(fs, col, id)); } catch (e) { writeError(e); }
}
export async function setDocAt(col, id, data) {
  try { await setDoc(doc(fs, col, id), clean({ ...data, updatedAt: new Date().toISOString() }), { merge: true }); return true; } catch (e) { writeError(e); return false; }
}

// ---------- people ----------
export const people = () => S.access.slice().sort((a, b) => (b.owner ? 1 : 0) - (a.owner ? 1 : 0) || (a.name || "").localeCompare(b.name || ""));
export const person = email => S.access.find(p => p.email === email);
export const nameOf = email => !email ? "Both" : (person(email)?.name || String(email).split("@")[0]).split(" ")[0];
export const colorOf = email => !email ? "#6B7A78" : (person(email)?.color || "#1F6F5F");
export const isMine = item => !item.who || item.who === myEmail();

// ---------- settings ----------
export const settings = () => S.profiles.find(p => p.id === "settings") || {};
export const rate = () => +settings().usdToPhp || 56;
export const toPhp = (amount, cur) => (+amount || 0) * (cur === "USD" ? rate() : 1);

// ---------- lookups ----------
export const project = id => S.projects.find(p => p.id === id);
export const client = id => S.clients.find(c => c.id === id);
export const site = id => S.sites.find(s => s.id === id);
export const invoiceStatus = inv => inv.status === "Paid" || inv.status === "Draft" ? inv.status : (inv.due && inv.due < today() ? "Overdue" : (inv.status || "Sent"));
export const followUpDue = j => ["Applied", "Interview"].includes(j.status) && j.followUp && j.followUp <= today();
