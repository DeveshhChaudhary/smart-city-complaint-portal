import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Filter,
  Folder,
  Image as ImageIcon,
  Info,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map as MapIcon,
  MapPin,
  Menu,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  User,
  UserCheck,
  UserRound,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import NotificationBell from "../../components/NotificationBell";
import smartCityLogo from "../../assets/smart-city-logo.png";

const API_BASE_URL = "https://smart-city-complaint-portal-krs3.onrender.com";

// Map bounds auto-fitter helper
function WorkerMapBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = points.map((p) => [p.latitude, p.longitude]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);

  return null;
}

// Fallback images based on category/title
const getFallbackImage = (categoryName = "", title = "") => {
  const text = `${categoryName} ${title}`.toLowerCase();
  if (text.includes("road") || text.includes("pothole")) {
    return "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80";
  }
  if (text.includes("light") || text.includes("lamp") || text.includes("electric")) {
    return "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80";
  }
  if (text.includes("garbage") || text.includes("waste") || text.includes("trash") || text.includes("clean")) {
    return "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=80";
  }
  if (text.includes("water") || text.includes("drain") || text.includes("leak") || text.includes("pipe")) {
    return "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=600&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&auto=format&fit=crop&q=80";
};

function WorkerDashboard() {
  const navigate = useNavigate();

  // Authentication & Profile State
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [worker, setWorker] = useState(null);
  const [complaints, setComplaints] = useState([]);

  // UI Navigation State
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'complaints' | 'map' | 'tasks' | 'completed' | 'profile'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Loading & Alerts
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Complaint Details Modal (Screen 4)
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Status Update & Resolution Modal (Screen 5 & 6)
  const [actionModalType, setActionModalType] = useState(null); // 'in_progress' | 'resolve' | 'reject' | null
  const [actionComplaint, setActionComplaint] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [uploadedPhotoPreview, setUploadedPhotoPreview] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Map view selection
  const [mapSelectedComplaint, setMapSelectedComplaint] = useState(null);

  // Authentication Guard
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");

    if (!savedToken || !savedUser) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== "worker") {
        navigate("/login", { replace: true });
        return;
      }

      setToken(savedToken);
      setUser(parsedUser);
      loadWorkerData(savedToken);
    } catch (err) {
      console.error("Worker authentication error:", err);
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Load Worker Profile & Assigned Complaints
  const loadWorkerData = async (authToken = token, isRefresh = false) => {
    if (!authToken) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const headers = { Authorization: `Bearer ${authToken}` };

      const [workerResponse, complaintsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/worker/me`, { headers }),
        axios.get(`${API_BASE_URL}/api/worker/complaints`, { headers }),
      ]);

      if (workerResponse.data?.success) {
        setWorker(workerResponse.data.worker);
      }

      if (complaintsResponse.data?.success) {
        setComplaints(complaintsResponse.data.complaints || []);
      } else {
        setComplaints([]);
      }
    } catch (err) {
      console.error("Worker dashboard load error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }
      setError(err.response?.data?.detail || "Failed to load worker dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load Complaint History
  const loadComplaintHistory = async (complaintId) => {
    if (!complaintId || !token) return;

    try {
      setHistoryLoading(true);
      setHistoryError("");
      setStatusHistory([]);

      const response = await axios.get(`${API_BASE_URL}/api/complaints/${complaintId}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success) {
        setStatusHistory(response.data.history || []);
      } else {
        setStatusHistory([]);
      }
    } catch (err) {
      console.error("Complaint history error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }
      setHistoryError(err.response?.data?.detail || "Failed to load complaint status history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openComplaintModal = async (complaint) => {
    setSelectedComplaint(complaint);
    setRemarks("");
    setHistoryError("");
    await loadComplaintHistory(complaint.id);
  };

  const closeComplaintModal = () => {
    setSelectedComplaint(null);
    setStatusHistory([]);
    setHistoryError("");
    setRemarks("");
  };

  const openActionModal = (complaint, type) => {
    setActionComplaint(complaint);
    setActionModalType(type);
    setRemarks("");
    setUploadedPhotoPreview(null);
  };

  const closeActionModal = () => {
    setActionModalType(null);
    setActionComplaint(null);
    setRemarks("");
    setUploadedPhotoPreview(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  // Update Status API Call
  const handleStatusUpdate = async (complaintId, newStatus, customRemarks = "") => {
    if (!complaintId || !newStatus) return;

    try {
      setUpdatingId(complaintId);
      setError("");
      setSuccess("");

      const finalRemarks =
        customRemarks.trim() ||
        remarks.trim() ||
        (newStatus === "In Progress"
          ? "Worker started investigation and field work."
          : newStatus === "Resolved"
          ? "Work completed successfully on-site."
          : `Status updated to ${newStatus}.`);

      await axios.patch(
        `${API_BASE_URL}/api/complaints/${complaintId}/status`,
        {
          status: newStatus,
          remarks: finalRemarks,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setSuccess(`Complaint #${complaintId.slice(0, 8)} status changed to "${newStatus}".`);
      closeActionModal();

      // Refresh worker data
      await loadWorkerData(token, true);

      // If details modal is open, refresh it as well
      if (selectedComplaint && selectedComplaint.id === complaintId) {
        const detailRes = await axios.get(`${API_BASE_URL}/api/complaints/${complaintId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (detailRes.data?.success) {
          setSelectedComplaint(detailRes.data.complaint);
          setStatusHistory(detailRes.data.status_history || []);
        }
      }
    } catch (err) {
      console.error("Status update error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }
      setError(err.response?.data?.detail || "Failed to update complaint status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Photo upload mock handler for UI parity with reference
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedPhotoPreview(url);
    }
  };

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = complaints.length;
    const assigned = complaints.filter((c) => c.status === "Assigned").length;
    const inProgress = complaints.filter((c) => c.status === "In Progress").length;
    const completed = complaints.filter((c) => c.status === "Resolved").length;
    // Overdue / High Priority: complaints with High/Emergency priority or older than 3 days
    const overdue = complaints.filter(
      (c) =>
        (c.priority === "High" || c.priority === "Emergency") &&
        c.status !== "Resolved" &&
        c.status !== "Rejected"
    ).length;

    return { total, assigned, inProgress, completed, overdue };
  }, [complaints]);

  // Filtered Complaints List
  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => {
      // Status filter
      if (statusFilter !== "All") {
        if (statusFilter === "Pending" && item.status !== "Assigned") return false;
        if (statusFilter === "In Progress" && item.status !== "In Progress") return false;
        if (statusFilter === "Completed" && item.status !== "Resolved") return false;
        if (statusFilter !== "Pending" && statusFilter !== "In Progress" && statusFilter !== "Completed" && item.status !== statusFilter) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== "All" && item.priority !== priorityFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const code = (item.complaint_code || "").toLowerCase();
        const title = (item.title || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const address = (item.address || "").toLowerCase();
        const cat = (item.categories?.name || "").toLowerCase();
        return (
          code.includes(query) ||
          title.includes(query) ||
          desc.includes(query) ||
          address.includes(query) ||
          cat.includes(query)
        );
      }

      return true;
    });
  }, [complaints, statusFilter, priorityFilter, searchQuery]);

  // Map markers (complaints with valid lat/long)
  const mapPoints = useMemo(() => {
    return complaints.filter(
      (c) =>
        typeof c.latitude === "number" &&
        typeof c.longitude === "number" &&
        !isNaN(c.latitude) &&
        !isNaN(c.longitude)
    );
  }, [complaints]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
      case "emergency":
        return "bg-rose-50 text-rose-600 border border-rose-200";
      case "medium":
      case "normal":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "low":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Assigned":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Assigned</span>;
      case "In Progress":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">In Progress</span>;
      case "Resolved":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Resolved</span>;
      case "Rejected":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 relative">
            <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Loading Worker Portal...</h2>
          <p className="text-sm text-slate-500 mt-1">Connecting to smart city municipal services</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      {/* ============================================================ */}
      {/* 1. TOP NAVBAR (Matches Reference Screens 2, 3, 4, 7) */}
      {/* ============================================================ */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-4">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Toggle Navigation"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div
                onClick={() => setActiveTab("dashboard")}
                className="flex items-center gap-2.5 cursor-pointer select-none"
              >
                <img
                  src={smartCityLogo}
                  alt="Smart City Logo"
                  className="h-9 w-auto object-contain"
                />
                <div className="leading-tight">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 uppercase block">
                    SMART CITY
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold text-blue-600 tracking-wide block">
                    Complaint Portal
                  </span>
                </div>
              </div>
            </div>

            {/* Right actions: Notifications + Worker Profile Pill */}
            <div className="flex items-center gap-3">
              <NotificationBell />

              {/* Worker Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-100 transition border border-slate-200/80"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                    W
                  </div>
                  <div className="hidden sm:block text-left text-xs">
                    <p className="font-semibold text-slate-800 leading-tight">
                      {user?.name || "Worker"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {worker?.worker_code || "Municipal Staff"}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      userMenuOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50 rounded-xl mb-1">
                      <p className="font-bold text-sm text-slate-900">{user?.name || "Worker"}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-800">
                          {worker?.department || "Public Works"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {worker?.worker_code}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab("profile");
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      Worker Profile Details
                    </button>

                    <button
                      onClick={() => {
                        loadWorkerData(token, true);
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-500" />
                      Refresh Data
                    </button>

                    <div className="h-px bg-slate-100 my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. MAIN LAYOUT: SIDEBAR + CONTENT BODY */}
      {/* ============================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex gap-6">
        {/* SIDEBAR NAVIGATION (Desktop & Drawer) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:static lg:block lg:w-60 lg:border lg:rounded-2xl lg:shadow-xs lg:h-fit p-4 shrink-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="lg:hidden flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <span className="font-bold text-sm text-slate-700">Navigation Menu</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === "dashboard"
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>

            <button
              onClick={() => {
                setActiveTab("complaints");
                setStatusFilter("All");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === "complaints"
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <ListChecks className="w-4 h-4" />
                <span>Assigned Complaints</span>
              </div>
              {stats.assigned > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {stats.assigned}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("map");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === "map"
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Map View
            </button>

            <button
              onClick={() => {
                setActiveTab("tasks");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === "tasks"
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Wrench className="w-4 h-4" />
                <span>My Tasks</span>
              </div>
              {stats.inProgress > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {stats.inProgress}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("completed");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === "completed"
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </button>

            <button
              onClick={() => {
                setActiveTab("profile");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === "profile"
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <User className="w-4 h-4" />
              Profile
            </button>
          </nav>

          {/* Quick Support / Status Box */}
          <div className="mt-8 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
              <p className="font-semibold text-slate-700">Municipal Helpdesk</p>
              <p className="text-slate-500 mt-1">Direct Worker Support Hotline</p>
              <p className="font-mono text-blue-600 font-bold mt-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> 1800-SMART-WORK
              </p>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden"
          />
        )}

        {/* MAIN BODY AREA */}
        <main className="flex-1 min-w-0">
          {/* Notifications / Error / Success Alerts */}
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 mt-0.5 text-rose-600 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-bold">System Notice</p>
                <p className="text-rose-700 mt-0.5">{error}</p>
              </div>
              <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-bold">Action Completed</p>
                <p className="text-emerald-700 mt-0.5">{success}</p>
              </div>
              <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 1: DASHBOARD OVERVIEW (Matches Screen 2) */}
          {/* ============================================================ */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Hero Banner with Worker Greeting */}
              <div className="bg-gradient-to-r from-blue-50/90 via-sky-50 to-blue-50/50 border border-blue-100 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xs">
                <div className="relative z-10 max-w-xl">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    Hello, {user?.name?.split(" ")[0] || "Worker"} 👋
                  </h1>
                  <p className="text-slate-600 text-sm sm:text-base mt-2 font-medium">
                    You have{" "}
                    <span className="font-bold text-blue-700">
                      {stats.assigned + stats.inProgress} active
                    </span>{" "}
                    complaints assigned in your sector.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <button
                      onClick={() => {
                        setActiveTab("complaints");
                        setStatusFilter("Assigned");
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm transition"
                    >
                      View Assigned Tasks
                    </button>
                    <button
                      onClick={() => loadWorkerData(token, true)}
                      disabled={refreshing}
                      className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition inline-flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Decorative city illustration on the right */}
                <div className="absolute right-0 bottom-0 top-0 hidden md:flex items-center pr-8 pointer-events-none opacity-90">
                  <div className="w-56 h-36 relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-100/50 rounded-full blur-2xl transform scale-75" />
                    <div className="relative flex items-center gap-3">
                      <div className="p-4 bg-white/90 backdrop-blur-xs rounded-2xl shadow-md border border-blue-100 text-center">
                        <Wrench className="w-8 h-8 text-blue-600 mx-auto" />
                        <p className="text-[11px] font-bold text-slate-700 mt-1">Field Ready</p>
                      </div>
                      <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-md text-center">
                        <ShieldCheck className="w-8 h-8 mx-auto text-blue-200" />
                        <p className="text-[11px] font-bold mt-1">Verified Duty</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Statistics Cards (Matches Screen 2: Assigned, In Progress, Completed, Overdue) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* 1. Assigned */}
                <div
                  onClick={() => {
                    setActiveTab("complaints");
                    setStatusFilter("Assigned");
                  }}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-blue-300 hover:shadow-sm transition cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      New
                    </span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 mt-3">{stats.assigned}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Assigned</p>
                </div>

                {/* 2. In Progress */}
                <div
                  onClick={() => {
                    setActiveTab("complaints");
                    setStatusFilter("In Progress");
                  }}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-amber-300 hover:shadow-sm transition cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Clock3 className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 mt-3">{stats.inProgress}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">In Progress</p>
                </div>

                {/* 3. Completed */}
                <div
                  onClick={() => {
                    setActiveTab("complaints");
                    setStatusFilter("Resolved");
                  }}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Done
                    </span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 mt-3">{stats.completed}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Completed</p>
                </div>

                {/* 4. Overdue / High Priority */}
                <div
                  onClick={() => {
                    setActiveTab("complaints");
                    setStatusFilter("All");
                    setPriorityFilter("High");
                  }}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-rose-300 hover:shadow-sm transition cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      Urgent
                    </span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 mt-3">{stats.overdue}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Overdue / Priority</p>
                </div>
              </div>

              {/* "My Assigned Complaints" Section (Matches Screen 2 list) */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">My Assigned Complaints</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Complaints requiring your inspection and resolution
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("complaints");
                      setStatusFilter("All");
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                  >
                    View All
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {complaints.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                      <ListChecks className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">No complaints assigned yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      New municipal complaints will appear here when assigned to you.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {complaints.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 rounded-2xl px-2 sm:px-3 transition"
                      >
                        {/* Thumbnail & Title Info */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <img
                            src={item.photo_url || getFallbackImage(item.categories?.name, item.title)}
                            alt={item.title}
                            className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl object-cover shrink-0 border border-slate-200/80 bg-slate-100 shadow-2xs"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                onClick={() => openComplaintModal(item)}
                                className="font-bold text-slate-900 text-sm sm:text-base hover:text-blue-600 cursor-pointer truncate"
                              >
                                {item.title}
                              </h3>
                              {item.priority && (
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getPriorityBadgeClass(
                                    item.priority
                                  )}`}
                                >
                                  {item.priority}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {item.address || "Location specified on map"}
                            </p>

                            <p className="text-[11px] text-slate-400 mt-1">
                              Assigned: {formatDate(item.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {item.status === "Assigned" && (
                            <button
                              onClick={() => openActionModal(item, "in_progress")}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                            >
                              Start Work
                            </button>
                          )}

                          {item.status === "In Progress" && (
                            <button
                              onClick={() => openActionModal(item, "resolve")}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                            >
                              Update
                            </button>
                          )}

                          {item.status === "Resolved" && (
                            <button
                              onClick={() => openComplaintModal(item)}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                            >
                              View
                            </button>
                          )}

                          <button
                            onClick={() => openComplaintModal(item)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                            aria-label="View details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: ASSIGNED COMPLAINTS LIST (Matches Screen 3) */}
          {/* ============================================================ */}
          {activeTab === "complaints" && (
            <div className="space-y-5">
              {/* Header Title */}
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Assigned Complaints
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Manage, update status, and resolve field complaints assigned to you.
                </p>
              </div>

              {/* Status Filter Tabs (Matches Screen 3: All, Pending, In Progress, Completed) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setStatusFilter("All")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
                    statusFilter === "All"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  All ({complaints.length})
                </button>
                <button
                  onClick={() => setStatusFilter("Pending")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
                    statusFilter === "Pending"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  Pending ({stats.assigned})
                </button>
                <button
                  onClick={() => setStatusFilter("In Progress")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
                    statusFilter === "In Progress"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  In Progress ({stats.inProgress})
                </button>
                <button
                  onClick={() => setStatusFilter("Completed")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
                    statusFilter === "Completed"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  Completed ({stats.completed})
                </button>
              </div>

              {/* Search Bar + Priority Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search complaints by title, code, or address..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Priorities</option>
                    <option value="High">High Priority</option>
                    <option value="Normal">Medium / Normal</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Complaints List Cards */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs">
                {filteredComplaints.length === 0 ? (
                  <div className="py-16 text-center">
                    <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-800 text-sm">No complaints match your criteria</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try clearing search keywords or changing the status filter.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredComplaints.map((item) => (
                      <div
                        key={item.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 rounded-2xl px-2 sm:px-3 transition"
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <img
                            src={item.photo_url || getFallbackImage(item.categories?.name, item.title)}
                            alt={item.title}
                            className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl object-cover shrink-0 border border-slate-200/80 bg-slate-100 shadow-2xs"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                onClick={() => openComplaintModal(item)}
                                className="font-bold text-slate-900 text-sm sm:text-base hover:text-blue-600 cursor-pointer truncate"
                              >
                                {item.title}
                              </h3>
                              {item.priority && (
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getPriorityBadgeClass(
                                    item.priority
                                  )}`}
                                >
                                  {item.priority}
                                </span>
                              )}
                              {getStatusBadge(item.status)}
                            </div>

                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {item.address || "Sector field location"}
                            </p>

                            <p className="text-[11px] text-slate-400 mt-1">
                              Assigned: {formatDate(item.created_at)} • Code: {item.complaint_code || item.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {item.status === "Assigned" && (
                            <button
                              onClick={() => openActionModal(item, "in_progress")}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                            >
                              Start Work
                            </button>
                          )}

                          {item.status === "In Progress" && (
                            <button
                              onClick={() => openActionModal(item, "resolve")}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                            >
                              Update
                            </button>
                          )}

                          {item.status === "Resolved" && (
                            <button
                              onClick={() => openComplaintModal(item)}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                            >
                              View
                            </button>
                          )}

                          <button
                            onClick={() => openComplaintModal(item)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: MAP VIEW (Matches Screen 8) */}
          {/* ============================================================ */}
          {activeTab === "map" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    Municipal Complaint Map
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Live GPS locations of field complaints assigned to your department.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-medium shadow-2xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Assigned
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-medium shadow-2xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> In Progress
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-medium shadow-2xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Resolved
                  </span>
                </div>
              </div>

              {/* Leaflet Map Card */}
              <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs relative">
                <div className="h-[360px] sm:h-[480px] w-full relative z-10">
                  {mapPoints.length > 0 ? (
                    <MapContainer
                      center={[mapPoints[0].latitude, mapPoints[0].longitude]}
                      zoom={13}
                      scrollWheelZoom={true}
                      className="h-full w-full"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <WorkerMapBounds points={mapPoints} />

                      {mapPoints.map((point) => {
                        const markerColor =
                          point.status === "Resolved"
                            ? "#10b981"
                            : point.status === "In Progress"
                            ? "#f59e0b"
                            : "#2563eb";

                        return (
                          <CircleMarker
                            key={point.id}
                            center={[point.latitude, point.longitude]}
                            radius={9}
                            pathOptions={{
                              color: "#ffffff",
                              weight: 2.5,
                              fillColor: markerColor,
                              fillOpacity: 0.9,
                            }}
                            eventHandlers={{
                              click: () => setMapSelectedComplaint(point),
                            }}
                          >
                            <Popup>
                              <div className="p-1 text-xs max-w-[200px]">
                                <p className="font-bold text-slate-900">{point.title}</p>
                                <p className="text-slate-500 mt-1 line-clamp-2">{point.description}</p>
                                <div className="mt-2 flex items-center justify-between">
                                  <span className="font-semibold text-blue-600">{point.status}</span>
                                  <button
                                    onClick={() => openComplaintModal(point)}
                                    className="text-blue-600 font-bold underline"
                                  >
                                    Details
                                  </button>
                                </div>
                              </div>
                            </Popup>
                          </CircleMarker>
                        );
                      })}
                    </MapContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center p-6 text-center bg-slate-50">
                      <div>
                        <MapIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700 text-sm">No Location Points Available</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                          Assigned complaints do not currently have valid GPS coordinates recorded.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Floating Bottom Card for Selected Pin (Matches Screen 8) */}
                {mapSelectedComplaint && (
                  <div className="p-4 bg-white/95 backdrop-blur-md border-t border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            mapSelectedComplaint.photo_url ||
                            getFallbackImage(
                              mapSelectedComplaint.categories?.name,
                              mapSelectedComplaint.title
                            )
                          }
                          alt={mapSelectedComplaint.title}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {mapSelectedComplaint.title}
                            </h4>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getPriorityBadgeClass(
                                mapSelectedComplaint.priority
                              )}`}
                            >
                              {mapSelectedComplaint.priority || "Normal"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {mapSelectedComplaint.complaint_code || mapSelectedComplaint.id.slice(0, 8)} •{" "}
                            {mapSelectedComplaint.address}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openComplaintModal(mapSelectedComplaint)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => setMapSelectedComplaint(null)}
                          className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: MY TASKS (Active / In Progress) */}
          {/* ============================================================ */}
          {activeTab === "tasks" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Active Field Tasks</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Tasks currently in progress that require resolution and inspection notes.
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
                {complaints.filter((c) => c.status === "In Progress").length === 0 ? (
                  <div className="py-14 text-center">
                    <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-800 text-sm">No tasks currently In Progress</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click "Start Work" on an assigned complaint to begin tracking progress.
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab("complaints");
                        setStatusFilter("Pending");
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
                    >
                      Browse Assigned Complaints
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {complaints
                      .filter((c) => c.status === "In Progress")
                      .map((task) => (
                        <div
                          key={task.id}
                          className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5">
                            <img
                              src={task.photo_url || getFallbackImage(task.categories?.name, task.title)}
                              alt={task.title}
                              className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                                  {task.title}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  In Progress
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">{task.address}</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Category: {task.categories?.name || "General"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => openActionModal(task, "resolve")}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                            >
                              Mark as Resolved
                            </button>
                            <button
                              onClick={() => openComplaintModal(task)}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: COMPLETED TASKS */}
          {/* ============================================================ */}
          {activeTab === "completed" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Completed Work</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Archived complaints you have successfully resolved.
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
                {complaints.filter((c) => c.status === "Resolved").length === 0 ? (
                  <div className="py-14 text-center">
                    <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-800 text-sm">No completed complaints yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Complaints marked as resolved will be documented here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {complaints
                      .filter((c) => c.status === "Resolved")
                      .map((task) => (
                        <div
                          key={task.id}
                          className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5">
                            <img
                              src={task.photo_url || getFallbackImage(task.categories?.name, task.title)}
                              alt={task.title}
                              className="w-16 h-16 rounded-xl object-cover border border-slate-200 opacity-90"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                                  {task.title}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Resolved
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">{task.address}</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Code: {task.complaint_code || task.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => openComplaintModal(task)}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                            >
                              View History
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 6: WORKER PROFILE DETAILS */}
          {/* ============================================================ */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Worker Profile</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Official municipal credentials and active duty status.
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-sm">
                      {user?.name?.charAt(0) || "W"}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{user?.name || "Worker"}</h2>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold text-xs rounded-full border border-blue-200">
                          {worker?.department || "Department of Public Works"}
                        </span>
                        <span className="text-xs font-mono text-slate-500 font-medium">
                          #{worker?.worker_code || "W-100"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active Field Duty
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs">Assigned Department</span>
                    <span className="font-semibold text-slate-800 mt-1 block">
                      {worker?.department || "Municipal Sanitation & Roads"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Specialization</span>
                    <span className="font-semibold text-slate-800 mt-1 block">
                      {worker?.specialization || "Civil Maintenance"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Worker ID</span>
                    <span className="font-semibold font-mono text-slate-800 mt-1 block">
                      {worker?.worker_code || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Active Tasks</span>
                    <span className="font-semibold text-slate-800 mt-1 block">
                      {stats.assigned + stats.inProgress} Complaints
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Resolved Total</span>
                    <span className="font-semibold text-emerald-600 mt-1 block">
                      {stats.completed} Complaints
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Role Level</span>
                    <span className="font-semibold text-slate-800 mt-1 block capitalize">
                      {user?.role || "Field Officer"}
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => loadWorkerData(token, true)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    Refresh Record
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition inline-flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================ */}
      {/* 3. COMPLAINT DETAILS MODAL (Matches Screen 4: Worker View) */}
      {/* ============================================================ */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-2xs animate-in fade-in duration-150"
          onClick={closeComplaintModal}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    {selectedComplaint.title}
                  </h2>
                  {selectedComplaint.priority && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getPriorityBadgeClass(
                        selectedComplaint.priority
                      )}`}
                    >
                      {selectedComplaint.priority} Priority
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  #{selectedComplaint.complaint_code || selectedComplaint.id}
                </p>
              </div>
              <button
                onClick={closeComplaintModal}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              {/* Location Row */}
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="flex-1 truncate">
                  {selectedComplaint.address || "Field location in sector"}
                </span>
                {selectedComplaint.latitude && selectedComplaint.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedComplaint.latitude},${selectedComplaint.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-600 hover:underline shrink-0"
                  >
                    View on Map
                  </a>
                )}
              </div>

              {/* Photo Evidence Gallery */}
              <div>
                <img
                  src={
                    selectedComplaint.photo_url ||
                    getFallbackImage(selectedComplaint.categories?.name, selectedComplaint.title)
                  }
                  alt={selectedComplaint.title}
                  className="w-full h-56 sm:h-72 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                />
              </div>

              {/* Key Information Box (Matches Screen 4) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 border border-slate-100 rounded-2xl p-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Category</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">
                    {selectedComplaint.categories?.name || "General"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Submitted</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">
                    {formatDate(selectedComplaint.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Status</span>
                  <span className="mt-0.5 inline-block">
                    {getStatusBadge(selectedComplaint.status)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Citizen ID</span>
                  <span className="font-bold font-mono text-slate-800 mt-0.5 block truncate">
                    {selectedComplaint.citizen_id?.slice(0, 8) || "Verified"}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Status History Timeline (Matches Screen 4 & 5) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Activity & Audit Trail
                  </h4>
                  <button
                    onClick={() => loadComplaintHistory(selectedComplaint.id)}
                    disabled={historyLoading}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${historyLoading ? "animate-spin" : ""}`} />
                    Refresh History
                  </button>
                </div>

                {historyError && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {historyError}
                  </p>
                )}

                {historyLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Loading lifecycle history...
                  </div>
                ) : statusHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No past history recorded.</p>
                ) : (
                  <div className="space-y-3 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {statusHistory.map((item, idx) => (
                      <div key={item.id || idx} className="relative text-xs">
                        <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800">
                              Status: {item.new_status}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatDateTime(item.created_at)}
                            </span>
                          </div>
                          {item.remarks && (
                            <p className="text-slate-600 mt-1 text-xs">{item.remarks}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">
                            By: {item.changed_by || "System"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={closeComplaintModal}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedComplaint.status === "Assigned" && (
                  <button
                    onClick={() => {
                      closeComplaintModal();
                      openActionModal(selectedComplaint, "in_progress");
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    Start Work
                  </button>
                )}

                {selectedComplaint.status === "In Progress" && (
                  <>
                    <button
                      onClick={() => {
                        closeComplaintModal();
                        openActionModal(selectedComplaint, "resolve");
                      }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      Mark as Resolved
                    </button>
                    <button
                      onClick={() => {
                        closeComplaintModal();
                        openActionModal(selectedComplaint, "reject");
                      }}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. WORK PROGRESS & RESOLUTION MODAL (Matches Screen 5 & 6) */}
      {/* ============================================================ */}
      {actionModalType && actionComplaint && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-2xs animate-in fade-in duration-150"
          onClick={closeActionModal}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                  {actionModalType === "in_progress"
                    ? "Update Work Progress"
                    : actionModalType === "resolve"
                    ? "Mark as Resolved"
                    : "Reject Complaint"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {actionComplaint.title} (#{actionComplaint.complaint_code || actionComplaint.id.slice(0, 8)})
                </p>
              </div>
              <button
                onClick={closeActionModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Display (Matches Screen 5 & 6) */}
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-6 right-6 top-3 h-0.5 bg-slate-200 -z-0" />
                
                {/* Step 1: Assigned */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 mt-1">Assigned</span>
                </div>

                {/* Step 2: In Progress */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      actionModalType === "resolve"
                        ? "bg-emerald-600 text-white"
                        : "bg-blue-600 text-white ring-4 ring-blue-100"
                    }`}
                  >
                    {actionModalType === "resolve" ? <Check className="w-3.5 h-3.5" /> : "2"}
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 mt-1">In Progress</span>
                </div>

                {/* Step 3: Resolved */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      actionModalType === "resolve"
                        ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    3
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 mt-1">Resolved</span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="p-6 space-y-4">
              {/* Remarks Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {actionModalType === "in_progress"
                    ? "Work Progress Details"
                    : actionModalType === "resolve"
                    ? "Work Completion Details"
                    : "Rejection Reason"}
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder={
                    actionModalType === "in_progress"
                      ? "Describe the work you have initiated..."
                      : actionModalType === "resolve"
                      ? "Describe the completed repair or resolution..."
                      : "Provide a clear reason why this complaint cannot be addressed..."
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none transition"
                />
              </div>

              {/* Upload Photo (Matches Screen 5 & 6) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {actionModalType === "resolve"
                    ? "Upload Completion Photo"
                    : "Add Progress Photo (Optional)"}
                </label>

                {uploadedPhotoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-36">
                    <img
                      src={uploadedPhotoPreview}
                      alt="Uploaded preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setUploadedPhotoPreview(null)}
                      className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition text-center">
                    <UploadCloud className="w-8 h-8 text-blue-500 mb-1" />
                    <p className="text-xs font-bold text-slate-700">Click to upload photo</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG (Max 10 MB)</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                onClick={closeActionModal}
                disabled={updatingId !== null}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-white transition"
              >
                Cancel
              </button>

              {actionModalType === "in_progress" && (
                <button
                  onClick={() =>
                    handleStatusUpdate(actionComplaint.id, "In Progress", remarks)
                  }
                  disabled={updatingId === actionComplaint.id}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      updatingId === actionComplaint.id ? "animate-spin" : ""
                    }`}
                  />
                  Mark as In Progress
                </button>
              )}

              {actionModalType === "resolve" && (
                <button
                  onClick={() =>
                    handleStatusUpdate(actionComplaint.id, "Resolved", remarks)
                  }
                  disabled={updatingId === actionComplaint.id}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      updatingId === actionComplaint.id ? "animate-spin" : ""
                    }`}
                  />
                  Mark as Resolved
                </button>
              )}

              {actionModalType === "reject" && (
                <button
                  onClick={() =>
                    handleStatusUpdate(actionComplaint.id, "Rejected", remarks)
                  }
                  disabled={updatingId === actionComplaint.id}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  <XCircle
                    className={`w-3.5 h-3.5 ${
                      updatingId === actionComplaint.id ? "animate-spin" : ""
                    }`}
                  />
                  Confirm Rejection
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. MOBILE BOTTOM NAVIGATION (Matches Screen 7) */}
      {/* ============================================================ */}
      <nav className="lg:hidden sticky bottom-0 bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-around z-30 shadow-lg">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 p-1 text-xs font-semibold transition ${
            activeTab === "dashboard" ? "text-blue-600" : "text-slate-500"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("complaints");
            setStatusFilter("All");
          }}
          className={`flex flex-col items-center gap-1 p-1 text-xs font-semibold transition relative ${
            activeTab === "complaints" ? "text-blue-600" : "text-slate-500"
          }`}
        >
          <ListChecks className="w-5 h-5" />
          <span className="text-[10px]">Complaints</span>
          {stats.assigned > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-blue-600" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("map")}
          className={`flex flex-col items-center gap-1 p-1 text-xs font-semibold transition ${
            activeTab === "map" ? "text-blue-600" : "text-slate-500"
          }`}
        >
          <MapIcon className="w-5 h-5" />
          <span className="text-[10px]">Map</span>
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center gap-1 p-1 text-xs font-semibold transition ${
            activeTab === "profile" ? "text-blue-600" : "text-slate-500"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Profile</span>
        </button>
      </nav>
    </div>
  );
}

export default WorkerDashboard;