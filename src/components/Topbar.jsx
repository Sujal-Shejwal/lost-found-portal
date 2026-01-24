import "./Topbar.css";

export default function Topbar({ onMenuClick }) {
  return (
    <>
      {/* Hamburger only – no top bar */}
      <button className="hamburger-btn" onClick={onMenuClick}>
        ☰
      </button>
    </>
  );
}
