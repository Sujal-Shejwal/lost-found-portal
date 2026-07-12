import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({ open, onClose, onLogout }) {
  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-header">
        <span className="menu-title">Menu</span>
      </div>

      <nav className="sidebar-links">
        <NavLink
          to="/dashboard"
          onClick={handleLinkClick}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/lost"
          onClick={handleLinkClick}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Lost Items
        </NavLink>

        <NavLink
          to="/found"
          onClick={handleLinkClick}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Found Items
        </NavLink>

        <NavLink
          to="/claims"
          onClick={handleLinkClick}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          My Claims
        </NavLink>

        <NavLink
          to="/notifications"
          onClick={handleLinkClick}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Notifications
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}