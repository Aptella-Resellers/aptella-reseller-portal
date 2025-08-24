import React, { useEffect, useMemo, useRef, useState } from "react";

/* ------------------ Utilities & Brand ------------------ */

function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addDays(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + Number(days || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function daysUntil(iso) {
  if (!iso) return 0;
  const a = new Date(todayLocalISO());
  const b = new Date(iso);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}
function withinNext60Days(iso) {
  const d = daysUntil(iso);
  return d >= 0 && d <= 60;
}

const ADMIN_PASSWORD = "Aptella2025!";

const BRAND = {
  navy: "#0e3446",
  orange: "#f0a03a",
  primaryBtn: "bg-[#0e3446] hover:bg-[#0b2938]",
  chipApproved: "bg-green-100 text-green-800",
  chipPending: "bg-blue-100 text-blue-800",
  chipClosed: "bg-red-100 text-red-800",
  chipWarn: "bg-orange-100 text-orange-800",
};

const COUNTRY_CONFIG = {
  Indonesia:  { currency: "IDR", capital: "Jakarta",       center: [-6.2088, 106.8456] },
  Singapore:  { currency: "SGD", capital: "Singapore",     center: [1.3521, 103.8198] },
  Malaysia:   { currency: "MYR", capital: "Kuala Lumpur",  center: [3.139, 101.6869] },
  Philippines:{ currency: "PHP", capital: "Manila",        center: [14.5995, 120.9842] },
};
const CURRENCIES = ["SGD", "IDR", "MYR", "PHP", "AUD", "USD"];
const STAGES = [
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];
const PROB_BY_STAGE = { qualified: 35, proposal: 55, negotiation: 70, won: 100, lost: 0 };

const XGRIDS_SOLUTIONS = ["Xgrids L2 PRO", "Xgrids K1", "Xgrids PortalCam", "Xgrids Drone Kit"];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ------------------ GAS helpers ------------------ */

const GAS_URL =
  (typeof window !== "undefined" && window.GOOGLE_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec"; // <- keep in sync with your deployment

async function gasGet(action, params = {}) {
  if (!GAS_URL) throw new Error("Google Apps Script URL missing");
  const usp = new URLSearchParams({ action, ...params, t: Date.now() });
  const res = await fetch(`${GAS_URL}?${usp}`, { method: "GET" });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(text || "Bad JSON"); }
  if (!res.ok || json?.ok === false) throw new Error(json?.error || text);
  return json;
}

async function gasPost(action, payload = {}) {
  if (!GAS_URL) throw new Error("Google Apps Script URL missing");
  const res = await fetch(`${GAS_URL}?action=${encodeURIComponent(action)}&t=${Date.now()}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain; charset=utf-8" }, // avoids CORS preflight
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(text || "Bad JSON"); }
  if (!res.ok || json?.ok === false) throw new Error(json?.error || text);
  return json;
}

/* ------------------ Tiny UI atoms ------------------ */

function Card({ children }) {
  return <div className="rounded-2xl bg-white shadow border border-gray-200">{children}</div>;
}
function CardHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b">
      <div>
        <div className="text-[15px] font-semibold text-slate-800">{title}</div>
        {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
function CardBody({ children }) {
  return <div className="p-5">{children}</div>;
}
function Label({ children, required, ...rest }) {
  return (
    <label className="text-sm font-medium text-slate-700" {...rest}>
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}
function Input(props) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 " +
        (props.className || "")
      }
    />
  );
}
function Select(props) {
  return (
    <select
      {...props}
      className={
        "w-full rounded-xl border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 " +
        (props.className || "")
      }
    />
  );
}
function Textarea(props) {
  return (
    <textarea
      {...props}
      className={
        "w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 " +
        (props.className || "")
      }
    />
  );
}

/* ------------------ Admin Settings (FX) ------------------ */

function AdminSettings({ open, onClose, ratesAUD, onSave, saving }) {
  const [local, setLocal] = useState(ratesAUD || {});
  useEffect(() => setLocal(ratesAUD || {}), [ratesAUD, open]);
  if (!open) return null;

  const rows = Object.entries(local);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-[min(760px,95vw)] shadow-xl">
        <CardHeader
          title="FX Settings (to AUD)"
          right={
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm">
              Close
            </button>
          }
        />
        <CardBody>
          <div className="grid grid-cols-3 gap-2 mb-2 text-sm font-medium text-slate-600">
            <div>Currency</div>
            <div>Rate → AUD</div>
            <div></div>
          </div>
          {rows.map(([ccy, rate]) => (
            <div key={ccy} className="grid grid-cols-3 gap-2 items-center mb-1">
              <Input
                value={ccy}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setLocal((p) => {
                    const { [ccy]: _, ...rest } = p;
                    return { ...rest, [v]: rate };
                  });
                }}
              />
              <Input
                type="number"
                step="0.000001"
                value={rate}
                onChange={(e) => setLocal((p) => ({ ...p, [ccy]: Number(e.target.value) }))}
              />
              <button
                className="text-red-600 text-sm"
                onClick={() => setLocal((p) => {
                  const cp = { ...p }; delete cp[ccy]; return cp;
                })}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm"
            onClick={() => setLocal((p) => ({ ...p, USD: p.USD || 0.67 }))}
          >
            Add Row
          </button>
        </CardBody>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-gray-100">Cancel</button>
          <button
            disabled={saving}
            onClick={() => onSave(local)}
            className={"px-3 py-2 rounded-lg text-white " + BRAND.primaryBtn}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Reseller Submission ------------------ */

function SubmissionForm({ onLocalAdd, onSyncOne }) {
  const [form, setForm] = useState(() => {
    const cfg = COUNTRY_CONFIG["Singapore"];
    return {
      resellerCountry: "Singapore",
      resellerLocation: cfg.capital,
      resellerName: "",
      resellerContact: "",
      resellerEmail: "",
      resellerPhone: "",
      customerName: "",
      customerLocation: "",
      city: "",
      country: "",
      lat: cfg.center[0],
      lng: cfg.center[1],
      industry: "",
      currency: cfg.currency,
      value: "",
      solution: "",
      stage: "qualified",
      probability: PROB_BY_STAGE.qualified,
      expectedCloseDate: addDays(todayLocalISO(), 14),
      notes: "",
      confidential: false,
      remindersOptIn: false,
      accept: false,
    };
  });

  const isID = form.resellerCountry === "Indonesia";

  useEffect(() => {
    const cfg = COUNTRY_CONFIG[form.resellerCountry];
    if (cfg) {
      setForm((f) => ({
        ...f,
        currency: cfg.currency,
        resellerLocation: cfg.capital,
        lat: cfg.center[0],
        lng: cfg.center[1],
      }));
    }
  }, [form.resellerCountry]);

  useEffect(() => {
    setForm((f) => ({ ...f, probability: PROB_BY_STAGE[f.stage] ?? f.probability }));
  }, [form.stage]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function validate() {
    const errs = [];
    if (!form.resellerName) errs.push("Reseller company is required.");
    if (!form.resellerContact) errs.push("Primary contact is required.");
    if (!form.resellerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail)) errs.push("Valid email required.");
    if (!form.customerName) errs.push("Customer name is required.");
    if (!form.city || !form.country) errs.push("Customer city and country required.");
    if (!form.solution) errs.push("Solution offered is required.");
    if (!form.value || Number(form.value) <= 0) errs.push("Deal value must be positive.");
    if (!withinNext60Days(form.expectedCloseDate)) errs.push("Expected close date must be within 60 days.");
    if (!form.accept) errs.push("You must confirm details and consent.");
    if (errs.length) { alert(errs.join("\n")); return false; }
    return true;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    const record = {
      id: uid(),
      submittedAt: todayLocalISO(),
      status: "pending",
      lockExpiry: "",
      syncedAt: null,
      ...form,
      value: Number(form.value),
      probability: Number(form.probability),
      customerLocation: `${form.city}${form.country ? ", " + form.country : ""}`,
    };

    // local add immediately
    onLocalAdd(record);

    // sync to GAS
    try {
      await onSyncOne(record);
      alert("Submitted and synced to Google Sheets.");
    } catch (err) {
      alert("Submitted locally. Google Sheets sync failed: " + (err?.message || err));
    }

    // reset
    const cfg = COUNTRY_CONFIG[form.resellerCountry];
    setForm({
      resellerCountry: form.resellerCountry,
      resellerLocation: cfg.capital,
      resellerName: "",
      resellerContact: "",
      resellerEmail: "",
      resellerPhone: "",
      customerName: "",
      customerLocation: "",
      city: "",
      country: "",
      lat: cfg.center[0],
      lng: cfg.center[1],
      industry: "",
      currency: cfg.currency,
      value: "",
      solution: "",
      stage: "qualified",
      probability: PROB_BY_STAGE.qualified,
      expectedCloseDate: addDays(todayLocalISO(), 14),
      notes: "",
      confidential: false,
      remindersOptIn: false,
      accept: false,
    });
  }

  return (
    <Card>
      <CardHeader title="Register Upcoming Deal (within 60 days)" subtitle="Fields marked * are mandatory." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label required>Reseller Country</Label>
              <Select
                name="resellerCountry"
                value={form.resellerCountry}
                onChange={handleChange}
              >
                <option>Indonesia</option>
                <option>Singapore</option>
                <option>Malaysia</option>
                <option>Philippines</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label required>{isID ? "Lokasi Reseller" : "Reseller Location"}</Label>
              <Input
                name="resellerLocation"
                value={form.resellerLocation}
                onChange={handleChange}
                placeholder="e.g., Jakarta"
              />
            </div>
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Select name="currency" value={form.currency} onChange={handleChange}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label required>Reseller company</Label>
              <Input name="resellerName" value={form.resellerName} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label required>Primary contact</Label>
              <Input name="resellerContact" value={form.resellerContact} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label required>Contact email</Label>
              <Input type="email" name="resellerEmail" value={form.resellerEmail} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label>Contact phone</Label>
              <Input name="resellerPhone" value={form.resellerPhone} onChange={handleChange} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label required>Customer name</Label>
              <Input name="customerName" value={form.customerName} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label required>Reseller location</Label>
              <Input name="resellerLocation" value={form.resellerLocation} onChange={handleChange} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label required>{isID ? "Kota Pelanggan" : "Customer City"}</Label>
              <Input
                name="city"
                value={form.city}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    city: v,
                    customerLocation: v + (f.country ? ", " + f.country : ""),
                  }));
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label required>{isID ? "Negara Pelanggan" : "Customer Country"}</Label>
              <Select
                name="country"
                value={form.country}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    country: v,
                    customerLocation: (f.city || "") + (v ? ", " + v : ""),
                  }));
                }}
              >
                <option value="">Select country</option>
                <option>Indonesia</option>
                <option>Singapore</option>
                <option>Malaysia</option>
                <option>Philippines</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Map option (paste lat, lng or use link)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="lat"
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: Number(e.target.value) }))}
                />
                <Input
                  placeholder="lng"
                  value={form.lng}
                  onChange={(e) => setForm((f) => ({ ...f, lng: Number(e.target.value) }))}
                />
                <a
                  className={"px-3 py-2 rounded-xl text-white text-sm " + BRAND.primaryBtn}
                  href={
                    "https://www.google.com/maps/search/?api=1&query=" +
                    encodeURIComponent((form.city || "") + "," + (form.country || ""))
                  }
                  target="_blank" rel="noreferrer"
                >
                  Open Map
                </a>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2 md:col-span-2">
              <Label required>Solution offered (Xgrids)</Label>
              <Select
                value={form.solution}
                onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
              >
                <option value="">Select an Xgrids solution</option>
                {XGRIDS_SOLUTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <a
                className="text-sky-700 underline text-xs"
                href="https://www.aptella.com/asia/product-brands/xgrids-asia/"
                target="_blank" rel="noreferrer"
              >
                Learn about Xgrids solutions
              </a>
            </div>
            <div className="grid gap-2">
              <Label required>Expected close date</Label>
              <Input
                type="date"
                name="expectedCloseDate"
                value={form.expectedCloseDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Industry</Label>
              <Input name="industry" value={form.industry} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Select name="currency" value={form.currency} onChange={handleChange}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label required>Deal value</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                name="value"
                value={form.value}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Sales stage</Label>
              <Select name="stage" value={form.stage} onChange={handleChange}>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Probability (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                name="probability"
                value={form.probability}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-2">
              <Label>Competitors</Label>
              <Input
                name="competitors"
                placeholder="Comma-separated (optional)"
                value={form.competitors || ""}
                onChange={(e) => setForm((f) => ({ ...f, competitors: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              rows={4}
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Key requirements, scope, constraints, etc."
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="confidential"
                checked={!!form.confidential}
                onChange={handleChange}
              />
              Mark customer name confidential to other resellers
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="remindersOptIn"
                checked={!!form.remindersOptIn}
                onChange={handleChange}
              />
              Send me reminders for updates
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="accept"
                checked={!!form.accept}
                onChange={handleChange}
              />
              I confirm details are accurate and consent to data storage for deal management
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className={"px-4 py-2 rounded-xl text-white " + BRAND.primaryBtn}>
              Submit Registration
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-gray-200"
            >
              Reset
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/* ------------------ Admin Panel ------------------ */

function StatusChip({ row }) {
  let cls = BRAND.chipPending, txt = "pending";
  if (row.status === "approved") { cls = BRAND.chipApproved; txt = "approved"; }
  else if (row.status === "closed" || row.status === "lost") { cls = BRAND.chipClosed; txt = row.status; }
  else if (row.lockExpiry && daysUntil(row.lockExpiry) <= 7) { cls = BRAND.chipWarn; txt = "ending soon"; }
  return <span className={"px-2 py-1 rounded-lg text-xs " + cls}>{txt}</span>;
}

function AdminPanel({
  items, setItems,
  onRefresh, onApprove, onClose,
  onExportCSV,
  onOpenSettings
}) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markersLayer = useRef(null);

  // draw map once
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapObj.current) return;
    const L = (typeof window !== "undefined" && window.L) ? window.L : null;
    if (!L) return;

    mapObj.current = L.map(mapRef.current).setView([1.3521, 103.8198], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapObj.current);

    markersLayer.current = L.layerGroup().addTo(mapObj.current);
  }, []);

  // update markers when items change
  useEffect(() => {
    const L = (typeof window !== "undefined" && window.L) ? window.L : null;
    if (!L || !mapObj.current || !markersLayer.current) return;

    markersLayer.current.clearLayers();
    const bounds = [];
    items.forEach((r) => {
      if (!r.lat || !r.lng) return;
      const m = L.circleMarker([r.lat, r.lng], {
        radius: 6,
        color: r.status === "approved" ? "#16a34a" : (r.status === "closed" || r.status === "lost") ? "#dc2626" :
                (r.lockExpiry && daysUntil(r.lockExpiry) <= 7) ? "#f59e0b" : "#2563eb",
        weight: 2,
        fillOpacity: 0.7,
      }).bindPopup(
        `<div style="font-size:12px"><strong>${r.customerName || ""}</strong><br/>${r.customerLocation || ""}<br/>${r.solution || ""}<br/>${r.currency || ""} ${r.value || ""}</div>`
      );
      m.addTo(markersLayer.current);
      bounds.push([r.lat, r.lng]);
    });
    if (bounds.length) mapObj.current.fitBounds(bounds, { padding: [30, 30] });
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onRefresh} className={"px-3 py-2 rounded-lg text-white " + BRAND.primaryBtn}>Refresh</button>
        <button onClick={onExportCSV} className="px-3 py-2 rounded-lg bg-gray-100">Export CSV</button>
        <button onClick={onOpenSettings} className="px-3 py-2 rounded-lg bg-[#f0a03a] text-white">FX Settings</button>
      </div>

      <div className="h-[420px] rounded-2xl overflow-hidden border" ref={mapRef} />

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-3 text-left">Submitted</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Location</th>
              <th className="p-3 text-left">Solution</th>
              <th className="p-3 text-left">Value</th>
              <th className="p-3 text-left">Stage</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-3">{r.submittedAt}</td>
                <td className="p-3">{r.customerName}</td>
                <td className="p-3">{r.customerLocation}</td>
                <td className="p-3">{r.solution}</td>
                <td className="p-3">{(r.currency || "") + " " + (r.value || "")}</td>
                <td className="p-3">{r.stage}</td>
                <td className="p-3"><StatusChip row={r} /></td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => onApprove(r)}
                    className="px-2.5 py-1.5 rounded-lg bg-green-600 text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onClose(r)}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-200"
                  >
                    Close
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="p-4 text-sm text-gray-500" colSpan={8}>No rows.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------ Root ------------------ */

function DealRegistrationPortal() {
  const [tab, setTab] = useState("reseller"); // 'reseller' | 'admin'
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [items, setItems] = useState([]);
  const [ratesAUD, setRatesAUD] = useState({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingFx, setSavingFx] = useState(false);

  // local add after submission
  function onLocalAdd(row) { setItems((p) => [row, ...p]); }

  // sync one (submit) to GAS
  async function onSyncOne(row) {
    await gasPost("submit", row);
    setItems((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, syncedAt: todayLocalISO() } : r))
    );
  }

  async function refresh() {
    try {
      const { rows } = await gasGet("list");
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      alert("Refresh failed: " + (e?.message || e));
    }
  }

  async function approve(row) {
    try {
      await gasPost("update", { id: row.id, status: "approved", lockDays: 60 });
      setItems((p) => p.map((r) => (r.id === row.id ? { ...r, status: "approved" } : r)));
    } catch (e) {
      alert("Update failed: " + (e?.message || e));
    }
  }

  async function closeRow(row) {
    try {
      await gasPost("update", { id: row.id, status: "closed" });
      setItems((p) => p.map((r) => (r.id === row.id ? { ...r, status: "closed" } : r)));
    } catch (e) {
      alert("Update failed: " + (e?.message || e));
    }
  }

  // FX
  async function openSettings() {
    setSettingsOpen(true);
    try {
      const { ratesAUD } = await gasGet("fx");
      setRatesAUD(ratesAUD || {});
    } catch (e) {
      alert("Could not load FX: " + (e?.message || e));
    }
  }
  async function saveFx(newRates) {
    setSavingFx(true);
    try {
      const { ratesAUD } = await gasPost("fx", { ratesAUD: newRates });
      setRatesAUD(ratesAUD || {});
      setSettingsOpen(false);
    } catch (e) {
      alert("Save FX failed: " + (e?.message || e));
    } finally {
      setSavingFx(false);
    }
  }

  // CSV export
  function exportCSV() {
    const cols = [
      "id","submittedAt","resellerCountry","resellerLocation","resellerName","resellerContact",
      "resellerEmail","resellerPhone","customerName","customerLocation","city","country",
      "lat","lng","industry","currency","value","solution","stage","probability",
      "expectedCloseDate","status","lockExpiry","syncedAt","confidential","remindersOptIn",
      "supports","competitors","notes","evidenceLinks","updates"
    ];
    const head = cols.join(",");
    const body = (items || []).map((x) =>
      cols
        .map((k) => {
          const raw = x[k] == null ? "" : String(x[k]);
          const val = raw.replace(/\n/g, " ").replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(",")
    ).join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aptella-registrations.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Admin auth (very light front-end gate)
  function gateAdmin() {
    const pwd = prompt("Enter admin password:");
    if (pwd === ADMIN_PASSWORD) {
      setAdminAuthed(true);
      refresh();
    } else {
      alert("Incorrect password.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fafc] text-slate-900">
      {/* Top bar */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* If the public logo exists it will load; otherwise text fallback */}
            <img src="/aptella-logo.png" alt="Aptella" className="h-6" onError={(e)=>{e.currentTarget.style.display='none';}} />
            <div className="text-sm text-slate-500">Master Distributor • Xgrids</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={"px-3 py-2 rounded-lg " + (tab === "reseller" ? "bg-[#0e3446] text-white" : "bg-gray-100 text-[#0e3446]")}
              onClick={() => setTab("reseller")}
            >
              Reseller
            </button>
            <button
              className={"px-3 py-2 rounded-lg " + (tab === "admin" ? "bg-[#0e3446] text-white" : "bg-gray-100 text-[#0e3446]")}
              onClick={() => setTab("admin")}
            >
              Admin
            </button>
            {adminAuthed ? (
              <button className="px-3 py-2 rounded-lg bg-gray-100" onClick={() => setAdminAuthed(false)}>
                Logout
              </button>
            ) : (
              <button className="px-3 py-2 rounded-lg bg-gray-100" onClick={gateAdmin}>
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === "reseller" && (
          <SubmissionForm onLocalAdd={onLocalAdd} onSyncOne={onSyncOne} />
        )}

        {tab === "admin" && (
          adminAuthed ? (
            <AdminPanel
              items={items}
              setItems={setItems}
              onRefresh={refresh}
              onApprove={approve}
              onClose={closeRow}
              onExportCSV={exportCSV}
              onOpenSettings={openSettings}
            />
          ) : (
            <Card><CardBody>Enter the admin password to continue.</CardBody></Card>
          )
        )}
      </div>

      <AdminSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        ratesAUD={ratesAUD}
        onSave={saveFx}
        saving={savingFx}
      />
    </div>
  );
}

export default DealRegistrationPortal;
