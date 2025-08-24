import React, { useEffect, useMemo, useRef, useState } from "react";

/* =========================================================
   Aptella • Reseller Deal Registration (single-file)
   ========================================================= */

/* ---------- Brand & constants ---------- */
const BRAND = {
  navy:        "#0e3446",
  navyDark:    "#0b2938",
  orange:      "#f0a03a",
  primaryBtn:  "bg-[#0e3446] hover:bg-[#0b2938]",
  chipApproved:"bg-green-100 text-green-800",
  chipPending: "bg-blue-100 text-blue-800",
  chipClosed:  "bg-red-100 text-red-800",
  chipWarn:    "bg-orange-100 text-orange-800",
};

const ADMIN_PASSWORD = "Aptella2025!";               // simple gate
const APTELLA_EVIDENCE_EMAIL = "evidence@aptella.com";

const COUNTRY_CONFIG = {
  Indonesia:   { currency: "IDR", capital: "Jakarta",       center: [-6.2088, 106.8456] },
  Singapore:   { currency: "SGD", capital: "Singapore",     center: [ 1.3521, 103.8198] },
  Malaysia:    { currency: "MYR", capital: "Kuala Lumpur",  center: [ 3.139,  101.6869] },
  Philippines: { currency: "PHP", capital: "Manila",        center: [14.5995, 120.9842] },
};
const CURRENCIES       = ["SGD","IDR","MYR","PHP","AUD","USD"];
const XGRIDS_SOLUTIONS = ["Xgrids L2 PRO","Xgrids K1","Xgrids PortalCam","Xgrids Drone Kit"];
const SUPPORT_OPTIONS  = [
  "Pre-sales engineer","Demo / loan unit","Pricing exception","Marketing materials",
  "Partner training","On-site customer visit","Extended lock request",
];
const INDUSTRIES = [
  "Construction","Mining","Oil & Gas","Utilities","Telecommunications",
  "Government","Transport & Logistics","Manufacturing","Education",
  "Real Estate","Architecture/Engineering","Other",
];
const STAGES = [
  { key:"qualified", label:"Qualified" },
  { key:"proposal", label:"Proposal" },
  { key:"negotiation", label:"Negotiation" },
  { key:"won", label:"Won" },
  { key:"lost", label:"Lost" },
];
const PROB_BY_STAGE = { qualified:35, proposal:55, negotiation:70, won:100, lost:0 };

/* ---------- Utilities ---------- */
const GAS_URL =
  (typeof window!=="undefined" && window.GOOGLE_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";

function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function todayISO(){ const d=new Date(); return d.toISOString().slice(0,10); }
function addDays(iso,n){ const d=new Date(iso); d.setDate(d.getDate()+Number(n||0)); return d.toISOString().slice(0,10); }
function daysUntil(iso){ return Math.round((new Date(iso)-new Date(todayISO()))/(1000*60*60*24)); }
function withinNext60Days(iso){ const d=daysUntil(iso); return d>=0 && d<=60; }

/* ---------- GAS helpers (CORS-safe) ----------
   No custom headers; body is plain string.
   GAS reads e.postData.contents.
------------------------------------------------ */
async function gasGET(params){
  const usp = new URLSearchParams({ ...params, t: Date.now() });
  const res = await fetch(`${GAS_URL}?${usp}`, { method: "GET" });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { throw new Error(text || "Bad JSON"); }
  if (!res.ok || json?.ok === false) throw new Error(json?.error || text);
  return json;
}
async function gasPOST(action, payload){
  const res  = await fetch(`${GAS_URL}?action=${encodeURIComponent(action)}&t=${Date.now()}`, {
    method: "POST",
    // no content-type header on purpose → simple request (no preflight)
    body: JSON.stringify(payload || {})
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { throw new Error(text || "Bad JSON"); }
  if (!res.ok || json?.ok === false) throw new Error(json?.error || text);
  return json;
}

/* ---------- Small UI atoms ---------- */
function Card({children}){ return <div className="rounded-2xl bg-white shadow border border-gray-200">{children}</div>; }
function CardHeader({title,subtitle,right}){
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b">
      <div>
        <div className="text-[15px] font-semibold text-slate-800">{title}</div>
        {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
function CardBody({children}){ return <div className="p-5">{children}</div>; }
function Label({children,required,...rest}){
  return <label className="text-sm font-medium text-slate-700" {...rest}>{children} {required && <span className="text-red-500">*</span>}</label>;
}
function Input(props){ return <input {...props} className={"w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 "+(props.className||"")} />; }
function Select(props){ return <select {...props} className={"w-full rounded-xl border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 "+(props.className||"")} />; }
function Textarea(props){ return <textarea {...props} className={"w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 "+(props.className||"")} />; }

/* =========================================================
   Admin: FX Settings Drawer
   ========================================================= */
function FxDrawer({ open, onClose, ratesAUD, onSave, saving }){
  const [local,setLocal] = useState(ratesAUD||{});
  useEffect(()=>setLocal(ratesAUD||{}),[ratesAUD,open]);
  if(!open) return null;
  const rows = Object.entries(local);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-[min(760px,95vw)] shadow-xl">
        <CardHeader title="FX Rates to AUD" right={<button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm">Close</button>} />
        <CardBody>
          <div className="grid grid-cols-3 gap-2 mb-2 text-sm font-medium text-slate-600">
            <div>Currency</div><div>Rate → AUD</div><div></div>
          </div>
          {rows.map(([ccy,rate])=>(
            <div key={ccy} className="grid grid-cols-3 gap-2 items-center mb-1">
              <Input value={ccy} onChange={e=>{
                const v=e.target.value.toUpperCase();
                setLocal(p=>{ const {[ccy]:_,...rest}=p; return {...rest,[v]:rate}; });
              }}/>
              <Input type="number" step="0.000001" value={rate} onChange={e=>setLocal(p=>({...p,[ccy]:Number(e.target.value)}))}/>
              <button className="text-red-600 text-sm" onClick={()=>setLocal(p=>{ const cp={...p}; delete cp[ccy]; return cp; })}>Remove</button>
            </div>
          ))}
          <button className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm" onClick={()=>setLocal(p=>({...p, SGD:p.SGD||1.05 }))}>Add Row</button>
        </CardBody>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-gray-100">Cancel</button>
          <button disabled={saving} onClick={()=>onSave(local)} className={"px-3 py-2 rounded-lg text-white "+BRAND.primaryBtn}>{saving?"Saving…":"Save"}</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Reseller Submission Form
   ========================================================= */
function SubmissionForm({ onLocalAdd, onSyncOne }){
  const cfg0 = COUNTRY_CONFIG["Singapore"];
  const [form,setForm] = useState({
    resellerCountry:"Singapore",
    resellerLocation:cfg0.capital,
    resellerName:"", resellerContact:"", resellerEmail:"", resellerPhone:"",
    customerName:"", customerLocation:"", city:"", country:"",
    lat:cfg0.center[0], lng:cfg0.center[1],
    industry:"", currency:cfg0.currency, value:"",
    solution:"", stage:"qualified", probability:PROB_BY_STAGE.qualified,
    expectedCloseDate:addDays(todayISO(),14),
    supports:[],
    notes:"",
    emailEvidence:true,
    evidenceFiles:[],
    accept:false
  });

  useEffect(()=>setForm(f=>({...f, probability: PROB_BY_STAGE[f.stage] ?? f.probability })),[form.stage]);
  useEffect(()=>{
    const cfg=COUNTRY_CONFIG[form.resellerCountry];
    if(cfg){
      setForm(f=>({...f, currency:cfg.currency, resellerLocation:cfg.capital, lat:cfg.center[0], lng:cfg.center[1]}));
    }
  },[form.resellerCountry]);

  function handleChange(e){ const {name,value,type,checked}=e.target; setForm(f=>({...f,[name]:type==="checkbox"?checked:value})); }
  function toggleSupport(opt){ setForm(f=>({ ...f, supports: f.supports.includes(opt) ? f.supports.filter(x=>x!==opt) : [...f.supports,opt] })); }
  function handleFiles(e){ setForm(f=>({...f, evidenceFiles: Array.from(e.target.files||[]) })); }

  function validate(){
    const errs=[];
    if(!form.resellerName) errs.push("Reseller company is required.");
    if(!form.resellerContact) errs.push("Primary contact is required.");
    if(!form.resellerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail)) errs.push("Valid email required.");
    if(!form.customerName) errs.push("Customer name is required.");
    if(!form.city || !form.country) errs.push("Customer city & country required.");
    if(!form.solution) errs.push("Solution offered is required.");
    if(!form.value || Number(form.value)<=0) errs.push("Deal value must be positive.");
    if(!withinNext60Days(form.expectedCloseDate)) errs.push("Expected close date must be within 60 days.");
    if(!form.accept) errs.push("You must confirm details and consent.");
    if(errs.length){ alert(errs.join("\n")); return false; }
    return true;
  }

  function filesToBase64(files){
    const readers=(files||[]).map(f => new Promise((resolve,reject)=>{
      const fr=new FileReader();
      fr.onload=()=>{ const res=String(fr.result||""); resolve({ name:f.name, type:f.type||"application/octet-stream", data:(res.split(",")[1]||"") }); };
      fr.onerror=reject; fr.readAsDataURL(f);
    }));
    return Promise.all(readers);
  }

  async function submit(e){
    e.preventDefault();
    if(!validate()) return;

    const record = {
      id: uid(),
      submittedAt: todayISO(),
      status: "pending",
      lockExpiry: "",
      syncedAt: null,
      resellerCountry: form.resellerCountry,
      resellerLocation: form.resellerLocation,
      resellerName: form.resellerName,
      resellerContact: form.resellerContact,
      resellerEmail: form.resellerEmail,
      resellerPhone: form.resellerPhone,
      customerName: form.customerName,
      customerLocation: `${form.city}${form.country?`, ${form.country}`:""}`,
      city: form.city,
      country: form.country,
      lat: Number(form.lat), lng: Number(form.lng),
      industry: form.industry,
      currency: form.currency,
      value: Number(form.value),
      solution: form.solution,
      stage: form.stage,
      probability: Number(form.probability),
      expectedCloseDate: form.expectedCloseDate,
      supports: form.supports.join("; "),
      competitors: "",
      notes: form.notes,
      evidenceLinks: "",
      updates: "",
      emailEvidence: !!form.emailEvidence
    };

    onLocalAdd(record);

    try{
      let payload={...record};
      if(form.emailEvidence && (form.evidenceFiles?.length||0)>0){
        payload.attachments = await filesToBase64(form.evidenceFiles);
      }
      await onSyncOne(payload);
      alert("Submitted and synced to Google Sheets.");
    }catch(err){
      alert("Submitted locally. Google Sheets sync failed: " + (err?.message||err));
    }
  }

  return (
    <Card>
      <CardHeader title="Register Upcoming Deal (within 60 days)" subtitle="Fields marked * are mandatory." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label required>Reseller Country</Label>
              <Select name="resellerCountry" value={form.resellerCountry} onChange={handleChange}>
                <option>Indonesia</option><option>Singapore</option><option>Malaysia</option><option>Philippines</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label required>Reseller Location</Label>
              <Input name="resellerLocation" value={form.resellerLocation} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Select name="currency" value={form.currency} onChange={handleChange}>
                {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label required>Reseller company</Label>
              <Input name="resellerName" value={form.resellerName} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label required>Primary contact</Label>
              <Input name="resellerContact" value={form.resellerContact} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label required>Contact email</Label>
              <Input name="resellerEmail" type="email" value={form.resellerEmail} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label>Contact phone</Label>
              <Input name="resellerPhone" value={form.resellerPhone} onChange={handleChange} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label required>Customer name</Label>
              <Input name="customerName" value={form.customerName} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label required>Customer City</Label>
              <Input name="city" value={form.city} onChange={e=>{
                const v=e.target.value; setForm(f=>({...f, city:v, customerLocation:`${v}${f.country?`, ${f.country}`:""}`}));
              }}/>
            </div>
            <div className="grid gap-2">
              <Label required>Customer Country</Label>
              <Select name="country" value={form.country} onChange={e=>{
                const v=e.target.value; setForm(f=>({...f, country:v, customerLocation:`${f.city||""}${v?`, ${v}`:""}`}));
              }}>
                <option value="">Select country</option>
                <option>Indonesia</option><option>Singapore</option><option>Malaysia</option><option>Philippines</option>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Map option (paste lat,lng or use link)</Label>
              <div className="flex gap-2">
                <Input placeholder="lat" value={form.lat} onChange={e=>setForm(f=>({...f,lat:Number(e.target.value)}))}/>
                <Input placeholder="lng" value={form.lng} onChange={e=>setForm(f=>({...f,lng:Number(e.target.value)}))}/>
                <a className={"px-3 py-2 rounded-xl text-white text-sm "+BRAND.primaryBtn}
                   href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((form.city||"")+","+(form.country||""))}`}
                   target="_blank" rel="noreferrer">Open Map</a>
              </div>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label required>Solution offered (Xgrids)</Label>
              <Select value={form.solution} onChange={e=>setForm(f=>({...f,solution:e.target.value}))}>
                <option value="">Select an Xgrids solution</option>
                {XGRIDS_SOLUTIONS.map(s=><option key={s} value={s}>{s}</option>)}
              </Select>
              <a className="text-sky-700 underline text-xs" href="https://www.aptella.com/asia/product-brands/xgrids-asia/" target="_blank" rel="noreferrer">Learn about Xgrids</a>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Expected close date</Label>
              <Input type="date" name="expectedCloseDate" value={form.expectedCloseDate} onChange={handleChange}/>
            </div>
            <div className="grid gap-2">
              <Label>Industry</Label>
              <Select name="industry" value={form.industry} onChange={handleChange}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Deal value</Label>
              <Input type="number" name="value" step="0.01" min="0" value={form.value} onChange={handleChange}/>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Sales stage</Label>
              <Select name="stage" value={form.stage} onChange={handleChange}>
                {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Probability (%)</Label>
              <Input type="number" min="0" max="100" name="probability" value={form.probability} onChange={handleChange}/>
            </div>
            <div className="grid gap-2">
              <Label>Support requested</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {SUPPORT_OPTIONS.map(opt=>(
                  <label key={opt} className="text-sm flex items-center gap-2">
                    <input type="checkbox" checked={form.supports.includes(opt)} onChange={()=>toggleSupport(opt)} /> {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Evidence (optional files)</Label>
            <input type="file" multiple onChange={handleFiles}
                   className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sky-700"/>
            <label className="text-sm inline-flex items-center gap-2 mt-1">
              <input type="checkbox" checked={!!form.emailEvidence} onChange={e=>setForm(f=>({...f,emailEvidence:e.target.checked}))}/>
              Email attached files to Aptella ({APTELLA_EVIDENCE_EMAIL}) via secure Apps Script
            </label>
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea rows={4} name="notes" value={form.notes} onChange={handleChange} placeholder="Key requirements, scope, constraints, decision process…" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm inline-flex items-center gap-2">
              <input type="checkbox" name="accept" checked={!!form.accept} onChange={handleChange}/>
              I confirm details are accurate and consent to data storage for deal management
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className={"px-4 py-2 rounded-xl text-white "+BRAND.primaryBtn}>Submit Registration</button>
            <button type="button" className="px-4 py-2 rounded-xl bg-gray-200" onClick={()=>window.location.reload()}>Reset</button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/* =========================================================
   Admin
   ========================================================= */
function StatusChip({row}){
  let cls=BRAND.chipPending, txt="pending";
  if(row.status==="approved"){ cls=BRAND.chipApproved; txt="approved"; }
  else if(row.status==="closed"||row.status==="lost"){ cls=BRAND.chipClosed; txt=row.status; }
  else if(row.lockExpiry && daysUntil(row.lockExpiry)<=7){ cls=BRAND.chipWarn; txt="ending soon"; }
  return <span className={"px-2 py-1 rounded-lg text-xs "+cls}>{txt}</span>;
}

function AdminPanel({items,fx,onRefresh,onApprove,onClose,onOpenFx,onExportCSV}){
  const totalAUD = useMemo(()=>{
    const r=fx||{};
    return (items||[]).reduce((sum,row)=>{
      const rate = (row.currency==="AUD") ? 1 : (r[row.currency] || 0);
      const v = Number(row.value||0) * (rate||0);
      return sum + (isFinite(v)?v:0);
    },0);
  },[items,fx]);

  const mapRef=useRef(null), mapObj=useRef(null), layer=useRef(null);
  useEffect(()=>{
    if(!mapRef.current || mapObj.current) return;
    const L=window.L; if(!L) return;
    mapObj.current=L.map(mapRef.current).setView([1.3521,103.8198],6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap contributors"}).addTo(mapObj.current);
    layer.current=L.layerGroup().addTo(mapObj.current);
  },[]);
  useEffect(()=>{
    const L=window.L; if(!L || !mapObj.current || !layer.current) return;
    layer.current.clearLayers();
    const bounds=[];
    for(const r of items){
      if(!r.lat || !r.lng) continue;
      const color = r.status==="approved" ? "#16a34a" : (r.status==="closed"||r.status==="lost") ? "#dc2626" :
                    (r.lockExpiry && daysUntil(r.lockExpiry)<=7) ? "#f59e0b" : "#2563eb";
      const m=L.circleMarker([r.lat,r.lng],{radius:6,color,weight:2,fillOpacity:0.7})
        .bindPopup(`<div style="font-size:12px"><strong>${r.customerName||""}</strong><br/>${r.customerLocation||""}<br/>${r.solution||""}<br/>${r.currency||""} ${r.value||""}</div>`);
      m.addTo(layer.current); bounds.push([r.lat,r.lng]);
    }
    if(bounds.length) mapObj.current.fitBounds(bounds,{padding:[30,30]});
  },[items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onRefresh} className={"px-3 py-2 rounded-lg text-white "+BRAND.primaryBtn}>Refresh</button>
        <button onClick={onExportCSV} className="px-3 py-2 rounded-lg bg-gray-100">Export CSV</button>
        <button onClick={onOpenFx} className="px-3 py-2 rounded-lg bg-[#f0a03a] text-white">FX Settings</button>
        <div className="ml-auto text-sm text-slate-600">Total value (AUD): <span className="font-semibold">A$ {totalAUD.toLocaleString()}</span></div>
      </div>

      <div className="h-[420px] rounded-2xl overflow-hidden border" ref={mapRef} />

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-3 text-left">Submitted</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Location</th>
              <th className="p-3 text-left">Solution</th>
              <th className="p-3 text-left">Value</th>
              <th className="p-3 text-left">Stage</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r=>(
              <tr key={r.id} className="border-b">
                <td className="p-3">{r.submittedAt}</td>
                <td className="p-3">{r.customerName}</td>
                <td className="p-3">{r.customerLocation}</td>
                <td className="p-3">{r.solution}</td>
                <td className="p-3">{(r.currency||"")+" "+(r.value||"")}</td>
                <td className="p-3">{r.stage}</td>
                <td className="p-3"><StatusChip row={r}/></td>
                <td className="p-3 space-x-2">
                  <button onClick={()=>onApprove(r)} className="px-2.5 py-1.5 rounded-lg bg-green-600 text-white">Approve</button>
                  <button onClick={()=>onClose(r)} className="px-2.5 py-1.5 rounded-lg bg-gray-200">Close</button>
                </td>
              </tr>
            ))}
            {items.length===0 && <tr><td className="p-4 text-sm text-gray-500" colSpan={8}>No rows.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================
   Root
   ========================================================= */
export default function App(){
  const [tab,setTab]         = useState("reseller");
  const [authed,setAuthed]   = useState(false);
  const [items,setItems]     = useState([]);
  const [fx,setFx]           = useState({});
  const [fxOpen,setFxOpen]   = useState(false);
  const [savingFx,setSaving] = useState(false);

  function onLocalAdd(r){ setItems(p=>[r,...p]); }

  async function onSyncOne(payload){
    await gasPOST("submit", payload);
    setItems(p=>p.map(x=>x.id===payload.id?{...x,syncedAt:todayISO()}:x));
  }

  async function refresh(){
    try{ const {rows}=await gasGET({action:"list"}); setItems(Array.isArray(rows)?rows:[]); }
    catch(e){ alert("Refresh failed: "+(e?.message||e)); }
  }

  async function approve(row){
    try{
      await gasPOST("update",{id:row.id,status:"approved",lockDays:60});
      setItems(p=>p.map(r=>r.id===row.id?{...r,status:"approved"}:r));
    }catch(e){ alert("Update failed: "+(e?.message||e)); }
  }
  async function closeRow(row){
    try{
      await gasPOST("update",{id:row.id,status:"closed"});
      setItems(p=>p.map(r=>r.id===row.id?{...r,status:"closed"}:r));
    }catch(e){ alert("Update failed: "+(e?.message||e)); }
  }

  function exportCSV(){
    const cols=["id","submittedAt","resellerCountry","resellerLocation","resellerName","resellerContact","resellerEmail","resellerPhone","customerName","customerLocation","city","country","lat","lng","industry","currency","value","solution","stage","probability","expectedCloseDate","status","lockExpiry","syncedAt","supports","notes","evidenceLinks"];
    const head=cols.join(",");
    const body=(items||[]).map(x=>cols.map(k=>{
      const val=(x[k]==null?"":String(x[k])).replace(/\n/g," ").replace(/"/g,'""');
      return `"${val}"`;
    }).join(",")).join("\n");
    const blob=new Blob([head+"\n"+body],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="aptella-registrations.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  async function openFx(){
    setFxOpen(true);
    try{ const {ratesAUD}=await gasGET({action:"fx"}); setFx(ratesAUD||{}); }
    catch(e){ alert("Could not load FX: "+(e?.message||e)); }
  }
  async function saveFx(newFx){
    setSaving(true);
    try{ const {ratesAUD}=await gasPOST("fx",{ratesAUD:newFx}); setFx(ratesAUD||{}); setFxOpen(false); }
    catch(e){ alert("FX save failed: "+(e?.message||e)); }
    finally{ setSaving(false); }
  }

  function login(){
    const pwd=prompt("Enter admin password:"); if(pwd===ADMIN_PASSWORD){ setAuthed(true); refresh(); } else alert("Incorrect password.");
  }

  return (
    <div className="min-h-screen bg-[#f7fafc] text-slate-900">
      {/* Top bar */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/aptella-logo.png" alt="Aptella" className="h-6" onError={(e)=>{e.currentTarget.style.display="none";}}/>
            <div className="text-sm text-slate-500">Master Distributor • Xgrids</div>
          </div>
          <div className="flex items-center gap-2">
            <button className={"px-3 py-2 rounded-lg "+(tab==="reseller"?"bg-[#0e3446] text-white":"bg-gray-100 text-[#0e3446]")} onClick={()=>setTab("reseller")}>Reseller</button>
            <button className={"px-3 py-2 rounded-lg "+(tab==="admin"?"bg-[#0e3446] text-white":"bg-gray-100 text-[#0e3446]")} onClick={()=>setTab("admin")}>Admin</button>
            {authed ? <button className="px-3 py-2 rounded-lg bg-gray-100" onClick={()=>setAuthed(false)}>Logout</button>
                    : <button className="px-3 py-2 rounded-lg bg-gray-100" onClick={login}>Login</button>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab==="reseller" && <SubmissionForm onLocalAdd={onLocalAdd} onSyncOne={onSyncOne} />}
        {tab==="admin" && (
          authed
          ? <AdminPanel items={items} fx={fx} onRefresh={refresh} onApprove={approve} onClose={closeRow} onOpenFx={openFx} onExportCSV={exportCSV}/>
          : <Card><CardBody>Enter the admin password to continue.</CardBody></Card>
        )}
      </div>

      {/* Drawers */}
      <FxDrawer open={fxOpen} onClose={()=>setFxOpen(false)} ratesAUD={fx} onSave={saveFx} saving={savingFx} />
    </div>
  );
}
