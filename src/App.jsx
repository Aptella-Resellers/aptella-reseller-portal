import React, { useEffect, useMemo, useState } from "react";

// --- Admin → Settings drawer for FX rates (definition ensured) ---
function AdminSettings({ open, onClose, ratesAUD = {}, onSave, saving }) {
  const [local, setLocal] = React.useState(ratesAUD || {});
  React.useEffect(() => { setLocal(ratesAUD || {}); }, [ratesAUD, open]);
  const entries = Object.entries(local);
  if (!open) return null;
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


// --- AdminGeoMap (Leaflet + MarkerCluster, AUD sizing) ---
function AdminGeoMap({ items = [], ratesAUD = { AUD:1, SGD:1.07, MYR:0.33, PHP:0.027, IDR:0.000095 } }) {
  const ref = React.useRef(null);
  const mapRef = React.useRef(null);
  const LRef = React.useRef(null);
  const circlesGroupRef = React.useRef(null);
  const clusterGroupRef = React.useRef(null);

  const CAPITALS = {
    Indonesia: { city: 'Jakarta', lat: -6.2088, lng: 106.8456 },
    Malaysia: { city: 'Kuala Lumpur', lat: 3.139, lng: 101.6869 },
    Philippines: { city: 'Manila', lat: 14.5995, lng: 120.9842 },
    Singapore: { city: 'Singapore', lat: 1.3521, lng: 103.8198 },
  };

  React.useEffect(() => {
    if (!ref.current || mapRef.current) return;
    // CSS once
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-leaflet', '1');
      document.head.appendChild(link);
    }
    if (!document.querySelector('link[data-lmc]')) {
      const lmc1 = document.createElement('link');
      lmc1.rel = 'stylesheet';
      lmc1.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
      lmc1.setAttribute('data-lmc', '1');
      document.head.appendChild(lmc1);
      const lmc2 = document.createElement('link');
      lmc2.rel = 'stylesheet';
      lmc2.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
      lmc2.setAttribute('data-lmc', '1');
      document.head.appendChild(lmc2);
    }
    const ensureLeaflet = () => new Promise((resolve, reject) => {
      if (window.L && window.L.MarkerClusterGroup) return resolve(window.L);
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.async = true;
      s.onload = () => {
        const s2 = document.createElement('script');
        s2.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
        s2.async = true;
        s2.onload = () => resolve(window.L);
        s2.onerror = reject;
        document.head.appendChild(s2);
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    ensureLeaflet()
      .then((L) => {
        LRef.current = L;
        mapRef.current = L.map(ref.current).setView([1.35, 103.82], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(mapRef.current);
        circlesGroupRef.current = L.layerGroup().addTo(mapRef.current);
        clusterGroupRef.current = L.markerClusterGroup();
        mapRef.current.addLayer(clusterGroupRef.current);
      })
      .catch((err) => console.error('Leaflet load failed', err));
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    const circles = circlesGroupRef.current || L.layerGroup().addTo(map);
    circles.clearLayers();

    const supportsCluster = typeof L.markerClusterGroup === 'function';
    let clusters = clusterGroupRef.current;
    if (supportsCluster) {
      clusters = clusters || L.markerClusterGroup();
      clusters.clearLayers();
      if (!clusterGroupRef.current) {
        clusterGroupRef.current = clusters;
        map.addLayer(clusters);
      }
    }

    const groups = {};
    (items || []).forEach((x) => {
      const city = (x.customerCity || x.city || '').trim();
      const country = (x.customerCountry || x.country || '').trim();
      if (!city && !country) return;
      const key = `${city}|${country}`;
      if (!groups[key]) groups[key] = { city, country, lat: null, lng: null, count: 0, totals: {}, aud: 0 };
      groups[key].count += 1;
      const cur = (x.currency || '').trim() || '—';
      const val = Number(x.value) || 0;
      groups[key].totals[cur] = (groups[key].totals[cur] || 0) + val;
      const rate = Number(ratesAUD[cur]) || 0; // to AUD
      groups[key].aud += val * rate;
      const lat = Number(x.lat);
      const lng = Number(x.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng) && groups[key].lat == null) {
        groups[key].lat = lat; groups[key].lng = lng;
      }
    });

    Object.values(groups).forEach((g) => {
      if (g.lat == null || g.lng == null) {
        const cap = CAPITALS[g.country];
        if (cap) { g.lat = cap.lat; g.lng = cap.lng; if (!g.city) g.city = cap.city; }
      }
    });

    Object.values(groups)
      .filter((g) => Number.isFinite(g.lat) && Number.isFinite(g.lng))
      .forEach((g) => {
        const aud = Math.max(0, g.aud);
        const size = Math.max(24, Math.min(96, Math.sqrt(aud) / 50));
        const html = `<div style="width:${size}px;height:${size}px;line-height:${size}px;border-radius:50%;background:rgba(11,43,60,0.18);border:2px solid #0b2b3c;text-align:center;font-weight:600;">${g.count}</div>`;
        const icon = L.divIcon({ html, className: 'aptella-bubble', iconSize: [size, size] });
        const m = L.marker([g.lat, g.lng], { icon });
        const totalsHtml = Object.entries(g.totals).map(([k,v]) => `• ${k} ${new Intl.NumberFormat().format(v)}`).join('<br/>');
        const popup = `<strong>${g.city || 'Unknown'}${g.country ? `, ${g.country}` : ''}</strong><br/>Entries: ${g.count}<br/>Total value:<br/>${totalsHtml}<br/><em>AUD (sizing): ${new Intl.NumberFormat().format(Math.round(aud))}</em>`;
        m.bindPopup(popup);
        (typeof L.markerClusterGroup === 'function' ? clusters.addLayer(m) : m.addTo(map));
        const radius = 4000 * Math.sqrt(g.count);
        L.circle([g.lat, g.lng], { radius, color: '#0b2b3c', fillColor: '#0b2b3c', fillOpacity: 0.12 }).addTo(circles);
      });
  }, [items, ratesAUD]);

  return <div ref={ref} style={{ height: 480, borderRadius: 12, overflow: 'hidden' }} />;
}


// --- AdminMap (Leaflet loaded on-demand; no build-time dependency)
function AdminMap({ items = [] }) {
  const ref = React.useRef(null);
  const mapRef = React.useRef(null);
  const LRef = React.useRef(null);
  const circlesGroupRef = React.useRef(null);

  const CAPITALS = {
    Indonesia: { city: 'Jakarta', lat: -6.2088, lng: 106.8456 },
    Malaysia: { city: 'Kuala Lumpur', lat: 3.139, lng: 101.6869 },
    Philippines: { city: 'Manila', lat: 14.5995, lng: 120.9842 },
    Singapore: { city: 'Singapore', lat: 1.3521, lng: 103.8198 },
  };

  React.useEffect(() => {
    if (!ref.current || mapRef.current) return;
    // Inject Leaflet CSS once
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-leaflet', '1');
      document.head.appendChild(link);
    }
    // Load Leaflet via plain script tag to avoid ESM CDN transformation issues
    const ensureLeaflet = () => new Promise((resolve, reject) => {
      if (window.L) return resolve(window.L);
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.async = true;
      s.onload = () => resolve(window.L);
      s.onerror = reject;
      document.head.appendChild(s);
    });
    ensureLeaflet()
      .then((L) => {
        LRef.current = L;
        mapRef.current = L.map(ref.current).setView([1.35, 103.82], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(mapRef.current);
        // Dedicated group for circles
        circlesGroupRef.current = L.layerGroup().addTo(mapRef.current);
      })
      .catch((err) => console.error('Leaflet load failed', err));
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    // Use a dedicated layer group for circles
    let groupLayer = circlesGroupRef.current;
    if (!groupLayer) {
      groupLayer = L.layerGroup().addTo(map);
      circlesGroupRef.current = groupLayer;
    }
    groupLayer.clearLayers();

    const groups = {};
    (items || []).forEach((x) => {
      const city = (x.customerCity || x.city || '').trim();
      const country = (x.customerCountry || x.country || '').trim();
      if (!city && !country) return;
      const key = `${city}|${country}`;
      if (!groups[key]) groups[key] = { city, country, lat: null, lng: null, count: 0, totals: {} };
      groups[key].count += 1;
      const cur = (x.currency || '').trim() || '—';
      const val = Number(x.value) || 0;
      groups[key].totals[cur] = (groups[key].totals[cur] || 0) + val;
      const lat = Number(x.lat);
      const lng = Number(x.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng) && groups[key].lat == null) {
        groups[key].lat = lat;
        groups[key].lng = lng;
      }
    });

    // Fallback to capitals
    Object.values(groups).forEach((g) => {
      if (g.lat == null || g.lng == null) {
        const cap = CAPITALS[g.country];
        if (cap) {
          g.lat = cap.lat;
          g.lng = cap.lng;
          if (!g.city) g.city = cap.city;
        }
      }
    });

    // Render circles
    Object.values(groups)
      .filter((g) => Number.isFinite(g.lat) && Number.isFinite(g.lng))
      .forEach((g) => {
        const radius = 5000 * Math.sqrt(g.count);
        const totalsHtml = Object.entries(g.totals)
          .map(([k, v]) => `• ${k} ${new Intl.NumberFormat().format(v)}`)
          .join('<br/>');
        const html = `<strong>${g.city || 'Unknown'}${g.country ? `, ${g.country}` : ''}</strong><br/>Entries: ${g.count}<br/>Total value:<br/>${totalsHtml}`;
        L.circle([g.lat, g.lng], { radius, color: '#0b2b3c', fillColor: '#0b2b3c', fillOpacity: 0.25 })
          .bindPopup(html)
          .addTo(groupLayer);
      });
  }, [items]);

  return <div ref={ref} style={{ height: 480, borderRadius: 12, overflow: 'hidden' }} />;
}

// Using public/ logo path so build succeeds even if asset is missing at src/assets
const LOGO_URL = new URL('aptella-logo.png', window.location.href).href;

// Simple error boundary so blank-page errors render visibly
class ErrorCatcher extends React.Component {
  constructor(props){ super(props); this.state = { err: null }; }
  static getDerivedStateFromError(error){ return { err: error }; }
  componentDidCatch(error, info){ console.error("App error:", error, info); }
  render(){
    if (this.state.err) {
      return (
        <div className="max-w-3xl mx-auto my-8 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
          <div className="font-semibold mb-2">The app hit an error:</div>
          <pre className="whitespace-pre-wrap text-xs">{String(this.state.err)}</pre>
          <div className="mt-2 text-xs text-red-700">Open your browser console for full stack traces.</div>
        </div>
      );
    }
    return this.props.children;
  }
}


// --------------------- Google Sheets Setup -------------------
// 1) Create a Google Sheet and a tab named "Registrations".
// 2) Extensions → Apps Script → paste the code below → Deploy → Web app
//    - Execute as: Me   |   Who has access: Anyone with the link
//    - Copy the Web app URL into GOOGLE_APPS_SCRIPT_URL below
//

// -------------------------- Config ---------------------------
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwp6JmvlrSG8pmqNlRPZkQzcqm7JWgh6cBQZgzzkJ_enQ5ZRr_RfjDxjlqnn_RaHMUw/exec"; // ← GAS Web App URL
const GOOGLE_SHEET_VIEW_URL = "";
const __IMPORT_META__ = { env: {} }; // shim to avoid '__IMPORT_META__' parse errors   // ← optional viewer link
const BASE_PATH = (() => {
  const base = document.querySelector('base')?.getAttribute('href');
  if (base) return base.endsWith('/') ? base : base + '/';
  const p = window.location.pathname;
  return p.endsWith('/') ? p : p + '/';
})();
// LOGO_URL removed — using imported asset aptellaLogo // Put your logo file in /public as aptella-logo.png

// Admin gate (frontend-only; for strong security use real auth)
const ADMIN_PASSWORD = "Aptella2025!";
const APTELLA_EVIDENCE_EMAIL = "evidence@aptella.com";

const BRAND = {
  primaryBtn: "bg-[#0b2b3c] hover:bg-[#092331] focus:ring-[#f5a11a]",
  primaryText: "text-[#0b2b3c]",
  accent: "#f5a11a",
};

// ---------------------- Utility helpers ---------------------
const CURRENCIES = ["AUD", "SGD", "USD", "EUR", "IDR", "MYR", "PHP", "THB", "VND"]; 
const STAGES = [
  { key: "lead", label: "Lead" },
  { key: "qualified", label: "Qualified" },
  { key: "quote", label: "Quote Sent" },
  { key: "po_pending", label: "PO Pending" },
  { key: "won", label: "Closed Won" },
  { key: "lost", label: "Closed Lost" },
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

const INDUSTRIES = [
  "Construction", "Mining", "Utilities", "Oil & Gas", "Transport", "Manufacturing", "Telecom", "Government", "Education", "Healthcare", "Retail", "Other"
];

// Xgrids solutions (curated)
const XGRIDS_SOLUTIONS = [
  "Xgrids L2 PRO",
  "Xgrids K1",
  "Xgrids PortalCam",
  "Xgrids Drone Kit"
];

const COUNTRY_CONFIG = {
  Indonesia: { currency: "IDR", capital: "Jakarta" },
  Malaysia: { currency: "MYR", capital: "Kuala Lumpur" },
  Philippines: { currency: "PHP", capital: "Manila" },
  Singapore: { currency: "SGD", capital: "Singapore" },
};

const PROB_BY_STAGE = { lead: 15, qualified: 35, quote: 55, po_pending: 80, won: 100, lost: 0 };

function todayLocalISO() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzOffset * 60000);
  return local.toISOString().slice(0, 10);
}
function addDays(dateStr, days) { const d = new Date(dateStr); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function stripTime(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function withinNext60Days(dateStr) {
  const target = new Date(dateStr); const now = new Date(); const sixty = new Date(); sixty.setDate(sixty.getDate() + 60);
  return target >= stripTime(now) && target <= stripTime(sixty);
}
function toCurrency(n) { const num = Number(n || 0); return num.toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
const STORAGE_KEY = "dealRegsV1";

// Default map center (Jakarta)
const DEFAULT_LAT = -6.2088;
const DEFAULT_LNG = 106.8456;

function daysUntil(dateStr){
  if(!dateStr) return Infinity;
  const d = new Date(dateStr);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((end - today) / (1000*60*60*24));
}
function countryFromLocation(loc){
  if(!loc) return "";
  const parts = String(loc).split(",");
  return parts.length ? parts[parts.length-1].trim() : "";
}

function mailto(to, subject, body){
  const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

// ----------------------- CSV Export -------------------------
function exportCSV(items) {
  const headers = [
    "id","submittedAt","status","resellerName","resellerContact","resellerEmail","resellerPhone","customerName","customerLocation","country","industry","currency","value","solution","stage","probability","expectedCloseDate","lockExpiry","supports","competitors","notes","evidenceLinks","evidenceFiles","confidential","syncedAt"
  ];
  const rows = items.map((x) => [
    x.id, x.submittedAt, x.status, x.resellerName, x.resellerContact, x.resellerEmail, x.resellerPhone,
    x.customerName, x.customerLocation, x.country, x.industry, x.currency, x.value, x.solution, x.stage, x.probability,
    x.expectedCloseDate, x.lockExpiry, (x.supports||[]).join("; "), (x.competitors||[]).join("; "), (x.notes||"").replace(/\n/g, " "),
    (x.evidenceLinks||[]).join("; "), (x.evidenceFiles||[]).map(f=>f.name||f).join("; "), x.confidential?"Yes":"No", x.syncedAt||""
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `registrations_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ---------------- Google Sheets sync (GAS) ------------------
async function sendToGoogleSheets(records){
  if(!GOOGLE_APPS_SCRIPT_URL) throw new Error("Google Apps Script URL not configured");
  const res = await fetch(GOOGLE_APPS_SCRIPT_URL,{
    method:"POST",
    // Tip: omit Content-Type to avoid CORS preflight if needed
    // headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ records }),
  });
  if(!res.ok) throw new Error(`Sheets sync failed (${res.status})`);
  const json = await res.json().catch(()=>({ ok:false }));
  if(!json.ok) throw new Error("Sheets sync returned not ok");
  return json;
}

// --------------------- UI Primitives ------------------------
function Card({ children, className = "" }) { return (<div className={`rounded-2xl shadow-sm border border-gray-200 bg-white ${className}`}>{children}</div>); }
function CardHeader({ title, subtitle, right }) {
  return (
    <div className="p-5 border-b border-gray-100 flex items-start justify-between">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
function CardBody({ children, className = "" }) { return <div className={`p-5 ${className}`}>{children}</div>; }
function Label({ children, htmlFor, required }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 flex items-center gap-1">
      {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  );
}
function Input(props) { return (<input {...props} className={`w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${props.className||""}`} />); }
function Select({ children, ...props }) { return (<select {...props} className={`w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${props.className||""}`}>{children}</select>); }
function Textarea(props) { return (<textarea {...props} className={`w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${props.className||""}`} />); }
function Badge({ children, tone = "gray" }) { const toneMap = { gray: "bg-gray-100 text-gray-700", green: "bg-green-100 text-green-700", red: "bg-red-100 text-red-700", indigo: "bg-indigo-100 text-indigo-700", yellow: "bg-yellow-100 text-yellow-800", blue: "bg-blue-100 text-blue-700", orange: "bg-orange-100 text-orange-800" }; return <span className={`px-2.5 py-1 rounded-full text-xs ${toneMap[tone] || toneMap.gray}`}>{children}</span>; }

function Modal({ open, onClose, title, children }){
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-sm">✕</button>
        </div>
        <div className="max-h-[60vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

// ------------------- Main Application ----------------------
export default function DealRegistrationPortal() {
  const [mode, setMode] = useState("reseller"); // 'reseller' | 'admin'
  const [currencyFilter, setCurrencyFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [uiLocale, setUiLocale] = useState('en');
  const [items, setItems] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items]);

  // Set browser tab title
  useEffect(() => { document.title = 'Aptella reseller portal'; }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(x => {
      const okCurrency = currencyFilter === "All" || x.currency === currencyFilter;
      const text = [x.resellerName, x.customerName, x.customerLocation, x.solution, x.resellerEmail, x.resellerContact].join(" ").toLowerCase();
      return okCurrency && (!q || text.includes(q));
    });
  }, [items, currencyFilter, search]);

  const totalsByCurrency = useMemo(() => {
    const map = {}; for (const x of filtered) { const cur = x.currency || "SGD"; map[cur] = (map[cur] || 0) + Number(x.value || 0); } return map;
  }, [filtered]);

  // ---------- Sheets sync helpers in scope ----------
  async function syncOne(record){
    if(!GOOGLE_APPS_SCRIPT_URL) return { ok:false, reason:"No GAS URL configured" };
    const sanitized = {
      ...record,
      syncedAt: new Date().toISOString(),
      evidenceFiles: (record.evidenceFiles||[]).map(f => (typeof f === 'string' ? f : (f?.name || ''))),
    };
    try {
      const resp = await sendToGoogleSheets([sanitized]);
      setItems(prev => prev.map(r => r.id === record.id ? { ...r, syncedAt: sanitized.syncedAt } : r));
      return resp;
    } catch (err) {
      console.error(err); return { ok:false, reason: String(err.message||err) };
    }
  }

  async function syncMany(records){
    if(!GOOGLE_APPS_SCRIPT_URL){ alert("Google Sheets URL not set."); return; }
    const payload = records.map(r => ({
      ...r,
      syncedAt: r.syncedAt || new Date().toISOString(),
      evidenceFiles: (r.evidenceFiles||[]).map(f => (typeof f === 'string' ? f : (f?.name || ''))),
    }));
    try {
      await sendToGoogleSheets(payload);
      setItems(prev => prev.map(p => payload.find(x=>x.id===p.id) ? { ...p, syncedAt: new Date().toISOString() } : p));
      alert(`Synced ${payload.length} record(s) to Google Sheets.`);
    } catch (e) {
      alert(`Sync failed: ${e.message||e}`);
    }
  }

  function switchToAdmin(){ setMode('admin'); }
  function switchToReseller(){ setMode('reseller'); }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Aptella" className="h-10" />
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Aptella</h1>
                <span className={`text-xs ${BRAND.primaryText}`}>Master Distributor</span>
              </div>
              <p className="text-sm text-gray-500">Partner Deal Registration • Next 60 days</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={switchToReseller} className={`px-3 py-2 text-sm rounded-xl ${mode==='reseller'?`${BRAND.primaryBtn} text-white`:'bg-gray-100'}`}>Reseller Submit</button>
            <button onClick={switchToAdmin} className={`px-3 py-2 text-sm rounded-xl ${mode==='admin'?`${BRAND.primaryBtn} text-white`:'bg-gray-100'}`}>Admin View</button>
          </div>
        </div>
        <div className="h-1 w-full" style={{background:"linear-gradient(90deg,#f5a11a,#0b2b3c)"}} />
      </header>

      <ErrorCatcher>
        <main className="max-w-7xl mx-auto p-4 grid gap-6">
        {mode === "reseller" ? (
          <SubmissionForm onSave={(rec)=>setItems([rec, ...items])} items={items} onSyncOne={syncOne} onLocaleChange={(loc)=>setUiLocale(loc)} />
        ) : (
          <AdminGate>
            {/* Stats visible in Admin only */}
            <StatsBar items={filtered} totalsByCurrency={totalsByCurrency} />
            <AdminPanel
              items={filtered}
              rawItems={items}
              setItems={setItems}
              currencyFilter={currencyFilter}
              setCurrencyFilter={setCurrencyFilter}
              search={search}
              setSearch={setSearch}
              onSyncMany={syncMany}
              onSyncOne={syncOne}
            />
          </AdminGate>
        )}

        <Card>
          <CardHeader title={uiLocale==='id' ? 'Aturan Registrasi Deal' : 'Deal Registration Rules'} subtitle={uiLocale==='id' ? 'Harap dibaca sebelum mengirim. (Aptella)' : 'Please read before submitting. (Aptella)'} />
          <CardBody>
            <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
              <li>{uiLocale==='id' ? <>Registrasi harus untuk proyek atau pembelian yang diperkirakan dalam <strong>60 hari</strong> ke depan.</> : <>Registrations must be for projects or purchases expected within the next <strong>60 days</strong>.</>}</li>
              <li>{uiLocale==='id' ? <><strong>Bukti wajib</strong>: unggah email, penawaran, atau foto.</> : <><strong>Evidence is mandatory</strong>: upload an email, quote, or photo.</>}</li>
              <li>{uiLocale==='id' ? <>Registrasi yang disetujui dikunci untuk reseller pengaju selama <strong>60 hari</strong> sejak pengajuan kecuali diperpanjang oleh Aptella.</> : <>Approved registrations are locked to the submitting reseller for <strong>60 days</strong> from submission unless extended by Aptella.</>}</li>
              <li>{uiLocale==='id' ? <>Duplikasi untuk pelanggan, solusi, dan rentang waktu yang sama dapat ditolak atau digabungkan sesuai kebijakan Aptella.</> : <>Duplicates for the same customer, solution, and timeframe may be rejected or merged at Aptella’s discretion.</>}</li>
              <li>{uiLocale==='id' ? <>Penggunaan portal ini berarti menyetujui penyimpanan data kontak bisnis yang dikirim untuk pengelolaan deal.</> : <>Use of this portal implies consent to store submitted business contact data for deal management.</>}</li>
            </ul>
          </CardBody>
        </Card>

        {GOOGLE_SHEET_VIEW_URL && (
          <Card>
            <CardBody>
              <a href={GOOGLE_SHEET_VIEW_URL} target="_blank" className="underline text-sky-700">Open Google Sheet</a>
            </CardBody>
          </Card>
        )}

        <ResellerUpdates items={items} setItems={setItems} />
      </main>
        </ErrorCatcher>
    </div>
  );
}

function AdminGate({ children }){
  const [authed, setAuthed] = useState(()=> localStorage.getItem('aptella_admin_ok')==='1');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  if(authed) return children;
  function unlock(){ if(pw===ADMIN_PASSWORD){ localStorage.setItem('aptella_admin_ok','1'); setAuthed(true); } else { setErr('Incorrect password'); } }
  return (
    <Card>
      <CardHeader title="Admin Login" subtitle="Enter password to access admin view." />
      <CardBody>
        <div className="flex gap-2">
          <Input type="password" placeholder="Enter admin password" value={pw} onChange={(e)=>setPw(e.target.value)} />
          <button onClick={unlock} className={`px-3 py-2 rounded-xl text-white text-sm ${BRAND.primaryBtn}`}>Unlock</button>
        </div>
        {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
        <p className="text-xs text-gray-500 mt-3">Note: This is a simple client-side gate. For stronger security, use an authenticated backend.</p>
      </CardBody>
    </Card>
  );
}

function StatsBar({ items, totalsByCurrency }) {
  const pending = items.filter(x=>x.status==='pending').length;
  const approved = items.filter(x=>x.status==='approved').length;
  const locked = items.filter(x=>x.status==='approved' && new Date(x.lockExpiry) >= stripTime(new Date())).length;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="text-sm text-gray-500">Total Registrations</div>
        <div className="text-3xl font-semibold mt-1">{items.length}</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-gray-500">Pending Review</div>
        <div className="text-3xl font-semibold mt-1">{pending}</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-gray-500">Approved & Locked</div>
        <div className="text-3xl font-semibold mt-1">{locked}</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-gray-500">Deal Value by Currency</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.keys(totalsByCurrency).length === 0 ? (<Badge>—</Badge>) : (
            Object.entries(totalsByCurrency).map(([cur, sum]) => (<Badge key={cur} tone="indigo">{cur} {toCurrency(sum)}</Badge>))
          )}
        </div>
      </Card>
    </div>
  );
}

function AdminPanel($1) {
  // Ensure Admin state exists (prevents ReferenceError: ratesAUD is not defined)
  const [ratesAUD, setRatesAUD] = useState({ AUD:1, SGD:1.07, MYR:0.33, PHP:0.027, IDR:0.000095 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingFx, setSavingFx] = useState(false);
  const [adminError, setAdminError] = useState("");
  // Ensure rawItems defined even if parent omitted it
  rawItems = Array.isArray(rawItems) ? rawItems : (Array.isArray(items) ? items : []);

  // Ensure rawItems is defined to avoid ReferenceError in downstream code
  rawItems = Array.isArray(rawItems) ? rawItems : (Array.isArray(items) ? items : []);

   // ANCHOR_RATESAUD
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingFx, setSavingFx] = useState(false);
  const [adminError, setAdminError] = useState("");
  
  useEffect(() => { pullAll(); }, []);

  
  useEffect(() => { pullAll(); }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=list`, { cache: 'no-store' });
        const json = await res.json();
        if (json && json.ok && Array.isArray(json.data)) {
          setItems(json.data);
        }
      } catch (e) {
        console.error('Admin pullAll failed', e);
      }
    })();
  }, []);

  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [evidenceFor, setEvidenceFor] = useState(null); // record

  const countries = useMemo(() => {
    const set = new Set();
    (rawItems||[]).forEach(r => set.add(r.country));
    return Array.from(set).filter(Boolean).sort();
  }, [rawItems]);

  const visible = useMemo(() => items.filter(x => {
    const okStage = stageFilter === "all" || x.stage === stageFilter;
    const okStatus = statusFilter === "all" || x.status === statusFilter;
    const ctry = x.country;
    const okCountry = countryFilter === "all" || ctry === countryFilter;
    return okStage && okStatus && okCountry;
  }), [items, stageFilter, statusFilter, countryFilter]);

  function setStatus(id, status) { setItems(rawItems.map(x => x.id === id ? { ...x, status, lockExpiry: status === 'approved' ? addDays(x.submittedAt, 60) : x.lockExpiry } : x)); }
  function remove(id) { if (!confirm("Delete this registration? This cannot be undone.")) return; setItems(rawItems.filter(x => x.id !== id)); }

  function rowTone(x){
    const approaching = x.status === 'approved' && daysUntil(x.lockExpiry) <= 7 && daysUntil(x.lockExpiry) >= 0;
    if (approaching) return 'orange';
    if (x.status === 'approved') return 'green';
    if (x.status === 'rejected' || x.stage === 'lost') return 'red';
    if (x.status === 'pending') return 'blue';
    return 'gray';
  }
  const toneToRow = { green: 'bg-green-50', red: 'bg-red-50', blue: 'bg-blue-50', orange: 'bg-orange-50', gray: '' };

  return (
    <Card>
      <CardHeader
        title="Admin – Registrations"
        right={
          <div className="flex items-center gap-2">
            <button onClick={()=>exportCSV(visible)} className={`px-3 py-2 rounded-xl text-white text-sm ${BRAND.primaryBtn}`}>Export CSV</button>
            <button onClick={()=>onSyncMany(visible)} className={`px-3 py-2 rounded-xl text-white text-sm ${BRAND.primaryBtn}`}>Sync Visible to Google Sheets</button>
          </div>
        }
      />
      <CardBody>
        <div className="grid md:grid-cols-6 gap-3 mb-4">
          <Input placeholder="Search reseller, customer, solution…" value={search} onChange={e=>setSearch(e.target.value)} />
          <Select value={currencyFilter} onChange={e=>setCurrencyFilter(e.target.value)}>
            <option>All</option>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}>
            <option value="all">All Stages</option>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
          <Select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
          <Select value={countryFilter} onChange={e=>setCountryFilter(e.target.value)}>
            <option value="all">All Countries</option>
            {countries.map(ct => <option key={ct} value={ct}>{ct}</option>)}
          </Select>
          {GOOGLE_SHEET_VIEW_URL ? (
            <a href={GOOGLE_SHEET_VIEW_URL} target="_blank" className="text-sm underline text-sky-700 self-center">Open Sheet</a>
          ) : (<div />)}
        </div>

        <div className="flex items-center justify-between mt-2">
          <h3 className="text-lg font-semibold">Opportunities Map</h3>
        {typeof AdminSettings === 'function' && (
          <AdminSettings open={settingsOpen} onClose={()=> setSettingsOpen(false)} ratesAUD={ratesAUD} onSave={saveFxRates} saving={savingFx} />
        )}
        {adminError && <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{adminError}</div>}
          <button onClick={pullAll} className={`px-3 py-1.5 rounded-lg text-white ${BRAND.primaryBtn}`}>Refresh from Sheets</button>
        </div>
        <AdminGeoMap items={(items || []).filter(x => {
          const okSearch = !search || JSON.stringify(x).toLowerCase().includes(search.toLowerCase());
          const okCur = !currencyFilter || String(x.currency || '').toLowerCase() === String(currencyFilter).toLowerCase();
          return okSearch && okCur;
        })} ratesAUD={ratesAUD} />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-3 text-left">Submitted</th>
                <th className="p-3 text-left">Reseller</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Country</th>
                <th className="p-3 text-left">Solution</th>
                <th className="p-3 text-left">Evidence</th>
                <th className="p-3 text-left">Value</th>
                <th className="p-3 text-left">Stage</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Exp Close</th>
                <th className="p-3 text-left">Lock Expiry</th>
                <th className="p-3 text-left">Synced</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(x => (
                <tr key={x.id} className={`border-b ${toneToRow[rowTone(x)]}`}>
                  <td className="p-3 whitespace-nowrap">{x.submittedAt}</td>
                  <td className="p-3">
                    <div className="font-medium">{x.resellerName}</div>
                    <div className="text-xs text-gray-500">{x.resellerContact} · {x.resellerEmail}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{x.confidential ? "(Confidential)" : x.customerName}</div>
                    <div className="text-xs text-gray-500">{x.customerLocation}</div>
                  </td>
                  <td className="p-3">{x.country || '-'}</td>
                  <td className="p-3">{x.solution}</td>
                  <td className="p-3">
                    {(x.evidenceLinks?.length || x.evidenceFiles?.length) ? (
                      <button className="underline text-sky-700" onClick={()=>setEvidenceFor(x)}>View</button>
                    ) : '—'}
                  </td>
                  <td className="p-3 whitespace-nowrap">{x.currency} {toCurrency(x.value)}</td>
                  <td className="p-3"><Badge tone="blue">{STAGES.find(s=>s.key===x.stage)?.label || x.stage}</Badge></td>
                  <td className="p-3">
                    {x.status === 'pending' && <Badge>Pending</Badge>}
                    {x.status === 'approved' && <Badge tone="green">Approved</Badge>}
                    {x.status === 'rejected' && <Badge tone="red">Rejected</Badge>}
                  </td>
                  <td className="p-3">{x.expectedCloseDate}</td>
                  <td className="p-3">{x.lockExpiry || '-'}</td>
                  <td className="p-3">{x.syncedAt ? <Badge tone="green">Yes</Badge> : <Badge>No</Badge>}</td>
                  <td className="p-3 space-x-2 whitespace-nowrap">
                    {onSyncOne && (
                      <button
                        onClick={()=>onSyncOne(x)}
                        disabled={!!x.syncedAt}
                        className={`px-2.5 py-1.5 rounded-lg ${x.syncedAt ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-sky-700 text-white'}`}
                        title={x.syncedAt ? `Synced at ${x.syncedAt}` : 'Sync this row to Google Sheets'}
                      >{x.syncedAt ? 'Synced' : 'Sync'}</button>
                    )}
                    <button onClick={()=>setStatus(x.id,'approved')} className="px-2.5 py-1.5 rounded-lg bg-green-600 text-white">Approve</button>
                    <button onClick={()=>setStatus(x.id,'rejected')} className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white">Reject</button>
                    <button onClick={()=>remove(x.id)} className="px-2.5 py-1.5 rounded-lg bg-gray-200">Delete</button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-6 text-center text-gray-500">No registrations match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Modal open={!!evidenceFor} onClose={()=>setEvidenceFor(null)} title={`Evidence – ${evidenceFor?.id || ''}`}>
          {evidenceFor && (
            <div className="space-y-4">
              <div>
                <div className="font-medium mb-1">Uploaded files</div>
                {(evidenceFor.evidenceFiles||[]).length ? (
                  <ul className="list-disc pl-6 text-sm">
                    {evidenceFor.evidenceFiles.map((f,i)=>(<li key={i}>{typeof f==='string'?f:(f?.name||'file')}</li>))}
                  </ul>
                ) : <div className="text-sm text-gray-500">No file names stored (files aren’t kept client-side after submit).</div>}
                <p className="text-xs text-gray-500 mt-1">New submissions can automatically email attachments to Aptella if the reseller opts in.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={()=>mailto(APTELLA_EVIDENCE_EMAIL, `Evidence for ${evidenceFor.id}`, `Links:\n${(evidenceFor.evidenceLinks||[]).join('\n')}\n\nCustomer: ${evidenceFor.customerName}\nReseller: ${evidenceFor.resellerName}`)} className={`px-3 py-2 rounded-xl text-white text-sm ${BRAND.primaryBtn}`}>Email links to Aptella</button>
                {evidenceFor.resellerEmail && (
                  <button onClick={()=>mailto(evidenceFor.resellerEmail, `Request files for registration ${evidenceFor.id}`, `Hi ${evidenceFor.resellerContact||''},\n\nPlease reply with the missing evidence files for your registration ${evidenceFor.id}.\nCustomer: ${evidenceFor.customerName}\nThanks!`)} className="px-3 py-2 rounded-xl bg-gray-200 text-sm">Request files from reseller</button>
                )}
              </div>
            </div>
          )}
        </Modal>
      </CardBody>
    </Card>
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
