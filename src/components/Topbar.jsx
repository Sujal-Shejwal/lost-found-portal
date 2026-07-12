import "./Topbar.css";

export default function Topbar({ onMenuClick }) {
  return (
    <button
      className="hamburger-btn"
      onClick={onMenuClick}
      aria-label="Open Menu"
    >
      ☰
    </button>
  );
}