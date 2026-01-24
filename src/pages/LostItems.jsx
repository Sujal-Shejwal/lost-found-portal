import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import "./LostItems.css";

function LostItems() {
  const [items, setItems] = useState([]);

  const fetchItems = async () => {
    const q = query(
      collection(db, "lostItems"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);

    setItems(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lost item?")) return;
    await deleteDoc(doc(db, "lostItems", id));
    fetchItems();
  };

  return (
    <div className="lost-wrapper">
      <h2 className="lost-title">Lost Items</h2>

      {items.length === 0 && (
        <div className="lost-empty">No lost items reported.</div>
      )}

      <div className="lost-grid">
        {items.map((item) => (
          <div className="lost-card" key={item.id}>
            {/* ✅ IMAGE */}
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="lost-image"
              />
            )}

            <div className="lost-content">
              {/* ✅ TITLE */}
              <h3>{item.title || "Untitled Item"}</h3>

              {/* ✅ CATEGORY */}
              {item.category && (
                <span className="lost-category">
                  {item.category}
                </span>
              )}

              {/* ✅ DESCRIPTION */}
              <p className="lost-desc">
                {item.description || "No description provided"}
              </p>

              {/* ✅ META */}
              <div className="lost-meta">
                <span>📍 {item.location || "Unknown location"}</span>
                <span>📅 {item.date || "No date"}</span>
              </div>

              {/* ✅ PHONE */}
              {item.phone && (
                <div className="lost-phone">
                  📞 {item.phone}
                </div>
              )}

              {/* ✅ DELETE */}
              <button
                className="lost-delete"
                onClick={() => handleDelete(item.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LostItems;
