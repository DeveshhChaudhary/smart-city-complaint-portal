import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Camera,
  Loader2,
  MapPin,
  Send,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import LocationPicker from "../../../components/map/LocationPicker";

const API_BASE_URL = "https://smart-city-complaint-portal-krs3.onrender.com";

const DEFAULT_CATEGORIES = [
  { id: "57624d7b-86f5-44b4-9647-569598d5236a", name: "Roads & Potholes" },
  { id: "632fbb84-7c27-4360-8b65-bbae689b345b", name: "Garbage & Sanitation" },
  { id: "bce3bddd-f54c-48b1-9042-274619297bef", name: "Water Supply" },
  { id: "daeecc2b-4f8d-47b1-a877-d6b07ab5b2e0", name: "Street Lights & Electricity" },
  { id: "b715f2df-a306-4421-b46b-807e52197d11", name: "Drainage" },
  { id: "119349b2-ae9f-4d59-9297-a90fd8b9f933", name: "Traffic & Signals" },
  { id: "f6a9f0e4-196d-4d2d-8ac6-b1f2af334e7b", name: "Other" },
];

function CreateComplaint() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
  });

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const getToken = () => {
    return localStorage.getItem("access_token");
  };

  const fetchCategories = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_BASE_URL}/api/categories/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.data?.categories && response.data.categories.length > 0) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.warn("Could not fetch categories from server, using default list:", error);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleLocationSelect = async (selectedLoc) => {
    if (
      !selectedLoc ||
      selectedLoc.latitude === null ||
      selectedLoc.latitude === undefined ||
      selectedLoc.longitude === null ||
      selectedLoc.longitude === undefined
    ) {
      setLocation(null);
      return;
    }

    const lat = Number(selectedLoc.latitude);
    const lng = Number(selectedLoc.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setLocation(null);
      return;
    }

    // Immediately establish canonical location state so user can submit right away
    const updatedLocation = {
      latitude: lat,
      longitude: lng,
      address: selectedLoc.address || "",
    };
    setLocation(updatedLocation);

    // Non-blocking fail-safe reverse geocoding if address not yet set
    if (!selectedLoc.address) {
      try {
        setIsGeocoding(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          {
            headers: {
              "Accept-Language": "en",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data?.display_name) {
            setLocation((prev) => {
              if (
                prev &&
                Number(prev.latitude) === lat &&
                Number(prev.longitude) === lng
              ) {
                return {
                  ...prev,
                  address: data.display_name,
                };
              }
              return prev;
            });
          }
        }
      } catch (geocodeErr) {
        console.warn("Reverse geocode lookup skipped or failed:", geocodeErr);
      } finally {
        setIsGeocoding(false);
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const hasValidCoords =
      location &&
      location.latitude !== null &&
      location.latitude !== undefined &&
      location.longitude !== null &&
      location.longitude !== undefined &&
      !isNaN(Number(location.latitude)) &&
      !isNaN(Number(location.longitude));

    if (!hasValidCoords) {
      alert("Please select the problem location on the map.");
      return;
    }

    if (!formData.title.trim()) {
      alert("Please enter a complaint title.");
      return;
    }

    if (!formData.category) {
      alert("Please select a complaint category.");
      return;
    }

    if (!formData.description.trim()) {
      alert("Please enter a complaint description.");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getToken();

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const complaintData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category_id: formData.category || null,
        photo_url: photo ? photo.name : null,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        address: location.address ? location.address.trim() : null,
        priority: "Normal",
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/complaints/`,
        complaintData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        const complaint = response.data.complaint;

        alert(
          `Complaint submitted successfully!\n\nComplaint ID: ${complaint.complaint_code}`
        );

        navigate("/citizen/dashboard");
        return;
      }

      alert("Complaint could not be submitted. Please try again.");
    } catch (error) {
      console.error("Complaint submission error:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }

      let errorMessage = "Unable to submit complaint. Please try again.";

      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <button
            type="button"
            onClick={() => navigate("/citizen/dashboard")}
            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Report a Complaint
            </h1>
            <p className="text-xs text-slate-500">
              Help us identify and resolve city problems
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Complaint Details */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Complaint Details
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Provide information about the problem.
              </p>
            </div>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Complaint Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Example: Broken street light"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Select complaint category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the problem in detail..."
                  rows={5}
                  required
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* Photo */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">Add Photo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload a photo showing the problem.
              </p>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 transition hover:border-blue-400 hover:bg-blue-50">
              <Camera size={32} className="mb-3 text-blue-600" />
              <span className="font-semibold text-slate-700">
                {photo ? photo.name : "Click to upload a photo"}
              </span>
              <span className="mt-1 text-xs text-slate-400">
                JPG, PNG or WEBP
              </span>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  setPhoto(event.target.files?.[0] || null);
                }}
              />
            </label>
          </section>

          {/* Location */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <MapPin size={22} className="text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  Problem Location
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Click on the map to mark exactly where the problem is located.
              </p>
            </div>

            <LocationPicker
              value={location}
              onLocationSelect={handleLocationSelect}
              onChange={handleLocationSelect}
            />
          </section>

          {/* Selected Location */}
          {location &&
            location.latitude !== null &&
            location.latitude !== undefined &&
            location.longitude !== null &&
            location.longitude !== undefined && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-start gap-3">
                  <MapPin size={22} className="mt-0.5 shrink-0 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      Location Selected
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Latitude: {Number(location.latitude).toFixed(6)}
                    </p>
                    <p className="text-sm text-blue-700">
                      Longitude: {Number(location.longitude).toFixed(6)}
                    </p>
                    {isGeocoding && !location.address && (
                      <p className="mt-1 text-xs text-blue-500 italic">
                        Resolving address...
                      </p>
                    )}
                    {location.address && (
                      <p className="mt-1 text-xs text-blue-800">
                        Address: {location.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={19} />
                  <span>Submit Complaint</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CreateComplaint;