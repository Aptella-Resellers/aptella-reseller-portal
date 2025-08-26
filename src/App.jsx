// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import logoUrl from "./assets/aptella-logo.svg";

// ====== CONFIG ======
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";
const ADMIN_PASSWORD = "Aptella2025!";

// capitals + currency (used by Reseller form)
const COUNTRY_META = {
  Singapore: { lat: 1.3521, lng: 103.8198, currency: "SGD" },
  Malaysia: { lat: 3.139, lng: 101.6869, currency: "MYR" },
  Indonesia: { lat: -6.2088, lng: 106.8456, currency: "IDR" },
  Philippines: { lat: 14.5995, lng: 120.9842, currency: "PHP" },
};

const STAGES = [
  { key: "qualified", label: "Qualified", probability: 35 },
  { key: "negotiation", label: "Negotiation", probability: 70 },
  { key: "committed", label: "Committed", probability: 90 },
];

const SOLUTIONS = [
  "Xgrids L2 PRO",
  "Xgrids K1",
  "Xgrids K3",
  "Xgrids L1",
  "Other",
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

async function apiGET(params) {
  const url = `${GAS_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (!json || json.ok === false) {
    throw new Error(json && json.error ? json.error : "Unknown error");
  }
  return json;
}

async function apiPOST(body) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (!json || json.ok === false) {
    throw new Error(json && json.error ? json.error : "Unknown error");
  }
  return json;
}

function niceDate(d) {
  if (!d) return "";
  // accept "yyyy-mm-dd" or ISO
  const dt = typeof d === "string" && d.length <= 10 ? new Date(`${d}T00:00:00`) : new Date(d);
  if (isNaN(dt)) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ===================== Reseller Form ======================
function ResellerForm({ onSubmitted }) {
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
    expectedCloseDate: "",
    industry: "",
    stage: "qualified",
    probability: 35,
    value: "",
    solution: "",
    solutionOther: "",
    competitors: "",
    notes: "",
    supports: [], // array
    emailEvidence: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // default capitals + currency
    if (form.resellerCountry && COUNTRY_META[form.resellerCountry]) {
      const m = COUNTRY_META[form.resellerCountry];
      setForm((f) => ({
        ...f,
        lat: m.lat,
        lng: m.lng,
        currency: m.currency,
      }));
    }
  }, [form.resellerCountry]);

  useEffect(() => {
    const st = STAGES.find((s) => s.key === form.stage);
    if (st) setForm((f) => ({ ...f, probability: st.probability }));
  }, [form.stage]);

  function toggleSupport(v) {
    setForm((f) =>
      f.supports.includes(v)
        ? { ...f, supports: f.supports.filter((x) => x !== v) }
        : { ...f, supports: [...f.supports, v] }
    );
  }

  async function submit() {
    if (!form.resellerCountry || !form.resellerLocation || !form.customerName || !form.expectedCloseDate || !form.solution) {
      alert("Please complete all required fields.");
      return;
    }
    if (form.solution === "Other" && !form.solutionOther.trim()) {
      alert("Please specify the Other solution.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        action: "submit",
        row: {
          resellerCountry: form.resellerCountry,
          resellerLocation: form.resellerLocation,
          currency: form.currency,
          resellerName: form.resellerName,
          resellerContact: form.resellerContact,
          resellerEmail: form.resellerEmail,
          resellerPhone: form.resellerPhone,
          customerName: form.customerName,
          customerLocation:
            (form.customerCity || "") +
            (form.customerCountry ? `, ${form.customerCountry}` : ""),
          city: form.customerCity || "",
          country: form.customerCountry || "",
          lat: Number(form.lat) || "",
          lng: Number(form.lng) || "",
          industry: form.industry || "",
          value: Number(String(form.value).replace(/[^\d.]/g, "")) || 0,
          solution: form.solution,
          solutionOther: form.solution === "Other" ? form.solutionOther : "",
          stage: form.stage,
          probability: Number(form.probability) || 0,
          expectedCloseDate: niceDate(form.expectedCloseDate),
          status: "pending",
          confidential: false,
          remindersOptIn: false,
          supports: form.supports, // array; GAS will join with "; "
          competitors: form.competitors || "",
          notes: form.notes || "",
          evidenceLinks: [],
          emailEvidence: !!form.emailEvidence,
        },
      };
      const j = await apiPOST(payload);
      alert("Submitted! ID: " + j.id);
      onSubmitted && onSubmitted();
    } catch (e) {
      alert("Submitted locally. Google Sheets sync failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Aptella" className="h-7" />
          <div className="text-sm text-slate-500">Master Distributor • Xgrids</div>
        </div>
        <div className="rounded-full border px-3 py-1 text-xs bg-white text-slate-700">
          Reseller
        </div>
      </header>

      <h2 className="text-xl font-semibold mb-3">
        Register Upcoming Deal <span className="text-aptella-orange">(within 60 days)</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow">
        {/* Country & Location */}
        <div>
          <label className="text-sm font-medium">Reseller Country *</label>
          <select
            className="mt-1 w-full rounded-lg border bg-white p-2 focus:outline-none"
            value={form.resellerCountry}
            onChange={(e) =>
              setForm((f) => ({ ...f, resellerCountry: e.target.value }))
            }
          >
            <option value="">Select country</option>
            {Object.keys(COUNTRY_META).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Reseller Location *</label>
          <input
            className="mt-1 w-full rounded-lg border bg-white p-2"
            placeholder="e.g., Singapore"
            value={form.resellerLocation}
            onChange={(e) =>
              setForm((f) => ({ ...f, resellerLocation: e.target.value }))
            }
          />
        </div>

        {/* Currency */}
        <div>
          <label className="text-sm font-medium">Currency *</label>
          <select
            className="mt-1 w-full rounded-lg border bg-white p-2"
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
          >
            {["AUD", "SGD", "MYR", "IDR", "PHP", "USD"].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        {/* Contacts */}
        <div>
          <label className="text-sm font-medium">Reseller company *</label>
          <input
            className="mt-1 w-full rounded-lg border bg-white p-2"
            value={form.resellerName}
            onChange={(e) => setForm((f) => ({ ...f, resellerName: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Primary contact *</label>
          <input
            className="mt-1 w-full rounded-lg border bg-white p-2"
            value={form.resellerContact}
            onChange={(e) =>
              setForm((f) => ({ ...f, resellerContact: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Contact email *</label>
          <input
            className="mt-1 w-full rounded-lg border bg-white p-2"
            value={form.resellerEmail}
            onChange={(e) =>
              setForm((f) => ({ ...f, resellerEmail: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Contact phone</label>
          <input
            className="mt-1 w-full rounded-lg border bg-white p-2"
            value={form.resellerPhone}
            onChange={(e) =>
              setForm((f) => ({ ...f, resellerPhone: e.target.value }))
            }
          />
        </div>

        {/* Customer */}
        <div>
          <label className="text-sm font-medium">Customer name *</label>
          <input
            className="mt-1 w-full rounded-lg border bg-white p-2"
            value={form.customerName}
            onChange={(e) =>
              setForm((f) => ({ ...f, customerName: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Customer Country *</label>
          <input
            className="mt-1 w-full rounded-lg border bg-white p-2"
            placeholder="Select country"
            value={form.customerCountry}
            onChange={(e) =>
              setForm((f) => ({ ...f, customerCountry: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Customer City</label>
          <input
            className="mt-1 w-full rounded-lg border bg-white p-2"
            value={form.customerCity}
            onChange={(e) =>
              setForm((f) => ({ ...f, customerCity: e.target.value }))
            }
          />
        </div>

        {/* Map helper */}
        <div>
          <label className="text-sm font-medium">
            Map option (paste lat,lng or use link)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              className="w-full rounded-lg border bg-white p-2"
              placeholder="lat"
              value={form.lat}
              onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
            />
            <input
              className="w-full rounded-lg border bg-white p-2"
              placeholder="lng"
              value={form.lng}
              onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
            />
            <a
              className="rounded-lg bg-aptella-navy px-3 py-2 text-white"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${form.customerCity || ""}, ${form.customerCountry || ""}`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Open Map
            </a>
          </div>
        </div>

        {/* Dates / solution */}
        <div>
          <label className="text-sm font-medium">Expected close date *</label>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border bg-white p-2"
            value={form.expectedCloseDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, expectedCloseDate: e.target.value }))
            }
          />
        </div>

        <div>
          <label className="text-sm font-medium">Solution offered (Xgrids) *</label>
          <select
            className="mt-1 w-full rounded-lg border bg-white p-2"
            value={form.solution}
            onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
          >
            <option value="">Select an Xgrids solution</option>
            {SOLUTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <a
            href="https://www.aptella.com/brand/xgrids/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-aptella-navy underline"
          >
            Learn about Xgrids
          </a>
          {form.solution === "Other" && (
            <input
              className="mt-2 w-full rounded-lg border bg-white p-2"
              placeholder="Describe solution"
              value={form.solutionOther}
              onChange={(e) =>
                setForm((f) => ({ ...f, solutionOther: e.target.value }))
              }
            />
          )}
        </div>

        {/* Industry / Deal value */}
        <div>
          <label className="text-sm font-medium">Industry</label>
          <input
            className="mt-1 w-full rounded-lg border bg-white p-2"
            placeholder="Select industry"
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Deal value *</label>
          <input
            className="mt-1 w-full rounded-lg border bg-white p-2"
            placeholder="e.g., 25000"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          />
        </div>

        {/* Stage / probability */}
        <div>
          <label className="text-sm font-medium">Sales stage</label>
          <select
            className="mt-1 w-full rounded-lg border bg-white p-2"
            value={form.stage}
            onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
          >
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Probability (%)</label>
          <input
            className="mt-1 w-full rounded-lg border bg-white p-2"
            value={form.probability}
            onChange={(e) =>
              setForm((f) => ({ ...f, probability: e.target.value }))
            }
          />
        </div>

        {/* Competitors */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium">Competitors</label>
          <input
            className="mt-1 w-full rounded-lg border bg-white p-2"
            placeholder="Comma separated (optional)"
            value={form.competitors}
            onChange={(e) =>
              setForm((f) => ({ ...f, competitors: e.target.value }))
            }
          />
        </div>

        {/* Support checkboxes */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <fieldset className="rounded-lg border p-3">
            <legend className="text-sm font-medium">Support requested</legend>
            {[
              "Pre-sales engineer",
              "Partner training",
              "Extended lock request",
              "Demo / loan unit",
              "Pricing exception",
              "On-site customer visit",
            ].map((label) => (
              <label key={label} className="mr-4 inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.supports.includes(label)}
                  onChange={() => toggleSupport(label)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              className="mt-1 w-full rounded-lg border bg-white p-2"
              rows={4}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Key requirements, scope, constraints, decision process, etc."
            />
            <label className="mt-3 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.emailEvidence}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emailEvidence: e.target.checked }))
                }
              />
              Email attached files to Aptella (admin.asia@aptella.com)
            </label>
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end gap-2">
          <button
            disabled={saving}
            className="rounded-lg bg-slate-100 px-4 py-2"
            onClick={() => window.location.reload()}
          >
            Reset
          </button>
          <button
            disabled={saving}
            className="rounded-lg bg-aptella-orange px-4 py-2 text-white"
            onClick={submit}
          >
            {saving ? "Submitting…" : "Submit Registration"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== FX Drawer ======================
function FXDrawer({ open, onClose }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const j = await apiGET({ action: "fx" });
        setRows(j.rows || []);
      } catch (e) {
        alert("FX load failed: " + e.message);
      }
    })();
  }, [open]);

  function addRow() {
    setRows((r) => [...r, { currency: "", rateToAUD: "" }]);
  }
  function update(i, patch) {
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function remove(i) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    try {
      const cleaned = rows
        .filter((r) => r.currency && r.rateToAUD)
        .map((r) => ({
          currency: r.currency.trim().toUpperCase(),
          rateToAUD: Number(r.rateToAUD),
        }));
      await apiPOST({ action: "fxsave", rows: cleaned });
      alert("FX saved");
      onClose();
    } catch (e) {
      alert("FX save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="w-[min(680px,95vw)] rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">FX Rates to AUD</h3>
          <button className="rounded-lg bg-slate-100 px-3 py-1.5" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="grid gap-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="w-40 rounded-lg border p-2"
                placeholder="Currency (e.g., SGD)"
                value={r.currency}
                onChange={(e) => update(i, { currency: e.target.value })}
              />
              <input
                className="w-40 rounded-lg border p-2"
                placeholder="Rate to AUD"
                value={r.rateToAUD}
                onChange={(e) => update(i, { rateToAUD: e.target.value })}
              />
              <button
                className="rounded-lg bg-red-50 px-3 py-1.5 text-red-700"
                onClick={() => remove(i)}
              >
                Remove
              </button>
            </div>
          ))}
          <button className="rounded-lg bg-slate-100 px-3 py-1.5" onClick={addRow}>
            + Add Row
          </button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-lg bg-slate-100 px-3 py-1.5" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={saving}
            className="rounded-lg bg-aptella-navy px-4 py-1.5 text-white"
            onClick={save}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== Admin ======================
function Admin() {
  const [authed, setAuthed] = useState(false);
  const [fxOpen, setFxOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("submittedAt");
  const [sortDir, setSortDir] = useState("desc");

  // Map
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef([]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapObj.current) return;

    const m = L.map(mapRef.current).setView([ -2.5, 118 ], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(m);
    mapObj.current = m;
  }, []);

  function drawMapItems(list) {
    if (!mapObj.current) return;
    markers.current.forEach((g) => g.remove());
    markers.current = [];

    const group = L.layerGroup().addTo(mapObj.current);
    markers.current.push(group);

    list.forEach((r) => {
      if (!r.lat || !r.lng) return;
      // modest bubble sizing — avoid huge overlays
      const aud = Number(r.valueAUD || 0);
      const radius = Math.min(60, Math.sqrt(aud) * 0.1); // cap 60px
      L.circle([r.lat, r.lng], {
        radius: radius * 100, // meters
        color: "#f0a03a",
        fillColor: "#f0a03a",
        fillOpacity: 0.25,
        weight: 1,
      })
        .bindPopup(
          `<b>${r.customerName || ""}</b><br>${r.location || ""}<br><b>A$ ${(
            aud || 0
          ).toLocaleString()}</b>`
        )
        .addTo(group);
    });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let out = rows.filter((r) => {
      if (!q) return true;
      return (
        (r.customerName || "").toLowerCase().includes(q) ||
        (r.location || "").toLowerCase().includes(q) ||
        (r.solution || "").toLowerCase().includes(q) ||
        (r.status || "").toLowerCase().includes(q)
      );
    });
    out.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "valueAUD") {
        return dir * ((a.valueAUD || 0) - (b.valueAUD || 0));
      }
      const av = a[sortKey] || "";
      const bv = b[sortKey] || "";
      return dir * String(av).localeCompare(String(bv));
    });
    return out;
  }, [rows, search, sortKey, sortDir]);

  useEffect(() => {
    drawMapItems(filtered);
  }, [filtered]);

  async function refresh() {
    try {
      const j = await apiGET({ action: "list" });
      const fx = await apiGET({ action: "fx" }).catch(() => ({ rows: [] }));
      const fxMap = new Map((fx.rows || []).map((r) => [r.currency, r.rateToAUD]));

      const mapped = (j.rows || []).map((r) => {
        const rate = fxMap.get(r.currency) || (r.currency === "AUD" ? 1 : 0);
        const valueAUD = rate ? Number(r.value || 0) / Number(rate) : 0;
        return {
          ...r,
          valueAUD,
          expected: niceDate(r.expectedCloseDate),
          submitted: niceDate(r.submittedAt),
        };
      });
      setRows(mapped);
    } catch (e) {
      alert("Refresh failed: " + e.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      await apiPOST({ action: "status", id, status });
      await refresh();
    } catch (e) {
      alert("Update failed: " + e.message);
    }
  }

  useEffect(() => {
    if (authed) refresh();
  }, [authed]);

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Aptella" className="h-7" />
          <div>
            <div className="text-lg font-semibold">Aptella Master Distributor</div>
            <div className="text-xs text-slate-500">
              Reseller Deal Registration Portal
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!authed ? (
            <button
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-white"
              onClick={() => {
                const p = prompt("Admin password?");
                if (p === ADMIN_PASSWORD) setAuthed(true);
                else alert("Incorrect password");
              }}
            >
              Admin
            </button>
          ) : (
            <button
              className="rounded-lg bg-slate-100 px-3 py-1.5"
              onClick={() => setAuthed(false)}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      {!authed ? (
        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-sm text-slate-600">
            Enter the Admin password to view the dashboard.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2">
            <button
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-white"
              onClick={refresh}
            >
              Refresh
            </button>
            <button
              className="rounded-lg bg-aptella-orange px-3 py-1.5 text-white"
              onClick={() => setFxOpen(true)}
            >
              FX Settings
            </button>
            <input
              className="ml-auto w-64 rounded-lg border bg-white p-2"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-lg border bg-white p-2"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="submittedAt">Submitted</option>
              <option value="expectedCloseDate">Expected</option>
              <option value="customerName">Customer</option>
              <option value="location">Location</option>
              <option value="solution">Solution</option>
              <option value="valueAUD">Value (AUD)</option>
              <option value="stage">Stage</option>
              <option value="status">Status</option>
            </select>
            <select
              className="rounded-lg border bg-white p-2"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          <div className="rounded-xl bg-white p-2 shadow">
            <div
              ref={mapRef}
              className="h-[360px] w-full rounded-lg border"
              aria-label="Map"
            />
          </div>

          <div className="mt-3 overflow-auto rounded-xl bg-white shadow">
            <table className="min-w-[920px] w-full">
              <thead className="bg-[#f0a03a1a] text-aptella-orange">
                <tr>
                  <th className="p-2 text-left">Submitted</th>
                  <th className="p-2 text-left">Expected</th>
                  <th className="p-2 text-left">Customer</th>
                  <th className="p-2 text-left">Location</th>
                  <th className="p-2 text-left">Solution</th>
                  <th className="p-2 text-left">Value</th>
                  <th className="p-2 text-left">Stage</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{niceDate(r.submittedAt)}</td>
                    <td className="p-2">{niceDate(r.expectedCloseDate)}</td>
                    <td className="p-2">{r.customerName || ""}</td>
                    <td className="p-2">{r.location || ""}</td>
                    <td className="p-2">
                      {r.solution}
                      {r.solution === "Other" && r.solutionOther
                        ? ` — ${r.solutionOther}`
                        : ""}
                    </td>
                    <td className="p-2">
                      A${" "}
                      {(Number(r.valueAUD || 0)).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="p-2">{r.stage}</td>
                    <td className="p-2">
                      <span
                        className={classNames(
                          "rounded-full px-2 py-0.5 text-xs",
                          r.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : r.status === "closed"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {r.status || "pending"}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {r.status !== "approved" && (
                          <button
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-white"
                            onClick={() => updateStatus(r.id, "approved")}
                          >
                            Approve
                          </button>
                        )}
                        <button
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-white"
                          onClick={() => updateStatus(r.id, "closed")}
                        >
                          Close
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-slate-500" colSpan={9}>
                      No rows match the filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <FXDrawer open={fxOpen} onClose={() => setFxOpen(false)} />
        </>
      )}
    </div>
  );
}

// ===================== Root ======================
export default function App() {
  const [tab, setTab] = useState("reseller");
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <img src={logoUrl} className="h-7" alt="Aptella" />
          <span className="text-sm text-slate-500">Reseller Deal Registration</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("reseller")}
            className={classNames(
              "rounded-lg px-3 py-1.5",
              tab === "reseller" ? "bg-slate-800 text-white" : "bg-white border"
            )}
          >
            Reseller
          </button>
          <button
            onClick={() => setTab("admin")}
            className={classNames(
              "rounded-lg px-3 py-1.5",
              tab === "admin" ? "bg-slate-800 text-white" : "bg-white border"
            )}
          >
            Admin
          </button>
        </div>
      </nav>

      {tab === "reseller" ? <ResellerForm /> : <Admin />}
    </div>
  );
}
