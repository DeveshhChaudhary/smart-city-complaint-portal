/**
 * Utility functions for complaint image validation, category fallbacks, and error handling.
 */

// Distinct, verified, high-quality fallback images for each portal category
export const CATEGORY_FALLBACK_IMAGES = {
  roads: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80",
  street_lights: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80",
  garbage: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=80",
  water: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=600&auto=format&fit=crop&q=80",
  drainage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
  traffic: "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=600&auto=format&fit=crop&q=80",
  other: "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&auto=format&fit=crop&q=80",
};

// Extract category string safely whether passed as string or object
const extractCategoryText = (categoryInput) => {
  if (!categoryInput) return "";
  if (typeof categoryInput === "string") return categoryInput.toLowerCase().trim();
  if (typeof categoryInput === "object" && categoryInput.name) {
    return String(categoryInput.name).toLowerCase().trim();
  }
  return "";
};

// Contextual fallback images based on complaint category and title
export const getFallbackImage = (categoryInput = "", title = "") => {
  const cat = extractCategoryText(categoryInput);
  const titleText = (title || "").toString().toLowerCase().trim();
  const combined = `${cat} ${titleText}`.trim();

  // 1. Direct Category Name Matching (Highest Precedence)
  if (cat.includes("street light") || cat.includes("electricity")) {
    return CATEGORY_FALLBACK_IMAGES.street_lights;
  }
  if (cat.includes("traffic") || cat.includes("signal")) {
    return CATEGORY_FALLBACK_IMAGES.traffic;
  }
  if (cat.includes("garbage") || cat.includes("sanitation") || cat.includes("waste")) {
    return CATEGORY_FALLBACK_IMAGES.garbage;
  }
  if (cat.includes("drainage") || cat.includes("sewage") || cat.includes("sewer")) {
    return CATEGORY_FALLBACK_IMAGES.drainage;
  }
  if (cat.includes("water") || cat.includes("pipeline")) {
    return CATEGORY_FALLBACK_IMAGES.water;
  }
  if (cat.includes("road") || cat.includes("pothole")) {
    return CATEGORY_FALLBACK_IMAGES.roads;
  }

  // 2. Keyword Matching across Title & Category
  // Traffic & Signals first to avoid collision with "light" in traffic light
  if (
    combined.includes("traffic light") ||
    combined.includes("traffic signal") ||
    combined.includes("traffic") ||
    combined.includes("signal") ||
    combined.includes("zebra crossing") ||
    combined.includes("intersection")
  ) {
    return CATEGORY_FALLBACK_IMAGES.traffic;
  }

  // Street Lights & Electricity (must precede generic street/road check)
  if (
    combined.includes("street light") ||
    combined.includes("streetlight") ||
    combined.includes("lamp") ||
    combined.includes("electric") ||
    combined.includes("power") ||
    combined.includes("blackout") ||
    combined.includes("wire") ||
    combined.includes("pole") ||
    combined.includes("light")
  ) {
    return CATEGORY_FALLBACK_IMAGES.street_lights;
  }

  // Garbage & Sanitation
  if (
    combined.includes("garbage") ||
    combined.includes("waste") ||
    combined.includes("trash") ||
    combined.includes("dustbin") ||
    combined.includes("rubbish") ||
    combined.includes("dump") ||
    combined.includes("litter") ||
    combined.includes("sanitation") ||
    combined.includes("clean")
  ) {
    return CATEGORY_FALLBACK_IMAGES.garbage;
  }

  // Drainage & Sewage
  if (
    combined.includes("drainage") ||
    combined.includes("drain") ||
    combined.includes("gutter") ||
    combined.includes("sewage") ||
    combined.includes("sewer") ||
    combined.includes("manhole") ||
    combined.includes("overflow") ||
    combined.includes("flood")
  ) {
    return CATEGORY_FALLBACK_IMAGES.drainage;
  }

  // Water Supply
  if (
    combined.includes("water") ||
    combined.includes("pipeline") ||
    combined.includes("pipe") ||
    combined.includes("leak") ||
    combined.includes("tap") ||
    combined.includes("supply")
  ) {
    return CATEGORY_FALLBACK_IMAGES.water;
  }

  // Roads & Potholes (only after street light and traffic are handled)
  if (
    combined.includes("road") ||
    combined.includes("pothole") ||
    combined.includes("street") ||
    combined.includes("asphalt") ||
    combined.includes("highway") ||
    combined.includes("sidewalk") ||
    combined.includes("pavement")
  ) {
    return CATEGORY_FALLBACK_IMAGES.roads;
  }

  return CATEGORY_FALLBACK_IMAGES.other;
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
export const getComplaintImage = (photoUrl, categoryInput = "", title = "") => {
  if (isValidImageUrl(photoUrl)) {
    return photoUrl.trim();
  }
  return getFallbackImage(categoryInput, title);
};

// Graceful onError handler to prevent broken-image icons and recursion
export const handleImageError = (event, categoryInput = "", title = "", fallbackOverride = null) => {
  if (!event || !event.currentTarget) return;
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackOverride || getFallbackImage(categoryInput, title);
};
