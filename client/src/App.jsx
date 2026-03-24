import { useState } from "react";
import AdminDashboard from "./components/AdminDashboard";
import AssetManagerDashboard from "./components/AssetManagerDashboard";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import TechnicianDashboard from "./components/TechnicianDashboard";
import { useAuth } from "./hooks/useAuth";
import "./App.css";

function App() {
  const { isAuthenticated, user, login, register } = useAuth();
  const [tab, setTab] = useState("login");
  const [authForm, setAuthForm] = useState({ fullName: "", email: "", password: "", role: "ASSET_MANAGER" });
  const [error, setError] = useState("");

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
        setError("Cannot reach backend API. Start server and retry.");
        return;
      }
      setError(apiError.response?.data?.message || "Authentication failed");
    }
  };

  const renderDashboard = () => {
    if (user?.role === "ADMIN") return <AdminDashboard user={user} />;
    if (user?.role === "ASSET_MANAGER") return <AssetManagerDashboard user={user} />;
    if (user?.role === "TECHNICIAN") return <TechnicianDashboard user={user} />;
    return null;
  };

  return (
    <div className="page-shell">
      <Navbar />

      {!isAuthenticated ? (
        <main className="main-grid">
          <section className="panel">
            <div className="tab-row">
              <button className={tab === "login" ? "active" : ""} onClick={() => setTab("login")}>Login</button>
              <button className={tab === "register" ? "active" : ""} onClick={() => setTab("register")}>Register</button>
            </div>

            <form className="form-grid" onSubmit={onAuthSubmit}>
              {tab === "register" && (
                <input
                  placeholder="Full name"
                  value={authForm.fullName}
                  onChange={(e) => setAuthForm((p) => ({ ...p, fullName: e.target.value }))}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={authForm.email}
                onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
              {tab === "register" && (
                <select
                  value={authForm.role}
                  onChange={(e) => setAuthForm((p) => ({ ...p, role: e.target.value }))}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="ASSET_MANAGER">Asset Manager</option>
                  <option value="TECHNICIAN">Field Technician</option>
                </select>
              )}
              <button type="submit">{tab === "login" ? "Sign In" : "Create Account"}</button>
            </form>
          </section>
        </main>
      ) : (
        renderDashboard()
      )}

      {error && <div className="error-toast">{error}</div>}
      <Footer />
    </div>
  );
}

export default App;
