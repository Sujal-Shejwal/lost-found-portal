import { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import toast from "react-hot-toast";
import { auth, db } from "../firebase";
import "./Items.css";

const CATEGORIES = ["All", "Wallet", "Phone", "ID Card", "Bag", "Other"];

const CATEGORY_ICON = {
  Wallet: "👛",
  Phone: "📱",
  "ID Card": "🪪",
  Bag: "🎒",
  Other: "📦",
};

function FoundItems() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [deletingId, setDeletingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // item pending delete
  const [lightboxImage, setLightboxImage] = useState(null);

  const loadItems = () => {
    setIsLoading(true);
    setHasError(false);

    const unsub = onSnapshot(
      collection(db, "foundItems"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setItems(data);
        setIsLoading(false);
      },
      (err) => {
        console.error("Failed to load found items:", err);
        setHasError(true);
        setIsLoading(false);
      }
    );

    return unsub;
  };

  useEffect(() => {
    const unsub = loadItems();
    return () => unsub();
  }, []);

  // Esc key closes whichever modal is open
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setConfirmTarget(null);
      setLightboxImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const requestDelete = (item) => {
    const user = auth.currentUser;
    if (!user || user.uid !== item.userId) {
      // Shouldn't be reachable since the button is hidden, but kept as a safety net.
      toast.error("You can delete only your own found items");
      return;
    }
    setConfirmTarget(item);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    const { id } = confirmTarget;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "foundItems", id));
      toast.success("Item deleted successfully");
    } catch (err) {
      console.error("Failed to delete item:", err);
      toast.error("Something went wrong");
    } finally {
      setDeletingId(null);
      setConfirmTarget(null);
    }
  };

  const handleClaim = (item) => {
    // Placeholder hook for whatever your claim flow does today —
    // swap this out for the real claim logic if it lives elsewhere.
    toast.success("Claim submitted");
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = (item.title || "")
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesCategory = category === "All" || item.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="items-wrapper">
      {/* HEADER */}
      <div className="items-header">
        <div className="items-header-text">
          <span className="items-eyebrow">Lost &amp; Found</span>
          <h2>Found Items</h2>
          <p>Browse items reported by users.</p>
        </div>

        <div className="items-count-card">
          <div className="items-count-icon">📦</div>
          <div>
            <p className="items-count-value">
              {isLoading ? (
                <span className="skeleton-block skeleton-count" />
              ) : (
                items.length
              )}
            </p>
            <span className="items-count-label">Total items</span>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="items-toolbar">
        <div className="items-search-box">
          <span className="items-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search found items by title"
          />
        </div>

        <select
          className="items-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* ERROR STATE */}
      {hasError && (
        <div className="items-error-state" role="alert">
          <div className="items-error-icon">⚠️</div>
          <h4>Couldn't load items</h4>
          <p>Something went wrong while fetching found items. Please try again.</p>
          <button className="items-retry-btn" onClick={loadItems}>
            🔄 Retry
          </button>
        </div>
      )}

      {/* LOADING SKELETON */}
      {!hasError && isLoading && (
        <div className="items-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="item-card item-skeleton" key={i}>
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
      )}

      {/* EMPTY STATE */}
      {!hasError && !isLoading && filteredItems.length === 0 && (
        <div className="items-empty-state">
          <div className="items-empty-icon">🔎</div>
          <h4>
            {items.length === 0
              ? "No found items available."
              : "No items match your search."}
          </h4>
          <p>
            {items.length === 0
              ? "Once someone reports a found item, it will show up here."
              : "Try a different keyword or category."}
          </p>
        </div>
      )}

      {/* GRID */}
      {!hasError && !isLoading && filteredItems.length > 0 && (
        <div className="items-grid">
          {filteredItems.map((item) => {
            const isOwner = auth.currentUser?.uid === item.userId;
            const isDeleting = deletingId === item.id;

            return (
              <div className="item-card" key={item.id}>
                <div className="item-card-image-wrap">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="item-card-image"
                      onClick={() => setLightboxImage(item.image)}
                      role="button"
                      tabIndex={0}
                      aria-label={`View larger image of ${item.title}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setLightboxImage(item.image);
                        }
                      }}
                    />
                  ) : (
                    <div className="item-card-image-placeholder">📷</div>
                  )}

                  {item.category && (
                    <span className="item-category-badge">
                      {CATEGORY_ICON[item.category] || "📦"} {item.category}
                    </span>
                  )}
                </div>

                <div className="item-card-body">
                  <h3 className="item-card-title">{item.title}</h3>
                  <p className="item-card-desc">
                    {item.description || "No description provided."}
                  </p>

                  <div className="item-card-meta">
                    {item.date && (
                      <div className="item-card-meta-row">
                        📅 <span>{item.date}</span>
                      </div>
                    )}
                    {item.location && (
                      <div className="item-card-meta-row">
                        📍 <span>{item.location}</span>
                      </div>
                    )}
                    {item.phone && (
                      <div className="item-card-meta-row">
                        📞 <span>{item.phone}</span>
                      </div>
                    )}
                  </div>

                  {isOwner ? (
                    <button
                      className="item-claim-btn item-delete-btn"
                      onClick={() => requestDelete(item)}
                      disabled={isDeleting}
                      aria-busy={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <span className="btn-spinner" aria-hidden="true" />
                          Deleting...
                        </>
                      ) : (
                        <>🗑️ Delete</>
                      )}
                    </button>
                  ) : (
                    <button
                      className="item-claim-btn"
                      onClick={() => handleClaim(item)}
                    >
                      🙋 Claim Item
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {confirmTarget && (
        <div
          className="items-modal-overlay"
          onClick={() => setConfirmTarget(null)}
        >
          <div
            className="items-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="confirm-delete-title">Delete Item?</h4>
            <p>This action cannot be undone.</p>
            <div className="items-confirm-actions">
              <button
                className="items-btn-secondary"
                onClick={() => setConfirmTarget(null)}
                disabled={deletingId === confirmTarget.id}
              >
                Cancel
              </button>
              <button
                className="items-btn-danger"
                onClick={confirmDelete}
                disabled={deletingId === confirmTarget.id}
                aria-busy={deletingId === confirmTarget.id}
              >
                {deletingId === confirmTarget.id ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX */}
      {lightboxImage && (
        <div
          className="items-modal-overlay"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="items-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Enlarged item image"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="items-lightbox-close"
              onClick={() => setLightboxImage(null)}
              aria-label="Close image preview"
            >
              ✕
            </button>
            <img src={lightboxImage} alt="Item preview" />
          </div>
        </div>
      )}
    </div>
  );
}

export default FoundItems;