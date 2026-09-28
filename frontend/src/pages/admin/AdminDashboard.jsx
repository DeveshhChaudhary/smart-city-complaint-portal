import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Ban,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Filter,
  Folder,
  LayoutDashboard,
  ClipboardList,
  LogOut,
  Map as MapIcon,
  MapPin,
  MapPinned,
  Megaphone,
  Menu,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  UserX,
  Wrench,
  X,
  XCircle,
  ArrowRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import NotificationBell from "../../components/NotificationBell";
import smartCityLogo from "../../assets/smart-city-logo.png";

const API_BASE_URL = "https://smart-city-complaint-portal-krs3.onrender.com";

const generateWorkerCode = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `WRK-${timestamp}${random}`;
};

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

function MapBoundsController({ complaints }) {
  const map = useMap();

  useEffect(() => {
    const validComplaints = complaints.filter(
      (complaint) =>
        complaint.latitude != null &&
        complaint.longitude != null &&
        !Number.isNaN(Number(complaint.latitude)) &&
        !Number.isNaN(Number(complaint.longitude))
    );

    if (validComplaints.length === 0) return;

    if (validComplaints.length === 1) {
      map.setView(
        [Number(validComplaints[0].latitude), Number(validComplaints[0].longitude)],
        14
      );
      return;
    }

    const bounds = validComplaints.map((c) => [
      Number(c.latitude),
      Number(c.longitude),
    ]);

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 15,
    });
  }, [complaints, map]);

  return null;
}

function AdminDashboard() {
  const navigate = useNavigate();

  // Authentication & User state
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  // Data states
  const [complaints, setComplaints] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [managedUsers, setManagedUsers] = useState([]);

  // Active navigation section
  const [activeNav, setActiveNav] = useState("dashboard"); // 'dashboard' | 'complaints' | 'map' | 'users' | 'workers' | 'departments' | 'analytics' | 'reports' | 'rewards' | 'announcements' | 'settings'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [analyticsPeriod, setAnalyticsPeriod] = useState("30");
  const [mapViewMode, setMapViewMode] = useState("markers"); // 'markers' | 'heatmap'

  // Loading & Alert states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Complaint Details & History State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Assignment & Status update form in Details
  const [detailSelectedWorker, setDetailSelectedWorker] = useState("");
  const [detailSelectedStatus, setDetailSelectedStatus] = useState("");
  const [detailRemarks, setDetailRemarks] = useState("");
  const [assigningId, setAssigningId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Worker Management & Add Worker Modal State
  const [managementSearch, setManagementSearch] = useState("");
  const [managementLoading, setManagementLoading] = useState(false);
  const [managementActionId, setManagementActionId] = useState(null);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [addingWorker, setAddingWorker] = useState(false);
  const [workerForm, setWorkerForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    department: "",
    specialization: "",
  });

  // ==========================================================
  // INITIAL AUTH
  // ==========================================================
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");

    if (!savedToken || !savedUser) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== "admin") {
        navigate("/login", { replace: true });
        return;
      }

      setToken(savedToken);
      setUser(parsedUser);
      loadDashboard(savedToken);
    } catch (err) {
      console.error("Admin auth error:", err);
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // ==========================================================
  // LOAD DASHBOARD DATA
  // ==========================================================
  const loadDashboard = async (authToken = token, isRefresh = false) => {
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

      const headers = {
        Authorization: `Bearer ${authToken}`,
      };

      const [complaintsRes, workersRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/complaints/`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/workers`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/users`, { headers }),
      ]);

      if (complaintsRes.data?.success) {
        setComplaints(complaintsRes.data.complaints || []);
      }
      if (workersRes.data?.success) {
        setWorkers(workersRes.data.workers || []);
      }
      if (usersRes.data?.success) {
        setManagedUsers(usersRes.data.users || []);
      }
    } catch (err) {
      console.error("Admin dashboard load error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }
      setError(err.response?.data?.detail || "Failed to load admin dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==========================================================
  // COMPLAINT DETAILS & HISTORY
  // ==========================================================
  const loadComplaintHistory = async (complaintId) => {
    if (!complaintId || !token) return;

    try {
      setHistoryLoading(true);
      setHistoryError("");
      setStatusHistory([]);

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/${complaintId}/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.success) {
        setStatusHistory(response.data.history || []);
      } else {
        setStatusHistory([]);
      }
    } catch (err) {
      console.error("Complaint history error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
        return;
      }
      setHistoryError(err.response?.data?.detail || "Failed to load complaint status history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openComplaint = async (complaint) => {
    setSelectedComplaint(complaint);
    setDetailSelectedWorker(complaint.assigned_worker_id || "");
    setDetailSelectedStatus(complaint.status || "Submitted");
    setDetailRemarks("");
    await loadComplaintHistory(complaint.id);
  };

  const closeComplaint = () => {
    setSelectedComplaint(null);
    setStatusHistory([]);
    setHistoryError("");
    setDetailRemarks("");
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  // ==========================================================
  // ACTIONS: ASSIGN, VERIFY, UPDATE STATUS
  // ==========================================================
  const assignWorker = async (complaintId, workerId) => {
    if (!workerId) return;

    try {
      setAssigningId(complaintId);
      setError("");
      setSuccess("");

      await axios.patch(
        `${API_BASE_URL}/api/admin/complaints/${complaintId}/assign`,
        { worker_id: workerId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setSuccess("Worker successfully assigned to complaint.");
      await loadDashboard(token, true);

      // Refresh currently selected complaint details
      const refreshed = await axios.get(`${API_BASE_URL}/api/complaints/${complaintId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshed.data?.success) {
        setSelectedComplaint(refreshed.data.complaint);
        setDetailSelectedWorker(refreshed.data.complaint.assigned_worker_id || "");
        setStatusHistory(refreshed.data.status_history || []);
      }
    } catch (err) {
      console.error("Assignment error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
        return;
      }
      setError(err.response?.data?.detail || "Failed to assign worker.");
    } finally {
      setAssigningId(null);
    }
  };

  const verifyComplaint = async (complaintId) => {
    try {
      setVerifyingId(complaintId);
      setError("");
      setSuccess("");

      await axios.patch(
        `${API_BASE_URL}/api/admin/complaints/${complaintId}/verify`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess("Complaint verified successfully.");
      await loadDashboard(token, true);

      const refreshed = await axios.get(`${API_BASE_URL}/api/complaints/${complaintId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshed.data?.success) {
        setSelectedComplaint(refreshed.data.complaint);
        setStatusHistory(refreshed.data.status_history || []);
      }
    } catch (err) {
      console.error("Verification error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
        return;
      }
      setError(err.response?.data?.detail || "Failed to verify complaint.");
    } finally {
      setVerifyingId(null);
    }
  };

  const updateComplaintStatusAndWorker = async () => {
    if (!selectedComplaint) return;
    const complaintId = selectedComplaint.id;

    try {
      setUpdatingStatusId(complaintId);
      setError("");
      setSuccess("");

      // 1. Assign worker if changed
      if (
        detailSelectedWorker &&
        detailSelectedWorker !== selectedComplaint.assigned_worker_id
      ) {
        await axios.patch(
          `${API_BASE_URL}/api/admin/complaints/${complaintId}/assign`,
          { worker_id: detailSelectedWorker },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // 2. Update status if changed or remarks provided
      if (
        (detailSelectedStatus && detailSelectedStatus !== selectedComplaint.status) ||
        detailRemarks.trim()
      ) {
        await axios.patch(
          `${API_BASE_URL}/api/complaints/${complaintId}/status`,
          {
            status: detailSelectedStatus || selectedComplaint.status,
            remarks: detailRemarks.trim() || `Status updated by Admin to ${detailSelectedStatus}.`,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      }

      setSuccess("Complaint details updated successfully.");
      setDetailRemarks("");
      await loadDashboard(token, true);

      const refreshed = await axios.get(`${API_BASE_URL}/api/complaints/${complaintId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshed.data?.success) {
        setSelectedComplaint(refreshed.data.complaint);
        setStatusHistory(refreshed.data.status_history || []);
      }
    } catch (err) {
      console.error("Update complaint error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
        return;
      }
      setError(err.response?.data?.detail || "Failed to update complaint details.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // ==========================================================
  // WORKER & USER MANAGEMENT OPERATIONS
  // ==========================================================
  const refreshManagement = async () => {
    if (!token) return;
    try {
      setManagementLoading(true);
      setError("");

      const headers = { Authorization: `Bearer ${token}` };
      const [workersRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/workers`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/users`, { headers }),
      ]);

      if (workersRes.data?.success) {
        setWorkers(workersRes.data.workers || []);
      }
      if (usersRes.data?.success) {
        setManagedUsers(usersRes.data.users || []);
      }
    } catch (err) {
      console.error("Management refresh error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
        return;
      }
      setError(err.response?.data?.detail || "Failed to refresh management data.");
    } finally {
      setManagementLoading(false);
    }
  };

  const toggleWorkerAvailability = async (worker) => {
    try {
      setManagementActionId(worker.id);
      setError("");
      setSuccess("");

      await axios.patch(
        `${API_BASE_URL}/api/admin/workers/${worker.id}/availability`,
        { is_available: !worker.is_available },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setSuccess(
        worker.is_available
          ? `Worker ${worker.worker_code} marked unavailable.`
          : `Worker ${worker.worker_code} marked available.`
      );
      await refreshManagement();
    } catch (err) {
      console.error("Worker availability error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
        return;
      }
      setError(err.response?.data?.detail || "Failed to update worker availability.");
    } finally {
      setManagementActionId(null);
    }
  };

  const toggleUserStatus = async (managedUser) => {
    if (managedUser.id === user?.id) {
      setError("You cannot deactivate your own admin account.");
      return;
    }

    const actionLabel = managedUser.is_active ? "deactivate" : "activate";
    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} ${managedUser.name || managedUser.email}?`
    );
    if (!confirmed) return;

    try {
      setManagementActionId(managedUser.id);
      setError("");
      setSuccess("");

      await axios.patch(
        `${API_BASE_URL}/api/admin/users/${managedUser.id}/status`,
        { is_active: !managedUser.is_active },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setSuccess(
        managedUser.is_active
          ? "User account deactivated."
          : "User account activated."
      );
      await refreshManagement();
    } catch (err) {
      console.error("User status error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
        return;
      }
      setError(err.response?.data?.detail || "Failed to update user status.");
    } finally {
      setManagementActionId(null);
    }
  };

  const createWorker = async (event) => {
    event.preventDefault();

    if (
      !workerForm.name.trim() ||
      !workerForm.email.trim() ||
      !workerForm.password ||
      !workerForm.department.trim()
    ) {
      setError("Name, email, password and department are required.");
      return;
    }

    if (workerForm.password.length < 8) {
      setError("Worker password must be at least 8 characters.");
      return;
    }

    try {
      setAddingWorker(true);
      setError("");
      setSuccess("");

      await axios.post(
        `${API_BASE_URL}/api/admin/workers`,
        {
          name: workerForm.name.trim(),
          email: workerForm.email.trim().toLowerCase(),
          phone: workerForm.phone.trim() || null,
          password: workerForm.password,
          worker_code: generateWorkerCode(),
          department: workerForm.department.trim(),
          specialization: workerForm.specialization.trim() || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setSuccess("Worker account created successfully.");
      setShowAddWorkerModal(false);
      setWorkerForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        department: "",
        specialization: "",
      });

      await refreshManagement();
      await loadDashboard(token, true);
    } catch (err) {
      console.error("Create worker error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
        return;
      }
      setError(err.response?.data?.detail || "Failed to create worker account.");
    } finally {
      setAddingWorker(false);
    }
  };

  // ==========================================================
  // STATISTICAL CALCULATIONS
  // ==========================================================
  const stats = useMemo(() => {
    const total = complaints.length;
    const submitted = complaints.filter((c) => c.status === "Submitted").length;
    const verified = complaints.filter((c) => c.status === "Verified").length;
    const assigned = complaints.filter((c) => c.status === "Assigned").length;
    const inProgress = complaints.filter((c) => c.status === "In Progress").length;
    const resolved = complaints.filter((c) => c.status === "Resolved").length;
    const rejected = complaints.filter((c) => c.status === "Rejected").length;
    const pending = submitted + verified + assigned; // Pending resolution / action

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const resolutionTimes = complaints
      .filter((c) => c.created_at && c.resolved_at)
      .map((c) => {
        const created = new Date(c.created_at).getTime();
        const resolvedAt = new Date(c.resolved_at).getTime();
        if (Number.isNaN(created) || Number.isNaN(resolvedAt) || resolvedAt < created) return null;
        return (resolvedAt - created) / (1000 * 60 * 60);
      })
      .filter((val) => val !== null);

    const averageResolutionHours =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, v) => sum + v, 0) / resolutionTimes.length
        : 0;

    return {
      total,
      submitted,
      verified,
      assigned,
      inProgress,
      resolved,
      rejected,
      pending,
      resolutionRate,
      averageResolutionHours,
      workersCount: workers.length,
    };
  }, [complaints, workers]);

  // Categories list & Chart Data
  const categoriesList = useMemo(() => {
    const set = new Set();
    complaints.forEach((c) => {
      if (c.categories?.name) set.add(c.categories.name);
    });
    return Array.from(set);
  }, [complaints]);

  const categoryChartData = useMemo(() => {
    const map = {};
    complaints.forEach((c) => {
      const cat = c.categories?.name || "General";
      map[cat] = (map[cat] || 0) + 1;
    });

    const total = complaints.length || 1;
    return Object.entries(map)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [complaints]);

  const statusChartData = useMemo(() => {
    return [
      { name: "Pending", value: stats.pending, color: "#ef4444" },
      { name: "In Progress", value: stats.inProgress, color: "#f59e0b" },
      { name: "Resolved", value: stats.resolved, color: "#10b981" },
    ].filter((item) => item.value > 0);
  }, [stats]);

  const timeChartData = useMemo(() => {
    // 7-day trend
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    complaints.forEach((c) => {
      if (c.created_at) {
        const d = new Date(c.created_at);
        if (!Number.isNaN(d.getTime())) {
          counts[d.getDay()] += 1;
        }
      }
    });

    return days.map((day, idx) => ({
      day,
      complaints: counts[idx],
    }));
  }, [complaints]);

  const workerWorkloadData = useMemo(() => {
    return workers
      .map((w) => {
        const assigned = complaints.filter((c) => c.assigned_worker_id === w.id).length;
        const resolved = complaints.filter(
          (c) => c.assigned_worker_id === w.id && c.status === "Resolved"
        ).length;
        return {
          name: w.users?.name || w.worker_code,
          assigned,
          resolved,
        };
      })
      .sort((a, b) => b.assigned - a.assigned);
  }, [workers, complaints]);

  // Filtered complaints list
  const filteredComplaints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complaints.filter((item) => {
      // Status filter
      if (statusFilter !== "All") {
        if (statusFilter === "Pending" && !["Submitted", "Verified", "Assigned"].includes(item.status)) return false;
        if (statusFilter === "In Progress" && item.status !== "In Progress") return false;
        if (statusFilter === "Resolved" && item.status !== "Resolved") return false;
        if (statusFilter === "Rejected" && item.status !== "Rejected") return false;
        if (!["Pending", "In Progress", "Resolved", "Rejected"].includes(statusFilter) && item.status !== statusFilter) return false;
      }

      // Category filter
      if (categoryFilter !== "All" && item.categories?.name !== categoryFilter) {
        return false;
      }

      // Search keyword
      if (q) {
        const title = (item.title || "").toLowerCase();
        const code = (item.complaint_code || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const address = (item.address || "").toLowerCase();
        const cat = (item.categories?.name || "").toLowerCase();
        const citizen = (item.citizen_id || "").toLowerCase();
        return (
          title.includes(q) ||
          code.includes(q) ||
          desc.includes(q) ||
          address.includes(q) ||
          cat.includes(q) ||
          citizen.includes(q)
        );
      }

      return true;
    });
  }, [complaints, search, statusFilter, categoryFilter]);

  // Map complaints with coordinates
  const mapComplaints = useMemo(() => {
    return filteredComplaints.filter(
      (c) =>
        c.latitude != null &&
        c.longitude != null &&
        !Number.isNaN(Number(c.latitude)) &&
        !Number.isNaN(Number(c.longitude))
    );
  }, [filteredComplaints]);

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    const q = managementSearch.trim().toLowerCase();
    if (!q) return workers;
    return workers.filter((w) =>
      [w.worker_code, w.department, w.specialization, w.users?.name, w.users?.email]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [workers, managementSearch]);

  // Filtered citizens/users list
  const filteredUsers = useMemo(() => {
    const q = managementSearch.trim().toLowerCase();
    if (!q) return managedUsers;
    return managedUsers.filter((u) =>
      [u.name, u.email, u.phone, u.role]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [managedUsers, managementSearch]);

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

  const getWorkerDisplayName = (complaint) => {
    if (complaint.workers?.users?.name) return complaint.workers.users.name;
    if (complaint.workers?.worker_code) return complaint.workers.worker_code;
    return "Unassigned";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Submitted":
      case "Pending":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Pending
          </span>
        );
      case "Verified":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Verified
          </span>
        );
      case "Assigned":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Assigned
          </span>
        );
      case "In Progress":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            In Progress
          </span>
        );
      case "Resolved":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Resolved
          </span>
        );
      case "Rejected":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getCategoryColor = (index) => {
    const colors = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b"];
    return colors[index % colors.length];
  };

  const navMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "complaints", label: "Complaints", icon: ClipboardList },
    { id: "map", label: "Map View", icon: MapPin },
    { id: "users", label: "Users", icon: Users },
    { id: "workers", label: "Workers", icon: Wrench },
    { id: "departments", label: "Departments", icon: Building2 },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "rewards", label: "Rewards", icon: Award },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 relative">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white">Loading Smart City Admin...</h2>
          <p className="text-sm text-slate-400 mt-1">Connecting to municipal control console</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="flex-1 flex overflow-hidden">
        {/* ============================================================ */}
        {/* 1. DARK NAVY SIDEBAR (Matches Reference Screen 2 & 3) */}
        {/* ============================================================ */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0e1726] text-white flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
        >
          {/* Logo Brand Header */}
          <div className="p-5 flex items-center justify-between border-b border-white/10">
            <div
              onClick={() => {
                setActiveNav("dashboard");
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <img
                src={smartCityLogo}
                alt="Smart City Logo"
                className="h-9 w-auto object-contain shrink-0"
              />
              <div className="leading-tight">
                <span className="font-extrabold text-sm tracking-tight text-white uppercase block">
                  SMART CITY
                </span>
                <span className="text-[11px] font-semibold text-blue-400 tracking-wide block">
                  Complaint Portal
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items List */}
          <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
            {navMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === "complaints" && stats.pending > 0 && (
                    <span className="bg-rose-500/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {stats.pending}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer User Info */}
          <div className="p-4 border-t border-white/10 bg-black/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                A
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {user?.name || "Administrator"}
                </p>
                <p className="text-[11px] text-slate-400 truncate">Municipal Control</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          />
        )}

        {/* ============================================================ */}
        {/* 2. MAIN CONTENT AREA */}
        {/* ============================================================ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* TOP HEADER (Matches Screen 2: Clean White with Search & Admin Avatar) */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
            <div className="px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-lg min-w-0">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 shrink-0"
                  aria-label="Toggle Navigation"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Global Search Bar */}
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search complaints, users..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Notifications + Admin Profile Dropdown */}
              <div className="flex items-center gap-3">
                <NotificationBell />

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-100 transition border border-slate-200"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#0e1726] text-white font-bold text-xs flex items-center justify-center">
                      A
                    </div>
                    <span className="hidden sm:block text-xs font-bold text-slate-800">
                      Admin
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                        userMenuOpen ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-3 border-b border-slate-100 bg-slate-50/50 rounded-xl mb-1">
                        <p className="font-bold text-xs text-slate-900">{user?.name || "Administrator"}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                        <span className="mt-1.5 inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                          Super Administrator
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          loadDashboard(token, true);
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                      >
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                        Refresh Data
                      </button>

                      <button
                        onClick={() => {
                          setActiveNav("settings");
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                      >
                        <Settings className="w-4 h-4 text-slate-500" />
                        System Settings
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
          </header>

          {/* MAIN CONTAINER */}
          <main className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* System Alerts */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-bold">Error Notice</p>
                  <p className="text-rose-700 mt-0.5">{error}</p>
                </div>
                <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-bold">Success</p>
                  <p className="text-emerald-700 mt-0.5">{success}</p>
                </div>
                <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ============================================================ */}
            {/* VIEW 1: DASHBOARD OVERVIEW (Matches Screen 2) */}
            {/* ============================================================ */}
            {activeNav === "dashboard" && (
              <div className="space-y-6">
                {/* Header Title + Period Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Overview of complaints and city management
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={analyticsPeriod}
                      onChange={(e) => setAnalyticsPeriod(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="7">Last 7 Days</option>
                      <option value="30">Last 30 Days</option>
                      <option value="90">Last 90 Days</option>
                      <option value="all">All Time</option>
                    </select>

                    <button
                      onClick={() => loadDashboard(token, true)}
                      disabled={refreshing}
                      className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-2xs"
                      title="Refresh Live Data"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* 4 Top Stat Cards (Matches Screen 2: Total Complaints, In Progress, Resolved, Pending) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Total Complaints */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" /> ↑ 12%
                      </span>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900 mt-3">{stats.total}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Total Complaints</p>
                  </div>

                  {/* Card 2: In Progress */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock3 className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" /> ↑ 5%
                      </span>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900 mt-3">{stats.inProgress}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">In Progress</p>
                  </div>

                  {/* Card 3: Resolved */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" /> ↑ 18%
                      </span>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900 mt-3">{stats.resolved}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Resolved</p>
                  </div>

                  {/* Card 4: Pending */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        ↓ 8%
                      </span>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900 mt-3">{stats.pending}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Pending Action</p>
                  </div>
                </div>

                {/* 2 Analytics Charts Row: Complaints by Category & Complaints Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Chart 1: Complaints by Category (Donut + Legend) */}
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
                    <h3 className="font-extrabold text-base text-slate-900">Complaints by Category</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Category share of total submissions</p>

                    <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryChartData}
                              dataKey="count"
                              nameKey="name"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={3}
                            >
                              {categoryChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getCategoryColor(index)} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-extrabold text-slate-900">{stats.total}</span>
                          <span className="text-[11px] font-bold text-slate-400">Total</span>
                        </div>
                      </div>

                      {/* Legend List */}
                      <div className="flex-1 space-y-2.5 w-full">
                        {categoryChartData.slice(0, 6).map((item, idx) => (
                          <div key={item.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: getCategoryColor(idx) }}
                              />
                              <span className="font-semibold text-slate-700">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900">{item.count}</span>
                              <span className="text-slate-400 ml-1">({item.percentage}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Chart 2: Complaints Trend (Bar Chart) */}
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900">Complaints Trend</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Weekly volume distribution</p>
                      </div>
                    </div>

                    <div className="h-56 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={timeChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="complaints" fill="#2563eb" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Recent Complaints Section (Matches Screen 2 Table) */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                        Recent Complaints
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Latest municipal issues submitted by citizens
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveNav("complaints")}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                    >
                      View All
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                  {complaints.length === 0 ? (
                    <div className="py-12 text-center">
                      <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">No complaints reported yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="py-3 px-3">ID</th>
                            <th className="py-3 px-3">Title</th>
                            <th className="py-3 px-3">Category</th>
                            <th className="py-3 px-3">Location</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3">Date</th>
                            <th className="py-3 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {complaints.slice(0, 6).map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3.5 px-3 font-mono font-bold text-blue-600">
                                {item.complaint_code || item.id.slice(0, 8)}
                              </td>
                              <td className="py-3.5 px-3 font-semibold text-slate-900 max-w-[200px] truncate">
                                {item.title}
                              </td>
                              <td className="py-3.5 px-3 text-slate-600">
                                {item.categories?.name || "General"}
                              </td>
                              <td className="py-3.5 px-3 text-slate-500 max-w-[150px] truncate">
                                {item.address || "Sector area"}
                              </td>
                              <td className="py-3.5 px-3">
                                {getStatusBadge(item.status)}
                              </td>
                              <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                                {formatDate(item.created_at)}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                <button
                                  onClick={() => openComplaint(item)}
                                  className="text-blue-600 hover:text-blue-800 font-bold text-xs"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* VIEW 2: COMPLAINTS MANAGEMENT (Matches Screen 3) */}
            {/* ============================================================ */}
            {activeNav === "complaints" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">All Complaints</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      View, filter and manage all citizen complaints across the city.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadDashboard(token, true)}
                      className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Filter Tabs: All, Pending, In Progress, Resolved (Screen 3) */}
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
                    Pending ({stats.pending})
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
                    onClick={() => setStatusFilter("Resolved")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
                      statusFilter === "Resolved"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                    }`}
                  >
                    Resolved ({stats.resolved})
                  </button>
                </div>

                {/* Search & Filter Controls (Screen 3) */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search complaints..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-2xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs"
                  >
                    <option value="All">All Categories</option>
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs"
                  >
                    <option value="All">All Status</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Verified">Verified</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Complaints Table (Screen 3) */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs overflow-hidden">
                  {filteredComplaints.length === 0 ? (
                    <div className="py-16 text-center">
                      <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="font-bold text-slate-800 text-sm">No complaints match your criteria</p>
                      <p className="text-xs text-slate-500 mt-1">Try resetting search keywords or category filters.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead>
                          <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="py-3 px-3">ID</th>
                            <th className="py-3 px-3">Title</th>
                            <th className="py-3 px-3">Category</th>
                            <th className="py-3 px-3">Location</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3">Assigned To</th>
                            <th className="py-3 px-3">Date</th>
                            <th className="py-3 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredComplaints.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3.5 px-3 font-mono font-bold text-blue-600">
                                #{item.complaint_code || item.id.slice(0, 8)}
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.photo_url || getFallbackImage(item.categories?.name, item.title)}
                                    alt=""
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                                  />
                                  <div className="min-w-0 max-w-[200px]">
                                    <p className="font-bold text-slate-900 truncate">{item.title}</p>
                                    <p className="text-[11px] text-slate-400 truncate">{item.description}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-3 text-slate-700 font-medium">
                                {item.categories?.name || "General"}
                              </td>
                              <td className="py-3.5 px-3 text-slate-500 max-w-[150px] truncate">
                                {item.address || "Sector Area"}
                              </td>
                              <td className="py-3.5 px-3">
                                {getStatusBadge(item.status)}
                              </td>
                              <td className="py-3.5 px-3 font-medium text-slate-700">
                                {getWorkerDisplayName(item)}
                              </td>
                              <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                                {formatDate(item.created_at)}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {!item.verified_at && (
                                    <button
                                      onClick={() => verifyComplaint(item.id)}
                                      disabled={verifyingId === item.id}
                                      className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-bold text-[11px] border border-purple-200 transition"
                                    >
                                      {verifyingId === item.id ? "..." : "Verify"}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openComplaint(item)}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* VIEW 3: COMPLAINTS MAP (Matches Screen 5) */}
            {/* ============================================================ */}
            {activeNav === "map" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Complaints Map</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      View all live complaints distributed geographically on the city map.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs"
                    >
                      <option value="All">All Categories</option>
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs"
                    >
                      <option value="All">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                {/* Map Card */}
                <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs relative">
                  <div className="h-[360px] sm:h-[520px] w-full relative z-10">
                    {mapComplaints.length > 0 ? (
                      <MapContainer
                        center={[Number(mapComplaints[0].latitude), Number(mapComplaints[0].longitude)]}
                        zoom={12}
                        scrollWheelZoom={true}
                        className="h-full w-full"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapBoundsController complaints={mapComplaints} />

                        {mapComplaints.map((item) => {
                          const markerColor =
                            item.status === "Resolved"
                              ? "#10b981"
                              : item.status === "In Progress"
                              ? "#f59e0b"
                              : "#ef4444";

                          return (
                            <CircleMarker
                              key={item.id}
                              center={[Number(item.latitude), Number(item.longitude)]}
                              radius={9}
                              pathOptions={{
                                color: "#ffffff",
                                weight: 2.5,
                                fillColor: markerColor,
                                fillOpacity: 0.9,
                              }}
                            >
                              <Popup>
                                <div className="p-1 text-xs max-w-[220px]">
                                  <span className="font-mono font-bold text-blue-600 text-[10px]">
                                    #{item.complaint_code || item.id.slice(0, 8)}
                                  </span>
                                  <p className="font-bold text-slate-900 mt-0.5">{item.title}</p>
                                  <p className="text-slate-500 text-[11px] mt-1 line-clamp-2">
                                    {item.description}
                                  </p>
                                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                                    <span className="font-semibold text-slate-700">{item.status}</span>
                                    <button
                                      onClick={() => openComplaint(item)}
                                      className="text-blue-600 font-bold hover:underline"
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
                          <p className="font-bold text-slate-800 text-sm">No Geolocation Pins</p>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm">
                            Complaints matching the selected filter currently lack GPS coordinates.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Map Legend (Screen 5) */}
                  <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Pending
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> In Progress
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Resolved
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* VIEW 4: WORKERS MANAGEMENT (Matches Screen 6) */}
            {/* ============================================================ */}
            {activeNav === "workers" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Workers</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Manage city workers and their field assignments.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddWorkerModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add Worker
                    </button>
                    <button
                      onClick={refreshManagement}
                      disabled={managementLoading}
                      className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-2xs"
                    >
                      <RefreshCw className={`w-4 h-4 ${managementLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Workers Table (Screen 6) */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs overflow-hidden">
                  <div className="mb-4 max-w-sm">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={managementSearch}
                        onChange={(e) => setManagementSearch(e.target.value)}
                        placeholder="Search workers by name or code..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {filteredWorkers.length === 0 ? (
                    <div className="py-14 text-center">
                      <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-800 text-sm">No workers found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[750px]">
                        <thead>
                          <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="py-3 px-3">Name</th>
                            <th className="py-3 px-3">Department</th>
                            <th className="py-3 px-3">Assigned</th>
                            <th className="py-3 px-3">Completed</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredWorkers.map((w, idx) => {
                            const assignedCount = complaints.filter((c) => c.assigned_worker_id === w.id).length;
                            const completedCount = complaints.filter(
                              (c) => c.assigned_worker_id === w.id && c.status === "Resolved"
                            ).length;
                            const isAvail = w.is_available && w.users?.is_active !== false;

                            // Initials for avatar
                            const initials = (w.users?.name || "Worker")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase();

                            return (
                              <tr key={w.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-3.5 px-3">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0"
                                      style={{ backgroundColor: getCategoryColor(idx) }}
                                    >
                                      {initials}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900">{w.users?.name || "Worker"}</p>
                                      <p className="text-[11px] font-mono text-slate-400">{w.worker_code}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 font-medium text-slate-700">
                                  {w.department || "Public Works"}
                                </td>
                                <td className="py-3.5 px-3 font-bold text-slate-900">
                                  {assignedCount}
                                </td>
                                <td className="py-3.5 px-3 font-bold text-emerald-600">
                                  {completedCount}
                                </td>
                                <td className="py-3.5 px-3">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                      isAvail
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                    }`}
                                  >
                                    {isAvail ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-right">
                                  <button
                                    onClick={() => toggleWorkerAvailability(w)}
                                    disabled={managementActionId === w.id}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                                      w.is_available
                                        ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    }`}
                                  >
                                    {managementActionId === w.id
                                      ? "..."
                                      : w.is_available
                                      ? "Set Unavailable"
                                      : "Set Available"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* VIEW 5: USERS MANAGEMENT (Matches Screen 8) */}
            {/* ============================================================ */}
            {activeNav === "users" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Citizens & Users</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Manage registered citizens and portal user accounts.
                    </p>
                  </div>
                  <button
                    onClick={refreshManagement}
                    disabled={managementLoading}
                    className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${managementLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs overflow-hidden">
                  <div className="mb-4 max-w-sm">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={managementSearch}
                        onChange={(e) => setManagementSearch(e.target.value)}
                        placeholder="Search citizens by name, email..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="py-14 text-center">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-800 text-sm">No citizens found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="py-3 px-3">Name</th>
                            <th className="py-3 px-3">Email</th>
                            <th className="py-3 px-3">Role</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredUsers.map((u, idx) => {
                            const isSelf = u.id === user?.id;
                            const initials = (u.name || "User")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase();

                            return (
                              <tr key={u.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-3.5 px-3">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0"
                                      style={{ backgroundColor: getCategoryColor(idx + 2) }}
                                    >
                                      {initials}
                                    </div>
                                    <span className="font-bold text-slate-900">{u.name || "Citizen"}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 text-slate-600">{u.email}</td>
                                <td className="py-3.5 px-3 capitalize font-medium text-slate-700">{u.role}</td>
                                <td className="py-3.5 px-3">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                      u.is_active
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                    }`}
                                  >
                                    {u.is_active ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-right">
                                  <button
                                    onClick={() => toggleUserStatus(u)}
                                    disabled={managementActionId === u.id || isSelf}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition border disabled:opacity-40 ${
                                      u.is_active
                                        ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    }`}
                                  >
                                    {managementActionId === u.id
                                      ? "..."
                                      : u.is_active
                                      ? "Deactivate"
                                      : "Activate"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* VIEW 6: ANALYTICS & REPORTS (Matches Screen 7) */}
            {/* ============================================================ */}
            {(activeNav === "analytics" || activeNav === "reports") && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Analytics & Reports</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Comprehensive resolution breakdown and workload metrics.
                    </p>
                  </div>

                  <select
                    value={analyticsPeriod}
                    onChange={(e) => setAnalyticsPeriod(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="all">All Available Data</option>
                  </select>
                </div>

                {/* Key KPIs Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Resolution Rate
                    </p>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-2">
                      {stats.resolutionRate}%
                    </p>
                    <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${stats.resolutionRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Avg Resolution Time
                    </p>
                    <p className="text-3xl font-extrabold text-blue-600 mt-2">
                      {stats.averageResolutionHours > 0
                        ? `${stats.averageResolutionHours.toFixed(1)} hrs`
                        : "N/A"}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Calculated from resolved reports</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Active Field Force
                    </p>
                    <p className="text-3xl font-extrabold text-purple-600 mt-2">
                      {stats.workersCount} Workers
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Assigned across municipal sectors</p>
                  </div>
                </div>

                {/* Charts Row: Complaints by Category & Status Distribution (Matches Screen 7) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Category Bar Chart */}
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
                    <h3 className="font-extrabold text-base text-slate-900">Complaints by Category</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Total counts by municipal department</p>
                    <div className="h-64 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                            {categoryChartData.map((entry, index) => (
                              <Cell key={`bar-${index}`} fill={getCategoryColor(index)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Status Distribution (Donut Chart) */}
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
                    <h3 className="font-extrabold text-base text-slate-900">Status Distribution</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Lifecycle distribution metrics</p>
                    <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
                      <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusChartData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={4}
                            >
                              {statusChartData.map((entry, index) => (
                                <Cell key={`status-pie-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-extrabold text-slate-900">{stats.total}</span>
                          <span className="text-[11px] font-bold text-slate-400">Total</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-3 w-full">
                        {statusChartData.map((item) => {
                          const pct = stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0;
                          return (
                            <div key={item.name} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="font-semibold text-slate-700">{item.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-900">{item.value}</span>
                                <span className="text-slate-400 ml-1">({pct}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Worker Workload Breakdown */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
                  <h3 className="font-extrabold text-base text-slate-900">Worker Workload Overview</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Assigned vs Resolved complaints per worker</p>
                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={workerWorkloadData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="assigned" name="Assigned" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* VIEW 7: DEPARTMENTS, REWARDS, ANNOUNCEMENTS, SETTINGS */}
            {/* ============================================================ */}
            {activeNav === "departments" && (
              <div className="space-y-6">
                <h1 className="text-2xl font-extrabold text-slate-900">Municipal Departments</h1>
                <p className="text-xs sm:text-sm text-slate-500 -mt-4">
                  Active municipal service departments managing public works and civic amenities.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[
                    "Roads & Transport",
                    "Water Supply",
                    "Waste Management & Sanitation",
                    "Electricity & Public Lighting",
                    "Parks & Gardens",
                    "Health & Public Safety",
                  ].map((dept, idx) => (
                    <div key={dept} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-sm">{dept}</h3>
                      <p className="text-xs text-slate-500 mt-1">Official Municipal Division</p>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-400">Workers Assigned</span>
                        <span className="text-blue-600 font-bold">
                          {workers.filter((w) => w.department?.toLowerCase().includes(dept.toLowerCase().split(" ")[0])).length || 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeNav === "rewards" && (
              <div className="space-y-6">
                <h1 className="text-2xl font-extrabold text-slate-900">Citizen Rewards & Badges</h1>
                <p className="text-xs sm:text-sm text-slate-500 -mt-4">
                  Civic engagement gamification system rewarding active citizens.
                </p>
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-sm">
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Civic Hero Badges Active</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Citizens automatically earn points for verified reports.</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                    Integrated with Citizen Dashboard reward tiers: Neighborhood Guardian, First Responder, and Clean City Champion.
                  </p>
                </div>
              </div>
            )}

            {activeNav === "announcements" && (
              <div className="space-y-6">
                <h1 className="text-2xl font-extrabold text-slate-900">Public Announcements</h1>
                <p className="text-xs sm:text-sm text-slate-500 -mt-4">
                  Broadcast notices and public alerts to citizens.
                </p>
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-sm">
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Megaphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Broadcast Dispatch Console</h3>
                      <p className="text-xs text-slate-500 mt-0.5">System notification feed connected to real-time mobile app.</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-4">
                    All notifications dispatched automatically alert citizens when status updates occur on their registered reports.
                  </p>
                </div>
              </div>
            )}

            {activeNav === "settings" && (
              <div className="space-y-6">
                <h1 className="text-2xl font-extrabold text-slate-900">Portal Settings</h1>
                <p className="text-xs sm:text-sm text-slate-500 -mt-4">
                  Configure administrative parameters and security preferences.
                </p>
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">Backend Server API</p>
                      <p className="text-slate-400 font-mono mt-0.5">{API_BASE_URL}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full">
                      Online & Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">Admin Account</p>
                      <p className="text-slate-500 mt-0.5">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 font-bold rounded-lg border border-rose-200 hover:bg-rose-100"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. COMPLAINT DETAILS VIEW / MODAL (Matches Screen 4) */}
      {/* ============================================================ */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-xs animate-in fade-in duration-150"
          onClick={closeComplaint}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Back button + Code (Screen 4) */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <button
                onClick={closeComplaint}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
              >
                ← Back to Complaints
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-400">
                  #{selectedComplaint.complaint_code || selectedComplaint.id}
                </span>
                <button
                  onClick={closeComplaint}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Title, Badge & Location Row (Screen 4) */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900">{selectedComplaint.title}</h2>
                  {getStatusBadge(selectedComplaint.status)}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-1.5">
                  <span className="font-semibold text-slate-700">
                    {selectedComplaint.categories?.name || "General"}
                  </span>
                  •
                  <span>{selectedComplaint.address || "Sector field location"}</span>
                  •
                  <span>{formatDate(selectedComplaint.created_at)}</span>
                </p>
              </div>

              {/* Main Content Layout (Screen 4: Left photo + Right Info box) */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Photo & Description (3 cols) */}
                <div className="md:col-span-3 space-y-4">
                  <img
                    src={
                      selectedComplaint.photo_url ||
                      getFallbackImage(selectedComplaint.categories?.name, selectedComplaint.title)
                    }
                    alt={selectedComplaint.title}
                    className="w-full h-56 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                  />

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Description
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                      {selectedComplaint.description}
                    </p>
                  </div>
                </div>

                {/* Complaint Info Box (2 cols, Screen 4) */}
                <div className="md:col-span-2 space-y-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-3.5">
                    <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2">
                      Complaint Info
                    </h4>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Citizen ID</span>
                      <span className="font-bold text-slate-800 font-mono mt-0.5 block truncate">
                        {selectedComplaint.citizen_id || "Verified Resident"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Category</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        {selectedComplaint.categories?.name || "Civic Amenity"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Priority</span>
                      <span className="font-bold text-rose-600 mt-0.5 block">
                        {selectedComplaint.priority || "Normal"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Location</span>
                      <span className="font-medium text-slate-700 mt-0.5 block">
                        {selectedComplaint.address || "Sector Coordinates"}
                      </span>
                      {selectedComplaint.latitude && selectedComplaint.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${selectedComplaint.latitude},${selectedComplaint.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-blue-600 hover:underline mt-1 block"
                        >
                          View in Google Maps →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Box: Assign to Worker & Status Update (Screen 4) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-sm text-slate-900">Action & Assignment Controls</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Assign to Worker
                    </label>
                    <select
                      value={detailSelectedWorker}
                      onChange={(e) => setDetailSelectedWorker(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Worker</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.worker_code} - {w.users?.name || "Worker"} ({w.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Complaint Status
                    </label>
                    <select
                      value={detailSelectedStatus}
                      onChange={(e) => setDetailSelectedStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Verified">Verified</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Update Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={detailRemarks}
                    onChange={(e) => setDetailRemarks(e.target.value)}
                    placeholder="Provide admin remarks or instruction for the field worker..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  {!selectedComplaint.verified_at ? (
                    <button
                      onClick={() => verifyComplaint(selectedComplaint.id)}
                      disabled={verifyingId === selectedComplaint.id}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {verifyingId === selectedComplaint.id ? "Verifying..." : "Verify Complaint"}
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified by Admin
                    </span>
                  )}

                  <button
                    onClick={updateComplaintStatusAndWorker}
                    disabled={updatingStatusId === selectedComplaint.id}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        updatingStatusId === selectedComplaint.id ? "animate-spin" : ""
                      }`}
                    />
                    Update Changes
                  </button>
                </div>
              </div>

              {/* Status History / Lifecycle Audit Trail */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Status History & Audit Trail
                  </h4>
                  <button
                    onClick={() => loadComplaintHistory(selectedComplaint.id)}
                    disabled={historyLoading}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${historyLoading ? "animate-spin" : ""}`} />
                    Refresh Trail
                  </button>
                </div>

                {historyLoading ? (
                  <p className="text-xs text-slate-400 py-3">Loading history...</p>
                ) : statusHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No previous status updates recorded.</p>
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
                            Changed by: {item.changed_by || "System"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={closeComplaint}
                className="px-5 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. ADD WORKER MODAL (Preserved Existing Functionality) */}
      {/* ============================================================ */}
      {showAddWorkerModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => !addingWorker && setShowAddWorkerModal(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add New Worker</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create a municipal field worker profile and credentials.
                </p>
              </div>
              <button
                onClick={() => !addingWorker && setShowAddWorkerModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={createWorker} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={workerForm.name}
                    onChange={(e) =>
                      setWorkerForm((cur) => ({ ...cur, name: e.target.value }))
                    }
                    placeholder="e.g. Ramesh Patil"
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={workerForm.email}
                    onChange={(e) =>
                      setWorkerForm((cur) => ({ ...cur, email: e.target.value }))
                    }
                    placeholder="worker@smartcity.local"
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={workerForm.phone}
                    onChange={(e) =>
                      setWorkerForm((cur) => ({ ...cur, phone: e.target.value }))
                    }
                    placeholder="9876543210"
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={workerForm.password}
                    onChange={(e) =>
                      setWorkerForm((cur) => ({ ...cur, password: e.target.value }))
                    }
                    placeholder="Min 8 characters"
                    minLength={8}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={workerForm.department}
                    onChange={(e) =>
                      setWorkerForm((cur) => ({ ...cur, department: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select department</option>
                    <option value="Public Works">Public Works</option>
                    <option value="Water Supply">Water Supply</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Roads & Transport">Roads & Transport</option>
                    <option value="Waste Management">Waste Management</option>
                    <option value="Sanitation">Sanitation</option>
                    <option value="Parks & Gardens">Parks & Gardens</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={workerForm.specialization}
                    onChange={(e) =>
                      setWorkerForm((cur) => ({ ...cur, specialization: e.target.value }))
                    }
                    placeholder="e.g. Pipeline Repair"
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  disabled={addingWorker}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingWorker}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5"
                >
                  {addingWorker ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Create Worker
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;