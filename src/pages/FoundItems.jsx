import { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Items.css";

function FoundItems() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "foundItems"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setItems(data);
    });

    return () => unsub();
  }, []);

  const handleDelete = async (id, ownerId) => {
    const user = auth.currentUser;

    if (!user || user.uid !== ownerId) {
      alert("❌ You can delete only your own found items");
      return;
    }

    if (!window.confirm("Delete this found item?")) return;

    await deleteDoc(doc(db, "foundItems", id));
    alert("✅ Found item deleted");
  };

  return (
    <div className="items-page">
      <h2>Found Items</h2>

      {items.length === 0 ? (
        <p className="empty-text">No found items yet.</p>
      ) : (
        <div className="items-grid">
          {items.map((item) => (
            <div className="item-card" key={item.id}>
              {item.image && (
                <img src={item.image} alt={item.title} className="item-image" />
              )}

              <h3>{item.title}</h3>
              <p className="item-desc">
                {item.description || "No description"}
              </p>

              <div className="item-meta">
                <span>📍 {item.location}</span>
                <span>📅 {item.date}</span>
                <span>📂 {item.category}</span>
              </div>

              {/* ✅ ALWAYS SHOW BUTTON */}
              <button
                className="item-delete"
                onClick={() => handleDelete(item.id, item.userId)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FoundItems;
