import React, { useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "./assets/aptella-logo.svg";

/* ======================== BRAND & GLOBAL UTILS ======================== */

const BRAND = {
  navy: "#0e3446",
  navyDark: "#0b2938",
  orange: "#f0a03a",
  primaryBtn: "bg-[#0e3446] hover:bg-[#0b2938]",
};

const ADMIN_PASSWORD = "Aptella2025!";

// ---- GAS URL (deploy “Execute as me / Anyone”) ----
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";

// ---- Avoid CORS preflight with text/plain ----
async function gasGet(action) {
  const url = `${GAS_URL}?action=${encodeURIComponent(action)}`;
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  if (!res.ok || !json || json.ok === false) {
    throw new Error(
      (json && json.error) || `GET ${action} failed: ${res.status} ${res.statusText}`
    );
  }
  return json;
}
async function gasPost(action, payload) {
  const url = `${GAS_URL}?action=${encodeURIComponent(action)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // IMPORTANT
    body: JSON.stringify(payload || {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  if (!res.ok || !json || json.ok === false) {
    throw new Error(
      (json && json.error) || `POST ${action} failed: ${res.status} ${res.statusText}`
    );
  }
  return json;
}

// ---- Dates & IDs ----
function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addDays(dateISO, days) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + Number(days || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ======================== CONSTANTS & CONFIG ======================== */

const CURRENCIES = ["SGD", "IDR", "MYR", "PHP", "AUD", "USD"];
const STAGES = [
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];
const PROB_BY_STAGE = { qualified: 35, proposal: 55, negotiation: 70, won: 100, lost: 0 };

const INDUSTRIES = [
  "Construction",
  "Public Safety",
  "Government",
  "Utilities",
  "Transport & Logistics",
  "Oil & Gas / Mining",
  "Agriculture",
  "Telecommunications",
  "Education",
  "Other",
];

const XGRIDS_SOLUTIONS = ["Xgrids L2 PRO", "Xgrids K1", "Xgrids PortalCam", "Xgrids Drone Kit"];
const SUPPORT_OPTIONS = [
  "Pre-sales engineer",
  "Demo / loan unit",
  "Pricing exception",
  "Marketing materials",
  "Partner training",
  "On-site customer visit",
  "Extended lock request",
];

const COUNTRY_CONFIG = {
  "Singapore": { capital: "Singapore", lat: 1.3521, lng: 103.8198, currency: "SGD" },
  "Malaysia": { capital: "Kuala Lumpur", lat: 3.139, lng: 101.6869, currency: "MYR" },
  "Indonesia": { capital: "Jakarta", lat: -6.2088, lng: 106.8456, currency: "IDR" },
  "Philippines": { capital: "Manila", lat: 14.5995, lng: 120.9842, currency: "PHP" },
};

// Minimal UI atoms (avoid external component libs)
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white shadow-sm border border-gray-200 ${className}`}>
      {children}
    </div>
  );
}
function CardHeader({ title, subtitle, actions }) {
  return (
    <div className="p-5 border-b border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </div>
  );
}
function CardBody({ children }) {
  return <div className="p-5">{children}</div>;
}
function Label({ children, required, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-800">
      {children} {required && <span className="text-red-600">*</span>}
    </label>
  );
}
function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[${BRAND.orange}] ${props.className || ""}`}
    />
  );
}
function Select(props) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[${BRAND.orange}] ${props.className || ""}`}
    />
  );
}
function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[${BRAND.orange}] ${props.className || ""}`}
    />
  );
}

/* ======================== BRAND STRIP ======================== */
function BrandStrip() {
  return (
    <div className="w-full bg-white/90 sticky top-0 z-40 border-b border-gray-200 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={logoUrl} alt="Aptella" className="h-12 w-auto" />
          <div className="text-[13px] font-medium tracking-wide text-[#0e3446]">
            Master Distributor • Xgrids
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================== FX SETTINGS MODAL ======================== */
function FxModal({ open, onClose, ratesAUD, onSave, saving }) {
  const [local, setLocal] = useState(ratesAUD || {});
  useEffect(() => setLocal(ratesAUD || {}), [ratesAUD, open]);

  if (!open) return null;
  const rows = Object.entries(local);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[min(720px,95vw)] rounded-2xl bg-white shadow-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold">FX Rates to AUD</h3>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100">
            Close
          </button>
        </div>
        <div className="p-5 space-y-3 max-h-[60vh] overflow-auto">
          <div className="grid grid-cols-3 text-sm font-medium text-gray-600">
            <div>Currency</div>
            <div>Rate → AUD</div>
            <div></div>
          </div>
          {rows.map(([ccy, rate]) => (
            <div key={ccy} className="grid grid-cols-3 items-center gap-2">
              <Input
                value={ccy}
                onChange={(e) => {
                  const next = e.target.value.toUpperCase();
                  setLocal((p) => {
                    const { [ccy]: _, ...rest } = p;
                    return { ...rest, [next]: rate };
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
                  const cp = { ...p };
                  delete cp[ccy];
                  return cp;
                })}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="text-sm px-3 py-1 rounded-md bg-gray-100"
            onClick={() => setLocal((p) => ({ ...p, USD: p.USD || 0.67 }))}
          >
            + Add Row
          </button>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100">
            Cancel
          </button>
          <button
            disabled={!!saving}
            onClick={() => onSave(local)}
            className={`px-3 py-1.5 rounded-lg text-white ${BRAND.primaryBtn}`}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================== RESLLER FORM ======================== */
function ResellerForm({ onSaved }) {
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
    otherSolution: "",
    stage: "qualified",
    probability: PROB_BY_STAGE["qualified"],
    expectedCloseDate: addDays(todayLocalISO(), 14),
    supports: [],
    competitors: [],
    notes: "",
    evidenceLinks: [],
    evidenceFiles: [],
    remindersOptIn: false,
  });
  const [errors, setErrors] = useState({});
  const [linkInput, setLinkInput] = useState("");
  const isID = form.resellerCountry === "Indonesia";

  // Bahasa labels for key fields
  function t(en, id) {
    return isID ? id : en;
  }

  useEffect(() => {
    // Auto probability by stage
    setForm((f) => ({ ...f, probability: PROB_BY_STAGE[f.stage] ?? f.probability }));
  }, [form.stage]);

  useEffect(() => {
    // Country → default currency, capital lat/lng, resellerLocation
    const cfg = COUNTRY_CONFIG[form.resellerCountry];
    if (!cfg) {
      setForm((f) => ({ ...f, currency: "", lat: "", lng: "", resellerLocation: "" }));
    } else {
      setForm((f) => ({
        ...f,
        currency: cfg.currency,
        lat: cfg.lat,
        lng: cfg.lng,
        resellerLocation: cfg.capital,
        country: form.resellerCountry, // mirror
        customerLocation: f.city
          ? `${f.city}, ${form.resellerCountry}`
          : `${cfg.capital}, ${form.resellerCountry}`,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.resellerCountry]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function toggleMulti(listName, value) {
    setForm((f) => {
      const next = new Set(f[listName] || []);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...f, [listName]: Array.from(next) };
    });
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    setForm((f) => ({ ...f, evidenceFiles: files }));
  }

  function validate() {
    const e = {};
    if (!form.resellerCountry) e.resellerCountry = t("Required", "Wajib");
    if (!form.resellerLocation) e.resellerLocation = t("Required", "Wajib");
    if (!form.resellerName) e.resellerName = t("Required", "Wajib");
    if (!form.resellerContact) e.resellerContact = t("Required", "Wajib");
    if (!form.resellerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail))
      e.resellerEmail = t("Valid email required", "Email valid wajib");
    if (!form.customerName) e.customerName = t("Required", "Wajib");
    if (!form.city) e.city = t("Required", "Wajib");
    if (!form.country) e.country = t("Required", "Wajib");
    if (!form.solution || (form.solution === "OTHER" && !form.otherSolution))
      e.solution = t("Required", "Wajib");
    if (!form.value || Number(form.value) <= 0) e.value = t("Enter a positive amount", "Masukkan nilai positif");
    if (!form.expectedCloseDate) e.expectedCloseDate = t("Required", "Wajib");
    // Evidence mandatory: at least 1 file OR link
    const hasFiles = (form.evidenceFiles || []).length > 0;
    const hasLinks = (form.evidenceLinks || []).length > 0;
    if (!hasFiles && !hasLinks) e.evidence = t("Evidence file or link is required", "Bukti (file/tautan) wajib");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    const record = {
      id: uid(),
      submittedAt: todayLocalISO(),
      resellerCountry: form.resellerCountry || "",
      resellerLocation: form.resellerLocation || "",
      resellerName: form.resellerName || "",
      resellerContact: form.resellerContact || "",
      resellerEmail: form.resellerEmail || "",
      resellerPhone: form.resellerPhone || "",
      customerName: form.customerName || "",
      customerLocation: form.customerLocation || "",
      city: form.city || "",
      country: form.country || "",
      lat: Number(form.lat || 0),
      lng: Number(form.lng || 0),
      industry: form.industry || "",
      currency: form.currency || "",
      value: Number(form.value || 0),
      solution: form.solution === "OTHER" ? (form.otherSolution || "") : form.solution,
      stage: form.stage || "qualified",
      probability: Number(form.probability || 0),
      expectedCloseDate: form.expectedCloseDate || todayLocalISO(),
      status: "pending",
      lockExpiry: "",
      syncedAt: todayLocalISO(),
      remindersOptIn: !!form.remindersOptIn,
      supports: form.supports || [],
      competitors: form.competitors || [],
      notes: form.notes || "",
      evidenceLinks: form.evidenceLinks || [],
      updates: [],
    };

    try {
      await gasPost("submit", record);
      alert(isID ? "Dikirim & disimpan." : "Submitted.");
      onSaved && onSaved();
      // reset
      setForm((f) => ({
        ...f,
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
        value: "",
        solution: "",
        otherSolution: "",
        supports: [],
        competitors: [],
        notes: "",
        evidenceLinks: [],
        evidenceFiles: [],
        remindersOptIn: false,
        expectedCloseDate: addDays(todayLocalISO(), 14),
      }));
      const el = document.getElementById("evidenceFiles");
      if (el) el.value = "";
    } catch (err) {
      alert((isID ? "Gagal sinkronisasi" : "Google Sheets sync failed") + ": " + err.message);
    }
  }

  return (
    <Card>
      <CardHeader
        title={
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold text-[#0e3446]">
              {t("Reseller Deal Registration", "Registrasi Deal Reseller")}
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#f0a03a]/15 text-[#9a5b12] border border-[#f0a03a]/30">
              Within 60 days
            </span>
          </div>
        }
        subtitle={t("Fields marked * are mandatory.", "Kolom bertanda * wajib diisi.")}
      />
      <CardBody>
        <form onSubmit={submit} className="grid gap-6">
          {/* Top row */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="resellerCountry" required>{t("Reseller Country", "Negara Reseller")}</Label>
              <Select
                id="resellerCountry"
                name="resellerCountry"
                value={form.resellerCountry}
                onChange={handleChange}
              >
                <option value="">{t("Select country", "Pilih negara")}</option>
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
              <Label htmlFor="resellerLocation" required>{t("Reseller Location", "Lokasi Reseller")}</Label>
              <Input
                id="resellerLocation"
                name="resellerLocation"
                value={form.resellerLocation}
                onChange={handleChange}
                placeholder={t("e.g., Jakarta", "mis., Jakarta")}
              />
              {errors.resellerLocation && (
                <p className="text-xs text-red-600">{errors.resellerLocation}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">{t("Currency", "Mata Uang")}</Label>
              <Select id="currency" name="currency" value={form.currency} onChange={handleChange}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Reseller identity */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="resellerName" required>{t("Reseller Company", "Perusahaan Reseller")}</Label>
              <Input id="resellerName" name="resellerName" value={form.resellerName} onChange={handleChange} />
              {errors.resellerName && <p className="text-xs text-red-600">{errors.resellerName}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerContact" required>{t("Primary Contact", "Kontak Utama")}</Label>
              <Input id="resellerContact" name="resellerContact" value={form.resellerContact} onChange={handleChange} />
              {errors.resellerContact && <p className="text-xs text-red-600">{errors.resellerContact}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerEmail" required>{t("Contact Email", "Email Kontak")}</Label>
              <Input id="resellerEmail" name="resellerEmail" type="email" value={form.resellerEmail} onChange={handleChange} />
              {errors.resellerEmail && <p className="text-xs text-red-600">{errors.resellerEmail}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerPhone">{t("Contact Phone", "Telepon Kontak")}</Label>
              <Input id="resellerPhone" name="resellerPhone" value={form.resellerPhone} onChange={handleChange} />
            </div>
          </div>

          {/* Customer location */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city" required>{t("Customer City", "Kota Pelanggan")}</Label>
              <Input
                id="city"
                name="city"
                value={form.city}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    city: v,
                    customerLocation: `${v || ""}${f.country ? `, ${f.country}` : ""}`,
                  }));
                }}
              />
              {errors.city && <p className="text-xs text-red-600">{errors.city}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country" required>{t("Customer Country", "Negara Pelanggan")}</Label>
              <Select
                id="country"
                name="country"
                value={form.country}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    country: v,
                    customerLocation: `${f.city ? f.city : ""}${v ? `, ${v}` : ""}`,
                  }));
                }}
              >
                <option value="">{t("Select country", "Pilih negara")}</option>
                <option>Singapore</option>
                <option>Malaysia</option>
                <option>Indonesia</option>
                <option>Philippines</option>
              </Select>
              {errors.country && <p className="text-xs text-red-600">{errors.country}</p>}
            </div>
            <div className="grid gap-2">
              <Label>{t("Map option (paste lat, lng)", "Opsi peta (tempel lat, lng)")}</Label>
              <div className="flex gap-2">
                <Input placeholder="lat" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} />
                <Input placeholder="lng" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} />
              </div>
              <a
                className={`inline-block mt-1 text-xs underline text-[#0e3446]`}
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

          {/* Solution / expected */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2 md:col-span-2">
              <Label required>{t("Solution Offered (Xgrids)", "Solusi Xgrids")}</Label>
              <Select
                value={form.solution || ""}
                onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
              >
                <option value="">{t("Select an Xgrids solution", "Pilih solusi Xgrids")}</option>
                {XGRIDS_SOLUTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="OTHER">+ Other…</option>
              </Select>
              {form.solution === "OTHER" && (
                <Input
                  placeholder={t("Describe the solution", "Jelaskan solusi")}
                  value={form.otherSolution}
                  onChange={(e) => setForm((f) => ({ ...f, otherSolution: e.target.value }))}
                />
              )}
              <a
                className="text-sky-700 underline text-xs mt-1"
                href="https://www.aptella.com/asia/product-brands/xgrids-asia/"
                target="_blank"
                rel="noreferrer"
              >
                Learn about Xgrids solutions
              </a>
              {errors.solution && <p className="text-xs text-red-600">{errors.solution}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expectedCloseDate" required>{t("Expected Close Date", "Perkiraan Tanggal Tutup")}</Label>
              <Input
                id="expectedCloseDate"
                name="expectedCloseDate"
                type="date"
                value={form.expectedCloseDate}
                onChange={handleChange}
              />
              {errors.expectedCloseDate && (
                <p className="text-xs text-red-600">{errors.expectedCloseDate}</p>
              )}
            </div>
          </div>

          {/* Industry / currency / value */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="industry">{t("Industry", "Industri")}</Label>
              <Select id="industry" name="industry" value={form.industry} onChange={handleChange}>
                <option value="">{t("Select industry", "Pilih industri")}</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">{t("Currency", "Mata Uang")}</Label>
              <Select id="currency" name="currency" value={form.currency} onChange={handleChange}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="value" required>{t("Deal Value", "Nilai Transaksi")}</Label>
              <Input
                id="value"
                name="value"
                type="number"
                step="0.01"
                min="0"
                value={form.value}
                onChange={handleChange}
                placeholder="e.g., 25000"
              />
              {errors.value && <p className="text-xs text-red-600">{errors.value}</p>}
            </div>
          </div>

          {/* Stage / Probability / Competitors */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="stage">{t("Sales Stage", "Tahap Penjualan")}</Label>
              <Select id="stage" name="stage" value={form.stage} onChange={handleChange}>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("Probability (%)", "Probabilitas (%)")}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.probability}
                onChange={(e) =>
                  setForm((f) => ({ ...f, probability: Number(e.target.value) }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("Competitors", "Pesaing")}</Label>
              <Input
                placeholder={t("Comma-separated (optional)", "Pisahkan dengan koma (opsional)")}
                value={(form.competitors || []).join(", ")}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    competitors: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </div>
          </div>

          {/* Support tickboxes */}
          <div className="grid gap-2">
            <Label>{t("Support requested", "Dukungan yang diminta")}</Label>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SUPPORT_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={(form.supports || []).includes(opt)}
                    onChange={() => toggleMulti("supports", opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* Evidence required */}
          <div className="grid gap-2">
            <Label>{t("Evidence (required)", "Bukti (wajib)")}</Label>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <input
                  id="evidenceFiles"
                  type="file"
                  multiple
                  onChange={handleFiles}
                  className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sky-700"
                />
                {form.evidenceFiles?.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    {form.evidenceFiles.length} file(s) chosen — emailed to{" "}
                    <span className="font-medium">admin.asia@aptella.com</span> by your team.
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t("Paste evidence link", "Tempel tautan bukti")}
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = (linkInput || "").trim();
                    if (!v) return;
                    try {
                      new URL(v);
                    } catch {
                      alert(t("Enter a valid URL", "Masukkan URL valid"));
                      return;
                    }
                    setForm((f) => ({ ...f, evidenceLinks: [...(f.evidenceLinks || []), v] }));
                    setLinkInput("");
                  }}
                  className="px-3 py-2 rounded-lg bg-gray-100 text-sm"
                >
                  {t("Add", "Tambah")}
                </button>
              </div>
            </div>
            {errors.evidence && <p className="text-xs text-red-600">{errors.evidence}</p>}
          </div>

          {/* Notes & consents */}
          <div className="grid gap-2">
            <Label htmlFor="notes">{t("Notes", "Catatan")}</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              value={form.notes}
              onChange={handleChange}
              placeholder={t(
                "Key requirements, technical scope, delivery constraints, decision process, etc.",
                "Kebutuhan, ruang lingkup teknis, kendala pengiriman, proses keputusan, dll."
              )}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="remindersOptIn"
                checked={!!form.remindersOptIn}
                onChange={handleChange}
              />
              {t("Send me reminders for updates", "Kirim pengingat pembaruan")}
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className={`px-4 py-2 rounded-xl text-white ${BRAND.primaryBtn}`}>
              {t("Submit Registration", "Kirim Pendaftaran")}
            </button>
            <a
              className="px-4 py-2 rounded-xl bg-[#f0a03a]/15 text-[#9a5b12] border border-[#f0a03a]/30 text-sm"
              href="https://www.aptella.com/asia/product-brands/xgrids-asia/"
              target="_blank"
              rel="noreferrer"
            >
              Xgrids Info →
            </a>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/* ======================== ADMIN PANEL ======================== */

function valueAUD(row, rates) {
  const v = Number(row.value || 0);
  const ccy = String(row.currency || "").toUpperCase();
  if (ccy === "AUD") return v;
  const r = Number(rates?.[ccy] || 0); // rate to AUD
  return v * r;
}

function AdminPanel({ items, setItems, ratesAUD, setRatesAUD }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markersRef = useRef([]);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("submittedAt_desc");
  const [fxOpen, setFxOpen] = useState(false);
  const [fxSaving, setFxSaving] = useState(false);

  // Load data
  async function refresh() {
    const { rows } = await gasGet("list");
    setItems(rows || []);
  }

  async function fxLoad() {
    const { rows } = await gasGet("fx");
    const map = {};
    (rows || []).forEach((r) => {
      if (r.ccy) map[r.ccy] = Number(r.rate || 0);
    });
    setRatesAUD(map);
  }
  async function fxSave(map) {
    setFxSaving(true);
    try {
      const rows = Object.entries(map || {}).map(([ccy, rate]) => ({ ccy, rate: Number(rate || 0) }));
      await gasPost("fx", { rows });
      await fxLoad();
      setFxOpen(false);
    } finally {
      setFxSaving(false);
    }
  }

  useEffect(() => {
    // first load
    refresh().catch((e) => alert("Refresh failed: " + e.message));
    fxLoad().catch((e) => alert("FX load failed: " + e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = items || [];
    if (q) {
      arr = arr.filter((r) => {
        const hay = [
          r.submittedAt,
          r.expectedCloseDate,
          r.customerName,
          r.customerLocation,
          r.solution,
          r.stage,
          r.status,
          r.resellerName,
          r.resellerEmail,
          r.currency,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    // sorting
    const [key, dir] = sort.split("_");
    const mul = dir === "asc" ? 1 : -1;
    arr = [...arr].sort((a, b) => {
      let va, vb;
      if (key === "valueAUD") {
        va = valueAUD(a, ratesAUD);
        vb = valueAUD(b, ratesAUD);
      } else {
        va = a[key];
        vb = b[key];
      }
      if (va == null && vb == null) return 0;
      if (va == null) return -1 * mul;
      if (vb == null) return 1 * mul;
      if (!isNaN(Number(va)) && !isNaN(Number(vb))) return (Number(va) - Number(vb)) * mul;
      return String(va).localeCompare(String(vb)) * mul;
    });
    return arr;
  }, [items, search, sort, ratesAUD]);

  // Approve / Close
  async function doApprove(row) {
    const patch = {
      status: "approved",
      lockExpiry: addDays(todayLocalISO(), 60),
    };
    await gasPost("update", { id: row.id, patch });
    await refresh();
  }
  async function doClose(row) {
    const patch = { status: "closed" };
    await gasPost("update", { id: row.id, patch });
    await refresh();
  }

  // Leaflet map via CDN (don’t import 'leaflet' to avoid bundle errors)
  useEffect(() => {
    const L = window.L;
    if (!mapRef.current || !L) return;

    // Init map once
    if (!mapObj.current) {
      mapObj.current = L.map(mapRef.current).setView([ -2.5, 114.0 ], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(mapObj.current);
      setTimeout(() => mapObj.current && mapObj.current.invalidateSize(), 150);
    }

    // Clear markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Build clusters (rough grid) and draw
    const grid = new Map(); // key -> {lat,lng,total,count}
    const rows = filtered;
    rows.forEach((r) => {
      const la = Number(r.lat || 0);
      const ln = Number(r.lng || 0);
      if (!la && !ln) return;
      const cellLat = Math.round(la * 2) / 2; // 0.5° grid
      const cellLng = Math.round(ln * 2) / 2;
      const key = `${cellLat},${cellLng}`;
      const aud = valueAUD(r, ratesAUD);
      if (!grid.has(key)) grid.set(key, { lat: cellLat, lng: cellLng, total: 0, count: 0 });
      const g = grid.get(key);
      g.total += aud;
      g.count += 1;
    });

    const L2 = window.L;
    grid.forEach((g) => {
      const size = Math.min(64, 18 + Math.sqrt(g.total || 0) * 0.5);
      const html = `
        <div style="
          background:${BRAND.orange};
          color:#1f2937;
          border:2px solid rgba(0,0,0,.15);
          width:${size}px;height:${size}px;line-height:${size}px;
          border-radius:999px;text-align:center;
          font-weight:700;font-size:12px;box-shadow:0 8px 16px rgba(0,0,0,.15);
        ">
          ${Math.round(g.total).toLocaleString("en-AU")}
        </div>`;
      const icon = L2.divIcon({
        html,
        className: "aptella-bubble",
        iconSize: [size, size],
      });
      const m = L2.marker([g.lat, g.lng], { icon }).addTo(mapObj.current);
      markersRef.current.push(m);
    });
  }, [filtered, ratesAUD]);

  const totalAUD = useMemo(
    () =>
      (filtered || []).reduce((sum, r) => sum + valueAUD(r, ratesAUD), 0),
    [filtered, ratesAUD]
  );

  return (
    <>
      <FxModal
        open={fxOpen}
        onClose={() => setFxOpen(false)}
        ratesAUD={ratesAUD}
        onSave={fxSave}
        saving={fxSaving}
      />

      {/* Controls */}
      <div className="sticky top-[68px] z-30 bg-white/90 backdrop-blur rounded-xl border p-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => refresh().catch((e) => alert("Refresh failed: " + e.message))}
              className={`px-3 py-2 rounded-lg text-white ${BRAND.primaryBtn}`}
            >
              Refresh
            </button>
            <button
              onClick={() => setFxOpen(true)}
              className="px-3 py-2 rounded-lg bg-gray-100"
            >
              FX Settings
            </button>
            <div className="ml-2 text-sm">
              <span className="font-semibold text-slate-800">Total AUD:</span>{" "}
              <span className="text-[#0e3446] font-semibold">
                {Math.round(totalAUD).toLocaleString("en-AU")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="submittedAt_desc">Submitted (newest)</option>
              <option value="submittedAt_asc">Submitted (oldest)</option>
              <option value="expectedCloseDate_asc">Expected (soonest)</option>
              <option value="expectedCloseDate_desc">Expected (latest)</option>
              <option value="customerLocation_asc">Location (A→Z)</option>
              <option value="customerLocation_desc">Location (Z→A)</option>
              <option value="solution_asc">Solution (A→Z)</option>
              <option value="solution_desc">Solution (Z→A)</option>
              <option value="valueAUD_desc">Value AUD (high→low)</option>
              <option value="valueAUD_asc">Value AUD (low→high)</option>
              <option value="stage_asc">Stage (A→Z)</option>
              <option value="stage_desc">Stage (Z→A)</option>
              <option value="status_asc">Status (A→Z)</option>
              <option value="status_desc">Status (Z→A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map */}
      <Card className="mb-4">
        <CardHeader title="Deal Map" />
        <CardBody>
          <div
            ref={mapRef}
            id="aptella-map"
            className="w-full h-[360px] rounded-xl border border-gray-200"
            style={{ zIndex: 0 }}
          />
          {!window.L && (
            <div className="text-sm text-gray-500 mt-2">
              Map placeholder — include Leaflet CDN in <code>index.html</code>.
            </div>
          )}
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader
          title={
            <div className="text-[#f0a03a] font-semibold">
              Registrations ({filtered.length})
            </div>
          }
        />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f0a03a]/10">
                <tr className="text-[#9a5b12]">
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
                {filtered.map((r) => {
                  const aud = valueAUD(r, ratesAUD);
                  const statusColor =
                    r.status === "approved"
                      ? "text-green-700"
                      : r.status === "closed"
                      ? "text-red-700"
                      : "text-blue-700";
                  return (
                    <tr key={r.id} className="border-b">
                      <td className="p-3">{r.submittedAt || ""}</td>
                      <td className="p-3">{r.expectedCloseDate || ""}</td>
                      <td className="p-3">{r.customerName || ""}</td>
                      <td className="p-3">{r.customerLocation || ""}</td>
                      <td className="p-3">{r.solution || ""}</td>
                      <td className="p-3 font-semibold">
                        {Math.round(aud).toLocaleString("en-AU")}
                      </td>
                      <td className="p-3">
                        {r.stage}{" "}
                        <span className="text-xs text-gray-500">({r.probability}%)</span>
                      </td>
                      <td className={`p-3 ${statusColor}`}>{r.status || "pending"}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {r.status !== "approved" && r.status !== "closed" && (
                            <button
                              onClick={() =>
                                doApprove(r).catch((e) =>
                                  alert("Update failed: " + e.message)
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-white ${BRAND.primaryBtn}`}
                            >
                              Approve
                            </button>
                          )}
                          {r.status !== "closed" && (
                            <button
                              onClick={() =>
                                doClose(r).catch((e) =>
                                  alert("Update failed: " + e.message)
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-gray-100"
                            >
                              Close
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-sm text-gray-500">
                      No rows found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </>
  );
}

/* ======================== ROOT APP ======================== */

function AptellaRoot() {
  const [tab, setTab] = useState("reseller"); // reseller | admin
  const [items, setItems] = useState([]);
  const [ratesAUD, setRatesAUD] = useState({});
  const [adminAuthed, setAdminAuthed] = useState(
    () => sessionStorage.getItem("aptellaAdminAuthed") === "1"
  );
  const [pwd, setPwd] = useState("");

  function doLogin(e) {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) {
      setAdminAuthed(true);
      sessionStorage.setItem("aptellaAdminAuthed", "1");
    } else {
      alert("Wrong password.");
    }
  }
  function doLogout() {
    setAdminAuthed(false);
    sessionStorage.removeItem("aptellaAdminAuthed");
  }

  return (
    <div className="min-h-screen bg-[#f7fafc] text-slate-900">
      <BrandStrip />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-[#0e3446]">Aptella Reseller Portal</div>
          </div>
          <nav className="flex items-center gap-2">
            <button
              className={`px-3 py-2 rounded-lg ${
                tab === "reseller" ? "bg-[#0e3446] text-white" : "bg-gray-100 text-[#0e3446]"
              }`}
              onClick={() => setTab("reseller")}
            >
              Reseller
            </button>
            <button
              className={`px-3 py-2 rounded-lg ${
                tab === "admin" ? "bg-[#0e3446] text-white" : "bg-gray-100 text-[#0e3446]"
              }`}
              onClick={() => setTab("admin")}
            >
              Admin
            </button>

            {adminAuthed ? (
              <button onClick={doLogout} className="px-3 py-2 rounded-lg bg-gray-100">
                Logout
              </button>
            ) : null}
          </nav>
        </div>

        {/* Tabs */}
        {tab === "reseller" ? (
          <ResellerForm onSaved={() => { /* no-op */ }} />
        ) : adminAuthed ? (
          <AdminPanel
            items={items}
            setItems={setItems}
            ratesAUD={ratesAUD}
            setRatesAUD={setRatesAUD}
          />
        ) : (
          <Card>
            <CardHeader title="Admin Login" />
            <CardBody>
              <form onSubmit={doLogin} className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="Enter admin password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  style={{ maxWidth: 260 }}
                />
                <button className={`px-3 py-2 rounded-lg text-white ${BRAND.primaryBtn}`}>
                  Login
                </button>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

export default AptellaRoot;
