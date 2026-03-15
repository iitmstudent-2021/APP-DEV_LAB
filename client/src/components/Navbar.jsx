import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="navbar">
      <div>
        <h1>BESS Ops Portal</h1>
        <p>Asset Operations and Maintenance</p>
      </div>
      {isAuthenticated ? (
        <div className="user-chip">
          <span>{user?.fullName}</span>
          <small>{user?.role}</small>
          <button onClick={logout}>Logout</button>
        </div>
      ) : null}
    </header>
  );
}
