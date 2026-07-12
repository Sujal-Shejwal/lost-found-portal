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

  // Fetch Lost Items
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "lostItems"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setItems(data);
    });

    return () => unsubscribe();
  }, []);

  // Claim Item
  const handleClaim = async (item) => {
    const user = auth.currentUser;

    if (!user) {
      alert("Please login to claim an item.");
      return;
    }

    try {
      await addDoc(collection(db, "claims"), {
        userId: user.uid,
        itemId: item.id,
        itemTitle: item.title,
        description: item.description || "",
        location: item.location || "",
        date: item.date || "",
        category: item.category || "",
        image: item.imageUrl || "",
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      alert("✅ Claim submitted successfully");
    } catch (error) {
      console.error("Claim Error:", error);
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
              {/* Image */}
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="item-image"
                />
              )}

              {/* Title */}
              <h3>{item.title}</h3>

              {/* Description */}
              <p className="item-desc">
                {item.description || "No description provided"}
              </p>

              {/* Meta Information */}
              <div className="item-meta">
                <span>📍 {item.location || "N/A"}</span>
                <span>📅 {item.date || "N/A"}</span>
                <span>📂 {item.category || "Other"}</span>
              </div>

              {/* Claim Button */}
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