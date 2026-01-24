import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { auth, db, storage } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(
        user.displayName
          ? user.displayName.split(" ")[0]
          : user.email.split("@")[0]
      );
    }
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const [lostItem, setLostItem] = useState({
    title: "",
    category: "",
    description: "",
    date: "",
    location: "",
    phone: "",
    image: null,
  });

  const [foundItem, setFoundItem] = useState({
    title: "",
    category: "",
    description: "",
    date: "",
    location: "",
    phone: "",
    image: null,
  });

  // ✅ SAFE IMAGE UPLOAD (NEVER BLOCKS SAVE)
  const uploadImageSafe = async (file, folder) => {
    try {
      const imageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
      await uploadBytes(imageRef, file);
      return await getDownloadURL(imageRef);
    } catch (e) {
      console.error("Image upload failed:", e);
      return "";
    }
  };

  // ✅ LOST SUBMIT FIXED
  const submitLostItem = async () => {
    try {
      let imageUrl = "";
      if (lostItem.image) {
        imageUrl = await uploadImageSafe(lostItem.image, "lostItems");
      }

      await addDoc(collection(db, "lostItems"), {
        title: lostItem.title,
        category: lostItem.category,
        description: lostItem.description,
        date: lostItem.date,
        location: lostItem.location,
        phone: lostItem.phone,
        imageUrl,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      alert("Lost item submitted ✅");

      setLostItem({
        title: "",
        category: "",
        description: "",
        date: "",
        location: "",
        phone: "",
        image: null,
      });
    } catch (e) {
      console.error(e);
      alert("Lost item failed ❌");
    }
  };

  // ✅ FOUND SUBMIT FIXED
  const submitFoundItem = async () => {
    try {
      let imageUrl = "";
      if (foundItem.image) {
        imageUrl = await uploadImageSafe(foundItem.image, "foundItems");
      }

      await addDoc(collection(db, "foundItems"), {
        title: foundItem.title,
        category: foundItem.category,
        description: foundItem.description,
        date: foundItem.date,
        location: foundItem.location,
        phone: foundItem.phone,
        imageUrl,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      alert("Found item submitted ✅");

      setFoundItem({
        title: "",
        category: "",
        description: "",
        date: "",
        location: "",
        phone: "",
        image: null,
      });
    } catch (e) {
      console.error(e);
      alert("Found item failed ❌");
    }
  };

  return (
    <>
      <button className="hamburger-btn" onClick={() => setMenuOpen(true)}>☰</button>

      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} onLogout={handleLogout} />

      <div className="dashboard-wrapper">
        <div className="dashboard-header">
          <h2>Welcome, {userName} 👋</h2>
          <p>Manage your lost and found items securely.</p>
        </div>

        <h3 className="section-title">Quick Actions</h3>

        <div className="actions-grid">
          <div className="action-card">
            <h3>Report Lost Item</h3>
            <input value={lostItem.title} onChange={e=>setLostItem({...lostItem,title:e.target.value})} placeholder="Item Title"/>
            <select className="category-select" value={lostItem.category} onChange={e=>setLostItem({...lostItem,category:e.target.value})}>
              <option value="">Select Category</option><option>Wallet</option><option>Phone</option><option>ID Card</option><option>Bag</option><option>Other</option>
            </select>
            <textarea value={lostItem.description} onChange={e=>setLostItem({...lostItem,description:e.target.value})}/>
            <input type="date" value={lostItem.date} onChange={e=>setLostItem({...lostItem,date:e.target.value})}/>
            <input value={lostItem.location} onChange={e=>setLostItem({...lostItem,location:e.target.value})} placeholder="Last seen location"/>
            <input value={lostItem.phone} onChange={e=>setLostItem({...lostItem,phone:e.target.value})} placeholder="Phone"/>
            <input type="file" accept="image/*" onChange={e=>setLostItem({...lostItem,image:e.target.files[0]})}/>
            <button className="primary-btn" onClick={submitLostItem}>Submit Lost Item</button>
          </div>

          <div className="action-card">
            <h3>Report Found Item</h3>
            <input value={foundItem.title} onChange={e=>setFoundItem({...foundItem,title:e.target.value})} placeholder="Item Title"/>
            <select className="category-select" value={foundItem.category} onChange={e=>setFoundItem({...foundItem,category:e.target.value})}>
              <option value="">Select Category</option><option>Wallet</option><option>Phone</option><option>ID Card</option><option>Bag</option><option>Other</option>
            </select>
            <textarea value={foundItem.description} onChange={e=>setFoundItem({...foundItem,description:e.target.value})}/>
            <input type="date" value={foundItem.date} onChange={e=>setFoundItem({...foundItem,date:e.target.value})}/>
            <input value={foundItem.location} onChange={e=>setFoundItem({...foundItem,location:e.target.value})} placeholder="Found location"/>
            <input value={foundItem.phone} onChange={e=>setFoundItem({...foundItem,phone:e.target.value})} placeholder="Phone"/>
            <input type="file" accept="image/*" onChange={e=>setFoundItem({...foundItem,image:e.target.files[0]})}/>
            <button className="primary-btn" onClick={submitFoundItem}>Submit Found Item</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
