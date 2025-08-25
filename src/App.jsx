import React from "react";

// ====== Brand + Assets =======================================================
import logoSvg from "./assets/aptella-logo.svg";          // <-- add this file
import logoPng from "./assets/aptella-logo.png";          // <-- optional fallback

// GAS endpoint (as you requested)
const GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw3O_GnYcTx4bRYdFD2vCSs26L_Gzl2ZIZd18dyJmZAEE442hvhqp7j1C4W6cFX_DWM/exec";

// Aptella palette
const BRAND = {
  navy: "#0E3446",
  navyDark: "#0B2938",
  orange: "#F0A03A",
  fog: "#F6FAFD",
  gray1: "#f8fafc",
  gray2: "#e2e8f0",
  text: "#0f172a",
};

// Resolve asset URL via Vite (works on GH Pages)
const APTELLA_LOGO =
  (logoSvg && new URL(logoSvg, import.meta.url).href) ||
  (logoPng && new URL(logoPng, import.meta.url).href);

// ====== Tiny utilities =======================================================
const fmtMoney = (n, ccy = "AUD") =>
  typeof n === "number" && !Number.isNaN(n)
    ? new Intl.NumberFormat("en-AU", { style: "currency", currency: ccy }).format(n)
    : "—";

const ymd = (d) => {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

// ====== Branded header =======================================================
function BrandHeader({ tab, setTab, onLogout }) {
  return (
    <>
      <style>{`
        :root{
          --aptella-navy:${BRAND.navy};
          --aptella-navy-dark:${BRAND.navyDark};
          --aptella-orange:${BRAND.orange};
        }
        .brand-shadow { box-shadow:0 8px 30px rgba(14,52,70,.06); }
        .brand-outline { border-bottom:1px solid rgba(14,52,70,.08); }
        .pill { padding:.45rem .9rem; border-radius:999px; border:1px solid transparent; font-weight:800; }
        .pill[aria-current="page"]{ background:var(--aptella-orange); color:#0e0e0e; }
        .btn{ display:inline-flex; align-items:center; gap:.5rem; padding:.55rem .9rem; border-radius:.75rem; border:1px solid rgba(14,52,70,.12); background:#fff; color:var(--aptella-navy); font-weight:700 }
        .btn-navy{ background:var(--aptella-navy); color:#fff; border-color:transparent; }
        .btn-navy:hover{ background:var(--aptella-navy-dark) }
        .chip{ background:rgba(240,160,58,.12); color:var(--aptella-orange); border:1px solid rgba(240,160,58,.28); padding:.2rem .55rem; border-radius:999px; font-size:.72rem; font-weight:800 }
      `}</style>

      <header
        className="brand-shadow brand-outline"
        style={{ position: "sticky", top: 0, zIndex: 50, background: "#ffffffcc", backdropFilter: "blur(8px)" }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 12px",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={APTELLA_LOGO}
              onError={(e) => {
                if (logoPng) e.currentTarget.src = new URL(logoPng, import.meta.url).href;
              }}
              alt="Aptella"
              style={{ height: 30, width: "auto", display: "block" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Master Distributor •</span>
              <span className="chip">Xgrids</span>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: BRAND.navy, letterSpacing: 0.2 }}>
              Reseller Deal Registration
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            <nav style={{ display: "flex", gap: 6 }}>
              <button
                className="pill"
                aria-current={tab === "reseller" ? "page" : undefined}
                onClick={() => setTab("reseller")}
              >
                Reseller
              </button>
              <button className="pill" aria-current={tab === "admin" ? "page" : undefined} onClick={() => setTab("admin")}>
                Admin
              </button>
            </nav>
            <button className="btn" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </header>
    </>
  );
}

// ====== Reseller form (minimal, branded) =====================================
function ResellerForm({ onSubmitted }) {
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    resellerCountry: "",
    resellerLocation: "",
    currency: "SGD",
    company: "",
    contact: "",
    email: "",
    phone: "",
    customerName: "",
    customerCountry: "",
    customerCity: "",
    lat: "",
    lng: "",
    solution: "",
    expectedCloseDate: ymd(new Date()),
    industry: "",
    stage: "Qualified",
    probability: 35,
    value: "",
    competitors: "",
    notes: "",
    emailEvidence: true, // will email to admin.asia@aptella.com
  });

  const requiredStyle = {
    background: BRAND.gray1,
    border: `1px solid ${BRAND.gray2}`,
    borderRadius: 10,
    padding: "10px 12px",
    width: "100%",
    outlineColor: BRAND.orange,
  };

  const orangeAccent = {
    background: "#fff7ed",
    border: `1px solid ${BRAND.orange}`,
    borderRadius: 10,
    padding: "10px 12px",
    width: "100%",
    outlineColor: BRAND.orange,
  };

  const group = { display: "grid", gap: 6 };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, action: "submit" };
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      if (!res.ok || (json && json.ok === false)) {
        throw new Error((json && json.error) || `HTTP ${res.status} ${res.statusText}`);
      }
      alert("Submitted. If GAS is set to anyone-with-link, the row will appear in Admin after Refresh.");
      setForm((f) => ({ ...f, value: "", customerName: "", customerCity: "" }));
      onSubmitted && onSubmitted();
    } catch (err) {
      alert(`Submitted locally. Google Sheets sync failed: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={{ maxWidth: 1100, margin: "18px auto", padding: "0 12px" }}>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {/* Row 1 */}
          <div style={group}>
            <label style={{ fontWeight: 700, color: BRAND.navy }}>Reseller Country *</label>
            <select
              value={form.resellerCountry}
              onChange={(e) => setForm((f) => ({ ...f, resellerCountry: e.target.value }))}
              style={orangeAccent}
              required
            >
              <option value="">Select country</option>
              <option>Singapore</option>
              <option>Indonesia</option>
              <option>Malaysia</option>
              <option>Australia</option>
            </select>
          </div>
          <div style={group}>
            <label style={{ fontWeight: 700, color: BRAND.navy }}>Reseller Location *</label>
            <input
              style={requiredStyle}
              placeholder="e.g., Singapore"
              value={form.resellerLocation}
              onChange={(e) => setForm((f) => ({ ...f, resellerLocation: e.target.value }))}
              required
            />
          </div>
          <div style={group}>
            <label style={{ fontWeight: 700, color: BRAND.navy }}>Currency *</label>
            <select
              style={requiredStyle}
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              required
            >
              <option>SGD</option>
              <option>IDR</option>
              <option>AUD</option>
              <option>MYR</option>
            </select>
          </div>

          {/* Row 2 */}
          <div style={group}>
            <label>Reseller company *</label>
            <input style={requiredStyle} value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} required />
          </div>
          <div style={group}>
            <label>Primary contact *</label>
            <input style={requiredStyle} value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} required />
          </div>
          <div style={group}>
            <label>Contact email *</label>
            <input type="email" style={requiredStyle} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>

          {/* Row 3 */}
          <div style={group}>
            <label>Contact phone</label>
            <input style={requiredStyle} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div style={group}>
            <label>Customer name *</label>
            <input style={requiredStyle} value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} required />
          </div>
          <div style={group}>
            <label>Customer Country *</label>
            <select
              style={requiredStyle}
              value={form.customerCountry}
              onChange={(e) => setForm((f) => ({ ...f, customerCountry: e.target.value }))}
              required
            >
              <option value="">Select country</option>
              <option>Singapore</option>
              <option>Indonesia</option>
              <option>Malaysia</option>
              <option>Australia</option>
            </select>
          </div>

          {/* Row 4 */}
          <div style={group}>
            <label>Customer City</label>
            <input style={requiredStyle} value={form.customerCity} onChange={(e) => setForm((f) => ({ ...f, customerCity: e.target.value }))} />
          </div>
          <div style={group}>
            <label>Map option (paste lat,lng)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input style={requiredStyle} placeholder="lat" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} />
              <input style={requiredStyle} placeholder="lng" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} />
            </div>
          </div>
          <div style={group}>
            <label>Expected close date *</label>
            <input
              type="date"
              style={requiredStyle}
              value={form.expectedCloseDate}
              onChange={(e) => setForm((f) => ({ ...f, expectedCloseDate: e.target.value }))}
              required
            />
          </div>

          {/* Row 5 */}
          <div style={group}>
            <label>Solution offered (Xgrids) *</label>
            <select
              style={requiredStyle}
              value={form.solution}
              onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
              required
            >
              <option value="">Select an Xgrids solution</option>
              <option>Xgrids L2 PRO</option>
              <option>Xgrids K1</option>
              <option>Other</option>
            </select>
          </div>
          <div style={group}>
            <label>Industry</label>
            <select
              style={requiredStyle}
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            >
              <option value="">Select industry</option>
              <option>Construction</option>
              <option>Mining</option>
              <option>Utilities</option>
              <option>Other</option>
            </select>
          </div>
          <div style={group}>
            <label>Deal value *</label>
            <input
              style={requiredStyle}
              placeholder="e.g., 25000"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value.replace(/[^\d.]/g, "") }))}
              required
            />
          </div>

          {/* Row 6 */}
          <div style={group}>
            <label>Sales stage</label>
            <select
              style={requiredStyle}
              value={form.stage}
              onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
            >
              <option>Qualified</option>
              <option>Negotiation</option>
              <option>Proposal</option>
              <option>Closed</option>
            </select>
          </div>
          <div style={group}>
            <label>Probability (%)</label>
            <input
              style={requiredStyle}
              type="number"
              min={0}
              max={100}
              value={form.probability}
              onChange={(e) => setForm((f) => ({ ...f, probability: Number(e.target.value) }))}
            />
          </div>
          <div style={group}>
            <label>Competitors</label>
            <input style={requiredStyle} placeholder="Comma separated (optional)" value={form.competitors} onChange={(e) => setForm((f) => ({ ...f, competitors: e.target.value }))} />
          </div>

          {/* Row 7 */}
          <div style={{ gridColumn: "1 / span 3", display: "grid", gap: 6 }}>
            <label>Notes</label>
            <textarea
              style={{ ...requiredStyle, minHeight: 90 }}
              placeholder="Key requirements, scope, constraints, decision process, etc."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* Evidence */}
          <div style={{ gridColumn: "1 / span 3", display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontWeight: 700 }}>Evidence (required)</label>
            <input type="file" multiple required />
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={!!form.emailEvidence}
                onChange={(e) => setForm((f) => ({ ...f, emailEvidence: e.target.checked }))}
              />
              Email attached files to Aptella (admin.asia@aptella.com)
            </label>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="reset" className="btn">Reset</button>
          <button type="submit" className="btn btn-navy" disabled={saving}>
            {saving ? "Submitting…" : "Submit Registration"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ====== FX drawer (simple) ===================================================
function FxDrawer({ open, onClose, onSave, rows }) {
  const [local, setLocal] = React.useState(rows || [{ ccy: "SGD", rateToAUD: 1.05 }]);
  React.useEffect(() => setLocal(rows || [{ ccy: "SGD", rateToAUD: 1.05 }]), [rows]);

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60
    }}>
      <div style={{ background: "#fff", borderRadius: 16, width: 560, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontWeight: 900, color: BRAND.navy }}>FX Rates to AUD</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {local.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
              <input
                value={r.ccy}
                onChange={(e) => setLocal((L) => L.map((x, idx) => idx === i ? { ...x, ccy: e.target.value.toUpperCase() } : x))}
                placeholder="CCY e.g. SGD"
                style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${BRAND.gray2}` }}
              />
              <input
                value={r.rateToAUD}
                onChange={(e) => setLocal((L) => L.map((x, idx) => idx === i ? { ...x, rateToAUD: e.target.value } : x))}
                placeholder="Rate to AUD"
                style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${BRAND.gray2}` }}
              />
              <button className="btn" onClick={() => setLocal((L) => L.filter((_, idx) => idx !== i))}>Remove</button>
            </div>
          ))}
          <div>
            <button className="btn" onClick={() => setLocal((L) => [...L, { ccy: "", rateToAUD: "" }])}>Add Row</button>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" onClick={() => onSave(local)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ====== Admin panel (list + basic actions) ===================================
function AdminPanel() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [fxOpen, setFxOpen] = React.useState(false);
  const [fxRows, setFxRows] = React.useState([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=list`);
      const txt = await res.text();
      let json = null; try { json = JSON.parse(txt); } catch {}
      if (!res.ok || (json && json.ok === false)) throw new Error((json && json.error) || `HTTP ${res.status}`);
      setItems(json.rows || []);
    } catch (e) {
      alert(`Refresh failed: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const loadFx = async () => {
    try {
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=fxList`);
      const txt = await res.text();
      let json = null; try { json = JSON.parse(txt); } catch {}
      if (!res.ok || (json && json.ok === false)) throw new Error((json && json.error) || `HTTP ${res.status}`);
      setFxRows(json.rows || [{ ccy: "SGD", rateToAUD: 1.05 }]);
      setFxOpen(true);
    } catch (e) {
      alert(`FX load failed: ${e.message || e}`);
    }
  };

  const saveFx = async (rows) => {
    try {
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=fx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows })
      });
      const txt = await res.text();
      let json = null; try { json = JSON.parse(txt); } catch {}
      if (!res.ok || (json && json.ok === false)) throw new Error((json && json.error) || `HTTP ${res.status}`);
      setFxOpen(false);
      await refresh();
    } catch (e) {
      alert(`FX save failed: ${e.message || e}`);
    }
  };

  const updateStatus = async (row, newStatus) => {
    try {
      const res = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status: newStatus })
      });
      const txt = await res.text();
      let json = null; try { json = JSON.parse(txt); } catch {}
      if (!res.ok || (json && json.ok === false)) throw new Error((json && json.error) || `HTTP ${res.status}`);
      setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: newStatus } : r)));
    } catch (e) {
      alert(`Update failed: ${e.message || e}`);
    }
  };

  React.useEffect(() => { refresh(); }, []);

  return (
    <section style={{ maxWidth: 1200, margin: "18px auto", padding: "0 12px" }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 10 }}>
        <button className="btn btn-navy" onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
        <button className="btn" onClick={loadFx}>FX Settings</button>
      </div>

      {/* Map “space” (if you later inject Leaflet, mount it here) */}
      <div style={{
        height: 380,
        background: BRAND.fog,
        border: `1px solid ${BRAND.gray2}`,
        borderRadius: 16,
        marginBottom: 12,
        display: "grid",
        placeItems: "center",
        color: "#64748b",
        fontWeight: 700
      }}>
        Map placeholder — your Leaflet init can target this container later.
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${BRAND.gray2}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: "rgba(240,160,58,.12)", color: BRAND.navy }}>
              {["Submitted", "Expected", "Customer", "Location", "Solution", "Value", "Stage", "Status", "Actions"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 900, borderBottom: `1px solid ${BRAND.gray2}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 16, color: "#64748b" }}>No rows.</td>
              </tr>
            )}
            {items.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BRAND.gray2}` }}>{ymd(r.submittedAt)}</td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BRAND.gray2}` }}>{ymd(r.expectedCloseDate)}</td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BRAND.gray2}` }}>{r.customerName || "—"}</td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BRAND.gray2}` }}>
                  {[r.city, r.country].filter(Boolean).join(", ") || r.customerLocation || "—"}
                </td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BRAND.gray2}` }}>{r.solution || "—"}</td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BRAND.gray2}` }}>
                  {fmtMoney(Number(r.valueAUD || r.value || 0), "AUD")}
                </td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BRAND.gray2}` }}>{r.stage || "—"}</td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BRAND.gray2}` }}>
                  <span style={{
                    padding: ".2rem .55rem",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    background:
                      r.status === "approved" ? "rgba(34,197,94,.12)" :
                      r.status === "closed" ? "rgba(239,68,68,.12)" :
                      "rgba(59,130,246,.12)",
                    color:
                      r.status === "approved" ? "#16A34A" :
                      r.status === "closed" ? "#DC2626" :
                      "#2563EB",
                    border: `1px solid ${
                      r.status === "approved" ? "rgba(34,197,94,.28)" :
                      r.status === "closed" ? "rgba(239,68,68,.28)" :
                      "rgba(59,130,246,.28)"
                    }`
                  }}>
                    {r.status || "pending"}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BRAND.gray2}` }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {r.status !== "approved" && (
                      <button className="btn" onClick={() => updateStatus(r, "approved")}>Approve</button>
                    )}
                    {r.status !== "closed" && (
                      <button className="btn" onClick={() => updateStatus(r, "closed")}>Close</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FxDrawer open={fxOpen} onClose={() => setFxOpen(false)} onSave={saveFx} rows={fxRows} />
    </section>
  );
}

// ====== App root =============================================================
export default function App() {
  const [tab, setTab] = React.useState("reseller");

  return (
    <div style={{ minHeight: "100dvh", background: "#fbfdff", color: BRAND.text }}>
      <BrandHeader tab={tab} setTab={setTab} onLogout={() => setTab("reseller")} />
      {tab === "reseller" ? <ResellerForm onSubmitted={() => setTab("admin")} /> : <AdminPanel />}
      <footer style={{ maxWidth: 1200, margin: "24px auto", padding: "0 12px", fontSize: 12, color: "#64748b" }}>
        © {new Date().getFullYear()} Aptella — Xgrids Master Distributor
      </footer>
    </div>
  );
}
