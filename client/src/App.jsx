import { useEffect, useState } from "react";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { useAuth } from "./hooks/useAuth";
import api from "./services/api";
import "./App.css";

function App() {
  const { isAuthenticated, user, login, register } = useAuth();
  const [tab, setTab] = useState("login");
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "ASSET_MANAGER",
  });
  const [assetForm, setAssetForm] = useState({
    name: "",
    siteName: "",
    category: "GRID_SCALE",
    capacityKwh: "",
    description: "",
  });
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [error, setError] = useState("");

  const loadAssets = async () => {
    if (!isAuthenticated) {
      return;
    }

    setLoadingAssets(true);
    setError("");
    try {
      const response = await api.get("/assets");
      setAssets(response.data.assets || []);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to load assets");
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [isAuthenticated]);

  const onAuthSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (tab === "login") {
        await login(authForm.email, authForm.password);
      } else {
        await register(authForm);
      }
    } catch (apiError) {
      if (!apiError.response) {
        setError("Cannot reach backend API. Start server and PostgreSQL, then retry.");
        return;
      }

      setError(apiError.response?.data?.message || "Authentication failed");
    }
  };

  const onAssetSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await api.post("/assets", {
        ...assetForm,
        capacityKwh: Number(assetForm.capacityKwh),
      });
      setAssetForm({
        name: "",
        siteName: "",
        category: "GRID_SCALE",
        capacityKwh: "",
        description: "",
      });
      await loadAssets();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Failed to create asset");
    }
  };

  return (
    <div className="page-shell">
      <Navbar />

      <main className="main-grid">
        {!isAuthenticated ? (
          <section className="panel">
            <div className="tab-row">
              <button className={tab === "login" ? "active" : ""} onClick={() => setTab("login")}>Login</button>
              <button className={tab === "register" ? "active" : ""} onClick={() => setTab("register")}>Register</button>
            </div>

            <form className="form-grid" onSubmit={onAuthSubmit}>
              {tab === "register" ? (
                <input
                  placeholder="Full name"
                  value={authForm.fullName}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  required
                />
              ) : null}

              <input
                type="email"
                placeholder="Email"
                value={authForm.email}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />

              {tab === "register" ? (
                <select
                  value={authForm.role}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, role: event.target.value }))}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="ASSET_MANAGER">Asset Manager</option>
                  <option value="TECHNICIAN">Field Technician</option>
                </select>
              ) : null}

              <button type="submit">{tab === "login" ? "Sign In" : "Create Account"}</button>
            </form>
          </section>
        ) : (
          <>
            <section className="panel">
              <h2>{user?.role} Dashboard</h2>
              <p className="muted">Logged in as {user?.email}</p>

              {user?.role === "ASSET_MANAGER" ? (
                <form className="form-grid" onSubmit={onAssetSubmit}>
                  <h3>Register New Asset</h3>
                  <input
                    placeholder="Asset name"
                    value={assetForm.name}
                    onChange={(event) => setAssetForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                  <input
                    placeholder="Site name"
                    value={assetForm.siteName}
                    onChange={(event) => setAssetForm((prev) => ({ ...prev, siteName: event.target.value }))}
                    required
                  />
                  <select
                    value={assetForm.category}
                    onChange={(event) => setAssetForm((prev) => ({ ...prev, category: event.target.value }))}
                  >
                    <option value="GRID_SCALE">Grid Scale</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="RESIDENTIAL">Residential</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Capacity (kWh)"
                    value={assetForm.capacityKwh}
                    onChange={(event) => setAssetForm((prev) => ({ ...prev, capacityKwh: event.target.value }))}
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={assetForm.description}
                    onChange={(event) => setAssetForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={4}
                  />
                  <button type="submit">Create Asset</button>
                </form>
              ) : (
                <div className="info-block">
                  <p>Use this baseline to continue building role-specific views and workflows.</p>
                </div>
              )}
            </section>

            <section className="panel">
              <div className="assets-header">
                <h3>Visible Assets</h3>
                <button onClick={loadAssets}>Refresh</button>
              </div>

              {loadingAssets ? <p>Loading assets...</p> : null}

              {!loadingAssets && assets.length === 0 ? (
                <p className="muted">No assets available for this role yet.</p>
              ) : null}

              <div className="asset-list">
                {assets.map((asset) => (
                  <article className="asset-card" key={asset.id}>
                    <h4>{asset.name}</h4>
                    <p>{asset.siteName}</p>
                    <div className="asset-meta">
                      <span>{asset.category}</span>
                      <span>{asset.status}</span>
                      <span>{asset.capacityKwh} kWh</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {error ? <div className="error-toast">{error}</div> : null}
      <Footer />
    </div>
  );
}

export default App;
