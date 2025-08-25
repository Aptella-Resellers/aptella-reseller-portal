import React, { useEffect, useMemo, useRef, useState } from 'react'

// ====== Leaflet & CSS (Vite-friendly) ======
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

// Fix default marker icons (Vite build)
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })

// ====== Constants & Branding ======
const GOOGLE_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec'

const ADMIN_PASSWORD = 'Aptella2025!' // frontend-only gate

const BRAND = {
  navy: '#0E3446',
  navyDark: '#0B2938',
  orange: '#F0A03A',
  bgGrad:
    'linear-gradient(180deg, rgba(14,52,70,0.06) 0%, rgba(14,52,70,0.02) 100%)',
  primaryBtn: 'bg-[#0E3446] hover:bg-[#0B2938]',
}

const XGRIDS_SOLUTIONS = [
  'Xgrids L2 PRO',
  'Xgrids K1',
  'Xgrids PortalCam',
  'Xgrids Drone Kit',
  'Other…',
]

const INDUSTRIES = [
  'Architecture/Engineering',
  'Construction',
  'Mining',
  'Oil & Gas',
  'Utilities',
  'Telecom',
  'Government',
  'Education',
  'Manufacturing',
  'Transport/Logistics',
  'Other',
]

const STAGES = [
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
]

const PROB_BY_STAGE = {
  qualified: 35,
  proposal: 55,
  negotiation: 70,
  won: 100,
  lost: 0,
}

const CURRENCIES = ['SGD', 'IDR', 'MYR', 'PHP', 'AUD', 'USD']

const CAPITALS = {
  Indonesia: { city: 'Jakarta', lat: -6.2088, lng: 106.8456, cur: 'IDR' },
  Singapore: { city: 'Singapore', lat: 1.3521, lng: 103.8198, cur: 'SGD' },
  Malaysia: { city: 'Kuala Lumpur', lat: 3.139, lng: 101.6869, cur: 'MYR' },
  Philippines: { city: 'Manila', lat: 14.5995, lng: 120.9842, cur: 'PHP' },
}

const SUPPORT_OPTIONS = [
  'Pre-sales engineer',
  'Demo / loan unit',
  'Pricing exception',
  'Marketing materials',
  'Partner training',
  'On-site customer visit',
  'Extended lock request',
]

// Bahasa mapping (only keys we render as labels)
const T_ID = {
  resellerCountry: 'Negara Anda',
  resellerLocation: 'Lokasi Reseller',
  currency: 'Mata Uang',
  resellerCompany: 'Perusahaan Reseller',
  primaryContact: 'Kontak Utama',
  email: 'Email',
  phone: 'Telepon',
  customerName: 'Nama Pelanggan',
  customerCity: 'Kota Pelanggan',
  customerCountry: 'Negara Pelanggan',
  mapOption: 'Opsi peta (tempel lat, lng atau klik pembantu)',
  tipMap:
    'Tip: gunakan tautan untuk memilih titik, salin koordinat kembali ke sini.',
  expectedCloseDate: 'Perkiraan tanggal penutupan',
  solutionOffered: 'Solusi yang ditawarkan (Xgrids)',
  industry: 'Industri',
  salesStage: 'Tahap penjualan',
  probability: 'Probabilitas (%)',
  dealValue: 'Nilai transaksi',
  competitors: 'Pesaing',
  supportRequested: 'Dukungan yang diminta',
  evidenceRequired: 'Bukti (wajib)',
  emailEvidence: 'Kirim file terlampir ke Aptella (admin.asia@aptella.com)',
  notes: 'Catatan',
  reminders: 'Kirimkan pengingat untuk pembaruan',
  confirm:
    'Saya mengonfirmasi detail akurat dan setuju penyimpanan data untuk pengelolaan deal',
  submit: 'Kirim Pendaftaran',
  reset: 'Atur Ulang',
}

// ====== Utilities ======
function pad2(n) {
  return String(n).padStart(2, '0')
}
function todayLocalISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const dd = pad2(d.getDate())
  return `${y}-${m}-${dd}`
}
function toLocalYMD(date) {
  // date: Date or Y-M-D string
  const d = typeof date === 'string' ? new Date(date) : new Date(date)
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const dd = pad2(d.getDate())
  return `${y}-${m}-${dd}`
}
function addDays(ymd, days) {
  const d = new Date(ymd)
  d.setDate(d.getDate() + Number(days || 0))
  return toLocalYMD(d)
}
function withinNext60Days(ymd) {
  if (!ymd) return false
  const today = new Date(todayLocalISO())
  const target = new Date(ymd)
  const diff = (target - today) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 60
}
function daysUntil(ymd) {
  if (!ymd) return 0
  const today = new Date(todayLocalISO())
  const target = new Date(ymd)
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ====== GAS helpers ======
async function gasGet(action, params = {}) {
  const url = new URL(GOOGLE_APPS_SCRIPT_URL)
  url.searchParams.set('action', action)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { method: 'GET' })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {}
  if (!res.ok || (json && json.ok === false)) {
    const reason = (json && json.error) || `HTTP ${res.status}: ${text}`
    throw new Error(reason)
  }
  return json || { ok: true }
}
async function gasPost(action, bodyObj) {
  const url = new URL(GOOGLE_APPS_SCRIPT_URL)
  url.searchParams.set('action', action)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj || {}),
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {}
  if (!res.ok || (json && json.ok === false)) {
    const reason = (json && json.error) || `HTTP ${res.status}: ${text}`
    throw new Error(reason)
  }
  return json || { ok: true }
}

// ====== Small UI atoms ======
function Card({ children, className = '' }) {
  return (
    <div className={'card border border-slate-200 ' + className}>{children}</div>
  )
}
function SectionTitle({ children, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold">{children}</h2>
      {subtitle ? (
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      ) : null}
    </div>
  )
}
function Label({ htmlFor, required, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium text-slate-700 flex items-center gap-1"
    >
      {children}
      {required ? <span className="text-red-600">*</span> : null}
    </label>
  )
}
function Input(props) {
  return (
    <input
      {...props}
      className={
        'rounded-lg border-slate-300 focus:ring-[#0E3446] focus:border-[#0E3446] ' +
        (props.className || '')
      }
    />
  )
}
function Select(props) {
  return (
    <select
      {...props}
      className={
        'rounded-lg border-slate-300 focus:ring-[#0E3446] focus:border-[#0E3446] ' +
        (props.className || '')
      }
    />
  )
}
function Textarea(props) {
  return (
    <textarea
      {...props}
      className={
        'rounded-lg border-slate-300 focus:ring-[#0E3446] focus:border-[#0E3446] ' +
        (props.className || '')
      }
    />
  )
}

function Pill({ color, children }) {
  const cls =
    'px-2.5 py-1 rounded-full text-xs font-medium ' +
    (color || 'bg-slate-100 text-slate-700')
  return <span className={cls}>{children}</span>
}

function StatusPill({ status, lockExpiry }) {
  const soon = lockExpiry ? daysUntil(lockExpiry) : null
  const nearing = soon !== null && soon <= 7 && soon >= 0
  let color = 'bg-blue-100 text-blue-700'
  if (status === 'approved') color = 'bg-green-100 text-green-700'
  if (status === 'closed' || status === 'lost') color = 'bg-red-100 text-red-700'
  if (nearing && status === 'approved') color = 'bg-orange-100 text-orange-700'
  return <Pill color={color}>{status}</Pill>
}

// ====== Header / Nav ======
function Header({ tab, setTab, authed, onSignOut }) {
  const logoSrc = import.meta.env.BASE_URL + 'aptella-logo.png'
  return (
    <div
      className="sticky top-0 z-40 border-b"
      style={{ background: BRAND.bgGrad, borderColor: '#e5e7eb' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logoSrc}
            alt="Aptella"
            className="h-10 w-10 rounded-md ring-1 ring-slate-200"
          />
          <div>
            <div className="text-[13px] text-slate-500">
              Master Distributor • <span className="font-semibold">Xgrids</span>
            </div>
            <div className="font-semibold text-[16px] text-[#0E3446]">
              Reseller Deal Registration
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <button
            className={
              'px-3 py-2 rounded-xl ' +
              (tab === 'reseller'
                ? 'text-white ' + BRAND.primaryBtn
                : 'bg-slate-100 text-[#0E3446]')
            }
            onClick={() => setTab('reseller')}
          >
            Reseller
          </button>
          <button
            className={
              'px-3 py-2 rounded-xl ' +
              (tab === 'admin'
                ? 'text-white ' + BRAND.primaryBtn
                : 'bg-slate-100 text-[#0E3446]')
            }
            onClick={() => setTab('admin')}
          >
            Admin
          </button>
          {authed ? (
            <button
              className="px-3 py-2 rounded-xl bg-slate-100"
              onClick={onSignOut}
            >
              Logout
            </button>
          ) : null}
        </nav>
      </div>
    </div>
  )
}

// ====== Admin Settings (FX Drawer) ======
function AdminSettings({ open, onClose, ratesAUD, onSave, saving }) {
  const [local, setLocal] = useState(ratesAUD || {})
  useEffect(() => setLocal(ratesAUD || {}), [ratesAUD, open])
  if (!open) return null
  const entries = Object.entries(local)

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-[min(720px,95vw)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#0E3446]">
            FX Rates to AUD
          </h3>
          <button onClick={onClose} className="px-2 py-1 rounded-lg bg-gray-100">
            Close
          </button>
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          <div className="grid grid-cols-3 gap-2 text-sm font-medium">
            <div>Currency</div>
            <div>Rate → AUD</div>
            <div></div>
          </div>
          {entries.map(([cur, val]) => (
            <div key={cur} className="grid grid-cols-3 gap-2 items-center">
              <input
                className="border rounded-md px-2 py-1 uppercase"
                value={cur}
                onChange={(e) => {
                  const newCur = e.target.value.toUpperCase()
                  setLocal((prev) => {
                    const { [cur]: _, ...rest } = prev
                    return { ...rest, [newCur]: val }
                  })
                }}
              />
              <input
                className="border rounded-md px-2 py-1"
                type="number"
                step="0.000001"
                value={val}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, [cur]: Number(e.target.value) }))
                }
              />
              <button
                className="text-red-600 text-sm"
                onClick={() =>
                  setLocal((prev) => {
                    const cp = { ...prev }
                    delete cp[cur]
                    return cp
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="text-sm px-3 py-1 rounded-md bg-gray-100"
            onClick={() =>
              setLocal((prev) => ({ ...prev, USD: prev.USD || 1.5 }))
            }
          >
            Add Row
          </button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100">
            Cancel
          </button>
          <button
            disabled={!!saving}
            onClick={() => onSave(local)}
            className={'px-3 py-1.5 rounded-lg text-white ' + BRAND.primaryBtn}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ====== Reseller Form ======
function ResellerForm({ onSaveLocal, onSyncOne }) {
  const [form, setForm] = useState({
    resellerCountry: '',
    resellerLocation: '',
    currency: '',
    resellerName: '',
    resellerContact: '',
    resellerEmail: '',
    resellerPhone: '',
    customerName: '',
    city: '',
    country: '',
    customerLocation: '',
    lat: '',
    lng: '',
    industry: '',
    value: '',
    solution: '',
    solutionOther: '',
    stage: 'qualified',
    probability: PROB_BY_STAGE.qualified,
    expectedCloseDate: addDays(todayLocalISO(), 14),
    supports: [],
    competitors: [],
    notes: '',
    evidenceFiles: [],
    remindersOptIn: false,
    accept: false,
  })
  const [errors, setErrors] = useState({})
  const isID = form.resellerCountry === 'Indonesia'

  useEffect(() => {
    setForm((f) => ({
      ...f,
      probability: PROB_BY_STAGE[f.stage] ?? f.probability,
    }))
  }, [form.stage])

  // Change defaults when resellerCountry changes (reseller section)
  useEffect(() => {
    const cfg = CAPITALS[form.resellerCountry]
    if (!cfg) return
    setForm((f) => ({
      ...f,
      resellerLocation: cfg.city,
      currency: cfg.cur,
    }))
  }, [form.resellerCountry])

  // Default customer lat/lng to capital when customer country changes
  useEffect(() => {
    const cfg = CAPITALS[form.country]
    if (!cfg) return
    setForm((f) => ({
      ...f,
      city: cfg.city,
      customerLocation: cfg.city + ', ' + f.country,
      lat: cfg.lat,
      lng: cfg.lng,
    }))
  }, [form.country])

  function t(key, fallback) {
    return isID ? T_ID[key] || fallback || key : fallback || key
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }
  function handleMultiToggle(listName, option) {
    setForm((f) => {
      const set = new Set(f[listName] || [])
      if (set.has(option)) set.delete(option)
      else set.add(option)
      return { ...f, [listName]: Array.from(set) }
    })
  }
  function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    setForm((f) => ({ ...f, evidenceFiles: files }))
  }

  function validate() {
    const e = {}
    if (!form.resellerCountry) e.resellerCountry = 'Required'
    if (!form.resellerLocation) e.resellerLocation = 'Required'
    if (!form.currency) e.currency = 'Required'
    if (!form.resellerName) e.resellerName = 'Required'
    if (!form.resellerContact) e.resellerContact = 'Required'
    if (
      !form.resellerEmail ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.resellerEmail)
    )
      e.resellerEmail = 'Valid email required'
    if (!form.customerName) e.customerName = 'Required'
    if (!form.city) e.city = 'Required'
    if (!form.country) e.country = 'Required'
    if (!form.solution || (form.solution === 'Other…' && !form.solutionOther))
      e.solution = 'Enter solution'
    if (!form.value || Number(form.value) <= 0) e.value = 'Positive amount'
    if (!form.expectedCloseDate || !withinNext60Days(form.expectedCloseDate))
      e.expectedCloseDate = 'Within next 60 days'
    if (!form.evidenceFiles || form.evidenceFiles.length === 0)
      e.evidence = 'Evidence file(s) required'
    if (!form.accept)
      e.accept =
        'You must confirm details are accurate and consent to data storage'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function filesToBase64(files) {
    const MAX_TOTAL = 20 * 1024 * 1024
    let total = 0
    const tasks = (files || []).map(
      (f) =>
        new Promise((resolve, reject) => {
          const fr = new FileReader()
          fr.onload = () => {
            const res = String(fr.result || '')
            const base64 = res.split(',')[1] || ''
            total += base64.length * 0.75
            resolve({
              name: f.name,
              type: f.type || 'application/octet-stream',
              data: base64,
            })
          }
          fr.onerror = reject
          fr.readAsDataURL(f)
        })
    )
    return Promise.all(tasks).then((arr) => {
      if (total > MAX_TOTAL) throw new Error('Attachments exceed 20MB total.')
      return arr
    })
  }

  async function submit(e) {
    e.preventDefault()
    if (!validate()) return

    const id = uid()
    const solutionStr =
      form.solution === 'Other…' ? form.solutionOther : form.solution

    const record = {
      id,
      submittedAt: todayLocalISO(),
      resellerCountry: form.resellerCountry,
      resellerLocation: form.resellerLocation,
      resellerName: form.resellerName,
      resellerContact: form.resellerContact,
      resellerEmail: form.resellerEmail,
      resellerPhone: form.resellerPhone,
      customerName: form.customerName,
      customerLocation: (form.city ? form.city + ', ' : '') + form.country,
      city: form.city,
      country: form.country,
      lat: Number(form.lat || 0),
      lng: Number(form.lng || 0),
      industry: form.industry,
      currency: form.currency,
      value: Number(form.value),
      solution: solutionStr,
      stage: form.stage,
      probability: Number(form.probability || 0),
      expectedCloseDate: form.expectedCloseDate,
      status: 'pending',
      lockExpiry: '', // set on approve in GAS if desired
      syncedAt: '',
      remindersOptIn: !!form.remindersOptIn,
      supports: form.supports,
      competitors: form.competitors,
      notes: form.notes,
      evidenceLinks: [], // keeping for compatibility
      updates: [],
    }

    // local save (optimistic)
    if (typeof onSaveLocal === 'function') onSaveLocal(record)

    try {
      const attachments = await filesToBase64(form.evidenceFiles)
      const payload = { record, attachments, email: 'admin.asia@aptella.com' }
      await gasPost('submit', payload)
      alert('Submitted and synced to Google Sheets.')
    } catch (err) {
      console.error(err)
      alert('Submitted locally. Google Sheets sync failed: ' + err.message)
    }

    // reset
    setForm({
      resellerCountry: '',
      resellerLocation: '',
      currency: '',
      resellerName: '',
      resellerContact: '',
      resellerEmail: '',
      resellerPhone: '',
      customerName: '',
      city: '',
      country: '',
      customerLocation: '',
      lat: '',
      lng: '',
      industry: '',
      value: '',
      solution: '',
      solutionOther: '',
      stage: 'qualified',
      probability: PROB_BY_STAGE.qualified,
      expectedCloseDate: addDays(todayLocalISO(), 14),
      supports: [],
      competitors: [],
      notes: '',
      evidenceFiles: [],
      remindersOptIn: false,
      accept: false,
    })
    const el = document.getElementById('evidenceFiles')
    if (el) el.value = ''
  }

  return (
    <Card className="p-6">
      <SectionTitle
        subtitle="Provide details below. Fields marked * are mandatory."
      >
        Register Upcoming Deal (within 60 days)
      </SectionTitle>

      <form onSubmit={submit} className="grid gap-6">
        {/* Country strip */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="resellerCountry" required>
              {t('resellerCountry', 'Reseller Country')}
            </Label>
            <Select
              id="resellerCountry"
              name="resellerCountry"
              value={form.resellerCountry}
              onChange={handleChange}
              required
            >
              <option value="">Select country</option>
              <option>Indonesia</option>
              <option>Malaysia</option>
              <option>Philippines</option>
              <option>Singapore</option>
            </Select>
            {errors.resellerCountry ? (
              <p className="text-xs text-red-600">{errors.resellerCountry}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="resellerLocation" required>
              {t('resellerLocation', 'Reseller Location')}
            </Label>
            <Input
              id="resellerLocation"
              name="resellerLocation"
              value={form.resellerLocation}
              onChange={handleChange}
              placeholder="e.g., Jakarta"
              required
            />
            {errors.resellerLocation ? (
              <p className="text-xs text-red-600">{errors.resellerLocation}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="currency" required>
              {t('currency', 'Currency')}
            </Label>
            <Select
              id="currency"
              name="currency"
              value={form.currency}
              onChange={handleChange}
              required
            >
              <option value="">Select currency</option>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            {errors.currency ? (
              <p className="text-xs text-red-600">{errors.currency}</p>
            ) : null}
          </div>
        </div>

        {/* Reseller contact */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="resellerName" required>
              {t('resellerCompany', 'Reseller company')}
            </Label>
            <Input
              id="resellerName"
              name="resellerName"
              value={form.resellerName}
              onChange={handleChange}
              placeholder="e.g., Alpha Solutions Pte Ltd"
              required
            />
            {errors.resellerName ? (
              <p className="text-xs text-red-600">{errors.resellerName}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="resellerContact" required>
              {t('primaryContact', 'Primary contact')}
            </Label>
            <Input
              id="resellerContact"
              name="resellerContact"
              value={form.resellerContact}
              onChange={handleChange}
              placeholder="Full name"
              required
            />
            {errors.resellerContact ? (
              <p className="text-xs text-red-600">{errors.resellerContact}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="resellerEmail" required>
              {t('email', 'Contact email')}
            </Label>
            <Input
              id="resellerEmail"
              name="resellerEmail"
              type="email"
              value={form.resellerEmail}
              onChange={handleChange}
              placeholder="name@company.com"
              required
            />
            {errors.resellerEmail ? (
              <p className="text-xs text-red-600">{errors.resellerEmail}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="resellerPhone">{t('phone', 'Contact phone')}</Label>
            <Input
              id="resellerPhone"
              name="resellerPhone"
              value={form.resellerPhone}
              onChange={handleChange}
              placeholder="+65 1234 5678"
            />
          </div>
        </div>

        {/* Customer */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="customerName" required>
              {t('customerName', 'Customer name')}
            </Label>
            <Input
              id="customerName"
              name="customerName"
              value={form.customerName}
              onChange={handleChange}
              placeholder="End customer / project owner"
              required
            />
            {errors.customerName ? (
              <p className="text-xs text-red-600">{errors.customerName}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="country" required>
              {t('customerCountry', 'Customer Country')}
            </Label>
            <Select
              id="country"
              name="country"
              value={form.country}
              onChange={handleChange}
              required
            >
              <option value="">Select country</option>
              <option>Indonesia</option>
              <option>Malaysia</option>
              <option>Philippines</option>
              <option>Singapore</option>
            </Select>
            {errors.country ? (
              <p className="text-xs text-red-600">{errors.country}</p>
            ) : null}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="city" required>
              {t('customerCity', 'Customer City')}
            </Label>
            <Input
              id="city"
              name="city"
              value={form.city}
              onChange={(e) => {
                const v = e.target.value
                setForm((f) => ({
                  ...f,
                  city: v,
                  customerLocation: (v ? v + ', ' : '') + (f.country || ''),
                }))
              }}
              placeholder="Jakarta"
              required
            />
            {errors.city ? (
              <p className="text-xs text-red-600">{errors.city}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label>{t('mapOption', 'Map option (paste lat, lng or click helper)')}</Label>
            <div className="flex gap-2">
              <Input
                placeholder="lat"
                value={form.lat}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lat: Number(e.target.value) }))
                }
              />
              <Input
                placeholder="lng"
                value={form.lng}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lng: Number(e.target.value) }))
                }
              />
              <a
                className={'px-3 py-2 rounded-xl text-white text-sm ' + BRAND.primaryBtn}
                href={
                  'https://www.google.com/maps/search/?api=1&query=' +
                  encodeURIComponent((form.city || '') + ',' + (form.country || ''))
                }
                target="_blank"
                rel="noreferrer"
              >
                Open Map
              </a>
            </div>
            <p className="text-xs text-gray-500">{t('tipMap')}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expectedCloseDate" required>
              {t('expectedCloseDate', 'Expected close date')}
            </Label>
            <Input
              id="expectedCloseDate"
              name="expectedCloseDate"
              type="date"
              value={form.expectedCloseDate}
              onChange={handleChange}
              required
            />
            {errors.expectedCloseDate ? (
              <p className="text-xs text-red-600">{errors.expectedCloseDate}</p>
            ) : null}
          </div>
        </div>

        {/* Solution + Industry + Value */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label required>{t('solutionOffered', 'Solution offered (Xgrids)')}</Label>
            <Select
              value={form.solution}
              onChange={(e) =>
                setForm((f) => ({ ...f, solution: e.target.value }))
              }
              required
            >
              <option value="">Select an Xgrids solution</option>
              {XGRIDS_SOLUTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            {form.solution === 'Other…' ? (
              <Input
                placeholder="Describe the solution"
                value={form.solutionOther}
                onChange={(e) =>
                  setForm((f) => ({ ...f, solutionOther: e.target.value }))
                }
                required
              />
            ) : null}
            <a
              className="text-sky-700 underline text-xs"
              href="https://www.aptella.com/asia/product-brands/xgrids-asia/"
              target="_blank"
              rel="noreferrer"
            >
              Learn about Xgrids solutions
            </a>
            {errors.solution ? (
              <p className="text-xs text-red-600">{errors.solution}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="industry">{t('industry', 'Industry')}</Label>
            <Select
              id="industry"
              name="industry"
              value={form.industry}
              onChange={handleChange}
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="value" required>
              {t('dealValue', 'Deal value')}
            </Label>
            <Input
              id="value"
              name="value"
              type="number"
              step="0.01"
              min="0"
              value={form.value}
              onChange={handleChange}
              placeholder="e.g., 25000"
              required
            />
            {errors.value ? (
              <p className="text-xs text-red-600">{errors.value}</p>
            ) : null}
          </div>
        </div>

        {/* Stage / Probability / Competitors */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="stage">{t('salesStage', 'Sales stage')}</Label>
            <Select id="stage" name="stage" value={form.stage} onChange={handleChange}>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t('probability', 'Probability (%)')}</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={form.probability}
              onChange={(e) =>
                setForm((f) => ({ ...f, probability: Number(e.target.value) }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>{t('competitors', 'Competitors')}</Label>
            <Input
              placeholder="Comma-separated (optional)"
              value={(form.competitors || []).join(', ')}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  competitors: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
            />
          </div>
        </div>

        {/* Support */}
        <div className="grid gap-2">
          <Label>{t('supportRequested', 'Support requested')}</Label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SUPPORT_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.supports.includes(opt)}
                  onChange={() => handleMultiToggle('supports', opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Evidence */}
        <div className="grid gap-2">
          <Label required>{t('evidenceRequired', 'Evidence (required)')}</Label>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <input
                id="evidenceFiles"
                type="file"
                multiple
                onChange={handleFiles}
                className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#e8f3f9] file:px-3 file:py-2 file:text-[#0E3446]"
              />
              {form.evidenceFiles && form.evidenceFiles.length > 0 ? (
                <div className="mt-2 text-xs text-gray-600">
                  {form.evidenceFiles.length} file(s) selected.
                </div>
              ) : null}
              {errors.evidence ? (
                <p className="text-xs text-red-600 mt-1">{errors.evidence}</p>
              ) : null}
              <div className="text-xs text-slate-600 mt-2">
                {t(
                  'emailEvidence',
                  'Email attached files to Aptella (admin.asia@aptella.com)'
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes + Flags */}
        <div className="grid gap-2">
          <Label htmlFor="notes">{t('notes', 'Notes')}</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            value={form.notes}
            onChange={handleChange}
            placeholder="Key requirements, technical scope, delivery constraints, decision process, etc."
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="remindersOptIn"
              checked={!!form.remindersOptIn}
              onChange={handleChange}
            />
            {t('reminders', 'Send me reminders for updates')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="accept"
              checked={!!form.accept}
              onChange={handleChange}
            />
            {t(
              'confirm',
              'I confirm details are accurate and consent to data storage for deal management'
            )}
          </label>
        </div>
        {errors.accept ? (
          <p className="text-xs text-red-600 -mt-3">{errors.accept}</p>
        ) : null}

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className={'px-4 py-2 rounded-xl text-white ' + BRAND.primaryBtn}
          >
            {isID ? T_ID.submit : 'Submit Registration'}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-gray-200"
          >
            {isID ? T_ID.reset : 'Reset'}
          </button>
        </div>
      </form>
    </Card>
  )
}

// ====== Admin Panel ======
function AdminPanel({ rows, setRows }) {
  const [authed, setAuthed] = useState(false)
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('All')
  const [status, setStatus] = useState('All')
  const [stage, setStage] = useState('All')
  const [sortKey, setSortKey] = useState('submittedAt')
  const [sortDir, setSortDir] = useState('desc') // asc|desc
  const [fxOpen, setFxOpen] = useState(false)
  const [ratesAUD, setRatesAUD] = useState({})
  const [savingFx, setSavingFx] = useState(false)
  const mapRef = useRef(null)
  const mapObjRef = useRef(null)
  const clusterRef = useRef(null)

  useEffect(() => {
    const stored = localStorage.getItem('aptella-admin-ok')
    if (stored === 'yes') setAuthed(true)
  }, [])

  async function handleLogin() {
    const pw = window.prompt('Enter admin password')
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true)
      localStorage.setItem('aptella-admin-ok', 'yes')
    } else {
      alert('Incorrect password')
    }
  }
  function handleLogout() {
    setAuthed(false)
    localStorage.removeItem('aptella-admin-ok')
  }

  async function refresh() {
    try {
      const data = await gasGet('list', {})
      const fx = await gasGet('fx-get', {})
      setRatesAUD(fx.fx || {})
      const normalized = (data.rows || []).map((r) => normalizeRow(r, fx.fx || {}))
      setRows(normalized)
    } catch (e) {
      console.error(e)
      alert('Refresh failed: ' + e.message)
    }
  }

  function normalizeRow(r, fx) {
    const copy = { ...(r || {}) }
    copy.value = Number(copy.value || 0)
    copy.probability = Number(copy.probability || 0)
    copy.lat = Number(copy.lat || 0)
    copy.lng = Number(copy.lng || 0)
    copy.submittedAt = toLocalYMD(copy.submittedAt || todayLocalISO())
    copy.expectedCloseDate = copy.expectedCloseDate
      ? toLocalYMD(copy.expectedCloseDate)
      : ''
    copy.lockExpiry = copy.lockExpiry ? toLocalYMD(copy.lockExpiry) : ''
    copy.status = copy.status || 'pending'
    copy.currency = copy.currency || 'AUD'
    const rate = fx && fx[copy.currency] ? Number(fx[copy.currency]) : null
    copy.valueAUD = rate ? copy.value * rate : copy.value // if we don't know, treat as AUD
    return copy
  }

  function matchesFilters(x) {
    if (
      search &&
      !(
        (x.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (x.customerLocation || '').toLowerCase().includes(search.toLowerCase()) ||
        (x.solution || '').toLowerCase().includes(search.toLowerCase())
      )
    )
      return false
    if (country !== 'All' && (x.country || '') !== country) return false
    if (status !== 'All' && (x.status || 'pending') !== status) return false
    if (stage !== 'All' && (x.stage || '') !== stage) return false
    return true
  }

  const filtered = useMemo(() => rows.filter(matchesFilters), [rows, search, country, status, stage])

  const sorted = useMemo(() => {
    const arr = filtered.slice()
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortKey) {
        case 'submittedAt':
          return (a.submittedAt > b.submittedAt ? 1 : -1) * dir
        case 'expectedCloseDate':
          return (a.expectedCloseDate > b.expectedCloseDate ? 1 : -1) * dir
        case 'location':
          return ((a.customerLocation || '') > (b.customerLocation || '') ? 1 : -1) * dir
        case 'solution':
          return ((a.solution || '') > (b.solution || '') ? 1 : -1) * dir
        case 'value':
          return ((a.valueAUD || 0) - (b.valueAUD || 0)) * dir
        case 'stage':
          return ((a.stage || '') > (b.stage || '') ? 1 : -1) * dir
        case 'status':
          return ((a.status || '') > (b.status || '') ? 1 : -1) * dir
        default:
          return 0
      }
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const totalAUD = useMemo(
    () => sorted.reduce((sum, x) => sum + (Number(x.valueAUD) || 0), 0),
    [sorted]
  )

  function aggByCity(rowsIn) {
    const m = new Map()
    for (const r of rowsIn) {
      if (!r.lat || !r.lng) continue
      const key = (r.city || '') + '|' + (r.country || '')
      const cur = m.get(key) || {
        city: r.city || '',
        country: r.country || '',
        lat: r.lat,
        lng: r.lng,
        count: 0,
        sumAUD: 0,
      }
      cur.count += 1
      cur.sumAUD += Number(r.valueAUD || 0)
      m.set(key, cur)
    }
    return Array.from(m.values())
  }

  // Map setup & render bubbles
  useEffect(() => {
    if (!mapRef.current) return
    if (!mapObjRef.current) {
      const map = L.map(mapRef.current).setView([1.3, 103.8], 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map)
      mapObjRef.current = map
      clusterRef.current = L.markerClusterGroup()
      map.addLayer(clusterRef.current)
      setTimeout(() => map.invalidateSize(), 200)
    }
    const cluster = clusterRef.current
    cluster.clearLayers()

    const aggs = aggByCity(sorted)
    // scale radius by sqrt(AUD) for nicer range; tune factor
    const scale = (aud) => Math.max(16, Math.sqrt(Math.max(1, aud)) * 2.5)
    for (const a of aggs) {
      const size = scale(a.sumAUD)
      const html =
        '<div style="background:' +
        BRAND.orange +
        '; color:#0b2938; width:' +
        size +
        'px; height:' +
        size +
        'px; line-height:' +
        size +
        'px; text-align:center; border-radius:9999px; border:3px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,0.15); font-weight:700;">' +
        a.count +
        '</div>'
      const icon = L.divIcon({
        className: 'bubble-marker',
        html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
      const marker = L.marker([a.lat, a.lng], { icon })
      marker.bindPopup(
        '<div style="min-width:180px;">' +
          '<div><strong>' +
          a.city +
          ', ' +
          a.country +
          '</strong></div>' +
          '<div>Deals: ' +
          a.count +
          '</div>' +
          '<div>Total AUD: ' +
          (a.sumAUD || 0).toLocaleString() +
          '</div>' +
          '</div>'
      )
      cluster.addLayer(marker)
    }
  }, [sorted])

  async function approve(id) {
    try {
      await gasPost('updateStatus', { id, status: 'approved' })
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: 'approved', lockExpiry: addDays(todayLocalISO(), 60) }
            : r
        )
      )
    } catch (e) {
      alert('Update failed: ' + e.message)
    }
  }
  async function close(id) {
    try {
      await gasPost('updateStatus', { id, status: 'closed' })
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'closed' } : r))
      )
    } catch (e) {
      alert('Update failed: ' + e.message)
    }
  }

  async function saveFx(fx) {
    try {
      setSavingFx(true)
      await gasPost('fx-set', { fx })
      setRatesAUD(fx)
      setFxOpen(false)
    } catch (e) {
      alert('FX save failed: ' + e.message)
    } finally {
      setSavingFx(false)
    }
  }

  if (!authed) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center">
        <img
          src={import.meta.env.BASE_URL + 'aptella-logo.png'}
          alt="Aptella"
          className="h-12 w-12 mb-4"
        />
        <div className="text-slate-600 mb-4">Admin Portal (restricted)</div>
        <button
          onClick={handleLogin}
          className={'px-4 py-2 rounded-xl text-white ' + BRAND.primaryBtn}
        >
          Enter password
        </button>
      </Card>
    )
  }

  return (
    <>
      <div className="sticky top-2 z-30 bg-white/90 backdrop-blur rounded-xl border p-3 mb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              placeholder="Search customer/location/solution"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border-slate-300 px-3 py-2"
            />
            <Select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option>All</option>
              <option>Indonesia</option>
              <option>Malaysia</option>
              <option>Philippines</option>
              <option>Singapore</option>
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="closed">closed</option>
              <option value="lost">lost</option>
            </Select>
            <Select value={stage} onChange={(e) => setStage(e.target.value)}>
              <option>All</option>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              <option value="submittedAt">Submitted</option>
              <option value="expectedCloseDate">Expected Close</option>
              <option value="location">Location</option>
              <option value="solution">Solution</option>
              <option value="value">Value (AUD)</option>
              <option value="stage">Stage</option>
              <option value="status">Status</option>
            </Select>
            <Select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
              <option value="desc">Newest → Oldest</option>
              <option value="asc">Oldest → Newest</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className={'px-3 py-2 rounded-lg text-white ' + BRAND.primaryBtn}
            >
              Refresh
            </button>
            <button
              onClick={() => setFxOpen(true)}
              className="px-3 py-2 rounded-lg bg-slate-100"
            >
              FX Settings
            </button>
            <button onClick={handleLogout} className="px-3 py-2 rounded-lg bg-slate-100">
              Logout
            </button>
          </div>
        </div>
        <div className="mt-2 text-sm text-slate-600">
          Total (AUD): <strong>{totalAUD.toLocaleString()}</strong>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div
            ref={mapRef}
            style={{ height: '420px' }}
            className="w-full rounded-xl border"
          />
        </div>
        <Card className="p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F0A03A]/10">
              <tr className="text-[#0E3446]">
                <th className="p-3 text-left">Submitted</th>
                <th className="p-3 text-left">Expected</th>
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
              {sorted.map((x) => (
                <tr key={x.id} className="border-b align-top">
                  <td className="p-3">{x.submittedAt || ''}</td>
                  <td className="p-3">{x.expectedCloseDate || ''}</td>
                  <td className="p-3">{x.customerName || ''}</td>
                  <td className="p-3">{x.customerLocation || ''}</td>
                  <td className="p-3">{x.solution || ''}</td>
                  <td className="p-3">
                    <div>
                      {(x.value || 0).toLocaleString()} {x.currency || ''}
                    </div>
                    <div className="text-xs text-slate-500">
                      {((x.valueAUD || 0).toFixed(0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}{' '}
                      AUD
                    </div>
                  </td>
                  <td className="p-3">{x.stage || ''}</td>
                  <td className="p-3">
                    <StatusPill status={x.status} lockExpiry={x.lockExpiry} />
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-2">
                      {x.status !== 'approved' ? (
                        <button
                          onClick={() => approve(x.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-green-600 text-white"
                        >
                          Approve
                        </button>
                      ) : null}
                      {x.status !== 'closed' && x.status !== 'lost' ? (
                        <button
                          onClick={() => close(x.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white"
                        >
                          Close
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-slate-500">
                    No rows match the filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </div>

      <AdminSettings
        open={fxOpen}
        onClose={() => setFxOpen(false)}
        ratesAUD={ratesAUD}
        onSave={saveFx}
        saving={savingFx}
      />
    </>
  )
}

// ====== Root ======
export default function App() {
  const [tab, setTab] = useState('reseller')
  const [rows, setRows] = useState([])

  function addLocal(record) {
    setRows((prev) => [{ ...record }, ...prev])
  }

  // Self-tests to catch earlier issues
  useEffect(() => {
    try {
      if (addDays('2025-01-01', 1) !== '2025-01-02') throw new Error('addDays')
      const in14 = addDays(todayLocalISO(), 14)
      const in61 = addDays(todayLocalISO(), 61)
      if (!withinNext60Days(in14)) throw new Error('within60 true')
      if (withinNext60Days(in61)) throw new Error('within60 false')
      console.log('✅ Self-tests passed')
    } catch (e) {
      console.warn('⚠️ Self-tests failed:', e)
    }
  }, [])

  return (
    <div>
      <Header
        tab={tab}
        setTab={setTab}
        authed={false /* header logout button handled inside admin */}
        onSignOut={() => {}}
      />
      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {tab === 'reseller' ? (
          <ResellerForm onSaveLocal={addLocal} />
        ) : (
          <AdminPanel rows={rows} setRows={setRows} />
        )}
      </main>
    </div>
  )
}
