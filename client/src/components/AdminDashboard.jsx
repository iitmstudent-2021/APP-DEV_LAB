import { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminDashboard({ user }) {
  const [assets, setAssets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [users, setUsers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assignTechId, setAssignTechId] = useState("");
  const [assetAssignments, setAssetAssignments] = useState([]);
  const [assetLogs, setAssetLogs] = useState([]);
  const [assetAlerts, setAssetAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("assets");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(""), 3000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
  };

  const loadAssets = async (status = filterStatus, category = filterCategory) => {
    try {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (category) params.append("category", category);
      const res = await api.get(`/assets?${params}`);
      setAssets(res.data.assets || []);
    } catch { flash("Failed to load assets", true); }
  };

  const loadAlerts = async () => {
    try {
      const res = await api.get("/alerts");
      setAlerts(res.data.alerts || []);
    } catch { flash("Failed to load alerts", true); }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data.users || []);
      setTechnicians((res.data.users || []).filter(u => u.role === "TECHNICIAN"));
    } catch { flash("Failed to load users", true); }
  };

  const loadStats = async () => {
    try {
      const res = await api.get("/stats");
      setStats(res.data.stats);
    } catch { /* stats are non-critical */ }
  };

  useEffect(() => {
    loadAssets();
    loadAlerts();
    loadUsers();
    loadStats();
  }, []);

  const applyFilters = () => { loadAssets(filterStatus, filterCategory); setSelectedAsset(null); };
  const clearFilters = () => { setFilterStatus(""); setFilterCategory(""); loadAssets("", ""); setSelectedAsset(null); };

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

  const handleStatusUpdate = async (assetId, newStatus) => {
    try {
      const res = await api.patch(`/assets/${assetId}/status`, { status: newStatus });
      flash(`Status updated to ${newStatus}`);
      if (selectedAsset?.id === assetId) setSelectedAsset(res.data.asset);
      loadAssets();
      loadStats();
    } catch (e) { flash(e.response?.data?.message || "Failed to update status", true); }
  };

  const handleAlertStatus = async (alertId, status) => {
    try {
      await api.patch(`/alerts/${alertId}`, { status });
      flash(`Alert marked as ${status}`);
      loadAlerts();
      loadStats();
      if (selectedAsset) {
        const res = await api.get(`/assets/${selectedAsset.id}/alerts`);
        setAssetAlerts(res.data.alerts || []);
      }
    } catch (e) { flash(e.response?.data?.message || "Failed to update alert", true); }
  };

  const severityClass = (s) => s === "CRITICAL" ? "badge-critical" : s === "WARNING" ? "badge-warning" : "badge-info";
  const statusClass = (s) => s === "OPEN" ? "badge-critical" : s === "ACKNOWLEDGED" ? "badge-warning" : "badge-ok";
  const assetStatusClass = (s) => s === "ACTIVE" ? "badge-ok" : s === "UNDER_MAINTENANCE" ? "badge-warning" : s === "OFFLINE" ? "badge-critical" : "badge";

  return (
    <div className="dashboard-layout">
      {error && <div className="toast toast-error">{error}</div>}
      {success && <div className="toast toast-ok">{success}</div>}

      <div className="dash-sidebar">
        <div className="dash-role-badge">ADMIN</div>
        <p className="muted small">{user?.email}</p>
        <nav className="dash-nav">
          <button className={activeTab === "assets" ? "active" : ""} onClick={() => { setActiveTab("assets"); setSelectedAsset(null); }}>Assets ({assets.length})</button>
          <button className={activeTab === "alerts" ? "active" : ""} onClick={() => { setActiveTab("alerts"); setSelectedAsset(null); }}>
            All Alerts {stats ? `(${stats.alerts.open} open)` : ""}
          </button>
          <button className={activeTab === "users" ? "active" : ""} onClick={() => { setActiveTab("users"); setSelectedAsset(null); }}>Users ({users.length})</button>
        </nav>
      </div>

      <div className="dash-main">
        {/* KPI CARDS — shown on all tabs when no asset selected */}
        {!selectedAsset && stats && (
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-value">{stats.assets.total}</div>
              <div className="kpi-label">Total Assets</div>
              <div className="kpi-sub">
                <span className="badge badge-ok">{stats.assets.active} Active</span>
                <span className="badge badge-warning">{stats.assets.underMaintenance} Maintenance</span>
                <span className="badge badge-critical">{stats.assets.offline} Offline</span>
              </div>
            </div>
            <div className="kpi-card kpi-alert">
              <div className="kpi-value">{stats.alerts.open}</div>
              <div className="kpi-label">Open Alerts</div>
              <div className="kpi-sub">
                <span className="badge badge-critical">{stats.alerts.critical} Critical</span>
                <span className="badge badge-warning">{stats.alerts.warning} Warning</span>
                <span className="badge badge-info">{stats.alerts.info} Info</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{stats.users.technicians}</div>
              <div className="kpi-label">Technicians</div>
              <div className="kpi-sub">
                <span className="badge">{stats.users.managers} Managers</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{stats.maintenanceLogs.total}</div>
              <div className="kpi-label">Maintenance Logs</div>
              <div className="kpi-sub">
                <span className="badge badge-ok">{stats.alerts.resolved} Alerts resolved</span>
              </div>
            </div>
          </div>
        )}

        {/* ASSETS TAB */}
        {activeTab === "assets" && !selectedAsset && (
          <div>
            <div className="section-header">
              <h2>All Assets</h2>
              <button className="btn-secondary" onClick={() => { loadAssets(); loadStats(); }}>Refresh</button>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
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
              <button className="btn-primary" onClick={applyFilters}>Filter</button>
              {(filterStatus || filterCategory) && <button className="btn-secondary" onClick={clearFilters}>Clear</button>}
            </div>

            {assets.length === 0 && <p className="muted">No assets match the current filters.</p>}
            <div className="card-grid">
              {assets.map(a => (
                <div className="asset-card clickable" key={a.id} onClick={() => openAsset(a)}>
                  <h4>{a.name}</h4>
                  <p className="muted small">{a.siteName}</p>
                  <div className="asset-meta">
                    <span className="badge">{a.category}</span>
                    <span className={`badge ${assetStatusClass(a.status)}`}>{a.status}</span>
                    <span className="badge">{a.capacityKwh} kWh</span>
                  </div>
                  <p className="muted small">Owner: {a.owner?.fullName || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ASSET DETAIL */}
        {activeTab === "assets" && selectedAsset && (
          <div>
            <button className="btn-back" onClick={() => setSelectedAsset(null)}>← Back to assets</button>
            <div className="asset-detail-header">
              <div>
                <h2>{selectedAsset.name}</h2>
                <p className="muted">{selectedAsset.siteName} · {selectedAsset.category} · {selectedAsset.capacityKwh} kWh</p>
              </div>
              <div className="status-update-row">
                <span className={`badge ${assetStatusClass(selectedAsset.status)}`}>{selectedAsset.status}</span>
                <select
                  className="status-select"
                  value={selectedAsset.status}
                  onChange={e => handleStatusUpdate(selectedAsset.id, e.target.value)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                  <option value="OFFLINE">OFFLINE</option>
                  <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                </select>
              </div>
            </div>

            <div className="detail-sections">
              {/* Assigned Technicians */}
              <div className="detail-section">
                <h3>Assigned Technicians</h3>
                <div className="assign-row">
                  <select value={assignTechId} onChange={e => setAssignTechId(e.target.value)}>
                    <option value="">— Select technician —</option>
                    {technicians
                      .filter(t => !assetAssignments.some(a => a.technician?.id === t.id))
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

              {/* Maintenance Logs */}
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
                    {l.notes && <p className="muted small">{l.notes}</p>}
                  </div>
                ))}
              </div>

              {/* Alerts */}
              <div className="detail-section">
                <h3>Alerts ({assetAlerts.length})</h3>
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

        {/* ALERTS TAB */}
        {activeTab === "alerts" && (
          <div>
            <div className="section-header">
              <h2>All Alerts</h2>
              <button className="btn-secondary" onClick={() => { loadAlerts(); loadStats(); }}>Refresh</button>
            </div>
            {alerts.length === 0 && <p className="muted">No alerts raised yet.</p>}
            {alerts.map(a => (
              <div className="alert-item" key={a.id}>
                <div className="alert-header">
                  <span className={`badge ${severityClass(a.severity)}`}>{a.severity}</span>
                  <span className={`badge ${statusClass(a.status)}`}>{a.status}</span>
                  <span className="muted small">{a.asset?.name}</span>
                  <span className="muted small">{new Date(a.raisedAt).toLocaleDateString()}</span>
                </div>
                <p className="small"><strong>{a.title}</strong></p>
                {a.description && <p className="muted small">{a.description}</p>}
                <p className="muted small">Raised by: {a.raisedBy?.fullName}</p>
                <div className="alert-actions">
                  {a.status === "OPEN" && <button className="btn-sm" onClick={() => handleAlertStatus(a.id, "ACKNOWLEDGED")}>Acknowledge</button>}
                  {a.status !== "RESOLVED" && <button className="btn-sm btn-ok" onClick={() => handleAlertStatus(a.id, "RESOLVED")}>Resolve</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div>
            <div className="section-header">
              <h2>All Users</h2>
              <button className="btn-secondary" onClick={loadUsers}>Refresh</button>
            </div>
            <div className="users-table">
              <div className="users-thead"><span>Name</span><span>Email</span><span>Role</span></div>
              {users.map(u => (
                <div className="users-row" key={u.id}>
                  <span>{u.fullName}</span>
                  <span className="muted small">{u.email}</span>
                  <span><span className={`badge ${u.role === "ADMIN" ? "badge-critical" : u.role === "ASSET_MANAGER" ? "badge-warning" : "badge-info"}`}>{u.role}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
