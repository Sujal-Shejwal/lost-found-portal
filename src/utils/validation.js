// Centralized validation rules for Lost & Found forms

export const validateItem = (item) => {
  const errors = {};

  if (!item.title.trim()) errors.title = "Title is required";
  if (!item.category) errors.category = "Please select a category";
  if (!item.description.trim()) errors.description = "Description is required";
  if (!item.date) errors.date = "Date is required";
  if (!item.location.trim()) errors.location = "Location is required";

  if (!item.phone.trim()) {
    errors.phone = "Phone number is required";
  } else if (!/^\d{10}$/.test(item.phone.trim())) {
    errors.phone = "Phone number must be exactly 10 digits";
  }

  return errors; // empty object = valid
};

export const isFormValid = (errors) => Object.keys(errors).length === 0;