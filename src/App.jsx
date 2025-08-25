// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "./assets/aptella-logo.svg"; // make sure this file exists

/***** CONFIG *****/
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";
const ADMIN_PASSWORD = "Aptella2025!"; // simple frontend gate only

// Aptella brand (use hex so no Tailwind config is required)
const BRAND = {
  navy: "#0e3446",
  navyDark: "#0b2938",
  orange: "#f0a03a",
  primaryBtn: "bg-[#0e3446] hover:bg-[#0b2938]",
  orangeBtn: "bg-[#f0a03a] hover:brightness-95",
};

/***** UTILITIES *****/
const todayLocalISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const addDays = (dateISO, days) => {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + Number(days || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const withinNext60Days = (dateISO) => {
  if (!dateISO) return false;
  const today = new Date(todayLocalISO());
  const target = new Date(dateISO);
  const diffDays = (target - today) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 60;
};
const uid = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

async function getJSON(url) {
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Bad JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `HTTP ${res.status} ${res.statusText}`);
  }
  return json;
}
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Bad JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `HTTP ${res.status} ${res.statusText}`);
  }
  return json;
}

/***** DOMAIN CONSTANTS *****/
const COUNTRY_CONFIG = {
  Singapore: { capital: "Singapore", currency: "SGD", lat: 1.3521, lng: 103.8198 },
  Malaysia: { capital: "Kuala Lumpur", currency: "MYR", lat: 3.139, lng: 101.6869 },
  Indonesia: { capital: "Jakarta", currency: "IDR", lat: -6.2088, lng: 106.8456 },
  Philippines: { capital: "Manila", currency: "PHP", lat: 14.5995, lng: 120.9842 },
};
const CURRENCIES = ["SGD", "MYR", "IDR", "PHP", "AUD", "USD"];
const STAGES = [
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];
const PROB_BY_STAGE = { qualified: 35, proposal: 55, negotiation: 70, won: 100, lost: 0 };

// Xgrids solutions + "Other"
const XGRIDS_SOLUTIONS = ["Xgrids L2 PRO", "Xgrids K1", "Xgrids PortalCam", "Xgrids Drone Kit", "Other"];
const INDUSTRIES = [
  "Architecture, Engineering, Construction",
  "Mining",
  "Oil & Gas",
  "Utilities / Energy",
  "Government",
  "Telecoms",
  "Transport / Logistics",
  "Education",
  "Other",
];

/***** LEAFLET LOADER (CDN, no bundler import) *****/
let _leafletPromise;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (_leafletPromise) return _leafletPromise;
  _leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = () => reject(new Error("Leaflet failed to load"));
    document.body.appendChild(s);
  });
  return _leafletPromise;
}

/***** SMALL UI PRIMITIVES *****/
const Card = ({ children }) => (
  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">{children}</div>
);
const CardHeader = ({ title, subtitle, right }) => (
  <div className="flex items-center justify-between p-4 border-b">
    <div>
      <h3 className="text-lg font-semibold text-[#0e3446]">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
    {right}
  </div>
);
const CardBody = ({ children }) => <div className="p-4">{children}</div>;
const Label = ({ children, required, htmlFor }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium text-[#0e3446]">
    {children} {required && <span className="text-red-600">*</span>}
  </label>
);
const Input = (props) => (
  <input
    {...props}
    className={
      "px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0e3446] " +
      (props.className || "")
    }
  />
);
const Select = (props) => (
  <select
    {...props}
    className={
      "px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#0e3446] " +
      (props.className || "")
    }
  />
);
const Textarea = (props) => (
  <textarea
    {...props}
    className={
      "px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0e3446] " +
      (props.className || "")
    }
  />
);

/***** FX SETTINGS DRAWER *****/
function AdminSettings({ open, onClose, rows, onChange, onSave, saving }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center">
      <div className="bg-white w-[min(680px,95vw)] rounded-2xl shadow-xl">
        <CardHeader
          title="FX Rates → AUD"
          subtitle="Used for Value (AUD) calculation"
          right={
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100">
              Close
            </button>
          }
        />
        <CardBody>
          <div className="grid grid-cols-3 gap-2 text-sm font-medium mb-2">
            <div>Currency</div>
            <div>Rate to AUD</div>
            <div></div>
          </div>
          {(rows || []).map((r, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2 items-center mb-1">
              <Input
                value={r.ccy}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  const copy = [...rows];
                  copy[idx] = { ...copy[idx], ccy: val };
                  onChange(copy);
                }}
              />
              <Input
                type="number"
                step="0.000001"
                value={r.rateToAUD}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const copy = [...rows];
                  copy[idx] = { ...copy[idx], rateToAUD: isNaN(val) ? "" : val };
                  onChange(copy);
                }}
              />
              <button
                className="text-red-600 text-sm"
                onClick={() => {
                  const copy = rows.filter((_, j) => j !== idx);
                  onChange(copy);
                }}
              >
                Remove
              </button>
            </div>
          ))}
          <div className="mt-2 flex justify-between">
            <button
              className="px-3 py-1.5 rounded-lg bg-gray-100"
              onClick={() => onChange([...(rows || []), { ccy: "SGD", rateToAUD: 1.0 }])}
            >
              Add Row
            </button>
            <button
              disabled={saving}
              onClick={onSave}
              className={`px-3 py-1.5 rounded-lg text-white ${BRAND.primaryBtn}`}
            >
              {saving ? "Saving…" : "Save FX"}
            </button>
          </div>
        </CardBody>
      </div>
    </div>
  );
}

/***** SUBMISSION FORM *****/
function SubmissionForm({ onLocalSave, onSyncOne, existingItems, onLocale }) {
  const [form, setForm] = useState({
    resellerCountry: "",
    resellerLocation: "",
    resellerName: "",
    resellerContact: "",
    resellerEmail: "",
    resellerPhone: "",
    customerName: "",
    customerLocation: "",
    city: "",
    country: "",
    lat: "",
    lng: "",
    industry: "",
    currency: "",
    value: "",
    solution: "",
    solutionOther: "",
    stage: "qualified",
    probability: PROB_BY_STAGE["qualified"],
    expectedCloseDate: addDays(todayLocalISO(), 14),
    competitors: [],
    notes: "",
    evidenceLinks: [],
    remindersOptIn: false,
    accept: false,
  });
  const [errors, setErrors] = useState({});
  const isID = form.resellerCountry === "Indonesia";

  // Bahasa toggle
  useEffect(() => {
    if (typeof onLocale === "function") onLocale(isID ? "id" : "en");
  }, [isID, onLocale]);

  // auto currency/lat/lng based on resellerCountry
  useEffect(() => {
    const cfg = COUNTRY_CONFIG[form.resellerCountry];
    if (!cfg) return;
    setForm((f) => ({
      ...f,
      currency: cfg.currency,
      resellerLocation: cfg.capital,
      lat: cfg.lat,
      lng: cfg.lng,
    }));
  }, [form.resellerCountry]);

  // auto probability by stage
  useEffect(() => {
    setForm((f) => ({ ...f, probability: PROB_BY_STAGE[f.stage] ?? f.probability }));
  }, [form.stage]);

  const addEvidenceLink = () => {
    const link = prompt(
      isID
        ? "Tempel tautan bukti (email/penawaran/foto yang dapat diverifikasi)"
        : "Paste a link to your evidence (verifiable email/quote/photo)"
    );
    if (!link) return;
    try {
      new URL(link);
    } catch {
      alert(isID ? "Masukkan URL yang valid" : "Enter a valid URL");
      return;
    }
    setForm((f) => ({ ...f, evidenceLinks: [...f.evidenceLinks, link] }));
  };

  // Simple dup hint
  const dupWarning = useMemo(() => {
    if (!form.customerName || !form.solution || !form.expectedCloseDate) return "";
    const target = new Date(form.expectedCloseDate);
    const min = new Date(target);
    const max = new Date(target);
    min.setDate(min.getDate() - 14);
    max.setDate(max.getDate() + 14);
    const hit = (existingItems || []).find(
      (x) =>
        x.customerName?.trim()?.toLowerCase() === form.customerName.trim().toLowerCase() &&
        x.solution?.trim()?.toLowerCase() === form.solution.trim().toLowerCase() &&
        new Date(x.expectedCloseDate) >= min &&
        new Date(x.expectedCloseDate) <= max
    );
    return hit ? `Possible duplicate: ${hit.customerName} (${hit.id})` : "";
  }, [form.customerName, form.solution, form.expectedCloseDate, existingItems]);

  function validate() {
    const e = {};
    if (!form.resellerCountry) e.resellerCountry = "Required";
    if (!form.resellerLocation) e.resellerLocation = "Required";
    if (!form.resellerName) e.resellerName = "Required";
    if (!form.resellerContact) e.resellerContact = "Required";
    if (!form.resellerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail))
      e.resellerEmail = "Valid email required";
    if (!form.customerName) e.customerName = "Required";
    if (!form.city) e.city = "Required";
    if (!form.country) e.country = "Required";
    if (!form.solution) e.solution = "Required";
    if (form.solution === "Other" && !form.solutionOther) e.solutionOther = "Please specify";
    const v = Number(String(form.value).replace(/[^0-9.-]+/g, ""));
    if (!v || v <= 0) e.value = "Enter a positive amount";
    if (!form.expectedCloseDate || !withinNext60Days(form.expectedCloseDate))
      e.expectedCloseDate = "Within next 60 days";
    if (!form.evidenceLinks?.length) e.evidence = "Evidence link is mandatory";
    if (!form.accept) e.accept = "You must confirm";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    // minimal payload for reliability
    const payload = {
      id: uid(),
      submittedAt: todayLocalISO(),
      resellerCountry: form.resellerCountry,
      resellerLocation: form.resellerLocation,
      resellerName: form.resellerName,
      resellerContact: form.resellerContact,
      resellerEmail: form.resellerEmail,
      resellerPhone: form.resellerPhone,
      customerName: form.customerName,
      customerCity: form.city,
      customerCountry: form.country,
      customerLocation: `${form.city}, ${form.country}`,
      lat: form.lat,
      lng: form.lng,
      industry: form.industry,
      currency: form.currency,
      value: String(form.value),
      solution: form.solution,
      solutionOther: form.solutionOther,
      stage: form.stage,
      probability: form.probability,
      expectedCloseDate: form.expectedCloseDate,
      status: "pending",
      remindersOptIn: !!form.remindersOptIn,
      notes: form.notes,
      competitors: (form.competitors || []).join(", "),
      evidenceLinks: (form.evidenceLinks || []).join(" "),
    };
    // local echo
    onLocalSave(payload);
    // sync to GAS
    try {
      await postJSON(`${GAS_URL}?action=submit`, payload);
      alert("Submitted and synced to Google Sheets.");
    } catch (err) {
      console.error(err);
      alert(`Submitted locally. Google Sheets sync failed: ${err.message || err}`);
    }
    // reset minimal
    setForm((f) => ({
      ...f,
      customerName: "",
      value: "",
      solution: "",
      solutionOther: "",
      notes: "",
      competitors: [],
      evidenceLinks: [],
      accept: false,
    }));
  }

  return (
    <Card>
      <CardHeader
        title="Register Upcoming Deal (within 60 days)"
        subtitle="Fields marked * are mandatory"
      />
      <CardBody>
        {dupWarning && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-900 p-3 mb-4 text-sm">
            {dupWarning}
          </div>
        )}

        <form onSubmit={submit} className="grid gap-6">
          {/* Country + location + currency */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="resellerCountry" required>
                {isID ? "Negara Anda" : "Reseller Country"}
              </Label>
              <Select
                id="resellerCountry"
                value={form.resellerCountry}
                onChange={(e) =>
                  setForm((f) => ({ ...f, resellerCountry: e.target.value }))
                }
                className="border-2"
              >
                <option value="">{isID ? "Pilih negara" : "Select country"}</option>
                <option>Singapore</option>
                <option>Malaysia</option>
                <option>Indonesia</option>
                <option>Philippines</option>
              </Select>
              {errors.resellerCountry && (
                <p className="text-xs text-red-600">{errors.resellerCountry}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerLocation" required>
                {isID ? "Lokasi Reseller" : "Reseller Location"}
              </Label>
              <Input
                id="resellerLocation"
                value={form.resellerLocation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, resellerLocation: e.target.value }))
                }
                placeholder={isID ? "mis. Jakarta" : "e.g., Jakarta"}
                className="border-2"
              />
              {errors.resellerLocation && (
                <p className="text-xs text-red-600">{errors.resellerLocation}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">{isID ? "Mata Uang" : "Currency"}</Label>
              <Select
                id="currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="border-2"
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Reseller contact block */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="resellerName" required>
                {isID ? "Perusahaan Reseller" : "Reseller company"}
              </Label>
              <Input
                id="resellerName"
                value={form.resellerName}
                onChange={(e) => setForm((f) => ({ ...f, resellerName: e.target.value }))}
                placeholder="Alpha Solutions Pte Ltd"
                className="border-2"
              />
              {errors.resellerName && (
                <p className="text-xs text-red-600">{errors.resellerName}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerContact" required>
                {isID ? "Kontak Utama" : "Primary contact"}
              </Label>
              <Input
                id="resellerContact"
                value={form.resellerContact}
                onChange={(e) => setForm((f) => ({ ...f, resellerContact: e.target.value }))}
                placeholder={isID ? "Nama lengkap" : "Full name"}
                className="border-2"
              />
              {errors.resellerContact && (
                <p className="text-xs text-red-600">{errors.resellerContact}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerEmail" required>
                {isID ? "Email Kontak" : "Contact email"}
              </Label>
              <Input
                id="resellerEmail"
                type="email"
                value={form.resellerEmail}
                onChange={(e) => setForm((f) => ({ ...f, resellerEmail: e.target.value }))}
                placeholder="name@company.com"
                className="border-2"
              />
              {errors.resellerEmail && (
                <p className="text-xs text-red-600">{errors.resellerEmail}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerPhone">{isID ? "Telepon" : "Contact phone"}</Label>
              <Input
                id="resellerPhone"
                value={form.resellerPhone}
                onChange={(e) => setForm((f) => ({ ...f, resellerPhone: e.target.value }))}
                placeholder="+65 1234 5678"
                className="border-2"
              />
            </div>
          </div>

          {/* Customer + location */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="customerName" required>
                {isID ? "Nama Pelanggan" : "Customer name"}
              </Label>
              <Input
                id="customerName"
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                placeholder="End customer / project owner"
                className="border-2"
              />
              {errors.customerName && (
                <p className="text-xs text-red-600">{errors.customerName}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city" required>
                {isID ? "Kota Pelanggan" : "Customer City"}
              </Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    city: e.target.value,
                    customerLocation: `${e.target.value}${f.country ? ", " + f.country : ""}`,
                  }))
                }
                placeholder="Jakarta"
                className="border-2"
              />
              {errors.city && <p className="text-xs text-red-600">{errors.city}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country" required>
                {isID ? "Negara Pelanggan" : "Customer Country"}
              </Label>
              <Select
                id="country"
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    country: e.target.value,
                    customerLocation: `${f.city ? f.city + ", " : ""}${e.target.value}`,
                  }))
                }
                className="border-2"
              >
                <option value="">{isID ? "Pilih negara" : "Select country"}</option>
                <option>Indonesia</option>
                <option>Singapore</option>
                <option>Malaysia</option>
                <option>Philippines</option>
              </Select>
              {errors.country && <p className="text-xs text-red-600">{errors.country}</p>}
            </div>
          </div>

          {/* Map helper + expected close */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2 md:col-span-2">
              <Label required>{isID ? "Solusi (Xgrids)" : "Solution offered (Xgrids)"}</Label>
              <Select
                value={form.solution}
                onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
                className="border-2"
              >
                <option value="">{isID ? "Pilih solusi" : "Select a solution"}</option>
                {XGRIDS_SOLUTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              {form.solution === "Other" && (
                <Input
                  placeholder={isID ? "Tuliskan solusi Xgrids" : "Specify Xgrids solution"}
                  value={form.solutionOther}
                  onChange={(e) => setForm((f) => ({ ...f, solutionOther: e.target.value }))}
                  className="border-2 mt-2"
                />
              )}
              <a
                className="text-[#0e3446] underline text-sm mt-1 inline-block"
                href="https://www.aptella.com/asia/product-brands/xgrids-asia/"
                target="_blank"
                rel="noreferrer"
              >
                Learn about Xgrids solutions
              </a>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expectedCloseDate" required>
                {isID ? "Perkiraan Tgl Penutupan" : "Expected close date"}
              </Label>
              <Input
                id="expectedCloseDate"
                type="date"
                value={form.expectedCloseDate}
                onChange={(e) => setForm((f) => ({ ...f, expectedCloseDate: e.target.value }))}
                className="border-2"
              />
              <a
                className={"px-3 py-2 rounded-xl text-white text-sm mt-2 inline-block " + BRAND.primaryBtn}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  (form.city || "") + "," + (form.country || "")
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Open Map
              </a>
            </div>
          </div>

          {/* Industry / value / stage */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="industry">{isID ? "Industri" : "Industry"}</Label>
              <Select
                id="industry"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                className="border-2"
              >
                <option value="">{isID ? "Pilih industri" : "Select industry"}</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="value" required>
                {isID ? "Nilai transaksi" : "Deal value"}
              </Label>
              <Input
                id="value"
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="e.g., 25000"
                className="border-2"
              />
              {errors.value && <p className="text-xs text-red-600">{errors.value}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stage">{isID ? "Tahap penjualan" : "Sales stage"}</Label>
              <Select
                id="stage"
                value={form.stage}
                onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                className="border-2"
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Evidence (mandatory) */}
          <div className="grid gap-2">
            <Label required>{isID ? "Bukti (tautan diperlukan)" : "Evidence link (required)"}</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addEvidenceLink}
                className={"px-3 py-2 rounded-xl text-white " + BRAND.orangeBtn}
              >
                + {isID ? "Tambah Tautan Bukti" : "Add Evidence Link"}
              </button>
              {form.evidenceLinks?.length > 0 && (
                <span className="text-sm text-gray-600">
                  {form.evidenceLinks.length} link(s) added
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600">
              {isID
                ? "Untuk lampiran file, emailkan ke admin.asia@aptella.com"
                : "For file attachments, email them to admin.asia@aptella.com"}
            </p>
            {errors.evidence && <p className="text-xs text-red-600">{errors.evidence}</p>}
          </div>

          {/* Notes & consents */}
          <div className="grid gap-2">
            <Label htmlFor="notes">{isID ? "Catatan" : "Notes"}</Label>
            <Textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={
                isID
                  ? "Persyaratan utama, ruang lingkup teknis, dll."
                  : "Key requirements, technical scope, etc."
              }
              className="border-2"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.remindersOptIn}
                onChange={(e) => setForm((f) => ({ ...f, remindersOptIn: e.target.checked }))}
              />
              {isID ? "Kirim pengingat pembaruan" : "Send me reminders for updates"}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.accept}
                onChange={(e) => setForm((f) => ({ ...f, accept: e.target.checked }))}
              />
              {isID
                ? "Saya mengonfirmasi data akurat dan setuju penyimpanan untuk pengelolaan deal"
                : "I confirm details are accurate and consent to data storage for deal management"}
            </label>
          </div>
          {errors.accept && <p className="text-xs text-red-600 -mt-3">{errors.accept}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" className={"px-4 py-2 rounded-xl text-white " + BRAND.primaryBtn}>
              {isID ? "Kirim Pendaftaran" : "Submit Registration"}
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  customerName: "",
                  value: "",
                  solution: "",
                  solutionOther: "",
                  evidenceLinks: [],
                  notes: "",
                  accept: false,
                }))
              }
              className="px-4 py-2 rounded-xl bg-gray-200"
            >
              {isID ? "Reset" : "Reset"}
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/***** ADMIN PANEL *****/
function AdminPanel({ items, setItems }) {
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("submittedAt");
  const [sortDir, setSortDir] = useState("desc");
  const [fxOpen, setFxOpen] = useState(false);
  const [fxRows, setFxRows] = useState([]);
  const [savingFx, setSavingFx] = useState(false);

  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const fxToAUD = useRef({ AUD: 1 });

  const handleRefresh = async () => {
    try {
      const json = await getJSON(`${GAS_URL}?action=list`);
      const rows = json.rows || [];
      setItems(rows);
      // compute FX once list is pulled (local cache used when computing AUD)
    } catch (e) {
      alert(`Refresh failed: ${e.message || e}`);
    }
  };

  // FX: load/save — DROP-IN replacement wired to ?action=fx
  const loadFx = async () => {
    try {
      const json = await getJSON(`${GAS_URL}?action=fx`);
      const rows = json.rows || [];
      setFxRows(rows.length ? rows : [{ ccy: "SGD", rateToAUD: 1.05 }]);
      fxToAUD.current = Object.fromEntries(
        (rows || []).map((r) => [
          String(r.ccy || "").toUpperCase(),
          Number(r.rateToAUD) || 1,
        ])
      );
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
        .map((r) => ({
          ccy: String(r.ccy).toUpperCase(),
          rateToAUD: Number(r.rateToAUD) || "",
        }));
      const json = await postJSON(`${GAS_URL}?action=fx`, { rows: clean });
      const saved = json.rows || clean;
      fxToAUD.current = Object.fromEntries(
        saved.map((r) => [String(r.ccy || "").toUpperCase(), Number(r.rateToAUD) || 1])
      );
      setFxOpen(false);
      await handleRefresh();
    } catch (e) {
      alert(`FX save failed: ${e.message || e}`);
    } finally {
      setSavingFx(false);
    }
  };

  // Approve / Close write-backs
  const setStatus = async (id, status) => {
    try {
      await postJSON(`${GAS_URL}?action=update`, { id, status });
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e) {
      alert(`Update failed: ${e.message || e}`);
    }
  };

  // Derived table with filters + search + sort + computed AUD
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = (items || [])
      .filter((r) => (countryFilter === "All" ? true : r.country === countryFilter))
      .filter((r) =>
        !q
          ? true
          : [
              r.submittedAt,
              r.customerName,
              r.customerLocation,
              r.solution,
              r.resellerName,
            ]
              .join(" ")
              .toLowerCase()
              .includes(q)
      )
      .map((r) => {
        const raw = Number(String(r.value || "").replace(/[^0-9.-]+/g, ""));
        const rate =
          fxToAUD.current[String(r.currency || "").toUpperCase()] ??
          (String(r.currency || "").toUpperCase() === "AUD" ? 1 : 1);
        const valueAUD = isNaN(raw) ? "" : raw * rate;
        return { ...r, _valueAUD: valueAUD };
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sortBy === "value") return ((a._valueAUD || 0) - (b._valueAUD || 0)) * dir;
        if (sortBy === "submittedAt")
          return (new Date(a.submittedAt) - new Date(b.submittedAt)) * dir;
        if (sortBy === "expectedCloseDate")
          return (new Date(a.expectedCloseDate) - new Date(b.expectedCloseDate)) * dir;
        return String(a[sortBy] || "").localeCompare(String(b[sortBy] || "")) * dir;
      });
    return arr;
  }, [items, search, countryFilter, sortBy, sortDir]);

  // Map init/update
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled) return;
        if (!leafletMap.current) {
          const el = mapRef.current;
          if (!el) return;
          leafletMap.current = L.map(el).setView([1.3521, 103.8198], 5); // region
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap",
            maxZoom: 18,
          }).addTo(leafletMap.current);
        }
        // clear old layers except tile
        leafletMap.current.eachLayer((layer) => {
          if (!layer.getAttribution) leafletMap.current.removeLayer(layer);
        });
        // add circles
        const Lmap = leafletMap.current;
        const Lg = window.L;
        const groups = new Map();
        for (const r of visible) {
          const key = `${r.city}|${r.country}|${r.lat}|${r.lng}`;
          const prev = groups.get(key) || { total: 0, count: 0, any: r };
          prev.total += Number(r._valueAUD || 0);
          prev.count += 1;
          groups.set(key, prev);
        }
        groups.forEach((g) => {
          const lat = Number(g.any.lat) || 0;
          const lng = Number(g.any.lng) || 0;
          const radius = Math.min(40000, Math.max(8000, Math.sqrt(g.total || 0) * 20));
          const colorByStatus = (s) => {
            if (s === "approved") return "green";
            if (s === "closed" || s === "lost") return "red";
            return "blue";
          };
          const status = g.any.status || "pending";
          const circle = Lg.circle([lat, lng], {
            radius,
            color: colorByStatus(status),
            fillOpacity: 0.25,
          }).addTo(Lmap);
          circle.bindPopup(
            `<div style="min-width:180px">
               <div><strong>${g.any.city || "Unknown"}, ${g.any.country || ""}</strong></div>
               <div>Deals: ${g.count}</div>
               <div>Total AUD: ${Math.round(g.total).toLocaleString()}</div>
             </div>`
          );
        });
      })
      .catch((e) => console.warn("Map init failed:", e));
    return () => void (cancelled = true);
  }, [visible]);

  return (
    <>
      {/* Controls */}
      <div className="sticky top-2 z-30 bg-white/90 backdrop-blur rounded-xl border p-3 mb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
              <option>All</option>
              <option>Singapore</option>
              <option>Malaysia</option>
              <option>Indonesia</option>
              <option>Philippines</option>
            </Select>
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="submittedAt">Submitted</option>
              <option value="expectedCloseDate">Expected</option>
              <option value="customerName">Customer</option>
              <option value="customerLocation">Location</option>
              <option value="solution">Solution</option>
              <option value="value">Value (AUD)</option>
              <option value="stage">Stage</option>
              <option value="status">Status</option>
            </Select>
            <Select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className={"px-3 py-2 rounded-lg text-white " + BRAND.primaryBtn}>
              Refresh
            </button>
            <button onClick={loadFx} className={"px-3 py-2 rounded-lg text-white " + BRAND.orangeBtn}>
              FX Settings
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full rounded-2xl border"
        style={{ height: 380, background: "#eef2f6" }}
      >
        {!window.L && (
          <div className="p-3 text-sm text-gray-600">Loading map…</div>
        )}
      </div>

      {/* Table */}
      <Card className="mt-4">
        <CardHeader
          title="Registered Deals"
          subtitle="Approve or Close to update status"
        />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#fdf4e6] text-[#0e3446]">
                  <th className="p-3 text-left">Submitted</th>
                  <th className="p-3 text-left">Expected</th>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-left">Solution</th>
                  <th className="p-3 text-left">Value (AUD)</th>
                  <th className="p-3 text-left">Stage</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-3">{String(r.submittedAt || "").slice(0, 10)}</td>
                    <td className="p-3">{String(r.expectedCloseDate || "").slice(0, 10)}</td>
                    <td className="p-3">{r.customerName || "-"}</td>
                    <td className="p-3">{r.customerLocation || "-"}</td>
                    <td className="p-3">{r.solution || "-"}</td>
                    <td className="p-3">
                      {r._valueAUD !== "" ? Math.round(r._valueAUD).toLocaleString() : "-"}
                    </td>
                    <td className="p-3">{r.stage || "-"}</td>
                    <td className="p-3">
                      <span
                        className={
                          "px-2 py-1 rounded-md text-white " +
                          (r.status === "approved"
                            ? "bg-green-600"
                            : r.status === "closed" || r.status === "lost"
                            ? "bg-red-600"
                            : "bg-blue-600")
                        }
                      >
                        {r.status || "pending"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {r.status !== "approved" && (
                          <button
                            className="px-2.5 py-1.5 rounded-md bg-green-600 text-white"
                            onClick={() => setStatus(r.id, "approved")}
                          >
                            Approve
                          </button>
                        )}
                        {r.status !== "closed" && (
                          <button
                            className="px-2.5 py-1.5 rounded-md bg-red-600 text-white"
                            onClick={() => setStatus(r.id, "closed")}
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
                    <td colSpan={9} className="p-6 text-center text-gray-500">
                      No rows. Click Refresh.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <AdminSettings
        open={fxOpen}
        onClose={() => setFxOpen(false)}
        rows={fxRows}
        onChange={setFxRows}
        onSave={saveFx}
        saving={savingFx}
      />
    </>
  );
}

/***** ROOT APP *****/
function AppShell() {
  const [tab, setTab] = useState("reseller"); // 'reseller' | 'admin'
  const [items, setItems] = useState([]);
  const [locale, setLocale] = useState("en");
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");

  const tryLogin = () => {
    if (pwd === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwd("");
      setTab("admin");
    } else {
      alert("Wrong password");
    }
  };
  const logout = () => setAuthed(false);

  // simple self-test
  useEffect(() => {
    try {
      if (addDays("2025-01-01", 1) !== "2025-01-02") throw new Error("addDays");
      if (!withinNext60Days(addDays(todayLocalISO(), 14))) throw new Error("within60");
      console.log("✅ Self-tests passed");
    } catch (e) {
      console.warn("⚠️ Self-tests failed:", e);
    }
  }, []);

  return (
    <div>
      {/* Top bar */}
      <div
        className="w-full border-b"
        style={{ background: "#ffffff" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="Aptella"
              style={{ height: 36, width: "auto" }}
            />
            <div className="h-6 w-px bg-gray-300 mx-1" />
            <div className="text-sm text-[#0e3446]">
              Master Distributor Deal Registration
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <button
              className={
                "px-3 py-2 rounded-lg " +
                (tab === "reseller" ? "bg-[#0e3446] text-white" : "bg-gray-100 text-[#0e3446]")
              }
              onClick={() => setTab("reseller")}
            >
              Reseller
            </button>
            <button
              className={
                "px-3 py-2 rounded-lg " +
                (tab === "admin" ? "bg-[#0e3446] text-white" : "bg-gray-100 text-[#0e3446]")
              }
              onClick={() => setTab("admin")}
            >
              Admin
            </button>
            {authed ? (
              <button className={"px-3 py-2 rounded-lg text-white " + BRAND.orangeBtn} onClick={logout}>
                Logout
              </button>
            ) : (
              <></>
            )}
          </nav>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === "reseller" && (
          <SubmissionForm
            onLocalSave={(row) => setItems((prev) => [row, ...prev])}
            onSyncOne={() => {}}
            existingItems={items}
            onLocale={setLocale}
          />
        )}
        {tab === "admin" &&
          (authed ? (
            <AdminPanel items={items} setItems={setItems} />
          ) : (
            <Card>
              <CardHeader title="Admin Login" subtitle="Enter the admin password" />
              <CardBody>
                <div className="flex items-center gap-2">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                  />
                  <button
                    className={"px-3 py-2 rounded-lg text-white " + BRAND.primaryBtn}
                    onClick={tryLogin}
                  >
                    Login
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
      </div>
    </div>
  );
}

export default AppShell;
