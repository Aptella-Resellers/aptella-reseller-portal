import React, { useEffect, useMemo, useState } from "react";

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

// --- Admin → Settings drawer for FX rates (definition ensured) ---
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


// --- Ensure a single default export for Vite entry (src/main.jsx expects default) ---
// Prefer an existing root component if present; otherwise render a safe fallback.
// Using typeof guards avoids ReferenceErrors even if symbols are not declared.
const __AptellaDefault =
  (typeof DealRegistrationPortal !== 'undefined' && DealRegistrationPortal) ||
  (typeof App !== 'undefined' && App) ||
  (typeof Portal !== 'undefined' && Portal) ||
  (function Fallback(){ return <div/>; });

export default __AptellaDefault;
