import React, { useEffect, useMemo, useRef, useState } from "react";

/* ----------------------------------------------------------------------------
   Aptella Reseller Deal Registration — single-file App.jsx
   - Reseller form with country selector, Bahasa auto-switch (Indonesia)
   - Default lat/lng to selected Customer Country capital
   - Google Apps Script sync (submit / list / FX / updateStatus)
   - Admin map (Leaflet via CDN from index.html), clusters, filters
   - Admin Approve / Close / Reopen actions with write-back to GAS
   - FX Settings drawer (writes to GAS) + Refresh + Export CSV + Sync Visible
   - Simple password gate (frontend-only)
-----------------------------------------------------------------------------*/

// ---------- Brand + constants ----------
const BRAND = {
  primaryBtn: "bg-[#0e3446] hover:bg-[#0b2938]",
  navy: "#0e3446",
  orange: "#f0a03a",
};

const LOGO_SRC = "/aptella-logo.png"; // Put aptella-logo.png in your repo’s /public

// GAS URL (override by defining window.GOOGLE_APPS_SCRIPT_URL in index.html)
const GAS_URL =
  (typeof window !== "undefined" && window.GOOGLE_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";

// admin password (frontend only; use real auth for production)
const ADMIN_PASSWORD = "Aptella2025!";

const XGRIDS_SOLUTIONS = [
  "Xgrids L2 PRO",
  "Xgrids K1",
  "Xgrids PortalCam",
  "Xgrids Drone Kit",
];

const INDUSTRIES = [
  "Construction",
  "Mining",
  "Oil & Gas",
  "Utilities",
  "Public Sector",
  "Telecoms",
  "Other",
];

const CURRENCIES = ["SGD", "IDR", "MYR", "PHP", "AUD", "USD"];

const COUNTRY_CONFIG = {
  Indonesia:   { currency: "IDR", capital: "Jakarta",    lat: -6.2088, lng: 106.8456 },
  Singapore:   { currency: "SGD", capital: "Singapore",  lat:  1.3521, lng: 103.8198 },
  Malaysia:    { currency: "MYR", capital: "Kuala Lumpur",lat:  3.1390, lng: 101.6869 },
  Philippines: { currency: "PHP", capital: "Manila",     lat: 14.5995, lng: 120.9842 },
};

const STAGES = [
  { key: "qualified",   label: "Qualified" },
  { key: "proposal",    label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won",         label: "Won" },
  { key: "lost",        label: "Lost" },
];

const PROB_BY_STAGE = { qualified: 35, proposal: 55, negotiation: 70, won: 100, lost: 0 };

const STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  CLOSED: "closed",
};

const STATUS_COLOR = {
  [STATUS.PENDING]:  { chip: "bg-blue-50 text-blue-800 ring-blue-200",    row: "bg-blue-50/40",  stroke: "#3b82f6" },
  [STATUS.APPROVED]: { chip: "bg-green-50 text-green-800 ring-green-200", row: "bg-green-50/40", stroke: "#16a34a" },
  [STATUS.CLOSED]:   { chip: "bg-rose-50 text-rose-800 ring-rose-200",    row: "bg-rose-50/40",  stroke: "#e11d48" },
};

// ---------- tiny utils ----------
function todayLocalISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function addDays(dateISO, days){
  const d = new Date(dateISO);
  d.setDate(d.getDate() + Number(days||0));
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function withinNext60Days(dateISO){
  if(!dateISO) return false;
  const t0 = new Date(todayLocalISO());
  const t1 = new Date(dateISO);
  const d = (t1 - t0) / (1000*60*60*24);
  return d >= 0 && d <= 60;
}
function daysUntil(dateISO){
  if(!dateISO) return 0;
  const t0 = new Date(todayLocalISO());
  const t1 = new Date(dateISO);
  return Math.round((t1 - t0) / (1000*60*60*24));
}
function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function csvDownload(rows, filename="export.csv"){
  if(!rows || rows.length===0){ alert("Nothing to export."); return; }
  const cols = Object.keys(rows[0]);
  const head = cols.join(",");
  const body = rows.map(x => cols.map(k => {
    const val = String(x[k] ?? "").replace(/\n/g, " ").replace(/"/g,'""');
    return `"${val}"`;
  }).join(",")).join("\n");
  const blob = new Blob([head+"\n"+body], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function nearExpiry(row, days=7){
  if(!row?.lockExpiry) return false;
  const left = daysUntil(row.lockExpiry);
  return Number.isFinite(left) && left >= 0 && left <= days;
}

// ---------- GAS client ----------
async function gasGet(params){
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GAS_URL}?${qs}`);
  const json = await res.json().catch(()=>null);
  if(!res.ok || json?.ok === false){ throw new Error(json?.error || `HTTP ${res.status}`); }
  return json;
}
async function gasPost(params, body){
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GAS_URL}?${qs}`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(body||{})
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  if(!res.ok || json?.ok === false){ throw new Error(json?.error || `HTTP ${res.status} ${text}`); }
  return json;
}
async function gasList(){ return gasGet({action:"list"}); }
async function gasFxRead(){ return gasGet({action:"fx"}); }
async function gasFxWrite(rates){ return gasPost({action:"fx"}, { rates }); }
async function gasSubmit(row){ return gasPost({action:"submit"}, row); }
async function gasUpdateStatus({id,status,lockExpiry}){ return gasPost({action:"updateStatus"}, {id,status,lockExpiry}); }

// ---------- Small UI atoms ----------
function Label(props){ return <label {...props} className={(props.className||"")+" text-sm font-medium"} />; }
function Input(props){ return <input {...props} className={(props.className||"")+" border rounded-lg px-3 py-2"} />; }
function Select(props){ return <select {...props} className={(props.className||"")+" border rounded-lg px-3 py-2"} />; }
function Textarea(props){ return <textarea {...props} className={(props.className||"")+" border rounded-lg px-3 py-2"} />; }
function Card({children}){ return <div className="rounded-2xl bg-white border shadow-sm">{children}</div>; }
function CardHeader({title, subtitle, extra}){
  return (
    <div className="px-4 py-3 border-b bg-gray-50 rounded-t-2xl flex items-center justify-between">
      <div>
        <div className="font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
      {extra}
    </div>
  );
}
function CardBody({children}){ return <div className="p-4">{children}</div>; }

// ---------- Admin Settings (FX Drawer) ----------
function AdminSettings({ open, onClose, ratesAUD, onSave, saving }){
  const [local, setLocal] = useState(ratesAUD||{});
  useEffect(()=>{ if(open) setLocal(ratesAUD||{}); },[open,ratesAUD]);
  if(!open) return null;
  const rows = Object.entries(local);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-end md:items-center justify-center">
      <div className="bg-white w-full md:w-[640px] rounded-t-2xl md:rounded-2xl shadow-xl">
        <CardHeader title="Admin Settings – FX rates to AUD"
          extra={<button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100">Close</button>}
        />
        <CardBody>
          <div className="grid grid-cols-3 gap-2 text-sm font-medium mb-1">
            <div>Currency</div><div>Rate to AUD</div><div></div>
          </div>
          {rows.map(([cur,val])=>(
            <div key={cur} className="grid grid-cols-3 gap-2 items-center mb-1">
              <Input value={cur} onChange={e=>{
                const n = e.target.value.toUpperCase();
                setLocal(prev=>{ const { [cur]:_, ...rest } = prev; return { ...rest, [n]: val }; });
              }}/>
              <Input type="number" step="0.000001" value={val}
                onChange={e=> setLocal(prev=> ({ ...prev, [cur]: Number(e.target.value) }))} />
              <button className="text-rose-600 text-sm" onClick={()=> setLocal(prev=>{ const cp={...prev}; delete cp[cur]; return cp; })}>Remove</button>
            </div>
          ))}
          <button className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm" onClick={()=> setLocal(prev=> ({ ...prev, USD: prev.USD || 0.67 }))}>
            + Add Row
          </button>
        </CardBody>
        <div className="p-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100">Cancel</button>
          <button disabled={saving} onClick={()=> onSave(local)} className={`px-3 py-1.5 rounded-lg text-white ${BRAND.primaryBtn}`}>
            {saving? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Reseller form ----------
function SubmissionForm({ onSave, items, onSyncOne, onLocaleChange }){
  const [form, setForm] = useState(()=>{
    const cc = "Singapore";
    const cfg = COUNTRY_CONFIG[cc];
    return {
      resellerCountry: cc,
      resellerLocation: cfg.capital,
      resellerName: "",
      resellerContact: "",
      resellerEmail: "",
      resellerPhone: "",
      customerName: "",
      customerLocation: "",
      city: "",
      country: "",
      lat: cfg.lat, lng: cfg.lng,
      industry: "",
      currency: cfg.currency,
      value: "",
      solution: "",
      stage: "qualified",
      probability: PROB_BY_STAGE["qualified"],
      expectedCloseDate: addDays(todayLocalISO(), 14),
      supports: [],
      competitors: [],
      notes: "",
      evidenceFiles: [],
      emailEvidence: true,
      confidential: false,
      remindersOptIn: false,
      accept: false,
    };
  });
  const [errors, setErrors] = useState({});
  const isID = form.resellerCountry === "Indonesia";

  useEffect(()=>{ setForm(f=> ({ ...f, probability: PROB_BY_STAGE[f.stage] ?? f.probability })); }, [form.stage]);
  useEffect(()=>{ onLocaleChange && onLocaleChange(isID? "id" : "en"); }, [isID, onLocaleChange]);
  useEffect(()=>{
    const cfg = COUNTRY_CONFIG[form.resellerCountry];
    if(cfg) setForm(f=> ({ ...f, currency: cfg.currency, resellerLocation: cfg.capital }));
  },[form.resellerCountry]);

  // default lat/lng when customer country chosen
  useEffect(()=>{
    const cfg = COUNTRY_CONFIG[form.country||""];
    if(cfg) setForm(f=> ({ ...f, lat: cfg.lat, lng: cfg.lng, customerLocation: (f.city?f.city+" , ":"") + (form.country||"") }));
  },[form.country]);

  function handle(e){ const {name,value,type,checked} = e.target; setForm(prev=>({...prev,[name]: type==="checkbox"? checked : value})); }
  function handleFiles(e){ const files = Array.from(e.target.files||[]); setForm(prev=>({...prev, evidenceFiles: files})); }

  function validate(){
    const e = {};
    if(!form.resellerName) e.resellerName = "Required";
    if(!form.resellerContact) e.resellerContact = "Required";
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail||"")) e.resellerEmail = "Valid email required";
    if(!form.customerName) e.customerName = "Required";
    if(!form.country) e.country = "Country required";
    if(!form.city) e.city = "City required";
    if(!form.solution) e.solution = "Required";
    if(!(Number(form.value)>0)) e.value = "Enter a positive amount";
    if(!form.expectedCloseDate || !withinNext60Days(form.expectedCloseDate)) e.expectedCloseDate = "Must be within next 60 days";
    if(!(form.evidenceFiles && form.evidenceFiles.length>0)) e.evidence = "Evidence (file) required";
    if(!form.accept) e.accept = "Required";
    setErrors(e);
    return Object.keys(e).length===0;
  }

  function filesToBase64(files){
    const MAX = 20*1024*1024;
    let total = 0;
    const readers = (files||[]).map(f=> new Promise((res,rej)=>{
      const fr = new FileReader();
      fr.onload = ()=> {
        const s = String(fr.result||"");
        const b64 = s.split(",")[1]||"";
        total += b64.length * 0.75;
        res({ name:f.name, type:f.type||"application/octet-stream", data:b64 });
      };
      fr.onerror = rej;
      fr.readAsDataURL(f);
    }));
    return Promise.all(readers).then(list=>{
      if(total>MAX) throw new Error("Attachments exceed ~20MB total.");
      return list;
    });
  }

  async function submit(e){
    e.preventDefault();
    if(!validate()) return;
    const base = { id:uid(), submittedAt: todayLocalISO(), status: STATUS.PENDING, lockExpiry:"", syncedAt:"", ...form, value:Number(form.value) };
    const localRow = { ...base }; // no heavy blobs

    onSave && onSave(localRow);

    // sync to GAS
    try{
      let record = { ...base };
      if(form.emailEvidence && form.evidenceFiles?.length){
        record.attachments = await filesToBase64(form.evidenceFiles);
        record.emailEvidence = true;
      }
      await gasSubmit(record);
      alert("Submitted and synced to Google Sheets.");
    }catch(err){
      console.error(err);
      alert(`Submitted locally. Google Sheets sync failed: ${err.message||err}`);
    }

    // reset minimal
    const cfg = COUNTRY_CONFIG[form.resellerCountry];
    setForm({
      resellerCountry: form.resellerCountry,
      resellerLocation: cfg.capital,
      resellerName: "",
      resellerContact: "",
      resellerEmail: "",
      resellerPhone: "",
      customerName: "",
      customerLocation: "",
      city: "",
      country: "",
      lat: cfg.lat, lng: cfg.lng,
      industry: "",
      currency: cfg.currency,
      value: "",
      solution: "",
      stage: "qualified",
      probability: PROB_BY_STAGE["qualified"],
      expectedCloseDate: addDays(todayLocalISO(), 14),
      supports: [],
      competitors: [],
      notes: "",
      evidenceFiles: [],
      emailEvidence: true,
      confidential: false,
      remindersOptIn: false,
      accept: false,
    });
    const ef = document.getElementById("evidenceFiles");
    if(ef) ef.value = "";
  }

  return (
    <Card>
      <CardHeader title="Register Upcoming Deal (within 60 days)" subtitle="Provide details below. Fields marked * are mandatory." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="resellerCountry">Reseller Country *</Label>
              <Select id="resellerCountry" name="resellerCountry" value={form.resellerCountry} onChange={handle}>
                <option>Indonesia</option>
                <option>Malaysia</option>
                <option>Philippines</option>
                <option>Singapore</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="resellerLocation">{isID? "Lokasi Reseller" : "Reseller Location"}</Label>
              <Input id="resellerLocation" name="resellerLocation" value={form.resellerLocation} onChange={handle} placeholder="Jakarta" />
            </div>
            <div>
              <Label htmlFor="currency">{isID? "Mata Uang" : "Currency"}</Label>
              <Select id="currency" name="currency" value={form.currency} onChange={handle}>
                {CURRENCIES.map(c=><option key={c}>{c}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="resellerName">Reseller company *</Label>
              <Input id="resellerName" name="resellerName" value={form.resellerName} onChange={handle} />
              {errors.resellerName && <p className="text-xs text-rose-600">{errors.resellerName}</p>}
            </div>
            <div>
              <Label htmlFor="resellerContact">{isID? "Kontak Utama *" : "Primary contact *"}</Label>
              <Input id="resellerContact" name="resellerContact" value={form.resellerContact} onChange={handle} />
              {errors.resellerContact && <p className="text-xs text-rose-600">{errors.resellerContact}</p>}
            </div>
            <div>
              <Label htmlFor="resellerEmail">Contact email *</Label>
              <Input id="resellerEmail" name="resellerEmail" type="email" value={form.resellerEmail} onChange={handle} />
              {errors.resellerEmail && <p className="text-xs text-rose-600">{errors.resellerEmail}</p>}
            </div>
            <div>
              <Label htmlFor="resellerPhone">Contact phone</Label>
              <Input id="resellerPhone" name="resellerPhone" value={form.resellerPhone} onChange={handle} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">{isID? "Nama Pelanggan *" : "Customer name *"}</Label>
              <Input id="customerName" name="customerName" value={form.customerName} onChange={handle} />
              {errors.customerName && <p className="text-xs text-rose-600">{errors.customerName}</p>}
            </div>
            <div>
              <Label htmlFor="customerCountry">{isID? "Negara Pelanggan *" : "Customer Country *"}</Label>
              <Select id="customerCountry" name="country" value={form.country} onChange={handle}>
                <option value="">Select country</option>
                <option>Indonesia</option>
                <option>Malaysia</option>
                <option>Philippines</option>
                <option>Singapore</option>
              </Select>
              {errors.country && <p className="text-xs text-rose-600">{errors.country}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">{isID? "Kota Pelanggan *" : "Customer City *"}</Label>
              <Input id="city" name="city" value={form.city} onChange={(e)=>{
                const v = e.target.value;
                setForm(prev=> ({ ...prev, city:v, customerLocation: (v? v : "") + (prev.country? `, ${prev.country}` : "") }));
              }}/>
              {errors.city && <p className="text-xs text-rose-600">{errors.city}</p>}
            </div>
            <div>
              <Label>Map option (paste lat, lng or click helper)</Label>
              <div className="flex gap-2">
                <Input placeholder="lat" value={form.lat} onChange={e=>setForm(prev=>({...prev,lat:Number(e.target.value)}))}/>
                <Input placeholder="lng" value={form.lng} onChange={e=>setForm(prev=>({...prev,lng:Number(e.target.value)}))}/>
              </div>
              <a className="text-xs text-sky-700 underline"
                 href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((form.city||"") + "," + (form.country||""))}`}
                 target="_blank" rel="noreferrer">Open Map</a>
            </div>
            <div>
              <Label htmlFor="expectedCloseDate">{isID? "Perkiraan tanggal penutupan *" : "Expected close date *"}</Label>
              <Input id="expectedCloseDate" name="expectedCloseDate" type="date" value={form.expectedCloseDate} onChange={handle}/>
              {errors.expectedCloseDate && <p className="text-xs text-rose-600">{errors.expectedCloseDate}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label>Solution offered (Xgrids) *</Label>
              <Select value={form.solution} onChange={e=>setForm(prev=>({...prev, solution: e.target.value}))}>
                <option value="">Select an Xgrids solution</option>
                {XGRIDS_SOLUTIONS.map(s=> <option key={s}>{s}</option>)}
              </Select>
              {errors.solution && <p className="text-xs text-rose-600">{errors.solution}</p>}
              <a className="text-xs text-sky-700 underline" href="https://www.aptella.com/asia/product-brands/xgrids-asia/" target="_blank" rel="noreferrer">
                Learn about Xgrids solutions
              </a>
            </div>
            <div>
              <Label htmlFor="value">{isID? "Nilai transaksi *" : "Deal value *"}</Label>
              <Input id="value" name="value" type="number" min="0" step="0.01" value={form.value} onChange={handle}/>
              {errors.value && <p className="text-xs text-rose-600">{errors.value}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="industry">{isID? "Industri" : "Industry"}</Label>
              <Select id="industry" name="industry" value={form.industry} onChange={handle}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(i=> <option key={i}>{i}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="stage">{isID? "Tahap penjualan" : "Sales stage"}</Label>
              <Select id="stage" name="stage" value={form.stage} onChange={handle}>
                {STAGES.map(s=> <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Probability (%)</Label>
              <Input type="number" min="0" max="100" value={form.probability} onChange={e=>setForm(prev=>({...prev, probability:Number(e.target.value)}))}/>
            </div>
          </div>

          <div>
            <Label>Evidence (required)</Label>
            <input id="evidenceFiles" type="file" multiple onChange={handleFiles}
                   className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sky-700"/>
            {form.evidenceFiles?.length>0 && <div className="text-xs text-gray-600 mt-1">{form.evidenceFiles.length} file(s) selected.</div>}
            <label className="flex items-center gap-2 text-sm mt-2">
              <input type="checkbox" checked={!!form.emailEvidence} onChange={e=>setForm(prev=>({...prev, emailEvidence:e.target.checked}))}/>
              {`Email attached files to Aptella (evidence@aptella.com) via secure Apps Script`}
            </label>
            {errors.evidence && <p className="text-xs text-rose-600">{errors.evidence}</p>}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={4} value={form.notes} onChange={handle}
              placeholder="Key requirements, scope, constraints, decision process, etc."/>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="confidential" checked={!!form.confidential} onChange={handle}/>
              Mark customer name confidential to other resellers
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="remindersOptIn" checked={!!form.remindersOptIn} onChange={handle}/>
              Send me reminders for updates
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="accept" checked={!!form.accept} onChange={handle}/>
              I confirm details are accurate and consent to data storage for deal management
            </label>
            {errors.accept && <p className="text-xs text-rose-600 -mt-2">{errors.accept}</p>}
          </div>

          <div className="flex gap-3">
            <button type="submit" className={`px-4 py-2 rounded-xl text-white ${BRAND.primaryBtn}`}>
              {isID ? "Kirim Pendaftaran" : "Submit Registration"}
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

// ---------- Admin Panel ----------
function AdminPanel({
  items, setItems,
  countryFilter, setCountryFilter,
  search, setSearch,
  onSyncMany
}){
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingFx, setSavingFx] = useState(false);
  const [ratesAUD, setRatesAUD] = useState({});
  const [loading, setLoading] = useState(false);

  // load FX on mount
  useEffect(()=>{
    (async()=>{
      try{ const fx = await gasFxRead(); setRatesAUD(fx?.rates||{}); }catch{}
    })();
  },[]);

  // map
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const mapDivRef = useRef(null);

  function makeMarkerColor(row){
    if(row.status === STATUS.APPROVED && nearExpiry(row,7)) return "#f59e0b"; // orange
    return (STATUS_COLOR[row.status]?.stroke || "#0ea5e9");
  }

  function rebuildMarkers(rows){
    if(!window.L || !mapRef.current) return;
    const L = window.L;

    // clear old
    if(clusterRef.current){
      clusterRef.current.clearLayers();
      mapRef.current.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }

    const hasCluster = !!L.markerClusterGroup;
    const layer = hasCluster ? L.markerClusterGroup() : L.layerGroup();

    (rows||[]).forEach(r=>{
      const lat = Number(r.lat), lng = Number(r.lng);
      if(!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = L.circleMarker([lat,lng], {
        radius: 8,
        color: makeMarkerColor(r),
        weight: 2,
        opacity: 1,
        fillOpacity: 0.25
      }).bindPopup(`
        <div style="font-weight:600">${r.customerName||""}</div>
        <div>${r.customerLocation||""}</div>
        <div>${r.solution||""}</div>
        <div>Status: ${r.status||""}${r.lockExpiry?` (lock to ${r.lockExpiry})`:""}</div>
        <div>Value: ${r.currency||""} ${Number(r.value||0).toLocaleString()}</div>
      `);
      layer.addLayer(marker);
    });

    layer.addTo(mapRef.current);
    clusterRef.current = layer;
  }

  useEffect(()=>{
    if(!mapDivRef.current) return;
    if(mapRef.current) return;
    if(!window.L){ console.warn("Leaflet not loaded. Check index.html includes Leaflet JS/CSS."); return; }
    const L = window.L;
    const map = L.map(mapDivRef.current).setView([ -2.5, 117.0 ], 5); // Indonesia-ish
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    mapRef.current = map;
  },[]);

  const visible = useMemo(()=>{
    let rows = items||[];
    if(countryFilter && countryFilter!=="All"){
      rows = rows.filter(r => (r.country||"") === countryFilter);
    }
    if(search && search.trim()){
      const q = search.trim().toLowerCase();
      rows = rows.filter(r =>
        (r.customerName||"").toLowerCase().includes(q) ||
        (r.solution||"").toLowerCase().includes(q)   ||
        (r.resellerName||"").toLowerCase().includes(q)
      );
    }
    return rows;
  },[items,countryFilter,search]);

  useEffect(()=>{ rebuildMarkers(visible); },[visible]);

  async function handleRefresh(){
    setLoading(true);
    try{
      const res = await gasList();
      const rows = res?.rows||[];
      setItems(rows);
    }catch(e){
      alert(`Refresh failed: ${e.message||e}`);
    }finally{ setLoading(false); }
  }

  async function handleFxSave(next){
    setSavingFx(true);
    try{
      await gasFxWrite(next);
      setRatesAUD(next);
      alert("FX saved.");
    }catch(e){
      alert(`Save failed: ${e.message||e}`);
    }finally{ setSavingFx(false); setSettingsOpen(false); }
  }

  function statusChip(row){
    const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1";
    const c = STATUS_COLOR[row.status]?.chip || "bg-gray-50 text-gray-800 ring-gray-200";
    const soon = (row.status===STATUS.APPROVED && nearExpiry(row,7));
    const orange = "bg-orange-50 text-orange-800 ring-orange-200";
    const text = soon ? "Approved (expiring soon)" : (row.status||"").replace(/^./,c=>c.toUpperCase());
    return <span className={`${base} ${soon?orange:c}`}>{text}</span>;
  }

  async function approveRow(r){
    if(!confirm(`Approve & lock for 60 days?\n\n${r.customerName} – ${r.solution}`)) return;
    const lock = addDays(todayLocalISO(), 60);
    try{
      await gasUpdateStatus({ id:r.id, status:STATUS.APPROVED, lockExpiry:lock });
      setItems(prev=> prev.map(x => x.id===r.id ? { ...x, status:STATUS.APPROVED, lockExpiry:lock } : x));
    }catch(e){ alert(`Approve failed: ${e.message||e}`); }
  }
  async function closeRow(r){
    if(!confirm(`Mark Closed/Lost?\n\n${r.customerName} – ${r.solution}`)) return;
    try{
      await gasUpdateStatus({ id:r.id, status:STATUS.CLOSED, lockExpiry:"" });
      setItems(prev=> prev.map(x => x.id===r.id ? { ...x, status:STATUS.CLOSED, lockExpiry:"" } : x));
    }catch(e){ alert(`Close failed: ${e.message||e}`); }
  }
  async function reopenRow(r){
    if(!confirm(`Reopen as Pending?\n\n${r.customerName} – ${r.solution}`)) return;
    try{
      await gasUpdateStatus({ id:r.id, status:STATUS.PENDING, lockExpiry:"" });
      setItems(prev=> prev.map(x => x.id===r.id ? { ...x, status:STATUS.PENDING, lockExpiry:"" } : x));
    }catch(e){ alert(`Reopen failed: ${e.message||e}`); }
  }

  const countries = useMemo(()=>{
    const s = new Set((items||[]).map(r=> r.country).filter(Boolean));
    return ["All", ...Array.from(s)];
  },[items]);

  return (
    <>
      <div className="sticky top-2 z-30 bg-white/80 backdrop-blur rounded-xl border p-3 mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Admin Tools</span>
          <Select value={countryFilter} onChange={(e)=>setCountryFilter(e.target.value)}>
            {countries.map(c=> <option key={c}>{c}</option>)}
          </Select>
          <Input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className={`px-3 py-2 rounded-lg text-white ${BRAND.primaryBtn}`}>{loading? "Refreshing…" : "Refresh"}</button>
          <button onClick={()=> csvDownload(visible, "registrations.csv")} className="px-3 py-2 rounded-lg bg-gray-100">Export CSV</button>
          <button onClick={()=> onSyncMany && onSyncMany(visible)} className="px-3 py-2 rounded-lg bg-gray-100">Sync Visible</button>
          <button onClick={()=> setSettingsOpen(true)} className="px-3 py-2 rounded-lg bg-[${BRAND.orange}] bg-orange-500 text-white">Settings</button>
        </div>
      </div>

      <div ref={mapDivRef} className="w-full h-[520px] rounded-xl border overflow-hidden relative"></div>

      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="p-3 text-left">Submitted</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Solution</th>
              <th className="p-3 text-left">Country</th>
              <th className="p-3 text-left">Value</th>
              <th className="p-3 text-left">Stage</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Lock Expiry</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r=>{
              const tint = (r.status===STATUS.APPROVED && nearExpiry(r,7)) ? "bg-orange-50/40" : (STATUS_COLOR[r.status]?.row || "");
              return (
                <tr key={r.id} className={`border-b last:border-0 ${tint}`}>
                  <td className="p-3">{r.submittedAt||""}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.customerName||""}</div>
                    <div className="text-xs text-gray-500">{r.customerLocation||""}</div>
                  </td>
                  <td className="p-3">{r.solution||""}</td>
                  <td className="p-3">{r.country||""}</td>
                  <td className="p-3">{r.currency||""} {Number(r.value||0).toLocaleString()}</td>
                  <td className="p-3">{r.stage||""}</td>
                  <td className="p-3">{statusChip(r)}</td>
                  <td className="p-3">{r.lockExpiry||""}</td>
                  <td className="p-3 space-x-2">
                    {r.status !== STATUS.APPROVED && (
                      <button className="px-2.5 py-1.5 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700" onClick={()=>approveRow(r)}>Approve</button>
                    )}
                    {r.status !== STATUS.CLOSED && (
                      <button className="px-2.5 py-1.5 rounded-lg text-white bg-rose-600 hover:bg-rose-700" onClick={()=>closeRow(r)}>Close</button>
                    )}
                    {r.status !== STATUS.PENDING && (
                      <button className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={()=>reopenRow(r)}>Reopen</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length===0 && (
              <tr><td className="p-6 text-center text-gray-500" colSpan={9}>No rows to display.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminSettings
        open={settingsOpen}
        onClose={()=>setSettingsOpen(false)}
        ratesAUD={ratesAUD}
        onSave={handleFxSave}
        saving={savingFx}
      />
    </>
  );
}

// ---------- Root ----------
function AptellaRoot(){
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("reseller"); // "reseller" | "admin"
  const [adminAuthed, setAdminAuthed] = useState(()=>{
    try{ return localStorage.getItem("aptella_admin_authed")==="1"; }catch{ return false; }
  });

  const [countryFilter, setCountryFilter] = useState("All");
  const [search, setSearch] = useState("");

  function signIn(){
    const p = prompt("Admin password");
    if(p===ADMIN_PASSWORD){ setAdminAuthed(true); try{ localStorage.setItem("aptella_admin_authed","1"); }catch{} }
    else alert("Wrong password");
  }
  function signOut(){
    setAdminAuthed(false);
    try{ localStorage.removeItem("aptella_admin_authed"); }catch{}
  }

  async function onSyncMany(rows){
    for(const r of rows||[]) {
      try { await gasSubmit(r); } catch(e){ console.warn("Sync failed for", r.id, e); }
    }
    alert("Sync attempted for visible rows.");
  }

  // language switch used by Reseller form (no external strings beyond a few)
  const [lang, setLang] = useState("en");

  return (
    <div className="min-h-screen bg-[#f7fafc] text-[#0f172a]">
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_SRC} alt="Aptella" className="h-6" />
            <div className="font-medium">Reseller Deal Registration</div>
            <span className="text-xs text-gray-500 ml-2 hidden sm:block">Master Distributor</span>
          </div>
          <nav className="flex items-center gap-2">
            <button className={`px-3 py-2 rounded-lg ${tab==="reseller" ? "bg-[#0e3446] text-white" : "bg-gray-100 text-[#0e3446]"}`} onClick={()=>setTab("reseller")}>Reseller</button>
            <button className={`px-3 py-2 rounded-lg ${tab==="admin" ? "bg-[#0e3446] text-white" : "bg-gray-100 text-[#0e3446]"}`} onClick={()=>setTab("admin")}>Admin</button>
            {tab==="admin" && (
              adminAuthed
              ? <button className="px-3 py-2 rounded-lg bg-gray-100" onClick={signOut}>Sign out</button>
              : <button className={`px-3 py-2 rounded-lg text-white ${BRAND.primaryBtn}`} onClick={signIn}>Sign in</button>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        {tab==="reseller" && (
          <SubmissionForm
            items={items}
            onSave={row => setItems(prev=>[row, ...prev])}
            onSyncOne={gasSubmit}
            onLocaleChange={setLang}
          />
        )}

        {tab==="admin" && (
          adminAuthed
            ? <AdminPanel
                items={items}
                setItems={setItems}
                countryFilter={countryFilter}
                setCountryFilter={setCountryFilter}
                search={search}
                setSearch={setSearch}
                onSyncMany={onSyncMany}
              />
            : <Card><CardBody><div className="text-sm">Enter the admin password to view submissions.</div></CardBody></Card>
        )}
      </main>
    </div>
  );
}

export default AptellaRoot;
