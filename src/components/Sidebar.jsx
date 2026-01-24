import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({ open, onClose, onLogout }) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-header">
        <span className="menu-title">Menu</span>
      </div>

      <nav className="sidebar-links" onClick={onClose}>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/lost">Lost Items</NavLink>
        <NavLink to="/found">Found Items</NavLink>
        <NavLink to="/claims">My Claims</NavLink>
        <NavLink to="/notifications">Notifications</NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
