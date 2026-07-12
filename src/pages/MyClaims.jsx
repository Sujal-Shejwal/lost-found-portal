import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Items.css";

function MyClaims() {
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "claims"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClaims(data);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="items-page">
      <h2>My Claims</h2>

      {claims.length === 0 ? (
        <p className="empty-text">No claims submitted yet.</p>
      ) : (
        <div className="items-grid">
          {claims.map((item) => (
            <div className="item-card" key={item.id}>
              {item.image && (
                <img src={item.image} alt="" className="item-image" />
              )}

              <span className="status-badge status-pending">
                {item.status}
              </span>

              <h3>{item.itemTitle}</h3>
              <p className="item-desc">{item.description}</p>

              <div className="item-meta">
                <span>📍 {item.location}</span>
                <span>📅 {item.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyClaims;
