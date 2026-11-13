// Data layer: shared state, live sync with the artifact database, and writes.
// Runs in "local mode" (data kept only until the page closes) when no database is available.
import { banner, toast } from "./util.js";

export const COLLECTIONS = ["leads", "clients", "posts", "team", "calls"];

export const S = {
  leads: [], clients: [], posts: [], team: [], calls: [],
  loaded: Object.fromEntries(COLLECTIONS.map(c => [c, false])),
  db: null, assets: null, local: false, readOnly: false,
  me: readLocal("m1st.me") || "",
  ui: {
    animate: true, dataAnimated: false,
    weekOffset: 0, monthOffset: 0, calView: "week", calClient: "", calPerson: "",
    clientMonth: 0, leadFilter: { niche: "", status: "", q: "" },
    portalClient: "", script: "discovery", scriptLead: "", scriptBig: false, scriptChecks: {}
  }
};

let onChange = () => {};
export const setOnChange = fn => { onChange = fn; };

function readLocal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
export function setMe(id) { S.me = id; try { localStorage.setItem("m1st.me", id); } catch (e) {} onChange(); }

let seq = 0;
export async function addDoc(col, data) {
  if (S.readOnly) { toast("You have view-only access."); return null; }
  data.createdAt = new Date().toISOString();
  if (S.me) data.createdBy = S.me;
  if (S.local) { const id = "local" + (++seq); S[col].push({ id, ...data }); onChange(); return id; }
  try { const ref = await S.db.collection(col).add(data); return ref.id; } catch (e) { writeError(e); return null; }
}
export async function updateDoc(col, id, patch) {
  if (S.readOnly) { toast("You have view-only access."); return; }
  if (S.local) { const x = S[col].find(r => r.id === id); if (x) Object.assign(x, patch); onChange(); return; }
  try { await S.db.doc(col + "/" + id).update(patch); } catch (e) { writeError(e); }
}
export async function deleteDoc(col, id) {
  if (S.readOnly) { toast("You have view-only access."); return; }
  if (S.local) { S[col] = S[col].filter(r => r.id !== id); onChange(); return; }
  try { await S.db.doc(col + "/" + id).delete(); } catch (e) { writeError(e); }
}
function writeError(e) {
  const code = e && e.code;
  if (code === "invalid_argument") { S.readOnly = true; banner("Your access is view-only, so changes can't be saved. Ask Bob to invite you as an Editor."); onChange(); }
  else if (code === "quota_exceeded") toast("Storage is full. Delete old items, then try again.");
  else toast("Couldn't save just now. Please try again.");
}

export async function uploadPhoto(file) {
  if (!S.assets) { toast("Photo upload isn't available here."); return null; }
  if (!/^image\//.test(file.type)) { toast("Please choose an image file."); return null; }
  if (file.size > 8 * 1024 * 1024) { toast("Please choose a photo under 8 MB."); return null; }
  try { const r = await S.assets.upload(file); return r.id; } catch (e) { toast("Couldn't upload the photo. Try again."); return null; }
}
export const photoUrl = id => id ? "/_blob/" + encodeURIComponent(id) : "";

export async function connect() {
  const timer = setTimeout(() => {
    if (!Object.values(S.loaded).every(Boolean)) banner("Still connecting. Your data may take a moment to appear.");
  }, 10000);
  let db = null;
  try { db = await window.claude?.use?.("db"); } catch (e) { db = null; }
  if (!db) {
    clearTimeout(timer);
    S.local = true; COLLECTIONS.forEach(c => { S.loaded[c] = true; });
    banner("Saving isn't available here, so changes last only until you close this page. Open the app on claude.ai while signed in to save for the whole team.");
    onChange(); return;
  }
  S.db = db;
  try { S.assets = await window.claude.use("assets"); } catch (e) { S.assets = null; }
  try {
    const user = await window.claude.use("user");
    if (user) {
      const can = await user.can?.("data.write");
      if (can === false) { S.readOnly = true; banner("You have view-only access, so you can look but not make changes."); }
    }
  } catch (e) {}
  COLLECTIONS.forEach(col => {
    db.collection(col).onSnapshot(snap => {
      S[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!snap.metadata.fromCache) {
        S.loaded[col] = true;
        if (Object.values(S.loaded).every(Boolean)) {
          clearTimeout(timer);
          if (!S.readOnly) banner("");
          if (!S.ui.dataAnimated) { S.ui.dataAnimated = true; S.ui.animate = true; }
        }
      }
      onChange();
    }, () => {
      S.loaded[col] = true; clearTimeout(timer);
      banner("Lost the connection to saved data. Refresh the page to reconnect."); onChange();
    });
  });
}

// ---------- lookups ----------
import { OWN, FOLLOW_UP_DAYS } from "./content.js";
import { addDays, today } from "./util.js";

export const member = id => S.team.find(m => m.id === id);
export const memberName = id => member(id)?.name || "";
export const client = id => S.clients.find(c => c.id === id);
export const clientName = id => id === OWN ? "M1st (our page)" : (client(id)?.name || "Unknown client");
export const postWho = p => memberName(p.assigneeId) || p.assignee || "";
export const followDue = l => l.status === "Sent" && !l.followedUp && l.sentOn && addDays(l.sentOn, FOLLOW_UP_DAYS) <= today();
export const sortedTeam = () => S.team.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
