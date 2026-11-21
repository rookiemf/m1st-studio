// What each kind of item holds, and the forms to add or edit them.
import { S, myEmail } from "./data.js";
import { editForm } from "./ui.js";
import { today, addDays } from "./util.js";

export const PROJECT_STATUS = ["Idea", "In progress", "In review", "On hold", "Done"];
export const PROJECT_TYPES = ["Video editing", "Graphic design", "Photography", "Social media", "Motion graphics", "Website", "Personal project", "Other"];
export const JOB_STATUS = ["Saved", "Applied", "Interview", "Offer", "Hired", "Rejected", "No reply"];
export const SITE_CATS = ["Freelance marketplace", "Remote job board", "Philippines", "Creative and portfolio", "Social and community", "Other"];
export const INVOICE_STATUS = ["Draft", "Sent", "Paid"];
export const CURRENCIES = ["PHP", "USD"];

const clientOptions = () => [["", "No client"], ...S.clients.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(c => [c.id, c.name])];
const projectOptions = () => [["", "No project"], ...S.projects.filter(p => p.status !== "Done").sort((a, b) => (a.title || "").localeCompare(b.title || "")).map(p => [p.id, p.title])];
const siteOptions = () => [["", "Other / not listed"], ...S.sites.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(s => [s.id, s.name])];

export const F = {
  project: [
    { name: "title", label: "Project name", required: true, placeholder: "e.g. Wedding highlight film" },
    { name: "who", label: "Whose project", type: "who", half: true },
    { name: "status", label: "Status", type: "select", options: PROJECT_STATUS, half: true },
    { name: "clientId", label: "Client", type: "select", options: clientOptions, half: true },
    { name: "type", label: "Type of work", type: "select", options: PROJECT_TYPES, half: true },
    { name: "start", label: "Start", type: "date", half: true },
    { name: "due", label: "Deadline", type: "date", half: true },
    { name: "fee", label: "Fee", type: "number", half: true, placeholder: "0" },
    { name: "currency", label: "Currency", type: "select", options: CURRENCIES, half: true },
    { name: "link", label: "Files or brief link", type: "url", placeholder: "Google Drive, Frame.io, Notion…" },
    { name: "notes", label: "Notes", type: "textarea", rows: 3 }
  ],
  client: [
    { name: "name", label: "Client or company", required: true },
    { name: "contact", label: "Contact person", half: true },
    { name: "country", label: "Country", half: true },
    { name: "email", label: "Email", half: true },
    { name: "platform", label: "Found through", half: true, placeholder: "Upwork, referral, Facebook…" },
    { name: "who", label: "Whose client", type: "who" },
    { name: "link", label: "Website or profile", type: "url" },
    { name: "notes", label: "Notes", type: "textarea", rows: 3 }
  ],
  task: [
    { name: "title", label: "Task", required: true, placeholder: "e.g. Send first cut" },
    { name: "who", label: "For", type: "who", half: true },
    { name: "due", label: "Due", type: "date", half: true },
    { name: "projectId", label: "Project", type: "select", options: projectOptions, half: true },
    { name: "priority", label: "Priority", type: "select", options: ["Normal", "High"], half: true },
    { name: "notes", label: "Notes", type: "textarea", rows: 2 },
    { name: "done", label: "Done", type: "check" }
  ],
  job: [
    { name: "role", label: "Role", required: true, placeholder: "e.g. YouTube video editor" },
    { name: "company", label: "Company or client", half: true },
    { name: "siteId", label: "Where you found it", type: "select", options: siteOptions, half: true },
    { name: "who", label: "Who's applying", type: "who", both: false, half: true },
    { name: "status", label: "Status", type: "select", options: JOB_STATUS, half: true },
    { name: "applied", label: "Applied on", type: "date", half: true },
    { name: "followUp", label: "Follow up on", type: "date", half: true },
    { name: "interview", label: "Interview date", type: "date", half: true },
    { name: "pay", label: "Pay", half: true, placeholder: "$8/hr, ₱25k/mo…" },
    { name: "link", label: "Job post link", type: "url" },
    { name: "notes", label: "Notes", type: "textarea", rows: 3, placeholder: "What they asked for, who you talked to, test task…" }
  ],
  site: [
    { name: "name", label: "Site name", required: true, placeholder: "e.g. OnlineJobs.ph" },
    { name: "url", label: "Link", type: "url", required: true, placeholder: "https://…" },
    { name: "category", label: "Kind of site", type: "select", options: SITE_CATS, half: true },
    { name: "who", label: "Who uses it", type: "who", half: true },
    { name: "profile", label: "Your profile on this site", type: "url", placeholder: "Link to your profile page (optional)" },
    { name: "notes", label: "Notes", type: "textarea", rows: 2, placeholder: "Search tips, fees, what works here. Don't put passwords here." },
    { name: "pinned", label: "Pin to the dashboard", type: "check" }
  ],
  event: [
    { name: "title", label: "What", required: true, placeholder: "e.g. Call with client" },
    { name: "date", label: "Date", type: "date", required: true, half: true },
    { name: "time", label: "Time", type: "time", half: true },
    { name: "who", label: "For", type: "who" },
    { name: "link", label: "Meeting link", type: "url" },
    { name: "notes", label: "Notes", type: "textarea", rows: 2 }
  ],
  invoice: [
    { name: "number", label: "Invoice number", half: true },
    { name: "who", label: "From", type: "who", both: false, half: true },
    { name: "clientId", label: "Client", type: "select", options: clientOptions, half: true },
    { name: "projectId", label: "Project", type: "select", options: () => [["", "No project"], ...S.projects.map(p => [p.id, p.title])], half: true },
    { name: "amount", label: "Amount", type: "number", required: true, half: true },
    { name: "currency", label: "Currency", type: "select", options: CURRENCIES, half: true },
    { name: "issued", label: "Issued", type: "date", half: true },
    { name: "due", label: "Due", type: "date", half: true },
    { name: "status", label: "Status", type: "select", options: INVOICE_STATUS, half: true },
    { name: "paidOn", label: "Paid on", type: "date", half: true },
    { name: "items", label: "Line items", type: "textarea", rows: 4, placeholder: "One per line: Description | amount\ne.g. Highlight film edit | 300", hint: "Shown on the printable invoice." },
    { name: "notes", label: "Payment details or notes", type: "textarea", rows: 2, placeholder: "e.g. Pay via Wise, PayPal or GCash" }
  ]
};

const nextInvoiceNo = () => {
  const y = new Date().getFullYear(), n = S.invoices.filter(i => String(i.number || "").startsWith(`INV-${y}-`)).length + 1;
  return `INV-${y}-${String(n).padStart(3, "0")}`;
};

export const openProject = (item, defaults = {}) => editForm({ col: "projects", title: "project", fields: F.project, item, defaults: { status: "In progress", type: PROJECT_TYPES[0], currency: "PHP", who: myEmail(), ...defaults }, wide: true });
export const openClient = (item, defaults = {}) => editForm({ col: "clients", title: "client", fields: F.client, item, defaults: { who: "", ...defaults } });
export const openTask = (item, defaults = {}) => editForm({ col: "tasks", title: "task", fields: F.task, item, defaults: { who: myEmail(), priority: "Normal", done: false, ...defaults } });
export const openJob = (item, defaults = {}) => editForm({ col: "jobs", title: "application", fields: F.job, item, defaults: { who: myEmail(), status: "Applied", applied: today(), followUp: addDays(today(), 5), ...defaults }, wide: true });
export const openSite = (item, defaults = {}) => editForm({ col: "sites", title: "job site", fields: F.site, item, defaults: { category: SITE_CATS[0], who: "", ...defaults } });
export const openEvent = (item, defaults = {}) => editForm({ col: "events", title: "event", fields: F.event, item, defaults: { date: today(), who: "", ...defaults } });
export const openInvoice = (item, defaults = {}) => editForm({ col: "invoices", title: "invoice", fields: F.invoice, item, defaults: { number: nextInvoiceNo(), who: myEmail(), currency: "PHP", status: "Draft", issued: today(), due: addDays(today(), 14), ...defaults }, wide: true });
