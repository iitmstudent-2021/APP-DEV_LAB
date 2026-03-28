import { useEffect, useState } from "react";
import api from "../services/api";

export default function AssetManagerDashboard({ user }) {
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [technicians, setTechnicians] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [managerStats, setManagerStats] = useState(null);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [assetAssignments, setAssetAssignments] = useState([]);
  const [assetLogs, setAssetLogs] = useState([]);
  const [assetAlerts, setAssetAlerts] = useState([]);
  const [assignTechId, setAssignTechId] = useState("");
  const [alertForm, setAlertForm] = useState({ title: "", severity: "WARNING", description: "" });
  const [assetForm, setAssetForm] = useState({ name: "", siteName: "", category: "GRID_SCALE", capacityKwh: "", description: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(""), 3000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
  };

  const buildParams = (overrides = {}) => {
    const p = { status: filterStatus, category: filterCategory, search, sortBy, sortOrder, page, limit, ...overrides };
    const params = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
    return params.toString();
  };

  const loadAssets = async (overrides = {}) => {
    try {
      const res = await api.get(`/assets?${buildParams(overrides)}`);
      setAssets(res.data.assets || []);
      setTotal(res.data.total || 0);
    } catch { flash("Failed to load assets", true); }
  };

  const loadManagerStats = async () => {
    try {
      const res = await api.get("/stats/manager");
      setManagerStats(res.data.stats);
    } catch { /* non-critical */ }
  };

  const loadTechnicians = async () => {
    try {
      const res = await api.get("/users?role=TECHNICIAN");
      setTechnicians(res.data.users || []);
    } catch { flash("Failed to load technicians", true); }
  };

  useEffect(() => { loadAssets(); loadTechnicians(); loadManagerStats(); }, []);

  const applyFilters = () => { setPage(1); loadAssets({ page: 1 }); setSelectedAsset(null); };
  const clearFilters = () => {
    setFilterStatus(""); setFilterCategory(""); setSearch(""); setSortBy(""); setSortOrder("DESC"); setPage(1);
    loadAssets({ status: "", category: "", search: "", sortBy: "", sortOrder: "DESC", page: 1 });
    setSelectedAsset(null);
  };
  const goPage = (newPage) => { setPage(newPage); loadAssets({ page: newPage }); };

  const openAsset = async (asset) => {
    setSelectedAsset(asset);
    setAssignTechId("");
    try {
      const [asgRes, logRes, alrtRes] = await Promise.all([
        api.get(`/assets/${asset.id}/assignments`),
        api.get(`/assets/${asset.id}/maintenance-logs`),
        api.get(`/assets/${asset.id}/alerts`),
      ]);
      setAssetAssignments(asgRes.data.assignments || []);
      setAssetLogs(logRes.data.logs || []);
      setAssetAlerts(alrtRes.data.alerts || []);
    } catch { flash("Failed to load asset details", true); }
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      await api.post("/assets", { ...assetForm, capacityKwh: Number(assetForm.capacityKwh) });
      setAssetForm({ name: "", siteName: "", category: "GRID_SCALE", capacityKwh: "", description: "" });
      setShowCreate(false);
      flash("Asset created");
      loadAssets(); loadManagerStats();
    } catch (err) { flash(err.response?.data?.message || "Failed to create asset", true); }
  };

  const handleAssign = async () => {
    if (!assignTechId) return;
    try {
      await api.post(`/assets/${selectedAsset.id}/assignments`, { technicianId: assignTechId });
      flash("Technician assigned");
      const res = await api.get(`/assets/${selectedAsset.id}/assignments`);
      setAssetAssignments(res.data.assignments || []);
      setAssignTechId("");
    } catch (e) { flash(e.response?.data?.message || "Failed to assign", true); }
  };

  const handleUnassign = async (techId) => {
    try {
      await api.delete(`/assets/${selectedAsset.id}/assignments/${techId}`);
      flash("Technician removed");
      const res = await api.get(`/assets/${selectedAsset.id}/assignments`);
      setAssetAssignments(res.data.assignments || []);
    } catch (e) { flash(e.response?.data?.message || "Failed to remove", true); }
  };

  const handleRaiseAlert = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/assets/${selectedAsset.id}/alerts`, alertForm);
      setAlertForm({ title: "", severity: "WARNING", description: "" });
      flash("Alert raised");
      const res = await api.get(`/assets/${selectedAsset.id}/alerts`);
      setAssetAlerts(res.data.alerts || []);
    } catch (err) { flash(err.response?.data?.message || "Failed to raise alert", true); }
  };

  const handleAlertStatus = async (alertId, status) => {
    try {
      await api.patch(`/alerts/${alertId}`, { status });
      flash(`Alert ${status.toLowerCase()}`);
      const res = await api.get(`/assets/${selectedAsset.id}/alerts`);
      setAssetAlerts(res.data.alerts || []);
    } catch (e) { flash(e.response?.data?.message || "Failed to update alert", true); }
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (!imageFile) return;
    const formData = new FormData();
    formData.append("image", imageFile);
    try {
      const res = await api.post(`/assets/${selectedAsset.id}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSelectedAsset(prev => ({ ...prev, imageUrl: res.data.imageUrl }));
      setImageFile(null);
      flash("Image uploaded");
    } catch (e) { flash(e.response?.data?.message || "Upload failed", true); }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const res = await api.patch(`/assets/${selectedAsset.id}/status`, { status: newStatus });
      flash(`Status updated to ${newStatus}`);
      setSelectedAsset(res.data.asset);
      loadAssets();
    } catch (e) { flash(e.response?.data?.message || "Failed to update status", true); }
  };

  const severityClass = (s) => s === "CRITICAL" ? "badge-critical" : s === "WARNING" ? "badge-warning" : "badge-info";
  const statusClass = (s) => s === "OPEN" ? "badge-critical" : s === "ACKNOWLEDGED" ? "badge-warning" : "badge-ok";
  const assetStatusClass = (s) => s === "ACTIVE" ? "badge-ok" : s === "UNDER_MAINTENANCE" ? "badge-warning" : s === "OFFLINE" ? "badge-critical" : "badge";

  const totalPages = Math.ceil(total / limit);

  // Get latest SoH for a given asset from managerStats
  const getLatestSoH = (assetId) => {
    if (!managerStats) return null;
    const entry = managerStats.assetSoH?.find(a => a.assetId === assetId);
    return entry?.latestSoH ?? null;
  };

  const SoHBar = ({ value }) => {
    if (value === null) return <p className="muted small">No readings yet</p>;
    const cls = value < 20 ? "soh-critical" : value < 40 ? "soh-warn" : "soh-ok";
    return (
      <div>
        <span className={`small ${value < 20 ? "text-critical" : value < 40 ? "text-warning" : ""}`}>SoH: <strong>{value}%</strong></span>
        <div className="soh-bar-wrap"><div className={`soh-bar ${cls}`} style={{ width: `${value}%` }} /></div>
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      {error && <div className="toast toast-error">{error}</div>}
      {success && <div className="toast toast-ok">{success}</div>}

      <div className="dash-sidebar">
        <div className="dash-role-badge manager">ASSET MANAGER</div>
        <p className="muted small">{user?.email}</p>
        {managerStats?.averageSoH !== null && managerStats?.averageSoH !== undefined && (
          <div style={{ margin: "0.75rem 0", padding: "0.5rem 0", borderTop: "1px solid #d2e4d6", borderBottom: "1px solid #d2e4d6" }}>
            <p className="muted small">Portfolio Avg SoH</p>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: managerStats.averageSoH < 20 ? "#ef4444" : managerStats.averageSoH < 40 ? "#f59e0b" : "#22c55e" }}>
              {managerStats.averageSoH}%
            </div>
            <div className="soh-bar-wrap">
              <div className={`soh-bar ${managerStats.averageSoH < 20 ? "soh-critical" : managerStats.averageSoH < 40 ? "soh-warn" : "soh-ok"}`}
                style={{ width: `${managerStats.averageSoH}%` }} />
            </div>
          </div>
        )}
        <nav className="dash-nav">
          <button className="active" onClick={() => setSelectedAsset(null)}>My Assets ({total})</button>
        </nav>
        <button className="btn-primary sidebar-create" onClick={() => { setShowCreate(!showCreate); setSelectedAsset(null); }}>
          {showCreate ? "Cancel" : "+ New Asset"}
        </button>
      </div>

      <div className="dash-main">
        {/* CREATE ASSET FORM */}
        {showCreate && (
          <div className="detail-section" style={{ marginBottom: "1.5rem" }}>
            <h3>Register New Asset</h3>
            <form className="form-grid" onSubmit={handleCreateAsset}>
              <input placeholder="Asset name" value={assetForm.name} onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))} required />
              <input placeholder="Site name" value={assetForm.siteName} onChange={e => setAssetForm(p => ({ ...p, siteName: e.target.value }))} required />
              <select value={assetForm.category} onChange={e => setAssetForm(p => ({ ...p, category: e.target.value }))}>
                <option value="GRID_SCALE">Grid Scale</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="RESIDENTIAL">Residential</option>
              </select>
              <input type="number" placeholder="Capacity (kWh)" value={assetForm.capacityKwh} onChange={e => setAssetForm(p => ({ ...p, capacityKwh: e.target.value }))} required />
              <textarea placeholder="Description (optional)" value={assetForm.description} onChange={e => setAssetForm(p => ({ ...p, description: e.target.value }))} rows={3} />
              <button type="submit" className="btn-primary">Create Asset</button>
            </form>
          </div>
        )}

        {/* ASSET LIST */}
        {!selectedAsset && (
          <div>
            <div className="section-header">
              <h2>My Assets</h2>
              <button className="btn-secondary" onClick={() => { loadAssets(); loadManagerStats(); }}>Refresh</button>
            </div>
            <div className="filter-bar" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
              <input placeholder="Search name / site..." value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applyFilters()} style={{ minWidth: "160px" }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="OFFLINE">Offline</option>
                <option value="DECOMMISSIONED">Decommissioned</option>
              </select>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">All Categories</option>
                <option value="GRID_SCALE">Grid Scale</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="RESIDENTIAL">Residential</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="">Sort by</option>
                <option value="name">Name</option>
                <option value="capacityKwh">Capacity</option>
                <option value="installationDate">Install Date</option>
              </select>
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                <option value="DESC">DESC</option>
                <option value="ASC">ASC</option>
              </select>
              <button className="btn-primary" onClick={applyFilters}>Filter</button>
              <button className="btn-secondary" onClick={clearFilters}>Clear</button>
            </div>

            {assets.length === 0 && <p className="muted">No assets match current filters.</p>}
            <div className="card-grid">
              {assets.map(a => {
                const soh = getLatestSoH(a.id);
                return (
                  <div className="asset-card clickable" key={a.id} onClick={() => openAsset(a)}>
                    <h4>{a.name}</h4>
                    <p className="muted small">{a.siteName}</p>
                    <div className="asset-meta">
                      <span className="badge">{a.category}</span>
                      <span className={`badge ${assetStatusClass(a.status)}`}>{a.status}</span>
                      <span className="badge">{a.capacityKwh} kWh</span>
                    </div>
                    <SoHBar value={soh} />
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page <= 1} onClick={() => goPage(page - 1)}>‹ Prev</button>
                <span className="muted small">Page {page} of {totalPages} ({total} total)</span>
                <button disabled={page >= totalPages} onClick={() => goPage(page + 1)}>Next ›</button>
              </div>
            )}
          </div>
        )}

        {/* ASSET DETAIL */}
        {selectedAsset && (
          <div>
            <button className="btn-back" onClick={() => setSelectedAsset(null)}>← Back to assets</button>
            <div className="asset-detail-header">
              <div>
                <h2>{selectedAsset.name}</h2>
                <p className="muted">{selectedAsset.siteName} · {selectedAsset.category} · {selectedAsset.capacityKwh} kWh</p>
              </div>
              <div className="status-update-row">
                <span className={`badge ${assetStatusClass(selectedAsset.status)}`}>{selectedAsset.status}</span>
                <select className="status-select" value={selectedAsset.status} onChange={e => handleStatusUpdate(e.target.value)}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                  <option value="OFFLINE">OFFLINE</option>
                  <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                </select>
              </div>
            </div>

            {/* Site Image */}
            <div style={{ margin: "1rem 0" }}>
              {selectedAsset.imageUrl && (
                <img src={`http://localhost:3000${selectedAsset.imageUrl}`} alt="Site"
                  style={{ maxHeight: "180px", borderRadius: "8px", marginBottom: "0.5rem", display: "block" }} />
              )}
              <form onSubmit={handleImageUpload} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} />
                <button type="submit" className="btn-secondary" disabled={!imageFile}>Upload Image</button>
              </form>
            </div>

            <div className="detail-sections">
              <div className="detail-section">
                <h3>Assigned Technicians</h3>
                <div className="assign-row">
                  <select value={assignTechId} onChange={e => setAssignTechId(e.target.value)}>
                    <option value="">— Select technician —</option>
                    {technicians.filter(t => !assetAssignments.some(a => a.technician?.id === t.id))
                      .map(t => <option key={t.id} value={t.id}>{t.fullName} ({t.email})</option>)}
                  </select>
                  <button className="btn-primary" onClick={handleAssign} disabled={!assignTechId}>Assign</button>
                </div>
                {assetAssignments.length === 0 && <p className="muted small">No technicians assigned.</p>}
                {assetAssignments.map(a => (
                  <div className="assign-item" key={a.id}>
                    <span>{a.technician?.fullName} <span className="muted small">({a.technician?.email})</span></span>
                    <button className="btn-danger-sm" onClick={() => handleUnassign(a.technician?.id)}>Remove</button>
                  </div>
                ))}
              </div>

              <div className="detail-section">
                <h3>Maintenance Logs ({assetLogs.length})</h3>
                {assetLogs.length === 0 && <p className="muted small">No logs yet.</p>}
                {assetLogs.map(l => (
                  <div className="log-item" key={l.id}>
                    <div className="log-header">
                      <span className="badge">{l.logType}</span>
                      <span className="muted small">{new Date(l.visitedAt).toLocaleDateString()}</span>
                      <span className="muted small">by {l.technician?.fullName}</span>
                    </div>
                    <p className="small">{l.description}</p>
                    <div className="log-meta">
                      <span>SoH: <strong className={l.stateOfHealthPercent < 20 ? "text-critical" : l.stateOfHealthPercent < 40 ? "text-warning" : ""}>{l.stateOfHealthPercent}%</strong></span>
                      {l.temperatureCelsius != null && <span>Temp: <strong>{l.temperatureCelsius}°C</strong></span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="detail-section">
                <h3>Alerts</h3>
                <form className="form-inline" onSubmit={handleRaiseAlert}>
                  <input placeholder="Alert title" value={alertForm.title} onChange={e => setAlertForm(p => ({ ...p, title: e.target.value }))} required />
                  <select value={alertForm.severity} onChange={e => setAlertForm(p => ({ ...p, severity: e.target.value }))}>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="WARNING">WARNING</option>
                    <option value="INFO">INFO</option>
                  </select>
                  <input placeholder="Description (optional)" value={alertForm.description} onChange={e => setAlertForm(p => ({ ...p, description: e.target.value }))} />
                  <button type="submit" className="btn-primary">Raise Alert</button>
                </form>
                {assetAlerts.length === 0 && <p className="muted small">No alerts.</p>}
                {assetAlerts.map(a => (
                  <div className="alert-item" key={a.id}>
                    <div className="alert-header">
                      <span className={`badge ${severityClass(a.severity)}`}>{a.severity}</span>
                      <span className={`badge ${statusClass(a.status)}`}>{a.status}</span>
                      <span className="muted small">{new Date(a.raisedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="small"><strong>{a.title}</strong></p>
                    {a.description && <p className="muted small">{a.description}</p>}
                    <div className="alert-actions">
                      {a.status === "OPEN" && <button className="btn-sm" onClick={() => handleAlertStatus(a.id, "ACKNOWLEDGED")}>Acknowledge</button>}
                      {a.status !== "RESOLVED" && <button className="btn-sm btn-ok" onClick={() => handleAlertStatus(a.id, "RESOLVED")}>Resolve</button>}
                    </div>
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
