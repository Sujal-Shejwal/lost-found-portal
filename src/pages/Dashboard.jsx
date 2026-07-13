import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ItemForm, { getInitialItemState } from "../components/ItemForm";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { uploadImageSafe } from "../utils/uploadImage";
import { validateItem, isFormValid } from "../utils/validation";
import {
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiPackage,
  FiMenu,
} from "react-icons/fi";
import "./Dashboard.css";

// Maps form type to its Firestore collection + Storage folder name.
// Keeping these names exactly as before is required.
const COLLECTIONS = { lost: "lostItems", found: "foundItems" };
const FOLDERS = { lost: "lostItems", found: "foundItems" };

function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  const [lostItem, setLostItem] = useState(getInitialItemState());
  const [foundItem, setFoundItem] = useState(getInitialItemState());

  const [lostErrors, setLostErrors] = useState({});
  const [foundErrors, setFoundErrors] = useState({});

  const [isSubmittingLost, setIsSubmittingLost] = useState(false);
  const [isSubmittingFound, setIsSubmittingFound] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(
        user.displayName ? user.displayName.split(" ")[0] : user.email.split("@")[0]
      );
    }
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // Generic field updater used by both forms
  const updateField = (setter) => (field, value) => {
    setter((prev) => ({ ...prev, [field]: value }));
  };

  // Shared submit logic for both Lost and Found forms.
  // type: "lost" | "found"
  const submitItem = async (type, item, setErrors, setIsSubmitting, resetState) => {
    // Prevent submission if not logged in
    if (!auth.currentUser) {
      alert("You must be logged in to submit an item.");
      return;
    }

    const errors = validateItem(item);
    setErrors(errors);
    if (!isFormValid(errors)) return;

    // Prevent duplicate submissions while one is already in progress
    setIsSubmitting(true);

    try {
      const imageUrl = await uploadImageSafe(item.image, FOLDERS[type]);

      await addDoc(collection(db, COLLECTIONS[type]), {
        title: item.title.trim(),
        category: item.category,
        description: item.description.trim(),
        date: item.date,
        location: item.location.trim(),
        phone: item.phone.trim(),
        imageUrl,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      alert(`${type === "lost" ? "Lost" : "Found"} item submitted ✅`);
      resetState(getInitialItemState()); // also clears the file input via re-render
      setErrors({});
    } catch (error) {
      console.error(error);
      alert(
        `Failed to submit ${type} item: ${error.message || "Please try again."} ❌`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLostItem = () =>
    submitItem("lost", lostItem, setLostErrors, setIsSubmittingLost, setLostItem);

  const submitFoundItem = () =>
    submitItem("found", foundItem, setFoundErrors, setIsSubmittingFound, setFoundItem);

  return (
    <>
      <button className="hamburger-btn" onClick={() => setMenuOpen(true)}>
        <FiMenu />
      </button>

      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} onLogout={handleLogout} />

      <div className="dashboard-wrapper">
        {/* ===== Header ===== */}
        <div className="dashboard-header">
          <div className="dashboard-header-text">
            <span className="welcome-eyebrow">Dashboard</span>
            <h2>
              Welcome back, <span className="welcome-name">{userName}</span>{" "}
              <span className="wave">👋</span>
            </h2>
            <p>Manage your lost and found items securely, all in one place.</p>
          </div>
        </div>

        {/* ===== Stats ===== */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-lost">
              <FiSearch />
            </div>
            <div className="stat-info">
              <span className="stat-value">--</span>
              <span className="stat-label">Total Lost Reports</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-found">
              <FiPackage />
            </div>
            <div className="stat-info">
              <span className="stat-value">--</span>
              <span className="stat-label">Total Found Reports</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-claimed">
              <FiCheckCircle />
            </div>
            <div className="stat-info">
              <span className="stat-value">--</span>
              <span className="stat-label">Claimed Items</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-pending">
              <FiClock />
            </div>
            <div className="stat-info">
              <span className="stat-value">--</span>
              <span className="stat-label">Pending Claims</span>
            </div>
          </div>
        </div>

        <h3 className="section-title">Quick Actions</h3>

        <div className="actions-grid">
          <ItemForm
            type="lost"
            item={lostItem}
            errors={lostErrors}
            isSubmitting={isSubmittingLost}
            onChange={updateField(setLostItem)}
            onSubmit={submitLostItem}
          />

          <ItemForm
            type="found"
            item={foundItem}
            errors={foundErrors}
            isSubmitting={isSubmittingFound}
            onChange={updateField(setFoundItem)}
            onSubmit={submitFoundItem}
          />
        </div>
      </div>
    </>
  );
}

export default Dashboard;