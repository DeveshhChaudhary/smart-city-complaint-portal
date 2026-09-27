import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import LocationPicker from "../../../components/map/LocationPicker";

const API_BASE_URL = "http://127.0.0.1:8000";

function CreateComplaint() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    priority: "Normal",
  });

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [location, setLocation] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const currentUser = JSON.parse(savedUser);

      if (currentUser.role !== "citizen") {
        if (currentUser.role === "worker") {
          navigate("/worker/dashboard", { replace: true });
        } else if (currentUser.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true });
        }

        return;
      }

      setUser(currentUser);

      fetchCategories(token);
    } catch (err) {
      console.error("Invalid saved user:", err);

      localStorage.removeItem("access_token");
      localStorage.removeItem("user");

      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const fetchCategories = async (token) => {
    try {
      setCategoriesLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/api/categories/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Categories response:", response.data);

      const categoryData = Array.isArray(
        response.data?.categories
      )
        ? response.data.categories
        : [];

      if (categoryData.length === 0) {
        setError(
          "No complaint categories are available in the database."
        );
      }

      setCategories(categoryData);
    } catch (error) {
      console.error("Failed to fetch categories:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        navigate("/login", { replace: true });
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Failed to load complaint types."
      );
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePhotoChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;

    setPhoto(selectedFile);
  };

  const handleLocationChange = (selectedLocation) => {
    setLocation(selectedLocation);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const token = localStorage.getItem("access_token");

    if (!token || !user) {
      navigate("/login", { replace: true });
      return;
    }

    if (!formData.title.trim()) {
      setError("Please enter a complaint title.");
      return;
    }

    if (!formData.category_id) {
      setError("Please select a complaint type.");
      return;
    }

    if (!formData.description.trim()) {
      setError("Please enter a complaint description.");
      return;
    }

    if (!location) {
      setError("Please select the complaint location on the map.");
      return;
    }

    try {
      setLoading(true);

      const complaintData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category_id: formData.category_id,
        photo_url: photo ? photo.name : null,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        address: null,
        priority: formData.priority,
      };

      console.log("Submitting complaint:", complaintData);

      const response = await axios.post(
        `${API_BASE_URL}/api/complaints/`,
        complaintData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Complaint created:", response.data);

      setSuccess(
        response.data?.message ||
          "Complaint submitted successfully."
      );

      setFormData({
        title: "",
        description: "",
        category_id: "",
        priority: "Normal",
      });

      setLocation(null);
      setPhoto(null);

      const fileInput =
        document.getElementById("complaint-photo");

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error("Complaint creation error:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        navigate("/login", { replace: true });
        return;
      }

      setError(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          "Failed to submit complaint. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Smart City Portal
            </h1>

            <p className="text-sm text-gray-500">
              Create Complaint
            </p>
          </div>

          <button
            onClick={() =>
              navigate("/citizen/dashboard")
            }
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Report a Civic Issue
            </h2>

            <p className="text-gray-500 mt-2">
              Provide details about the issue and select its
              location on the map.
            </p>
          </div>

          {user && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Submitting complaint as{" "}
                <span className="font-semibold">
                  {user.name}
                </span>
              </p>

              <p className="text-xs text-blue-600 mt-1">
                {user.email}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Complaint Title
              </label>

              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="Example: Broken street light"
                maxLength={255}
                disabled={loading}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="category_id"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Complaint Type
              </label>

              <select
                id="category_id"
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                disabled={
                  loading || categoriesLoading
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">
                  {categoriesLoading
                    ? "Loading complaint types..."
                    : "Select complaint type"}
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the problem in detail..."
                rows={5}
                disabled={loading}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-none"
              />
            </div>

            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Priority
              </label>

              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                disabled={loading}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="complaint-photo"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Photo
              </label>

              <input
                id="complaint-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={loading}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white disabled:bg-gray-100"
              />

              {photo && (
                <p className="text-sm text-gray-500 mt-2">
                  Selected: {photo.name}
                </p>
              )}
            </div>

            <div>
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Complaint Location
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Click on the map or use your current location.
                </p>
              </div>

              <LocationPicker
                onLocationSelect={handleLocationChange}
              />

              {location && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-800">
                    Location selected
                  </p>

                  <p className="text-sm text-green-700 mt-1">
                    Latitude: {location.latitude}
                  </p>

                  <p className="text-sm text-green-700">
                    Longitude: {location.longitude}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4">
                {success}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || categoriesLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition"
              >
                {loading
                  ? "Submitting..."
                  : "Submit Complaint"}
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/citizen/dashboard")
                }
                disabled={loading}
                className="sm:w-40 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default CreateComplaint;