import { useState, useEffect, useRef } from "react";
import {
  FiTag,
  FiList,
  FiFileText,
  FiCalendar,
  FiMapPin,
  FiPhone,
  FiUploadCloud,
  FiX,
  FiCheck,
  FiSearch,
  FiPackage,
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

  return (
    <div className={`action-card ${isLost ? "action-card-lost" : "action-card-found"}`}>
      <div className="action-card-heading">
        <div className="action-card-icon">{isLost ? <FiSearch /> : <FiPackage />}</div>
        <h3>{heading}</h3>
      </div>

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

        {!previewUrl ? (
          <label className={`upload-box ${isSubmitting ? "upload-box-disabled" : ""}`}>
            <FiUploadCloud className="upload-box-icon" />
            <span className="upload-box-title">Click to upload a photo</span>
            <span className="upload-box-subtitle">PNG or JPG</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isSubmitting}
              className="upload-box-input"
            />
          </label>
        ) : (
          <div className="image-preview">
            <img src={previewUrl} alt="Preview" className="image-preview-img" />
            <div className="image-preview-overlay">
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
          </div>
        )}
      </div>

      <button className="primary-btn" onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting && <span className="btn-spinner" />}
        {submitLabel}
      </button>
    </div>
  );
}

export default ItemForm;