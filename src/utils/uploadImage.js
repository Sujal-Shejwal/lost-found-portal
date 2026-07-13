import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

// Uploads an image and returns its URL. Never throws — returns ""
// on failure so a failed image upload doesn't block the whole submission.
export const uploadImageSafe = async (file, folder) => {
  if (!file) return "";

  try {
    const imageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    await uploadBytes(imageRef, file);
    return await getDownloadURL(imageRef);
  } catch (error) {
    console.error("Image upload failed:", error);
    return "";
  }
};