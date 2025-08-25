import React, { useEffect, useMemo, useRef, useState } from "react";

/** --------- CONFIG --------- */
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";

const BRAND = {
  primaryBtn: "btn-navy",
};

const CURRENCIES = ["SGD", "IDR", "MYR", "PHP", "AUD", "USD"];

const STAGES = [
  { key: "Qualified", label: "Qualified" },
  { key: "Proposal", label: "Proposal" },
  { key: "Negotiation", label: "Negotiation" },
  { key: "Won", label: "Won" },
  { key: "Lost", label: "Lost" },
];

const INDUSTRIES = [
  "Construction",
  "Utilities",
  "Mining",
  "Oil & Gas",
  "Telecoms",
  "Government",
  "Security",
  "Other",
];

const XGRIDS_SOLUTIONS = [
  "Xgrids L2 PRO",
  "Xgrids K1",
  "Xgrids PortalCam",
  "Xgrids Drone Kit",
];

/** Capital defaults for lat/lng */
const CAPITALS = {
  Singapore: [1.3521, 103.8198],
  Indonesia: [-6.2088, 106.8456],
  Malaysia: [3.139, 101.6869],
  Philippines: [14.5995, 120.9842],
};

const EMAIL_EVIDENCE = "admin.asia@aptella.com";

/** Utilities */
const today = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
};
const addDays = (iso, n) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + (n || 0));
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
};
const niceDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${dd}`;
  } catch {
    return iso;
  }
};
const uid = () =>
  Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Bad JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok || json.ok === false) {
    throw new Error(json?.error || `HTTP ${res.status} ${res.statusText}`);
  }
  return json;
}

/** ------------------ Reseller Form ------------------ */
function ResellerForm({ onSubmitted }) {
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
    lat: "",
    lng: "",
    currency: "SGD",
    solution: "",
    solutionOther: "",
    industry: "",
    stage: "Qualified",
    probability: 35,
    value: "",
    expectedCloseDate: addDays(today(), 14),
    competitors: [],
    supports: [],
    notes: "",
    evidenceFiles: [],
    emailEvidence: true,
  });

  const [errors, setErrors] = useState({});

  /** default lat/lng on country pick */
  useEffect(() => {
    const cc = form.customerCountry || form.resellerCountry;
    if (cc && CAPITALS[cc]) {
      const [lat, lng] = CAPITALS[cc];
      setForm((f) => ({ ...f, lat, lng }));
    }
  }, [form.customerCountry, form.resellerCountry]);

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };
  const onFile = (e) => {
    setForm((f) => ({ ...f, evidenceFiles: [...(e.target.files || [])] }));
  };

  const validate = () => {
    const e = {};
    const req = [
      "resellerCountry",
      "resellerLocation",
      "resellerName",
      "resellerContact",
      "resellerEmail",
      "customerName",
      "customerCountry",
      "expectedCloseDate",
      "solution",
      "industry",
      "value",
    ];
    req.forEach((k) => {
      if (!form[k]) e[k] = "Required";
    });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.resellerEmail || "")) {
      e.resellerEmail = "Valid email required";
    }
    if (!form.evidenceFiles || form.evidenceFiles.length === 0) {
      e.evidence = "Evidence file(s) required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  async function filesToBase64(files) {
    const arr = [];
    for (const f of files) {
      const data = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(",")[1]);
        fr.onerror = reject;
        fr.readAsDataURL(f);
      });
      arr.push({ name: f.name, type: f.type || "application/octet-stream", data });
    }
    return arr;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      id: uid(),
      submittedAt: today(),
      ...form,
      value: Number(form.value),
      attachments: form.evidenceFiles?.length
        ? await filesToBase64(form.evidenceFiles)
        : [],
    };

    try {
      await fetchJson(`${GAS_URL}?action=submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      alert("Submitted. Synced to Google Sheets.");
      onSubmitted?.(payload);
      // reset
      setForm((f) => ({
        ...f,
        resellerName: "",
        resellerContact: "",
        resellerEmail: "",
        resellerPhone: "",
        customerName: "",
        customerCity: "",
        currency: f.currency,
        value: "",
        solution: "",
        solutionOther: "",
        industry: "",
        stage: "Qualified",
        probability: 35,
        lat: "",
        lng: "",
        notes: "",
        evidenceFiles: [],
      }));
    } catch (err) {
      alert(`Submitted locally. Google Sheets sync failed: ${err.message}`);
    }
  };

  const isID = form.resellerCountry === "Indonesia";
  const t = (en, id) => (isID ? id : en);

  return (
    <div className="container">
      <div className="card card-pad">
        <h2 style={{ margin: "0 0 12px 0" }}>Reseller Deal Registration</h2>
        <form onSubmit={submit} className="grid grid-2">
          {/* Reseller country (orange accent) */}
          <div>
            <label>Reseller Country *</label>
            <select
              name="resellerCountry"
              value={form.resellerCountry}
              onChange={handle}
              className="required-input reseller-accent"
            >
              <option value="">{t("Select country", "Pilih negara")}</option>
              <option>Indonesia</option>
              <option>Malaysia</option>
              <option>Philippines</option>
              <option>Singapore</option>
            </select>
          </div>

          <div>
            <label>{t("Reseller Location *", "Lokasi Reseller *")}</label>
            <input
              className="input required-input"
              name="resellerLocation"
              value={form.resellerLocation}
              onChange={handle}
              placeholder={t("e.g., Singapore", "mis. Jakarta")}
            />
          </div>

          <div>
            <label>{t("Reseller company *", "Perusahaan reseller *")}</label>
            <input
              className="input required-input"
              name="resellerName"
              value={form.resellerName}
              onChange={handle}
              placeholder={t("e.g., Alpha Solutions Pte Ltd", "mis. PT Alpha")}
            />
          </div>
          <div>
            <label>{t("Primary contact *", "Kontak utama *")}</label>
            <input
              className="input required-input"
              name="resellerContact"
              value={form.resellerContact}
              onChange={handle}
              placeholder={t("Full name", "Nama lengkap")}
            />
          </div>

          <div>
            <label>{t("Contact email *", "Email kontak *")}</label>
            <input
              className="input required-input"
              name="resellerEmail"
              value={form.resellerEmail}
              onChange={handle}
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label>{t("Contact phone", "Nomor telepon")}</label>
            <input
              className="input"
              name="resellerPhone"
              value={form.resellerPhone}
              onChange={handle}
              placeholder="+65 1234 5678"
            />
          </div>

          <div>
            <label>{t("Customer name *", "Nama pelanggan *")}</label>
            <input
              className="input required-input"
              name="customerName"
              value={form.customerName}
              onChange={handle}
              placeholder={t("End customer / project owner", "Pemilik proyek")}
            />
          </div>
          <div>
            <label>{t("Customer Country *", "Negara Pelanggan *")}</label>
            <select
              name="customerCountry"
              value={form.customerCountry}
              onChange={handle}
              className="required-input"
            >
              <option value="">{t("Select country", "Pilih negara")}</option>
              <option>Indonesia</option>
              <option>Malaysia</option>
              <option>Philippines</option>
              <option>Singapore</option>
            </select>
          </div>

          <div>
            <label>{t("Customer City", "Kota Pelanggan")}</label>
            <input
              className="input"
              name="customerCity"
              value={form.customerCity}
              onChange={handle}
              placeholder={t("Jakarta", "Jakarta")}
            />
          </div>
          <div>
            <label>{t("Currency *", "Mata uang *")}</label>
            <select
              name="currency"
              value={form.currency}
              onChange={handle}
              className="required-input"
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Solution + Industry */}
          <div>
            <label>{t("Solution offered (Xgrids) *", "Solusi Xgrids *")}</label>
            <select
              name="solution"
              value={form.solution}
              onChange={handle}
              className="required-input"
            >
              <option value="">{t("Select an Xgrids solution", "Pilih solusi")}</option>
              {XGRIDS_SOLUTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
              <option value="Other">+ Other</option>
            </select>
            {form.solution === "Other" && (
              <input
                className="input"
                name="solutionOther"
                value={form.solutionOther}
                onChange={handle}
                placeholder={t("Type the solution details", "Tulis detail solusi")}
                style={{ marginTop: 8 }}
              />
            )}
            <div style={{ marginTop: 6 }}>
              <a
                href="https://www.aptella.com/asia/product-brands/xgrids-asia/"
                target="_blank"
                rel="noreferrer"
              >
                {t("Learn about Xgrids solutions", "Pelajari solusi Xgrids")}
              </a>
            </div>
          </div>

          <div>
            <label>{t("Industry *", "Industri *")}</label>
            <select
              name="industry"
              value={form.industry}
              onChange={handle}
              className="required-input"
            >
              <option value="">{t("Select industry", "Pilih industri")}</option>
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </div>

          {/* Expected close date + Open Map placed UNDER it */}
          <div>
            <label>{t("Expected close date *", "Perkiraan tanggal penutupan *")}</label>
            <input
              type="date"
              name="expectedCloseDate"
              value={form.expectedCloseDate}
              onChange={handle}
              className="input required-input"
            />
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const q = encodeURIComponent(
                    `${form.customerCity || ""} ${form.customerCountry || ""}`.trim()
                  );
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${q}`,
                    "_blank"
                  );
                }}
              >
                Open Map
              </button>
              <input
                className="input"
                placeholder="lat"
                name="lat"
                value={form.lat}
                onChange={handle}
                style={{ maxWidth: 140 }}
              />
              <input
                className="input"
                placeholder="lng"
                name="lng"
                value={form.lng}
                onChange={handle}
                style={{ maxWidth: 140 }}
              />
            </div>
          </div>

          <div>
            <label>{t("Deal value *", "Nilai transaksi *")}</label>
            <input
              className="input required-input"
              name="value"
              value={form.value}
              onChange={handle}
              placeholder={t("e.g., 25000", "mis. 25000")}
            />
          </div>

          {/* Stage / Probability */}
          <div>
            <label>{t("Sales stage", "Tahap penjualan")}</label>
            <select name="stage" value={form.stage} onChange={handle} className="input">
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>{t("Probability (%)", "Probabilitas (%)")}</label>
            <input
              className="input"
              name="probability"
              value={form.probability}
              onChange={handle}
            />
          </div>

          {/* Supports */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label>{t("Support requested", "Dukungan diminta")}</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {[
                "Pre-sales engineer",
                "Demo / loan unit",
                "Partner training",
                "Marketing materials",
                "Pricing exception",
                "On-site customer visit",
                "Extended lock request",
              ].map((s) => (
                <label key={s} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={form.supports.includes(s)}
                    onChange={() =>
                      setForm((f) => {
                        const set = new Set(f.supports);
                        set.has(s) ? set.delete(s) : set.add(s);
                        return { ...f, supports: [...set] };
                      })
                    }
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label>{t("Competitors", "Pesaing")}</label>
            <input
              className="input"
              name="competitors"
              value={form.competitors.join(", ")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  competitors: e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean),
                }))
              }
              placeholder={t("Comma separated (optional)", "Dipisah koma (opsional)")}
            />
          </div>

          {/* Evidence */}
          <div>
            <label>Evidence (required)</label>
            <input type="file" multiple onChange={onFile} />
            <label style={{ marginTop: 6, display: "block" }}>
              <input
                type="checkbox"
                checked={!!form.emailEvidence}
                onChange={(e) => setForm((f) => ({ ...f, emailEvidence: e.target.checked }))}
              />{" "}
              Email attached files to Aptella ({EMAIL_EVIDENCE})
            </label>
            {errors.evidence && (
              <div style={{ color: "#b91c1c", fontSize: 12 }}>{errors.evidence}</div>
            )}
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label>Notes</label>
            <textarea
              className="input"
              rows={4}
              name="notes"
              value={form.notes}
              onChange={handle}
              placeholder="Key requirements, scope, delivery constraints, decision process, etc."
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" required /> I confirm details are accurate and consent to data
              storage for deal management
            </label>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10 }}>
            <button className={`btn ${BRAND.primaryBtn}`} type="submit">
              Submit Registration
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
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
                  industry: "",
                  notes: "",
                  evidenceFiles: [],
                }))
              }
            >
              Reset
            </button>
        </div>
        </form>
      </div>
    </div>
  );
}

/** ------------------ Admin ------------------ */
function AdminPanel() {
  const [rows, setRows] = useState([]);
  const [fxOpen, setFxOpen] = useState(false);
  const [fx, setFx] = useState({ SGD: 1.05, IDR: 0.00009 });
  const mapRef = useRef(null);
  const leafletRef = useRef(null);

  const refresh = async () => {
    try {
      const data = await fetchJson(`${GAS_URL}?action=list`);
      setRows(data.rows || []);
      if (data.fx) setFx(data.fx);
      setTimeout(initMap, 50);
    } catch (e) {
      alert(`Refresh failed: ${e.message}`);
    }
  };

  const initMap = () => {
    try {
      const L = window.L;
      if (!L) return;
      if (!mapRef.current) return;

      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
      const m = L.map(mapRef.current).setView([ -2.5, 118 ], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(m);

      (rows || []).forEach(r => {
        const lat = Number(r.lat), lng = Number(r.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const marker = L.marker([lat, lng]).addTo(m);
        marker.bindPopup(
          `<b>${r.customerName || "-"}</b><br/>${r.customerLocation || ""}<br/>${r.solution || ""}<br/><i>${r.status || "pending"}</i>`
        );
      });
      leafletRef.current = m;
    } catch {/* ignore */}
  };

  useEffect(() => { refresh(); /* eslint-disable */ }, []);

  const totalAUD = useMemo(() => {
    // If row.currency !== AUD, convert using fx (to AUD)
    let sum = 0;
    rows.forEach(r => {
      const v = Number(r.value || 0);
      const cur = r.currency || "AUD";
      if (cur === "AUD") sum += v;
      else if (fx && fx[cur]) sum += v * Number(fx[cur]);
      else sum += v; // fallback
    });
    return Math.round(sum * 100) / 100;
  }, [rows, fx]);

  const approveRow = async (id) => {
    try {
      await fetchJson(`${GAS_URL}?action=approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setRows(prev => prev.map(r => r.id === id ? { ...r, status: "approved" } : r));
    } catch (e) {
      alert(`Update failed: ${e.message}`);
    }
  };
  const closeRow = async (id) => {
    try {
      await fetchJson(`${GAS_URL}?action=close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setRows(prev => prev.map(r => r.id === id ? { ...r, status: "closed" } : r));
    } catch (e) {
      alert(`Update failed: ${e.message}`);
    }
  };

  const saveFx = async () => {
    try {
      await fetchJson(`${GAS_URL}?action=fx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fx }),
      });
      setFxOpen(false);
    } catch (e) {
      alert(`FX save failed: ${e.message}`);
    }
  };

  return (
    <div className="container">
      {/* Stats row */}
      <div className="stats" style={{ marginBottom: 12 }}>
        <div className="stat"><div className="k">Total registrations</div><div className="v">{rows.length || 0}</div></div>
        <div className="stat"><div className="k">Pending review</div><div className="v">{rows.filter(r=>!r.status || r.status==='pending').length}</div></div>
        <div className="stat"><div className="k">Total value (AUD)</div><div className="v">A$ {totalAUD.toLocaleString()}</div></div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button className="btn btn-navy" onClick={refresh}>Refresh</button>
          <button className="btn btn-ghost" onClick={()=>setFxOpen(true)}>FX Settings</button>
        </div>
      </div>

      {/* Map above, table beneath */}
      <div className="admin-layout">
        <div className="admin-map">
          <div ref={mapRef} className="map-wrap"></div>
        </div>

        <div className="admin-table card">
          <div className="card-pad" style={{ paddingBottom:0 }}>
            <div style={{ overflowX:"auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Submitted</th>
                    <th>Expected</th>
                    <th>Customer</th>
                    <th>Location</th>
                    <th>Solution</th>
                    <th>Value</th>
                    <th>Stage</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(rows||[]).length === 0 ? (
                    <tr><td colSpan={9} style={{ padding:16, color:'#6b7280' }}>No rows match the filters.</td></tr>
                  ) : (rows.map(r => (
                    <tr key={r.id}>
                      <td>{niceDate(r.submittedAt)}</td>
                      <td>{niceDate(r.expectedCloseDate)}</td>
                      <td>{r.customerName || "-"}</td>
                      <td>{r.customerLocation || "-"}</td>
                      <td>{r.solution === "Other" ? (r.solutionOther || "Other") : (r.solution || "-")}</td>
                      <td>
                        {r.currency || "AUD"} {Number(r.value||0).toLocaleString()}
                      </td>
                      <td>{r.stage || "-"}</td>
                      <td>
                        {r.status === "approved" ? (
                          <span className="badge badge-green">approved</span>
                        ) : r.status === "closed" ? (
                          <span className="badge badge-red">closed</span>
                        ) : (
                          <span className="badge badge-blue">pending</span>
                        )}
                      </td>
                      <td style={{ display:"flex", gap:8 }}>
                        {r.status !== "approved" && r.status !== "closed" && (
                          <button className="btn btn-orange" onClick={()=>approveRow(r.id)}>Approve</button>
                        )}
                        {r.status !== "closed" && (
                          <button className="btn btn-ghost" onClick={()=>closeRow(r.id)}>Close</button>
                        )}
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* FX Settings modal */}
      {fxOpen && (
        <div className="modal" onClick={()=>setFxOpen(false)}>
          <div className="modal-card" onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ margin:0 }}>FX Rates → AUD</h3>
              <button className="btn btn-ghost" onClick={()=>setFxOpen(false)}>Close</button>
            </div>
            <div style={{ marginTop:12 }}>
              {Object.entries(fx).map(([k,v])=>(
                <div key={k} style={{ display:"grid", gridTemplateColumns:"140px 1fr auto", gap:8, marginBottom:8 }}>
                  <input className="input" value={k} onChange={e=>{
                    const nk = e.target.value.toUpperCase();
                    setFx(cur=>{
                      const copy = {...cur}; const val = copy[k]; delete copy[k]; copy[nk] = val; return copy;
                    });
                  }}/>
                  <input className="input" type="number" step="0.000001" value={v}
                    onChange={e=>setFx(cur=>({ ...cur, [k]: Number(e.target.value) }))}/>
                  <button className="btn btn-ghost" onClick={()=>setFx(cur=>{ const copy={...cur}; delete copy[k]; return copy; })}>
                    Remove
                  </button>
                </div>
              ))}
              <button className="btn btn-ghost" onClick={()=>setFx(cur=>({ ...cur, USD: cur.USD || 0.67 }))}>Add Row</button>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:12 }}>
              <button className="btn btn-ghost" onClick={()=>setFxOpen(false)}>Cancel</button>
              <button className="btn btn-navy" onClick={saveFx}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** ------------------ Shell (tabs) ------------------ */
function Shell() {
  const [tab, setTab] = useState("reseller"); // reseller | admin

  return (
    <>
      <div className="container" style={{ paddingTop:0 }}>
        <div className="pills" style={{ justifyContent:"flex-end" }}>
          <button
            className={"pill " + (tab === "reseller" ? "is-active-reseller" : "")}
            onClick={() => setTab("reseller")}
          >
            Reseller
          </button>
          <button
            className={"pill " + (tab === "admin" ? "is-active-admin" : "")}
            onClick={() => setTab("admin")}
          >
            Admin
          </button>
        </div>
      </div>

      {tab === "reseller" ? (
        <ResellerForm onSubmitted={()=>{/* no-op */}} />
      ) : (
        <AdminPanel />
      )}
    </>
  );
}

export default Shell;
