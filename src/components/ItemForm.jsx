import { useState, useEffect, useRef } from "react";
import {
  FiTag,
  FiList,
  FiFileText,
  FiCalendar,
  FiMapPin,
  FiPhone,
  FiUploadCloud,
  FiImage,
  FiX,
  FiCheck,
  FiSearch,
  FiPackage,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

// Shared initial state shape for both Lost and Found forms
export const getInitialItemState = () => ({
  title: "",
  category: "",
  description: "",
  date: "",
  location: "",
  phone: "",
  image: null,
});

const CATEGORIES = ["Wallet", "Phone", "ID Card", "Bag", "Other"];

/**
 * Reusable form for reporting a Lost or Found item.
 * Props:
 *  - type: "lost" | "found" (controls labels/placeholders only)
 *  - item: current form state
 *  - errors: validation error object
 *  - isSubmitting: disables inputs/button while uploading
 *  - onChange(field, value): update a single field
 *  - onSubmit(): trigger submission
 */
function ItemForm({ type, item, errors, isSubmitting, onChange, onSubmit }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const fileInputRef = useRef(null);

  const isLost = type === "lost";
  const heading = isLost ? "Report Lost Item" : "Report Found Item";
  const locationPlaceholder = isLost ? "Last seen location" : "Found location";
  const submitLabel = isSubmitting
    ? "Submitting..."
    : isLost
    ? "Submit Lost Item"
    : "Submit Found Item";

  // Build/clean up an image preview whenever the selected file changes
  useEffect(() => {
    if (!item.image) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(item.image);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl); // avoid memory leaks
  }, [item.image]);

  const handleFileChange = (e) => {
    onChange("image", e.target.files[0] || null);
  };

  const handleRemoveImage = () => {
    onChange("image", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChangePhotoClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Quick one-line summary shown in the collapsed header so the card
  // still communicates progress even when collapsed.
  const filledCount = ["title", "category", "description", "date", "location", "phone"].filter(
    (f) => item[f] && String(item[f]).trim() !== ""
  ).length;

  return (
    <div className={`action-card ${isLost ? "action-card-lost" : "action-card-found"}`}>
      <div
        className="action-card-heading action-card-heading-toggle"
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        aria-expanded={expanded}
      >
        <div className="action-card-heading-left">
          <div className="action-card-icon">{isLost ? <FiSearch /> : <FiPackage />}</div>
          <div className="action-card-heading-text">
            <h3>{heading}</h3>
            {!expanded && (
              <span className="action-card-subtext">
                {filledCount > 0 ? `${filledCount}/6 fields filled` : "Tap to expand"}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="action-card-toggle-btn"
          aria-label={expanded ? "Collapse form" : "Expand form"}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
        >
          {expanded ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      <div className={`action-card-body ${expanded ? "action-card-body-open" : "action-card-body-closed"}`}>
        <div className="form-field">
          <label className="field-label">
            <FiTag className="field-label-icon" />
            Item Title
          </label>
          <input
            value={item.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="e.g. Black leather wallet"
            disabled={isSubmitting}
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div className="form-field">
          <label className="field-label">
            <FiList className="field-label-icon" />
            Category
          </label>
          <select
            className="category-select"
            value={item.category}
            onChange={(e) => onChange("category", e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select Category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
          {errors.category && <p className="field-error">{errors.category}</p>}
        </div>

        <div className="form-field">
          <label className="field-label">
            <FiFileText className="field-label-icon" />
            Description
          </label>
          <textarea
            value={item.description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Add any helpful details (color, brand, marks, contents...)"
            disabled={isSubmitting}
          />
          {errors.description && <p className="field-error">{errors.description}</p>}
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="field-label">
              <FiCalendar className="field-label-icon" />
              Date
            </label>
            <input
              type="date"
              value={item.date}
              onChange={(e) => onChange("date", e.target.value)}
              disabled={isSubmitting}
            />
            {errors.date && <p className="field-error">{errors.date}</p>}
          </div>

          <div className="form-field">
            <label className="field-label">
              <FiMapPin className="field-label-icon" />
              Location
            </label>
            <input
              value={item.location}
              onChange={(e) => onChange("location", e.target.value)}
              placeholder={locationPlaceholder}
              disabled={isSubmitting}
            />
            {errors.location && <p className="field-error">{errors.location}</p>}
          </div>
        </div>

        <div className="form-field">
          <label className="field-label">
            <FiPhone className="field-label-icon" />
            Phone
          </label>
          <input
            value={item.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="10-digit phone number"
            disabled={isSubmitting}
          />
          {errors.phone && <p className="field-error">{errors.phone}</p>}
        </div>

        <div className="form-field">
          <label className="field-label">
            <FiUploadCloud className="field-label-icon" />
            Photo
          </label>

          {/* Hidden file input is always mounted so a new photo can be
              selected both before AND after a preview exists. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isSubmitting}
            className="upload-box-input-hidden"
          />

          {!previewUrl ? (
            <label
              className={`upload-box ${isSubmitting ? "upload-box-disabled" : ""}`}
              onClick={(e) => {
                // prevent double-firing since the hidden input is separate now
                e.preventDefault();
                if (!isSubmitting) handleChangePhotoClick();
              }}
            >
              <div className="upload-box-illustration">
                <FiImage className="upload-box-illustration-back" />
                <FiUploadCloud className="upload-box-illustration-front" />
              </div>
              <span className="upload-box-title">Click to upload a photo</span>
              <span className="upload-box-subtitle">PNG or JPG, up to a few MB</span>
            </label>
          ) : (
            <div className="upload-box upload-box-has-preview">
              <div className="image-preview">
                <img src={previewUrl} alt="Preview" className="image-preview-img" />
                <span className="image-preview-badge">
                  <FiCheck /> Selected
                </span>
                {!isSubmitting && (
                  <button
                    type="button"
                    className="image-preview-remove"
                    onClick={handleRemoveImage}
                    aria-label="Remove image"
                  >
                    <FiX />
                  </button>
                )}
              </div>

              <span className="image-preview-filename" title={item.image?.name}>
                {item.image?.name}
              </span>

              <div className="image-preview-actions">
                {!isSubmitting && (
                  <button
                    type="button"
                    className="image-preview-change-btn"
                    onClick={handleChangePhotoClick}
                  >
                    Change Photo
                  </button>
                )}
                {!isSubmitting && (
                  <button
                    type="button"
                    className="image-preview-remove-btn"
                    onClick={handleRemoveImage}
                  >
                    <FiX /> Remove Image
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <button className="primary-btn" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting && <span className="btn-spinner" />}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

export default ItemForm;