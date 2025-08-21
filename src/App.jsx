import React, { useEffect, useMemo, useState, useRef } from "react";

// --- Portal utilities & constants (idempotent; define only if missing) ---
(() => {
  const G = (typeof window !== 'undefined' ? window : globalThis);
  G.todayLocalISO ??= function todayLocalISO(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  };
  G.addDays ??= function addDays(dateISO, days){
    const d = new Date(dateISO);
    d.setDate(d.getDate() + Number(days || 0));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  };
  G.withinNext60Days ??= function withinNext60Days(dateISO){
    if (!dateISO) return false;
    const today = new Date(G.todayLocalISO());
    const target = new Date(dateISO);
    const diffDays = (target - today) / (1000*60*60*24);
    return diffDays >= 0 && diffDays <= 60;
  };
  G.daysUntil ??= function daysUntil(dateISO){
    if (!dateISO) return 0;
    const today = new Date(G.todayLocalISO());
    const target = new Date(dateISO);
    return Math.round((target - today) / (1000*60*60*24));
  };
  G.uid ??= function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); };
  G.countryFromLocation ??= function countryFromLocation(loc){
    if (!loc) return '';
    const parts = String(loc).split(',').map(s => s.trim());
    return parts[parts.length - 1] || '';
  };

  // Defaults centered on Jakarta, ID
  G.DEFAULT_LAT ??= -6.2088;
  G.DEFAULT_LNG ??= 106.8456;

  G.CURRENCIES ??= ['SGD','IDR','MYR','PHP','AUD','USD'];
  G.STAGES ??= [
    { key: 'qualified', label: 'Qualified' },
    { key: 'proposal', label: 'Proposal' },
    { key: 'negotiation', label: 'Negotiation' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
  ];
  G.PROB_BY_STAGE ??= { qualified: 35, proposal: 55, negotiation: 70, won: 100, lost: 0 };
  G.SUPPORT_OPTIONS ??= [
    'Pre-sales engineer',
    'Demo / loan unit',
    'Pricing exception',
    'Marketing materials',
    'Partner training',
    'On-site customer visit',
    'Extended lock request',
  ];
  // Xgrids list (pruned as requested)
  G.XGRIDS_SOLUTIONS ??= [
    'Xgrids L2 PRO',
    'Xgrids K1',
    'Xgrids PortalCam',
    'Xgrids Drone Kit',
  ];
  G.APTELLA_EVIDENCE_EMAIL ??= 'evidence@aptella.com';
})();

// Create module-scope aliases for globals so ESM code can reference them safely
const __G = (typeof window !== 'undefined' ? window : globalThis);
const addDays = __G.addDays;
const todayLocalISO = __G.todayLocalISO;
const withinNext60Days = __G.withinNext60Days;
const daysUntil = __G.daysUntil;
const uid = __G.uid;
const countryFromLocation = __G.countryFromLocation;
const DEFAULT_LAT = __G.DEFAULT_LAT;
const DEFAULT_LNG = __G.DEFAULT_LNG;
const CURRENCIES = __G.CURRENCIES;
const STAGES = __G.STAGES;
const PROB_BY_STAGE = __G.PROB_BY_STAGE;
const SUPPORT_OPTIONS = __G.SUPPORT_OPTIONS;
const XGRIDS_SOLUTIONS = __G.XGRIDS_SOLUTIONS;
const APTELLA_EVIDENCE_EMAIL = __G.APTELLA_EVIDENCE_EMAIL;
// Google Apps Script endpoint (Sheets sync, list, FX)
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";

// --- Lightweight UI primitives & config shims (so the app always renders) ---
const ADMIN_PASSWORD = (typeof window !== 'undefined' && window.APTELLA_ADMIN_PASSWORD) || 'Aptella2025!';
const LOGO_SRC = (typeof window !== 'undefined' && window.APTELLA_LOGO_URL) || ((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? (import.meta.env.BASE_URL + 'aptella-logo.png') : 'aptella-logo.png');

const BRAND = {
  navy: '#0e3446',
  navyDark: '#0b2938',
  orange: '#f0a03a',
  bg: 'bg-[#f7fafc]',
  primaryBtn: 'bg-[#0e3446] hover:bg-[#0b2938]',
  text: 'text-[#0e3446]',
  border: 'border-slate-200'
};

const COUNTRY_CONFIG = {
  Indonesia:  { currency: 'IDR', capital: 'Jakarta' },
  Malaysia:   { currency: 'MYR', capital: 'Kuala Lumpur' },
  Philippines:{ currency: 'PHP', capital: 'Manila' },
  Singapore:  { currency: 'SGD', capital: 'Singapore' }
};

const INDUSTRIES = [
  'Construction','Oil & Gas','Utilities','Telecom','Transport',
  'Mining','Government','Education','Manufacturing','Other'
];

function Label({ htmlFor, required, children }){
  return (<label htmlFor={htmlFor} className="text-sm font-medium">{children}{required && <span className="text-red-600"> *</span>}</label>);
}
function Input(props){
  const { className='', ...rest } = props;
  return <input className={`border rounded-lg px-3 py-2 text-sm w-full ${className}`} {...rest} />;
}
function Select(props){
  const { className='', children, ...rest } = props;
  return <select className={`border rounded-lg px-3 py-2 text-sm w-full ${className}`} {...rest}>{children}</select>;
}
function Textarea(props){
  const { className='', ...rest } = props;
  return <textarea className={`border rounded-lg px-3 py-2 text-sm w-full ${className}`} {...rest} />;
}
function Card({ children }){
  return <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">{children}</div>;
}
function CardHeader({ title, subtitle, right }){
  return (
    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
      <div>
        <div className="font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
function CardBody({ children }){
  return <div className="p-4">{children}</div>;
}

// Minimal AdminPanel so Admin tab never crashes
function AdminPanel({
  items = [],
  rawItems = [],
  setItems = () => {},
  currencyFilter = 'All',
  setCurrencyFilter = () => {},
  search = '',
  setSearch = () => {},
  onSyncMany,
  onSyncOne,
}) {
  // ---------- Local state
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingFx, setSavingFx] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [ratesAUD, setRatesAUD] = useState({ AUD:1, SGD:1.07, MYR:0.33, PHP:0.027, IDR:0.000095 });

  // ---------- Helpers
  const toCurrency = (n) => {
    const v = Number(n || 0);
    if (!Number.isFinite(v)) return '';
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v);
  };
  const exportCSV = (rows) => {
  const cols = [
    'submittedAt','resellerName','resellerContact','resellerEmail','customerName',
    'country','city','customerLocation','solution','currency','value','stage','status','expectedCloseDate','lockExpiry'
  ];
  const head = cols.join(',');
  const body = (rows||[]).map(x => cols.map(k => {
    const val = String(x[k] ?? '').replace(/\n/g, ' ').replace(/"/g,'""');
    return `"${val}"`;
  }).join(',')).join('\n');
  const blob = new Blob([head+'\n'+body], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aptella-registrations-${todayLocalISO()}.csv`;
  a.click();
};

  // ---------- Apps Script integration
  const hasGAS = (typeof GOOGLE_APPS_SCRIPT_URL !== 'undefined' && GOOGLE_APPS_SCRIPT_URL);
  const pullAll = async () => {
    if (!hasGAS) { setAdminError('Apps Script URL not configured'); return; }
    try {
      setAdminError('');
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=list`, { cache: 'no-cache' });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'List failed');
      if (Array.isArray(json.data)) setItems(json.data);
      if (json.meta?.ratesAUD) setRatesAUD(json.meta.ratesAUD);
    } catch (e) {
      setAdminError(String(e?.message || e));
    }
  };
  const saveFxRates = async (newRates) => {
    if (!hasGAS) { setRatesAUD(newRates); setSettingsOpen(false); return; }
    try {
      setSavingFx(true); setAdminError('');
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=fx`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratesAUD: newRates })
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'FX save failed');
      setRatesAUD(newRates);
      setSettingsOpen(false);
      await pullAll();
    } catch (e) {
      setAdminError(String(e?.message || e));
    } finally { setSavingFx(false); }
  };

  // ---------- Filtering
  const countries = useMemo(() => {
    const set = new Set();
    (rawItems || items || []).forEach(r => r?.country && set.add(r.country));
    return Array.from(set).sort();
  }, [rawItems, items]);

  const parentFiltered = useMemo(() => (items || []).filter(x => {
    const okCur = !currencyFilter || currencyFilter === 'All' || String(x.currency||'').toLowerCase() === String(currencyFilter).toLowerCase();
    const okSearch = !search || JSON.stringify(x).toLowerCase().includes(search.toLowerCase());
    return okCur && okSearch;
  }), [items, currencyFilter, search]);

  const visible = useMemo(() => parentFiltered.filter(x => {
    const okStage = stageFilter === 'all' || x.stage === stageFilter;
    const okStatus = statusFilter === 'all' || x.status === statusFilter;
    const okCountry = countryFilter === 'all' || x.country === countryFilter;
    return okStage && okStatus && okCountry;
  }), [parentFiltered, stageFilter, statusFilter, countryFilter]);

  const rowTone = (x) => {
    const approaching = x.status === 'approved' && daysUntil(x.lockExpiry) <= 7 && daysUntil(x.lockExpiry) >= 0;
    if (approaching) return 'orange';
    if (x.status === 'approved') return 'green';
    if (x.status === 'rejected' || x.stage === 'lost') return 'red';
    if (x.status === 'pending') return 'blue';
    return 'gray';
  };
  const toneToRow = { green: 'bg-green-50', red: 'bg-red-50', blue: 'bg-blue-50', orange: 'bg-orange-50', gray: '' };

  // ---------- Map (Leaflet CDN, no module imports)
  function useLeaflet() {
    const [ready, setReady] = useState(!!(window && window.L));
    useEffect(() => {
      if (ready) return;
      const head = document.head;
      const hasCSS = !!document.querySelector('link[data-leaflet]');
      if (!hasCSS) {
        const link = document.createElement('link');
        link.setAttribute('data-leaflet','1');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        head.appendChild(link);
      }
      const hasJS = !!document.querySelector('script[data-leaflet]');
      if (!hasJS) {
        const script = document.createElement('script');
        script.setAttribute('data-leaflet','1');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => setReady(true);
        script.onerror = () => setReady(false);
        head.appendChild(script);
      } else {
        setReady(!!window.L);
      }
    }, [ready]);
    return ready && window.L ? window.L : null;
  }

  function AdminGeoMap({ rows, ratesAUD }){
    const L = useLeaflet();
    const mapRef = React.useRef(null);
    const mapObj = React.useRef(null);
    const layerRef = React.useRef(null);

    useEffect(() => {
      if (!L) return; // not ready yet
      if (!mapObj.current && mapRef.current) {
        const m = L.map(mapRef.current).setView([DEFAULT_LAT, DEFAULT_LNG], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(m);
        mapObj.current = m;
        layerRef.current = L.layerGroup().addTo(m);
      }
    }, [L]);

    useEffect(() => {
      if (!L || !mapObj.current || !layerRef.current) return;
      const g = layerRef.current;
      g.clearLayers();
      const rowsWithGeo = (rows || []).filter(r => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng)));
      rowsWithGeo.forEach(r => {
        const lat = Number(r.lat), lng = Number(r.lng);
        let aud = Number(r.value || 0);
        const fx = ratesAUD[String(r.currency||'').toUpperCase()];
        if (Number.isFinite(fx)) aud = aud * fx; // values to AUD
        const tone = rowTone(r);
        const color = tone==='green'? '#16a34a' : tone==='red'? '#dc2626' : tone==='blue'? '#2563eb' : tone==='orange'? '#f59e0b' : '#6b7280';
        const marker = L.circleMarker([lat, lng], { radius: Math.max(5, Math.log10(1+aud) * 2.5), color, weight: 2, fillOpacity: 0.25 }).addTo(g);
        const html = `<div style="font-weight:600">${r.customerName || '(Confidential)'}</div>
          <div>${r.city||''}${r.country?`, ${r.country}`:''} · ${r.solution||''}</div>
          <div>${r.currency||''} ${toCurrency(r.value)} · Status: ${r.status||'pending'}</div>`;
        marker.bindPopup(html);
      });
    }, [L, rows, ratesAUD]);

    return <div ref={mapRef} style={{height:'380px'}} className="rounded-xl border mt-2" />;
  }

  return (
    <Card>
      <CardHeader
        title="Admin – Registrations"
        right={
          <div className="flex items-center gap-2">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={currencyFilter} onChange={e=>setCurrencyFilter(e.target.value)}>
              <option value="All">All</option>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={()=>exportCSV(visible)} className={`px-3 py-2 rounded-xl text-white text-sm ${BRAND.primaryBtn}`}>Export CSV</button>
            <button onClick={()=>onSyncMany && onSyncMany(visible)} className={`px-3 py-2 rounded-xl text-white text-sm ${BRAND.primaryBtn}`}>Sync Visible</button>
            <button onClick={()=>setSettingsOpen(true)} className="px-3 py-2 rounded-xl bg-gray-100 text-sm">Settings</button>
            <button onClick={pullAll} className={`px-3 py-2 rounded-xl text-white text-sm ${BRAND.primaryBtn}`}>Refresh from Sheets</button>
          </div>
        }
      />
      <CardBody>
        {adminError && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{adminError}</div>}

        <div className="grid md:grid-cols-4 gap-3 mb-3">
          <div className="grid gap-1">
            <Label>Stage</Label>
            <Select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}>
              <option value="all">All</option>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Status</Label>
            <Select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Country</Label>
            <Select value={countryFilter} onChange={e=>setCountryFilter(e.target.value)}>
              <option value="all">All</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Currency</Label>
            <Select value={currencyFilter} onChange={e=>setCurrencyFilter(e.target.value)}>
              <option value="All">All</option>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </div>

        <h3 className="text-lg font-semibold">Opportunities Map</h3>
        <AdminGeoMap rows={visible} ratesAUD={ratesAUD} />

        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-3 text-left">Submitted</th>
                <th className="p-3 text-left">Reseller</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Country</th>
                <th className="p-3 text-left">Solution</th>
                <th className="p-3 text-left">Value</th>
                <th className="p-3 text-left">Stage</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(x => (
                <tr key={x.id || Math.random()} className={`border-b ${toneToRow[rowTone(x)]}`}>
                  <td className="p-3 whitespace-nowrap">{x.submittedAt || '-'}</td>
                  <td className="p-3">
                    <div className="font-medium">{x.resellerName || '-'}</div>
                    <div className="text-xs text-gray-500">{x.resellerContact || ''} · {x.resellerEmail || ''}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{x.confidential ? '(Confidential)' : (x.customerName || '-')}</div>
                    <div className="text-xs text-gray-500">{x.customerLocation || ''}</div>
                  </td>
                  <td className="p-3">{x.country || '-'}</td>
                  <td className="p-3">{x.solution || '-'}</td>
                  <td className="p-3 whitespace-nowrap">{x.currency || ''} {toCurrency(x.value)}</td>
                  <td className="p-3">{(STAGES.find(s=>s.key===x.stage)||{}).label || x.stage || '-'}</td>
                  <td className="p-3">
                    {x.status === 'pending' && <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">Pending</span>}
                    {x.status === 'approved' && <span className="px-2 py-1 rounded bg-green-100 text-green-800">Approved</span>}
                    {x.status === 'rejected' && <span className="px-2 py-1 rounded bg-red-100 text-red-800">Rejected</span>}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-gray-500">No registrations match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminSettings open={settingsOpen} onClose={()=>setSettingsOpen(false)} ratesAUD={ratesAUD} onSave={saveFxRates} saving={savingFx} />
      </CardBody>
    </Card>
  );
}

// --- Admin → Settings drawer for FX rates (definition ensured) --- (definition ensured) ---
function AdminSettings({ open, onClose, ratesAUD = {}, onSave, saving }) {
  const [local, setLocal] = React.useState(ratesAUD || {});
  React.useEffect(() => { setLocal(ratesAUD || {}); }, [ratesAUD, open]);
  if (!open) return null;
  const entries = Object.entries(local);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-[min(680px,95vw)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">FX Rates to AUD</h3>
          <button onClick={onClose} className="px-2 py-1 rounded-lg bg-gray-100">Close</button>
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          <div className="grid grid-cols-3 gap-2 text-sm font-medium">
            <div>Currency</div><div>Rate to AUD</div><div></div>
          </div>
          {entries.map(([cur,val]) => (
            <div key={cur} className="grid grid-cols-3 gap-2 items-center">
              <input className="border rounded-md px-2 py-1 uppercase" value={cur}
                onChange={(e)=>{
                  const newCur = e.target.value.toUpperCase();
                  setLocal(prev=>{ const {[cur]:_, ...rest}=prev; return {...rest, [newCur]: val}; });
                }} />
              <input className="border rounded-md px-2 py-1" type="number" step="0.000001" value={val}
                onChange={(e)=> setLocal(prev=> ({ ...prev, [cur]: Number(e.target.value) }))} />
              <button className="text-red-600 text-sm" onClick={()=> setLocal(prev=>{ const cp={...prev}; delete cp[cur]; return cp; })}>Remove</button>
            </div>
          ))}
          <button className="text-sm px-3 py-1 rounded-md bg-gray-100" onClick={()=> setLocal(prev=> ({ ...prev, USD: prev.USD || 0.67 }))}>Add Row</button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100">Cancel</button>
          <button disabled={saving} onClick={()=> onSave(local)} className={`px-3 py-1.5 rounded-lg text-white ${BRAND?.primaryBtn || 'bg-slate-800'}`}>{saving? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function SubmissionForm({ onSave, items, onSyncOne, onLocaleChange }) {
  const [form, setForm] = useState({
    resellerCountry: "Singapore",
    resellerLocation: "Singapore",
    resellerName: "",
    resellerContact: "",
    resellerEmail: "",
    resellerPhone: "",
    customerName: "",
    customerLocation: "",
    city: "",
    country: "",
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    industry: "",
    currency: "SGD",
    value: "",
    solution: "",
    stage: "qualified",
    probability: PROB_BY_STAGE["qualified"],
    expectedCloseDate: addDays(todayLocalISO(), 14),
    supports: [],
    competitors: [],
    notes: "",
    evidenceLinks: [],
    evidenceFiles: [],
    emailEvidence: true,
    confidential: false,
    remindersOptIn: false,
    accept: false,
  });
  const [errors, setErrors] = useState({});
  const isID = form.resellerCountry === 'Indonesia';
  const SUPPORT_OPTIONS_ID = {
    'Pre-sales engineer': 'Insinyur pra-penjualan',
    'Demo / loan unit': 'Unit demo / pinjaman',
    'Pricing exception': 'Pengecualian harga',
    'Marketing materials': 'Materi pemasaran',
    'Partner training': 'Pelatihan mitra',
    'On-site customer visit': 'Kunjungan ke lokasi pelanggan',
    'Extended lock request': 'Permintaan perpanjangan lock'
  };
  const [dupWarning, setDupWarning] = useState("");

  useEffect(() => { setForm((f) => ({ ...f, probability: PROB_BY_STAGE[f.stage] ?? f.probability })); }, [form.stage]);
  useEffect(() => { if (typeof onLocaleChange === 'function') onLocaleChange(form.resellerCountry === 'Indonesia' ? 'id' : 'en'); }, [form.resellerCountry, onLocaleChange]);
  useEffect(() => { const cfg = COUNTRY_CONFIG[form.resellerCountry]; if (cfg) setForm(f=>({ ...f, currency: cfg.currency, resellerLocation: cfg.capital })); }, [form.resellerCountry]);

  function handleChange(e) { const { name, value, type, checked } = e.target; setForm({ ...form, [name]: type === 'checkbox' ? checked : value }); }
  function handleMultiToggle(listName, option) { setForm((f) => { const set = new Set(f[listName]); if (set.has(option)) set.delete(option); else set.add(option); return { ...f, [listName]: Array.from(set) }; }); }
  function handleFiles(e) { const files = Array.from(e.target.files || []); setForm((f)=> ({ ...f, evidenceFiles: files })); }
  function addEvidenceLink() { const link = prompt("Paste a link to your evidence (e.g., shared email, quote, drive/photo)"); if (!link) return; try { new URL(link); } catch { alert("Please enter a valid URL"); return; } setForm((f)=> ({ ...f, evidenceLinks: [...f.evidenceLinks, link] })); }

  useEffect(() => {
    if (!form.customerName || !form.solution || !form.expectedCloseDate) { setDupWarning(""); return; }
    const target = new Date(form.expectedCloseDate); const min = new Date(target); min.setDate(min.getDate() - 14); const max = new Date(target); max.setDate(max.getDate() + 14);
    const hit = items.find(x => (
      x.customerName.trim().toLowerCase() === form.customerName.trim().toLowerCase() &&
      x.solution.trim().toLowerCase() === form.solution.trim().toLowerCase() &&
      new Date(x.expectedCloseDate) >= min && new Date(x.expectedCloseDate) <= max
    ));
    setDupWarning(hit ? `Potential duplicate detected with submission ${hit.id} (${hit.customerName}, ${hit.expectedCloseDate}).` : "");
  }, [form.customerName, form.solution, form.expectedCloseDate, items]);

  function validate() {
    const e = {};
    if (!form.resellerName) e.resellerName = "Required";
    if (!form.resellerContact) e.resellerContact = "Required";
    if (!form.resellerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail)) e.resellerEmail = "Valid email required";
    if (!form.customerName) e.customerName = "Required";
    if (!form.customerLocation) e.customerLocation = "Required";
    if (!form.city) e.city = "City required";
    if (!form.country) e.country = "Country required";
    if (!form.solution) e.solution = "Required";
    if (!form.value || Number(form.value) <= 0) e.value = "Enter a positive amount";
    if (!form.expectedCloseDate || !withinNext60Days(form.expectedCloseDate)) e.expectedCloseDate = "Must be within the next 60 days";
    const hasEvidence = (form.evidenceFiles && form.evidenceFiles.length > 0);
    if (!hasEvidence) e.evidence = "Evidence (file or link) is required";
    if (!form.accept) e.accept = "You must accept the terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function reset() {
    setForm({
      resellerName: "",
      resellerContact: "",
      resellerEmail: "",
      resellerPhone: "",
      customerName: "",
      customerLocation: "",
      industry: "",
      currency: "SGD",
      value: "",
      solution: "",
      stage: "qualified",
      probability: PROB_BY_STAGE["qualified"],
      expectedCloseDate: addDays(todayLocalISO(), 14),
      supports: [],
      competitors: [],
      notes: "",
      evidenceLinks: [],
      evidenceFiles: [],
      emailEvidence: true,
      confidential: false,
      accept: false,
    });
    setErrors({}); setDupWarning(""); const el = document.getElementById("evidenceFiles"); if (el) el.value = "";
  }

  function filesToBase64(files){
    const MAX_TOTAL = 20 * 1024 * 1024; // 20MB safety
    let total = 0;
    const readers = (files||[]).map(f => new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const res = String(fr.result||'');
        const base64 = res.split(',')[1] || '';
        total += base64.length * 0.75; // rough bytes
        resolve({ name:f.name, type:f.type||'application/octet-stream', data: base64 });
      };
      fr.onerror = reject;
      fr.readAsDataURL(f);
    }));
    return Promise.all(readers).then(arr => { if(total>MAX_TOTAL) throw new Error('Attachments exceed 20MB total.'); return arr; });
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    const baseRecord = {
      id: uid(), submittedAt: todayLocalISO(), status: "pending", lockExpiry: null, syncedAt: null,
      ...form, value: Number(form.value), country: form.country,
    };

    // Record to keep locally (no heavy attachments)
    const localRecord = { ...baseRecord };
    delete localRecord.attachments;

    // Record to send to GAS (optional attachments)
    let payloadRecord = { ...baseRecord };
    try {
      if (form.emailEvidence && (form.evidenceFiles?.length||0) > 0) {
        const attachments = await filesToBase64(form.evidenceFiles);
        payloadRecord.attachments = attachments;
        payloadRecord.emailEvidence = true;
      }
    } catch (err) {
      alert(`File processing error: ${err.message||err}`);
      return;
    }

    onSave(localRecord);

    if (typeof onSyncOne === 'function') {
      try {
        const res = await onSyncOne(payloadRecord);
        if (res?.ok) alert("Submitted and synced to Google Sheets.");
        else if (GOOGLE_APPS_SCRIPT_URL) alert(`Submitted locally. Google Sheets sync failed: ${res?.reason||'unknown error'}`);
      } catch (err) {
        alert(`Submitted locally. Google Sheets sync error: ${err?.message||err}`);
      }
    }

    reset();
  }

  return (
    <Card>
      <CardHeader title="Register Upcoming Deal (within 60 days)" subtitle="Provide details below. Fields marked * are mandatory." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="resellerCountry" required>{isID ? 'Negara Anda' : 'Reseller Country'}</Label>
              <Select id="resellerCountry" name="resellerCountry" value={form.resellerCountry} onChange={e=>setForm(f=>({...f, resellerCountry: e.target.value }))}>
                <option>Indonesia</option>
                <option>Malaysia</option>
                <option>Philippines</option>
                <option>Singapore</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerLocation" required>{isID ? 'Lokasi Reseller' : 'Reseller Location'}</Label>
              <Input id="resellerLocation" name="resellerLocation" value={form.resellerLocation} onChange={e=>setForm(f=>({...f, resellerLocation: e.target.value }))} placeholder="e.g., Jakarta" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">{isID ? 'Mata Uang' : 'Currency'}</Label>
              <Select id="currency" name="currency" value={form.currency} onChange={e=>setForm(f=>({...f, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>
          {dupWarning && (<div className="rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-900 p-4 text-sm">{dupWarning}</div>)}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="resellerName" required>Reseller company</Label>
              <Input id="resellerName" name="resellerName" value={form.resellerName} onChange={handleChange} placeholder="e.g., Alpha Solutions Pte Ltd" />
              {errors.resellerName && <p className="text-xs text-red-600">{errors.resellerName}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerContact" required>{isID ? 'Kontak Utama' : 'Primary contact'}</Label>
              <Input id="resellerContact" name="resellerContact" value={form.resellerContact} onChange={handleChange} placeholder="Full name" />
              {errors.resellerContact && <p className="text-xs text-red-600">{errors.resellerContact}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerEmail" required>Contact email</Label>
              <Input id="resellerEmail" name="resellerEmail" type="email" value={form.resellerEmail} onChange={handleChange} placeholder="name@company.com" />
              {errors.resellerEmail && <p className="text-xs text-red-600">{errors.resellerEmail}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerPhone">Contact phone</Label>
              <Input id="resellerPhone" name="resellerPhone" value={form.resellerPhone} onChange={handleChange} placeholder="+65 1234 5678" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="customerName" required>{isID ? 'Nama Pelanggan' : 'Customer name'}</Label>
              <Input id="customerName" name="customerName" value={form.customerName} onChange={handleChange} placeholder="End customer / project owner" />
              {errors.customerName && <p className="text-xs text-red-600">{errors.customerName}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerLocation" required>{isID ? 'Lokasi Reseller' : 'Reseller location'}</Label>
              <Input id="resellerLocation" name="resellerLocation" value={form.resellerLocation} onChange={e=>setForm(f=>({...f, resellerLocation:e.target.value}))} placeholder="Jakarta" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city" required>{isID ? 'Kota Pelanggan' : 'Customer City'}</Label>
              <Input id="city" name="city" value={form.city||""} onChange={e=>{ const v=e.target.value; setForm(f=>({...f, city:v, customerLocation:`${v || ''}${f.country?`, ${f.country}`:''}`})); }} placeholder="Jakarta" />
              {errors.city && <p className="text-xs text-red-600">{errors.city}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country" required>{isID ? 'Negara Pelanggan' : 'Customer Country'}</Label>
              <Select id="country" name="country" value={form.country||""} onChange={e=>{ const v=e.target.value; setForm(f=>({...f, country:v, customerLocation:`${f.city?f.city:''}${v?`, ${v}`:''}`})); }}>
                <option value="">Select country</option>
                <option>Indonesia</option>
                <option>Singapore</option>
                <option>Malaysia</option>
                <option>Philippines</option>
              </Select>
              {errors.country && <p className="text-xs text-red-600">{errors.country}</p>}
            </div>
            <div className="grid gap-2">
              <Label>{isID ? 'Opsi peta (tempel lat, lng atau klik pembantu)' : 'Map option (paste lat, lng or click helper)'}</Label>
              <div className="flex gap-2">
                <Input placeholder="lat" value={form.lat??""} onChange={e=>setForm(f=>({...f, lat: Number(e.target.value)}))} />
                <Input placeholder="lng" value={form.lng??""} onChange={e=>setForm(f=>({...f, lng: Number(e.target.value)}))} />
                <a className={`px-3 py-2 rounded-xl text-white text-sm ${BRAND.primaryBtn}`} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((form.city||"")+","+(form.country||""))}`} target="_blank">Open Map</a>
              </div>
              <p className="text-xs text-gray-500">{isID ? 'Tip: gunakan tautan untuk memilih titik, salin koordinat kembali ke sini.' : 'Tip: use the link to pick a point, copy coordinates back here.'}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2 md:col-span-2">
              <Label required>Solution offered (Xgrids)</Label>
              <div className="grid gap-2">
                <Select value={form.solution||""} onChange={e=>setForm(f=>({...f, solution: e.target.value}))}>
                  <option value="">Select an Xgrids solution</option>
                  {XGRIDS_SOLUTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Input id="solution" name="solution" value={form.solution||""} onChange={e=>setForm(f=>({...f, solution:e.target.value}))} placeholder="Or type Xgrids solution details" />
                <a className="text-sky-700 underline text-xs" href="https://www.aptella.com/asia/product-brands/xgrids-asia/" target="_blank">Learn about Xgrids solutions</a>
              </div>
              {errors.solution && <p className="text-xs text-red-600">{errors.solution}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expectedCloseDate" required>{isID ? 'Perkiraan tanggal penutupan' : 'Expected close date'}</Label>
              <Input id="expectedCloseDate" name="expectedCloseDate" type="date" value={form.expectedCloseDate} onChange={handleChange} />
              {errors.expectedCloseDate && <p className="text-xs text-red-600">{errors.expectedCloseDate}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="industry">{isID ? 'Industri' : 'Industry'}</Label>
              <Select id="industry" name="industry" value={form.industry} onChange={handleChange}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">{isID ? 'Mata Uang' : 'Currency'}</Label>
              <Select id="currency" name="currency" value={form.currency} onChange={handleChange}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="value" required>{isID ? 'Nilai transaksi' : 'Deal value'}</Label>
              <Input id="value" name="value" type="number" step="0.01" min="0" value={form.value} onChange={handleChange} placeholder="e.g., 25000" />
              {errors.value && <p className="text-xs text-red-600">{errors.value}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="stage">{isID ? 'Tahap penjualan' : 'Sales stage'}</Label>
              <Select id="stage" name="stage" value={form.stage} onChange={handleChange}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{isID ? 'Probabilitas (%)' : 'Probability (%)'}</Label>
              <Input type="number" min="0" max="100" value={form.probability} onChange={(e)=>setForm({...form, probability: Number(e.target.value)})} />
            </div>
            <div className="grid gap-2">
              <Label>{isID ? 'Pesaing' : 'Competitors'}</Label>
              <Input placeholder="Comma-separated (optional)" value={(form.competitors||[]).join(", ")} onChange={(e)=>setForm({...form, competitors: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Support requested</Label>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SUPPORT_OPTIONS.map(opt => (
                <label key={isID ? (SUPPORT_OPTIONS_ID[opt] || opt) : opt} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.supports.includes(opt)} onChange={()=>handleMultiToggle('supports', opt)} />
                  {isID ? (SUPPORT_OPTIONS_ID[opt] || opt) : opt}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{isID ? 'Bukti (wajib)' : 'Evidence (required)'}</Label>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <input id="evidenceFiles" type="file" multiple onChange={handleFiles} className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sky-700" />
                {form.evidenceFiles?.length>0 && (<div className="mt-2 text-xs text-gray-600">{form.evidenceFiles.length} file(s) selected.</div>)}
              </div>
              
            </div>
            <label className="flex items-center gap-2 text-sm mt-1">
              <input type="checkbox" checked={!!form.emailEvidence} onChange={e=>setForm(f=>({...f, emailEvidence: e.target.checked}))} />
              {isID ? `Kirim file terlampir ke Aptella (${APTELLA_EVIDENCE_EMAIL}) melalui Apps Script aman` : `Email attached files to Aptella (${APTELLA_EVIDENCE_EMAIL}) via secure Apps Script`}
            </label>
            {errors.evidence && <p className="text-xs text-red-600">{errors.evidence}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={4} value={form.notes} onChange={handleChange} placeholder="Key requirements, technical scope, delivery constraints, decision process, etc." />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="confidential" checked={!!form.confidential} onChange={e=>setForm(f=>({...f, confidential: e.target.checked}))} />
              {isID ? 'Tandai nama pelanggan rahasia bagi reseller lain' : 'Mark customer name confidential to other resellers'}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="remindersOptIn" checked={!!form.remindersOptIn} onChange={e=>setForm(f=>({...f, remindersOptIn: e.target.checked}))} />
              {isID ? 'Kirimi saya pengingat untuk pembaruan' : 'Send me reminders for updates'}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="accept" checked={!!form.accept} onChange={e=>setForm(f=>({...f, accept: e.target.checked}))} />
              {isID ? 'Saya mengonfirmasi detail akurat dan setuju penyimpanan data untuk pengelolaan deal' : 'I confirm details are accurate and consent to data storage for deal management'}
            </label>
          </div>
          {errors.accept && <p className="text-xs text-red-600 -mt-3">{errors.accept}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" className={`px-4 py-2 rounded-xl text-white ${BRAND.primaryBtn}`}>{form.resellerCountry==='Indonesia' ? 'Kirim Pendaftaran' : 'Submit Registration'}</button>
            <button type="button" onClick={reset} className="px-4 py-2 rounded-xl bg-gray-200">Reset</button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

// ----------------------- Self-tests -------------------------
(function runSelfTests(){
  try {
    const base = "2025-01-01";
    const next = addDays(base, 1);
    if (next !== "2025-01-02") throw new Error("addDays failed");
    const in14 = addDays(todayLocalISO(), 14);
    const in61 = addDays(todayLocalISO(), 61);
    if (!withinNext60Days(in14)) throw new Error("withinNext60Days(true) failed");
    if (withinNext60Days(in61)) throw new Error("withinNext60Days(false) failed");
    if (PROB_BY_STAGE.qualified !== 35) throw new Error("PROB_BY_STAGE mapping broken");
    if (countryFromLocation("Jakarta, Indonesia") !== "Indonesia") throw new Error("countryFromLocation failed");
    const d7 = daysUntil(addDays(todayLocalISO(), 7));
    if (d7 !== 7) throw new Error("daysUntil failed");
    // Newline replacement & CSV quote escaping tests
    const replaced = ("hello\nworld").replace(/\n/g, " ");
    if (replaced !== "hello world") throw new Error("newline replace failed");
    const quoted = `"Quoted"`.replace(/"/g,'""');
    if (quoted !== '""Quoted""') throw new Error("CSV quote escape failed");
    console.log("✅ Self-tests passed");
  } catch (e) {
    console.warn("⚠️ Self-tests failed:", e);
  }
})();

// ---------------- Reseller Updates -------------------------
function ResellerUpdates({ items, setItems }){
  const [email, setEmail] = useState("");
  const mine = useMemo(()=> items.filter(x => (email && x.resellerEmail && x.resellerEmail.toLowerCase() === email.toLowerCase())), [items, email]);

  function addUpdate(id){
    const text = prompt("Add a short progress update (will be visible to Aptella admin)");
    if(!text) return;
    const ts = new Date().toISOString();
    setItems(prev => prev.map(r => r.id === id ? { ...r, updates: [...(r.updates||[]), { ts, text } ] } : r));
  }

  function toggleReminders(id, checked){ setItems(prev => prev.map(r => r.id === id ? { ...r, remindersOptIn: checked } : r)); }

  if (!items?.length) return null;
  return (
    <Card>
      <CardHeader title="My Submissions – Add Progress" subtitle="Find your deals by email and add updates." />
      <CardBody>
        <div className="flex gap-3 mb-3">
          <Input placeholder="Enter the same email you used on submission" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        {email && mine.length === 0 && (<div className="text-sm text-gray-500">No submissions found for this email.</div>)}
        {mine.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-3 text-left">Submitted</th>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Solution</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Updates</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mine.map(x => (
                  <tr key={x.id} className="border-b">
                    <td className="p-3">{x.submittedAt}</td>
                    <td className="p-3">{x.customerName} • {x.customerLocation}</td>
                    <td className="p-3">{x.solution}</td>
                    <td className="p-3">{x.status}</td>
                    <td className="p-3">
                      <div className="max-w-xs space-y-1">
                        {(x.updates||[]).slice().reverse().map((u,i)=> (
                          <div key={i} className="text-xs text-gray-700">{new Date(u.ts).toLocaleString()} – {u.text}</div>
                        ))}
                        {(!x.updates||x.updates.length===0) && <span className="text-xs text-gray-400">No updates yet</span>}
                      </div>
                    </td>
                    <td className="p-3 space-x-2">
                      <button onClick={()=>addUpdate(x.id)} className={`px-2.5 py-1.5 rounded-lg text-white ${BRAND.primaryBtn}`}>Add Update</button>
                      <label className="text-xs inline-flex items-center gap-2 ml-2">
                        <input type="checkbox" checked={!!x.remindersOptIn} onChange={e=>toggleReminders(x.id, e.target.checked)} /> Reminders
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}





// ---- Brand styles injection ----
function BrandTheme(){
  return (
    <style>{`
      :root{ --aptella-navy:#0e3446; --aptella-navy-dark:#0b2938; --aptella-orange:#f0a03a; }
      body{ background:#f7fafc; color:#0f172a; }
      .brand-nav{ background:#fff; border-bottom:1px solid #e5e7eb; }
      .brand-title{ color:var(--aptella-navy); font-weight:700; letter-spacing:.2px; }
      .brand-link{ color:var(--aptella-navy); opacity:.85 }
      .brand-link:hover{ opacity:1 }
    `}</style>
  );
}

// ---- Admin Login gate ----
function AdminLogin({ onOk }){
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  function submit(e){
    e.preventDefault();
    if (pw === ADMIN_PASSWORD){ localStorage.setItem('aptella_admin_ok','1'); onOk && onOk(); }
    else setErr('Incorrect password');
  }
  return (
    <Card>
      <CardHeader title="Admin Sign-in" subtitle="Enter the Aptella admin password to continue." />
      <CardBody>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 items-start">
          <Input type="password" placeholder="Admin password" value={pw} onChange={e=>setPw(e.target.value)} className="sm:w-72" />
          <button type="submit" className={`px-4 py-2 rounded-xl text-white ${BRAND.primaryBtn}`}>Enter</button>
          {err && <div className="text-sm text-red-600 ml-1">{err}</div>}
        </form>
        <p className="text-xs text-gray-500 mt-2">Forgot? Contact your Aptella administrator.</p>
      </CardBody>
    </Card>
  );
}

// ---- Root: Aptella Reseller Portal (safe default export) ----
function AptellaRoot() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('reseller'); // 'reseller' | 'admin'
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('All');
  const [adminAuthed, setAdminAuthed] = useState(()=> (typeof localStorage!=='undefined' && localStorage.getItem('aptella_admin_ok')==='1'));

  const safeURL = (typeof GOOGLE_APPS_SCRIPT_URL !== 'undefined') ? GOOGLE_APPS_SCRIPT_URL : '';
  const requireAdminGate = tab === 'admin' && !adminAuthed;

  const syncOne = async (row) => {
    if (!safeURL) return;
    try {
      const res = await fetch(safeURL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
      await res.json().catch(()=>null);
      setItems(prev => prev.map(r => r.id === row.id ? { ...r, syncedAt: todayLocalISO ? todayLocalISO() : new Date().toISOString().slice(0,10) } : r));
    } catch (e) { console.error('syncOne failed', e); }
  };
  const syncMany = async (rows=[]) => { for (const r of rows) { await syncOne(r); } };

  return (
    <div className="min-h-screen">
      <BrandTheme />
      <header className="brand-nav">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_SRC} alt="Aptella" className="h-8 w-auto" onError={(e)=>{e.currentTarget.style.display='none';}}/>
            <span className="brand-title">Reseller Deal Registration</span>
          </div>
          <nav className="flex items-center gap-2">
            <button className={`px-3 py-2 rounded-lg ${tab==='reseller' ? 'bg-[#0e3446] text-white' : 'bg-gray-100 text-[#0e3446]'}`} onClick={()=>setTab('reseller')}>Reseller</button>
            <button className={`px-3 py-2 rounded-lg ${tab==='admin' ? 'bg-[#0e3446] text-white' : 'bg-gray-100 text-[#0e3446]'}`} onClick={()=>setTab('admin')}>Admin</button>
            {adminAuthed && (
              <button title="Sign out of Admin" onClick={()=>{ localStorage.removeItem('aptella_admin_ok'); setAdminAuthed(false); setTab('reseller'); }} className="px-3 py-2 rounded-lg bg-gray-100 text-[#0e3446]">Sign out</button>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {requireAdminGate ? (
          <AdminLogin onOk={()=> setAdminAuthed(true)} />
        ) : (
          tab === 'reseller' ? (
            (typeof SubmissionForm === 'function') ? (
              <SubmissionForm items={items} setItems={setItems} onSave={(r)=>setItems(prev=>[r, ...prev])} onSyncOne={syncOne} />
            ) : (
              <div className="text-sm text-gray-500">SubmissionForm component not found.</div>
            )
          ) : (
            (typeof AdminPanel === 'function') ? (
              <AdminPanel
                items={items}
                rawItems={items}
                setItems={setItems}
                currencyFilter={currencyFilter}
                setCurrencyFilter={setCurrencyFilter}
                search={search}
                setSearch={setSearch}
                onSyncOne={syncOne}
                onSyncMany={syncMany}
                appsScriptUrl={safeURL}
              />
            ) : (
              <div className="text-sm text-gray-500">AdminPanel component not found.</div>
            )
          )
        )}
      </main>
    </div>
  );
}

export default AptellaRoot;
