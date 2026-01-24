import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";

function MyClaims() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchClaims = async () => {
      try {
        const q = query(
          collection(db, "claims"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);

        if (isMounted) {
          setClaims(
            snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }))
          );
        }
      } catch (err) {
        console.error("Error fetching claims:", err);
      }
    };

    fetchClaims();

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
          <h2>My Claims</h2>
        </div>

        {claims.length === 0 ? (
          <div className="empty-state">
            No claims submitted yet.
          </div>
        ) : (
          claims.map(claim => (
            <div key={claim.id} className="action-card">
              <h3>{claim.itemTitle || "Claimed Item"}</h3>
              <p>Status: {claim.status || "Pending"}</p>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default MyClaims;
