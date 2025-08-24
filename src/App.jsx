import React, { useEffect, useMemo, useRef, useState } from "react";

/******************** BRAND ********************/
const BRAND = {
  primary: "#0e3446",
  primaryBtn: "bg-[#0e3446] hover:bg-[#0b2938]",
  accent: "#f0a03a",
};

/******************** GLOBAL UTILS (idempotent) ********************/
(() => {
  const G = typeof window !== "undefined" ? window : globalThis;
  G.todayLocalISO ??= function () {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  G.addDays ??= function (dateISO, days) {
    const d = new Date(dateISO);
    d.setDate(d.getDate() + Number(days || 0));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  G.withinNext60Days ??= function (dateISO) {
    if (!dateISO) return false;
    const today = new Date(G.todayLocalISO());
    const target = new Date(dateISO);
    const diffDays = (target - today) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 60;
  };
  G.daysUntil ??= function (dateISO) {
    if (!dateISO) return 0;
    const today = new Date(G.todayLocalISO());
    const target = new Date(dateISO);
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
  };
})();

/******************** CONSTANTS ********************/
const DEFAULT_LAT = -6.2088; // Jakarta
const DEFAULT_LNG = 106.8456;
const CURRENCIES = ["SGD", "IDR", "MYR", "PHP", "AUD", "USD"];
const STAGES = [
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];
const PROB_BY_STAGE = { qualified: 35, proposal: 55, negotiation: 70, won: 100, lost: 0 };
const SUPPORT_OPTIONS = [
  "Pre-sales engineer",
  "Demo / loan unit",
  "Pricing exception",
  "Marketing materials",
  "Partner training",
  "On-site customer visit",
  "Extended lock request",
];
const XGRIDS_SOLUTIONS = ["Xgrids L2 PRO", "Xgrids K1", "Xgrids PortalCam", "Xgrids Drone Kit"];
const APTELLA_EVIDENCE_EMAIL = "evidence@aptella.com";

/******************** COMMON UI ********************/
const Card = ({ children }) => (
  <div className="bg-white rounded-2xl border shadow-sm p-5">{children}</div>
);
const CardHeader = ({ title, subtitle, right }) => (
  <div className="mb-4 flex items-center justify-between">
    <div>
      <div className="text-lg font-semibold">{title}</div>
      {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
    </div>
    <div>{right}</div>
  </div>
);
const CardBody = ({ children }) => <div>{children}</div>;
const Label = ({ children, required, htmlFor }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
    {children}{required ? " *" : ""}
  </label>
);
const Input = (p) => (
  <input {...p} className={(p.className || "") + " border rounded-md px-2 py-2 w-full"} />
);
const Select = (p) => (
  <select {...p} className={(p.className || "") + " border rounded-md px-2 py-2 w-full"} />
);
const Textarea = (p) => (
  <textarea {...p} className={(p.className || "") + " border rounded-md px-2 py-2 w-full"} />
);

/******************** HELPERS ********************/
function toFloatOrBlank(v) {
  const s = String(v ?? "").trim();
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : "";
}

/******************** SUBMISSION FORM ********************/
function SubmissionForm({ onSave, items, onSyncOne }) {
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
    lat: String(DEFAULT_LAT), // keep as strings in UI
    lng: String(DEFAULT_LNG),
    industry: "",
    currency: "SGD",
    value: "",
    solution: "",
    stage: "qualified",
    probability: PROB_BY_STAGE["qualified"],
    expectedCloseDate: window.todayLocalISO(),
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
  const [dupWarning, setDupWarning] = useState("");

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }
  const handleMultiToggle = (listName, option) =>
    setForm((f) => {
      const set = new Set(f[listName]);
      set.has(option) ? set.delete(option) : set.add(option);
      return { ...f, [listName]: Array.from(set) };
    });

  useEffect(() => {
    setForm((f) => ({ ...f, probability: PROB_BY_STAGE[f.stage] ?? f.probability }));
  }, [form.stage]);

  // duplicate detection (soft)
  useEffect(() => {
    if (!form.customerName || !form.solution || !form.expectedCloseDate) {
      setDupWarning("");
      return;
    }
    const target = new Date(form.expectedCloseDate);
    const min = new Date(target);
    min.setDate(min.getDate() - 14);
    const max = new Date(target);
    max.setDate(max.getDate() + 14);
    const hit = (items || []).find(
      (x) =>
        x.customerName?.trim().toLowerCase() === form.customerName.trim().toLowerCase() &&
        x.solution?.trim().toLowerCase() === form.solution.trim().toLowerCase() &&
        new Date(x.expectedCloseDate) >= min && new Date(x.expectedCloseDate) <= max
    );
    setDupWarning(
      hit ? `Potential duplicate: ${hit.id} (${hit.customerName}, ${hit.expectedCloseDate})` : ""
    );
  }, [form.customerName, form.solution, form.expectedCloseDate, items]);

  function validate() {
    const e = {};
    if (!form.resellerName) e.resellerName = "Required";
    if (!form.resellerContact) e.resellerContact = "Required";
    if (!form.resellerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail)) e.resellerEmail = "Valid email required";
    if (!form.customerName) e.customerName = "Required";
    if (!form.city) e.city = "City required";
    if (!form.country) e.country = "Country required";
    if (!form.solution) e.solution = "Required";
    if (!form.value || Number(form.value) <= 0) e.value = "Enter a positive amount";
    if (!form.expectedCloseDate || !window.withinNext60Days(form.expectedCloseDate)) e.expectedCloseDate = "Must be within the next 60 days";
    if (!form.accept) e.accept = "You must accept the terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    const row = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      submittedAt: window.todayLocalISO(),
      status: "pending",
      lockExpiry: "",
      syncedAt: "",
      ...form,
      lat: toFloatOrBlank(form.lat),
      lng: toFloatOrBlank(form.lng),
      value: Number(form.value),
      probability: Number(form.probability),
      customerLocation: `${form.city || ""}${form.country ? ", " + form.country : ""}`,
    };

    // Keep local copy without heavy files
    const localRecord = { ...row };

    // Submit to GAS
    if (typeof onSyncOne === "function") {
      const res = await onSyncOne(localRecord);
      if (!res?.ok) alert(`Submitted locally. Google Sheets sync failed: ${res?.reason || "unknown"}`);
    }

    onSave && onSave(localRecord);
    alert("Deal submitted.");
  }

  return (
    <Card>
      <CardHeader
        title="Register Upcoming Deal (within 60 days)"
        subtitle="Provide details below. Fields marked * are mandatory."
      />
      <CardBody>
        <form onSubmit={submit} className="grid gap-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="resellerCountry" required>Reseller Country</Label>
              <Select id="resellerCountry" name="resellerCountry" value={form.resellerCountry} onChange={handleChange}>
                <option>Indonesia</option>
                <option>Malaysia</option>
                <option>Philippines</option>
                <option>Singapore</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerLocation" required>Reseller Location</Label>
              <Input id="resellerLocation" name="resellerLocation" value={form.resellerLocation} onChange={handleChange} placeholder="e.g., Jakarta" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select id="currency" name="currency" value={form.currency} onChange={handleChange}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>

          {dupWarning && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-900 p-3 text-sm">
              {dupWarning}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="resellerName" required>Reseller company</Label>
              <Input id="resellerName" name="resellerName" value={form.resellerName} onChange={handleChange} />
              {errors.resellerName && <p className="text-xs text-red-600">{errors.resellerName}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerContact" required>Primary contact</Label>
              <Input id="resellerContact" name="resellerContact" value={form.resellerContact} onChange={handleChange} />
              {errors.resellerContact && <p className="text-xs text-red-600">{errors.resellerContact}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerEmail" required>Contact email</Label>
              <Input id="resellerEmail" name="resellerEmail" type="email" value={form.resellerEmail} onChange={handleChange} />
              {errors.resellerEmail && <p className="text-xs text-red-600">{errors.resellerEmail}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resellerPhone">Contact phone</Label>
              <Input id="resellerPhone" name="resellerPhone" value={form.resellerPhone} onChange={handleChange} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="customerName" required>Customer name</Label>
              <Input id="customerName" name="customerName" value={form.customerName} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerLocation">Reseller location</Label>
              <Input id="customerLocation" name="customerLocation" value={form.resellerLocation} onChange={(e)=>setForm(f=>({ ...f, resellerLocation: e.target.value }))} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city" required>Customer City</Label>
              <Input id="city" name="city" value={form.city} onChange={(e)=>setForm(f=>({ ...f, city: e.target.value }))} />
              {errors.city && <p className="text-xs text-red-600">{errors.city}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country" required>Customer Country</Label>
              <Select id="country" name="country" value={form.country} onChange={(e)=>setForm(f=>({ ...f, country: e.target.value }))}>
                <option value="">Select country</option>
                <option>Indonesia</option>
                <option>Singapore</option>
                <option>Malaysia</option>
                <option>Philippines</option>
              </Select>
              {errors.country && <p className="text-xs text-red-600">{errors.country}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Map option (paste lat, lng or click helper)</Label>
              <div className="flex gap-2">
                <Input placeholder="lat" value={form.lat} onChange={(e)=>setForm(f=>({ ...f, lat: e.target.value }))} />
                <Input placeholder="lng" value={form.lng} onChange={(e)=>setForm(f=>({ ...f, lng: e.target.value }))} />
                <a
                  className={`px-3 py-2 rounded-xl text-white text-sm ${BRAND.primaryBtn}`}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((form.city||"")+","+(form.country||""))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Map
                </a>
              </div>
              <p className="text-xs text-gray-500">Tip: use the link to pick a point, copy coordinates back here.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2 md:col-span-2">
              <Label required>Solution offered (Xgrids)</Label>
              <div className="grid gap-2">
                <Select value={form.solution} onChange={(e)=>setForm(f=>({ ...f, solution: e.target.value }))}>
                  <option value="">Select an Xgrids solution</option>
                  {XGRIDS_SOLUTIONS.map((s)=> <option key={s} value={s}>{s}</option>)}
                </Select>
                <a className="text-sky-700 underline text-xs" href="https://www.aptella.com/asia/product-brands/xgrids-asia/" target="_blank" rel="noreferrer">Learn about Xgrids solutions</a>
              </div>
              {errors.solution && <p className="text-xs text-red-600">{errors.solution}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expectedCloseDate" required>Expected close date</Label>
              <Input id="expectedCloseDate" name="expectedCloseDate" type="date" value={form.expectedCloseDate} onChange={handleChange} />
              {errors.expectedCloseDate && <p className="text-xs text-red-600">{errors.expectedCloseDate}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" value={form.industry} onChange={handleChange} placeholder="Construction, Mining, …" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select id="currency" name="currency" value={form.currency} onChange={handleChange}>
                {CURRENCIES.map((c)=> <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="value" required>Deal value</Label>
              <Input id="value" name="value" type="number" step="0.01" min="0" value={form.value} onChange={handleChange} />
              {errors.value && <p className="text-xs text-red-600">{errors.value}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="stage">Sales stage</Label>
              <Select id="stage" name="stage" value={form.stage} onChange={handleChange}>
                {STAGES.map((s)=> <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Probability (%)</Label>
              <Input type="number" min="0" max="100" value={form.probability} onChange={(e)=>setForm(f=>({ ...f, probability: Number(e.target.value) }))} />
            </div>
            <div className="grid gap-2">
              <Label>Competitors</Label>
              <Input placeholder="Comma-separated (optional)" value={(form.competitors||[]).join(", ")} onChange={(e)=>setForm(f=>({ ...f, competitors: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) }))} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Support requested</Label>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SUPPORT_OPTIONS.map((opt)=> (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.supports.includes(opt)} onChange={()=>handleMultiToggle("supports", opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Evidence (required)</Label>
            <div className="text-xs text-gray-600">Attach files via email after submission to {APTELLA_EVIDENCE_EMAIL} if required.</div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={4} value={form.notes} onChange={handleChange} placeholder="Key requirements, technical scope, constraints, decision process, etc." />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="confidential" checked={!!form.confidential} onChange={(e)=>setForm(f=>({ ...f, confidential: e.target.checked }))} />
              Mark customer name confidential to other resellers
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="remindersOptIn" checked={!!form.remindersOptIn} onChange={(e)=>setForm(f=>({ ...f, remindersOptIn: e.target.checked }))} />
              Send me reminders for updates
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="accept" checked={!!form.accept} onChange={(e)=>setForm(f=>({ ...f, accept: e.target.checked }))} />
              I confirm details are accurate and consent to data storage for deal management
            </label>
          </div>
          {errors.accept && <p className="text-xs text-red-600 -mt-3">{errors.accept}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" className={`px-4 py-2 rounded-xl text-white ${BRAND.primaryBtn}`}>Submit Registration</button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/******************** ADMIN SETTINGS (FX) ********************/
function SettingsDrawer({ open, onClose, ratesAUD = {}, onSave, saving }) {
  const [local, setLocal] = useState(ratesAUD || {});
  useEffect(() => setLocal(ratesAUD || {}), [ratesAUD, open]);
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
          {entries.map(([cur, val]) => (
            <div key={cur} className="grid grid-cols-3 gap-2 items-center">
              <input className="border rounded-md px-2 py-1 uppercase" value={cur} onChange={(e)=>{
                const newCur = e.target.value.toUpperCase();
                setLocal((prev)=>{ const { [cur]: _omit, ...rest } = prev; return { ...rest, [newCur]: val }; });
              }} />
              <input className="border rounded-md px-2 py-1" type="number" step="0.000001" value={val} onChange={(e)=> setLocal((prev)=> ({ ...prev, [cur]: Number(e.target.value) }))} />
              <button className="text-red-600 text-sm" onClick={()=> setLocal((prev)=>{ const cp={...prev}; delete cp[cur]; return cp; })}>Remove</button>
            </div>
          ))}
          <button className="text-sm px-3 py-1 rounded-md bg-gray-100" onClick={()=> setLocal((prev)=> ({ ...prev, USD: prev.USD || 0.67 }))}>Add Row</button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100">Cancel</button>
          <button disabled={saving} onClick={()=> onSave(local)} className={`px-3 py-1.5 rounded-lg text-white ${BRAND.primaryBtn}`}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

/******************** ADMIN PANEL ********************/
function AdminPanel({ items, rawItems, setItems, onSyncMany }) {
  const [country, setCountry] = useState("All");
  const [ratesAUD, setRatesAUD] = useState({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingFx, setSavingFx] = useState(false);

  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markersLayer = useRef(null);

  const listUrl = (window.GOOGLE_APPS_SCRIPT_URL || "") + "?action=list";
  const fxUrl = (window.GOOGLE_APPS_SCRIPT_URL || "") + "?action=fx";

  const visible = useMemo(() => {
    const src = items || rawItems || [];
    return country === "All" ? src : src.filter((x) => (x.country || "") === country);
  }, [items, rawItems, country]);

  useEffect(() => {
    // pull FX on mount (non-fatal if endpoint missing)
    (async () => {
      try {
        if (!window.GOOGLE_APPS_SCRIPT_URL) return;
        const r = await fetch(fxUrl);
        const j = await r.json().catch(() => null);
        if (j && j.ok && j.rates) setRatesAUD(j.rates);
      } catch (_) {}
    })();
  }, []);

  // init Leaflet (expects L global already loaded in index.html)
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapObj.current) return;
    if (!(window).L) return; // Leaflet not present
    const L = (window).L;
    const m = L.map(mapRef.current).setView([DEFAULT_LAT, DEFAULT_LNG], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
    markersLayer.current = L.layerGroup().addTo(m);
    mapObj.current = m;

    // keep size correct
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(mapRef.current);
    setTimeout(()=>m.invalidateSize(), 50);
    setTimeout(()=>m.invalidateSize(), 150);
    setTimeout(()=>m.invalidateSize(), 400);

    return () => ro.disconnect();
  }, []);

  // draw markers when data/filter changes
  useEffect(() => {
    const L = (window).L;
    const m = mapObj.current;
    if (!L || !m || !markersLayer.current) return;
    markersLayer.current.clearLayers();
    const toAdd = [];
    visible.forEach((r) => {
      const la = parseFloat(r.lat); const ln = parseFloat(r.lng);
      if (!isFinite(la) || !isFinite(ln)) return;
      const color = statusColor(r);
      const circle = L.circleMarker([la, ln], { radius: 8, color, fillColor: color, fillOpacity: 0.8, weight: 1 });
      circle.bindPopup(`<strong>${(r.customerName||'')}</strong><br/>${(r.city||'')}, ${(r.country||'')}<br/>${(r.solution||'')}<br/>${(r.currency||'')} ${Number(r.value||0).toLocaleString()}`);
      toAdd.push(circle);
    });
    toAdd.forEach((c) => c.addTo(markersLayer.current));
    if (toAdd.length) {
      try { m.fitBounds(L.featureGroup(toAdd).getBounds().pad(0.2)); } catch (_) {}
    }
  }, [visible]);

  async function handleRefresh() {
    try {
      if (!window.GOOGLE_APPS_SCRIPT_URL) throw new Error('Apps Script URL missing');
      const r = await fetch(listUrl);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'list failed');
      setItems(j.data || []);
    } catch (e) {
      alert(`Refresh failed: ${e.message || e}`);
    }
  }

  function exportCSV(rows) {
    const cols = [
      'id','submittedAt','resellerCountry','resellerLocation','resellerName','resellerContact','resellerEmail','resellerPhone','customerName','customerLocation','city','country','lat','lng','industry','currency','value','solution','stage','probability','expectedCloseDate','status','lockExpiry','syncedAt','confidential','remindersOptIn','supports','competitors','notes','evidenceLinks','updates'
    ];
    const head = cols.join(',');
    const body = (rows||[]).map(x => cols.map(k => {
      const val = String(x[k] ?? '').replace(/\n/g, ' ').replace(/"/g,'""');
      return `"${val}"`;
    }).join(',')).join('\n');
    const blob = new Blob([head+'\n'+body], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'registrations.csv'; a.click();
    URL.revokeObjectURL(a.href);
  }

  function statusColor(r){
    const s = String(r.status||'').toLowerCase();
    const days = window.daysUntil && r.expectedCloseDate ? window.daysUntil(r.expectedCloseDate) : 9999;
    if (s === 'accepted') return '#16a34a'; // green
    if (s === 'closed' || s === 'lost') return '#dc2626'; // red
    if (days <= 60) return '#f59e0b'; // orange
    return '#2563eb'; // blue default
  }

  async function saveFx(newRates){
    setSavingFx(true);
    try{
      if (!window.GOOGLE_APPS_SCRIPT_URL) throw new Error('Apps Script URL missing');
      const r = await fetch(fxUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ratesAUD: newRates }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'fx save failed');
      setRatesAUD(newRates);
      setSettingsOpen(false);
    }catch(e){
      alert(`Save FX failed: ${e.message||e}`);
    }finally{ setSavingFx(false); }
  }

  return (
    <Card>
      <CardHeader
        title="Admin Tools"
        right={
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className={`px-3 py-2 rounded-lg text-white ${BRAND.primaryBtn}`}>Refresh</button>
            <button onClick={()=> exportCSV(visible)} className="px-3 py-2 rounded-lg bg-gray-100">Export CSV</button>
            <button onClick={()=> onSyncMany && onSyncMany(visible)} className="px-3 py-2 rounded-lg bg-gray-100">Sync Visible</button>
            <button onClick={()=> setSettingsOpen(true)} className="px-3 py-2 rounded-lg text-white" style={{ background: BRAND.accent }}>Settings</button>
          </div>
        }
      />
      <CardBody>
        <div className="flex items-center gap-2 mb-3">
          <select value={country} onChange={(e)=>setCountry(e.target.value)} className="border rounded-md px-2 py-2">
            <option>All</option>
            {Array.from(new Set((items||rawItems||[]).map(x=>x.country).filter(Boolean))).sort().map(c=> <option key={c}>{c}</option>)}
          </select>
        </div>
        <div ref={mapRef} style={{height:560, minHeight:560}} className="w-full rounded-xl border" />
      </CardBody>
      <SettingsDrawer open={settingsOpen} onClose={()=>setSettingsOpen(false)} ratesAUD={ratesAUD} onSave={saveFx} saving={savingFx} />
    </Card>
  );
}

/******************** ROOT ********************/
function AptellaRoot(){
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('reseller');

  const syncOne = async (row) => {
    const base = (window.GOOGLE_APPS_SCRIPT_URL || "");
    if (!base) return { ok:false, reason:'Google Apps Script URL missing' };
    try{
      const res = await fetch(`${base}?action=submit`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(row) });
      const text = await res.text();
      let json = null; try { json = JSON.parse(text); } catch {}
      if (!res.ok || !json || json.ok !== true) return { ok:false, reason: (json && json.error) ? json.error : `HTTP ${res.status}: ${text}` };
      setItems(prev => prev.map(r => r.id === row.id ? { ...r, syncedAt: window.todayLocalISO() } : r));
      return { ok:true };
    }catch(e){ return { ok:false, reason: e.message || String(e) }; }
  };

  const syncMany = async (rows=[]) => { for (const r of rows) { await syncOne(r); } };

  return (
    <div className="min-h-screen" style={{ background: "#f7fafc" }}>
      <nav className="brand-nav w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: BRAND.primary }}>Aptella</span>
            <span className="text-slate-700 font-medium">Reseller Deal Registration</span>
          </div>
          <div className="flex items-center gap-2">
            <button className={`px-3 py-2 rounded-lg ${tab==='reseller' ? 'bg-[#0e3446] text-white' : 'bg-gray-100 text-[#0e3446]'}`} onClick={()=>setTab('reseller')}>Reseller</button>
            <button className={`px-3 py-2 rounded-lg ${tab==='admin' ? 'bg-[#0e3446] text-white' : 'bg-gray-100 text-[#0e3446]'}`} onClick={()=>setTab('admin')}>Admin</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4">
        {tab === 'reseller' ? (
          <SubmissionForm items={items} onSave={(r)=>setItems(prev=>[...prev, r])} onSyncOne={syncOne} />
        ) : (
          <AdminPanel items={items} rawItems={items} setItems={setItems} onSyncMany={syncMany} />
        )}
      </main>
    </div>
  );
}

export default AptellaRoot;
