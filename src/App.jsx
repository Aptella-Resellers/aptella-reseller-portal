import React, { useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "./assets/aptella-logo.svg";

/** =========================
 * Config & simple constants
 * ========================= */
const GAS_URL = "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";
const ADMIN_PASSWORD = "Aptella2025!";

const APTELLA = {
  navy: "#0e3446",
  navyDark: "#0b2938",
  orange: "#f39b33", // close to aptella.com orange
  orangeDark: "#d9851f",
};

const COUNTRIES = [
  { name: "Select Country", code: "", currency: "", capital: "", lat: null, lng: null },
  { name: "Singapore", code: "SG", currency: "SGD", capital: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Malaysia", code: "MY", currency: "MYR", capital: "Kuala Lumpur", lat: 3.139, lng: 101.6869 },
  { name: "Indonesia", code: "ID", currency: "IDR", capital: "Jakarta", lat: -6.2088, lng: 106.8456 },
  { name: "Philippines", code: "PH", currency: "PHP", capital: "Manila", lat: 14.5995, lng: 120.9842 },
];

const INDUSTRIES = [
  "Construction", "Oil & Gas", "Mining", "Telecom", "Government",
  "Education", "Utilities", "Transportation", "Manufacturing", "Other",
];

const STAGES = [
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

const PROB_BY_STAGE = { qualified: 35, proposal: 55, negotiation: 70, won: 100, lost: 0 };

const SUPPORT_OPTIONS = [
  "Pre-sales engineer",
  "Demo / loan unit",
  "Pricing exception",
  "Marketing materials",
  "Partner training",
  "On-site customer visit",
  "Extended lock request",
];

// Bahasa map for key labels
const I18N_ID = {
  "Reseller Country": "Negara Anda",
  "Reseller Location": "Lokasi Reseller",
  "Currency": "Mata Uang",
  "Reseller company": "Perusahaan Reseller",
  "Primary contact": "Kontak Utama",
  "Contact email": "Email Kontak",
  "Contact phone": "Telepon Kontak",
  "Customer name": "Nama Pelanggan",
  "Customer City": "Kota Pelanggan",
  "Customer Country": "Negara Pelanggan",
  "Map option (paste lat, lng or click helper)":
    "Opsi peta (tempel lat, lng atau klik pembantu)",
  "Tip: use the link to pick a point, copy coordinates back here.":
    "Tip: gunakan tautan untuk memilih titik, salin koordinat kembali di sini.",
  "Solution offered (Xgrids)": "Solusi yang ditawarkan (Xgrids)",
  "Expected close date": "Perkiraan tanggal penutupan",
  "Industry": "Industri",
  "Deal value": "Nilai transaksi",
  "Sales stage": "Tahap penjualan",
  "Probability (%)": "Probabilitas (%)",
  "Competitors": "Pesaing",
  "Support requested": "Dukungan dibutuhkan",
  "Evidence (required)": "Bukti (wajib)",
  "Notes": "Catatan",
  "Send me reminders for updates": "Kirim pengingat untuk pembaruan",
  "Submit Registration": "Kirim Pendaftaran",
};

const XGRIDS_SOLUTIONS = [
  "Xgrids L2 PRO",
  "Xgrids K1",
  "Xgrids PortalCam",
  "Xgrids Drone Kit",
  "Other…" // triggers free text field
];

/** =========================
 * Utilities
 * ========================= */
const fmtDate = (d) => {
  try {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  } catch {
    return d || "";
  }
};
const todayISO = () => fmtDate(new Date());
const daysUntil = (iso) => {
  const t = new Date(fmtDate(iso));
  const n = new Date(fmtDate(new Date()));
  return Math.round((t - n) / (1000 * 60 * 60 * 24));
};

const loadLeafletOnce = (() => {
  let p;
  return () => {
    if (window.L) return Promise.resolve(window.L);
    if (p) return p;
    p = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);

      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload = () => resolve(window.L);
      s.onerror = () => reject(new Error("Leaflet failed to load"));
      document.body.appendChild(s);
    });
    return p;
  };
})();

/** Fetch helpers that always return JSON or throw */
async function getJSON(url) {
  const res = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache", credentials: "omit" });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { throw new Error(`Bad JSON: ${text.slice(0,200)}`); }
  if (!res.ok || json?.ok === false) throw new Error(json?.error || `HTTP ${res.status} ${res.statusText}`);
  return json;
}
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { throw new Error(`Bad JSON: ${text.slice(0,200)}`); }
  if (!res.ok || json?.ok === false) throw new Error(json?.error || `HTTP ${res.status} ${res.statusText}`);
  return json;
}

/** =========================
 * Branding shell
 * ========================= */
function Shell({ children }) {
  return (
    <div className="min-h-screen" style={{ background: "#f7fafc", color: "#0f172a" }}>
      <header className="w-full bg-white border-b" style={{ borderColor: "#e5e7eb" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Aptella" className="h-10 w-auto" />
            <div>
              <div className="text-2xl font-bold tracking-tight" style={{ color: APTELLA.navy }}>
                Aptella Master Distributor
              </div>
              <div className="text-sm" style={{ color: "#334155" }}>
                Reseller Deal Registration Portal
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

/** =========================
 * Reseller Form
 * ========================= */
function ResellerForm({ onSubmitted, onSyncOne }) {
  const [form, setForm] = useState(() => {
    const def = COUNTRIES[0];
    return {
      resellerCountry: def.name,
      resellerLocation: "",
      currency: "",
      lat: def.lat,
      lng: def.lng,

      resellerName: "",
      resellerContact: "",
      resellerEmail: "",
      resellerPhone: "",

      customerName: "",
      city: "",
      country: "",
      customerLocation: "",

      industry: "",
      value: "",
      solution: "",
      solutionOther: "",
      stage: "qualified",
      probability: PROB_BY_STAGE["qualified"],
      expectedCloseDate: todayISO(),

      supports: [],
      competitors: "",
      notes: "",
      evidenceFiles: [],
      remindersOptIn: false,
    };
  });

  const isID = form.resellerCountry === "Indonesia";

  useEffect(() => {
    // When reseller country changes, preload currency + capital lat/lng + resellerLocation
    const cfg = COUNTRIES.find((c) => c.name === form.resellerCountry);
    setForm((f) => ({
      ...f,
      currency: cfg?.currency || "",
      resellerLocation: cfg?.capital || "",
      lat: cfg?.lat ?? f.lat,
      lng: cfg?.lng ?? f.lng,
    }));
  }, [form.resellerCountry]);

  useEffect(() => {
    // Keep probability in sync with stage (unless user edits later)
    setForm((f) => ({ ...f, probability: PROB_BY_STAGE[f.stage] ?? f.probability }));
  }, [form.stage]);

  // If customer Country changes, default lat/lng to that capital (if blank or 0)
  useEffect(() => {
    const cfg = COUNTRIES.find((c) => c.name === form.country);
    if (!cfg) return;
    setForm((f) => {
      const lat = (f.lat === null || f.lat === "" || Number(f.lat) === 0) ? cfg.lat : f.lat;
      const lng = (f.lng === null || f.lng === "" || Number(f.lng) === 0) ? cfg.lng : f.lng;
      const loc = `${f.city || cfg.capital || ""}${cfg.name ? `, ${cfg.name}` : ""}`;
      return { ...f, currency: f.currency || cfg.currency, customerLocation: loc, lat, lng };
    });
  }, [form.country, form.city]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleSupport = (label) => {
    setForm((f) => {
      const s = new Set(f.supports);
      if (s.has(label)) s.delete(label);
      else s.add(label);
      return { ...f, supports: [...s] };
    });
  };

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    setForm((f) => ({ ...f, evidenceFiles: files }));
  };

  const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");

  function validate() {
    const errs = {};
    // Mandatory greying style is done via UI; here we validate
    if (!form.resellerCountry || form.resellerCountry === "Select Country") errs.resellerCountry = "Required";
    if (!form.resellerLocation) errs.resellerLocation = "Required";
    if (!form.currency) errs.currency = "Required";
    if (!form.resellerName) errs.resellerName = "Required";
    if (!form.resellerContact) errs.resellerContact = "Required";
    if (!validEmail(form.resellerEmail)) errs.resellerEmail = "Valid email required";
    if (!form.customerName) errs.customerName = "Required";
    if (!form.country) errs.country = "Required";
    if (!form.city) errs.city = "Required";
    if (!form.solution) errs.solution = "Required";
    if (form.solution === "Other…" && !form.solutionOther) errs.solutionOther = "Please describe";
    if (!form.value || Number(form.value) <= 0) errs.value = "Enter positive amount";
    if (!form.expectedCloseDate) errs.expectedCloseDate = "Required";
    // Evidence mandatory
    if (!form.evidenceFiles || form.evidenceFiles.length === 0) errs.evidence = "Evidence file is required";

    return errs;
  }

  const filesToBase64 = async (files) => {
    const MAX = 20 * 1024 * 1024;
    let total = 0;
    const out = [];
    for (const f of files || []) {
      const buf = await f.arrayBuffer();
      total += buf.byteLength;
      if (total > MAX) throw new Error("Attachments exceed 20MB total.");
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      out.push({ name: f.name, type: f.type || "application/octet-stream", data: b64 });
    }
    return out;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      alert("Please fix the highlighted errors before submitting.");
      return;
    }
    const id = Math.random().toString(36).slice(2);
    const record = {
      id,
      submittedAt: todayISO(),

      resellerCountry: form.resellerCountry,
      resellerLocation: form.resellerLocation,
      resellerName: form.resellerName,
      resellerContact: form.resellerContact,
      resellerEmail: form.resellerEmail,
      resellerPhone: form.resellerPhone,

      customerName: form.customerName,
      city: form.city,
      country: form.country,
      customerLocation: `${form.city}, ${form.country}`,

      lat: Number(form.lat),
      lng: Number(form.lng),

      industry: form.industry,
      currency: form.currency,
      value: String(form.value),

      solution: form.solution,
      solutionOther: form.solution === "Other…" ? form.solutionOther : "",

      stage: form.stage,
      probability: Number(form.probability),
      expectedCloseDate: fmtDate(form.expectedCloseDate),

      status: "pending",
      remindersOptIn: !!form.remindersOptIn,

      competitors: form.competitors,
      notes: form.notes,
      evidenceLinks: "", // kept for compatibility; we’re enforcing files
    };

    try {
      // Optimistic local add
      onSubmitted(record);

      // Attachments (optional email flow; GAS may ignore)
      const attachments = await filesToBase64(form.evidenceFiles);
      const payload = { action: "submit", ...record, attachments, emailEvidence: true, evidenceTo: "admin.asia@aptella.com" };

      const res = await postJSON(`${GAS_URL}?action=submit`, payload);
      if (res?.ok) {
        alert("Submitted and synced to Google Sheets.");
        onSyncOne && onSyncOne(record); // stamp syncedAt locally
        // Reset
        e.target.reset();
        setForm((f) => ({ ...f, evidenceFiles: [] }));
      } else {
        alert(`Submitted locally. Google Sheets sync failed: ${res?.error || "unknown error"}`);
      }
    } catch (err) {
      alert(`Submitted locally. Google Sheets sync failed: ${err.message || err}`);
    }
  };

  const label = (en) => (isID ? (I18N_ID[en] || en) : en);
  const requiredBoxCls = "bg-gray-100 border border-gray-300"; // greyed like aptella.com
  const resellerAccentCls = "bg-[#FFF7ED] border border-[#FED7AA]"; // soft Aptella orange wash for reseller inputs

  return (
    <div className="bg-white rounded-2xl shadow p-6 border" style={{ borderColor: "#e5e7eb" }}>
      <div className="text-lg font-semibold mb-4" style={{ color: APTELLA.navy }}>
        {isID ? "Daftarkan Deal (dalam 60 hari)" : "Register Upcoming Deal (within 60 days)"}
      </div>

      <form onSubmit={submit} className="grid gap-6">
        {/* Country / Location / Currency */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">{label("Reseller Country")} *</label>
            <select
              name="resellerCountry"
              value={form.resellerCountry}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-xl ${resellerAccentCls}`}
            >
              {COUNTRIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name || "Select Country"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">{label("Reseller Location")} *</label>
            <input
              name="resellerLocation"
              value={form.resellerLocation}
              onChange={handleChange}
              placeholder="e.g., Jakarta"
              className={`w-full px-3 py-2 rounded-xl ${resellerAccentCls}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium">{label("Currency")} *</label>
            <input
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-xl ${requiredBoxCls}`}
              placeholder="SGD / MYR / IDR / PHP"
            />
          </div>
        </div>

        {/* Reseller contact */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{label("Reseller company")} *</label>
            <input name="resellerName" value={form.resellerName} onChange={handleChange} className={`w-full px-3 py-2 rounded-xl ${requiredBoxCls}`} />
          </div>
          <div>
            <label className="text-sm font-medium">{label("Primary contact")} *</label>
            <input name="resellerContact" value={form.resellerContact} onChange={handleChange} className={`w-full px-3 py-2 rounded-xl ${requiredBoxCls}`} />
          </div>
          <div>
            <label className="text-sm font-medium">{label("Contact email")} *</label>
            <input type="email" name="resellerEmail" value={form.resellerEmail} onChange={handleChange} className={`w-full px-3 py-2 rounded-xl ${requiredBoxCls}`} />
          </div>
          <div>
            <label className="text-sm font-medium">{label("Contact phone")}</label>
            <input name="resellerPhone" value={form.resellerPhone} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-gray-300" />
          </div>
        </div>

        {/* Customer */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{label("Customer name")} *</label>
            <input name="customerName" value={form.customerName} onChange={handleChange} className={`w-full px-3 py-2 rounded-xl ${requiredBoxCls}`} />
          </div>
          <div>
            <label className="text-sm font-medium">{label("Customer City")} *</label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="Jakarta"
              className={`w-full px-3 py-2 rounded-xl ${requiredBoxCls}`}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{label("Customer Country")} *</label>
            <select
              name="country"
              value={form.country}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-xl ${requiredBoxCls}`}
            >
              <option value="">Select country</option>
              {COUNTRIES.slice(1).map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">{label("Map option (paste lat, lng or click helper)")}</label>
            <div className="flex gap-2">
              <input
                name="lat"
                value={form.lat ?? ""}
                onChange={handleChange}
                placeholder="lat"
                className="w-full px-3 py-2 rounded-xl border border-gray-300"
              />
              <input
                name="lng"
                value={form.lng ?? ""}
                onChange={handleChange}
                placeholder="lng"
                className="w-full px-3 py-2 rounded-xl border border-gray-300"
              />
              <a
                className="px-3 py-2 rounded-xl text-white text-sm"
                style={{ background: APTELLA.navy }}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  (form.city || "") + "," + (form.country || "")
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Open Map
              </a>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {label("Tip: use the link to pick a point, copy coordinates back here.")}
            </div>
          </div>
        </div>

        {/* Xgrids + dates + industry + value */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">{label("Solution offered (Xgrids)")} *</label>
            <div className="grid gap-2">
              <select
                name="solution"
                value={form.solution}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded-xl ${requiredBoxCls}`}
              >
                <option value="">Select an Xgrids solution</option>
                {XGRIDS_SOLUTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {form.solution === "Other…" && (
                <input
                  name="solutionOther"
                  value={form.solutionOther}
                  onChange={handleChange}
                  placeholder="Describe the solution"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              )}
              <a
                href="https://www.aptella.com/asia/product-brands/xgrids-asia/"
                target="_blank"
                rel="noreferrer"
                className="text-sm underline"
                style={{ color: APTELLA.navy }}
              >
                Learn about Xgrids solutions
              </a>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">{label("Expected close date")} *</label>
            <div className="flex gap-2">
              <input
                type="date"
                name="expectedCloseDate"
                value={form.expectedCloseDate}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded-xl ${requiredBoxCls}`}
              />
              <a
                className="px-3 py-2 rounded-xl text-white text-sm"
                style={{ background: APTELLA.orange }}
                href="https://maps.google.com"
                target="_blank"
                rel="noreferrer"
                title="Open Maps"
              >
                Maps
              </a>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">{label("Industry")}</label>
            <select
              name="industry"
              value={form.industry}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-gray-300"
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">{label("Deal value")} *</label>
            <input
              type="number"
              name="value"
              value={form.value}
              onChange={handleChange}
              placeholder="25000"
              className={`w-full px-3 py-2 rounded-xl ${requiredBoxCls}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium">{label("Sales stage")}</label>
            <select name="stage" value={form.stage} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-gray-300">
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <div className="mt-2">
              <label className="text-sm font-medium">{label("Probability (%)")}</label>
              <input
                type="number"
                name="probability"
                min={0}
                max={100}
                value={form.probability}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Competitors / Support */}
        <div>
          <label className="text-sm font-medium">{label("Competitors")}</label>
          <input
            name="competitors"
            value={form.competitors}
            onChange={handleChange}
            placeholder="Comma-separated"
            className="w-full px-3 py-2 rounded-xl border border-gray-300"
          />
        </div>

        <div>
          <label className="text-sm font-medium">{label("Support requested")}</label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SUPPORT_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.supports.includes(opt)}
                  onChange={() => toggleSupport(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Evidence (mandatory) + Notes + Reminders */}
        <div>
          <label className="text-sm font-medium">{label("Evidence (required)")} *</label>
          <input type="file" multiple onChange={onFiles} className="block w-full text-sm" />
          <div className="text-xs text-gray-600 mt-1">
            Email attached files to Aptella (admin.asia@aptella.com)
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">{label("Notes")}</label>
          <textarea
            name="notes"
            rows={4}
            value={form.notes}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-xl border border-gray-300"
            placeholder="Key requirements, scope, timelines, etc."
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" name="remindersOptIn" checked={!!form.remindersOptIn} onChange={handleChange} />
            {label("Send me reminders for updates")}
          </label>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-white"
            style={{ background: APTELLA.navy }}
          >
            {label("Submit Registration")}
          </button>
        </div>
      </form>
    </div>
  );
}

/** =========================
 * Admin Panel (map + table + FX)
 * ========================= */
function AdminPanel({ items, setItems }) {
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("submittedAt");
  const [sortDir, setSortDir] = useState("desc");
  const [fxOpen, setFxOpen] = useState(false);
  const [fxRows, setFxRows] = useState([]);
  const [savingFx, setSavingFx] = useState(false);
  const fxToAUD = useRef({ AUD: 1 });

  // Leaflet map
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markersRef = useRef([]);

  // Ensure init sheet
  useEffect(() => {
    (async () => {
      try { await getJSON(`${GAS_URL}?action=init`); } catch {}
    })();
  }, []);

  // Load rows on open
  const handleRefresh = async () => {
    try {
      const res = await getJSON(`${GAS_URL}?action=list`);
      const rows = (res.rows || []).map((r) => ({
        ...r,
        submittedAt: fmtDate(r.submittedAt || ""),
        expectedCloseDate: fmtDate(r.expectedCloseDate || ""),
        value: r.value === "" ? "" : Number(r.value),
      }));
      setItems(rows);
    } catch (e) {
      alert(`Refresh failed: ${e.message || e}`);
    }
  };

  // FX load/save
  const loadFx = async () => {
    try {
      const res = await getJSON(`${GAS_URL}?action=fx`);
      const rows = res.rows || [];
      setFxRows(rows.length ? rows : [{ ccy: "SGD", rateToAUD: 1.05 }]);
      fxToAUD.current = Object.fromEntries(rows.map((r) => [String(r.ccy || "").toUpperCase(), Number(r.rateToAUD) || 1]));
      setFxOpen(true);
    } catch (e) {
      alert(`FX load failed: ${e.message || e}`);
    }
  };
  const saveFx = async () => {
    try {
      setSavingFx(true);
      const clean = (fxRows || [])
        .filter((r) => r && r.ccy)
        .map((r) => ({ ccy: String(r.ccy).toUpperCase(), rateToAUD: Number(r.rateToAUD) || "" }));
      await postJSON(`${GAS_URL}?action=fx`, { rows: clean });
      setFxOpen(false);
      await handleRefresh();
    } catch (e) {
      alert(`FX save failed: ${e.message || e}`);
    } finally {
      setSavingFx(false);
    }
  };

  // Map aggregation + draw
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = items.slice();
    if (q) {
      rows = rows.filter((r) => {
        const hay = [
          r.customerName,
          r.customerLocation,
          r.city,
          r.country,
          r.solution,
          r.solutionOther,
          r.stage,
          r.status,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const cmp = (a, b) => {
      const A = a[sortKey] ?? "";
      const B = b[sortKey] ?? "";
      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    };
    rows.sort(cmp);
    return rows;
  }, [items, search, sortKey, sortDir]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = await loadLeafletOnce();
        if (cancelled) return;

        // Init map once
        if (!mapObj.current) {
          mapObj.current = L.map(mapRef.current).setView([1.35, 103.82], 5);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
          }).addTo(mapObj.current);
        }

        // Clear markers
        markersRef.current.forEach((m) => mapObj.current.removeLayer(m));
        markersRef.current = [];

        // Aggregate by city+country
        const totals = new Map();
        const fx = fxToAUD.current || { AUD: 1 };
        for (const r of visible) {
          const key = `${r.city || ""}__${r.country || ""}`;
          const cur = r.currency || "AUD";
          const rate = Number(fx[String(cur).toUpperCase()] || (cur === "AUD" ? 1 : 1));
          const val = Number(r.value || 0) * (isNaN(rate) ? 1 : rate);
          const prev = totals.get(key) || { lat: r.lat, lng: r.lng, count: 0, valueAUD: 0, city: r.city, country: r.country };
          totals.set(key, { ...prev, count: prev.count + 1, valueAUD: prev.valueAUD + (isNaN(val) ? 0 : val) });
        }

        // Add markers
        totals.forEach((t) => {
          const size = Math.max(8, Math.sqrt(t.valueAUD) * 0.5); // scale
          const m = L.circleMarker([Number(t.lat) || 0, Number(t.lng) || 0], {
            radius: size,
            color: APTELLA.orange,
            fillColor: APTELLA.orange,
            fillOpacity: 0.35,
            weight: 2,
          }).addTo(mapObj.current);
          m.bindPopup(
            `<div style="min-width:220px">
              <div><b>${t.city || ""}${t.country ? ", " + t.country : ""}</b></div>
              <div>Total registrations: ${t.count}</div>
              <div>Total value (AUD): ${t.valueAUD.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
            </div>`
          );
          markersRef.current.push(m);
        });

      } catch (e) {
        console.warn("Map init failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [visible]);

  const rowColor = (r) => {
    // Colors per requirement:
    // accepted = green, closed/lost = red, not yet approved = blue, approaching 60 days = orange
    const approved = r.status === "approved";
    const closed = r.status === "closed" || r.status === "lost";
    if (closed) return "bg-red-50";
    if (approved) {
      // near expiry -> orange
      const d = daysUntil(r.expectedCloseDate);
      if (!isNaN(d) && d <= 7) return "bg-orange-50";
      return "bg-green-50";
    }
    return "bg-blue-50";
  };

  const doUpdate = async (id, patch) => {
    try {
      const res = await postJSON(`${GAS_URL}?action=update`, { id, ...patch });
      if (res?.ok) {
        setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
        return true;
      }
      throw new Error(res?.error || "update failed");
    } catch (e) {
      alert(`Update failed: ${e.message || e}`);
      return false;
    }
  };

  return (
    <div className="space-y-4">
      {/* Admin gate */}
      {!adminAuthed ? (
        <div className="bg-white rounded-2xl shadow p-6 border" style={{ borderColor: "#e5e7eb" }}>
          <div className="text-lg font-semibold mb-3" style={{ color: APTELLA.navy }}>Admin Login</div>
          <div className="flex gap-2">
            <input id="adminPass" type="password" className="px-3 py-2 rounded-xl border border-gray-300" placeholder="Enter admin password" />
            <button
              className="px-4 py-2 rounded-xl text-white"
              style={{ background: APTELLA.navy }}
              onClick={() => {
                const v = document.getElementById("adminPass").value;
                if (v === ADMIN_PASSWORD) setAdminAuthed(true);
                else alert("Incorrect password.");
              }}
            >
              Login
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="bg-white rounded-2xl shadow p-4 border" style={{ borderColor: "#e5e7eb" }}>
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-xl text-white"
                  style={{ background: APTELLA.navy }}
                  onClick={handleRefresh}
                >
                  Refresh
                </button>
                <button
                  className="px-3 py-2 rounded-xl text-white"
                  style={{ background: APTELLA.orange }}
                  onClick={loadFx}
                >
                  FX Settings
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-300"
                />
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-300"
                >
                  <option value="submittedAt">Submitted</option>
                  <option value="expectedCloseDate">Expected</option>
                  <option value="customerName">Customer</option>
                  <option value="customerLocation">Location</option>
                  <option value="solution">Solution</option>
                  <option value="value">Value</option>
                  <option value="stage">Stage</option>
                  <option value="status">Status</option>
                </select>
                <select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-300"
                >
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
                <button
                  className="px-3 py-2 rounded-xl text-white"
                  style={{ background: APTELLA.navyDark }}
                  onClick={() => setAdminAuthed(false)}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white rounded-2xl shadow border" style={{ borderColor: "#e5e7eb" }}>
            <div className="p-4 text-sm font-medium" style={{ color: APTELLA.navy }}>Opportunities Map (AUD bubble size)</div>
            <div ref={mapRef} style={{ height: 420 }} />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow border overflow-x-auto" style={{ borderColor: "#e5e7eb" }}>
            <table className="min-w-full text-sm">
              <thead style={{ background: APTELLA.orange, color: "white" }}>
                <tr>
                  <th className="p-3 text-left">Submitted</th>
                  <th className="p-3 text-left">Expected</th>
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
                {visible.map((r) => (
                  <tr key={r.id} className={`border-b ${rowColor(r)}`}>
                    <td className="p-3">{fmtDate(r.submittedAt)}</td>
                    <td className="p-3">{fmtDate(r.expectedCloseDate)}</td>
                    <td className="p-3">{r.customerName}</td>
                    <td className="p-3">{r.customerLocation}</td>
                    <td className="p-3">{r.solution === "Other…" ? (r.solutionOther || "Other") : r.solution}</td>
                    <td className="p-3">{r.currency} {Number(r.value || 0).toLocaleString()}</td>
                    <td className="p-3">{r.stage}</td>
                    <td className="p-3 capitalize">{r.status}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {r.status !== "approved" && r.status !== "closed" && (
                          <button
                            className="px-2.5 py-1.5 rounded-lg text-white"
                            style={{ background: "#16a34a" }}
                            onClick={() => doUpdate(r.id, { status: "approved" })}
                          >
                            Approve
                          </button>
                        )}
                        {r.status !== "closed" && (
                          <button
                            className="px-2.5 py-1.5 rounded-lg text-white"
                            style={{ background: "#ef4444" }}
                            onClick={() => doUpdate(r.id, { status: "closed" })}
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={9}>No rows</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FX Drawer */}
          {fxOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
              <div className="bg-white rounded-2xl shadow-xl w-[min(680px,95vw)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-semibold" style={{ color: APTELLA.navy }}>FX Rates → AUD</div>
                  <button className="px-2 py-1 rounded-lg border" onClick={() => setFxOpen(false)}>Close</button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm font-medium mb-2">
                  <div>Currency</div><div>Rate to AUD</div><div></div>
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-auto">
                  {fxRows.map((row, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-center">
                      <input
                        value={row.ccy}
                        onChange={(e) => {
                          const v = e.target.value.toUpperCase();
                          setFxRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ccy: v } : r)));
                        }}
                        className="px-2 py-1 rounded border"
                      />
                      <input
                        type="number"
                        step="0.000001"
                        value={row.rateToAUD}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFxRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, rateToAUD: v } : r)));
                        }}
                        className="px-2 py-1 rounded border"
                      />
                      <button
                        className="text-red-600 text-sm"
                        onClick={() => setFxRows((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded-lg border"
                    onClick={() => setFxRows((prev) => [...prev, { ccy: "USD", rateToAUD: 1.0 }])}
                  >
                    Add Row
                  </button>
                  <div className="flex-1" />
                  <button
                    disabled={savingFx}
                    className="px-3 py-1.5 rounded-lg text-white"
                    style={{ background: APTELLA.navy }}
                    onClick={saveFx}
                  >
                    {savingFx ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** =========================
 * Root App
 * ========================= */
export default function App() {
  const [items, setItems] = useState([]);

  const onSubmitted = (rec) => setItems((prev) => [rec, ...prev]);
  const onSyncOne = (rec) =>
    setItems((prev) => prev.map((r) => (r.id === rec.id ? { ...r, syncedAt: todayISO() } : r)));

  const [tab, setTab] = useState("reseller");

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-2">
        <button
          className="px-3 py-2 rounded-xl text-white"
          style={{ background: tab === "reseller" ? APTELLA.navy : "#e5e7eb", color: tab === "reseller" ? "white" : APTELLA.navy }}
          onClick={() => setTab("reseller")}
        >
          Reseller
        </button>
        <button
          className="px-3 py-2 rounded-xl text-white"
          style={{ background: tab === "admin" ? APTELLA.navy : "#e5e7eb", color: tab === "admin" ? "white" : APTELLA.navy }}
          onClick={() => setTab("admin")}
        >
          Admin
        </button>
      </div>

      {tab === "reseller" ? (
        <ResellerForm onSubmitted={onSubmitted} onSyncOne={onSyncOne} />
      ) : (
        <AdminPanel items={items} setItems={setItems} />
      )}
    </Shell>
  );
}
