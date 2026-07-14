import { useEffect, useState, useMemo, useCallback } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  FiSearch,
  FiTag,
  FiCalendar,
  FiMapPin,
  FiPhone,
  FiUser,
  FiImage,
  FiCheckCircle,
  FiClock,
  FiInbox,
  FiAlertTriangle,
  FiRefreshCw,
} from "react-icons/fi";
import "./Items.css";

const CATEGORIES = ["Wallet", "Phone", "ID Card", "Bag", "Other"];

// Turns a Firestore Timestamp into a short readable date, e.g. "13 Jul 2026"
const formatReportedDate = (timestamp) => {
  if (!timestamp?.toDate) return "recently";
  return timestamp.toDate().toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function LostItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");

  // Fetch Lost Items (real-time), re-subscribes whenever retryKey changes
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      collection(db, "lostItems"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setItems(data);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load lost items:", err);
        setError("We couldn't load lost items right now. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [retryKey]);

  const handleRetry = () => setRetryKey((key) => key + 1);

  // Claim Item — unchanged logic, just guarded against already-claimed items
  const handleClaim = useCallback(async (item) => {
    const user = auth.currentUser;

    if (!user) {
      alert("Please login to claim an item.");
      return;
    }

    if (item.status === "claimed") return;

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
    } catch (err) {
      console.error("Claim Error:", err);
      alert("❌ Failed to submit claim");
    }
  }, []);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((item) => item.title?.toLowerCase().includes(term));
    }

    if (categoryFilter !== "All") {
      result = result.filter((item) => item.category === categoryFilter);
    }

    if (statusFilter !== "All") {
      result = result.filter((item) => {
        const isClaimed = item.status === "claimed";
        return statusFilter === "Claimed" ? isClaimed : !isClaimed;
      });
    }

    result.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

    return result;
  }, [items, searchTerm, categoryFilter, statusFilter, sortOrder]);

  return (
    <div className="items-wrapper">
      {/* ===== Header ===== */}
      <div className="items-header">
        <div className="items-header-text">
          <span className="items-eyebrow">Browse</span>
          <h2>Lost Items</h2>
          <p>Browse all reported lost items.</p>
        </div>

        <div className="items-count-card">
          <div className="items-count-icon">
            <FiSearch />
          </div>
          <div className="items-count-info">
            <span className="items-count-value">
              {loading ? <span className="skeleton-block skeleton-count" /> : items.length}
            </span>
            <span className="items-count-label">Total Lost Items</span>
          </div>
        </div>
      </div>

      {/* ===== Toolbar ===== */}
      <div className="items-toolbar">
        <div className="items-search-box">
          <FiSearch className="items-search-icon" />
          <input
            type="text"
            placeholder="Search by item title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="items-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          className="items-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Available">Available</option>
          <option value="Claimed">Claimed</option>
        </select>

        <select
          className="items-select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* ===== Content ===== */}
      {error ? (
        <div className="items-error-state">
          <FiAlertTriangle className="items-error-icon" />
          <h4>Something went wrong</h4>
          <p>{error}</p>
          <button className="items-retry-btn" onClick={handleRetry}>
            <FiRefreshCw /> Retry
          </button>
        </div>
      ) : loading ? (
        <div className="items-grid">
          {[1, 2, 3, 4].map((n) => (
            <div className="item-card item-skeleton" key={n}>
              <div className="skeleton-block skeleton-image" />
              <div className="item-card-body">
                <div className="skeleton-block skeleton-line-a" />
                <div className="skeleton-block skeleton-line-b" />
                <div className="skeleton-block skeleton-line-c" />
                <div className="skeleton-block skeleton-btn" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="items-empty-state">
          <FiInbox className="items-empty-icon" />
          <h4>No Lost Items Found</h4>
          <p>
            {items.length === 0
              ? "Lost items reported by users will appear here."
              : "Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <div className="items-grid">
          {filteredItems.map((item) => {
            const isClaimed = item.status === "claimed";

            return (
              <div className="item-card" key={item.id}>
                <div className="item-card-image-wrap">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="item-card-image" />
                  ) : (
                    <div className="item-card-image-placeholder">
                      <FiImage />
                    </div>
                  )}

                  <span className="item-category-badge">
                    <FiTag /> {item.category || "Other"}
                  </span>

                  <span
                    className={`item-status-badge ${
                      isClaimed ? "status-claimed" : "status-available"
                    }`}
                  >
                    {isClaimed ? (
                      <>
                        <FiCheckCircle /> Claimed
                      </>
                    ) : (
                      <>
                        <FiClock /> Available
                      </>
                    )}
                  </span>
                </div>

                <div className="item-card-body">
                  <h4 className="item-card-title">{item.title}</h4>
                  <p className="item-card-desc">
                    {item.description || "No description provided."}
                  </p>

                  <div className="item-card-meta">
                    <span className="item-card-meta-row">
                      <FiCalendar /> Lost: {item.date || "N/A"}
                    </span>
                    <span className="item-card-meta-row">
                      <FiMapPin /> {item.location || "N/A"}
                    </span>
                    <span className="item-card-meta-row">
                      <FiPhone /> {item.phone || "N/A"}
                    </span>
                  </div>

                  <div className="item-card-footer">
                    <span className="item-reported-date">
                      Reported {formatReportedDate(item.createdAt)}
                    </span>
                    <span className="item-posted-by">
                      <FiUser /> {item.userId ? `User-${item.userId.slice(0, 6)}` : "Anonymous"}
                    </span>
                  </div>

                  <button
                    className="item-claim-btn"
                    onClick={() => handleClaim(item)}
                    disabled={isClaimed}
                  >
                    {isClaimed ? "Already Claimed" : "Claim This Item"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LostItems;