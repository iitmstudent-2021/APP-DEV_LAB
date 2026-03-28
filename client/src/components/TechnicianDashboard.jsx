import { useEffect, useState } from "react";
import api from "../services/api";

export default function TechnicianDashboard({ user }) {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetLogs, setAssetLogs] = useState([]);
  const [assetAlerts, setAssetAlerts] = useState([]);
  const [logForm, setLogForm] = useState({
    logType: "ROUTINE",
    description: "",
    stateOfHealthPercent: "",
    temperatureCelsius: "",
    notes: "",
    visitedAt: new Date().toISOString().slice(0, 10),
  });
  const [alertForm, setAlertForm] = useState({ title: "", severity: "WARNING", description: "" });
  const [showLogForm, setShowLogForm] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(""), 3000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
  };

  const loadAssets = async () => {
    try {
      const res = await api.get("/assets");
      setAssets(res.data.assets || []);
    } catch { flash("Failed to load assets", true); }
  };

  useEffect(() => { loadAssets(); }, []);

  const openAsset = async (asset) => {
    setSelectedAsset(asset);
    setShowLogForm(false);
    setShowAlertForm(false);
    try {
      const [logRes, alrtRes] = await Promise.all([
        api.get(`/assets/${asset.id}/maintenance-logs?limit=5`),
        api.get(`/assets/${asset.id}/alerts`),
      ]);
      setAssetLogs(logRes.data.logs || []);
      setAssetAlerts(alrtRes.data.alerts || []);
    } catch { flash("Failed to load asset details", true); }
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/assets/${selectedAsset.id}/maintenance-logs`, {
        ...logForm,
        stateOfHealthPercent: Number(logForm.stateOfHealthPercent),
        temperatureCelsius: logForm.temperatureCelsius !== "" ? Number(logForm.temperatureCelsius) : undefined,
        visitedAt: new Date(logForm.visitedAt).toISOString(),
      });
      setLogForm({ logType: "ROUTINE", description: "", stateOfHealthPercent: "", temperatureCelsius: "", notes: "", visitedAt: new Date().toISOString().slice(0, 10) });
      setShowLogForm(false);
      flash("Maintenance log submitted");
      const res = await api.get(`/assets/${selectedAsset.id}/maintenance-logs?limit=5`);
      setAssetLogs(res.data.logs || []);
    } catch (err) { flash(err.response?.data?.message || "Failed to submit log", true); }
  };

  const handleAlertSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/assets/${selectedAsset.id}/alerts`, alertForm);
      setAlertForm({ title: "", severity: "WARNING", description: "" });
      setShowAlertForm(false);
      flash("Alert raised");
      const res = await api.get(`/assets/${selectedAsset.id}/alerts`);
      setAssetAlerts(res.data.alerts || []);
    } catch (err) { flash(err.response?.data?.message || "Failed to raise alert", true); }
  };

  const severityClass = (s) => s === "CRITICAL" ? "badge-critical" : s === "WARNING" ? "badge-warning" : "badge-info";
  const statusClass = (s) => s === "OPEN" ? "badge-critical" : s === "ACKNOWLEDGED" ? "badge-warning" : "badge-ok";

  return (
    <div className="dashboard-layout">
      {error && <div className="toast toast-error">{error}</div>}
      {success && <div className="toast toast-ok">{success}</div>}

      <div className="dash-sidebar">
        <div className="dash-role-badge technician">TECHNICIAN</div>
        <p className="muted small">{user?.email}</p>
        <nav className="dash-nav">
          <button className="active" onClick={() => setSelectedAsset(null)}>
            Assigned Assets ({assets.length})
          </button>
        </nav>
      </div>

      <div className="dash-main">
        {/* ASSET LIST */}
        {!selectedAsset && (
          <div>
            <div className="section-header">
              <h2>My Assigned Assets</h2>
              <button className="btn-secondary" onClick={loadAssets}>Refresh</button>
            </div>
            {assets.length === 0 && (
              <div className="empty-state">
                <p>No assets assigned to you yet.</p>
                <p className="muted small">Contact your Asset Manager to get assigned to a site.</p>
              </div>
            )}
            <div className="card-grid">
              {assets.map(a => (
                <div className="asset-card clickable" key={a.id} onClick={() => openAsset(a)}>
                  <h4>{a.name}</h4>
                  <p className="muted small">{a.siteName}</p>
                  <div className="asset-meta">
                    <span className="badge">{a.category}</span>
                    <span className={`badge ${a.status === "ACTIVE" ? "badge-ok" : "badge-warning"}`}>{a.status}</span>
                    <span className="badge">{a.capacityKwh} kWh</span>
                  </div>
                  <p className="muted small">Manager: {a.owner?.fullName || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ASSET DETAIL */}
        {selectedAsset && (
          <div>
            <button className="btn-back" onClick={() => setSelectedAsset(null)}>← Back to assets</button>
            <h2>{selectedAsset.name}</h2>
            <p className="muted">{selectedAsset.siteName} · {selectedAsset.category} · {selectedAsset.capacityKwh} kWh · <span className={`badge ${selectedAsset.status === "ACTIVE" ? "badge-ok" : "badge-warning"}`}>{selectedAsset.status}</span></p>

            <div className="detail-sections">
              {/* Log Maintenance */}
              <div className="detail-section">
                <div className="section-header">
                  <h3>Recent Maintenance Logs (last 5)</h3>
                  <button className="btn-primary" onClick={() => { setShowLogForm(!showLogForm); setShowAlertForm(false); }}>
                    {showLogForm ? "Cancel" : "+ Log Visit"}
                  </button>
                </div>

                {showLogForm && (
                  <form className="form-grid" onSubmit={handleLogSubmit} style={{ marginBottom: "1rem" }}>
                    <select value={logForm.logType} onChange={e => setLogForm(p => ({ ...p, logType: e.target.value }))}>
                      <option value="ROUTINE">Routine</option>
                      <option value="INSPECTION">Inspection</option>
                      <option value="REPAIR">Repair</option>
                      <option value="EMERGENCY">Emergency</option>
                    </select>
                    <textarea placeholder="Description of work done *" value={logForm.description} onChange={e => setLogForm(p => ({ ...p, description: e.target.value }))} rows={3} required />
                    <input type="number" placeholder="State of Health % (e.g. 87.5) *" min="0" max="100" step="0.1" value={logForm.stateOfHealthPercent} onChange={e => setLogForm(p => ({ ...p, stateOfHealthPercent: e.target.value }))} required />
                    <input type="number" placeholder="Temperature °C (optional)" step="0.1" value={logForm.temperatureCelsius} onChange={e => setLogForm(p => ({ ...p, temperatureCelsius: e.target.value }))} />
                    <textarea placeholder="Additional notes (optional)" value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
                    <div>
                      <label className="muted small">Visit Date *</label>
                      <input type="date" value={logForm.visitedAt} onChange={e => setLogForm(p => ({ ...p, visitedAt: e.target.value }))} required />
                    </div>
                    <button type="submit" className="btn-primary">Submit Log</button>
                  </form>
                )}

                {assetLogs.length === 0 && !showLogForm && <p className="muted small">No logs yet. Log your first visit.</p>}
                {assetLogs.map(l => (
                  <div className="log-item" key={l.id}>
                    <div className="log-header">
                      <span className="badge">{l.logType}</span>
                      <span className="muted small">{new Date(l.visitedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="small">{l.description}</p>
                    <div className="log-meta">
                      <span>SoH: <strong>{l.stateOfHealthPercent}%</strong></span>
                      {l.temperatureCelsius != null && <span>Temp: <strong>{l.temperatureCelsius}°C</strong></span>}
                    </div>
                    {l.notes && <p className="muted small">{l.notes}</p>}
                  </div>
                ))}
              </div>

              {/* Alerts */}
              <div className="detail-section">
                <div className="section-header">
                  <h3>Alerts ({assetAlerts.length})</h3>
                  <button className="btn-primary" onClick={() => { setShowAlertForm(!showAlertForm); setShowLogForm(false); }}>
                    {showAlertForm ? "Cancel" : "+ Raise Alert"}
                  </button>
                </div>

                {showAlertForm && (
                  <form className="form-grid" onSubmit={handleAlertSubmit} style={{ marginBottom: "1rem" }}>
                    <input placeholder="Alert title *" value={alertForm.title} onChange={e => setAlertForm(p => ({ ...p, title: e.target.value }))} required />
                    <select value={alertForm.severity} onChange={e => setAlertForm(p => ({ ...p, severity: e.target.value }))}>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="WARNING">WARNING</option>
                      <option value="INFO">INFO</option>
                    </select>
                    <textarea placeholder="Description (optional)" value={alertForm.description} onChange={e => setAlertForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                    <button type="submit" className="btn-primary">Raise Alert</button>
                  </form>
                )}

                {assetAlerts.length === 0 && !showAlertForm && <p className="muted small">No alerts raised.</p>}
                {assetAlerts.map(a => (
                  <div className="alert-item" key={a.id}>
                    <div className="alert-header">
                      <span className={`badge ${severityClass(a.severity)}`}>{a.severity}</span>
                      <span className={`badge ${statusClass(a.status)}`}>{a.status}</span>
                      <span className="muted small">{new Date(a.raisedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="small"><strong>{a.title}</strong></p>
                    {a.description && <p className="muted small">{a.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
