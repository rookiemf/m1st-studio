// Money: invoices, what's been paid, what's still owed, and a printable invoice.
import { esc, I, head, empty, cnt, today, fmt, fmtLong, ymd } from "../util.js";
import { S, toPhp, rate, settings, setDocAt, invoiceStatus, client, project, nameOf, person, myEmail, updateDoc } from "../data.js";
import { whoChip, pill, seg, bindSeg, peopleFilter, byWho, openDialog, closeDialog } from "../ui.js";
import { openInvoice } from "../schemas.js";

const peso = n => "₱" + Math.round(n).toLocaleString();
const amt = i => `${i.currency === "USD" ? "$" : "₱"}${(+i.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const kind = s => ({ Draft: "muted", Sent: "", Paid: "ok", Overdue: "bad" })[s] || "";
const monthKey = i => (i.status === "Paid" ? (i.paidOn || i.issued) : i.issued || "").slice(0, 7);

function chart(list) {
  const months = [];
  const d = new Date(); d.setDate(1);
  for (let k = 5; k >= 0; k--) { const x = new Date(d.getFullYear(), d.getMonth() - k, 1); months.push([ymd(x).slice(0, 7), x.toLocaleDateString(undefined, { month: "short" })]); }
  const vals = months.map(([key]) => list.filter(i => i.status === "Paid" && monthKey(i) === key).reduce((s, i) => s + toPhp(i.amount, i.currency), 0));
  const max = Math.max(1, ...vals);
  return `<div class="chart">${vals.map((v, n) => `<div class="col"><span class="v">${v ? (v >= 1000 ? "₱" + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : peso(v)) : ""}</span><div class="bar gy${n === 5 ? " now" : ""}" style="height:${Math.max(2, v / max * 100)}%"></div></div>`).join("")}</div><div class="xaxis">${months.map(m => `<span>${m[1]}</span>`).join("")}</div>`;
}

export function money() {
  const list = byWho(S.invoices, S.ui.who).slice().sort((a, b) => (b.issued || "").localeCompare(a.issued || ""));
  const ym = today().slice(0, 7), y = today().slice(0, 4);
  const paid = list.filter(i => i.status === "Paid");
  const month = paid.filter(i => monthKey(i) === ym).reduce((s, i) => s + toPhp(i.amount, i.currency), 0);
  const year = paid.filter(i => monthKey(i).startsWith(y)).reduce((s, i) => s + toPhp(i.amount, i.currency), 0);
  const open = list.filter(i => ["Sent", "Overdue"].includes(invoiceStatus(i)));
  const owed = open.reduce((s, i) => s + toPhp(i.amount, i.currency), 0), late = open.filter(i => invoiceStatus(i) === "Overdue");
  const f = S.ui.moneyTab;
  const shown = f === "open" ? open : f === "paid" ? paid : f === "draft" ? list.filter(i => i.status === "Draft") : list;
  return head("Money", "Invoices and earnings. Totals are shown in pesos.", `<button class="btn ghost" id="rateBtn">$1 = ₱${rate()}</button><button class="btn primary" data-addinv>${I.plus}New invoice</button>`) + `
  <div class="toolbar">${peopleFilter(S.ui.who)}</div>
  <div class="kpis">
    <div class="kpi hero"><span class="lbl">${I.money}Paid this month</span><span class="val">${cnt(Math.round(month), "₱")}</span><span class="sub">${new Date().toLocaleDateString(undefined, { month: "long" })}</span></div>
    <div class="kpi"><span class="lbl">${I.clock}Waiting to be paid</span><span class="val">${cnt(Math.round(owed), "₱")}</span><span class="sub">${open.length} invoice${open.length === 1 ? "" : "s"} sent</span></div>
    <div class="kpi${late.length ? " attn" : ""}"><span class="lbl">${I.x}Overdue</span><span class="val">${cnt(late.length)}</span><span class="sub">${late.length ? "Send a friendly reminder" : "Nothing late"}</span></div>
    <div class="kpi"><span class="lbl">${I.star}This year</span><span class="val">${cnt(Math.round(year), "₱")}</span><span class="sub">Paid in ${y}</span></div>
  </div>
  <div class="cols">
    <section class="panel"><header><h2>Paid per month</h2><span class="count">last 6 months</span></header>${chart(list)}</section>
    <section class="panel"><header><h2>Who earned what this year</h2></header><div class="body">${S.access.map(p => { const v = S.invoices.filter(i => i.who === p.email && i.status === "Paid" && monthKey(i).startsWith(y)).reduce((s, i) => s + toPhp(i.amount, i.currency), 0); return `<div class="rowitem">${whoChip(p.email)}<span class="main"></span><b class="num">${peso(v)}</b></div>`; }).join("")}</div></section>
  </div>
  <div class="toolbar">${seg("moneyTab", [["invoices", "All"], ["open", "Waiting"], ["paid", "Paid"], ["draft", "Drafts"]], f)}</div>
  <section class="panel">${shown.length ? `<div class="tablebox"><table class="resp"><thead><tr><th>Invoice</th><th>Client</th><th>From</th><th>Due</th><th class="r">Amount</th><th>Status</th><th></th></tr></thead><tbody>${shown.map(i => { const st = invoiceStatus(i); return `
    <tr data-inv="${esc(i.id)}"><td class="c-main"><b>${esc(i.number || "Invoice")}</b><div class="muted small">${esc(project(i.projectId)?.title || "")}</div></td><td>${esc(client(i.clientId)?.name || "")}</td><td class="c-hide">${whoChip(i.who)}</td><td class="c-hide">${esc(fmt(i.due))}</td><td class="r num"><b>${esc(amt(i))}</b>${i.currency === "USD" ? `<div class="muted small">≈ ${peso(toPhp(i.amount, "USD"))}</div>` : ""}</td><td>${pill(st, kind(st))}</td><td class="c-hide nowrap">${st !== "Paid" ? `<button class="btn ghost sm" data-paid="${esc(i.id)}">${I.check}Paid</button>` : ""}<button class="btn ghost sm icon" data-print="${esc(i.id)}" aria-label="Print invoice">${I.print}</button></td></tr>`; }).join("")}</tbody></table></div>` :
    `<div class="body">${empty("money", "No invoices here", "Create one from a project, or start a new invoice.", `<button class="btn primary sm" data-addinv>${I.plus}New invoice</button>`)}</div>`}</section>
  <p class="inline-note">USD amounts are converted at the rate you set ($1 = ₱${rate()}). Tap the rate to change it.</p>`;
}

function lines(i) {
  const rows = String(i.items || "").split("\n").map(l => l.trim()).filter(Boolean).map(l => { const [d, a] = l.split("|").map(x => (x || "").trim()); return [d, a]; });
  return rows.length ? rows : [[project(i.projectId)?.title || "Creative services", String(i.amount || "")]];
}
function printInvoice(i) {
  const c = client(i.clientId), from = person(i.who), sym = i.currency === "USD" ? "$" : "₱";
  const html = `<div class="inv" id="printarea">
    <div class="invtop"><div><h1>Invoice</h1><p class="muted">${esc(i.number || "")}</p></div><div class="r"><b>${esc(from?.name || nameOf(i.who))}</b><br>${esc(i.who || "")}</div></div>
    <div class="invmeta"><div><span>Bill to</span><b>${esc(c?.name || "")}</b>${c?.contact ? `<br>${esc(c.contact)}` : ""}${c?.email ? `<br>${esc(c.email)}` : ""}${c?.country ? `<br>${esc(c.country)}` : ""}</div><div><span>Issued</span><b>${esc(fmtLong(i.issued))}</b></div><div><span>Due</span><b>${esc(fmtLong(i.due))}</b></div></div>
    <table class="invt"><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead><tbody>${lines(i).map(([d, a]) => `<tr><td>${esc(d)}</td><td class="r num">${a ? sym + (+a || a).toLocaleString() : ""}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td>Total (${esc(i.currency || "PHP")})</td><td class="r num">${esc(amt(i))}</td></tr></tfoot></table>
    ${i.notes ? `<div class="invnotes"><span>Payment details</span><p>${esc(i.notes)}</p></div>` : ""}
    <p class="invthanks">Thank you for working with me.</p></div>`;
  openDialog("Invoice preview", `<div class="db">${html}</div>`, `<button class="btn ghost" id="pvEdit">${I.edit}Edit</button><button class="btn primary" id="pvPrint">${I.print}Print or save as PDF</button>`, () => {
    document.getElementById("pvEdit").onclick = () => openInvoice(i);
    document.getElementById("pvPrint").onclick = () => window.print();
  }, true);
}

export function bindMoney(v, r, render) {
  bindSeg(v, S, render);
  v.querySelectorAll("[data-addinv]").forEach(b => b.onclick = () => openInvoice(null, S.ui.who ? { who: S.ui.who } : {}));
  v.querySelectorAll("[data-inv]").forEach(tr => tr.onclick = () => openInvoice(S.invoices.find(i => i.id === tr.dataset.inv)));
  v.querySelectorAll("[data-print]").forEach(b => b.onclick = e => { e.stopPropagation(); printInvoice(S.invoices.find(i => i.id === b.dataset.print)); });
  v.querySelectorAll("[data-paid]").forEach(b => b.onclick = e => { e.stopPropagation(); updateDoc("invoices", b.dataset.paid, { status: "Paid", paidOn: today() }); });
  v.querySelector("#rateBtn").onclick = () => openDialog("Dollar to peso rate", `<form class="form db" id="rateF"><label class="field" for="rt">How many pesos is $1?<input id="rt" name="r" type="number" step="0.01" inputmode="decimal" value="${rate()}" required></label><p class="muted small" style="margin:0">Used to add up USD invoices in pesos. Update it when the rate moves.</p></form>`,
    `<button class="btn ghost" type="button" id="rtNo">Cancel</button><button class="btn primary" type="submit" form="rateF">Save</button>`, () => {
      document.getElementById("rtNo").onclick = closeDialog;
      document.getElementById("rateF").onsubmit = async e => { e.preventDefault(); const n = +e.target.elements.r.value; closeDialog(); if (n > 0) await setDocAt("profiles", "settings", { usdToPhp: n, by: myEmail() }); };
    });
}
export { settings };
