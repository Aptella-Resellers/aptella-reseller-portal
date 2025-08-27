import React, { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import logoUrl from "./assets/aptella-logo.svg"; // ensure this file exists (SVG or PNG is fine)

// ====== CONFIG ======
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";

const ADMIN_PASS = "Aptella2025!"; // as requested

// Countries → default capital coords + currency + locale
const COUNTRY_CONFIG = {
  "": { currency: "", capital: "", lat: null, lng: null, locale: "en" },
  Singapore: { currency: "SGD", capital: "Singapore", lat: 1.3521, lng: 103.8198, locale: "en" },
  Malaysia: { currency: "MYR", capital: "Kuala Lumpur", lat: 3.139, lng: 101.6869, locale: "en" },
  Indonesia: { currency: "IDR", capital: "Jakarta", lat: -6.2088, lng: 106.8456, locale: "id" },
  Philippines: { currency: "PHP", capital: "Manila", lat: 14.5995, lng: 120.9842, locale: "en" },
};

// PROB by stage
const STAGES = [
  { key: "qualified", label: "Qualified", prob: 35 },
  { key: "proposal", label: "Proposal", prob: 55 },
  { key: "negotiation", label: "Negotiation", prob: 70 },
  { key: "won", label: "Won", prob: 100 },
  { key: "lost", label: "Lost", prob: 0 },
];

const XGRIDS_SOLUTIONS = [
  "Xgrids L2 PRO",
  "Xgrids K1",
  "Xgrids PortalCam",
  "Xgrids Drone Kit",
  "+ Other",
];

// Support tick-boxes
const SUPPORT_OPTIONS = [
  "Pre-sales engineer",
  "Demo / loan unit",
  "Pricing exception",
  "Marketing materials",
  "Partner training",
  "On-site customer visit",
  "Extended lock request",
];

// Industry options (restored)
const INDUSTRIES = [
  "Architecture / Engineering",
  "Construction",
  "Facilities / FM",
  "Oil & Gas / Energy",
  "Manufacturing",
  "Government",
  "Education",
  "Other",
];

// Evidence email (updated)
const APTELLA_EVIDENCE_EMAIL = "admin.asia@aptella.com";

// ====== HELPERS ======
const todayYMD = () => {
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
  const t0 = new Date(todayYMD());
  const t1 = new Date(dateISO);
  const d = (t1 - t0) / (1000 * 60 * 60 * 24);
  return d >= 0 && d <= 60;
};
const stageToProb = (stage) => STAGES.find((s) => s.key === stage)?.prob ?? 0;

const statusColor = (row) => {
  if (row.status === "approved") return "text-green-700";
  if (row.status === "closed" || row.stage === "lost") return "text-red-700";
  // near expiry (expected close within 7 days)
  try {
    const diff = Math.round((new Date(row.expectedCloseDate) - new Date(todayYMD())) / 86400000);
    if (diff <= 7 && diff >= 0) return "text-orange-600";
  } catch {}
  return "text-sky-700";
};

// Make a small badge class
const badge = (row) =>
  `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.status === "approved"
    ? "bg-green-50 text-green-700 ring-1 ring-green-200"
    : row.status === "closed" || row.stage === "lost"
    ? "bg-red-50 text-red-700 ring-1 ring-red-200"
    : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
  }`;

// ====== CORS-FRIENDLY GAS FETCH (text/plain – no preflight) ======
async function gasGet(params = {}) {
  const url = GAS_URL + "?" + new URLSearchParams(params).toString();
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Bad JSON from GAS: " + text.slice(0, 120));
  }
  if (!json.ok) throw new Error(json.error || "Load failed");
  return json;
}
async function gasPost(action, payload) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Bad JSON from GAS: " + text.slice(0, 120));
  }
  if (!json.ok) throw new Error(json.error || "Failed");
  return json;
}

// ====== BRAND HEAD ======
function BrandHeader() {
  return (
    <div className="brand-nav px-4 sm:px-6 py-4 border-b bg-white">
      <div className="max-w-7xl mx-auto flex items-center gap-4 sm:gap-6">
        <img
          src={logoUrl}
          alt="Aptella"
          className="h-12 sm:h-16 md:h-20 w-auto object-contain select-none"
          draggable={false}
        />
        <div className="flex flex-col">
          <div className="text-aptella-navy text-lg sm:text-xl font-semibold tracking-wide">
            Master Distributor • <span className="text-aptella-orange">Xgrids</span>
          </div>
          <div className="text-xs sm:text-sm text-slate-500">
            ASEAN Partner Deal Registration Portal
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== TRANSLATIONS (labels switch when Indonesia selected) ======
const T = {
  en: {
    resellerCountry: "Reseller Country",
    selectCountry: "Select country",
    resellerLocation: "Reseller Location",
    currency: "Currency",
    resellerCompany: "Reseller company",
    primaryContact: "Primary contact",
    contactEmail: "Contact email",
    contactPhone: "Contact phone",
    customerName: "Customer name",
    customerCity: "Customer City",
    customerCountry: "Customer Country",
    mapOption: "Map option (paste lat, lng or click helper)",
    mapTip: "Tip: use the link to pick a point, copy coordinates back here.",
    solutionOffered: "Solution offered (Xgrids)",
    expectedClose: "Expected close date",
    industry: "Industry",
    dealValue: "Deal value",
    salesStage: "Sales stage",
    probability: "Probability (%)",
    competitors: "Competitors",
    supportRequested: "Support requested",
    evidenceRequired: "Evidence (required)",
    attachFiles: "Attach files",
    emailFiles: `Email attached files to Aptella (${APTELLA_EVIDENCE_EMAIL})`,
    notes: "Notes",
    submit: "Submit Registration",
    reset: "Reset",
    learnXgrids: "Learn about Xgrids solutions",
    search: "Search…",
    sortBy: "Sort by",
    submitted: "Submitted",
    expected: "Expected",
    customer: "Customer",
    location: "Location",
    solution: "Solution",
    value: "Value",
    stage: "Stage",
    status: "Status",
    actions: "Actions",
    approve: "Approve",
    close: "Close",
    approved: "Approved",
    closed: "Closed",
    pending: "Pending",
  },
  id: {
    resellerCountry: "Negara Anda",
    selectCountry: "Pilih negara",
    resellerLocation: "Lokasi Reseller",
    currency: "Mata Uang",
    resellerCompany: "Perusahaan Reseller",
    primaryContact: "Kontak Utama",
    contactEmail: "Email Kontak",
    contactPhone: "Telepon Kontak",
    customerName: "Nama Pelanggan",
    customerCity: "Kota Pelanggan",
    customerCountry: "Negara Pelanggan",
    mapOption: "Opsi peta (tempel lat, lng atau klik pembantu)",
    mapTip:
      "Tip: gunakan tautan untuk memilih titik, salin koordinat kembali ke sini.",
    solutionOffered: "Solusi yang ditawarkan (Xgrids)",
    expectedClose: "Perkiraan tanggal penutupan",
    industry: "Industri",
    dealValue: "Nilai transaksi",
    salesStage: "Tahap penjualan",
    probability: "Probabilitas (%)",
    competitors: "Pesaing",
    supportRequested: "Dukungan yang diminta",
    evidenceRequired: "Bukti (wajib)",
    attachFiles: "Lampirkan file",
    emailFiles: `Email file terlampir ke Aptella (${APTELLA_EVIDENCE_EMAIL})`,
    notes: "Catatan",
    submit: "Kirim Pendaftaran",
    reset: "Reset",
    learnXgrids: "Pelajari solusi Xgrids",
    search: "Cari…",
    sortBy: "Urutkan",
    submitted: "Dikirim",
    expected: "Perkiraan",
    customer: "Pelanggan",
    location: "Lokasi",
    solution: "Solusi",
    value: "Nilai",
    stage: "Tahap",
    status: "Status",
    actions: "Aksi",
    approve: "Setujui",
    close: "Tutup",
    approved: "Disetujui",
    closed: "Ditutup",
    pending: "Tertunda",
  },
};

// ====== BASIC UI PRIMS ======
const Label = ({ children, required, htmlFor }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700 flex items-center gap-1">
    {children} {required && <span className="text-aptella-orange">*</span>}
  </label>
);

const Input = (props) => (
  <input
    {...props}
    className={
      "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring " +
      (props.className || "")
    }
  />
);
const Select = (props) => (
  <select
    {...props}
    className={
      "w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring " +
      (props.className || "")
    }
  />
);
const Textarea = (props) => (
  <textarea
    {...props}
    className={
      "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring " +
      (props.className || "")
    }
  />
);

const Card = ({ children, className }) => (
  <div className={"bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 " + (className || "")}>
    {children}
  </div>
);
const CardHeader = ({ title, subtitle }) => (
  <div className="p-5 border-b">
    <h3 className="text-xl font-semibold text-aptella-orange text-center">{title}</h3>
    {subtitle && <p className="text-slate-500 text-sm mt-1 text-center">{subtitle}</p>}
  </div>
);
const CardBody = ({ children }) => <div className="p-5">{children}</div>;

// ====== FILE → BASE64 ======
async function filesToBase64(files) {
  const arr = [];
  for (const f of files) {
    const data = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const s = String(fr.result || "");
        resolve(s.split(",")[1] || "");
      };
      fr.onerror = reject;
      fr.readAsDataURL(f);
    });
    arr.push({ name: f.name, type: f.type || "application/octet-stream", data });
  }
  return arr;
}

// ====== SUBMISSION FORM ======
function SubmissionForm({ onSaved }) {
  const [locale, setLocale] = useState("en");
  const t = (k) => T[locale][k];

  const [form, setForm] = useState({
    resellerCountry: "",
    resellerLocation: "",
    currency: "",
    city: "",
    country: "",
    lat: "",
    lng: "",
    resellerName: "",
    resellerContact: "",
    resellerEmail: "",
    resellerPhone: "",
    customerName: "",
    customerLocation: "",
    industry: "",
    value: "",
    solution: "",
    stage: "qualified",
    probability: stageToProb("qualified"),
    expectedCloseDate: addDays(todayYMD(), 14),
    competitors: [],
    supports: [],
    notes: "",
    evidenceFiles: [],
    emailEvidence: true,
  });

  // auto-locale + currency + default coords + default customer country = reseller country
  useEffect(() => {
    const cfg = COUNTRY_CONFIG[form.resellerCountry || ""];
    const loc = cfg?.locale || "en";
    setLocale(loc);
    setForm((f) => ({
      ...f,
      currency: cfg?.currency || "",
      resellerLocation: cfg?.capital || "",
      lat: cfg?.lat ?? "",
      lng: cfg?.lng ?? "",
      country: f.country || (form.resellerCountry || ""),
      customerLocation:
        (f.city ? f.city : cfg?.capital || "") +
        (f.country || form.resellerCountry ? `, ${f.country || form.resellerCountry}` : ""),
    }));
  }, [form.resellerCountry]); // eslint-disable-line

  // adjust probability when stage changes
  useEffect(() => {
    setForm((f) => ({ ...f, probability: stageToProb(f.stage) }));
  }, [form.stage]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleArray = (key, value) =>
    setForm((f) => {
      const set = new Set(f[key] || []);
      set.has(value) ? set.delete(value) : set.add(value);
      return { ...f, [key]: Array.from(set) };
    });

  const addSolutionIfOther = (val) => {
    if (val === "+ Other") {
      const v = prompt("Type the solution name (Xgrids):");
      if (v) setForm((f) => ({ ...f, solution: v }));
    } else {
      setForm((f) => ({ ...f, solution: val }));
    }
  };

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    setForm((f) => ({ ...f, evidenceFiles: files }));
  };

  const validate = () => {
    const errs = [];
    if (!form.resellerCountry) errs.push("Select a country.");
    if (!form.resellerLocation) errs.push("Reseller location is required.");
    if (!form.currency) errs.push("Currency is required.");
    if (!form.resellerName) errs.push("Reseller company is required.");
    if (!form.resellerContact) errs.push("Primary contact is required.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail || "")) errs.push("Valid email required.");
    if (!form.customerName) errs.push("Customer name is required.");
    if (!form.city) errs.push("Customer city is required.");
    if (!form.country) errs.push("Customer country is required.");
    if (!form.solution) errs.push("Solution is required.");
    if (!form.value || Number(form.value) <= 0) errs.push("Deal value must be positive.");
    if (!withinNext60Days(form.expectedCloseDate)) errs.push("Expected close must be within 60 days.");
    if (!form.evidenceFiles?.length) errs.push("Evidence is required (attach at least one file).");
    if (errs.length) {
      alert(errs.join("\n"));
      return false;
    }
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const base = {
      id,
      submittedAt: todayYMD(),
      resellerCountry: form.resellerCountry,
      resellerLocation: form.resellerLocation,
      resellerName: form.resellerName,
      resellerContact: form.resellerContact,
      resellerEmail: form.resellerEmail,
      resellerPhone: form.resellerPhone,
      customerName: form.customerName,
      customerLocation: form.customerLocation,
      city: form.city,
      country: form.country,
      lat: Number(form.lat || 0),
      lng: Number(form.lng || 0),
      industry: form.industry,
      currency: form.currency,
      value: Number(form.value),
      solution: form.solution,
      stage: form.stage,
      probability: Number(form.probability),
      expectedCloseDate: form.expectedCloseDate,
      status: "pending",
      lockExpiry: "",
      syncedAt: "",
      remindersOptIn: false, // confidential removed per your instruction
      supports: (form.supports || []).join("; "),
      competitors: (form.competitors || []).join("; "),
      notes: form.notes || "",
      evidenceLinks: "", // not used now; files only
      updates: "",
    };

    // local optimistic add
    onSaved?.(base);

    // prepare attachments
    let attachments = [];
    try {
      attachments = await filesToBase64(form.evidenceFiles || []);
    } catch (err) {
      alert("File read error: " + (err?.message || err));
      return;
    }

    try {
      await gasPost("submit", { row: base, attachments, evidenceEmail: APTELLA_EVIDENCE_EMAIL });
      alert("Submitted and synced.");
      // reset
      setForm((f) => ({
        ...f,
        resellerName: "",
        resellerContact: "",
        resellerEmail: "",
        resellerPhone: "",
        customerName: "",
        industry: "",
        value: "",
        solution: "",
        stage: "qualified",
        probability: stageToProb("qualified"),
        competitors: [],
        supports: [],
        notes: "",
        evidenceFiles: [],
      }));
      const el = document.getElementById("evidenceFiles");
      if (el) el.value = "";
    } catch (err) {
      alert("Submitted locally. Google Sheets sync failed: " + (err?.message || err));
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader
        title="Reseller Deal Registration"
        subtitle="Please register deals expected within 60 days. Evidence is required."
      />
      <CardBody>
        <form className="grid gap-6" onSubmit={submit}>
          {/* Top row: Country, Location, Currency */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="resellerCountry" required>{T[locale].resellerCountry}</Label>
              <Select
                id="resellerCountry"
                name="resellerCountry"
                value={form.resellerCountry}
                onChange={(e) => setForm((f) => ({ ...f, resellerCountry: e.target.value }))}
                className="bg-aptella-orange/5 border-aptella-orange/40"
              >
                <option value="">{T[locale].selectCountry}</option>
                {Object.keys(COUNTRY_CONFIG)
                  .filter((k) => k)
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="resellerLocation" required>{T[locale].resellerLocation}</Label>
              <Input
                id="resellerLocation"
                name="resellerLocation"
                value={form.resellerLocation}
                onChange={onChange}
                placeholder="e.g., Jakarta"
                className="bg-aptella-orange/5 border-aptella-orange/40"
              />
            </div>
            <div>
              <Label htmlFor="currency">{T[locale].currency}</Label>
              <Select
                id="currency"
                name="currency"
                value={form.currency}
                onChange={onChange}
                className="bg-aptella-orange/5 border-aptella-orange/40"
              >
                <option value="">{T[locale].selectCountry}</option>
                <option>SGD</option>
                <option>MYR</option>
                <option>IDR</option>
                <option>PHP</option>
                <option>AUD</option>
                <option>USD</option>
              </Select>
            </div>
          </div>

          {/* Reseller contact */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="resellerName" required>{T[locale].resellerCompany}</Label>
              <Input id="resellerName" name="resellerName" value={form.resellerName} onChange={onChange} />
            </div>
            <div>
              <Label htmlFor="resellerContact" required>{T[locale].primaryContact}</Label>
              <Input id="resellerContact" name="resellerContact" value={form.resellerContact} onChange={onChange} />
            </div>
            <div>
              <Label htmlFor="resellerEmail" required>{T[locale].contactEmail}</Label>
              <Input id="resellerEmail" name="resellerEmail" type="email" value={form.resellerEmail} onChange={onChange} />
            </div>
            <div>
              <Label htmlFor="resellerPhone">{T[locale].contactPhone}</Label>
              <Input id="resellerPhone" name="resellerPhone" value={form.resellerPhone} onChange={onChange} />
            </div>
          </div>

          {/* Customer & location */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName" required>{T[locale].customerName}</Label>
              <Input id="customerName" name="customerName" value={form.customerName} onChange={onChange} />
            </div>
            <div>
              <Label htmlFor="city" required>{T[locale].customerCity}</Label>
              <Input
                id="city"
                name="city"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    city: e.target.value,
                    customerLocation:
                      (e.target.value || "") + (f.country ? `, ${f.country}` : ""),
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="country" required>{T[locale].customerCountry}</Label>
              <Select
                id="country"
                name="country"
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    country: e.target.value,
                    customerLocation: (f.city || "") + (e.target.value ? `, ${e.target.value}` : ""),
                  }))
                }
              >
                <option value="">{T[locale].selectCountry}</option>
                <option>Singapore</option>
                <option>Malaysia</option>
                <option>Indonesia</option>
                <option>Philippines</option>
              </Select>
            </div>
            <div>
              <Label>{T[locale].mapOption}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="lat"
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                />
                <Input
                  placeholder="lng"
                  value={form.lng}
                  onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                />
                <a
                  className="px-3 py-2 rounded-lg text-white bg-aptella-navy hover:bg-aptella-navy-dark text-xs"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    (form.city || "") + "," + (form.country || "")
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Map
                </a>
              </div>
              <p className="text-xs text-slate-500 mt-1">{T[locale].mapTip}</p>
            </div>
          </div>

          {/* Solution & expected */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Label required>{T[locale].solutionOffered}</Label>
              <div className="grid gap-2">
                <Select
                  value={XGRIDS_SOLUTIONS.includes(form.solution) ? form.solution : ""}
                  onChange={(e) => addSolutionIfOther(e.target.value)}
                >
                  <option value="">Select an Xgrids solution</option>
                  {XGRIDS_SOLUTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Or type Xgrids solution details"
                  value={form.solution}
                  onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
                />
                <a
                  className="text-sky-700 underline text-xs"
                  href="https://www.aptella.com/asia/product-brands/xgrids-asia/"
                  target="_blank"
                  rel="noreferrer"
                >
                  {T[locale].learnXgrids}
                </a>
              </div>
            </div>
            <div>
              <Label htmlFor="expectedCloseDate" required>{T[locale].expectedClose}</Label>
              <Input
                id="expectedCloseDate"
                name="expectedCloseDate"
                type="date"
                value={form.expectedCloseDate}
                onChange={onChange}
              />
            </div>
          </div>

          {/* Industry / currency / value */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="industry">{T[locale].industry}</Label>
              <Select id="industry" name="industry" value={form.industry} onChange={onChange}>
                <option value="">Select industry</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="value" required>{T[locale].dealValue}</Label>
              <Input
                id="value"
                name="value"
                type="number"
                step="0.01"
                min="0"
                value={form.value}
                onChange={onChange}
              />
            </div>
            <div>
              <Label htmlFor="stage">{T[locale].salesStage}</Label>
              <Select
                id="stage"
                name="stage"
                value={form.stage}
                onChange={onChange}
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <div className="mt-2">
                <Label>{T[locale].probability}</Label>
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
            </div>
          </div>

          {/* Competitors & support */}
          <div className="grid gap-2">
            <Label>{T[locale].competitors}</Label>
            <Input
              placeholder="Comma-separated (optional)"
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

          <div className="grid gap-2">
            <Label>{T[locale].supportRequested}</Label>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SUPPORT_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.supports.includes(opt)}
                    onChange={() => toggleArray("supports", opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* Evidence (mandatory) */}
          <div className="grid gap-2">
            <Label required>{T[locale].evidenceRequired}</Label>
            <input
              id="evidenceFiles"
              type="file"
              multiple
              onChange={onFiles}
              className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-aptella-orange/10 file:px-3 file:py-2 file:text-aptella-orange"
            />
            <label className="text-sm text-slate-700 flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                checked={!!form.emailEvidence}
                onChange={(e) => setForm((f) => ({ ...f, emailEvidence: e.target.checked }))}
              />
              {T[locale].emailFiles}
            </label>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">{T[locale].notes}</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              value={form.notes}
              onChange={onChange}
              placeholder="Key requirements, technical scope, delivery constraints, decision process, etc."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-white bg-aptella-navy hover:bg-aptella-navy-dark"
            >
              {T[locale].submit}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-slate-200"
              onClick={() => window.location.reload()}
            >
              {T[locale].reset}
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

// ====== ADMIN FX DRAWER ======
function FxDrawer({ open, onClose }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await gasGet({ action: "fx" });
        setRows(res.rows || []);
      } catch (e) {
        alert("FX load failed: " + (e?.message || e));
      }
    })();
  }, [open]);

  const setCell = (i, k, v) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const addRow = () => setRows((prev) => [...prev, { code: "USD", rateToAUD: 0.67 }]);
  const removeRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      await gasPost("fx", { rows });
      alert("FX saved.");
      onClose?.();
    } catch (e) {
      alert("FX save failed: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center">
      <div className="bg-white w-[min(680px,95vw)] rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">FX Rates to AUD</h3>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-100">Close</button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm font-medium mb-2">
          <div>Currency</div><div>Rate → AUD</div><div></div>
        </div>
        <div className="max-h-[50vh] overflow-auto space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center">
              <Input value={r.code} onChange={(e) => setCell(i, "code", e.target.value.toUpperCase())} />
              <Input type="number" step="0.000001" value={r.rateToAUD ?? ""} onChange={(e) => setCell(i, "rateToAUD", Number(e.target.value))} />
              <button className="text-red-600 text-sm" onClick={() => removeRow(i)}>Remove</button>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <button onClick={addRow} className="px-3 py-1.5 rounded-lg bg-slate-100">Add</button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-100">Cancel</button>
          <button disabled={saving} onClick={save} className="px-3 py-1.5 rounded-lg text-white bg-aptella-navy hover:bg-aptella-navy-dark">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ====== ADMIN PANEL ======
function AdminPanel() {
  const [authed, setAuthed] = useState(() => localStorage.getItem("adminAuthed") === "1");
  const [pass, setPass] = useState("");
  const [rows, setRows] = useState([]);
  const [fx, setFx] = useState([]);
  const [fxOpen, setFxOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("submittedAt");
  const [sortDir, setSortDir] = useState("desc");
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const doAuth = (e) => {
    e.preventDefault();
    if (pass === ADMIN_PASS) {
      localStorage.setItem("adminAuthed", "1");
      setAuthed(true);
    } else {
      alert("Wrong password");
    }
  };
  const logout = () => {
    localStorage.removeItem("adminAuthed");
    setAuthed(false);
  };

  const refresh = async () => {
    try {
      const res = await gasGet({ action: "list" });
      setRows(res.rows || []);
      setFx(res.fx || []);
      // init map markers
      setTimeout(() => drawMap(res.rows || []), 50);
    } catch (e) {
      alert("Refresh failed: " + (e?.message || e));
    }
  };

  // Draw Leaflet map using global L from CDN (index.html must include Leaflet CSS/JS)
  const drawMap = (data) => {
    if (!window.L) return; // graceful fallback if CDN not loaded
    const L = window.L;

    // init map once
    if (!mapRef.current) {
      const el = document.getElementById("admin-map");
      if (!el) return;
      mapRef.current = L.map(el).setView([1.3521, 103.8198], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(mapRef.current);
    }

    // clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // group by city,country
    const groups = new Map();
    for (const r of data) {
      const key = (r.city || "") + "||" + (r.country || "");
      if (!groups.has(key)) {
        groups.set(key, { city: r.city, country: r.country, lat: Number(r.lat), lng: Number(r.lng), totalAUD: 0, rows: [] });
      }
      groups.get(key).rows.push(r);
    }

    // FX map to AUD
    const fxMap = new Map(fx.map((r) => [r.code, Number(r.rateToAUD)]));
    const toAud = (val, cur) => {
      if (!val) return 0;
      if (!cur || cur === "AUD") return Number(val);
      const rate = fxMap.get(cur);
      if (!rate || rate <= 0) return Number(val); // fallback if missing
      return Number(val) * Number(rate);
    };

    groups.forEach((g) => {
      let sum = 0;
      g.rows.forEach((r) => (sum += toAud(r.value, r.currency)));
      g.totalAUD = sum;

      if (isNaN(g.lat) || isNaN(g.lng)) return;

      const color =
        g.rows.some((r) => r.status === "closed" || r.stage === "lost")
          ? "#e11d48" // red
          : g.rows.some((r) => r.status === "approved")
          ? "#16a34a" // green
          : "#0ea5e9"; // blue

      const radius = 8 + Math.sqrt(Math.max(0, g.totalAUD)) / 250; // scale bubble
      const m = L.circleMarker([g.lat, g.lng], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.25,
        weight: 2,
      }).addTo(mapRef.current);

      m.bindPopup(
        `<strong>${g.city || ""}${g.country ? ", " + g.country : ""}</strong><br/>` +
          `Deals: ${g.rows.length}<br/>Total (AUD): ${Math.round(g.totalAUD).toLocaleString()}`
      );
      markersRef.current.push(m);
    });

    // fit bounds
    const pts = [];
    markersRef.current.forEach((m) => pts.push(m.getLatLng()));
    if (pts.length) {
      const b = window.L.latLngBounds(pts);
      mapRef.current.fitBounds(b.pad(0.2));
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = rows.slice();
    if (q) {
      arr = arr.filter((r) =>
        [
          r.customerName,
          r.customerLocation,
          r.resellerName,
          r.solution,
          r.stage,
          r.status,
          r.currency,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    // sort
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const A = a[sortKey] ?? "";
      const B = b[sortKey] ?? "";
      if (sortKey === "value" || sortKey === "probability") {
        return dir * (Number(A) - Number(B));
      }
      return dir * String(A).localeCompare(String(B));
    });
    return arr;
  }, [rows, search, sortKey, sortDir]);

  const approve = async (id) => {
    try {
      await gasPost("update", { id, patch: { status: "approved" } });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
    } catch (e) {
      alert("Update failed: " + (e?.message || e));
    }
  };
  const close = async (id) => {
    try {
      await gasPost("update", { id, patch: { status: "closed" } });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "closed" } : r)));
    } catch (e) {
      alert("Update failed: " + (e?.message || e));
    }
  };

  if (!authed) {
    return (
      <Card className="mt-6">
        <CardHeader title="Admin Login" />
        <CardBody>
          <form className="flex items-center gap-3" onSubmit={doAuth}>
            <Input
              placeholder="Enter password"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <button className="px-4 py-2 rounded-xl text-white bg-aptella-navy hover:bg-aptella-navy-dark">
              Login
            </button>
          </form>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="px-3 py-2 rounded-xl text-white bg-aptella-navy hover:bg-aptella-navy-dark"
          >
            Refresh
          </button>
          <button
            onClick={() => setFxOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-100"
          >
            FX Settings
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <label className="text-sm text-slate-700">{T.en.sortBy}</label>
          <Select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="submittedAt">{T.en.submitted}</option>
            <option value="expectedCloseDate">{T.en.expected}</option>
            <option value="customerName">{T.en.customer}</option>
            <option value="customerLocation">{T.en.location}</option>
            <option value="solution">{T.en.solution}</option>
            <option value="value">{T.en.value}</option>
            <option value="stage">{T.en.stage}</option>
            <option value="status">{T.en.status}</option>
          </Select>
          <Select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
            <option value="desc">↓</option>
            <option value="asc">↑</option>
          </Select>
          <button onClick={logout} className="px-3 py-2 rounded-xl bg-slate-100">Logout</button>
        </div>
      </div>

      {/* Map */}
      <div id="admin-map" className="w-full h-[420px] rounded-2xl mt-4 ring-1 ring-slate-200 bg-slate-50 relative">
        {!window.L && (
          <div className="absolute inset-0 grid place-items-center text-slate-500 text-sm">
            Map placeholder — Leaflet CDN must be loaded in index.html
          </div>
        )}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-aptella-orange/10 text-aptella-orange">
              <th className="p-3 text-left">{T.en.submitted}</th>
              <th className="p-3 text-left">{T.en.expected}</th>
              <th className="p-3 text-left">{T.en.customer}</th>
              <th className="p-3 text-left">{T.en.location}</th>
              <th className="p-3 text-left">{T.en.solution}</th>
              <th className="p-3 text-left">{T.en.value} (AUD est.)</th>
              <th className="p-3 text-left">{T.en.stage}</th>
              <th className="p-3 text-left">{T.en.status}</th>
              <th className="p-3 text-left">{T.en.actions}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filtered.map((r) => (
              <tr key={r.id} className="border-b align-top">
                <td className="p-3">{r.submittedAt || ""}</td>
                <td className="p-3">{(r.expectedCloseDate || "").slice(0, 10)}</td>
                <td className="p-3">{r.customerName || ""}</td>
                <td className="p-3">{r.customerLocation || ""}</td>
                <td className="p-3">{r.solution || ""}</td>
                <td className="p-3">{Number(r.valueAUD || 0).toLocaleString()}</td>
                <td className="p-3">{r.stage} • {r.probability ?? 0}%</td>
                <td className="p-3"><span className={badge(r)}>{r.status || "pending"}</span></td>
                <td className="p-3 space-x-2 whitespace-nowrap">
                  {r.status !== "approved" && r.status !== "closed" && (
                    <button
                      onClick={() => approve(r.id)}
                      className="px-2.5 py-1.5 rounded-lg text-white bg-green-600 hover:bg-green-700"
                    >
                      {T.en.approve}
                    </button>
                  )}
                  {r.status !== "closed" && (
                    <button
                      onClick={() => close(r.id)}
                      className="px-2.5 py-1.5 rounded-lg text-white bg-red-600 hover:bg-red-700"
                    >
                      {T.en.close}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className="p-4 text-slate-500" colSpan={9}>No rows</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <FxDrawer open={fxOpen} onClose={() => setFxOpen(false)} />
    </>
  );
}

// ====== ROOT ======
export default function App() {
  const [tab, setTab] = useState("reseller");
  const [localRows, setLocalRows] = useState([]);

  return (
    <div>
      <BrandHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-semibold text-aptella-navy">
            {tab === "reseller" ? "Reseller Portal" : "Admin"}
          </h1>
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-2 rounded-xl ${tab === "reseller" ? "bg-aptella-navy text-white" : "bg-slate-100"}`}
              onClick={() => setTab("reseller")}
            >
              Reseller
            </button>
            <button
              className={`px-3 py-2 rounded-xl ${tab === "admin" ? "bg-aptella-navy text-white" : "bg-slate-100"}`}
              onClick={() => setTab("admin")}
            >
              Admin
            </button>
          </div>
        </div>

        {tab === "reseller" ? (
          <SubmissionForm onSaved={(r) => setLocalRows((prev) => [r, ...prev])} />
        ) : (
          <AdminPanel />
        )}
      </div>
    </div>
  );
}
