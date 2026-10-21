/**
 * Utility functions for complaint image validation, category fallbacks, and error handling.
 */

// Contextual fallback images based on complaint category and title
export const getFallbackImage = (categoryName = "", title = "") => {
  const text = `${categoryName || ""} ${title || ""}`.toLowerCase();
  if (text.includes("road") || text.includes("pothole") || text.includes("street")) {
    return "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80";
  }
  if (text.includes("light") || text.includes("lamp") || text.includes("electric") || text.includes("power")) {
    return "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80";
  }
  if (
    text.includes("garbage") ||
    text.includes("waste") ||
    text.includes("trash") ||
    text.includes("clean") ||
    text.includes("sanitation")
  ) {
    return "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=80";
  }
  if (text.includes("water") || text.includes("drain") || text.includes("leak") || text.includes("pipe") || text.includes("sewage")) {
    return "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=600&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&auto=format&fit=crop&q=80";
};

// Check if a string is a valid web image URL
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:")
  );
};

// Return the valid URL or the category-based fallback
export const getComplaintImage = (photoUrl, categoryName = "", title = "") => {
  if (isValidImageUrl(photoUrl)) {
    return photoUrl.trim();
  }
  return getFallbackImage(categoryName, title);
};

// Graceful onError handler to prevent broken-image icons and recursion
export const handleImageError = (event, categoryName = "", title = "", fallbackOverride = null) => {
  if (!event || !event.currentTarget) return;
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackOverride || getFallbackImage(categoryName, title);
};
