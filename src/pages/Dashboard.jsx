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
  FiActivity,
  FiInbox,
  FiArrowUpRight,
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

// Formats a Firestore Timestamp (or missing value) into a short relative-ish string,
// e.g. "Today", "Yesterday", or "13 Jul". Falls back to "—" if there's no timestamp.
const formatTimelineDate = (createdAt) => {
  if (!createdAt?.toMillis) return "—";
  const date = new Date(createdAt.toMillis());
  const now = new Date();

  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isSameDay) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
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
  // Secondary "this week" counters used purely for helper text under each stat card.
  const [statsThisWeek, setStatsThisWeek] = useState({ lost: 0, found: 0, claimed: 0, pending: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // ===== Recent activity (combined lost + found for current user) =====
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // ===== Pending claims summary (global) =====
  const [pendingClaims, setPendingClaims] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);

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

      // Best-effort "this week" counters purely for helper text — reuses the
      // same collections/fields, filtered client-side by createdAt so no new
      // Firestore indexes or queries are required beyond what already exists.
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [lostDocsSnap, foundDocsSnap] = await Promise.all([
        getDocs(query(collection(db, "lostItems"), orderBy("createdAt", "desc"), limit(50))),
        getDocs(query(collection(db, "foundItems"), orderBy("createdAt", "desc"), limit(50))),
      ]);

      const countRecent = (snap) =>
        snap.docs.filter((d) => {
          const ts = d.data().createdAt;
          return ts?.toMillis ? ts.toMillis() >= oneWeekAgo.getTime() : false;
        }).length;

      const countRecentClaimed = (snap) =>
        snap.docs.filter((d) => {
          const data = d.data();
          const ts = data.createdAt;
          return (
            data.status === "claimed" &&
            (ts?.toMillis ? ts.toMillis() >= oneWeekAgo.getTime() : false)
          );
        }).length;

      const recentLost = countRecent(lostDocsSnap);
      const recentFound = countRecent(foundDocsSnap);
      const recentClaimed = countRecentClaimed(lostDocsSnap) + countRecentClaimed(foundDocsSnap);
      const recentPending = Math.max(recentLost + recentFound - recentClaimed, 0);

      setStatsThisWeek({
        lost: recentLost,
        found: recentFound,
        claimed: recentClaimed,
        pending: recentPending,
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

  // Fetches a small summary of pending claims (status == "pending") across both collections
  const fetchPendingClaims = useCallback(async () => {
    setPendingLoading(true);
    try {
      const lostQuery = query(
        collection(db, "lostItems"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
        limit(3)
      );
      const foundQuery = query(
        collection(db, "foundItems"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
        limit(3)
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
        .slice(0, 3);

      setPendingClaims(combined);
    } catch (error) {
      console.error("Failed to fetch pending claims:", error);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
    fetchPendingClaims();
  }, [fetchStats, fetchRecentActivity, fetchPendingClaims]);

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

      // Refresh all dashboard sections so they reflect the new item
      fetchStats();
      fetchRecentActivity();
      fetchPendingClaims();
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

  // Navigates to the relevant list page for a given claim/activity item so
  // the person can see full detail. Uses existing routes only ("/lost" and "/found").
  const goToItem = (type) => {
    navigate(type === "lost" ? "/lost" : "/found");
  };

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
            <p className="welcome-date">
              <FiCalendar className="welcome-date-icon" /> {getFormattedDate()}
            </p>
            <p className="welcome-desc">
              Manage your lost and found items securely, all in one place.
            </p>
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
              {!statsLoading && statsThisWeek.lost > 0 && (
                <span className="stat-helper">
                  <FiArrowUpRight /> +{statsThisWeek.lost} this week
                </span>
              )}
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
              {!statsLoading && statsThisWeek.found > 0 && (
                <span className="stat-helper">
                  <FiArrowUpRight /> +{statsThisWeek.found} this week
                </span>
              )}
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
              {!statsLoading && stats.pending === 0 && (
                <span className="stat-helper stat-helper-neutral">All clear</span>
              )}
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
              <span className="stat-label">Completed Claims</span>
              {!statsLoading && statsThisWeek.claimed > 0 && (
                <span className="stat-helper">
                  <FiArrowUpRight /> +{statsThisWeek.claimed} this week
                </span>
              )}
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

        {/* ===== Pending Claims Summary ===== */}
        <h3 className="section-title">
          <FiInbox className="section-title-icon" /> Pending Claims Summary
        </h3>

        <div className="activity-section">
          {pendingLoading ? (
            <div className="activity-list">
              {[1, 2].map((n) => (
                <div className="activity-card activity-skeleton" key={n}>
                  <div className="skeleton-line skeleton-line-title" />
                  <div className="skeleton-line skeleton-line-sub" />
                </div>
              ))}
            </div>
          ) : pendingClaims.length === 0 ? (
            <div className="empty-state">
              <FiCheckCircle className="empty-state-icon" />
              <span>No pending claims right now — all caught up!</span>
            </div>
          ) : (
            <div className="activity-list">
              {pendingClaims.map((claim) => (
                <div className="activity-card claim-card" key={`pending-${claim.type}-${claim.id}`}>
                  <div className="activity-card-top">
                    <span className="activity-title">{claim.title}</span>
                    <span
                      className={`activity-badge ${
                        claim.type === "lost" ? "activity-badge-lost" : "activity-badge-found"
                      }`}
                    >
                      {claim.type === "lost" ? "Lost" : "Found"}
                    </span>
                  </div>
                  <div className="activity-card-meta claim-card-meta">
                    <span className="activity-meta-item">
                      <FiCalendar /> {claim.date || "—"}
                    </span>
                    <span className="activity-status activity-status-pending">Pending</span>
                    <button
                      type="button"
                      className="view-btn"
                      onClick={() => goToItem(claim.type)}
                    >
                      View <FiArrowUpRight />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== Recent Activity ===== */}
        <h3 className="section-title">
          <FiActivity className="section-title-icon" /> Recent Activity
        </h3>

        <div className="activity-section">
          {activityLoading ? (
            <div className="timeline">
              {[1, 2, 3].map((n) => (
                <div className="timeline-item timeline-item-skeleton" key={n}>
                  <span className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="skeleton-line skeleton-line-title" />
                    <div className="skeleton-line skeleton-line-sub" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="empty-state">
              <FiActivity className="empty-state-icon" />
              <span>No recent activity yet. Submit a lost or found report to get started.</span>
            </div>
          ) : (
            <div className="timeline">
              {recentActivity.map((activity) => (
                <div className="timeline-item" key={`${activity.type}-${activity.id}`}>
                  <span
                    className={`timeline-dot ${
                      activity.type === "lost" ? "timeline-dot-lost" : "timeline-dot-found"
                    }`}
                  >
                    {activity.type === "lost" ? <FiSearch /> : <FiPackage />}
                  </span>
                  <div className="timeline-content">
                    <div className="timeline-content-top">
                      <span className="timeline-title">
                        {activity.type === "lost" ? "Lost item reported" : "Found item reported"}
                        {": "}
                        <strong>{activity.title}</strong>
                      </span>
                      <span className="timeline-timestamp">
                        {formatTimelineDate(activity.createdAt)}
                      </span>
                    </div>
                    <div className="timeline-content-meta">
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