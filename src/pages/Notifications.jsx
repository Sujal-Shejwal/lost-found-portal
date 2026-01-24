import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";

function Notifications() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const q = query(
          collection(db, "notifications"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);

        if (isMounted) {
          setNotifications(
            snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }))
          );
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      {/* HAMBURGER – SAME AS DASHBOARD */}
      <button
        onClick={() => setMenuOpen(true)}
        style={{
          position: "fixed",
          top: "20px",
          left: "20px",
          fontSize: "22px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#2f4858",
          zIndex: 200,
        }}
      >
        ☰
      </button>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="dashboard-wrapper">
        <div className="dashboard-header">
          <h2>Notifications</h2>
        </div>

        {notifications.length === 0 ? (
          <div className="empty-state">
            No notifications available.
          </div>
        ) : (
          notifications.map(note => (
            <div key={note.id} className="action-card">
              <p>{note.message}</p>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default Notifications;
