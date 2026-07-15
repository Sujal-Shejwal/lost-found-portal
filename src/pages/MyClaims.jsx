import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Items.css";
import "./MyClaims.css";

const STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected"];

const CATEGORY_ICON = {
  Wallet: "👛",
  Phone: "📱",
  "ID Card": "🪪",
  Bag: "🎒",
  Other: "📦",
};

// Firestore Timestamp -> readable date string. Handles the in-between
// state where serverTimestamp() hasn't resolved locally yet.
function formatSubmittedDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }
  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000).toLocaleDateString();
  }
  return null;
}

function StatusBadge({ status }) {
  const normalized = (status || "").toLowerCase();
  const map = {
    pending: { label: "Pending", cls: "status-pending-badge", icon: "🟡" },
    approved: { label: "Approved", cls: "status-approved-badge", icon: "🟢" },
    rejected: { label: "Rejected", cls: "status-rejected-badge", icon: "🔴" },
  };
  const info = map[normalized] || map.pending;

  return (
    <span className={`item-status-badge ${info.cls}`}>
      {info.icon} {info.label}
    </span>
  );
}

function ClaimSkeletonCard() {
  return (
    <div className="item-card item-skeleton">
      <div className="item-card-image-wrap skeleton-block skeleton-image" />
      <div className="item-card-body">
        <span className="skeleton-block skeleton-line-a" />
        <span className="skeleton-block skeleton-line-b" />
        <span className="skeleton-block skeleton-line-c" />
        <span className="skeleton-block skeleton-btn" />
      </div>
    </div>
  );
}

function MyClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [confirmId, setConfirmId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "claims"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            itemId: raw.itemId,
            userId: raw.userId,
            status: raw.status || "Pending",
            title: raw.itemTitle,
            description: raw.description,
            category: raw.category,
            location: raw.location,
            date: raw.date,
            phone: raw.phone,
            image: raw.imageUrl,
            submittedDate: formatSubmittedDate(raw.createdAt),
          };
        });
        setClaims(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Failed to load claims:", err);
        setError("Something went wrong while loading your claims.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchesSearch = (c.title || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        (c.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [claims, searchTerm, statusFilter]);

  const handleCancelClaim = async () => {
    if (!confirmId) return;

    const target = claims.find((c) => c.id === confirmId);
    const user = auth.currentUser;

    // Only allow cancelling the current user's own pending claim
    if (!target || !user || target.userId !== user.uid) {
      setConfirmId(null);
      return;
    }
    if ((target.status || "").toLowerCase() !== "pending") {
      setConfirmId(null);
      return;
    }

    setCancelling(true);
    try {
      await deleteDoc(doc(db, "claims", confirmId));
      setConfirmId(null);
    } catch (err) {
      console.error("Failed to cancel claim:", err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="items-wrapper">
      {/* HEADER */}
      <div className="items-header">
        <div className="items-header-text">
          <span className="items-eyebrow">My Claims</span>
          <h2>My Claims</h2>
          <p>Track all your submitted claims.</p>
        </div>

        <div className="items-count-card">
          <div className="items-count-icon">📋</div>
          <div>
            <p className="items-count-value">
              {loading ? (
                <span className="skeleton-block skeleton-count" />
              ) : (
                claims.length
              )}
            </p>
            <span className="items-count-label">Total Claims</span>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="items-toolbar">
        <div className="items-search-box">
          <span className="items-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by item title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="items-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="items-error-state">
          <div className="items-error-icon">⚠️</div>
          <h4>Couldn't load your claims</h4>
          <p>{error}</p>
          <button className="items-retry-btn" onClick={() => window.location.reload()}>
            🔄 Retry
          </button>
        </div>
      )}

      {/* LOADING SKELETONS */}
      {loading && (
        <div className="items-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <ClaimSkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* EMPTY STATE — no claims at all */}
      {!loading && !error && claims.length === 0 && (
        <div className="items-empty-state">
          <div className="items-empty-icon">📦</div>
          <h4>No Claims Yet</h4>
          <p>You haven't claimed any items yet.</p>
          <Link
            to="/lost"
            className="items-retry-btn"
            style={{ textDecoration: "none", marginTop: "8px" }}
          >
            Browse Lost Items
          </Link>
        </div>
      )}

      {/* EMPTY STATE — filters produced no matches */}
      {!loading && !error && claims.length > 0 && filteredClaims.length === 0 && (
        <div className="items-empty-state">
          <div className="items-empty-icon">🔍</div>
          <h4>No Matching Claims</h4>
          <p>Try adjusting your search or filter.</p>
        </div>
      )}

      {/* GRID */}
      {!loading && !error && filteredClaims.length > 0 && (
        <div className="items-grid">
          {filteredClaims.map((claim) => (
            <div className="item-card" key={claim.id}>
              <div className="item-card-image-wrap">
                {claim.image ? (
                  <img
                    src={claim.image}
                    alt={claim.title}
                    className="item-card-image"
                    onClick={() => setLightboxImg(claim.image)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View larger image of ${claim.title}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setLightboxImg(claim.image);
                      }
                    }}
                  />
                ) : (
                  <div className="item-card-image-placeholder">📦</div>
                )}

                {claim.category && (
                  <span className="item-category-badge">
                    {CATEGORY_ICON[claim.category] || "📦"} {claim.category}
                  </span>
                )}

                <StatusBadge status={claim.status} />
              </div>

              <div className="item-card-body">
                <h3 className="item-card-title">{claim.title}</h3>
                <p className="item-card-desc">
                  {claim.description || "No description provided."}
                </p>

                <div className="item-card-meta">
                  {claim.location && (
                    <div className="item-card-meta-row">📍 {claim.location}</div>
                  )}
                  {claim.date && (
                    <div className="item-card-meta-row">📅 {claim.date}</div>
                  )}
                  {claim.phone && (
                    <div className="item-card-meta-row">📞 {claim.phone}</div>
                  )}
                </div>

                {claim.submittedDate && (
                  <div className="item-card-footer">
                    <span className="item-reported-date">
                      🕓 Claimed on {claim.submittedDate}
                    </span>
                  </div>
                )}

                {(claim.status || "").toLowerCase() === "pending" && (
                  <button
                    className="item-claim-btn"
                    onClick={() => setConfirmId(claim.id)}
                  >
                    Cancel Claim
                  </button>
                )}

                {(claim.status || "").toLowerCase() === "approved" && (
                  <button className="item-claim-btn" disabled>
                    Contact Finder
                  </button>
                )}

                {(claim.status || "").toLowerCase() === "rejected" && (
                  <button className="item-claim-btn" disabled>
                    Rejected
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONFIRM CANCEL MODAL */}
      {confirmId && (
        <div
          className="items-modal-overlay"
          onClick={() => !cancelling && setConfirmId(null)}
        >
          <div className="items-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Cancel this claim?</h4>
            <p>This action cannot be undone. Your claim will be permanently removed.</p>
            <div className="items-confirm-actions">
              <button
                className="items-btn-secondary"
                disabled={cancelling}
                onClick={() => setConfirmId(null)}
              >
                Keep Claim
              </button>
              <button
                className="items-btn-danger"
                disabled={cancelling}
                onClick={handleCancelClaim}
              >
                {cancelling ? <span className="btn-spinner" /> : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightboxImg && (
        <div className="items-modal-overlay" onClick={() => setLightboxImg(null)}>
          <div className="items-lightbox" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImg} alt="Claim item" />
            <button
              className="items-lightbox-close"
              onClick={() => setLightboxImg(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyClaims;