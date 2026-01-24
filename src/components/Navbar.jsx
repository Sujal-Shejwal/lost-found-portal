import { NavLink } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar">
      <h2>Lost & Found</h2>

      <div className="nav-links">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/lost">Lost Items</NavLink>
        <NavLink to="/found">Found Items</NavLink>
        <NavLink to="/claims">My Claims</NavLink>
        <NavLink to="/notifications">Notifications</NavLink>
      </div>

      <button className="logout">Logout</button>
    </nav>
  );
}
