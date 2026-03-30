import { useEffect, useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import api from "../services/api";

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#94a3b8"];

export default function AdminDashboard({ user }) {
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
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

  // Filters + pagination + search + sort
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(""), 3000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
  };

  const buildParams = (overrides = {}) => {
    const p = {
      status: filterStatus, category: filterCategory, search,
      startDate, endDate, sortBy, sortOrder,
      page, limit, ...overrides,
    };
    const params = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => { if (v) params.append(k, v); });
    return params.toString();
  };

  const loadAssets = async (overrides = {}) => {
    setLoading(true);
    try {
      const res = await api.get(`/assets?${buildParams(overrides)}`);
      setAssets(res.data.assets || []);
      setTotal(res.data.total || 0);
    } catch { flash("Failed to load assets", true); }
    finally { setLoading(false); }
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

  useEffect(() => { loadAssets(); loadAlerts(); loadUsers(); loadStats(); }, []);

  const applyFilters = () => {
    setPage(1);
    loadAssets({ status: filterStatus, category: filterCategory, search, startDate, endDate, sortBy, sortOrder, page: 1 });
    setSelectedAsset(null);
  };
  const clearFilters = () => {
    setFilterStatus(""); setFilterCategory(""); setSearch("");
    setStartDate(""); setEndDate(""); setSortBy(""); setSortOrder("DESC");
    setPage(1);
    loadAssets({ status: "", category: "", search: "", startDate: "", endDate: "", sortBy: "", sortOrder: "DESC", page: 1 });
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
      loadAssets(); loadStats();
    } catch (e) { flash(e.response?.data?.message || "Failed to update status", true); }
  };

  const handleAlertStatus = async (alertId, status) => {
    try {
      await api.patch(`/alerts/${alertId}`, { status });
      flash(`Alert marked as ${status}`);
      loadAlerts(); loadStats();
      if (selectedAsset) {
        const res = await api.get(`/assets/${selectedAsset.id}/alerts`);
        setAssetAlerts(res.data.alerts || []);
      }
    } catch (e) { flash(e.response?.data?.message || "Failed to update alert", true); }
  };

  const severityClass = (s) => s === "CRITICAL" ? "badge-critical" : s === "WARNING" ? "badge-warning" : "badge-info";
  const statusClass = (s) => s === "OPEN" ? "badge-critical" : s === "ACKNOWLEDGED" ? "badge-warning" : "badge-ok";
  const assetStatusClass = (s) => s === "ACTIVE" ? "badge-ok" : s === "UNDER_MAINTENANCE" ? "badge-warning" : s === "OFFLINE" ? "badge-critical" : "badge";

  const totalPages = Math.ceil(total / limit);

  // Chart data derived from stats
  const pieData = stats ? [
    { name: "Active", value: stats.assets.active },
    { name: "Maintenance", value: stats.assets.underMaintenance },
    { name: "Offline", value: stats.assets.offline },
    { name: "Decommissioned", value: stats.assets.decommissioned },
  ].filter(d => d.value > 0) : [];

  const barData = stats?.assetsPerMonth?.map(m => ({
    month: m.month,
    Assets: Number(m.count),
  })) || [];

  return (
    <div className="dashboard-layout">
      {error && <div className="toast toast-error">{error}</div>}
      {success && <div className="toast toast-ok">{success}</div>}

      <div className="dash-sidebar">
        <div className="dash-role-badge">ADMIN</div>
        <p className="muted small">{user?.email}</p>
        <nav className="dash-nav">
          <button className={activeTab === "assets" ? "active" : ""} onClick={() => { setActiveTab("assets"); setSelectedAsset(null); }}>Assets ({total})</button>
          <button className={activeTab === "charts" ? "active" : ""} onClick={() => { setActiveTab("charts"); setSelectedAsset(null); }}>Analytics</button>
          <button className={activeTab === "activity" ? "active" : ""} onClick={() => { setActiveTab("activity"); setSelectedAsset(null); }}>Recent Activity</button>
          <button className={activeTab === "alerts" ? "active" : ""} onClick={() => { setActiveTab("alerts"); setSelectedAsset(null); }}>
            All Alerts {stats ? `(${stats.alerts.open} open)` : ""}
          </button>
          <button className={activeTab === "users" ? "active" : ""} onClick={() => { setActiveTab("users"); setSelectedAsset(null); }}>Users ({users.length})</button>
        </nav>
      </div>

      <div className="dash-main">
        {/* KPI CARDS */}
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
              <div className="kpi-sub"><span className="badge">{stats.users.managers} Managers</span></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{stats.maintenanceLogs.total}</div>
              <div className="kpi-label">Maintenance Logs</div>
              <div className="kpi-sub"><span className="badge badge-ok">{stats.alerts.resolved} Alerts resolved</span></div>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "charts" && !selectedAsset && stats && (
          <div>
            <h2>Platform Analytics</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "1.5rem" }}>
              <div className="detail-section">
                <h3>Assets by Status</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="detail-section">
                <h3>Assets Registered (Last 6 Months)</h3>
                {barData.length === 0
                  ? <p className="muted small">No data yet.</p>
                  : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={barData}>
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="Assets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
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

            {/* Filter + Search + Sort Bar */}
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
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} title="Install date from" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} title="Install date to" />
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

            {loading && <p className="muted">Loading assets...</p>}
            {!loading && assets.length === 0 && <p className="muted">No assets match the current filters.</p>}
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

            {/* Pagination */}
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
                <select className="status-select" value={selectedAsset.status} onChange={e => handleStatusUpdate(selectedAsset.id, e.target.value)}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                  <option value="OFFLINE">OFFLINE</option>
                  <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                </select>
              </div>
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
                    {l.notes && <p className="muted small">{l.notes}</p>}
                  </div>
                ))}
              </div>

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

        {/* RECENT ACTIVITY TAB */}
        {activeTab === "activity" && (
          <div>
            <div className="section-header">
              <h2>Recent Activity</h2>
              <button className="btn-secondary" onClick={loadStats}>Refresh</button>
            </div>
            {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
              <p className="muted">No activity yet.</p>
            )}
            <div className="activity-feed">
              {(stats?.recentActivity || []).map((item, i) => (
                <div className="activity-item" key={i}>
                  <span className={`activity-dot ${item.type === "alert" ? "dot-alert" : item.type === "log" ? "dot-log" : "dot-user"}`} />
                  <div className="activity-body">
                    <p className="small">{item.message}</p>
                    <p className="muted small">{new Date(item.time).toLocaleString()}</p>
                  </div>
                </div>
              ))}
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
              <div className="users-thead"><span>Name</span><span>Email</span><span>Role</span><span>Change Role</span></div>
              {users.map(u => (
                <div className="users-row" key={u.id}>
                  <span>{u.fullName}</span>
                  <span className="muted small">{u.email}</span>
                  <span><span className={`badge ${u.role === "ADMIN" ? "badge-critical" : u.role === "ASSET_MANAGER" ? "badge-warning" : "badge-info"}`}>{u.role}</span></span>
                  <span style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    {u.id === user?.id
                      ? <span className="muted small">(you)</span>
                      : (
                        <>
                          <select
                            defaultValue={u.role}
                            id={`role-select-${u.id}`}
                            style={{ fontSize: "0.8rem", padding: "2px 4px" }}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="ASSET_MANAGER">ASSET_MANAGER</option>
                            <option value="TECHNICIAN">TECHNICIAN</option>
                          </select>
                          <button className="btn-sm" onClick={async () => {
                            const sel = document.getElementById(`role-select-${u.id}`);
                            const newRole = sel.value;
                            if (newRole === u.role) return;
                            try {
                              await api.patch(`/users/${u.id}/role`, { role: newRole });
                              flash(`${u.fullName} is now ${newRole}`);
                              loadUsers(); loadStats();
                            } catch (e) { flash(e.response?.data?.message || "Failed to update role", true); }
                          }}>Save</button>
                        </>
                      )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
