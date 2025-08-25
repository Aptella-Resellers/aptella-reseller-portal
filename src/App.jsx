import React, { useEffect, useMemo, useRef, useState } from "react";

/** ======= CONFIG ======= */
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";

const ADMIN_PASSWORD = "aptella2025!"; // change in prod

const INDUSTRIES = [
  "Construction",
  "Mining",
  "Agriculture",
  "Utilities",
  "Transport & Logistics",
  "Oil & Gas",
  "Other",
];

const STAGES = [
  { key: "Qualified", label: "Qualified" },
  { key: "Proposal", label: "Proposal" },
  { key: "Negotiation", label: "Negotiation" },
  { key: "Won", label: "Won" },
  { key: "Lost", label: "Lost" },
];

const SOLUTIONS = ["Xgrids L2 PRO", "Xgrids K1", "Xgrids L1", "Other…"];

const CURRENCIES = ["AUD", "SGD", "IDR", "MYR", "USD"];

const DEFAULT_PROB = {
  Qualified: 35,
  Proposal: 50,
  Negotiation: 70,
  Won: 100,
  Lost: 0,
};

// quick capitals for default lat/lng
const CAPITALS = {
  Singapore: [1.3521, 103.8198],
  Indonesia: [-6.2088, 106.8456], // Jakarta
  Malaysia: [3.139, 101.6869],
  Australia: [-35.282, 149.1286], // Canberra
  Thailand: [13.7563, 100.5018],
  Philippines: [14.5995, 120.9842],
  Vietnam: [21.0278, 105.8342],
};

const prettyDate = (isoLike) => {
  if (!isoLike) return "";
  // if already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoLike)) return isoLike;
  try {
    const d = new Date(isoLike);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return isoLike;
  }
};

const fetchJSON = async (url, opts = {}) => {
  try {
    const res = await fetch(url, {
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    const text = await res.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { ok: false, error: `Non-JSON: ${text.slice(0, 200)}` };
    }
    if (!res.ok || json.ok === false)
      throw new Error(json.error || `${res.status} ${res.statusText}`);
    return json;
  } catch (err) {
    throw new Error(`Failed to fetch: ${err.message || err}`);
  }
};

/** ======= APP ======= */
export default function App() {
  const [tab, setTab] = useState("reseller");
  const [adminOK, setAdminOK] = useState(
    () => localStorage.getItem("aptella_admin_ok") === "1"
  );

  return (
    <div>
      <div className="brandbar">
        <div className="container" style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <div className="brand">
            <img src="https://www.aptella.com/wp-content/uploads/2023/08/Aptella-Logo.svg" alt="Aptella" />
            <span className="kicker">Master Distributor • Xgrids</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className={`btn ${tab==='reseller'?'orange':''}`} onClick={()=>setTab('reseller')}>Reseller</button>
            <button className={`btn ${tab==='admin'?'primary':''}`} onClick={()=>setTab('admin')}>Admin</button>
            {!adminOK ? (
              <button className="btn" onClick={()=>{
                const p = prompt("Admin password");
                if (p === ADMIN_PASSWORD) { localStorage.setItem("aptella_admin_ok","1"); setAdminOK(true); setTab('admin');}
                else alert("Incorrect password");
              }}>Login</button>
            ) : (
              <button className="btn" onClick={()=>{ localStorage.removeItem("aptella_admin_ok"); setAdminOK(false); setTab('reseller'); }}>Logout</button>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        {tab === "reseller" && <ResellerForm />}
        {tab === "admin" && (adminOK ? <AdminPanel/> : <AuthHint/>)}
        <div className="footer">© {new Date().getFullYear()} Aptella — Xgrids Master Distributor</div>
      </div>
    </div>
  );
}

function AuthHint(){
  return (
    <div className="card" style={{padding:18}}>
      <h3>Admin access</h3>
      <p>Use the <b>Login</b> button in the header to enter the admin password.</p>
    </div>
  );
}

/** ======= Reseller ======= */
function ResellerForm(){
  const [form, setForm] = useState({
    resellerCountry: "",
    resellerLocation: "",
    currency: "SGD",
    resellerCompany: "",
    primaryContact: "",
    contactEmail: "",
    contactPhone: "",
    customerName: "",
    customerCity: "",
    customerCountry: "",
    lat: "",
    lng: "",
    solution: "",
    solutionOther: "",
    expectedCloseDate: prettyDate(new Date().toISOString()),
    industry: "",
    stage: "Qualified",
    probability: DEFAULT_PROB.Qualified,
    value: "",
    competitors: "",
    supportPreSales: false,
    supportDemo: false,
    supportTraining: false,
    supportPricing: false,
    supportOnsite: false,
    supportMarketing: false,
    supportExtendLock: false,
    notes: "",
    emailEvidence: true,  // default ticked
  });
  const [probDirty, setProbDirty] = useState(false);
  const [files, setFiles] = useState([]);
  const isID = form.resellerCountry === "Indonesia";

  // Bahasa labels
  const L = (en,id) => (isID ? id : en);

  // default lat/lng from capital
  useEffect(()=>{
    if (form.customerCountry && CAPITALS[form.customerCountry]) {
      const [lat, lng] = CAPITALS[form.customerCountry];
      setForm(f=>({...f, lat: f.lat||lat, lng: f.lng||lng}));
    }
  }, [form.customerCountry]);

  const handle = (e) => {
    const {name, value, type, checked} = e.target;
    setForm(f=>({...f, [name]: type==='checkbox'? checked : value}));
  };

  const openMap = () => {
    const q = encodeURIComponent(`${form.customerCity||""}, ${form.customerCountry||""}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  };

  const submit = async (e) => {
    e.preventDefault();
    // simple require
    const must = ["resellerCountry","resellerLocation","currency","contactEmail","customerName","customerCountry","expectedCloseDate","value"];
    for (const k of must){
      if (!form[k]) { alert(`Please fill ${k}`); return; }
    }
    if (files.length===0){ alert("Evidence is required. Please attach at least one file."); return; }

    const payload = {
      ...form,
      submittedAt: prettyDate(new Date().toISOString()),
      solution: form.solution==="Other…" ? form.solutionOther : form.solution,
    };

    try {
      const res = await fetchJSON(`${GAS_URL}?action=submit`, { method:"POST", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(res.error||"failed");
      alert("Submitted locally. Google Sheets sync queued.");
    } catch (err) {
      alert(`Submitted locally. Google Sheets sync failed: ${err.message}`);
    }
  };

  return (
    <form className="card" style={{padding:18}} onSubmit={submit}>
      <h3 style={{marginBottom:12}}>Register Upcoming Deal <span className="kicker">(within 60 days)</span></h3>

      {/* row 1 */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
        <div>
          <label>{L("Reseller Country *","Negara Reseller *")}</label>
          <select name="resellerCountry" required className="input orange" value={form.resellerCountry} onChange={handle}>
            <option value="">{L("Select country","Pilih negara")}</option>
            <option>Singapore</option><option>Indonesia</option><option>Malaysia</option>
            <option>Australia</option><option>Thailand</option><option>Philippines</option><option>Vietnam</option>
          </select>
        </div>
        <div>
          <label>{L("Reseller Location *","Lokasi Reseller *")}</label>
          <input name="resellerLocation" required className="input" placeholder={L("e.g., Singapore","mis. Jakarta")} value={form.resellerLocation} onChange={handle}/>
        </div>
        <div>
          <label>{L("Currency *","Mata uang *")}</label>
          <select name="currency" required className="input" value={form.currency} onChange={handle}>
            {CURRENCIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* row 2 */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:10}}>
        <div>
          <label>{L("Reseller company *","Perusahaan reseller *")}</label>
          <input name="resellerCompany" required className="input" value={form.resellerCompany} onChange={handle}/>
        </div>
        <div>
          <label>{L("Primary contact *","Kontak utama *")}</label>
          <input name="primaryContact" required className="input" value={form.primaryContact} onChange={handle}/>
        </div>
        <div>
          <label>{L("Contact email *","Email kontak *")}</label>
          <input name="contactEmail" required type="email" className="input" value={form.contactEmail} onChange={handle}/>
        </div>
      </div>

      {/* row 3 */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:10}}>
        <div>
          <label>{L("Contact phone","Telepon kontak")}</label>
          <input name="contactPhone" className="input" value={form.contactPhone} onChange={handle}/>
        </div>
        <div>
          <label>{L("Customer name *","Nama pelanggan *")}</label>
          <input name="customerName" required className="input" value={form.customerName} onChange={handle}/>
        </div>
        <div>
          <label>{L("Customer Country *","Negara Pelanggan *")}</label>
          <select name="customerCountry" required className="input" value={form.customerCountry} onChange={handle}>
            <option value="">{L("Select country","Pilih negara")}</option>
            <option>Singapore</option><option>Indonesia</option><option>Malaysia</option>
            <option>Australia</option><option>Thailand</option><option>Philippines</option><option>Vietnam</option>
          </select>
        </div>
      </div>

      {/* row 4 */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:10, alignItems:"end"}}>
        <div>
          <label>{L("Customer City","Kota Pelanggan")}</label>
          <input name="customerCity" className="input" value={form.customerCity} onChange={(e)=>{
            const v = e.target.value;
            setForm(f=>({...f, customerCity:v}));
          }}/>
        </div>
        <div>
          <label>{L("Map option (paste lat,lng or use link)","Opsi peta (tempel lat,lng atau gunakan tautan)")}</label>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 110px", gap:8}}>
            <input className="input" name="lat" placeholder="lat" value={form.lat} onChange={handle}/>
            <input className="input" name="lng" placeholder="lng" value={form.lng} onChange={handle}/>
            <button type="button" className="btn primary" onClick={openMap}>Open Map</button>
          </div>
        </div>
        <div>
          <label>{L("Expected close date *","Perkiraan tanggal penutupan *")}</label>
          <input type="date" required className="input" name="expectedCloseDate" value={form.expectedCloseDate} onChange={handle}/>
        </div>
      </div>

      {/* row 5 */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:10}}>
        <div>
          <label>{L("Solution offered (Xgrids) *","Solusi ditawarkan (Xgrids) *")}</label>
          <select name="solution" required className="input" value={form.solution} onChange={handle}>
            <option value="">{L("Select an Xgrids solution","Pilih solusi Xgrids")}</option>
            {SOLUTIONS.map(s=><option key={s}>{s}</option>)}
          </select>
          {form.solution==="Other…" && (
            <input className="input" style={{marginTop:8}} placeholder={L("Type the solution","Ketik solusi")} name="solutionOther" value={form.solutionOther} onChange={handle}/>
          )}
          <div><a href="https://www.aptella.com/xgrids/" target="_blank" rel="noreferrer">{L("Learn about Xgrids","Pelajari Xgrids")}</a></div>
        </div>
        <div>
          <label>{L("Industry","Industri")}</label>
          <select className="input" name="industry" value={form.industry} onChange={handle}>
            <option value="">{L("Select industry","Pilih industri")}</option>
            {INDUSTRIES.map(i=><option key={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label>{L("Deal value *","Nilai kesepakatan *")}</label>
          <input name="value" required className="input" placeholder={L("e.g., 25000","mis. 25000")} value={form.value} onChange={handle}/>
        </div>
      </div>

      {/* row 6 */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:10}}>
        <div>
          <label>{L("Sales stage","Tahap penjualan")}</label>
          <select name="stage" className="input" value={form.stage} onChange={(e)=>{
            const v = e.target.value;
            setForm(f=>({...f, stage:v, probability: probDirty? f.probability : (DEFAULT_PROB[v] ?? f.probability)}));
          }}>
            {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label>{L("Probability (%)","Probabilitas (%)")}</label>
          <input className="input" name="probability" value={form.probability} onChange={(e)=>{ setProbDirty(true); handle(e); }}/>
        </div>
        <div>
          <label>{L("Competitors","Kompetitor")}</label>
          <input className="input" name="competitors" placeholder={L("Comma separated (optional)","Dipisah koma (opsional)")} value={form.competitors} onChange={handle}/>
        </div>
      </div>

      {/* supports */}
      <div style={{marginTop:10}}>
        <label>{L("Support requested","Dukungan diminta")}</label>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:8, marginTop:6}}>
          <label><input type="checkbox" name="supportPreSales" checked={form.supportPreSales} onChange={handle}/> {L("Pre-sales engineer","Engineer pra-penjualan")}</label>
          <label><input type="checkbox" name="supportDemo" checked={form.supportDemo} onChange={handle}/> {L("Demo / loan unit","Demo / unit pinjam")}</label>
          <label><input type="checkbox" name="supportMarketing" checked={form.supportMarketing} onChange={handle}/> {L("Marketing materials","Materi pemasaran")}</label>
          <label><input type="checkbox" name="supportTraining" checked={form.supportTraining} onChange={handle}/> {L("Partner training","Pelatihan mitra")}</label>
          <label><input type="checkbox" name="supportPricing" checked={form.supportPricing} onChange={handle}/> {L("Pricing exception","Pengecualian harga")}</label>
          <label><input type="checkbox" name="supportOnsite" checked={form.supportOnsite} onChange={handle}/> {L("On-site customer visit","Kunjungan pelanggan")}</label>
          <label><input type="checkbox" name="supportExtendLock" checked={form.supportExtendLock} onChange={handle}/> {L("Extended lock request","Permintaan perpanjangan lock")}</label>
        </div>
      </div>

      {/* evidence */}
      <div style={{marginTop:10}}>
        <label>{L("Evidence (required)","Bukti (wajib)")}</label>
        <input type="file" multiple required onChange={(e)=>setFiles(Array.from(e.target.files||[]))}/>
        <label style={{display:"block", marginTop:6}}>
          <input type="checkbox" name="emailEvidence" checked={form.emailEvidence} onChange={handle}/>
          {" "}Email attached files to Aptella (admin.asia@aptella.com)
        </label>
      </div>

      <div style={{marginTop:10}}>
        <label>{L("Notes","Catatan")}</label>
        <textarea rows="4" className="input" name="notes" placeholder={L("Key requirements, scope, constraints, decision process, etc.","Kebutuhan utama, ruang lingkup, kendala, proses keputusan, dll.")} value={form.notes} onChange={handle}/>
      </div>

      <div style={{marginTop:12, display:"flex", gap:8, justifyContent:"flex-end"}}>
        <button type="reset" className="btn">Reset</button>
        <button className="btn primary" type="submit">{L("Submit Registration","Kirim Registrasi")}</button>
      </div>
    </form>
  );
}

/** ======= Admin ======= */
function AdminPanel(){
  const [rows, setRows] = useState([]);
  const [fx, setFx] = useState({ AUD:1, SGD:1.05, IDR:0.0001, MYR:0.33, USD:1.5 });
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key:"submittedAt", dir:"desc" });
  const [fxOpen, setFxOpen] = useState(false);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);

  const filtered = useMemo(()=>{
    const s = (q||"").toLowerCase();
    let arr = rows.filter(r=>{
      if (!s) return true;
      const blob = [
        r.customerName, r.resellerLocation, r.customerCountry, r.solution, r.stage, r.status
      ].join(" ").toLowerCase();
      return blob.includes(s);
    });
    const cmp = (a,b) => {
      const dir = sort.dir==="asc" ? 1 : -1;
      let va=a[sort.key], vb=b[sort.key];
      if (sort.key==="valueAud"){ va=valueAud(a, fx); vb=valueAud(b, fx); }
      if (sort.key==="expectedCloseDate"||sort.key==="submittedAt"){ va=prettyDate(a[sort.key]); vb=prettyDate(b[sort.key]); }
      return (va>vb?1:va<vb?-1:0)*dir;
    };
    arr.sort(cmp);
    return arr;
  }, [rows, q, sort, fx]);

  const totalAud = useMemo(()=>{
    return filtered.reduce((sum,r)=> sum + valueAud(r, fx), 0);
  }, [filtered, fx]);

  const handleRefresh = async () =>{
    try {
      const j = await fetchJSON(`${GAS_URL}?action=list`);
      setRows(j.rows||[]);
      if (j.fx) setFx(j.fx);
      setTimeout(initMap, 50);
    } catch (err) {
      alert(`Refresh failed: ${err.message}`);
    }
  };

  useEffect(()=>{ handleRefresh(); },[]);

  const saveFx = async (map) => {
    try{
      const res = await fetchJSON(`${GAS_URL}?action=fx`, {method:"POST", body:JSON.stringify({fx:map})});
      if (!res.ok) throw new Error(res.error||"failed");
      setFx(map);
      setFxOpen(false);
    }catch(err){
      alert(`FX save failed: ${err.message}`);
    }
  };

  const approve = async (r) => {
    if (r.status==="approved") return;
    try{
      await fetchJSON(`${GAS_URL}?action=approve`, {method:"POST", body:JSON.stringify({id:r.id})});
      setRows(prev => prev.map(x=> x.id===r.id ? {...x, status:"approved"} : x));
    }catch(err){ alert(`Update failed: ${err.message}`); }
  };
  const close = async (r) => {
    if (r.status==="closed") return;
    try{
      await fetchJSON(`${GAS_URL}?action=close`, {method:"POST", body:JSON.stringify({id:r.id})});
      setRows(prev => prev.map(x=> x.id===r.id ? {...x, status:"closed"} : x));
    }catch(err){ alert(`Update failed: ${err.message}`); }
  };

  const initMap = () => {
    try{
      const L = window.L; if (!L || !mapRef.current) return;
      if (leafletRef.current){ leafletRef.current.remove(); leafletRef.current=null; }
      const m = L.map(mapRef.current).setView([-2.5,118],5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18, attribution:"&copy; OpenStreetMap"}).addTo(m);

      // group/sum
      const groups = {};
      rows.forEach(r=>{
        const lat=Number(r.lat), lng=Number(r.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const k=`${lat.toFixed(2)},${lng.toFixed(2)}`;
        const aud=valueAud(r, fx);
        if (!groups[k]) groups[k]={lat,lng,total:0,count:0,by:{pending:0,approved:0,closed:0}, items:[]};
        groups[k].total += aud; groups[k].count++; (groups[k].by[r.status||"pending"]++); groups[k].items.push(r);
      });

      const cluster = L.markerClusterGroup ? L.markerClusterGroup({ showCoverageOnHover:false }) : null;

      Object.values(groups).forEach(g=>{
        const label=`A$ ${Math.round(g.total).toLocaleString()}`;
        const html=`<div class="bubble">${label}</div>`;
        const icon=L.divIcon({html, className:"bubble-icon", iconSize:[1,1]});
        const mk=L.marker([g.lat,g.lng],{icon});
        const rowsHtml = g.items.slice(0,10).map(r=> `<div><b>${r.customerName||"-"}</b> — ${r.solution||"-"} — <i>${r.status||"pending"}</i></div>`).join("");
        const more = g.items.length>10 ? `<div>…and ${g.items.length-10} more</div>` : "";
        mk.bindPopup(`<div style="min-width:240px">
            <div style="font-weight:800;margin-bottom:6px">${label} • ${g.count} deal(s)</div>
            <div style="display:flex;gap:8px;margin-bottom:8px">
              <span class="badge blue">pending ${g.by.pending||0}</span>
              <span class="badge green">approved ${g.by.approved||0}</span>
              <span class="badge red">closed ${g.by.closed||0}</span>
            </div>
            ${rowsHtml}${more}
          </div>`);
        if (cluster) cluster.addLayer(mk); else mk.addTo(m);
      });
      if (cluster) m.addLayer(cluster);
      leafletRef.current=m;
    }catch{}
  };

  return (
    <div>
      <div className="card" style={{padding:12, marginBottom:12, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
        <input className="input" style={{maxWidth:280}} placeholder="Search customer/location/solution…" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="input" style={{maxWidth:200}} value={sort.key} onChange={e=>setSort(s=>({...s, key:e.target.value}))}>
          <option value="submittedAt">Sort by: Submitted</option>
          <option value="expectedCloseDate">Sort by: Expected</option>
          <option value="customerName">Sort by: Customer</option>
          <option value="resellerLocation">Sort by: Location</option>
          <option value="solution">Sort by: Solution</option>
          <option value="valueAud">Sort by: Value (AUD)</option>
          <option value="stage">Sort by: Stage</option>
          <option value="status">Sort by: Status</option>
        </select>
        <select className="input" style={{maxWidth:140}} value={sort.dir} onChange={e=>setSort(s=>({...s, dir:e.target.value}))}>
          <option value="desc">Newest → Oldest</option>
          <option value="asc">Oldest → Newest</option>
        </select>

        <div style={{flex:1}} />
        <div className="kicker">Total (AUD): <b>A$ {Math.round(totalAud).toLocaleString()}</b></div>
        <button className="btn primary" onClick={handleRefresh}>Refresh</button>
        <button className="btn" onClick={()=>setFxOpen(true)}>FX Settings</button>
      </div>

      <div className="card" style={{padding:12, marginBottom:12}}>
        <div ref={mapRef} className="map-wrap"></div>
      </div>

      <div className="card" style={{padding:0, overflow:"hidden"}}>
        <table className="table">
          <thead>
            <tr>
              {["Submitted","Expected","Customer","Location","Solution","Value","Stage","Status","Actions"].map(h=>(
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && (
              <tr><td colSpan="9" style={{textAlign:"center", padding:"32px"}}>No rows match the filters</td></tr>
            )}
            {filtered.map(r=>(
              <tr key={r.id}>
                <td>{prettyDate(r.submittedAt)}</td>
                <td>{prettyDate(r.expectedCloseDate)}</td>
                <td>{r.customerName||"-"}</td>
                <td>{[r.customerCity,r.customerCountry].filter(Boolean).join(", ")||r.resellerLocation||"-"}</td>
                <td>{r.solution||"-"}</td>
                <td>A$ {Math.round(valueAud(r, fx)).toLocaleString()}</td>
                <td>{r.stage||"-"}</td>
                <td>
                  {r.status==="approved" && <span className="badge green">approved</span>}
                  {r.status==="closed" && <span className="badge red">closed</span>}
                  {!r.status || r.status==="pending" ? <span className="badge blue">pending</span> : null}
                </td>
                <td className="actions">
                  {r.status!=="approved" && r.status!=="closed" && (
                    <button className="btn orange" onClick={()=>approve(r)}>Approve</button>
                  )}
                  {r.status!=="closed" && (
                    <button className="btn" onClick={()=>close(r)}>Close</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {fxOpen && <FxModal initial={fx} onClose={()=>setFxOpen(false)} onSave={saveFx} />}
    </div>
  );
}

function valueAud(r, fx){
  const v = Number(r.value||0);
  const rate = r.currency==="AUD" ? 1 : Number(fx?.[r.currency]||1);
  return v*rate;
}

function FxModal({initial, onClose, onSave}){
  const [map, setMap] = useState(()=>({...initial}));
  const entries = Object.entries(map);

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h3>FX Rates to AUD</h3>
        <div style={{display:"grid", gap:8, marginTop:8}}>
          {entries.map(([cur,rate])=>(
            <div key={cur} style={{display:"grid", gridTemplateColumns:"130px 1fr auto", gap:8}}>
              <select className="input" value={cur} onChange={(e)=>{
                const nv=e.target.value;
                setMap(m=>{
                  const copy={...m}; delete copy[cur]; copy[nv]=rate; return copy;
                });
              }}>
                {CURRENCIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <input className="input" value={rate} onChange={(e)=> setMap(m=>({...m, [cur]: e.target.value}))}/>
              <button className="btn" onClick={()=> setMap(m=>{ const copy={...m}; delete copy[cur]; return copy; })}>Remove</button>
            </div>
          ))}
          <div>
            <button className="btn" onClick={()=>{
              const nxt = CURRENCIES.find(c=>!(c in map));
              if (nxt) setMap(m=>({...m, [nxt]:1}));
            }}>Add Row</button>
          </div>
        </div>
        <div style={{display:"flex", gap:8, justifyContent:"flex-end", marginTop:12}}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={()=>onSave(map)}>Save</button>
        </div>
      </div>
    </div>
  );
}
