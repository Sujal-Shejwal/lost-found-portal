import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export default function FoundItems() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchItems = async () => {
      const q = query(collection(db, "foundItems"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchItems();
  }, []);

  return (
    <div className="dashboard-wrapper">
      <h3 className="section-title">Found Items</h3>
      {items.map(item => (
        <div className="action-card" key={item.id}>
          {item.imageUrl && <img src={item.imageUrl} alt="" style={{width:"100%",borderRadius:"12px"}} />}
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <small>{item.category}</small>
        </div>
      ))}
    </div>
  );
}
