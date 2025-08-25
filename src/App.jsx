import React, { useEffect, useMemo, useRef, useState } from "react";

/** **********************************************************************
 * BRAND / CONFIG
 *********************************************************************** */
const BRAND = {
  navy: "#0e3446",
  navyDark: "#0b2938",
  orange: "#f0a03a",
  primaryBtn: "bg-[#0e3446] hover:bg-[#0b2938]",
  softCard:
    "rounded-2xl border border-gray-200 bg-white shadow-sm shadow-gray-100",
};

const GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";

/** **********************************************************************
 * UTILS
 *********************************************************************** */
const fmtDate = (isoOrYmd) => {
  if (!isoOrYmd) return "";
  const d = new Date(isoOrYmd);
  if (isNaN(d)) return String(isoOrYmd);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const todayYMD = () => fmtDate(new Date().toISOString());
const addDays = (ymd, n) => {
  const d = new Date(ymd);
  d.setDate(d.getDate() + (n || 0));
  return fmtDate(d.toISOString());
};

const withinNext60 = (ymd) => {
  const t = new Date(todayYMD());
  const d = new Date(ymd);
  const diff = (d - t) / 86400000;
  return diff >= 0 && diff <= 60;
};

const uid = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

/** capitals for default lat/lng */
const CAPITALS = {
  Indonesia: { city: "Jakarta", lat: -6.2088, lng: 106.8456 },
  Singapore: { city: "Singapore", lat: 1.3521, lng: 103.8198 },
  Malaysia: { city: "Kuala Lumpur", lat: 3.139, lng: 101.6869 },
  Philippines: { city: "Manila", lat: 14.5995, lng: 120.9842 },
};

/** solutions */
const XGRIDS_SOLUTIONS = [
  "Xgrids L2 PRO",
  "Xgrids K1",
  "Xgrids PortalCam",
  "Xgrids Drone Kit",
  "Other (type…)",
];

const INDUSTRIES = [
  "Construction",
  "Mining",
  "Utilities",
  "Government",
  "Oil & Gas",
  "Telecom",
  "Other",
];

const STAGES = [
  { key: "qualified", label: "Qualified", prob: 35 },
  { key: "proposal", label: "Proposal", prob: 55 },
  { key: "negotiation", label: "Negotiation", prob: 70 },
  { key: "won", label: "Won", prob: 100 },
  { key: "lost", label: "Lost", prob: 0 },
];

const SUPPORTS = [
  "Pre-sales engineer",
  "Demo / loan unit",
  "Pricing exception",
  "Marketing materials",
  "Partner training",
  "On-site customer visit",
  "Extended lock request",
];

const CURRENCIES = ["SGD", "IDR", "MYR", "PHP", "AUD", "USD"];

/** Bahasa strings */
const I18N = {
  id: {
    resellerCountry: "Negara Reseller",
    selectCountry: "Pilih negara",
    resellerLocation: "Lokasi Reseller",
    currency: "Mata uang",
    resellerCompany: "Perusahaan Reseller",
    primaryContact: "Kontak utama",
    contactEmail: "Email kontak",
    contactPhone: "Telepon kontak",
    customerName: "Nama Pelanggan",
    customerCity: "Kota Pelanggan",
    customerCountry: "Negara Pelanggan",
    mapLabel: "Opsi peta (tempel lat,lng atau gunakan tautan)",
    openMap: "Buka Peta",
    solution: "Solusi Xgrids",
    learnXgrids: "Pelajari Xgrids",
    expectedClose: "Perkiraan tanggal penutupan",
    industry: "Industri",
    dealValue: "Nilai transaksi",
    stage: "Tahap penjualan",
    probability: "Probabilitas (%)",
    competitors: "Pesaing",
    supports: "Dukungan yang diminta",
    evidence: "Bukti (wajib)",
    emailEvidence: "Kirim lampiran ke Aptella (admin.asia@aptella.com)",
    notes: "Catatan",
    confirm:
      "Saya menyatakan data akurat dan menyetujui penyimpanan data untuk pengelolaan peluang",
    submit: "Kirim Pendaftaran",
    reset: "Reset",
    selectIndustry: "Pilih industri",
    selectSolution: "Pilih solusi Xgrids",
  },
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
    mapLabel: "Map option (paste lat,lng or use link)",
    openMap: "Open Map",
    solution: "Solution offered (Xgrids)",
    learnXgrids: "Learn about Xgrids",
    expectedClose: "Expected close date",
    industry: "Industry",
    dealValue: "Deal value",
    stage: "Sales stage",
    probability: "Probability (%)",
    competitors: "Competitors",
    supports: "Support requested",
    evidence: "Evidence (required)",
    emailEvidence: "Email attached files to Aptella (admin.asia@aptella.com)",
    notes: "Notes",
    confirm:
      "I confirm details are accurate and consent to data storage for deal management",
    submit: "Submit Registration",
    reset: "Reset",
    selectIndustry: "Select industry",
    selectSolution: "Select an Xgrids solution",
  },
};

/** **********************************************************************
 * LIGHTWEIGHT STYLE INJECTION (stronger Aptella accents)
 *********************************************************************** */
const BrandCSS = () => (
  <style>{`
  :root {
    --ap-navy:${BRAND.navy}; --ap-navy-dark:${BRAND.navyDark}; --ap-orange:${BRAND.orange};
  }
  body{ background:#f6f9fb; color:#0f172a; }
  .ap-nav{ background:#fff; border-bottom:1px solid #e5e7eb; }
  .ap-logo{ display:flex; align-items:center; gap:.75rem; }
  .ap-logo img{ height:34px; }
  @media(min-width:640px){ .ap-logo img{ height:44px; } }
  .ap-pill{ padding:.25rem .6rem; border-radius:999px; background:#f9fafb; border:1px solid #e5e7eb; font-size:.8rem }
  .ap-btn{ border-radius:12px; padding:.6rem 1rem; font-weight:600 }
  .ap-btn--primary{ color:#fff; background:var(--ap-navy); }
  .ap-btn--primary:hover{ background:var(--ap-navy-dark); }
  .ap-btn--ghost{ background:#f3f4f6; }
  .ap-btn--ghost:hover{ background:#e5e7eb; }
  .ap-hero{ background:linear-gradient(90deg, #fff, #fdf7ef); border-bottom:1px solid #f1e6d5 }
  .ap-hero h1{ color:var(--ap-navy); font-weight:800 }
  .ap-orange{ color:var(--ap-orange) }
  .ap-border-orange{ border-color:var(--ap-orange) }
  .ap-th{ color:var(--ap-orange); font-weight:700 }
  .ap-req{ background:#f8fafc; }
  .ap-card{ border:1px solid #e5e7eb; border-radius:1rem; background:#fff; box-shadow:0 1px 8px rgba(17,24,39,.04) }
  .ap-actions{ display:flex; flex-direction:column; gap:.35rem }
  .ap-badge{ padding:.25rem .6rem; border-radius:999px; font-size:.75rem; }
  .ap-badge--approved{ background:#e6f7ef; color:#157f47; border:1px solid #b8e9d2 }
  .ap-badge--pending{ background:#eff6ff; color:#1d4ed8; border:1px solid #dbeafe }
  .ap-badge--closed{ background:#fee2e2; color:#b91c1c; border:1px solid #fecaca }
`}</style>
);

/** **********************************************************************
 * HEADER
 *********************************************************************** */
function Header({ tab, setTab, authed, onSignOut }) {
  return (
    <div className="ap-nav">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="ap-logo">
          <img src="/aptella-logo.png" alt="Aptella" />
          <div className="text-sm sm:text-base">
            <div className="text-gray-500">Master Distributor • <span className="font-semibold">Xgrids</span></div>
            <div className="hidden sm:block font-semibold text-[15px]">Reseller Deal Registration</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`ap-btn ${tab === "reseller" ? "ap-btn--primary" : "ap-btn--ghost"}`}
            onClick={() => setTab("reseller")}
          >
            Reseller
          </button>
          <button
            className={`ap-btn ${tab === "admin" ? "ap-btn--primary" : "ap-btn--ghost"}`}
            onClick={() => setTab("admin")}
          >
            Admin
          </button>
          {authed ? (
            <button className="ap-btn ap-btn--ghost" onClick={onSignOut}>
              Logout
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** **********************************************************************
 * SUBMISSION FORM
 *********************************************************************** */
function SubmissionForm({ onSubmitted, onSyncOne }) {
  const [form, setForm] = useState({
    resellerCountry: "",
    resellerLocation: "",
    currency: "SGD",
    resellerName: "",
    resellerContact: "",
    resellerEmail: "",
    resellerPhone: "",
    customerName: "",
    customerCity: "",
    customerCountry: "",
    lat: "",
    lng: "",
    solution: "",
    solutionOther: "",
    industry: "",
    value: "",
    stage: "qualified",
    probability: 35,
    expectedCloseDate: addDays(todayYMD(), 14),
    competitors: "",
    supports: [],
    pricingException: false,
    onsiteSupport: false,
    notes: "",
    // evidence
    evidenceFiles: [],
    emailEvidence: true,
    accept: false,
  });
  const isID = form.resellerCountry === "Indonesia";
  const t = I18N[isID ? "id" : "en"];

  useEffect(() => {
    // probability from stage
    const s = STAGES.find((x) => x.key === form.stage);
    if (s && s.prob !== form.probability) {
      setForm((f) => ({ ...f, probability: s.prob }));
    }
  }, [form.stage]);

  useEffect(() => {
    // default resellerLocation for country
    const cap = CAPITALS[form.resellerCountry];
    if (cap && !form.resellerLocation) {
      setForm((f) => ({ ...f, resellerLocation: cap.city }));
    }
  }, [form.resellerCountry]);

  useEffect(() => {
    // default lat/lng by customer country
    const cap = CAPITALS[form.customerCountry];
    if (cap) {
      setForm((f) => ({
        ...f,
        customerCity: f.customerCity || cap.city,
        lat: cap.lat,
        lng: cap.lng,
      }));
    }
  }, [form.customerCountry]);

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };
  const toggleFromList = (name, item) => {
    setForm((f) => {
      const s = new Set(f[name] || []);
      s.has(item) ? s.delete(item) : s.add(item);
      return { ...f, [name]: Array.from(s) };
    });
  };
  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    setForm((f) => ({ ...f, evidenceFiles: files }));
  };

  const validate = () => {
    const errors = [];
    if (!form.resellerCountry) errors.push("resellerCountry");
    if (!form.resellerLocation) errors.push("resellerLocation");
    if (!form.resellerName) errors.push("resellerName");
    if (!form.resellerContact) errors.push("resellerContact");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail || ""))
      errors.push("resellerEmail");
    if (!form.customerName) errors.push("customerName");
    if (!form.customerCountry) errors.push("customerCountry");
    if (!form.expectedCloseDate || !withinNext60(form.expectedCloseDate))
      errors.push("expectedCloseDate");
    if (!form.solution) errors.push("solution");
    if (form.solution === "Other (type…)" && !form.solutionOther)
      errors.push("solutionOther");
    if (!form.value || Number(form.value) <= 0) errors.push("value");
    if (!form.evidenceFiles?.length) errors.push("evidenceFiles");
    if (!form.accept) errors.push("accept");
    if (errors.length) {
      alert(
        "Please complete required fields:\n- " + errors.join("\n- ")
      );
      return false;
    }
    return true;
  };

  const filesToBase64 = async (files) => {
    const MAX = 20 * 1024 * 1024;
    let total = 0;
    const arr = [];
    for (const f of files) {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => {
          const out = String(r.result || "");
          const base64 = out.split(",")[1] || "";
          res(base64);
        };
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      total += b64.length * 0.75;
      arr.push({ name: f.name, type: f.type || "application/octet-stream", data: b64 });
    }
    if (total > MAX) throw new Error("Attachments exceed 20MB total.");
    return arr;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      action: "submit",
      record: {
        id: uid(),
        submittedAt: todayYMD(),
        resellerCountry: form.resellerCountry,
        resellerLocation: form.resellerLocation,
        resellerName: form.resellerName,
        resellerContact: form.resellerContact,
        resellerEmail: form.resellerEmail,
        resellerPhone: form.resellerPhone,
        customerName: form.customerName,
        customerLocation: [form.customerCity, form.customerCountry]
          .filter(Boolean)
          .join(", "),
        city: form.customerCity || "",
        country: form.customerCountry || "",
        lat: Number(form.lat) || "",
        lng: Number(form.lng) || "",
        industry: form.industry,
        currency: form.currency,
        value: Number(form.value),
        solution:
          form.solution === "Other (type…)" ? form.solutionOther : form.solution,
        stage: form.stage,
        probability: Number(form.probability),
        expectedCloseDate: form.expectedCloseDate,
        status: "pending",
        lockExpiry: "",
        syncedAt: "",
        confidential: false, // removed per request
        remindersOptIn: false,
        supports: form.supports,
        competitors: (form.competitors || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: form.notes || "",
        evidenceLinks: [],
        updates: [],
        emailEvidence: !!form.emailEvidence,
      },
    };

    try {
      if (form.evidenceFiles?.length) {
        payload.attachments = await filesToBase64(form.evidenceFiles);
      }
    } catch (err) {
      alert("File processing error: " + (err.message || err));
      return;
    }

    try {
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=submit`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || j?.ok === false) {
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      alert("Submitted. Thank you!");
      setForm((f) => ({
        ...f,
        resellerName: "",
        resellerContact: "",
        resellerEmail: "",
        resellerPhone: "",
        customerName: "",
        customerCity: "",
        lat: "",
        lng: "",
        industry: "",
        value: "",
        solution: "",
        solutionOther: "",
        competitors: "",
        supports: [],
        notes: "",
        evidenceFiles: [],
        accept: false,
      }));
      onSubmitted?.(j.row);
      onSyncOne?.(j.row);
    } catch (err) {
      alert("Submitted locally. Google Sheets sync failed: " + (err.message || err));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="ap-hero ap-card p-6 mb-6">
        <h1 className="text-2xl sm:text-3xl">
          Register Upcoming Deal{" "}
          <span className="ap-orange">(within 60 days)</span>
        </h1>
        <div className="text-sm text-gray-500 mt-1">
          Fields marked * are mandatory.
        </div>
      </div>

      <form onSubmit={submit} className="ap-card p-6 grid gap-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <label className="font-medium">
              {t.resellerCountry} <span className="ap-orange">*</span>
            </label>
            <select
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
              name="resellerCountry"
              value={form.resellerCountry}
              onChange={handle}
            >
              <option value="">{t.selectCountry}</option>
              <option>Indonesia</option>
              <option>Malaysia</option>
              <option>Philippines</option>
              <option>Singapore</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="font-medium">
              {t.resellerLocation} <span className="ap-orange">*</span>
            </label>
            <input
              name="resellerLocation"
              value={form.resellerLocation}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
              placeholder="e.g., Singapore"
            />
          </div>

          <div className="grid gap-2">
            <label className="font-medium">{t.currency}</label>
            <select
              name="currency"
              value={form.currency}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="font-medium">
              {t.resellerCompany} <span className="ap-orange">*</span>
            </label>
            <input
              name="resellerName"
              value={form.resellerName}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
            />
          </div>
          <div className="grid gap-2">
            <label className="font-medium">
              {t.primaryContact} <span className="ap-orange">*</span>
            </label>
            <input
              name="resellerContact"
              value={form.resellerContact}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="font-medium">
              {t.contactEmail} <span className="ap-orange">*</span>
            </label>
            <input
              name="resellerEmail"
              value={form.resellerEmail}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
              placeholder="name@company.com"
            />
          </div>
          <div className="grid gap-2">
            <label className="font-medium">{t.contactPhone}</label>
            <input
              name="resellerPhone"
              value={form.resellerPhone}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
              placeholder="+65 1234 5678"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="font-medium">
              {t.customerName} <span className="ap-orange">*</span>
            </label>
            <input
              name="customerName"
              value={form.customerName}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
            />
          </div>
          <div className="grid gap-2">
            <label className="font-medium">
              {t.customerCountry} <span className="ap-orange">*</span>
            </label>
            <select
              name="customerCountry"
              value={form.customerCountry}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
            >
              <option value="">{t.selectCountry}</option>
              <option>Indonesia</option>
              <option>Malaysia</option>
              <option>Philippines</option>
              <option>Singapore</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <label className="font-medium">{t.customerCity}</label>
            <input
              name="customerCity"
              value={form.customerCity}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
              placeholder="e.g., Jakarta"
            />
          </div>

          <div className="grid gap-2">
            <label className="font-medium">{t.mapLabel}</label>
            <div className="flex gap-2">
              <input
                name="lat"
                value={form.lat}
                onChange={handle}
                className="ap-req rounded-xl border-gray-300 px-3 py-2 w-full"
                placeholder="lat"
              />
              <input
                name="lng"
                value={form.lng}
                onChange={handle}
                className="ap-req rounded-xl border-gray-300 px-3 py-2 w-full"
                placeholder="lng"
              />
              <a
                className="ap-btn ap-btn--primary"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${form.customerCity || ""}, ${form.customerCountry || ""}`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                {t.openMap}
              </a>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="font-medium">
              {t.solution} <span className="ap-orange">*</span>
            </label>
            <select
              name="solution"
              value={form.solution}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
            >
              <option value="">{t.selectSolution}</option>
              {XGRIDS_SOLUTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            {form.solution === "Other (type…)" && (
              <input
                className="rounded-xl border-gray-300 px-3 py-2"
                placeholder="Type solution"
                name="solutionOther"
                value={form.solutionOther}
                onChange={handle}
              />
            )}
            <a
              className="text-sm underline text-[#0e3446]"
              target="_blank"
              rel="noreferrer"
              href="https://www.aptella.com/asia/product-brands/xgrids-asia/"
            >
              {t.learnXgrids}
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <label className="font-medium">
              {t.expectedClose} <span className="ap-orange">*</span>
            </label>
            <input
              type="date"
              name="expectedCloseDate"
              value={form.expectedCloseDate}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
            />
          </div>

          <div className="grid gap-2">
            <label className="font-medium">{t.industry}</label>
            <select
              name="industry"
              value={form.industry}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
            >
              <option value="">{isID ? "Pilih industri" : "Select industry"}</option>
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="font-medium">
              {t.dealValue} <span className="ap-orange">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              name="value"
              value={form.value}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
              placeholder="e.g., 25000"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <label className="font-medium">{t.stage}</label>
            <select
              name="stage"
              value={form.stage}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
            >
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="font-medium">{t.probability}</label>
            <input
              type="number"
              min="0"
              max="100"
              name="probability"
              value={form.probability}
              onChange={handle}
              className="ap-req rounded-xl border-gray-300 px-3 py-2"
            />
          </div>
          <div className="grid gap-2">
            <label className="font-medium">{t.competitors}</label>
            <input
              name="competitors"
              value={form.competitors}
              onChange={handle}
              className="rounded-xl border-gray-300 px-3 py-2"
              placeholder="Comma separated (optional)"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="font-medium">{t.supports}</label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SUPPORTS.map((s) => (
              <label key={s} className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.supports.includes(s)}
                  onChange={() => toggleFromList("supports", s)}
                />
                {isID
                  ? {
                      "Pre-sales engineer": "Insinyur pra-penjualan",
                      "Demo / loan unit": "Unit demo / pinjaman",
                      "Pricing exception": "Pengecualian harga",
                      "Marketing materials": "Materi pemasaran",
                      "Partner training": "Pelatihan mitra",
                      "On-site customer visit": "Kunjungan ke lokasi pelanggan",
                      "Extended lock request": "Permintaan perpanjangan lock",
                    }[s] || s
                  : s}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <label className="font-medium">
            {t.evidence} <span className="ap-orange">*</span>
          </label>
          <input type="file" multiple onChange={onFiles} />
          <label className="text-sm flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              checked={!!form.emailEvidence}
              onChange={(e) =>
                setForm((f) => ({ ...f, emailEvidence: e.target.checked }))
              }
            />
            {t.emailEvidence /* text without “Apps Script” */}
          </label>
        </div>

        <div className="grid gap-2">
          <label className="font-medium">{t.notes}</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handle}
            rows={4}
            className="rounded-xl border-gray-300 px-3 py-2"
            placeholder="Key requirements, technical scope, delivery constraints, decision process, etc."
          />
        </div>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            name="accept"
            checked={!!form.accept}
            onChange={handle}
          />
          {t.confirm}
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" className="ap-btn ap-btn--primary">
            {t.submit}
          </button>
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({
                ...f,
                resellerName: "",
                resellerContact: "",
                resellerEmail: "",
                resellerPhone: "",
                customerName: "",
                customerCity: "",
                lat: "",
                lng: "",
                industry: "",
                value: "",
                solution: "",
                solutionOther: "",
                competitors: "",
                supports: [],
                notes: "",
                evidenceFiles: [],
                accept: false,
              }))
            }
            className="ap-btn ap-btn--ghost"
          >
            {t.reset}
          </button>
        </div>
      </form>
    </div>
  );
}

/** **********************************************************************
 * FX SETTINGS MODAL
 *********************************************************************** */
function FxModal({ open, onClose, onSave, rates }) {
  const [local, setLocal] = useState(rates || {});
  useEffect(() => setLocal(rates || {}), [rates, open]);
  if (!open) return null;

  const setKey = (oldK, newK) => {
    setLocal((prev) => {
      const copy = { ...prev };
      const v = copy[oldK];
      delete copy[oldK];
      copy[newK.toUpperCase()] = v;
      return copy;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="ap-card w-[min(680px,95vw)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">FX Rates to AUD</h3>
          <button className="ap-btn ap-btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {Object.entries(local).map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-2 items-center">
              <input
                value={k}
                onChange={(e) => setKey(k, e.target.value)}
                className="rounded-xl border px-3 py-2 uppercase"
              />
              <input
                type="number"
                step="0.000001"
                value={v}
                onChange={(e) =>
                  setLocal((p) => ({ ...p, [k]: Number(e.target.value || 0) }))
                }
                className="rounded-xl border px-3 py-2"
              />
              <button
                className="text-red-600"
                onClick={() =>
                  setLocal((p) => {
                    const cp = { ...p };
                    delete cp[k];
                    return cp;
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="ap-btn ap-btn--ghost"
            onClick={() =>
              setLocal((p) => ({ ...p, SGD: p.SGD || 1.05 }))
            }
          >
            Add Row
          </button>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="ap-btn ap-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="ap-btn ap-btn--primary" onClick={() => onSave(local)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/** **********************************************************************
 * ADMIN PANEL
 *********************************************************************** */
function AdminPanel({ authed }) {
  const [rows, setRows] = useState([]);
  const [fx, setFx] = useState({ SGD: 1.05, IDR: 10000, MYR: 0.65, PHP: 38, USD: 0.67, AUD: 1 });
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sort, setSort] = useState({ key: "submittedAt", dir: "desc" });
  const [fxOpen, setFxOpen] = useState(false);

  // Map
  const mapRef = useRef(null);
  const leafletRef = useRef({ L: null, map: null, layer: null });

  const loadLeaflet = async () => {
    if (leafletRef.current.L) return leafletRef.current.L;
    const L = await import("leaflet");
    await import("leaflet/dist/leaflet.css");
    leafletRef.current.L = L;
    return L;
  };

  const refresh = async () => {
    try {
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=list`);
      const j = await res.json();
      if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);
      setRows(j.rows || []);
      setFx(j.fx || fx);
    } catch (err) {
      alert("Refresh failed: " + (err.message || err));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    (async () => {
      const L = await loadLeaflet();
      if (!mapRef.current) return;
      if (!leafletRef.current.map) {
        const map = L.map(mapRef.current).setView([1.35, 103.82], 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
        leafletRef.current.map = map;
      }
      // draw markers
      if (leafletRef.current.layer) {
        leafletRef.current.layer.remove();
      }
      const g = L.layerGroup();
      (rows || []).forEach((r) => {
        if (!r.lat || !r.lng) return;
        const s = r.status || "pending";
        const color =
          s === "approved" ? "#22c55e" : s === "closed" ? "#ef4444" : "#3b82f6";
        const circle = L.circleMarker([Number(r.lat), Number(r.lng)], {
          radius: 7,
          color,
          fillColor: color,
          fillOpacity: 0.7,
          weight: 1,
        }).bindPopup(
          `<strong>${r.customerName || ""}</strong><br/>${r.customerLocation ||
            ""}<br/>${r.solution || ""}<br/>Status: ${s}`
        );
        g.addLayer(circle);
      });
      g.addTo(leafletRef.current.map);
      leafletRef.current.layer = g;
    })();
  }, [rows]);

  const saveFx = async (localFx) => {
    try {
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=fx-set`, {
        method: "POST",
        body: JSON.stringify({ action: "fx-set", fx: localFx }),
      });
      const j = await res.json();
      if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);
      setFx(localFx);
      setFxOpen(false);
    } catch (err) {
      alert("FX save failed: " + (err.message || err));
    }
  };

  const updateStatus = async (row, status) => {
    try {
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=updateStatus`, {
        method: "POST",
        body: JSON.stringify({ action: "updateStatus", id: row.id, status }),
      });
      const j = await res.json();
      if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      alert("Update failed: " + (err.message || err));
    }
  };

  const audOf = (r) => {
    const v = Number(r.value || 0);
    const rate = Number((fx || {})[r.currency] || 1);
    if (!v || !rate) return 0;
    return r.currency === "AUD" ? v : v * rate;
  };
  const totalAUD = (rows || []).reduce((s, r) => s + audOf(r), 0);

  const filtered = useMemo(() => {
    let out = (rows || []).slice();
    if (q) {
      const m = q.toLowerCase();
      out = out.filter((r) =>
        [
          r.customerName,
          r.customerLocation,
          r.solution,
          r.resellerName,
          r.stage,
          r.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(m)
      );
    }
    if (filterStatus !== "All") {
      out = out.filter((r) => (r.status || "pending") === filterStatus.toLowerCase());
    }
    const dir = sort.dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const k = sort.key;
      let A = a[k],
        B = b[k];
      if (k === "value") {
        A = Number(a.value || 0);
        B = Number(b.value || 0);
      } else if (k === "submittedAt" || k === "expectedCloseDate") {
        A = new Date(a[k] || 0).getTime();
        B = new Date(b[k] || 0).getTime();
      } else {
        A = (A || "").toString().toLowerCase();
        B = (B || "").toString().toLowerCase();
      }
      if (A < B) return -1 * dir;
      if (A > B) return 1 * dir;
      return 0;
    });
    return out;
  }, [rows, q, filterStatus, sort]);

  const Th = ({ k, children }) => (
    <th
      className="ap-th px-3 py-2 text-left cursor-pointer select-none"
      onClick={() =>
        setSort((s) => ({
          key: k,
          dir: s.key === k && s.dir === "desc" ? "asc" : "desc",
        }))
      }
      title="Sort"
    >
      {children} {sort.key === k ? (sort.dir === "desc" ? "↓" : "↑") : ""}
    </th>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <div className="ap-card p-4">
          <div className="text-sm text-gray-500">Total registrations</div>
          <div className="text-2xl font-bold">{rows.length}</div>
        </div>
        <div className="ap-card p-4">
          <div className="text-sm text-gray-500">Pending review</div>
          <div className="text-2xl font-bold">
            {rows.filter((r) => (r.status || "pending") === "pending").length}
          </div>
        </div>
        <div className="ap-card p-4">
          <div className="text-sm text-gray-500">Total value (AUD)</div>
          <div className="text-2xl font-bold">
            A${" "}
            {totalAUD.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 gap-3">
        <input
          className="rounded-xl border px-3 py-2 w-full sm:w-80"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-xl border px-3 py-2"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option>All</option>
          <option>pending</option>
          <option>approved</option>
          <option>closed</option>
        </select>
        <div className="flex items-center gap-2">
          <button className="ap-btn ap-btn--primary" onClick={refresh}>
            Refresh
          </button>
          <button className="ap-btn ap-btn--ghost" onClick={() => setFxOpen(true)}>
            FX Settings
          </button>
        </div>
      </div>

      <div ref={mapRef} className="ap-card h-[360px] mb-4" />

      <div className="overflow-x-auto ap-card">
        <table className="min-w-full text-sm">
          <thead className="bg-[#fff7ec]">
            <tr>
              <Th k="submittedAt">Submitted</Th>
              <Th k="customerName">Customer</Th>
              <Th k="customerLocation">Location</Th>
              <Th k="solution">Solution</Th>
              <Th k="value">Value</Th>
              <Th k="stage">Stage</Th>
              <Th k="status">Status</Th>
              <Th k="expectedCloseDate">Expected Close</Th>
              <th className="ap-th px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const status = (r.status || "pending").toLowerCase();
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{fmtDate(r.submittedAt)}</td>
                  <td className="px-3 py-2">{r.customerName}</td>
                  <td className="px-3 py-2">{r.customerLocation}</td>
                  <td className="px-3 py-2">{r.solution}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.currency}{" "}
                    {Number(r.value || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="px-3 py-2 capitalize">{r.stage}</td>
                  <td className="px-3 py-2">
                    {status === "approved" ? (
                      <span className="ap-badge ap-badge--approved">approved</span>
                    ) : status === "closed" ? (
                      <span className="ap-badge ap-badge--closed">closed</span>
                    ) : (
                      <span className="ap-badge ap-badge--pending">pending</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{fmtDate(r.expectedCloseDate)}</td>
                  <td className="px-3 py-2">
                    <div className="ap-actions">
                      {status !== "approved" && status !== "closed" && (
                        <button
                          className="ap-btn ap-btn--primary"
                          onClick={() => updateStatus(r, "approved")}
                        >
                          Approve
                        </button>
                      )}
                      {status !== "closed" && (
                        <button
                          className="ap-btn ap-btn--ghost"
                          onClick={() => updateStatus(r, "closed")}
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
                <td className="px-3 py-6 text-center text-gray-500" colSpan={9}>
                  No rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <FxModal open={fxOpen} onClose={() => setFxOpen(false)} onSave={saveFx} rates={fx} />
    </div>
  );
}

/** **********************************************************************
 * ROOT
 *********************************************************************** */
function App() {
  const [tab, setTab] = useState("reseller");
  const [authed, setAuthed] = useState(false);

  return (
    <>
      <BrandCSS />
      <Header tab={tab} setTab={setTab} authed={authed} onSignOut={() => setAuthed(false)} />
      {tab === "reseller" ? (
        <SubmissionForm onSubmitted={() => {}} />
      ) : authed ? (
        <AdminPanel authed={authed} />
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="ap-card p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-2">Admin sign-in</h3>
            <PasswordGate onOK={() => setAuthed(true)} />
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}

function PasswordGate({ onOK }) {
  const [pw, setPw] = useState("");
  const ADMIN_PASSWORD = "Aptella2025!";
  return (
    <div className="grid gap-3">
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="Enter admin password"
        className="rounded-xl border px-3 py-2"
      />
      <button
        className="ap-btn ap-btn--primary"
        onClick={() =>
          pw === ADMIN_PASSWORD ? onOK() : alert("Incorrect password")
        }
      >
        Continue
      </button>
    </div>
  );
}

function Footer() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-xs text-gray-500">
      © {new Date().getFullYear()} Aptella — Xgrids Master Distributor
    </div>
  );
}

export default App;
