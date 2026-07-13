import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import ItemForm, { getInitialItemState } from "../components/ItemForm";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { uploadImageSafe } from "../utils/uploadImage";
import { validateItem, isFormValid } from "../utils/validation";
import {
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiPackage,
  FiMenu,
  FiCalendar,
  FiList,
} from "react-icons/fi";
import "./Dashboard.css";

// Maps form type to its Firestore collection + Storage folder name.
// Keeping these names exactly as before is required.
const COLLECTIONS = { lost: "lostItems", found: "foundItems" };
const FOLDERS = { lost: "lostItems", found: "foundItems" };

// Returns "Good Morning" / "Good Afternoon" / "Good Evening" based on the clock
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

// Returns today's date formatted like "Monday, 13 July 2026"
const getFormattedDate = () => {
  const today = new Date();
  const weekday = today.toLocaleDateString("en-US", { weekday: "long" });
  const day = today.getDate();
  const month = today.toLocaleDateString("en-US", { month: "long" });
  const year = today.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
};

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

  // ===== Dashboard statistics =====
  const [stats, setStats] = useState({ lost: 0, found: 0, claimed: 0, pending: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // ===== Recent activity =====
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(
        user.displayName ? user.displayName.split(" ")[0] : user.email.split("@")[0]
      );
    }
  }, []);

  // Fetches total/claimed/pending counts across both collections
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const lostSnap = await getCountFromServer(collection(db, "lostItems"));
      const foundSnap = await getCountFromServer(collection(db, "foundItems"));

      const claimedLostSnap = await getCountFromServer(
        query(collection(db, "lostItems"), where("status", "==", "claimed"))
      );
      const claimedFoundSnap = await getCountFromServer(
        query(collection(db, "foundItems"), where("status", "==", "claimed"))
      );

      const totalLost = lostSnap.data().count;
      const totalFound = foundSnap.data().count;
      const totalClaimed = claimedLostSnap.data().count + claimedFoundSnap.data().count;
      const totalPending = totalLost + totalFound - totalClaimed;

      setStats({
        lost: totalLost,
        found: totalFound,
        claimed: totalClaimed,
        pending: totalPending,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetches the latest 5 reports (lost + found combined) for the current user
  const fetchRecentActivity = useCallback(async () => {
    if (!auth.currentUser) {
      setActivityLoading(false);
      return;
    }

    setActivityLoading(true);
    try {
      const lostQuery = query(
        collection(db, "lostItems"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const foundQuery = query(
        collection(db, "foundItems"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const [lostSnap, foundSnap] = await Promise.all([
        getDocs(lostQuery),
        getDocs(foundQuery),
      ]);

      const lostDocs = lostSnap.docs.map((doc) => ({
        id: doc.id,
        type: "lost",
        ...doc.data(),
      }));
      const foundDocs = foundSnap.docs.map((doc) => ({
        id: doc.id,
        type: "found",
        ...doc.data(),
      }));

      const combined = [...lostDocs, ...foundDocs]
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return bTime - aTime;
        })
        .slice(0, 5);

      setRecentActivity(combined);
    } catch (error) {
      console.error("Failed to fetch recent activity:", error);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, [fetchStats, fetchRecentActivity]);

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
        status: "pending",
        createdAt: serverTimestamp(),
      });

      alert(`${type === "lost" ? "Lost" : "Found"} item submitted ✅`);
      resetState(getInitialItemState()); // also clears the file input via re-render
      setErrors({});

      // Refresh the stats and activity feed so the dashboard reflects the new item
      fetchStats();
      fetchRecentActivity();
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
              {getGreeting()}, <span className="welcome-name">{userName}</span>{" "}
              <span className="wave">👋</span>
            </h2>
            <p className="welcome-date">{getFormattedDate()}</p>
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
              <span className="stat-value">
                {statsLoading ? <span className="skeleton-line skeleton-stat" /> : stats.lost}
              </span>
              <span className="stat-label">Total Lost Reports</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-found">
              <FiPackage />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {statsLoading ? <span className="skeleton-line skeleton-stat" /> : stats.found}
              </span>
              <span className="stat-label">Total Found Reports</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-claimed">
              <FiCheckCircle />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {statsLoading ? <span className="skeleton-line skeleton-stat" /> : stats.claimed}
              </span>
              <span className="stat-label">Claimed Items</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-pending">
              <FiClock />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {statsLoading ? <span className="skeleton-line skeleton-stat" /> : stats.pending}
              </span>
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

        {/* ===== Recent Activity ===== */}
        <h3 className="section-title">Recent Activity</h3>

        <div className="activity-section">
          {activityLoading ? (
            <div className="activity-list">
              {[1, 2, 3].map((n) => (
                <div className="activity-card activity-skeleton" key={n}>
                  <div className="skeleton-line skeleton-line-title" />
                  <div className="skeleton-line skeleton-line-sub" />
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="empty-state">No recent activity.</div>
          ) : (
            <div className="activity-list">
              {recentActivity.map((activity) => (
                <div className="activity-card" key={`${activity.type}-${activity.id}`}>
                  <div className="activity-card-top">
                    <span className="activity-title">{activity.title}</span>
                    <span
                      className={`activity-badge ${
                        activity.type === "lost" ? "activity-badge-lost" : "activity-badge-found"
                      }`}
                    >
                      {activity.type === "lost" ? "Lost" : "Found"}
                    </span>
                  </div>

                  <div className="activity-card-meta">
                    <span className="activity-meta-item">
                      <FiCalendar /> {activity.date || "—"}
                    </span>
                    <span className="activity-meta-item">
                      <FiList /> {activity.category || "—"}
                    </span>
                    <span
                      className={`activity-status ${
                        activity.status === "claimed"
                          ? "activity-status-claimed"
                          : "activity-status-pending"
                      }`}
                    >
                      {activity.status === "claimed" ? "Claimed" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Dashboard;