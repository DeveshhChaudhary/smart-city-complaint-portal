import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import LocationPicker from "../../../components/map/LocationPicker";


const API_BASE_URL = "https://smart-city-complaint-portal-krs3.onrender.com";

function CreateComplaint() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
  });

  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState("");
  const [useAISuggestions, setUseAISuggestions] = useState(false);


  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === "title" || name === "description" || name === "category") {
      setUseAISuggestions(false);
    }
  };


  const getToken = () => {
    return localStorage.getItem("access_token");
  };

  const analyzeComplaint = async () => {
    if (!location) {
      alert("Please select the problem location on the map first.");
      return null;
    }

    if (!formData.title.trim()) {
      alert("Please enter a complaint title first.");
      return null;
    }

    if (!formData.description.trim()) {
      alert("Please enter a complaint description first.");
      return null;
    }

    const token = getToken();

    if (!token) {
      navigate("/login", { replace: true });
      return null;
    }

    setIsAnalyzing(true);
    setAiError("");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/complaints/ai/analyze`,
        {
          title: formData.title.trim(),
          description: formData.description.trim(),
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          category_id: null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const analysis = response.data?.analysis;

      if (!analysis) {
        throw new Error("AI analysis was not returned.");
      }

      setAiAnalysis(analysis);

      return analysis;
    } catch (error) {
      console.error("AI complaint analysis error:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return null;
      }

      const message =
        error.response?.data?.detail ||
        error.message ||
        "AI analysis failed. You can still submit the complaint.";

      setAiError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCategoryOptionValue = (categoryName) => {
    const value = (categoryName || "").toLowerCase();

    if (
      value.includes("road") ||
      value.includes("pothole")
    ) {
      return "road";
    }

    if (
      value.includes("garbage") ||
      value.includes("waste") ||
      value.includes("sanitation")
    ) {
      return "garbage";
    }

    if (
      value.includes("water") ||
      value.includes("pipeline")
    ) {
      return "water";
    }

    if (
      value.includes("street") ||
      value.includes("light") ||
      value.includes("electric")
    ) {
      return "electricity";
    }

    if (
      value.includes("drain") ||
      value.includes("sewer")
    ) {
      return "drainage";
    }

    if (
      value.includes("traffic") ||
      value.includes("signal")
    ) {
      return "traffic";
    }

    return "other";
  };

  const applyAISuggestions = () => {
    if (!aiAnalysis) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      category: getCategoryOptionValue(
        aiAnalysis.suggested_category
      ),
    }));

    setUseAISuggestions(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!location) {
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
      const analysis =
        aiAnalysis ||
        (await analyzeComplaint());

      const token = getToken();

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const complaintData = {
        title: formData.title.trim(),

        description: formData.description.trim(),

        category_id: useAISuggestions
          ? analysis?.suggested_category_id || null
          : formData.category || null,

        photo_url: photo ? photo.name : null,

        latitude: Number(location.latitude),

        longitude: Number(location.longitude),

        address: null,

        priority: useAISuggestions
          ? analysis?.suggested_priority || "Normal"
          : "Normal",
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
        const complaint =
          response.data.complaint;

        alert(
          `Complaint submitted successfully!\n\nComplaint ID: ${complaint.complaint_code}`
        );

        navigate("/citizen/dashboard");

        return;
      }


      alert(
        "Complaint could not be submitted. Please try again."
      );

    } catch (error) {
      console.error(
        "Complaint submission error:",
        error
      );


      let errorMessage =
        "Unable to submit complaint. Please try again.";


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
            onClick={() =>
              navigate("/citizen/dashboard")
            }
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

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

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

                  <option value="">
                    Select complaint category
                  </option>

                  <option value="road">
                    Roads & Potholes
                  </option>

                  <option value="garbage">
                    Garbage & Sanitation
                  </option>

                  <option value="water">
                    Water Supply
                  </option>

                  <option value="electricity">
                    Street Lights & Electricity
                  </option>

                  <option value="drainage">
                    Drainage
                  </option>

                  <option value="traffic">
                    Traffic & Signals
                  </option>

                  <option value="other">
                    Other
                  </option>

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


          {/* AI Complaint Intelligence */}

          <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={21} className="text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    AI Complaint Intelligence
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-600">
                  Analyze the complaint before submission to detect category,
                  priority, summary and possible duplicate reports.
                </p>
              </div>

              <button
                type="button"
                onClick={analyzeComplaint}
                disabled={isAnalyzing || isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Analyze Complaint
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <TriangleAlert size={19} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">AI analysis unavailable</p>
                  <p className="mt-1">{aiError}</p>
                  <p className="mt-1">
                    You can still submit the complaint normally.
                  </p>
                </div>
              </div>
            )}

            {aiAnalysis && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Suggested Category
                    </p>
                    <p className="mt-2 font-bold text-slate-900">
                      {aiAnalysis.suggested_category || "Other"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Confidence: {aiAnalysis.confidence ?? 0}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Suggested Priority
                    </p>
                    <p className="mt-2 font-bold text-slate-900">
                      {aiAnalysis.suggested_priority || "Normal"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      AI assessment based on described impact
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Responsible Department
                    </p>
                    <p className="mt-2 font-bold text-slate-900">
                      {aiAnalysis.department || "General Municipal Services"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    AI Summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {aiAnalysis.summary}
                  </p>
                </div>

                <div
                  className={`rounded-xl border p-4 ${
                    aiAnalysis.duplicate_detected
                      ? "border-amber-200 bg-amber-50"
                      : "border-green-200 bg-green-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {aiAnalysis.duplicate_detected ? (
                      <TriangleAlert
                        size={20}
                        className="mt-0.5 shrink-0 text-amber-600"
                      />
                    ) : (
                      <CheckCircle2
                        size={20}
                        className="mt-0.5 shrink-0 text-green-600"
                      />
                    )}

                    <div className="min-w-0">
                      <p
                        className={`font-semibold ${
                          aiAnalysis.duplicate_detected
                            ? "text-amber-900"
                            : "text-green-900"
                        }`}
                      >
                        {aiAnalysis.duplicate_detected
                          ? "Possible duplicate complaint detected"
                          : "No likely duplicate detected"}
                      </p>

                      <p
                        className={`mt-1 text-sm ${
                          aiAnalysis.duplicate_detected
                            ? "text-amber-800"
                            : "text-green-800"
                        }`}
                      >
                        {aiAnalysis.duplicate_detected
                          ? `${aiAnalysis.duplicate_count} similar active complaint(s) were found within the nearby area.`
                          : "The system did not find a sufficiently similar active complaint nearby."}
                      </p>

                      {aiAnalysis.duplicates?.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {aiAnalysis.duplicates.slice(0, 3).map((duplicate) => (
                            <div
                              key={duplicate.complaint_id}
                              className="rounded-lg border border-amber-200 bg-white p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {duplicate.complaint_code}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-700">
                                    {duplicate.title}
                                  </p>
                                </div>

                                <span className="shrink-0 text-xs font-semibold text-amber-700">
                                  {duplicate.distance_meters}m away
                                </span>
                              </div>

                              <p className="mt-2 text-xs text-slate-500">
                                Similarity:{" "}
                                {Math.round(
                                  Number(duplicate.similarity || 0) * 100
                                )}
                                % · Status: {duplicate.status}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-indigo-900">
                      AI suggestion is advisory
                    </p>
                    <p className="mt-1 text-xs text-indigo-700">
                      Applying it will use the suggested category and priority
                      when the complaint is submitted.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={applyAISuggestions}
                    disabled={!aiAnalysis}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-200 transition hover:bg-indigo-50 disabled:opacity-50"
                  >
                    <CheckCircle2 size={17} />
                    Use AI Suggestions
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Source: {aiAnalysis.ai_source || "Civic Intelligence Engine"}
                  </span>

                  {aiAnalysis.keywords?.length > 0 && (
                    <span className="text-right">
                      Keywords: {aiAnalysis.keywords.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>


          {/* Photo */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5">

              <h2 className="text-lg font-bold text-slate-900">
                Add Photo
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Upload a photo showing the problem.
              </p>

            </div>


            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 transition hover:border-blue-400 hover:bg-blue-50">

              <Camera
                size={32}
                className="mb-3 text-blue-600"
              />

              <span className="font-semibold text-slate-700">
                {photo
                  ? photo.name
                  : "Click to upload a photo"}
              </span>

              <span className="mt-1 text-xs text-slate-400">
                JPG, PNG or WEBP
              </span>


              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  setPhoto(
                    event.target.files?.[0] || null
                  );
                }}
              />

            </label>

          </section>


          {/* Location */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5">

              <div className="flex items-center gap-2">

                <MapPin
                  size={22}
                  className="text-blue-600"
                />

                <h2 className="text-lg font-bold text-slate-900">
                  Problem Location
                </h2>

              </div>


              <p className="mt-1 text-sm text-slate-500">
                Click on the map to mark exactly where the problem is located.
              </p>

            </div>


            <LocationPicker
              onChange={setLocation}
            />

          </section>


          {/* Selected Location */}

          {location && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">

              <div className="flex items-start gap-3">

                <MapPin
                  size={22}
                  className="mt-0.5 shrink-0 text-blue-600"
                />

                <div>

                  <h3 className="font-semibold text-blue-900">
                    Location Selected
                  </h3>

                  <p className="mt-1 text-sm text-blue-700">
                    Latitude:{" "}
                    {Number(
                      location.latitude
                    ).toFixed(6)}
                  </p>

                  <p className="text-sm text-blue-700">
                    Longitude:{" "}
                    {Number(
                      location.longitude
                    ).toFixed(6)}
                  </p>

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

              <Send size={19} />

              {isSubmitting
                ? "Submitting..."
                : "Submit Complaint"}

            </button>

          </div>

        </form>

      </main>

    </div>
  );
}


export default CreateComplaint;