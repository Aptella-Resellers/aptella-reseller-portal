import React, { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   CONFIG / CONSTANTS
   ========================= */

const GAS = {
  // Set this to your published Apps Script "Web app" URL
  BASE:
    (typeof GOOGLE_APPS_SCRIPT_URL !== "undefined" && GOOGLE_APPS_SCRIPT_URL) ||
    "",
  list: (b) => `${b}?action=list`,
  submit: (b) => `${b}?action=submit`,
  update: (b) => `${b}?action=update`,
  fxGet: (b) => `${b}?action=fx-get`,
  fxSet: (b) => `${b}?action=fx-set`,
};

const ADMIN_PASSWORD = "Aptella2025!";

// Brand
const BRAND = {
  navy: "#0e3446",
  navyDark: "#0b2938",
  orange: "#f0a03a",
  primaryBtn: "bg-[#0e3446] hover:bg-[#0b2938]",
  ghostBtn:
    "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700",
  pill: "rounded-full px-2.5 py-1 text-xs font-medium",
  pillPending: "bg-blue-50 text-blue-700 border border-blue-200",
  pillApproved: "bg-green-50 text-green-700 border border-green-200",
  pillClosed: "bg-red-50 text-red-700 border border-red-200",
  pillWarning: "bg-orange-50 text-orange-700 border border-orange-200",
};

const COUNTRIES = ["Indonesia", "Malaysia", "Philippines", "Singapore"];
const RES_COUNTRY_OPTIONS = ["Select country", ...COUNTRIES];
const CURRENCIES = ["AUD", "SGD", "IDR", "MYR", "PHP", "USD"];
const INDUSTRIES = [
  "Construction",
  "Survey / Mapping",
  "Mining",
  "Oil & Gas",
  "Utilities",
  "Telecom",
  "Transport / Logistics",
  "Government",
  "Education",
  "Other",
];
const SUPPORT_OPTIONS = [
  "Pre-sales engineer",
  "Demo / loan unit",
  "Pricing exception",
  "Marketing materials",
  "Partner training",
  "On-site customer visit",
  "Extended lock request",
];
const XGRIDS_SOLUTIONS = [
  "Xgrids L2 PRO",
  "Xgrids K1",
  "Xgrids PortalCam",
  "Xgrids Drone Kit",
  "__OTHER__",
];

const DEFAULT_RATES_AUD = {
  AUD: 1,
  SGD: 1.05,
  USD: 1.5,
  MYR: 0.33,
  PHP: 0.028,
  IDR: 0.0001,
};

const CAPITALS = {
  Indonesia: { lat: -6.2088, lng: 106.8456, city: "Jakarta", currency: "IDR" },
  Singapore: { lat: 1.3521, lng: 103.8198, city: "Singapore", currency: "SGD" },
  Malaysia: { lat: 3.139, lng: 101.6869, city: "Kuala Lumpur", currency: "MYR" },
  Philippines: { lat: 14.5995, lng: 120.9842, city: "Manila", currency: "PHP" },
};

const STAGES = [
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];
const PROB_BY_STAGE = { qualified: 35, proposal: 55, negotiation: 70, won: 100, lost: 0 };

const I18N = {
  en: {
    resellerCountry: "Reseller Country",
    selectCountry: "Select country",
    resellerLocation: "Reseller Location",
    resellerCompany: "Reseller company",
    primaryContact: "Primary contact",
    contactEmail: "Contact email",
    contactPhone: "Contact phone",
    customerName: "Customer name",
    customerCity: "Customer City",
    customerCountry: "Customer Country",
    mapOption: "Map option (paste lat,lng or use link)",
    openMap: "Open Map",
    solutionOffered: "Solution offered (Xgrids)",
    selectSolution: "Select an Xgrids solution",
    otherSolution: "Other solution",
    learnXgrids: "Learn about Xgrids",
    expectedClose: "Expected close date",
    industry: "Industry",
    dealValue: "Deal value",
    stage: "Sales stage",
    probability: "Probability (%)",
    competitors: "Competitors",
    supportRequested: "Support requested",
    evidence: "Evidence (required)",
    chooseFiles: "Choose files",
    emailEvidence: `Email attached files to Aptella (admin.asia@aptella.com)`,
    notes: "Notes",
    consent:
      "I confirm details are accurate and consent to data storage for deal management",
    submit: "Submit Registration",
    reset: "Reset",
  },
  id: {
    resellerCountry: "Negara Reseller",
    selectCountry: "Pilih negara",
    resellerLocation: "Lokasi Reseller",
    resellerCompany: "Perusahaan reseller",
    primaryContact: "Kontak utama",
    contactEmail: "Email kontak",
    contactPhone: "Telepon kontak",
    customerName: "Nama pelanggan",
    customerCity: "Kota Pelanggan",
    customerCountry: "Negara Pelanggan",
    mapOption: "Opsi peta (tempel lat,lng atau gunakan tautan)",
    openMap: "Buka Peta",
    solutionOffered: "Solusi ditawarkan (Xgrids)",
    selectSolution: "Pilih solusi Xgrids",
    otherSolution: "Solusi lainnya",
    learnXgrids: "Pelajari tentang Xgrids",
    expectedClose: "Perkiraan tanggal penutupan",
    industry: "Industri",
    dealValue: "Nilai transaksi",
    stage: "Tahap penjualan",
    probability: "Probabilitas (%)",
    competitors: "Pesaing",
    supportRequested: "Dukungan yang diminta",
    evidence: "Bukti (wajib)",
    chooseFiles: "Pilih berkas",
    emailEvidence: `Kirim berkas terlampir ke Aptella (admin.asia@aptella.com)`,
    notes: "Catatan",
    consent:
      "Saya mengonfirmasi detail akurat dan menyetujui penyimpanan data untuk pengelolaan deal",
    submit: "Kirim Pendaftaran",
    reset: "Atur ulang",
  },
};

/* =========================
   UTILS
   ========================= */

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (iso, d) => {
  const x = new Date(iso);
  x.setDate(x.getDate() + Number(d || 0));
  return x.toISOString().slice(0, 10);
};
const moneyAUD = (v) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const fileListToBase64 = async (list, maxMB = 20) => {
  const files = Array.from(list || []);
  let total = 0;
  const items = await Promise.all(
    files.map(
      (f) =>
        new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => {
            const s = String(r.result || "");
            const b64 = s.split(",")[1] || "";
            total += (b64.length * 3) / 4;
            res({
              name: f.name,
              type: f.type || "application/octet-stream",
              data: b64,
            });
          };
          r.onerror = rej;
          r.readAsDataURL(f);
        })
    )
  );
  if (total > maxMB * 1024 * 1024)
    throw new Error(`Attachments exceed ${maxMB}MB total.`);
  return items;
};

const statusPill = (s) => {
  const base = BRAND.pill;
  if (s === "approved" || s === "locked") return `${base} ${BRAND.pillApproved}`;
  if (s === "closed" || s === "lost") return `${base} ${BRAND.pillClosed}`;
  if (s === "warning") return `${base} ${BRAND.pillWarning}`;
  return `${base} ${BRAND.pillPending}`;
};

/* =========================
   LEAFLET (CDN)
   ========================= */

let leafletP;
function loadLeaflet() {
  if (leafletP) return leafletP;
  leafletP = new Promise((resolve, reject) => {
    if (window.L && window.L.MarkerClusterGroup) return resolve(window.L);
    const css1 = document.createElement("link");
    css1.rel = "stylesheet";
    css1.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css1);
    const css2 = document.createElement("link");
    css2.rel = "stylesheet";
    css2.href =
      "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
    document.head.appendChild(css2);
    const css3 = document.createElement("link");
    css3.rel = "stylesheet";
    css3.href =
      "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
    document.head.appendChild(css3);

    const s1 = document.createElement("script");
    s1.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src =
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
      s2.onload = () => resolve(window.L);
      s2.onerror = reject;
      document.body.appendChild(s2);
    };
    s1.onerror = reject;
    document.body.appendChild(s1);
  });
  return leafletP;
}

/* =========================
   SMALL ATOMS
   ========================= */

function Card({ children, className = "" }) {
  return <div className={`card rounded-2xl bg-white ${className}`}>{children}</div>;
}
function CardHeader({ title, subtitle, right }) {
  return (
    <div className="px-5 pt-5 pb-2 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
function CardBody({ children }) {
  return <div className="px-5 pb-5">{children}</div>;
}
function Label({ children, required, ...rest }) {
  return (
    <label
      aria-required={required ? "true" : undefined}
      className="text-sm font-medium text-slate-700"
      {...rest}
    >
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}
const Input = (p) => (
  <input
    {...p}
    className={`border rounded-lg px-3 py-2 w-full ${p.className || ""}`}
  />
);
const Select = (p) => (
  <select
    {...p}
    className={`border rounded-lg px-3 py-2 w-full ${p.className || ""}`}
  />
);
const Textarea = (p) => (
  <textarea
    {...p}
    className={`border rounded-lg px-3 py-2 w-full ${p.className || ""}`}
  />
);

/* =========================
   SUBMISSION FORM
   ========================= */

function SubmissionForm({ onSavedLocal }) {
  const [form, setForm] = useState({
    resellerCountry: "Select country",
    resellerLocation: "",
    resellerCompany: "",
    resellerContact: "",
    resellerEmail: "",
    resellerPhone: "",
    customerName: "",
    customerCity: "",
    customerCountry: "",
    currency: "SGD",
    lat: "",
    lng: "",
    solution: "",
    solutionOther: "",
    industry: "",
    value: "",
    stage: "qualified",
    probability: PROB_BY_STAGE.qualified,
    expectedCloseDate: addDaysISO(todayISO(), 14),
    supports: [],
    competitors: [],
    notes: "",
    evidenceFiles: [],
    emailEvidence: true,
    accept: false,
  });
  const [errors, setErrors] = useState({});
  const locale = form.resellerCountry === "Indonesia" ? "id" : "en";
  const t = (k) => I18N[locale][k] || I18N.en[k] || k;

  useEffect(() => {
    setForm((f) => ({
      ...f,
      probability: PROB_BY_STAGE[f.stage] ?? f.probability,
    }));
  }, [form.stage]);

  useEffect(() => {
    const cap = CAPITALS[form.customerCountry];
    if (cap) {
      setForm((f) => ({
        ...f,
        customerCity: cap.city,
        lat: cap.lat,
        lng: cap.lng,
        currency: f.currency || cap.currency,
      }));
    }
  }, [form.customerCountry]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }
  function toggleSupport(opt) {
    setForm((f) => {
      const s = new Set(f.supports);
      if (s.has(opt)) s.delete(opt);
      else s.add(opt);
      return { ...f, supports: Array.from(s) };
    });
  }
  function handleFiles(e) {
    setForm((f) => ({ ...f, evidenceFiles: Array.from(e.target.files || []) }));
  }

  function validate() {
    const e = {};
    const req = (k, label) => {
      if (!String(form[k] || "").trim()) e[k] = `${label || k} required`;
    };
    if (form.resellerCountry === "Select country")
      e.resellerCountry = "Country required";
    req("resellerLocation", t("resellerLocation"));
    req("resellerCompany", t("resellerCompany"));
    req("resellerContact", t("primaryContact"));
    req("resellerEmail", t("contactEmail"));
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail || ""))
      e.resellerEmail = "Valid email required";
    req("customerName", t("customerName"));
    req("customerCity", t("customerCity"));
    req("customerCountry", t("customerCountry"));
    if (!form.solution || (form.solution === "__OTHER__" && !form.solutionOther.trim()))
      e.solution = "Solution required";
    if (!(form.value && Number(form.value) > 0)) e.value = "Positive value required";
    if (!(form.lat !== "" && form.lng !== "")) e.lat = "Lat/Lng required";
    if (!form.evidenceFiles || form.evidenceFiles.length === 0)
      e.evidence = "Evidence files required";
    if (!form.accept) e.accept = "You must confirm";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    const solutionFinal =
      form.solution === "__OTHER__" ? form.solutionOther : form.solution;

    const record = {
      id:
        Math.random().toString(36).slice(2) + Date.now().toString(36),
      submittedAt: todayISO(),
      resellerCountry: form.resellerCountry,
      resellerLocation: form.resellerLocation,
      resellerName: form.resellerCompany,
      resellerContact: form.resellerContact,
      resellerEmail: form.resellerEmail,
      resellerPhone: form.resellerPhone,
      customerName: form.customerName,
      customerLocation: `${form.customerCity}, ${form.customerCountry}`,
      city: form.customerCity,
      country: form.customerCountry,
      lat: Number(form.lat),
      lng: Number(form.lng),
      industry: form.industry,
      currency: form.currency,
      value: Number(form.value),
      solution: solutionFinal,
      stage: form.stage,
      probability: Number(form.probability),
      expectedCloseDate: form.expectedCloseDate,
      status: "pending",
      lockExpiry: "",
      syncedAt: "",
      remindersOptIn: false,
      supports: form.supports,
      competitors: form.competitors,
      notes: form.notes,
      evidenceLinks: [],
      updates: [],
    };

    onSavedLocal?.(record);

    try {
      if (!GAS.BASE) throw new Error("Apps Script URL missing");
      const attachments = await fileListToBase64(form.evidenceFiles);
      const payload = {
        ...record,
        attachments,
        emailEvidence: true,
        evidenceEmail: "admin.asia@aptella.com",
      };
      const res = await fetch(GAS.submit(GAS.BASE), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      let json = null;
      try {
        json = JSON.parse(txt);
      } catch {}
      if (!res.ok || (json && json.ok === false)) {
        alert(
          `Submitted locally. Google Sheets sync failed: ${
            json?.error || `HTTP ${res.status} ${res.statusText}`
          }`
        );
      } else {
        alert("Submitted and synced to Google Sheets.");
      }
    } catch (err) {
      alert(
        `Submitted locally. Google Sheets sync failed: ${
          err?.message || err
        }`
      );
    }

    setForm((f) => ({
      ...f,
      resellerLocation: "",
      resellerCompany: "",
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
      probability: PROB_BY_STAGE.qualified,
      expectedCloseDate: addDaysISO(todayISO(), 14),
      supports: [],
      competitors: [],
      notes: "",
      evidenceFiles: [],
      accept: false,
    }));
    const el = document.getElementById("evidenceFiles");
    if (el) el.value = "";
  }

  return (
    <Card className="mt-6">
      <CardHeader
        title="Register Upcoming Deal (within 60 days)"
        subtitle="Fields marked * are mandatory."
      />
      <CardBody>
        <form className="grid gap-6" onSubmit={submit}>
          {/* Row 1 */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label required> {t("resellerCountry")} </Label>
              <Select
                name="resellerCountry"
                value={form.resellerCountry}
                onChange={handleChange}
              >
                {RES_COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c === "Select country" ? t("selectCountry") : c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label required>{t("resellerLocation")}</Label>
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
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label required>{t("resellerCompany")}</Label>
              <Input name="resellerCompany" value={form.resellerCompany} onChange={handleChange} />
              {errors.resellerCompany && <p className="text-xs text-red-600">{errors.resellerCompany}</p>}
            </div>
            <div className="grid gap-2">
              <Label required>{t("primaryContact")}</Label>
              <Input name="resellerContact" value={form.resellerContact} onChange={handleChange} />
              {errors.resellerContact && <p className="text-xs text-red-600">{errors.resellerContact}</p>}
            </div>
            <div className="grid gap-2">
              <Label required>{t("contactEmail")}</Label>
              <Input type="email" name="resellerEmail" value={form.resellerEmail} onChange={handleChange} />
              {errors.resellerEmail && <p className="text-xs text-red-600">{errors.resellerEmail}</p>}
            </div>
            <div className="grid gap-2">
              <Label>{t("contactPhone")}</Label>
              <Input name="resellerPhone" value={form.resellerPhone} onChange={handleChange} />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label required>{t("customerName")}</Label>
              <Input name="customerName" value={form.customerName} onChange={handleChange} />
              {errors.customerName && <p className="text-xs text-red-600">{errors.customerName}</p>}
            </div>
            <div className="grid gap-2">
              <Label required>{t("customerCountry")}</Label>
              <Select name="customerCountry" value={form.customerCountry} onChange={handleChange}>
                <option value="">{t("selectCountry")}</option>
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              {errors.customerCountry && <p className="text-xs text-red-600">{errors.customerCountry}</p>}
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label required>{t("customerCity")}</Label>
              <Input name="customerCity" value={form.customerCity} onChange={handleChange} />
              {errors.customerCity && <p className="text-xs text-red-600">{errors.customerCity}</p>}
            </div>
            <div className="grid gap-2">
              <Label required>{t("mapOption")}</Label>
              <div className="flex gap-2">
                <Input placeholder="lat" name="lat" value={form.lat} onChange={handleChange} />
                <Input placeholder="lng" name="lng" value={form.lng} onChange={handleChange} />
                <a
                  className={`px-3 py-2 rounded-lg text-white text-sm ${BRAND.primaryBtn}`}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${form.customerCity || ""}, ${form.customerCountry || ""}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("openMap")}
                </a>
              </div>
              {errors.lat && <p className="text-xs text-red-600">{errors.lat}</p>}
            </div>

            <div className="grid gap-2">
              <Label required>{t("solutionOffered")}</Label>
              <Select name="solution" value={form.solution} onChange={handleChange}>
                <option value="">{t("selectSolution")}</option>
                {XGRIDS_SOLUTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "__OTHER__" ? "+ Other (type)" : s}
                  </option>
                ))}
              </Select>
              {form.solution === "__OTHER__" && (
                <Input
                  className="mt-2"
                  placeholder={t("otherSolution")}
                  name="solutionOther"
                  value={form.solutionOther}
                  onChange={handleChange}
                />
              )}
              <a
                className="text-[#f0a03a] underline text-xs mt-1 inline-block"
                href="https://www.aptella.com/asia/product-brands/xgrids-asia/"
                target="_blank"
                rel="noreferrer"
              >
                {t("learnXgrids")}
              </a>
              {errors.solution && <p className="text-xs text-red-600">{errors.solution}</p>}
            </div>
          </div>

          {/* Row 5 */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label required>{t("expectedClose")}</Label>
              <Input
                type="date"
                name="expectedCloseDate"
                value={form.expectedCloseDate}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("industry")}</Label>
              <Select name="industry" value={form.industry} onChange={handleChange}>
                <option value="">{locale === "id" ? "Pilih industri" : "Select industry"}</option>
                {INDUSTRIES.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>
                {t("dealValue")} <span className="text-slate-400">({form.currency})</span>
              </Label>
              <Input type="number" step="0.01" min="0" name="value" value={form.value} onChange={handleChange} />
              {errors.value && <p className="text-xs text-red-600">{errors.value}</p>}
            </div>
          </div>

          {/* Row 6 */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>{t("stage")}</Label>
              <Select name="stage" value={form.stage} onChange={handleChange}>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("probability")}</Label>
              <Input type="number" min="0" max="100" name="probability" value={form.probability} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label>{t("competitors")}</Label>
              <Input
                placeholder={locale === "id" ? "Pisahkan dengan koma (opsional)" : "Comma separated (optional)"}
                name="competitors"
                value={(form.competitors || []).join(", ")}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    competitors: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            </div>
          </div>

          {/* Support */}
          <div className="grid gap-2">
            <Label>{t("supportRequested")}</Label>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SUPPORT_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.supports.includes(opt)} onChange={() => toggleSupport(opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* Evidence */}
          <div className="grid gap-2">
            <Label required>{t("evidence")}</Label>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <input
                  id="evidenceFiles"
                  type="file"
                  multiple
                  onChange={handleFiles}
                  className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#fff5e9] file:px-3 file:py-2 file:text-[#b66300]"
                />
                {errors.evidence && (
                  <p className="text-xs text-red-600 mt-1">{errors.evidence}</p>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm mt-1">
              <input type="checkbox" checked readOnly />
              {t("emailEvidence")}
            </label>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label>{t("notes")}</Label>
            <Textarea
              rows={4}
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder={
                locale === "id"
                  ? "Persyaratan utama, ruang lingkup teknis, kendala pengiriman, proses keputusan, dll."
                  : "Key requirements, technical scope, delivery constraints, decision process, etc."
              }
            />
          </div>

          {/* Consent */}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="accept" checked={!!form.accept} onChange={handleChange} />
            {t("consent")}
          </label>
          {errors.accept && <p className="text-xs text-red-600 -mt-3">{errors.accept}</p>}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button type="submit" className={`px-4 py-2 rounded-xl text-white ${BRAND.primaryBtn}`}>
              {t("submit")}
            </button>
            <button type="button" className="px-4 py-2 rounded-xl bg-[#fff5e9] text-[#b66300]" onClick={() => window.location.reload()}>
              {t("reset")}
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/* =========================
   ADMIN PANEL
   ========================= */

function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState([]);
  const [rates, setRates] = useState(DEFAULT_RATES_AUD);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [fxOpen, setFxOpen] = useState(false);

  // sorting
  const [sortKey, setSortKey] = useState("submittedAt");
  const [sortDir, setSortDir] = useState("desc"); // 'asc' | 'desc'

  const mapDiv = useRef(null);
  const map = useRef(null);
  const clusterLayer = useRef(null);
  const circlesLayer = useRef(null);

  async function refresh() {
    try {
      if (!GAS.BASE) throw new Error("Apps Script URL missing");
      const res = await fetch(GAS.list(GAS.BASE));
      const txt = await res.text();
      let json = null;
      try { json = JSON.parse(txt); } catch {}
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status} ${res.statusText}`);
      setRows(json.rows || []);
      setRates({ ...DEFAULT_RATES_AUD, ...(json.fx || {}) });
    } catch (e) {
      alert(`Refresh failed: ${e?.message || e}`);
    }
  }
  useEffect(() => { refresh(); }, []);

  // Map update
  useEffect(() => {
    (async () => {
      await loadLeaflet();
      const L = window.L;
      if (!map.current) {
        map.current = L.map(mapDiv.current).setView([1.3521, 103.8198], 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map.current);
      }
      if (clusterLayer.current) clusterLayer.current.remove();
      if (circlesLayer.current) circlesLayer.current.remove();

      const c = L.markerClusterGroup();
      const g = L.layerGroup();

      const items = sortedFiltered();

      // Bubble totals by city
      const groups = {};
      for (const r of items) {
        if (!r.lat || !r.lng) continue;
        const key = `${r.city}|${r.country}|${r.lat}|${r.lng}`;
        const valAUD = (rates[r.currency] || 0) * (Number(r.value) || 0);
        if (!groups[key]) groups[key] = { lat: Number(r.lat), lng: Number(r.lng), total: 0 };
        groups[key].total += valAUD;
      }
      Object.values(groups).forEach((t) => {
        const radius = Math.sqrt(Math.max(t.total, 1)) * 10;
        const circle = L.circle([t.lat, t.lng], {
          radius,
          color: BRAND.navy,
          fillColor: BRAND.navy,
          fillOpacity: 0.16,
        }).bindTooltip(`${moneyAUD(t.total)} AUD`);
        g.addLayer(circle);
      });

      items.forEach((r) => {
        if (!r.lat || !r.lng) return;
        const m = L.marker([Number(r.lat), Number(r.lng)]);
        const pill =
          r.status === "approved"
            ? `<span style="background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;border-radius:999px;padding:2px 8px;font-size:11px;">approved</span>`
            : r.status === "closed"
            ? `<span style="background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:999px;padding:2px 8px;font-size:11px;">closed</span>`
            : `<span style="background:#fff5e9;color:#b45309;border:1px solid #fed7aa;border-radius:999px;padding:2px 8px;font-size:11px;">pending</span>`;
        m.bindPopup(
          `<div style="font-weight:600;margin-bottom:4px">${r.customerName}</div>
           <div style="font-size:12px;color:#334155">${r.customerLocation}</div>
           <div style="font-size:12px;margin-top:6px">${r.solution} • ${r.currency} ${Number(r.value).toLocaleString()}</div>
           <div style="margin-top:6px">${pill}</div>`
        );
        c.addLayer(m);
      });

      c.addTo(map.current);
      g.addTo(map.current);
      clusterLayer.current = c;
      circlesLayer.current = g;

      const b = c.getBounds();
      if (b.isValid()) map.current.fitBounds(b.pad(0.2));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, rates, country, search, sortKey, sortDir]);

  function sortedFiltered() {
    let items = rows.slice();
    if (country !== "All")
      items = items.filter((r) => (r.country || "").toLowerCase() === country.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (r) =>
          (r.customerName || "").toLowerCase().includes(q) ||
          (r.solution || "").toLowerCase().includes(q) ||
          (r.resellerName || "").toLowerCase().includes(q) ||
          (r.customerLocation || "").toLowerCase().includes(q)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    items.sort((a, b) => {
      const A = a[sortKey], B = b[sortKey];
      if (sortKey === "value") return (Number(A) - Number(B)) * dir;
      if (sortKey === "submittedAt" || sortKey === "expectedCloseDate")
        return (new Date(A) - new Date(B)) * dir;
      return String(A || "").localeCompare(String(B || "")) * dir;
    });
    return items;
  }

  async function doUpdate(id, patch) {
    try {
      if (!GAS.BASE) throw new Error("Apps Script URL missing");
      const res = await fetch(GAS.update(GAS.BASE), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const txt = await res.text();
      let json = null;
      try { json = JSON.parse(txt); } catch {}
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status} ${res.statusText}`);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    } catch (e) {
      alert(`Update failed: ${e?.message || e}`);
    }
  }

  function exportCSV(items) {
    const cols = [
      "id","submittedAt","resellerCountry","resellerLocation","resellerName",
      "resellerContact","resellerEmail","resellerPhone","customerName",
      "customerLocation","city","country","lat","lng","industry","currency",
      "value","solution","stage","probability","expectedCloseDate","status",
      "lockExpiry","syncedAt","remindersOptIn","supports","competitors",
      "notes","evidenceLinks","updates",
    ];
    const head = cols.join(",");
    const body = items.map((x)=>
      cols.map((k)=>{
        const val = String(x[k] ?? "").replace(/\n/g," ").replace(/"/g,'""');
        return `"${val}"`;
      }).join(",")
    ).join("\n");
    const blob = new Blob([head+"\n"+body], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `registrations_${todayISO()}.csv`;
    a.click();
  }

  // FX drawer
  const FxDrawer = () =>
    !fxOpen ? null : (
      <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl w-[min(720px,95vw)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">FX Rates to AUD</h3>
            <button onClick={() => setFxOpen(false)} className="px-2 py-1 rounded-lg bg-gray-100">Close</button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {Object.entries(rates).map(([cur, val]) => (
              <div key={cur} className="grid grid-cols-3 gap-2 items-center">
                <Input
                  value={cur}
                  onChange={(e) => {
                    const n = e.target.value.toUpperCase();
                    setRates((prev) => {
                      const { [cur]: _, ...rest } = prev;
                      return { ...rest, [n]: val };
                    });
                  }}
                />
                <Input
                  type="number"
                  step="0.000001"
                  value={val}
                  onChange={(e) => setRates((p) => ({ ...p, [cur]: Number(e.target.value) }))}
                />
                <button
                  className="text-red-600 text-sm"
                  onClick={() => setRates((p) => {
                    const cp = { ...p }; delete cp[cur]; return cp;
                  })}
                >
                  Remove
                </button>
              </div>
            ))}
            <button className="text-sm px-3 py-1 rounded-md bg-gray-100" onClick={() => setRates((p) => ({ ...p, USD: p.USD || 1.5 }))}>
              Add Row
            </button>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setFxOpen(false)} className="px-3 py-1.5 rounded-lg bg-gray-100">Cancel</button>
            <button
              onClick={async () => {
                try {
                  if (!GAS.BASE) throw new Error("Apps Script URL missing");
                  const res = await fetch(GAS.fxSet(GAS.BASE), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fx: rates }),
                  });
                  const txt = await res.text();
                  let json=null; try{ json=JSON.parse(txt);}catch{}
                  if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status} ${res.statusText}`);
                  alert("FX saved.");
                  setFxOpen(false);
                } catch (e) {
                  alert(`FX save failed: ${e?.message || e}`);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-white ${BRAND.primaryBtn}`}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );

  if (!authed) {
    return (
      <Card className="mt-6">
        <CardHeader title="Admin Access" subtitle="Enter password to manage registrations." />
        <CardBody>
          <div className="flex items-center gap-3">
            <Input type="password" placeholder="Admin password" id="adminPw" />
            <button
              className={`px-3 py-2 rounded-lg text-white ${BRAND.primaryBtn}`}
              onClick={() => {
                const pw = document.getElementById("adminPw").value || "";
                if (pw === ADMIN_PASSWORD) setAuthed(true);
                else alert("Incorrect password.");
              }}
            >
              Sign in
            </button>
          </div>
        </CardBody>
      </Card>
    );
  }

  const metrics = useMemo(() => {
    const items = sortedFiltered();
    let total = 0, pending = 0, approved = 0;
    items.forEach((r) => {
      total += (rates[r.currency] || 0) * (Number(r.value) || 0);
      if (r.status === "approved" || r.status === "locked") approved++;
      else if (r.status !== "closed") pending++;
    });
    return { count: items.length, total, pending, approved };
  }, [rows, rates, search, country, sortKey, sortDir]);

  return (
    <>
      <FxDrawer />
      <Card className="mt-6">
        <CardHeader
          title="Register opportunities within the next 60 days"
          right={
            <div className="flex gap-2">
              <button onClick={refresh} className={`px-3 py-2 rounded-lg text-white ${BRAND.primaryBtn}`}>Refresh</button>
              <button onClick={() => exportCSV(sortedFiltered())} className={`px-3 py-2 rounded-lg ${BRAND.ghostBtn}`}>Export CSV</button>
              <button
                onClick={async () => {
                  try {
                    if (!GAS.BASE) throw new Error("Apps Script URL missing");
                    const res = await fetch(GAS.fxGet(GAS.BASE));
                    const txt = await res.text();
                    let json=null; try{ json = JSON.parse(txt); }catch{}
                    if (json?.ok && json.fx) setRates({ ...DEFAULT_RATES_AUD, ...json.fx });
                    setFxOpen(true);
                  } catch { setFxOpen(true); }
                }}
                className={`px-3 py-2 rounded-lg ${BRAND.ghostBtn}`}
              >
                FX Settings
              </button>
            </div>
          }
        />
        <CardBody>
          {/* Metrics */}
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <Metric title="Total registrations" value={metrics.count} />
            <Metric title="Pending review" value={metrics.pending} />
            <Metric title="Approved / locked" value={metrics.approved} />
            <Metric title="Total value (AUD)" value={moneyAUD(metrics.total)} />
          </div>

          {/* Filters / Sort */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={country} onChange={(e) => setCountry(e.target.value)} style={{ maxWidth: 220 }}>
              <option>All</option>
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <Select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="submittedAt">Submitted date</option>
              <option value="customerLocation">Location</option>
              <option value="solution">Solution</option>
              <option value="value">Value</option>
              <option value="stage">Stage</option>
              <option value="status">Status</option>
              <option value="expectedCloseDate">Expected close date</option>
            </Select>
            <Select value={sortDir} onChange={(e) => setSortDir(e.target.value)} style={{ maxWidth: 160 }}>
              <option value="desc">Newest / High first</option>
              <option value="asc">Oldest / Low first</option>
            </Select>
          </div>

          {/* Map */}
          <div ref={mapDiv} style={{ height: 420 }} className="w-full mb-4"></div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white">
                <tr className="thead-orange">
                  <th className="p-3 text-left">Submitted</th>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-left">Solution</th>
                  <th className="p-3 text-left">Value</th>
                  <th className="p-3 text-left">Stage</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Expected Close</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedFiltered().map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-3">{r.submittedAt || ""}</td>
                    <td className="p-3">{r.customerName || ""}</td>
                    <td className="p-3">{r.customerLocation || ""}</td>
                    <td className="p-3">{r.solution || ""}</td>
                    <td className="p-3">
                      {r.currency} {Number(r.value || 0).toLocaleString()}{" "}
                      <span className="text-slate-400">
                        ({moneyAUD((rates[r.currency] || 0) * (Number(r.value) || 0))})
                      </span>
                    </td>
                    <td className="p-3">{r.stage || ""}</td>
                    <td className="p-3">
                      <span className={statusPill(r.status || "pending")}>
                        {r.status || "pending"}
                      </span>
                    </td>
                    <td className="p-3">{r.expectedCloseDate || ""}</td>
                    <td className="p-3 space-x-2">
                      <button
                        onClick={() => doUpdate(r.id, { status: "approved" })}
                        className="px-2.5 py-1.5 rounded-lg text-white bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => doUpdate(r.id, { status: "closed" })}
                        className="px-2.5 py-1.5 rounded-lg text-white bg-gray-600 hover:bg-gray-700"
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
                {sortedFiltered().length === 0 && (
                  <tr>
                    <td className="p-6 text-slate-500" colSpan={9}>No rows.</td>
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

function Metric({ title, value }) {
  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

/* =========================
   ROOT
   ========================= */

function AptellaRoot() {
  const [tab, setTab] = useState("reseller");

  return (
    <div>
      {/* NAV */}
      <div className="nav-wrap bg-white">
        <div className="nav-inner flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={"aptella-logo.png"} alt="Aptella" className="brand-logo-lg" />
            <div className="brand-badge">Master Distributor • Xgrids</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-2 rounded-lg ${
                tab === "reseller" ? "btn-primary text-white" : "btn-ghost"
              }`}
              onClick={() => setTab("reseller")}
            >
              Reseller
            </button>
            <button
              className={`px-3 py-2 rounded-lg ${
                tab === "admin" ? "btn-primary text-white" : "btn-ghost"
              }`}
              onClick={() => setTab("admin")}
            >
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div className="hero">
        <div className="hero-inner">
          <h1 className="text-2xl md:text-3xl">Reseller Deal Registration</h1>
          <p className="mt-1 text-sm md:text-base">
            Register opportunities within the next 60 days
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-4">
        {tab === "reseller" ? <SubmissionForm /> : <AdminPanel />}
      </div>
    </div>
  );
}

export default AptellaRoot;
