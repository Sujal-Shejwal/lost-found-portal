import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Items.css";

function LostItems() {
  const [items, setItems] = useState([]);

  // 🔹 Fetch lost items from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "lostItems"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setItems(data);
    });

    return () => unsub();
  }, []);

  // 🔹 Claim item (THIS WAS MISSING EARLIER)
  const handleClaim = async (item) => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please login to claim an item");
      return;
    }

    try {
      await addDoc(collection(db, "claims"), {
        userId: user.uid,
        itemId: item.id,
        itemTitle: item.title,
        description: item.description,
        location: item.location,
        date: item.date,
        image: item.image || "",
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      alert("✅ Claim submitted successfully");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to submit claim");
    }
  };

  return (
    <div className="items-page">
      <h2>Lost Items</h2>

      {items.length === 0 ? (
        <p className="empty-text">No lost items reported yet.</p>
      ) : (
        <div className="items-grid">
          {items.map((item) => (
            <div className="item-card" key={item.id}>
              {/* IMAGE */}
              {item.image && (
                <img
                  src={item.image}
                  alt={item.title}
                  className="item-image"
                />
              )}

              {/* TITLE */}
              <h3>{item.title}</h3>

              {/* DESCRIPTION */}
              <p className="item-desc">
                {item.description || "No description provided"}
              </p>

              {/* META INFO */}
              <div className="item-meta">
                <span>📍 {item.location}</span>
                <span>📅 {item.date}</span>
                <span>📂 {item.category}</span>
              </div>

              {/* CLAIM BUTTON */}
              <button
                className="item-delete"
                onClick={() => handleClaim(item)}
              >
                Claim this item
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LostItems;
