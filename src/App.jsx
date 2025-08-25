import React from "react";
import logoSvg from "./assets/aptella-logo.svg";

/** ================== CONFIG ================== */
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";

const ADMIN_PASSWORD = "Aptella2025!"; // << requested password

const COUNTRY_PRESETS = {
  Singapore: { currency: "SGD", lat: 1.3521, lng: 103.8198 },
  Malaysia: { currency: "MYR", lat: 3.139, lng: 101.6869 },
  Indonesia: { currency: "IDR", lat: -6.2088, lng: 106.8456 },
  Philippines: { currency: "PHP", lat: 14.5995, lng: 120.9842 },
};

const BRAND = {
  navy: "#0E3446",
  navyDark: "#0B2938",
  orange: "#F0A03A",
  gray1: "#f8fafc",
  gray2: "#e2e8f0",
  text: "#0f172a",
};

/** ================== UTILS ================== */
const logoUrl = new URL(logoSvg, import.meta.url).href;

const ymd = (d) => {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
};
const fmtAUD = (n) =>
  Number.isFinite(n)
    ? new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n)
    : "—";

// Very tolerant currency parser: “25,000” | “SGD 25,000.50” | 25000 | "25000"
function parseMoney(x) {
  if (x == null) return NaN;
  if (typeof x === "number") return x;
  const s = String(x).replace(/[^0-9.-]+/g, ""); // keep digits, dot, minus
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : NaN;
}

async function loadCDN({ js, css }) {
  const ensure = (href, kind) =>
    new Promise((res) => {
      const sel = kind === "css" ? `link[data-href="${href}"]` : `script[data-href="${href}"]`;
      if (document.querySelector(sel)) return res();
      if (kind === "css") {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = href;
        l.setAttribute("data-href", href);
        l.onload = () => res();
        document.head.appendChild(l);
      } else {
        const s = document.createElement("script");
        s.src = href;
        s.setAttribute("data-href", href);
        s.onload = () => res();
        document.head.appendChild(s);
      }
    });
  for (const c of css || []) await ensure(c, "css");
  for (const j of js || []) await ensure(j, "js");
}

async function getJSON(url) {
  const r = await fetch(url);
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch {}
  if (!r.ok || (j && j.ok === false)) throw new Error((j && j.error) || `HTTP ${r.status} ${r.statusText}`);
  return j ?? {};
}
async function postJSON(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch {}
  if (!r.ok || (j && j.ok === false)) throw new Error((j && j.error) || `HTTP ${r.status} ${r.statusText}`);
  return j ?? {};
}

/** ================== HEADER ================== */
function Header({ tab, setTab, authed, onLogout }) {
  return (
    <>
      <style>{`
        :root{ --navy:${BRAND.navy}; --navyD:${BRAND.navyDark}; --orange:${BRAND.orange}; }
        .pill{ padding:.45rem .9rem; border-radius:999px; border:1px solid transparent; font-weight:800 }
        .pill[aria-current="page"]{ background:var(--orange); color:#111 }
        .btn{ display:inline-flex; align-items:center; gap:.5rem; padding:.55rem .9rem; border-radius:.75rem; border:1px solid rgba(14,52,70,.12); background:#fff; color:var(--navy); font-weight:700 }
        .btn-navy{ background:var(--navy); color:#fff; border-color:transparent }
        .btn-navy:hover{ background:var(--navyD) }
      `}</style>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#ffffffcc", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(14,52,70,.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 12px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={logoUrl} alt="Aptella" style={{ height: 30 }} />
            <span style={{ fontSize: 12, color: "#64748b" }}>Master Distributor • <strong>Xgrids</strong></span>
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: BRAND.navy }}>Reseller Deal Registration</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            <nav style={{ display: "flex", gap: 6 }}>
              <button className="pill" aria-current={tab === "reseller" ? "page" : undefined} onClick={() => setTab("reseller")}>Reseller</button>
              <button className="pill" aria-current={tab === "admin" ? "page" : undefined} onClick={() => setTab("admin")}>Admin</button>
            </nav>
            {authed ? <button className="btn" onClick={onLogout}>Logout</button> : <span style={{ fontSize: 12, color: "#64748b" }}>Not signed in</span>}
          </div>
        </div>
      </header>
    </>
  );
}

/** ================== LOGIN MODAL ================== */
function LoginModal({ open, onClose, onSuccess }) {
  const [pwd, setPwd] = React.useState("");
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: 360, padding: 16 }}>
        <h3 style={{ margin: 0, color: BRAND.navy, fontWeight: 900 }}>Admin login</h3>
        <p style={{ marginTop: 6, color: "#475569" }}>Enter password to access Admin.</p>
        <input type="password" placeholder="Password" value={pwd} onChange={(e) => setPwd(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BRAND.gray2}` }} />
        <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" onClick={() => {
            if (!ADMIN_PASSWORD || pwd === ADMIN_PASSWORD) { localStorage.setItem("aptella_admin_ok","1"); onSuccess(); }
            else alert("Incorrect password");
          }}>Sign in</button>
        </div>
      </div>
    </div>
  );
}

/** ================== FX DRAWER (z-index fixed) ================== */
function FxDrawer({ open, onClose, onSave, rows }) {
  const [local, setLocal] = React.useState(rows || [{ ccy: "SGD", rateToAUD: 1.05 }]);
  React.useEffect(() => setLocal(rows || [{ ccy: "SGD", rateToAUD: 1.05 }]), [rows]);
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100000 /* >> map/leaflet panes */ }}>
      <div style={{ background: "#fff", borderRadius: 16, width: 560, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontWeight: 900, color: BRAND.navy }}>FX Rates to AUD</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {local.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
              <input value={r.ccy} onChange={(e)=>setLocal(L=>L.map((x,idx)=>idx===i?{...x,ccy:e.target.value.toUpperCase()}:x))} placeholder="CCY e.g. SGD"
                     style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${BRAND.gray2}` }}/>
              <input value={r.rateToAUD} onChange={(e)=>setLocal(L=>L.map((x,idx)=>idx===i?{...x,rateToAUD:e.target.value}:x))} placeholder="Rate to AUD"
                     style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${BRAND.gray2}` }}/>
              <button className="btn" onClick={()=>setLocal(L=>L.filter((_,idx)=>idx!==i))}>Remove</button>
            </div>
          ))}
          <div><button className="btn" onClick={()=>setLocal(L=>[...L,{ ccy:"", rateToAUD:"" }])}>Add Row</button></div>
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" onClick={()=>onSave(local)}>Save</button>
        </div>
      </div>
    </div>
  );
}

/** ================== RESELLER FORM ================== */
function ResellerForm({ onSubmitted }) {
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    resellerCountry: "", resellerLocation: "", currency: "SGD",
    company: "", contact: "", email: "", phone: "",
    customerName: "", customerCountry: "", customerCity: "",
    lat: "", lng: "", expectedCloseDate: ymd(new Date()),
    solution: "", solutionOther: "", industry: "", stage: "Qualified",
    probability: 35, value: "", competitors: "",
    support: { presales:false, demo:false, training:false, marketing:false, lock:false, pricing:false, onsite:false },
    notes: "", emailEvidence: true,
  });

  const inputStyle = { background: BRAND.gray1, border: `1px solid ${BRAND.gray2}`, borderRadius: 10, padding: "10px 12px", width: "100%" };
  const orangeStyle = { background: "#fff7ed", border: `1px solid ${BRAND.orange}`, borderRadius: 10, padding: "10px 12px", width: "100%" };
  const group = { display:"grid", gap:6 };

  React.useEffect(()=>{
    const p = COUNTRY_PRESETS[form.resellerCountry];
    if (!p) return;
    setForm(f=>({ ...f, currency:p.currency, lat:String(p.lat), lng:String(p.lng),
      resellerLocation: f.resellerLocation || (
        f.resellerCountry==="Singapore" ? "Singapore" :
        f.resellerCountry==="Malaysia" ? "Kuala Lumpur" :
        f.resellerCountry==="Indonesia" ? "Jakarta" :
        f.resellerCountry==="Philippines" ? "Manila" : ""
      )
    }));
  },[form.resellerCountry]);

  React.useEffect(()=>{
    const prob = form.stage==="Qualified"?35 : form.stage==="Negotiation"?55 : form.stage==="Proposal"?70 : form.stage==="Closed"?100 : form.probability;
    setForm(f=>({ ...f, probability: prob }));
  },[form.stage]);

  const submit = async (e)=>{
    e.preventDefault();
    setSaving(true);
    try{
      const payload = {
        ...form,
        support: Object.keys(form.support).filter(k=>form.support[k]).join(", "),
        action:"submit"
      };
      await postJSON(`${GAS_URL}?action=submit`, payload);
      alert("Submitted. It will appear in Admin after Refresh.");
      onSubmitted && onSubmitted();
    }catch(err){
      alert(`Submitted locally. Google Sheets sync failed: ${err.message || err}`);
    }finally{ setSaving(false); }
  };

  return (
    <section style={{ maxWidth: 1100, margin: "18px auto", padding: "0 12px" }}>
      <form onSubmit={submit}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
          <div style={group}>
            <label style={{ fontWeight:700, color:BRAND.navy }}>Reseller Country *</label>
            <select value={form.resellerCountry} onChange={(e)=>setForm(f=>({ ...f, resellerCountry:e.target.value }))} style={orangeStyle} required>
              <option value="">Select country</option><option>Singapore</option><option>Malaysia</option><option>Indonesia</option><option>Philippines</option>
            </select>
          </div>
          <div style={group}>
            <label style={{ fontWeight:700, color:BRAND.navy }}>Reseller Location *</label>
            <input style={inputStyle} value={form.resellerLocation} onChange={(e)=>setForm(f=>({ ...f, resellerLocation:e.target.value }))} required/>
          </div>
          <div style={group}>
            <label style={{ fontWeight:700, color:BRAND.navy }}>Currency *</label>
            <select style={inputStyle} value={form.currency} onChange={(e)=>setForm(f=>({ ...f, currency:e.target.value }))} required>
              <option>SGD</option><option>MYR</option><option>IDR</option><option>PHP</option><option>AUD</option>
            </select>
          </div>

          <div style={group}><label>Reseller company *</label><input style={inputStyle} value={form.company} onChange={(e)=>setForm(f=>({ ...f, company:e.target.value }))} required/></div>
          <div style={group}><label>Primary contact *</label><input style={inputStyle} value={form.contact} onChange={(e)=>setForm(f=>({ ...f, contact:e.target.value }))} required/></div>
          <div style={group}><label>Contact email *</label><input type="email" style={inputStyle} value={form.email} onChange={(e)=>setForm(f=>({ ...f, email:e.target.value }))} required/></div>

          <div style={group}><label>Contact phone</label><input style={inputStyle} value={form.phone} onChange={(e)=>setForm(f=>({ ...f, phone:e.target.value }))}/></div>
          <div style={group}><label>Customer name *</label><input style={inputStyle} value={form.customerName} onChange={(e)=>setForm(f=>({ ...f, customerName:e.target.value }))} required/></div>
          <div style={group}>
            <label>Customer Country *</label>
            <select style={inputStyle} value={form.customerCountry} onChange={(e)=>setForm(f=>({ ...f, customerCountry:e.target.value }))} required>
              <option value="">Select country</option><option>Singapore</option><option>Malaysia</option><option>Indonesia</option><option>Philippines</option><option>Australia</option>
            </select>
          </div>

          <div style={group}><label>Customer City</label><input style={inputStyle} value={form.customerCity} onChange={(e)=>setForm(f=>({ ...f, customerCity:e.target.value }))}/></div>
          <div style={group}>
            <label>Map option (paste lat,lng or use link)</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <input style={inputStyle} placeholder="lat" value={form.lat} onChange={(e)=>setForm(f=>({ ...f, lat:e.target.value }))}/>
              <input style={inputStyle} placeholder="lng" value={form.lng} onChange={(e)=>setForm(f=>({ ...f, lng:e.target.value }))}/>
            </div>
          </div>
          <div style={group}>
            <label>Expected close date *</label>
            <input type="date" style={inputStyle} value={form.expectedCloseDate} onChange={(e)=>setForm(f=>({ ...f, expectedCloseDate:e.target.value }))} required/>
          </div>

          <div style={group}>
            <label>Solution offered (Xgrids) *</label>
            <select style={inputStyle} value={form.solution} onChange={(e)=>setForm(f=>({ ...f, solution:e.target.value }))} required>
              <option value="">Select an Xgrids solution</option>
              <option>Xgrids L2 PRO</option><option>Xgrids L2 MAX</option><option>Xgrids K1</option><option>Xgrids X1</option><option>Other</option>
            </select>
            <div style={{ fontSize:12, marginTop:4 }}>
              <a href="https://www.aptella.com/xgrids/" target="_blank" rel="noreferrer" style={{ color:BRAND.navy }}>Learn about Xgrids</a>
            </div>
            {form.solution==="Other" && (
              <input style={{ ...inputStyle, marginTop:8 }} placeholder="Describe other solution"
                     value={form.solutionOther} onChange={(e)=>setForm(f=>({ ...f, solutionOther:e.target.value }))} required/>
            )}
          </div>
          <div style={group}>
            <label>Industry</label>
            <select style={inputStyle} value={form.industry} onChange={(e)=>setForm(f=>({ ...f, industry:e.target.value }))}>
              <option value="">Select industry</option><option>Construction</option><option>Mining</option><option>Utilities</option><option>Transport</option><option>Other</option>
            </select>
          </div>
          <div style={group}><label>Deal value *</label>
            <input style={inputStyle} placeholder="e.g., 25000" value={form.value}
                   onChange={(e)=>setForm(f=>({ ...f, value:e.target.value }))} required/>
          </div>

          <div style={group}>
            <label>Sales stage</label>
            <select style={inputStyle} value={form.stage} onChange={(e)=>setForm(f=>({ ...f, stage:e.target.value }))}>
              <option>Qualified</option><option>Negotiation</option><option>Proposal</option><option>Closed</option>
            </select>
          </div>
          <div style={group}><label>Probability (%)</label>
            <input type="number" min={0} max={100} style={inputStyle} value={form.probability}
                   onChange={(e)=>setForm(f=>({ ...f, probability:Number(e.target.value) }))}/>
          </div>
          <div style={group}><label>Competitors</label>
            <input style={inputStyle} placeholder="Comma-separated (optional)" value={form.competitors}
                   onChange={(e)=>setForm(f=>({ ...f, competitors:e.target.value }))}/>
          </div>

          <div style={{ gridColumn:"1 / span 3", display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ display:"grid", gap:6 }}>
              <label>Support requested</label>
              {[
                ["presales","Pre-sales engineer"],
                ["marketing","Marketing materials"],
                ["lock","Extended lock request"],
              ].map(([k,label])=>(
                <label key={k} style={{ display:"inline-flex", alignItems:"center", gap:8, color:"#334155" }}>
                  <input type="checkbox" checked={form.support[k]} onChange={(e)=>setForm(f=>({ ...f, support:{ ...f.support, [k]:e.target.checked }}))}/>
                  {label}
                </label>
              ))}
            </div>
            <div style={{ display:"grid", gap:6 }}>
              <label style={{ visibility:"hidden" }}>spacer</label>
              {[
                ["demo","Demo / loan unit"],
                ["training","Partner training"],
                ["pricing","Pricing exception"],
                ["onsite","On-site customer visit"],
              ].map(([k,label])=>(
                <label key={k} style={{ display:"inline-flex", alignItems:"center", gap:8, color:"#334155" }}>
                  <input type="checkbox" checked={form.support[k]} onChange={(e)=>setForm(f=>({ ...f, support:{ ...f.support, [k]:e.target.checked }}))}/>
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ gridColumn:"1 / span 3", display:"grid", gap:6 }}>
            <label>Notes</label>
            <textarea style={{ ...inputStyle, minHeight:90 }} placeholder="Key requirements, scope, constraints, decision process, etc."
                      value={form.notes} onChange={(e)=>setForm(f=>({ ...f, notes:e.target.value }))}/>
          </div>

          <div style={{ gridColumn:"1 / span 3", display:"flex", alignItems:"center", gap:12 }}>
            <label style={{ fontWeight:700 }}>Evidence (required)</label>
            <input type="file" multiple required />
            <label style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
              <input type="checkbox" checked={!!form.emailEvidence}
                     onChange={(e)=>setForm(f=>({ ...f, emailEvidence:e.target.checked }))}/>
              Email attached files to Aptella (admin.asia@aptella.com)
            </label>
          </div>
        </div>

        <div style={{ marginTop:16, display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button type="reset" className="btn">Reset</button>
          <button type="submit" className="btn btn-navy" disabled={saving}>{saving ? "Submitting…" : "Submit Registration"}</button>
        </div>
      </form>
    </section>
  );
}

/** ================== ADMIN ================== */
function AdminPanel() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [fxOpen, setFxOpen] = React.useState(false);
  const [fxRows, setFxRows] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [sortBy, setSortBy] = React.useState("submitted");
  const [dir, setDir] = React.useState("desc"); // desc = newest first

  const mapRef = React.useRef(null);
  const leafletMap = React.useRef(null);
  const clusterLayer = React.useRef(null);
  const fxToAUD = React.useRef({});

  const ensureLeaflet = React.useCallback(async () => {
    if (window.L && window.L.MarkerClusterGroup) return;
    await loadCDN({
      css: [
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css",
      ],
      js: [
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js",
      ],
    });
  }, []);

  const initMap = React.useCallback(async () => {
    await ensureLeaflet();
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      leafletMap.current = window.L.map(mapRef.current).setView([-2.5, 118], 4);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(leafletMap.current);
    }
    if (clusterLayer.current) {
      clusterLayer.current.clearLayers();
      leafletMap.current.removeLayer(clusterLayer.current);
    }
    clusterLayer.current = new window.L.MarkerClusterGroup();
    leafletMap.current.addLayer(clusterLayer.current);

    items.forEach((r) => {
      const lat = Number(r.lat), lng = Number(r.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const ccy = (r.currency || "AUD").toUpperCase();
      const rate = fxToAUD.current[ccy] || 1;
      const rawVal = r.value ?? r.dealValue ?? r.amount ?? "";
      const val = parseMoney(rawVal);
      const aud = ccy === "AUD" ? val : val * rate;

      const m = window.L.marker([lat, lng]);
      m.bindPopup(
        `<strong>${r.customerName || "—"}</strong><br/>${[r.city, r.country].filter(Boolean).join(", ") || ""}<br/><em>${r.solution || ""}</em><br/><b>${fmtAUD(aud)}</b>`
      );
      clusterLayer.current.addLayer(m);
    });
  }, [items, ensureLeaflet]);

  const refresh = async () => {
    setLoading(true);
    try {
      const json = await getJSON(`${GAS_URL}?action=list`);
      setItems(json.rows || []);
    } catch (e) {
      alert(`Refresh failed: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const loadFx = async () => {
    try {
      let json;
      try { json = await getJSON(`${GAS_URL}?action=fxList`); }
      catch { json = await getJSON(`${GAS_URL}?action=fx`); }
      const rows = json.rows || [];
      setFxRows(rows.length ? rows : [{ ccy: "SGD", rateToAUD: 1.05 }]);
      fxToAUD.current = Object.fromEntries((rows || []).map(r => [String(r.ccy||"").toUpperCase(), Number(r.rateToAUD)]));
      setFxOpen(true);
    } catch (e) {
      alert(`FX load failed: ${e.message || e}`);
    }
  };
  const saveFx = async (rows) => {
    try {
      const json = await postJSON(`${GAS_URL}?action=fx`, { rows });
      const saved = json.rows || rows;
      fxToAUD.current = Object.fromEntries(saved.map(r => [String(r.ccy||"").toUpperCase(), Number(r.rateToAUD)]));
      setFxOpen(false);
      await refresh();
    } catch (e) {
      alert(`FX save failed: ${e.message || e}`);
    }
  };

  const updateStatus = async (row, status) => {
    try {
      await postJSON(`${GAS_URL}?action=update`, { id: row.id, status });
      setItems(prev => prev.map(r => r.id === row.id ? { ...r, status } : r));
    } catch (e) {
      alert(`Update failed: ${e.message || e}`);
    }
  };

  React.useEffect(()=>{ refresh(); },[]);
  React.useEffect(()=>{ initMap(); },[items, initMap]);

  // Search & sort
  const filtered = React.useMemo(()=>{
    const ql = q.trim().toLowerCase();
    const base = !ql ? items : items.filter(r=>{
      const loc = [r.city, r.country].filter(Boolean).join(", ");
      return [r.customerName, loc, r.solution].some(v => String(v||"").toLowerCase().includes(ql));
    });
    const sorted = [...base].sort((a,b)=>{
      const dirMul = dir==="asc" ? 1 : -1;
      const by = {
        submitted: () => new Date(a.submittedAt) - new Date(b.submittedAt),
        expected: () => new Date(a.expectedCloseDate) - new Date(b.expectedCloseDate),
        customer: () => String(a.customerName||"").localeCompare(String(b.customerName||"")),
        location: () => String([a.city,a.country].filter(Boolean).join(", ")||"").localeCompare(String([b.city,b.country].filter(Boolean).join(", ")||"")),
        solution: () => String(a.solution||"").localeCompare(String(b.solution||"")),
        stage: () => String(a.stage||"").localeCompare(String(b.stage||"")),
        status: () => String(a.status||"").localeCompare(String(b.status||"")),
        value: () => {
          const va = parseMoney(a.value ?? a.dealValue ?? a.amount ?? "");
          const vb = parseMoney(b.value ?? b.dealValue ?? b.amount ?? "");
          return va - vb;
        }
      }[sortBy] || (()=>0);
      return dirMul * by();
    });
    return sorted;
  },[items,q,sortBy,dir]);

  const totalAUD = React.useMemo(()=>{
    return filtered.reduce((acc,r)=>{
      const ccy = (r.currency || "AUD").toUpperCase();
      const rate = fxToAUD.current[ccy] || 1;
      const rawVal = r.value ?? r.dealValue ?? r.amount ?? "";
      const val = parseMoney(rawVal);
      const aud = ccy==="AUD" ? val : val*rate;
      return acc + (Number.isFinite(aud)?aud:0);
    },0);
  },[filtered]);

  return (
    <section style={{ maxWidth: 1200, margin: "18px auto", padding: "0 12px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:10, alignItems:"center", marginBottom:10 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <input placeholder="Search customer / location / solution…" value={q} onChange={(e)=>setQ(e.target.value)}
                 style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${BRAND.gray2}`, minWidth:280 }}/>
          <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)}
                  style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${BRAND.gray2}` }}>
            <option value="submitted">Submitted</option>
            <option value="expected">Expected</option>
            <option value="customer">Customer</option>
            <option value="location">Location</option>
            <option value="solution">Solution</option>
            <option value="value">Value</option>
            <option value="stage">Stage</option>
            <option value="status">Status</option>
          </select>
          <select value={dir} onChange={(e)=>setDir(e.target.value)}
                  style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${BRAND.gray2}` }}>
            <option value="desc">Newest → Oldest</option>
            <option value="asc">Oldest → Newest</option>
          </select>
          <div style={{ fontWeight:900, color:BRAND.navy }}>Total (AUD): {fmtAUD(totalAUD)}</div>
        </div>
        <button className="btn btn-navy" onClick={refresh} disabled={loading}>{loading?"Refreshing…":"Refresh"}</button>
        <button className="btn" onClick={loadFx}>FX Settings</button>
      </div>

      <div ref={mapRef} style={{ height: 420, borderRadius: 16, border: `1px solid ${BRAND.gray2}`, overflow: "hidden", marginBottom: 12 }} />

      <div style={{ overflowX:"auto", border:`1px solid ${BRAND.gray2}`, borderRadius:12 }}>
        <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
          <thead>
            <tr style={{ background:"rgba(240,160,58,.12)", color:BRAND.navy }}>
              {["Submitted","Expected","Customer","Location","Solution","Value","Stage","Status","Actions"].map(h=>(
                <th key={h} style={{ textAlign:"left", padding:"10px 12px", fontWeight:900, borderBottom:`1px solid ${BRAND.gray2}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && <tr><td colSpan={9} style={{ padding:16, color:"#64748b" }}>No rows.</td></tr>}
            {filtered.map((r)=> {
              const loc = [r.city, r.country].filter(Boolean).join(", ") || r.customerLocation || "—";
              const ccy = (r.currency || "AUD").toUpperCase();
              const rate = fxToAUD.current[ccy] || 1;
              const rawVal = r.value ?? r.dealValue ?? r.amount ?? "";
              const val = parseMoney(rawVal);
              const aud = ccy==="AUD" ? val : val*rate;

              return (
                <tr key={r.id}>
                  <td style={{ padding:"10px 12px", borderBottom:`1px solid ${BRAND.gray2}` }}>{ymd(r.submittedAt)}</td>
                  <td style={{ padding:"10px 12px", borderBottom:`1px solid ${BRAND.gray2}` }}>{ymd(r.expectedCloseDate)}</td>
                  <td style={{ padding:"10px 12px", borderBottom:`1px solid ${BRAND.gray2}` }}>{r.customerName || "—"}</td>
                  <td style={{ padding:"10px 12px", borderBottom:`1px solid ${BRAND.gray2}` }}>{loc}</td>
                  <td style={{ padding:"10px 12px", borderBottom:`1px solid ${BRAND.gray2}` }}>{r.solution || "—"}</td>
                  <td style={{ padding:"10px 12px", borderBottom:`1px solid ${BRAND.gray2}` }}>{fmtAUD(aud)}</td>
                  <td style={{ padding:"10px 12px", borderBottom:`1px solid ${BRAND.gray2}` }}>{r.stage || "—"}</td>
                  <td style={{ padding:"10px 12px", borderBottom:`1px solid ${BRAND.gray2}` }}>
                    <span style={{
                      padding:".2rem .55rem", borderRadius:999, fontSize:12, fontWeight:800,
                      background: r.status==="approved"?"rgba(34,197,94,.12)": r.status==="closed"?"rgba(239,68,68,.12)":"rgba(59,130,246,.12)",
                      color:      r.status==="approved"?"#16A34A":           r.status==="closed"?"#DC2626":"#2563EB",
                      border:`1px solid ${r.status==="approved"?"rgba(34,197,94,.28)":r.status==="closed"?"rgba(239,68,68,.28)":"rgba(59,130,246,.28)"}`
                    }}>
                      {r.status || "pending"}
                    </span>
                  </td>
                  <td style={{ padding:"10px 12px", borderBottom:`1px solid ${BRAND.gray2}` }}>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {r.status!=="approved" && <button className="btn" onClick={()=>updateStatus(r,"approved")}>Approve</button>}
                      {r.status!=="closed" && <button className="btn" onClick={()=>updateStatus(r,"closed")}>Close</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <FxDrawer open={fxOpen} onClose={()=>setFxOpen(false)} onSave={saveFx} rows={fxRows}/>
    </section>
  );
}

/** ================== ROOT ================== */
export default function App(){
  const [tab,setTab] = React.useState("reseller");
  const [authed,setAuthed] = React.useState(localStorage.getItem("aptella_admin_ok")==="1");
  const [showLogin,setShowLogin] = React.useState(false);

  React.useEffect(()=>{ if(tab==="admin" && !authed) setShowLogin(true); },[tab,authed]);

  return (
    <div style={{ minHeight:"100dvh", background:"#fbfdff", color:BRAND.text }}>
      <Header tab={tab} setTab={(t)=>{ if(t==="admin" && !authed) setShowLogin(true); else setTab(t); }} authed={authed}
              onLogout={()=>{ localStorage.removeItem("aptella_admin_ok"); setAuthed(false); setTab("reseller"); }}/>
      {tab==="reseller" ? <ResellerForm onSubmitted={()=>setTab("admin")}/> : authed ? <AdminPanel/> :
        <section style={{ maxWidth:1100, margin:"18px auto", padding:"0 12px", color:"#64748b" }}>Please sign in to view Admin.</section>}
      <footer style={{ maxWidth:1200, margin:"24px auto", padding:"0 12px", fontSize:12, color:"#64748b" }}>
        © {new Date().getFullYear()} Aptella — Xgrids Master Distributor
      </footer>
      <LoginModal open={showLogin} onClose={()=>{ setShowLogin(false); setTab("reseller"); }}
                  onSuccess={()=>{ setShowLogin(false); setAuthed(true); setTab("admin"); }}/>
    </div>
  );
}