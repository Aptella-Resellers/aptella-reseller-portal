import React, { useEffect, useMemo, useRef, useState } from "react";

/* ===============================
   CONFIG / CONSTANTS
   =============================== */

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";

const ADMIN_PASSWORD = "Aptella2025!"; // change if needed

const BRAND = {
  navy: "#0e3446",
  orange: "#f0a03a",
  primaryBtn: "bg-[#0e3446] hover:bg-[#0b2938]",
};

const COUNTRY_CAPITAL = {
  Indonesia: { city: "Jakarta", lat: -6.2088, lng: 106.8456, currency: "IDR" },
  Malaysia: { city: "Kuala Lumpur", lat: 3.139, lng: 101.6869, currency: "MYR" },
  Philippines: { city: "Manila", lat: 14.5995, lng: 120.9842, currency: "PHP" },
  Singapore: { city: "Singapore", lat: 1.3521, lng: 103.8198, currency: "SGD" },
};

const XGRIDS_SOLUTIONS = [
  "Xgrids L2 PRO",
  "Xgrids K1",
  "Xgrids PortalCam",
  "Xgrids Drone Kit",
  "Other (type below)",
];

const STAGES = [
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

const PROB_BY_STAGE = { qualified: 35, proposal: 55, negotiation: 70, won: 100, lost: 0 };

const SUPPORTS = [
  "Pre-sales engineer",
  "Demo / loan unit",
  "Pricing exception",
  "Marketing materials",
  "Partner training",
  "On-site customer visit",
  "Extended lock request",
];

const INDUSTRIES = [
  "Construction",
  "Utilities",
  "Mining",
  "Transport",
  "Oil & Gas",
  "Telecom",
  "Government",
  "Other",
];

const CURRENCIES = ["SGD", "IDR", "MYR", "PHP", "AUD", "USD"];

/* ===============================
   UTILS
   =============================== */

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (dateISO, n) => {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + Number(n || 0));
  return d.toISOString().slice(0, 10);
};

const withinNext60Days = (dateISO) => {
  if (!dateISO) return false;
  const today = new Date(todayISO());
  const target = new Date(dateISO);
  const diffDays = (target - today) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 60;
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function badge(color, text) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs border rounded-full ${colors[color] || colors.gray}`}>
      {text}
    </span>
  );
}

/* ===============================
   NETWORK HELPERS (GAS)
   =============================== */

async function gasGet(params) {
  const url = `${GAS_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from GAS: ${text.slice(0, 200)}`);
  }
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `HTTP ${res.status} ${res.statusText}`);
  }
  return json;
}
async function gasPost(action, body) {
  const url = `${GAS_URL}?action=${encodeURIComponent(action)}`;
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
    throw new Error(`Invalid JSON from GAS: ${text.slice(0, 200)}`);
  }
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `HTTP ${res.status} ${res.statusText}`);
  }
  return json;
}

/* ===============================
   BRAND HEADER
   =============================== */

function BrandHeader({ tab, setTab, adminAuthed, onSignOut }) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src="/aptella-reseller-portal/aptella-logo.png"
            alt="Aptella"
            className="h-8"
            onError={(e) => {
              // fallback for GitHub Pages subpath issues
              e.currentTarget.src = "/aptella-logo.png";
            }}
          />
          <div className="text-sm text-gray-500">Master Distributor • Xgrids</div>
        </div>
        <nav className="flex items-center gap-2">
          <button
            className={`px-3 py-1.5 rounded-lg ${
              tab === "reseller" ? "text-white bg-[#0e3446]" : "bg-gray-100 text-[#0e3446]"
            }`}
            onClick={() => setTab("reseller")}
          >
            Reseller
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg ${
              tab === "admin" ? "text-white bg-[#0e3446]" : "bg-gray-100 text-[#0e3446]"
            }`}
            onClick={() => setTab("admin")}
          >
            Admin
          </button>
          {adminAuthed && (
            <button className="px-3 py-1.5 rounded-lg bg-gray-100" onClick={onSignOut}>
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ===============================
   FX SETTINGS MODAL
   =============================== */

function FxModal({ open, onClose, initialFx, onSave, saving }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (open) setRows(Object.entries(initialFx || {}).map(([k, v]) => [k, v]));
  }, [open, initialFx]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[min(680px,95vw)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">FX Rates → AUD</h3>
          <button onClick={onClose} className="px-2 py-1 rounded bg-gray-100">
            Close
          </button>
        </div>

        <div className="space-y-2">
          {rows.map(([cur, rate], i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center">
              <input
                className="border rounded px-2 py-1 uppercase"
                value={cur}
                onChange={(e) => {
                  const next = e.target.value.toUpperCase();
                  setRows((r) => r.map((row, idx) => (idx === i ? [next, row[1]] : row)));
                }}
              />
              <input
                className="border rounded px-2 py-1"
                type="number"
                step="0.000001"
                value={rate}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRows((r) => r.map((row, idx) => (idx === i ? [row[0], val] : row)));
                }}
              />
              <button
                className="text-red-600 text-sm"
                onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="px-3 py-1 rounded bg-gray-100 text-sm"
            onClick={() => setRows((r) => [...r, ["SGD", 1.05]])}
          >
            Add Row
          </button>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded bg-gray-100">
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={() => onSave(Object.fromEntries(rows))}
            className={`px-3 py-1.5 rounded text-white ${BRAND.primaryBtn}`}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   ADMIN PANEL
   =============================== */

function AdminPanel({ fx, setFx, rows, setRows }) {
  const [loading, setLoading] = useState(false);
  const [fxOpen, setFxOpen] = useState(false);
  const [fxSaving, setFxSaving] = useState(false);

  // sorting
  const [sortKey, setSortKey] = useState("submittedAt");
  const [sortDir, setSortDir] = useState("desc"); // 'asc'|'desc'
  const [statusFilter, setStatusFilter] = useState("All");
  const [query, setQuery] = useState("");

  // Leaflet map
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);

  // load map once
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (mapObjRef.current) return;
      // load leaflet CSS/JS if not present
      if (!window.L) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);
        await new Promise((r) => setTimeout(r, 50));
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          s.onload = resolve;
          s.onerror = reject;
          document.body.appendChild(s);
        });
      }
      if (cancelled) return;
      const L = window.L;
      const map = L.map(mapRef.current).setView([1.3521, 103.8198], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      mapObjRef.current = map;
      renderMarkers();
    }

    boot().catch((e) => console.error("Leaflet load failed", e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-render markers when rows change
  useEffect(() => {
    renderMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, fx]);

  function renderMarkers() {
    const map = mapObjRef.current;
    if (!map || !window.L) return;
    const L = window.L;
    // clear existing layers except base
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) map.removeLayer(layer);
    });

    const aud = (row) => {
      const rate = fx?.[row.currency?.toUpperCase?.() || "AUD"] ?? 1;
      return Number(row.value || 0) * Number(rate || 1);
    };

    rows.forEach((r) => {
      if (!r.lat || !r.lng) return;
      const v = Math.max(6, Math.sqrt(aud(r)) / 100); // bubble size
      const color =
        r.status === "approved"
          ? "#16a34a"
          : r.status === "closed"
          ? "#dc2626"
          : "#1d4ed8";
      const marker = L.circleMarker([Number(r.lat), Number(r.lng)], {
        radius: v,
        color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.35,
      }).addTo(map);
      marker.bindPopup(
        `<div style="font-size:12px">
           <strong>${r.customerName || "Customer"}</strong><br/>
           ${r.city || ""}${r.country ? ", " + r.country : ""}<br/>
           ${r.solution || ""}<br/>
           <em>${r.currency || ""} ${Number(r.value || 0).toLocaleString()}</em>
         </div>`
      );
    });
  }

  // list from GAS
  async function refresh() {
    setLoading(true);
    try {
      const data = await gasGet({ action: "list" });
      setRows(data.rows || []);
      setFx(data.fx || {});
    } catch (e) {
      alert(`Refresh failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveFx(nextFx) {
    setFxSaving(true);
    try {
      await gasPost("fx-set", { fx: nextFx });
      setFx(nextFx);
      setFxOpen(false);
    } catch (e) {
      alert(`FX save failed: ${e.message}`);
    } finally {
      setFxSaving(false);
    }
  }

  async function setStatus(id, status) {
    try {
      await gasPost("update", { id, status });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e) {
      alert(`Update failed: ${e.message}`);
    }
  }

  // filtered/sorted rows
  const visible = useMemo(() => {
    let r = rows || [];
    if (statusFilter !== "All") r = r.filter((x) => (x.status || "pending") === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      r = r.filter(
        (x) =>
          (x.customerName || "").toLowerCase().includes(q) ||
          (x.customerLocation || "").toLowerCase().includes(q) ||
          (x.resellerName || "").toLowerCase().includes(q) ||
          (x.solution || "").toLowerCase().includes(q)
      );
    }
    r = [...r].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (sortKey === "value") return dir * (Number(av || 0) - Number(bv || 0));
      return dir * String(av).localeCompare(String(bv));
    });
    return r;
  }, [rows, statusFilter, query, sortKey, sortDir]);

  const totalAUD = useMemo(() => {
    const s = visible.reduce((acc, r) => {
      const rate = fx?.[r.currency?.toUpperCase?.() || "AUD"] ?? 1;
      return acc + Number(r.value || 0) * Number(rate || 1);
    }, 0);
    return s;
  }, [visible, fx]);

  function headerCell(key, label, widthClass = "") {
    return (
      <th
        className={`p-3 text-left text-[13px] font-semibold text-[#f0a03a] ${widthClass} cursor-pointer`}
        onClick={() => {
          if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          else {
            setSortKey(key);
            setSortDir("asc");
          }
        }}
        title="Sort"
      >
        {label}
        {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </th>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="px-3 py-2 rounded-xl bg-white border">
            <div className="text-gray-500">Total registrations</div>
            <div className="text-lg font-semibold">{rows.length}</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white border">
            <div className="text-gray-500">Pending review</div>
            <div className="text-lg font-semibold">
              {rows.filter((r) => (r.status || "pending") === "pending").length}
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white border">
            <div className="text-gray-500">Total value (AUD)</div>
            <div className="text-lg font-semibold">A$ {totalAUD.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className={`px-3 py-2 rounded-lg text-white ${BRAND.primaryBtn}`}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={() => setFxOpen(true)}
            className="px-3 py-2 rounded-lg bg-gray-100"
          >
            FX Settings
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="p-3 flex flex-wrap items-center gap-3">
          <input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border rounded-lg px-3 py-2 w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option>All</option>
            <option>pending</option>
            <option>approved</option>
            <option>closed</option>
          </select>
        </div>

        <div className="h-[420px]">
          <div ref={mapRef} className="w-full h-full" />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {headerCell("submittedAt", "Submitted", "w-[120px]")}
                {headerCell("customerName", "Customer", "w-[180px]")}
                {headerCell("customerLocation", "Location", "w-[200px]")}
                {headerCell("solution", "Solution", "w-[160px]")}
                {headerCell("value", "Value", "w-[120px]")}
                {headerCell("stage", "Stage", "w-[120px]")}
                {headerCell("status", "Status", "w-[120px]")}
                {headerCell("expectedCloseDate", "Expected Close", "w-[140px]")}
                <th className="p-3 text-left text-[13px] font-semibold text-[#f0a03a] w-[160px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.submittedAt || ""}</td>
                  <td className="p-3">{r.customerName || ""}</td>
                  <td className="p-3">{r.customerLocation || ""}</td>
                  <td className="p-3">{r.solution || ""}</td>
                  <td className="p-3">
                    {r.currency} {Number(r.value || 0).toLocaleString()}
                  </td>
                  <td className="p-3 capitalize">{r.stage || ""}</td>
                  <td className="p-3">
                    {(r.status || "pending") === "approved"
                      ? badge("green", "approved")
                      : (r.status || "pending") === "closed"
                      ? badge("red", "closed")
                      : badge("blue", "pending")}
                  </td>
                  <td className="p-3">{r.expectedCloseDate || ""}</td>
                  <td className="p-3 space-x-2">
                    <button
                      className="px-2.5 py-1 rounded bg-green-100 text-green-700"
                      onClick={() => setStatus(r.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="px-2.5 py-1 rounded bg-red-100 text-red-700"
                      onClick={() => setStatus(r.id, "closed")}
                    >
                      Close
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td className="p-3 text-sm text-gray-500" colSpan={9}>
                    No rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FxModal
        open={fxOpen}
        onClose={() => setFxOpen(false)}
        initialFx={fx}
        onSave={saveFx}
        saving={fxSaving}
      />
    </section>
  );
}

/* ===============================
   SUBMISSION FORM
   =============================== */

function SubmissionForm({ onSubmitted }) {
  const [form, setForm] = useState({
    resellerCountry: "",
    resellerLocation: "",
    resellerName: "",
    resellerContact: "",
    resellerEmail: "",
    resellerPhone: "",
    customerName: "",
    customerCity: "",
    customerCountry: "",
    customerLocation: "",
    lat: "",
    lng: "",
    industry: "",
    currency: "SGD",
    value: "",
    solution: "",
    solutionOther: "",
    stage: "qualified",
    probability: PROB_BY_STAGE["qualified"],
    expectedCloseDate: addDays(todayISO(), 14),
    supports: [],
    competitors: [],
    notes: "",
    evidenceFiles: [],
    emailEvidence: true,
    accept: false,
  });
  const [errors, setErrors] = useState({});
  const isID = form.resellerCountry === "Indonesia";

  // Bahasa labels
  const L = (en, id) => (isID ? id : en);

  // auto set capital & currency when reseller country picked
  useEffect(() => {
    const cfg = COUNTRY_CAPITAL[form.resellerCountry];
    if (cfg) {
      setForm((f) => ({
        ...f,
        resellerLocation: cfg.city,
        customerCountry: f.customerCountry || form.resellerCountry,
        lat: cfg.lat,
        lng: cfg.lng,
        currency: cfg.currency,
      }));
    }
  }, [form.resellerCountry]);

  // probability by stage
  useEffect(() => {
    setForm((f) => ({ ...f, probability: PROB_BY_STAGE[f.stage] ?? f.probability }));
  }, [form.stage]);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function toggleList(name, item) {
    setForm((f) => {
      const s = new Set(f[name]);
      s.has(item) ? s.delete(item) : s.add(item);
      return { ...f, [name]: Array.from(s) };
    });
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    setForm((f) => ({ ...f, evidenceFiles: files }));
  }

  function validate() {
    const e = {};
    if (!form.resellerCountry) e.resellerCountry = "Required";
    if (!form.resellerLocation) e.resellerLocation = "Required";
    if (!form.resellerName) e.resellerName = "Required";
    if (!form.resellerContact) e.resellerContact = "Required";
    if (!form.resellerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail))
      e.resellerEmail = "Valid email required";
    if (!form.customerName) e.customerName = "Required";
    if (!form.customerCountry) e.customerCountry = "Required";
    if (!form.expectedCloseDate || !withinNext60Days(form.expectedCloseDate))
      e.expectedCloseDate = "Must be within 60 days";
    if (!form.solution) e.solution = "Required";
    if (form.solution === "Other (type below)" && !form.solutionOther.trim())
      e.solutionOther = "Please enter solution";
    if (!form.value || Number(form.value) <= 0) e.value = "Enter a positive amount";
    if (!form.evidenceFiles?.length) e.evidenceFiles = "Evidence is required";
    if (!form.accept) e.accept = "Please confirm";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function filesToBase64(files) {
    const readers = (files || []).map(
      (f) =>
        new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => {
            const res = String(fr.result || "");
            resolve({
              name: f.name,
              type: f.type || "application/octet-stream",
              data: res.split(",")[1] || "",
            });
          };
          fr.onerror = reject;
          fr.readAsDataURL(f);
        })
    );
    return Promise.all(readers);
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    const rec = {
      id: uid(),
      submittedAt: todayISO(),
      resellerCountry: form.resellerCountry,
      resellerLocation: form.resellerLocation,
      resellerName: form.resellerName,
      resellerContact: form.resellerContact,
      resellerEmail: form.resellerEmail,
      resellerPhone: form.resellerPhone,
      customerName: form.customerName,
      customerLocation: `${form.customerCity || ""}${form.customerCountry ? ", " + form.customerCountry : ""}`,
      city: form.customerCity || "",
      country: form.customerCountry || "",
      lat: form.lat || "",
      lng: form.lng || "",
      industry: form.industry,
      currency: form.currency,
      value: Number(form.value || 0),
      solution: form.solution === "Other (type below)" ? form.solutionOther : form.solution,
      stage: form.stage,
      probability: Number(form.probability || 0),
      expectedCloseDate: form.expectedCloseDate,
      status: "pending",
      lockExpiry: "",
      syncedAt: "",
      confidential: false, // removed per latest request
      remindersOptIn: false,
      supports: form.supports,
      competitors: form.competitors,
      notes: form.notes,
      evidenceLinks: [],
      updates: [],
      emailEvidence: true,
      evidenceEmail: "admin.asia@aptella.com",
    };

    try {
      const attachments = await filesToBase64(form.evidenceFiles);
      await gasPost("submit", { ...rec, attachments });
      alert("Submitted and synced to Google Sheets.");
      setForm((f) => ({
        ...f,
        resellerName: "",
        resellerContact: "",
        resellerEmail: "",
        resellerPhone: "",
        customerName: "",
        customerCity: "",
        value: "",
        solution: "",
        solutionOther: "",
        evidenceFiles: [],
        notes: "",
        accept: false,
      }));
      if (typeof onSubmitted === "function") onSubmitted();
    } catch (e) {
      alert(`Submission failed: ${e.message}`);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-[#0e3446]">
        Register Upcoming Deal <span className="text-gray-500">(within 60 days)</span>
      </h2>

      <form onSubmit={submit} className="grid gap-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm">{L("Reseller Country *", "Negara Anda *")}</label>
            <select
              value={form.resellerCountry}
              onChange={(e) => setField("resellerCountry", e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">{L("Select country", "Pilih negara")}</option>
              <option>Indonesia</option>
              <option>Malaysia</option>
              <option>Philippines</option>
              <option>Singapore</option>
            </select>
            {errors.resellerCountry && <p className="text-xs text-red-600">{errors.resellerCountry}</p>}
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm">{L("Reseller Location *", "Lokasi Reseller *")}</label>
            <input
              className="border rounded-lg px-3 py-2"
              value={form.resellerLocation}
              onChange={(e) => setField("resellerLocation", e.target.value)}
              placeholder={L("e.g., Singapore", "cth., Jakarta")}
            />
            {errors.resellerLocation && <p className="text-xs text-red-600">{errors.resellerLocation}</p>}
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm">{L("Currency", "Mata Uang")}</label>
            <select
              value={form.currency}
              onChange={(e) => setField("currency", e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm">{L("Reseller company *", "Perusahaan reseller *")}</label>
            <input
              className="border rounded-lg px-3 py-2"
              value={form.resellerName}
              onChange={(e) => setField("resellerName", e.target.value)}
            />
            {errors.resellerName && <p className="text-xs text-red-600">{errors.resellerName}</p>}
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm">{L("Primary contact *", "Kontak utama *")}</label>
            <input
              className="border rounded-lg px-3 py-2"
              value={form.resellerContact}
              onChange={(e) => setField("resellerContact", e.target.value)}
            />
            {errors.resellerContact && <p className="text-xs text-red-600">{errors.resellerContact}</p>}
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm">{L("Contact email *", "Email kontak *")}</label>
            <input
              className="border rounded-lg px-3 py-2"
              type="email"
              value={form.resellerEmail}
              onChange={(e) => setField("resellerEmail", e.target.value)}
            />
            {errors.resellerEmail && <p className="text-xs text-red-600">{errors.resellerEmail}</p>}
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm">{L("Contact phone", "Telepon kontak")}</label>
            <input
              className="border rounded-lg px-3 py-2"
              value={form.resellerPhone}
              onChange={(e) => setField("resellerPhone", e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm">{L("Customer name *", "Nama pelanggan *")}</label>
            <input
              className="border rounded-lg px-3 py-2"
              value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)}
            />
            {errors.customerName && <p className="text-xs text-red-600">{errors.customerName}</p>}
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm">{L("Customer Country *", "Negara pelanggan *")}</label>
            <select
              className="border rounded-lg px-3 py-2"
              value={form.customerCountry}
              onChange={(e) => {
                const v = e.target.value;
                setField("customerCountry", v);
                if (COUNTRY_CAPITAL[v]) {
                  setForm((f) => ({
                    ...f,
                    customerCity: COUNTRY_CAPITAL[v].city,
                    lat: COUNTRY_CAPITAL[v].lat,
                    lng: COUNTRY_CAPITAL[v].lng,
                  }));
                }
              }}
            >
              <option value="">{L("Select country", "Pilih negara")}</option>
              <option>Indonesia</option>
              <option>Malaysia</option>
              <option>Philippines</option>
              <option>Singapore</option>
            </select>
            {errors.customerCountry && <p className="text-xs text-red-600">{errors.customerCountry}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm">{L("Customer City", "Kota pelanggan")}</label>
            <input
              className="border rounded-lg px-3 py-2"
              value={form.customerCity}
              onChange={(e) => setField("customerCity", e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm">{L("Map option (paste lat,lng or use link)", "Peta (tempel lat,lng)")}</label>
            <div className="flex gap-2">
              <input
                className="border rounded-lg px-3 py-2 w-32"
                placeholder="lat"
                value={form.lat}
                onChange={(e) => setField("lat", e.target.value)}
              />
              <input
                className="border rounded-lg px-3 py-2 w-32"
                placeholder="lng"
                value={form.lng}
                onChange={(e) => setField("lng", e.target.value)}
              />
              <a
                className={`px-3 py-2 rounded-lg text-white text-sm ${BRAND.primaryBtn}`}
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${form.customerCity || ""}${form.customerCountry ? ", " + form.customerCountry : ""}`
                )}`}
              >
                Open Map
              </a>
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm">{L("Solution offered (Xgrids) *", "Solusi ditawarkan (Xgrids) *")}</label>
            <select
              className="border rounded-lg px-3 py-2"
              value={form.solution}
              onChange={(e) => setField("solution", e.target.value)}
            >
              <option value="">{L("Select an Xgrids solution", "Pilih solusi Xgrids")}</option>
              {XGRIDS_SOLUTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            {form.solution === "Other (type below)" && (
              <input
                className="border rounded-lg px-3 py-2 mt-2"
                placeholder={L("Type your solution…", "Tulis solusi…")}
                value={form.solutionOther}
                onChange={(e) => setField("solutionOther", e.target.value)}
              />
            )}
            {errors.solution && <p className="text-xs text-red-600">{errors.solution}</p>}
            {errors.solutionOther && <p className="text-xs text-red-600">{errors.solutionOther}</p>}
            <a
              className="text-sky-700 underline text-xs mt-1"
              href="https://www.aptella.com/asia/product-brands/xgrids-asia/"
              target="_blank"
              rel="noreferrer"
            >
              Learn about Xgrids
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm">{L("Expected close date *", "Perkiraan tanggal penutupan *")}</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2"
              value={form.expectedCloseDate}
              onChange={(e) => setField("expectedCloseDate", e.target.value)}
            />
            {errors.expectedCloseDate && <p className="text-xs text-red-600">{errors.expectedCloseDate}</p>}
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm">{L("Industry", "Industri")}</label>
            <select
              className="border rounded-lg px-3 py-2"
              value={form.industry}
              onChange={(e) => setField("industry", e.target.value)}
            >
              <option value="">{L("Select industry", "Pilih industri")}</option>
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm">{L("Deal value *", "Nilai transaksi *")}</label>
            <input
              className="border rounded-lg px-3 py-2"
              type="number"
              min="0"
              step="0.01"
              value={form.value}
              onChange={(e) => setField("value", e.target.value)}
            />
            {errors.value && <p className="text-xs text-red-600">{errors.value}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm">{L("Sales stage", "Tahap penjualan")}</label>
            <select
              className="border rounded-lg px-3 py-2"
              value={form.stage}
              onChange={(e) => setField("stage", e.target.value)}
            >
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm">{L("Probability (%)", "Probabilitas (%)")}</label>
            <input
              className="border rounded-lg px-3 py-2"
              type="number"
              min="0"
              max="100"
              value={form.probability}
              onChange={(e) => setField("probability", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm">{L("Competitors", "Pesaing")}</label>
            <input
              className="border rounded-lg px-3 py-2"
              placeholder={L("Comma separated (optional)", "Pisahkan dengan koma (opsional)")}
              value={form.competitors.join(", ")}
              onChange={(e) =>
                setField(
                  "competitors",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm">{L("Support requested", "Dukungan diminta")}</label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SUPPORTS.map((s) => (
              <label key={s} className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.supports.includes(s)}
                  onChange={() => toggleList("supports", s)}
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

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm">{L("Evidence (required)", "Bukti (wajib)")}</label>
            <input type="file" multiple onChange={handleFiles} className="block w-full text-sm" />
            {errors.evidenceFiles && <p className="text-xs text-red-600">{errors.evidenceFiles}</p>}
            <label className="text-sm flex items-center gap-2 mt-1">
              <input type="checkbox" checked readOnly />
              {L(
                `Email attached files to Aptella (admin.asia@aptella.com)`,
                `Kirim file terlampir ke Aptella (admin.asia@aptella.com)`
              )}
            </label>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm">{L("Notes", "Catatan")}</label>
            <textarea
              rows={4}
              className="border rounded-lg px-3 py-2"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder={L(
                "Key requirements, scope, delivery constraints, decision process, etc.",
                "Persyaratan utama, ruang lingkup, kendala pengiriman, proses keputusan, dll."
              )}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!form.accept}
            onChange={(e) => setField("accept", e.target.checked)}
          />
          {L(
            "I confirm details are accurate and consent to data storage for deal management",
            "Saya mengonfirmasi detail akurat dan setuju penyimpanan data untuk pengelolaan deal"
          )}
        </label>
        {errors.accept && <p className="text-xs text-red-600 -mt-2">{errors.accept}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" className={`px-4 py-2 rounded-xl text-white ${BRAND.primaryBtn}`}>
            {isID ? "Kirim Pendaftaran" : "Submit Registration"}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-gray-200"
            onClick={() => window.location.reload()}
          >
            Reset
          </button>
        </div>
      </form>
    </section>
  );
}

/* ===============================
   ROOT APP — NO CONDITIONAL HOOKS
   =============================== */

export default function App() {
  const [tab, setTab] = useState("reseller"); // 'reseller' | 'admin'
  const [adminAuthed, setAdminAuthed] = useState(false);

  // shared data for Admin panel
  const [rows, setRows] = useState([]);
  const [fx, setFx] = useState({ AUD: 1 });

  // admin login gate (NO hook calls inside conditionals)
  useEffect(() => {
    if (tab !== "admin") return;
    if (adminAuthed) return;
    // prompt once when switching to Admin
    const pw = window.prompt("Enter Aptella admin password");
    if (pw === ADMIN_PASSWORD) {
      setAdminAuthed(true);
    } else {
      setTab("reseller");
      if (pw !== null) alert("Incorrect password.");
    }
  }, [tab, adminAuthed]);

  function signOut() {
    setAdminAuthed(false);
    setTab("reseller");
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* brand override styles (subtle) */}
      <style>{`
        .btn-primary { background:${BRAND.navy}; color:#fff; }
        .btn-primary:hover { background:#0b2938; }
        .pill { background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:6px 10px; font-size:12px; }
      `}</style>

      <BrandHeader tab={tab} setTab={setTab} adminAuthed={adminAuthed} onSignOut={signOut} />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === "reseller" && <SubmissionForm onSubmitted={() => { /* no-op */ }} />}

        {tab === "admin" && adminAuthed && (
          <AdminPanel fx={fx} setFx={setFx} rows={rows} setRows={setRows} />
        )}
      </main>

      <footer className="mt-10 text-xs text-gray-500 text-center py-6">
        © {new Date().getFullYear()} Aptella — Xgrids Master Distributor
      </footer>
    </div>
  );
}
