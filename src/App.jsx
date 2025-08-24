import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------- Brand ---------- */
const BRAND = {
  navy: "#0e3446",
  navyDark: "#0b2938",
  orange: "#f0a03a",
  primaryBtn: "bg-[#0e3446] hover:bg-[#0b2938]",
  outlineBtn: "bg-white border border-slate-300 hover:border-slate-400 text-[#0e3446]",
  chipBlue: "bg-blue-100 text-blue-800",
  chipGreen: "bg-green-100 text-green-800",
  chipRed: "bg-red-100 text-red-800",
  chipOrange: "bg-orange-100 text-orange-800"
};

// Use public/ asset; Vite adds base automatically
const LOGO = (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.BASE_URL || "/"))
  ? (import.meta.env.BASE_URL + "aptella-logo.png")
  : "/aptella-logo.png";

const GAS_URL = (typeof window !== 'undefined' && window.GOOGLE_APPS_SCRIPT_URL) || "";

/* ---------- Country defaults ---------- */
const COUNTRY_CONFIG = {
  Indonesia:  { capital: "Jakarta",       lat: -6.2088, lng: 106.8456, currency: "IDR", lang: "id" },
  Singapore:  { capital: "Singapore",     lat:  1.3521, lng: 103.8198, currency: "SGD", lang: "en" },
  Malaysia:   { capital: "Kuala Lumpur",  lat:  3.1390, lng: 101.6869, currency: "MYR", lang: "en" },
  Philippines:{ capital: "Manila",        lat: 14.5995, lng: 120.9842, currency: "PHP", lang: "en" },
};

const INDUSTRIES = ["Construction","Utilities","Government","Oil & Gas","Mining","Transport","Other"];
const STAGES = [
  { key:"qualified", label:"Qualified"},
  { key:"proposal", label:"Proposal"},
  { key:"negotiation", label:"Negotiation"},
  { key:"won", label:"Won"},
  { key:"lost", label:"Lost"},
];
const PROB_BY_STAGE = { qualified:35, proposal:55, negotiation:70, won:100, lost:0 };
const CURRENCIES = ["SGD","IDR","MYR","PHP","AUD","USD"];
const XGRIDS_SOLUTIONS = ["Xgrids L2 PRO","Xgrids K1","Xgrids PortalCam","Xgrids Drone Kit"];

/* ---------- Utilities ---------- */
function todayLocalISO(){
  const d=new Date(); const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function addDays(dateISO,days){
  const d=new Date(dateISO); d.setDate(d.getDate()+Number(days||0));
  const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function withinNext60Days(dateISO){
  if(!dateISO) return false;
  const t0=new Date(todayLocalISO()); const t1=new Date(dateISO);
  const d=(t1-t0)/(1000*60*60*24);
  return d>=0 && d<=60;
}
function daysUntil(dateISO){
  if(!dateISO) return 0;
  const t0=new Date(todayLocalISO()); const t1=new Date(dateISO);
  return Math.round((t1-t0)/(1000*60*60*24));
}

/* ---------- Small UI primitives ---------- */
const Label = (p)=><label className="text-sm font-medium text-slate-700" {...p} />;
const Input = (p)=><input className="border rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#0e3446]/30" {...p} />;
const Select = (p)=><select className="border rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#0e3446]/30" {...p} />;
const Textarea = (p)=><textarea className="border rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#0e3446]/30" {...p} />;
const Card = ({children})=><div className="bg-white rounded-2xl shadow-sm border p-5">{children}</div>;
const CardHeader = ({title, subtitle})=>(
  <div className="mb-4">
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
  </div>
);
const CardBody = ({children})=><div>{children}</div>;
const Btn = ({kind="primary", className="", ...props})=>{
  const base = "px-3 py-2 rounded-lg transition-colors";
  const map = {
    primary: `text-white ${BRAND.primaryBtn}`,
    subtle:  "bg-gray-100 hover:bg-gray-200",
    outline: BRAND.outlineBtn
  };
  return <button className={`${base} ${map[kind]||map.primary} ${className}`} {...props} />;
};
const Chip = ({tone="blue", children})=>{
  const toneMap = { blue:BRAND.chipBlue, green:BRAND.chipGreen, red:BRAND.chipRed, orange:BRAND.chipOrange };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${toneMap[tone]||BRAND.chipBlue}`}>{children}</span>;
};

/* ---------- Network ---------- */
async function callGAS(action, body) {
  if (!GAS_URL) return { ok:false, error:"GAS_URL missing" };
  const url = new URL(GAS_URL);
  url.searchParams.set("action", action);
  let res, text;
  try {
    if (body) {
      res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch(url.toString());
    }
    text = await res.text();
  } catch (e) {
    return { ok:false, error:"Failed to fetch: " + (e?.message || e) };
  }
  let json = null; try { json = JSON.parse(text); } catch {}
  if (!res.ok || (json && json.ok === false)) {
    return { ok:false, error: (json && json.error) || `HTTP ${res.status} ${res.statusText}: ${text.slice(0,200)}` };
  }
  return json || { ok:true };
}

/* ---------- Admin: FX drawer ---------- */
function AdminFxDrawer({ open, onClose, onSave, rates={} }) {
  const [local, setLocal] = useState(rates);
  useEffect(()=>{ setLocal(rates||{}); }, [rates, open]);
  if (!open) return null;
  const entries = Object.entries(local);
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-[min(640px,95vw)] p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">FX Rates to AUD</h3>
          <Btn kind="subtle" onClick={onClose}>Close</Btn>
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {entries.map(([ccy,val])=>(
            <div key={ccy} className="grid grid-cols-3 gap-2 items-center">
              <Input value={ccy} onChange={e=>{
                const n=e.target.value.toUpperCase();
                setLocal(prev=>{const {[ccy]:_,...rest}=prev; return {...rest, [n]:val};});
              }} />
              <Input type="number" step="0.000001" value={val} onChange={e=>{
                setLocal(prev=>({...prev, [ccy]: Number(e.target.value)}));
              }} />
              <button className="text-red-600 text-sm" onClick={()=>{
                setLocal(prev=>{const cp={...prev}; delete cp[ccy]; return cp;});
              }}>Remove</button>
            </div>
          ))}
          <Btn kind="subtle" onClick={()=> setLocal(prev=> ({...prev, USD: prev.USD || 0.67}))}>Add Row</Btn>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Btn kind="subtle" onClick={onClose}>Cancel</Btn>
          <Btn onClick={()=> onSave(local)}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------- Reseller Form ---------- */
function SubmissionForm({ onSave, onSyncOne, items, onLocaleChange }) {
  const [form, setForm] = useState(()=>{
    const cfg = COUNTRY_CONFIG["Singapore"];
    return {
      resellerCountry: "Singapore",
      resellerLocation: cfg.capital,
      resellerName: "", resellerContact:"", resellerEmail:"", resellerPhone:"",
      customerName:"", customerLocation:"", city:"", country:"",
      lat: cfg.lat, lng: cfg.lng,
      industry:"", currency: cfg.currency, value:"",
      solution:"", stage:"qualified", probability: PROB_BY_STAGE.qualified,
      expectedCloseDate: addDays(todayLocalISO(), 14),
      supports:[], competitors:[], notes:"",
      evidenceLinks:[],
      emailEvidence:true, confidential:false, remindersOptIn:false, accept:false,
    };
  });
  const [errors, setErrors] = useState({});
  const isID = form.resellerCountry === 'Indonesia';

  useEffect(()=>{
    const cfg = COUNTRY_CONFIG[form.resellerCountry];
    if (cfg) {
      setForm(f=>({
        ...f,
        resellerLocation: cfg.capital,
        currency: cfg.currency,
        lat: cfg.lat, lng: cfg.lng
      }));
      onLocaleChange && onLocaleChange(cfg.lang);
    }
  }, [form.resellerCountry]);

  useEffect(()=>{
    setForm(f=> ({...f, probability: PROB_BY_STAGE[f.stage] ?? f.probability }));
  }, [form.stage]);

  function handleChange(e){
    const {name, value, type, checked} = e.target;
    setForm(f=> ({...f, [name]: (type==='checkbox'? checked: value)}));
  }

  function validate() {
    const e = {};
    if (!form.resellerName) e.resellerName = "Required";
    if (!form.resellerContact) e.resellerContact = "Required";
    if (!form.resellerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail)) e.resellerEmail="Valid email required";
    if (!form.customerName) e.customerName="Required";
    if (!form.solution) e.solution="Required";
    if (!form.value || Number(form.value)<=0) e.value="Positive amount required";
    if (!form.expectedCloseDate || !withinNext60Days(form.expectedCloseDate)) e.expectedCloseDate="Within next 60 days";
    if (!form.accept) e.accept="Required";
    setErrors(e); return Object.keys(e).length===0;
  }

  async function submit(e){
    e.preventDefault();
    if(!validate()) return;

    const cfg = COUNTRY_CONFIG[form.resellerCountry];
    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      submittedAt: todayLocalISO(),
      resellerCountry: form.resellerCountry,
      resellerLocation: form.resellerLocation||cfg.capital,
      resellerName: form.resellerName,
      resellerContact: form.resellerContact,
      resellerEmail: form.resellerEmail,
      resellerPhone: form.resellerPhone,
      customerName: form.customerName,
      customerLocation: form.customerLocation || [form.city, form.country].filter(Boolean).join(', '),
      city: form.city || "",
      country: form.country || "",
      lat: Number(form.lat || cfg.lat),
      lng: Number(form.lng || cfg.lng),
      industry: form.industry || "",
      currency: form.currency || cfg.currency,
      value: Number(form.value || 0),
      solution: form.solution,
      stage: form.stage,
      probability: Number(form.probability || 0),
      expectedCloseDate: form.expectedCloseDate,
      status: "pending",
      lockExpiry: "",
      syncedAt: todayLocalISO(),
      confidential: !!form.confidential,
      remindersOptIn: !!form.remindersOptIn,
      supports: form.supports || [],
      competitors: form.competitors || [],
      notes: form.notes || "",
      evidenceLinks: form.evidenceLinks || [],
      updates: [],
    };

    onSave && onSave(record);
    if (onSyncOne) {
      const res = await onSyncOne(record);
      if (!res.ok) alert("Submitted locally. Google Sheets sync failed: " + (res.error||'unknown error'));
      else alert("Submitted and synced.");
    }
  }

  return (
    <Card>
      <CardHeader
        title="Register Upcoming Deal (within 60 days)"
        subtitle="Fields marked * are mandatory"
      />
      <CardBody>
        <form onSubmit={submit} className="grid gap-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Reseller Country *</Label>
              <Select name="resellerCountry" value={form.resellerCountry} onChange={handleChange}>
                <option>Indonesia</option>
                <option>Malaysia</option>
                <option>Philippines</option>
                <option>Singapore</option>
              </Select>
            </div>
            <div>
              <Label>{isID? 'Lokasi Reseller':'Reseller Location'} *</Label>
              <Input name="resellerLocation" value={form.resellerLocation} onChange={handleChange}/>
              {errors.resellerLocation && <p className="text-xs text-red-600">{errors.resellerLocation}</p>}
            </div>
            <div>
              <Label>{isID? 'Mata Uang':'Currency'}</Label>
              <Select name="currency" value={form.currency} onChange={handleChange}>
                {CURRENCIES.map(c=><option key={c}>{c}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>{isID? 'Perusahaan Reseller':'Reseller company'} *</Label>
              <Input name="resellerName" value={form.resellerName} onChange={handleChange}/>
              {errors.resellerName && <p className="text-xs text-red-600">{errors.resellerName}</p>}
            </div>
            <div>
              <Label>{isID? 'Kontak Utama':'Primary contact'} *</Label>
              <Input name="resellerContact" value={form.resellerContact} onChange={handleChange}/>
              {errors.resellerContact && <p className="text-xs text-red-600">{errors.resellerContact}</p>}
            </div>
            <div>
              <Label>Contact email *</Label>
              <Input name="resellerEmail" type="email" value={form.resellerEmail} onChange={handleChange}/>
              {errors.resellerEmail && <p className="text-xs text-red-600">{errors.resellerEmail}</p>}
            </div>
            <div>
              <Label>Contact phone</Label>
              <Input name="resellerPhone" value={form.resellerPhone} onChange={handleChange}/>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>{isID? 'Nama Pelanggan':'Customer name'} *</Label>
              <Input name="customerName" value={form.customerName} onChange={handleChange}/>
              {errors.customerName && <p className="text-xs text-red-600">{errors.customerName}</p>}
            </div>
            <div>
              <Label>{isID? 'Lokasi Reseller':'Reseller location'} *</Label>
              <Input name="resellerLocation" value={form.resellerLocation} onChange={handleChange}/>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>{isID? 'Kota Pelanggan':'Customer City'}</Label>
              <Input name="city" value={form.city} onChange={(e)=>{
                const v=e.target.value;
                setForm(f=>({...f, city:v, customerLocation: [v,f.country].filter(Boolean).join(', ')}))
              }}/>
            </div>
            <div>
              <Label>{isID? 'Negara Pelanggan':'Customer Country'}</Label>
              <Select name="country" value={form.country} onChange={(e)=>{
                const v=e.target.value;
                setForm(f=>({...f, country:v, customerLocation: [f.city,v].filter(Boolean).join(', ')}));
              }}>
                <option value="">Select country</option>
                <option>Indonesia</option>
                <option>Singapore</option>
                <option>Malaysia</option>
                <option>Philippines</option>
              </Select>
            </div>
            <div>
              <Label>{isID? 'Opsi peta (tempel lat,lng atau buka tautan)':'Map option (paste lat,lng or use link)'}</Label>
              <div className="flex gap-2">
                <Input placeholder="lat" value={form.lat} onChange={(e)=>setForm(f=>({...f, lat: Number(e.target.value) }))}/>
                <Input placeholder="lng" value={form.lng} onChange={(e)=>setForm(f=>({...f, lng: Number(e.target.value) }))}/>
                <a
                  className={`px-3 py-2 rounded-lg text-white text-sm ${BRAND.primaryBtn}`}
                  target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((form.city||"")+","+(form.country||""))}`}
                >Open Map</a>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label>Solution offered (Xgrids) *</Label>
              <div className="grid gap-2">
                <Select value={form.solution} onChange={(e)=>setForm(f=>({...f, solution:e.target.value}))}>
                  <option value="">Select an Xgrids solution</option>
                  {XGRIDS_SOLUTIONS.map(s=><option key={s}>{s}</option>)}
                </Select>
                <a className="text-sky-700 underline text-xs" href="https://www.aptella.com/asia/product-brands/xgrids-asia/" target="_blank" rel="noreferrer">Learn about Xgrids</a>
              </div>
              {errors.solution && <p className="text-xs text-red-600">{errors.solution}</p>}
            </div>
            <div>
              <Label>{isID? 'Perkiraan Tgl Selesai':'Expected close date'} *</Label>
              <Input type="date" name="expectedCloseDate" value={form.expectedCloseDate} onChange={handleChange}/>
              {errors.expectedCloseDate && <p className="text-xs text-red-600">{errors.expectedCloseDate}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>{isID? 'Industri':'Industry'}</Label>
              <Select name="industry" value={form.industry} onChange={handleChange}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(i=><option key={i}>{i}</option>)}
              </Select>
            </div>
            <div>
              <Label>{isID? 'Nilai transaksi':'Deal value'} *</Label>
              <Input name="value" type="number" step="0.01" value={form.value} onChange={handleChange}/>
              {errors.value && <p className="text-xs text-red-600">{errors.value}</p>}
            </div>
            <div>
              <Label>{isID? 'Tahap penjualan':'Sales stage'}</Label>
              <Select name="stage" value={form.stage} onChange={handleChange}>
                {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
              <div className="mt-2">
                <Label>Probability (%)</Label>
                <Input type="number" min="0" max="100" value={form.probability} onChange={(e)=>setForm(f=>({...f, probability:Number(e.target.value)}))}/>
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={4} name="notes" value={form.notes} onChange={handleChange}/>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" name="confidential" checked={form.confidential} onChange={handleChange}/>
              {isID? 'Rahasiakan nama pelanggan':'Mark customer name confidential'}
            </label>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" name="remindersOptIn" checked={form.remindersOptIn} onChange={handleChange}/>
              {isID? 'Kirim pengingat pembaruan':'Send me reminders for updates'}
            </label>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" name="accept" checked={form.accept} onChange={handleChange}/>
              {isID? 'Saya setuju dan akurat':'I confirm details are accurate and consent to data storage'}
            </label>
          </div>
          {errors.accept && <p className="text-xs text-red-600 -mt-2">{errors.accept}</p>}

          <div className="flex items-center gap-3">
            <Btn type="submit">{
              isID? 'Kirim Pendaftaran':'Submit Registration'
            }</Btn>
            <Btn kind="subtle" type="button" onClick={()=>window.location.reload()}>Reset</Btn>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/* ---------- Admin Panel ---------- */
function statusTone(s, due) {
  if (s === 'approved') return 'green';
  if (s === 'lost' || s === 'closed') return 'red';
  if (due <= 7 && due >= 0) return 'orange'; // approaching lock
  return 'blue'; // pending
}
function statusColorHex(s, due) {
  const t = statusTone(s,due);
  return t==='green' ? '#16a34a' : t==='red' ? '#dc2626' : t==='orange' ? '#f59e0b' : '#2563eb';
}
function convertToAUD(value, currency, fx){
  if (!value) return 0;
  if (!currency || currency === 'AUD') return Number(value);
  const rate = (fx && typeof fx[currency] === 'number') ? fx[currency] : null;
  if (!rate) return Number(value); // fallback if unknown
  return Number(value) * Number(rate);
}

function AdminPanel({ items, setItems, fx, setFx }) {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('All');
  const [fxOpen, setFxOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  const filtered = useMemo(()=>{
    const q = search.trim().toLowerCase();
    return items.filter(r => {
      if (country !== 'All' && r.country !== country && r.resellerCountry !== country) return false;
      if (!q) return true;
      return [r.customerName, r.resellerName, r.solution, r.city, r.country].some(s => (s||'').toLowerCase().includes(q));
    });
  }, [items, search, country]);

  const totals = useMemo(()=>{
    const total = filtered.length;
    const pending = filtered.filter(r => !r.status || r.status==='pending').length;
    const approved = filtered.filter(r => r.status==='approved').length;
    const totalValueAud = filtered.reduce((sum, r)=> sum + convertToAUD(r.value, r.currency, fx), 0);
    return { total, pending, approved, totalValueAud };
  }, [filtered, fx]);

  async function refresh() {
    setLoading(true);
    const res = await callGAS('list');
    setLoading(false);
    if (!res.ok) { alert("Refresh failed: " + res.error); return; }
    setItems(res.rows || []);
    setFx(res.fx || {});
  }

  async function updateStatus(id, status) {
    const res = await callGAS('status', { id, status });
    if (!res.ok) { alert("Update failed: " + res.error); return; }
    setItems(prev => prev.map(r => r.id === id ? res.row : r));
  }

  function exportCSV(rows){
    const cols = [
      'id','submittedAt','resellerCountry','resellerLocation','resellerName','resellerContact','resellerEmail','resellerPhone',
      'customerName','customerLocation','city','country','lat','lng','industry','currency','value','solution',
      'stage','probability','expectedCloseDate','status','lockExpiry','syncedAt','confidential','remindersOptIn',
      'supports','competitors','notes','evidenceLinks','updates'
    ];
    const head = cols.join(',');
    const body = (rows||[]).map(x => cols.map(k => {
      const raw = x[k];
      const val = String(raw == null ? '' : (Array.isArray(raw) ? JSON.stringify(raw) : raw))
        .replace(/\n/g,' ')
        .replace(/"/g,'""');
      return `"${val}"`;
    }).join(',')).join('\n');
    const blob = new Blob([head+'\n'+body], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `registrations-${todayLocalISO()}.csv`;
    a.click();
  }

  // Leaflet map (UMD globals) + z-index friendliness
  useEffect(()=>{
    const L = (typeof window !== 'undefined') && window.L;
    if (!L) return;

    if (!mapRef.current) {
      const el = document.getElementById('adminMap');
      if (!el) return;
      const m = L.map(el).setView([1.3521,103.8198], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(m);
      mapRef.current = m;
    }
    // clear layer
    if (layerRef.current) {
      mapRef.current.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const Lc = window.L && window.L.markerClusterGroup ? window.L.markerClusterGroup() : null;
    const layer = Lc || window.L.layerGroup();
    const markers = [];

    filtered.forEach(r=>{
      const lat = Number(r.lat||0), lng = Number(r.lng||0);
      if (!lat && !lng) return;
      const due = daysUntil(r.expectedCloseDate);
      const color = statusColorHex(r.status, due);
      const circle = window.L.circleMarker([lat,lng], {
        radius: 8, color, weight: 2, fillOpacity: 0.7
      });
      const html = `
        <div style="min-width:220px">
          <div><strong>${(r.customerName||'').replace(/</g,'&lt;')}</strong></div>
          <div>${(r.city||'')}, ${(r.country||'')}</div>
          <div>${(r.solution||'')}</div>
          <div><small>${(r.status||'pending')} • Close: ${(r.expectedCloseDate||'')}</small></div>
        </div>`;
      circle.bindPopup(html);
      circle.addTo(layer);
      markers.push(circle);
    });

    layer.addTo(mapRef.current);
    layerRef.current = layer;
    if (markers.length) {
      const g = window.L.featureGroup(markers);
      mapRef.current.fitBounds(g.getBounds().pad(0.2));
    }
  }, [filtered]);

  return (
    <>
      {/* Stat band */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card><div className="flex items-center justify-between"><div>
          <div className="text-xs text-slate-500">Total registrations</div>
          <div className="text-2xl font-semibold">{totals.total}</div>
        </div><Chip tone="blue">All</Chip></div></Card>
        <Card><div className="flex items-center justify-between"><div>
          <div className="text-xs text-slate-500">Pending review</div>
          <div className="text-2xl font-semibold">{totals.pending}</div>
        </div><Chip tone="blue">Pending</Chip></div></Card>
        <Card><div className="flex items-center justify-between"><div>
          <div className="text-xs text-slate-500">Approved / locked</div>
          <div className="text-2xl font-semibold">{totals.approved}</div>
        </div><Chip tone="green">Approved</Chip></div></Card>
        <Card><div className="flex items-center justify-between"><div>
          <div className="text-xs text-slate-500">Total value (AUD)</div>
          <div className="text-2xl font-semibold">A$ {Math.round(totals.totalValueAud).toLocaleString()}</div>
        </div><Chip tone="orange">AUD</Chip></div></Card>
      </div>

      {/* Sticky tools */}
      <div className="sticky top-2 z-[900] bg-white/90 backdrop-blur rounded-xl border p-3 mb-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
            <Select value={country} onChange={e=>setCountry(e.target.value)}>
              <option>All</option>
              <option>Indonesia</option><option>Malaysia</option><option>Philippines</option><option>Singapore</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Btn onClick={refresh}>{loading? "Refreshing…" : "Refresh"}</Btn>
            <Btn kind="subtle" onClick={()=>exportCSV(filtered)}>Export CSV</Btn>
            <Btn kind="outline" onClick={()=>setFxOpen(true)}>FX Settings</Btn>
          </div>
        </div>
      </div>

      {/* Map + legend */}
      <div className="rounded-2xl border overflow-hidden shadow-sm mb-3 relative">
        <div id="adminMap" style={{height:'440px'}} className="leaflet-host"></div>
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur rounded-xl border shadow-sm px-3 py-2 text-xs flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{background:'#16a34a'}}></span> Approved
          <span className="inline-block w-3 h-3 rounded-full" style={{background:'#dc2626'}}></span> Closed/Lost
          <span className="inline-block w-3 h-3 rounded-full" style={{background:'#f59e0b'}}></span> Approaching 60d
          <span className="inline-block w-3 h-3 rounded-full" style={{background:'#2563eb'}}></span> Pending
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-2xl border shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 text-slate-700">
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
            {filtered.map(r=>{
              const due = daysUntil(r.expectedCloseDate);
              const tone = statusTone(r.status, due);
              return (
                <tr key={r.id} className="border-t hover:bg-slate-50/50">
                  <td className="p-3">{r.submittedAt}</td>
                  <td className="p-3">{r.customerName}</td>
                  <td className="p-3">{[r.city,r.country].filter(Boolean).join(', ')}</td>
                  <td className="p-3">{r.solution}</td>
                  <td className="p-3">{r.currency} {Number(r.value||0).toLocaleString()}</td>
                  <td className="p-3">{r.stage}</td>
                  <td className="p-3">
                    <Chip tone={tone}>{r.status || 'pending'}</Chip>
                  </td>
                  <td className="p-3 space-x-2">
                    <Btn className="!px-2.5 !py-1.5" onClick={()=>updateStatus(r.id,'approved')}>Approve</Btn>
                    <Btn kind="subtle" className="!px-2.5 !py-1.5" onClick={()=>updateStatus(r.id,'closed')}>Close</Btn>
                  </td>
                </tr>
              );
            })}
            {filtered.length===0 && (
              <tr><td className="p-5 text-slate-500" colSpan={8}>No rows</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminFxDrawer
        open={fxOpen}
        onClose={()=>setFxOpen(false)}
        rates={fx}
        onSave={async (newFx)=>{
          const res = await callGAS('fx',{ fx:newFx });
          if (!res.ok) { alert("FX save failed: " + res.error); return; }
          setFx(res.fx || {});
          setFxOpen(false);
        }}
      />
      {/* Make sure drawer always wins over Leaflet panes */}
      <style>{`.leaflet-container{z-index:1}`}</style>
    </>
  );
}

/* ---------- Root ---------- */
function AptellaRoot(){
  const [tab, setTab] = useState('reseller');
  const [items, setItems] = useState([]);
  const [fx, setFx] = useState({});
  const [lang, setLang] = useState('en');
  const [adminAuthed, setAdminAuthed] = useState(()=> localStorage.getItem('aptella_admin')==='1');

  useEffect(()=>{ (async ()=>{
    const init = await callGAS('init'); if (!init.ok) console.warn(init.error);
  })(); }, []);

  async function syncOne(row){
    const res = await callGAS('submit', row);
    return res.ok ? { ok:true } : { ok:false, error:res.error };
  }

  return (
    <div>
      {/* Global brand styles (optionally pair with Inter font in index.html) */}
      <style>{`
        :root{ --aptella-navy:#0e3446; --aptella-orange:#f0a03a; }
        body{ background:#f7fafc; color:#0f172a; }
        .brand-nav{ background:linear-gradient(180deg,#ffffff 0%, #f8fafc 100%); border-bottom:1px solid #e5e7eb; }
      `}</style>

      <header className="brand-nav">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Aptella" width="130" height="28" onError={(e)=>{e.currentTarget.style.display='none';}} />
            <span className="text-sm text-slate-600">Master Distributor • Xgrids</span>
          </div>
          <nav className="flex items-center gap-2">
            <Btn kind={tab==='reseller' ? 'primary':'subtle'} onClick={()=>setTab('reseller')}>Reseller</Btn>
            <Btn kind={tab==='admin' ? 'primary':'subtle'} onClick={()=>setTab('admin')}>Admin</Btn>
            {adminAuthed ? (
              <Btn kind="subtle" onClick={()=>{ localStorage.removeItem('aptella_admin'); setAdminAuthed(false); }}>Logout</Btn>
            ) : (
              <Btn kind="outline" onClick={()=>{
                const pw = prompt("Admin password:");
                if (pw === "Aptella2025!") { localStorage.setItem('aptella_admin','1'); setAdminAuthed(true); }
                else alert("Incorrect password.");
              }}>Admin Login</Btn>
            )}
          </nav>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <div className="rounded-2xl border bg-white p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Aptella Reseller Deal Registration</div>
              <div className="text-xl font-semibold text-slate-900">Register opportunities within the next 60 days</div>
            </div>
            <a href="https://www.aptella.com/asia/product-brands/xgrids-asia/" target="_blank" rel="noreferrer"
               className={`hidden sm:inline-block px-3 py-2 rounded-lg text-white ${BRAND.primaryBtn}`}>
              Learn about Xgrids
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab==='reseller' ? (
          <SubmissionForm
            items={items}
            onSave={(rec)=> setItems(prev => [rec, ...prev])}
            onSyncOne={syncOne}
            onLocaleChange={setLang}
          />
        ) : (
          adminAuthed ? (
            <AdminPanel
              items={items}
              setItems={setItems}
              fx={fx}
              setFx={setFx}
            />
          ) : (
            <Card><CardBody><p className="text-slate-600">Please log in to view Admin.</p></CardBody></Card>
          )
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 pb-8 text-xs text-slate-500">
        © {new Date().getFullYear()} Aptella — Xgrids Master Distributor
      </footer>
    </div>
  );
}

export default AptellaRoot;
