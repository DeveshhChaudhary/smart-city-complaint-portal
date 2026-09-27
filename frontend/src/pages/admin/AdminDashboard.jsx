import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  BarChart3,
  Ban,
  CheckCircle2,
  UserCheck,
  UserX,
  Clock3,
  Target,
  TrendingUp,
  AlertTriangle,
  Eye,
  LogOut,
  MapPinned,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UserPlus,
  Users,
  Wrench,
  X,
  LayoutDashboard,
  ClipboardList,
  UsersRound,
  Map,
  ChevronRight,
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

const API_BASE_URL = "https://smart-city-complaint-portal-krs3.onrender.com";
const generateWorkerCode = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `WRK-${timestamp}${random}`;
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

    if (validComplaints.length === 0) {
      return;
    }

    if (validComplaints.length === 1) {
      map.setView(
        [
          Number(validComplaints[0].latitude),
          Number(validComplaints[0].longitude),
        ],
        14
      );
      return;
    }

    const bounds = validComplaints.map((complaint) => [
      Number(complaint.latitude),
      Number(complaint.longitude),
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

  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  const [complaints, setComplaints] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [managedUsers, setManagedUsers] = useState([]);
  const [managementTab, setManagementTab] = useState("workers");
  const [managementSearch, setManagementSearch] = useState("");
  const [managementLoading, setManagementLoading] = useState(false);
  const [managementActionId, setManagementActionId] = useState(null);
  const [activeNav, setActiveNav] = useState("overview");

  // Add worker form
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedComplaint, setSelectedComplaint] =
    useState(null);

  const [statusHistory, setStatusHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [assigningId, setAssigningId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  // Advanced analytics period: 7, 30, 90 days or all available data.
  const [analyticsPeriod, setAnalyticsPeriod] = useState("30");
  const [mapViewMode, setMapViewMode] = useState("markers");

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
    } catch (error) {
      console.error("Admin auth error:", error);

      localStorage.removeItem("access_token");
      localStorage.removeItem("user");

      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard = async (
    authToken,
    isRefresh = false
  ) => {
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
      setSuccess("");

      const headers = {
        Authorization: `Bearer ${authToken}`,
      };

      const [
        complaintsResponse,
        workersResponse,
        usersResponse,
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/complaints/`, {
          headers,
        }),
        axios.get(`${API_BASE_URL}/api/admin/workers`, {
          headers,
        }),
        axios.get(`${API_BASE_URL}/api/admin/users`, {
          headers,
        }),
      ]);

      if (complaintsResponse.data?.success) {
        setComplaints(
          complaintsResponse.data.complaints || []
        );
      }

      if (workersResponse.data?.success) {
        setWorkers(
          workersResponse.data.workers || []
        );
      }

      if (usersResponse.data?.success) {
        setManagedUsers(
          usersResponse.data.users || []
        );
      }
    } catch (error) {
      console.error("Admin dashboard error:", error);

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        navigate("/login", { replace: true });
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Failed to load admin dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==========================================================
  // LOAD COMPLAINT HISTORY
  // ==========================================================

  const loadComplaintHistory = async (complaintId) => {
    if (!complaintId || !token) {
      return;
    }

    try {
      setHistoryLoading(true);
      setHistoryError("");
      setStatusHistory([]);

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/${complaintId}/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        setStatusHistory(
          response.data.history || []
        );
      } else {
        setStatusHistory([]);
      }
    } catch (error) {
      console.error(
        "Complaint history error:",
        error
      );

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        navigate("/login", { replace: true });
        return;
      }

      setHistoryError(
        error.response?.data?.detail ||
          "Failed to load complaint status history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // ==========================================================
  // OPEN COMPLAINT
  // ==========================================================

  const openComplaint = async (complaint) => {
    setSelectedComplaint(complaint);
    await loadComplaintHistory(complaint.id);
  };

  // ==========================================================
  // CLOSE COMPLAINT
  // ==========================================================

  const closeComplaint = () => {
    setSelectedComplaint(null);
    setStatusHistory([]);
    setHistoryError("");
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/login", { replace: true });
  };

  // ==========================================================
  // ASSIGN WORKER
  // ==========================================================

  const assignWorker = async (
    complaintId,
    workerId
  ) => {
    if (!workerId) {
      return;
    }

    try {
      setAssigningId(complaintId);
      setError("");
      setSuccess("");

      await axios.patch(
        `${API_BASE_URL}/api/admin/complaints/${complaintId}/assign`,
        {
          worker_id: workerId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setSuccess(
        "Complaint assigned successfully."
      );

      await loadDashboard(token, true);

      const refreshedComplaintResponse =
        await axios.get(
          `${API_BASE_URL}/api/complaints/${complaintId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      if (
        refreshedComplaintResponse.data?.success
      ) {
        const refreshedComplaint =
          refreshedComplaintResponse.data.complaint;

        setSelectedComplaint(
          refreshedComplaint
        );

        if (
          Array.isArray(
            refreshedComplaintResponse.data
              .status_history
          )
        ) {
          setStatusHistory(
            refreshedComplaintResponse.data
              .status_history
          );
        } else {
          await loadComplaintHistory(
            complaintId
          );
        }
      } else {
        await loadComplaintHistory(
          complaintId
        );
      }
    } catch (error) {
      console.error(
        "Assignment error:",
        error
      );

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        navigate("/login", { replace: true });
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Failed to assign worker."
      );
    } finally {
      setAssigningId(null);
    }
  };

  // ==========================================================
  // VERIFY COMPLAINT
  // ==========================================================

  const verifyComplaint = async (
    complaintId
  ) => {
    try {
      setVerifyingId(complaintId);
      setError("");
      setSuccess("");

      await axios.patch(
        `${API_BASE_URL}/api/admin/complaints/${complaintId}/verify`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess(
        "Complaint verified successfully."
      );

      await loadDashboard(token, true);

      const refreshedComplaintResponse =
        await axios.get(
          `${API_BASE_URL}/api/complaints/${complaintId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      if (
        refreshedComplaintResponse.data?.success
      ) {
        setSelectedComplaint(
          refreshedComplaintResponse.data.complaint
        );

        if (
          Array.isArray(
            refreshedComplaintResponse.data
              .status_history
          )
        ) {
          setStatusHistory(
            refreshedComplaintResponse.data
              .status_history
          );
        } else {
          await loadComplaintHistory(
            complaintId
          );
        }
      }
    } catch (error) {
      console.error(
        "Verification error:",
        error
      );

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        navigate("/login", { replace: true });
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Failed to verify complaint."
      );
    } finally {
      setVerifyingId(null);
    }
  };

  // ==========================================================
  // ADMIN MANAGEMENT
  // ==========================================================

  const refreshManagement = async () => {
    if (!token) {
      return;
    }

    try {
      setManagementLoading(true);
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [workersResponse, usersResponse] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/api/admin/workers`, {
            headers,
          }),
          axios.get(`${API_BASE_URL}/api/admin/users`, {
            headers,
          }),
        ]);

      if (workersResponse.data?.success) {
        setWorkers(
          workersResponse.data.workers || []
        );
      }

      if (usersResponse.data?.success) {
        setManagedUsers(
          usersResponse.data.users || []
        );
      }
    } catch (error) {
      console.error(
        "Management refresh error:",
        error
      );

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        handleLogout();
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Failed to refresh management data."
      );
    } finally {
      setManagementLoading(false);
    }
  };

  const toggleWorkerAvailability = async (
    worker
  ) => {
    try {
      setManagementActionId(worker.id);
      setError("");
      setSuccess("");

      await axios.patch(
        `${API_BASE_URL}/api/admin/workers/${worker.id}/availability`,
        {
          is_available: !worker.is_available,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setSuccess(
        worker.is_available
          ? "Worker marked unavailable."
          : "Worker marked available."
      );

      await refreshManagement();
    } catch (error) {
      console.error(
        "Worker availability error:",
        error
      );

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        handleLogout();
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Failed to update worker availability."
      );
    } finally {
      setManagementActionId(null);
    }
  };

  const toggleUserStatus = async (managedUser) => {
    if (managedUser.id === user?.id) {
      setError(
        "You cannot deactivate your own admin account."
      );
      return;
    }

    const actionLabel = managedUser.is_active
      ? "deactivate"
      : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} ${managedUser.name || managedUser.email}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setManagementActionId(managedUser.id);
      setError("");
      setSuccess("");

      await axios.patch(
        `${API_BASE_URL}/api/admin/users/${managedUser.id}/status`,
        {
          is_active: !managedUser.is_active,
        },
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
    } catch (error) {
      console.error(
        "User status error:",
        error
      );

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        handleLogout();
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Failed to update user account status."
      );
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
    } catch (error) {
      console.error("Create worker error:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        handleLogout();
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Failed to create worker account."
      );
    } finally {
      setAddingWorker(false);
    }
  };

  const closeAddWorkerModal = () => {
    if (addingWorker) return;
    setShowAddWorkerModal(false);
    setWorkerForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      department: "",
      specialization: "",
    });
  };

  const managementStats = useMemo(() => {
    const activeWorkers = workers.filter(
      (worker) =>
        worker.is_available &&
        worker.users?.is_active !== false
    ).length;

    const unavailableWorkers =
      workers.length - activeWorkers;

    const activeUsers = managedUsers.filter(
      (managedUser) => managedUser.is_active
    ).length;

    const inactiveUsers =
      managedUsers.length - activeUsers;

    const citizens = managedUsers.filter(
      (managedUser) => managedUser.role === "citizen"
    ).length;

    const workerAccounts = managedUsers.filter(
      (managedUser) => managedUser.role === "worker"
    ).length;

    const admins = managedUsers.filter(
      (managedUser) => managedUser.role === "admin"
    ).length;

    return {
      activeWorkers,
      unavailableWorkers,
      activeUsers,
      inactiveUsers,
      citizens,
      workerAccounts,
      admins,
    };
  }, [workers, managedUsers]);

  const filteredManagementWorkers = useMemo(() => {
    const query = managementSearch.trim().toLowerCase();

    if (!query) {
      return workers;
    }

    return workers.filter((worker) =>
      [
        worker.worker_code,
        worker.department,
        worker.specialization,
        worker.users?.name,
        worker.users?.email,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [workers, managementSearch]);

  const filteredManagementUsers = useMemo(() => {
    const query = managementSearch.trim().toLowerCase();

    if (!query) {
      return managedUsers;
    }

    return managedUsers.filter((managedUser) =>
      [
        managedUser.name,
        managedUser.email,
        managedUser.phone,
        managedUser.role,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [managedUsers, managementSearch]);

  // ==========================================================
  // STATS
  // ==========================================================

  const stats = useMemo(() => {
    const total = complaints.length;

    const submitted = complaints.filter(
      (c) => c.status === "Submitted"
    ).length;

    const verified = complaints.filter(
      (c) => c.status === "Verified"
    ).length;

    const assigned = complaints.filter(
      (c) => c.status === "Assigned"
    ).length;

    const inProgress = complaints.filter(
      (c) => c.status === "In Progress"
    ).length;

    const resolved = complaints.filter(
      (c) => c.status === "Resolved"
    ).length;

    const rejected = complaints.filter(
      (c) => c.status === "Rejected"
    ).length;

    const closed = resolved + rejected;

    const resolutionRate =
      total > 0
        ? Math.round(
            (resolved / total) * 100
          )
        : 0;

    const resolutionTimes =
      complaints
        .filter(
          (complaint) =>
            complaint.created_at &&
            complaint.resolved_at
        )
        .map((complaint) => {
          const created = new Date(
            complaint.created_at
          ).getTime();

          const resolvedAt = new Date(
            complaint.resolved_at
          ).getTime();

          if (
            Number.isNaN(created) ||
            Number.isNaN(resolvedAt) ||
            resolvedAt < created
          ) {
            return null;
          }

          return (
            (resolvedAt - created) /
            (1000 * 60 * 60)
          );
        })
        .filter((value) => value !== null);

    const averageResolutionHours =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce(
            (sum, value) => sum + value,
            0
          ) / resolutionTimes.length
        : 0;

    return {
      total,
      submitted,
      verified,
      assigned,
      inProgress,
      resolved,
      rejected,
      closed,
      resolutionRate,
      averageResolutionHours,
      workers: workers.length,
    };
  }, [complaints, workers]);

  // ==========================================================
  // STATUS CHART DATA
  // ==========================================================

  const statusChartData = useMemo(() => {
    return [
      {
        name: "Submitted",
        value: stats.submitted,
      },
      {
        name: "Verified",
        value: stats.verified,
      },
      {
        name: "Assigned",
        value: stats.assigned,
      },
      {
        name: "In Progress",
        value: stats.inProgress,
      },
      {
        name: "Resolved",
        value: stats.resolved,
      },
      {
        name: "Rejected",
        value: stats.rejected,
      },
    ].filter((item) => item.value > 0);
  }, [stats]);

  // ==========================================================
  // CATEGORY CHART DATA
  // ==========================================================

  const categoryChartData = useMemo(() => {
    const categoryMap = {};

    complaints.forEach((complaint) => {
      const category =
        complaint.categories?.name ||
        "Uncategorized";

      categoryMap[category] =
        (categoryMap[category] || 0) + 1;
    });

    return Object.entries(categoryMap)
      .map(([name, complaints]) => ({
        name,
        complaints,
      }))
      .sort(
        (a, b) =>
          b.complaints - a.complaints
      );
  }, [complaints]);

  // ==========================================================
  // TIME CHART DATA
  // ==========================================================

  const timeChartData = useMemo(() => {
    const dateMap = {};

    complaints.forEach((complaint) => {
      if (!complaint.created_at) {
        return;
      }

      const date = new Date(
        complaint.created_at
      );

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = date.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
        }
      );

      dateMap[key] =
        (dateMap[key] || 0) + 1;
    });

    return Object.entries(dateMap)
      .map(([date, complaints]) => ({
        date,
        complaints,
      }))
      .slice(-14);
  }, [complaints]);

  // ==========================================================
  // WORKER WORKLOAD DATA
  // ==========================================================

  const workerChartData = useMemo(() => {
    return workers
      .map((worker) => {
        const workerId = worker.id;

        const assignedCount =
          complaints.filter(
            (complaint) =>
              complaint.assigned_worker_id ===
              workerId
          ).length;

        const resolvedCount =
          complaints.filter(
            (complaint) =>
              complaint.assigned_worker_id ===
                workerId &&
              complaint.status === "Resolved"
          ).length;

        return {
          name:
            worker.users?.name ||
            worker.worker_code ||
            "Worker",
          assigned: assignedCount,
          resolved: resolvedCount,
        };
      })
      .sort(
        (a, b) =>
          b.assigned - a.assigned
      );
  }, [workers, complaints]);

  // ==========================================================
  // ADVANCED ANALYTICS
  // ==========================================================

  const advancedAnalytics = useMemo(() => {
    const now = Date.now();
    const periodDays = analyticsPeriod === "all"
      ? null
      : Number(analyticsPeriod);

    const periodComplaints = complaints.filter((complaint) => {
      if (!periodDays || !complaint.created_at) {
        return true;
      }

      const created = new Date(complaint.created_at).getTime();

      if (Number.isNaN(created)) {
        return false;
      }

      return now - created <= periodDays * 24 * 60 * 60 * 1000;
    });

    const priorityMap = {};
    periodComplaints.forEach((complaint) => {
      const priority = complaint.priority || "Not specified";
      priorityMap[priority] = (priorityMap[priority] || 0) + 1;
    });

    const priorityData = Object.entries(priorityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const verifiedCount = periodComplaints.filter(
      (complaint) => complaint.verified_at
    ).length;

    const verificationRate =
      periodComplaints.length > 0
        ? Math.round((verifiedCount / periodComplaints.length) * 100)
        : 0;

    const resolvedCount = periodComplaints.filter(
      (complaint) => complaint.status === "Resolved"
    ).length;

    const rejectedCount = periodComplaints.filter(
      (complaint) => complaint.status === "Rejected"
    ).length;

    const activeCount = periodComplaints.filter(
      (complaint) =>
        !["Resolved", "Rejected"].includes(complaint.status)
    ).length;

    const agingBuckets = {
      "0–2 days": 0,
      "3–7 days": 0,
      "8–14 days": 0,
      "15+ days": 0,
    };

    periodComplaints.forEach((complaint) => {
      if (["Resolved", "Rejected"].includes(complaint.status)) {
        return;
      }

      if (!complaint.created_at) {
        return;
      }

      const created = new Date(complaint.created_at).getTime();

      if (Number.isNaN(created)) {
        return;
      }

      const ageDays = Math.max(
        0,
        (now - created) / (1000 * 60 * 60 * 24)
      );

      if (ageDays <= 2) {
        agingBuckets["0–2 days"] += 1;
      } else if (ageDays <= 7) {
        agingBuckets["3–7 days"] += 1;
      } else if (ageDays <= 14) {
        agingBuckets["8–14 days"] += 1;
      } else {
        agingBuckets["15+ days"] += 1;
      }
    });

    const agingData = Object.entries(agingBuckets).map(
      ([name, complaints]) => ({
        name,
        complaints,
      })
    );

    const monthlyMap = {};
    periodComplaints.forEach((complaint) => {
      if (!complaint.created_at) {
        return;
      }

      const date = new Date(complaint.created_at);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });

      monthlyMap[key] = (monthlyMap[key] || 0) + 1;
    });

    const monthlyTrendData = Object.entries(monthlyMap).map(
      ([month, complaints]) => ({
        month,
        complaints,
      })
    );

    const averageAgeHours =
      activeCount > 0
        ? periodComplaints
            .filter(
              (complaint) =>
                complaint.status !== "Resolved" &&
                complaint.status !== "Rejected" &&
                complaint.created_at
            )
            .map((complaint) => {
              const created = new Date(
                complaint.created_at
              ).getTime();

              if (Number.isNaN(created)) {
                return null;
              }

              return Math.max(
                0,
                (now - created) / (1000 * 60 * 60)
              );
            })
            .filter((value) => value !== null)
            .reduce((sum, value) => sum + value, 0) /
          Math.max(
            1,
            periodComplaints.filter(
              (complaint) =>
                complaint.status !== "Resolved" &&
                complaint.status !== "Rejected" &&
                complaint.created_at
            ).length
          )
        : 0;

    return {
      periodComplaints,
      priorityData,
      verificationRate,
      verifiedCount,
      resolvedCount,
      rejectedCount,
      activeCount,
      agingData,
      monthlyTrendData,
      averageAgeHours,
    };
  }, [complaints, analyticsPeriod]);

  const formatAge = (hours) => {
    if (!hours || hours <= 0) {
      return "N/A";
    }

    if (hours < 24) {
      return `${hours.toFixed(1)} hrs`;
    }

    return `${(hours / 24).toFixed(1)} days`;
  };

  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredComplaints = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return complaints.filter(
      (complaint) => {
        const matchesStatus =
          statusFilter === "All" ||
          complaint.status ===
            statusFilter;

        const matchesSearch =
          !query ||
          complaint.title
            ?.toLowerCase()
            .includes(query) ||
          complaint.description
            ?.toLowerCase()
            .includes(query) ||
          complaint.complaint_code
            ?.toLowerCase()
            .includes(query) ||
          complaint.categories?.name
            ?.toLowerCase()
            .includes(query);

        return (
          matchesStatus &&
          matchesSearch
        );
      }
    );
  }, [
    complaints,
    search,
    statusFilter,
  ]);

  // ==========================================================
  // MAP DATA
  // ==========================================================

  const mapComplaints = useMemo(() => {
    return filteredComplaints.filter(
      (complaint) =>
        complaint.latitude != null &&
        complaint.longitude != null &&
        !Number.isNaN(Number(complaint.latitude)) &&
        !Number.isNaN(Number(complaint.longitude))
    );
  }, [filteredComplaints]);

  // ==========================================================
  // SMART HEATMAP DATA
  // ==========================================================

  const heatmapData = useMemo(() => {
    if (mapComplaints.length === 0) {
      return [];
    }

    const toRadians = (value) => (value * Math.PI) / 180;

    const distanceKm = (lat1, lon1, lat2, lon2) => {
      const earthRadiusKm = 6371;
      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(dLon / 2) ** 2;

      return (
        earthRadiusKm *
        2 *
        Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      );
    };

    const getPriorityWeight = (priority) => {
      switch (String(priority || "").toLowerCase()) {
        case "critical":
          return 4;
        case "high":
          return 3;
        case "medium":
          return 2;
        case "low":
          return 1;
        default:
          return 1;
      }
    };

    const points = mapComplaints.map((complaint) => ({
      complaint,
      latitude: Number(complaint.latitude),
      longitude: Number(complaint.longitude),
      weight: getPriorityWeight(complaint.priority),
    }));

    const rawPoints = points.map((point) => {
      let nearbyCount = 0;
      let densityWeight = 0;

      points.forEach((other) => {
        const distance = distanceKm(
          point.latitude,
          point.longitude,
          other.latitude,
          other.longitude
        );

        // 1 km neighborhood radius.
        if (distance <= 1) {
          nearbyCount += 1;
          densityWeight += other.weight;
        }
      });

      return {
        ...point,
        nearbyCount,
        densityWeight,
      };
    });

    const maxDensity = Math.max(
      1,
      ...rawPoints.map((point) => point.densityWeight)
    );

    return rawPoints.map((point) => ({
      ...point,
      intensity: point.densityWeight / maxDensity,
    }));
  }, [mapComplaints]);

  const getHeatmapColor = (intensity) => {
    if (intensity >= 0.75) {
      return "#ef4444";
    }

    if (intensity >= 0.5) {
      return "#f97316";
    }

    if (intensity >= 0.25) {
      return "#eab308";
    }

    return "#3b82f6";
  };

  const getHeatmapRadius = (intensity) => {
    return 14 + Math.round(intensity * 22);
  };

  // ==========================================================
  // HELPERS
  // ==========================================================

  const getMapStatusColor = (status) => {
    switch (status) {
      case "Submitted":
        return "#6b7280";
      case "Verified":
        return "#8b5cf6";
      case "Assigned":
        return "#eab308";
      case "In Progress":
        return "#3b82f6";
      case "Resolved":
        return "#22c55e";
      case "Rejected":
        return "#ef4444";
      default:
        return "#64748b";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Submitted":
        return "bg-gray-100 text-gray-700";

      case "Verified":
        return "bg-purple-100 text-purple-700";

      case "Assigned":
        return "bg-yellow-100 text-yellow-700";

      case "In Progress":
        return "bg-blue-100 text-blue-700";

      case "Resolved":
        return "bg-green-100 text-green-700";

      case "Rejected":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusDotClass = (status) => {
    switch (status) {
      case "Submitted":
        return "bg-gray-500";

      case "Verified":
        return "bg-purple-500";

      case "Assigned":
        return "bg-yellow-500";

      case "In Progress":
        return "bg-blue-500";

      case "Resolved":
        return "bg-green-500";

      case "Rejected":
        return "bg-red-500";

      default:
        return "bg-gray-400";
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    try {
      return new Date(
        date
      ).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return date;
    }
  };

  const getWorkerName = (complaint) => {
    if (complaint.workers?.users?.name) {
      return complaint.workers.users.name;
    }

    if (complaint.workers?.worker_code) {
      return complaint.workers.worker_code;
    }

    return "Not assigned";
  };

  const getHistoryActor = (
    historyItem
  ) => {
    if (historyItem.changed_by) {
      return historyItem.changed_by;
    }

    return "System";
  };

  const formatAverageResolutionTime =
    (hours) => {
      if (!hours || hours <= 0) {
        return "N/A";
      }

      if (hours < 24) {
        return `${hours.toFixed(1)} hrs`;
      }

      return `${(hours / 24).toFixed(
        1
      )} days`;
    };

  const PIE_COLORS = [
    "#3b82f6",
    "#8b5cf6",
    "#eab308",
    "#f97316",
    "#22c55e",
    "#ef4444",
  ];


  const navigationItems = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      target: "overview-section",
    },
    {
      id: "complaints",
      label: "Complaints",
      icon: ClipboardList,
      target: "complaints-section",
    },
    {
      id: "management",
      label: "Management",
      icon: UsersRound,
      target: "management-section",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      target: "analytics-section",
    },
    {
      id: "map",
      label: "Complaint Map",
      icon: Map,
      target: "map-section",
    },
  ];

  const handleNavigation = (item) => {
    const target = document.getElementById(item.target);

    if (!target) {
      console.warn(`Navigation target not found: ${item.target}`);
      return;
    }

    setActiveNav(item.id);

    const headerOffset = window.innerWidth >= 1024 ? 88 : 136;
    const targetTop =
      target.getBoundingClientRect().top +
      window.pageYOffset -
      headerOffset;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const sections = navigationItems
      .map((item) => ({
        id: item.id,
        element: document.getElementById(item.target),
      }))
      .filter((item) => item.element);

    if (sections.length === 0) return undefined;

    const updateActiveNavigation = () => {
      const scrollPosition = window.scrollY + 180;
      let current = sections[0].id;

      for (const section of sections) {
        if (section.element.offsetTop <= scrollPosition) {
          current = section.id;
        }
      }

      setActiveNav(current);
    };

    updateActiveNavigation();
    window.addEventListener("scroll", updateActiveNavigation, { passive: true });
    window.addEventListener("resize", updateActiveNavigation);

    return () => {
      window.removeEventListener("scroll", updateActiveNavigation);
      window.removeEventListener("resize", updateActiveNavigation);
    };
  }, []);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />

          <p className="text-gray-600">
            Loading admin dashboard...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ======================================================
          HEADER
      ====================================================== */}

      {/* SMARTCITY ADMIN SIDEBAR */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-slate-950 text-white shadow-2xl">
        <div className="h-20 px-6 flex items-center border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="ml-3">
            <p className="font-bold">SmartCity</p>
            <p className="text-xs text-slate-400">Admin Console</p>
          </div>
        </div>
        <nav className="p-4 space-y-1.5">
          <p className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </p>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigation(item)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight className="w-4 h-4" />}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Signed in as</p>
            <p className="mt-1 text-sm font-semibold truncate">{user?.name || "Administrator"}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || ""}</p>
          </div>
        </div>
      </aside>

      <div className="lg:hidden bg-slate-950 text-white sticky top-0 z-40 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-sm">SmartCity</p>
            <p className="text-[10px] text-slate-400">Admin Console</p>
          </div>
        </div>
        <div className="px-3 pb-3 flex gap-2 overflow-x-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigation(item)}
                className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                  activeNav === item.id
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="lg:ml-64 min-h-screen">
      <header className="bg-white/95 backdrop-blur border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-7 h-7 text-blue-600" />

                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
              </div>

              <p className="text-sm text-gray-500 mt-1">
                Smart City Complaint Portal
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 bg-gray-50 border rounded-xl px-4 py-2">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserRound className="w-5 h-5 text-blue-600" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.name ||
                      "Admin"}
                  </p>

                  <p className="text-xs text-gray-500">
                    Administrator
                  </p>
                </div>
              </div>

              <NotificationBell />

              <button
                onClick={() =>
                  loadDashboard(
                    token,
                    true
                  )
                }
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />

                Refresh
              </button>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                <LogOut className="w-4 h-4" />

                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div id="overview-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 scroll-mt-28">
        {/* ====================================================
            ALERTS
        ==================================================== */}

        {error && (
          <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 mt-0.5" />

            <div>
              <p className="font-semibold">
                Something went wrong
              </p>

              <p className="text-sm mt-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 mt-0.5" />

            <div>
              <p className="font-semibold">
                Success
              </p>

              <p className="text-sm mt-1">
                {success}
              </p>
            </div>
          </div>
        )}

        {/* ====================================================
            TOP STATS
        ==================================================== */}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-7">
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">
              Total
            </p>

            <p className="text-3xl font-bold mt-2">
              {stats.total}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">
              Submitted
            </p>

            <p className="text-3xl font-bold mt-2">
              {stats.submitted}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">
              Assigned
            </p>

            <p className="text-3xl font-bold mt-2">
              {stats.assigned}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">
              In Progress
            </p>

            <p className="text-3xl font-bold mt-2">
              {stats.inProgress}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">
              Resolved
            </p>

            <p className="text-3xl font-bold mt-2">
              {stats.resolved}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">
              Workers
            </p>

            <p className="text-3xl font-bold mt-2">
              {stats.workers}
            </p>
          </div>
        </div>

        {/* ====================================================
            ANALYTICS SUMMARY
        ==================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Resolution Rate
                </p>

                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.resolutionRate}%
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>

            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{
                  width: `${stats.resolutionRate}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Average Resolution
                </p>

                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {formatAverageResolutionTime(
                    stats.averageResolutionHours
                  )}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                <Clock3 className="w-5 h-5 text-blue-600" />
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Based on complaints with a recorded
              resolution time.
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Closed Complaints
                </p>

                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {stats.closed}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Resolved + rejected complaints.
            </p>
          </div>
        </div>

        {/* ====================================================
            ADVANCED ANALYTICS
        ==================================================== */}

        {/* ======================================================
            ADMIN MANAGEMENT
        ====================================================== */}

        <section id="management-section" className="mb-7 scroll-mt-28">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />

                <h2 className="text-xl font-bold text-gray-900">
                  Admin Management
                </h2>
              </div>

              <p className="text-sm text-gray-500 mt-1">
                Manage worker availability and user account access.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  value={managementSearch}
                  onChange={(event) =>
                    setManagementSearch(event.target.value)
                  }
                  placeholder={
                    managementTab === "workers"
                      ? "Search workers..."
                      : "Search users..."
                  }
                  className="w-full sm:w-64 pl-9 pr-3 py-2.5 border rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setShowAddWorkerModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4" />
                Add Worker
              </button>

              <button
                type="button"
                onClick={refreshManagement}
                disabled={managementLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    managementLoading
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Management stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
            <div className="bg-white border rounded-xl p-3">
              <p className="text-xs text-gray-500">
                Workers
              </p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {workers.length}
              </p>
            </div>

            <div className="bg-white border rounded-xl p-3">
              <p className="text-xs text-gray-500">
                Available
              </p>
              <p className="text-xl font-bold text-green-600 mt-1">
                {managementStats.activeWorkers}
              </p>
            </div>

            <div className="bg-white border rounded-xl p-3">
              <p className="text-xs text-gray-500">
                Unavailable
              </p>
              <p className="text-xl font-bold text-orange-600 mt-1">
                {managementStats.unavailableWorkers}
              </p>
            </div>

            <div className="bg-white border rounded-xl p-3">
              <p className="text-xs text-gray-500">
                Citizens
              </p>
              <p className="text-xl font-bold text-blue-600 mt-1">
                {managementStats.citizens}
              </p>
            </div>

            <div className="bg-white border rounded-xl p-3">
              <p className="text-xs text-gray-500">
                Workers Accounts
              </p>
              <p className="text-xl font-bold text-purple-600 mt-1">
                {managementStats.workerAccounts}
              </p>
            </div>

            <div className="bg-white border rounded-xl p-3">
              <p className="text-xs text-gray-500">
                Active Users
              </p>
              <p className="text-xl font-bold text-green-600 mt-1">
                {managementStats.activeUsers}
              </p>
            </div>

            <div className="bg-white border rounded-xl p-3">
              <p className="text-xs text-gray-500">
                Inactive
              </p>
              <p className="text-xl font-bold text-red-600 mt-1">
                {managementStats.inactiveUsers}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b px-4 pt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManagementTab("workers");
                    setManagementSearch("");
                  }}
                  className={`px-4 py-2.5 rounded-t-lg text-sm font-semibold ${
                    managementTab === "workers"
                      ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Worker Management
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setManagementTab("users");
                    setManagementSearch("");
                  }}
                  className={`px-4 py-2.5 rounded-t-lg text-sm font-semibold ${
                    managementTab === "users"
                      ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  User Management
                </button>
              </div>
            </div>

            {managementTab === "workers" ? (
              <div className="p-4">
                {filteredManagementWorkers.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-800">
                      No workers found
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Try another search term.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px]">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b">
                          <th className="pb-3 pr-4">
                            Worker
                          </th>
                          <th className="pb-3 pr-4">
                            Contact
                          </th>
                          <th className="pb-3 pr-4">
                            Department
                          </th>
                          <th className="pb-3 pr-4">
                            Specialization
                          </th>
                          <th className="pb-3 pr-4">
                            Account
                          </th>
                          <th className="pb-3 pr-4">
                            Availability
                          </th>
                          <th className="pb-3 text-right">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {filteredManagementWorkers.map(
                          (worker) => {
                            const accountActive =
                              worker.users?.is_active !== false;

                            const busy =
                              managementActionId === worker.id;

                            return (
                              <tr key={worker.id}>
                                <td className="py-4 pr-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                                      {worker.users
                                        ?.profile_image_url ? (
                                        <img
                                          src={
                                            worker.users
                                              .profile_image_url
                                          }
                                          alt=""
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <UserRound className="w-4 h-4 text-blue-600" />
                                      )}
                                    </div>

                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {worker.users?.name ||
                                          "Worker"}
                                      </p>
                                      <p className="text-xs text-gray-500 font-mono">
                                        {worker.worker_code}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 pr-4">
                                  <p className="text-sm text-gray-800">
                                    {worker.users?.email ||
                                      "N/A"}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {worker.users?.phone ||
                                      "No phone"}
                                  </p>
                                </td>

                                <td className="py-4 pr-4 text-sm text-gray-700">
                                  {worker.department ||
                                    "Not specified"}
                                </td>

                                <td className="py-4 pr-4 text-sm text-gray-700">
                                  {worker.specialization ||
                                    "General"}
                                </td>

                                <td className="py-4 pr-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                      accountActive
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {accountActive ? (
                                      <UserCheck className="w-3.5 h-3.5" />
                                    ) : (
                                      <UserX className="w-3.5 h-3.5" />
                                    )}
                                    {accountActive
                                      ? "Active"
                                      : "Inactive"}
                                  </span>
                                </td>

                                <td className="py-4 pr-4">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                      worker.is_available &&
                                      accountActive
                                        ? "bg-green-100 text-green-700"
                                        : "bg-orange-100 text-orange-700"
                                    }`}
                                  >
                                    {worker.is_available &&
                                    accountActive
                                      ? "Available"
                                      : "Unavailable"}
                                  </span>
                                </td>

                                <td className="py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleWorkerAvailability(
                                        worker
                                      )
                                    }
                                    disabled={
                                      busy ||
                                      !accountActive
                                    }
                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                                      worker.is_available
                                        ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                                        : "bg-green-50 text-green-700 hover:bg-green-100"
                                    }`}
                                  >
                                    {worker.is_available ? (
                                      <Ban className="w-3.5 h-3.5" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}

                                    {busy
                                      ? "Updating..."
                                      : worker.is_available
                                      ? "Set Unavailable"
                                      : "Set Available"}
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4">
                {filteredManagementUsers.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-800">
                      No users found
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Try another search term.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b">
                          <th className="pb-3 pr-4">
                            User
                          </th>
                          <th className="pb-3 pr-4">
                            Role
                          </th>
                          <th className="pb-3 pr-4">
                            Phone
                          </th>
                          <th className="pb-3 pr-4">
                            Joined
                          </th>
                          <th className="pb-3 pr-4">
                            Status
                          </th>
                          <th className="pb-3 text-right">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {filteredManagementUsers.map(
                          (managedUser) => {
                            const busy =
                              managementActionId ===
                              managedUser.id;

                            const isSelf =
                              managedUser.id ===
                              user?.id;

                            return (
                              <tr key={managedUser.id}>
                                <td className="py-4 pr-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                                      {managedUser.profile_image_url ? (
                                        <img
                                          src={
                                            managedUser.profile_image_url
                                          }
                                          alt=""
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <UserRound className="w-4 h-4 text-gray-500" />
                                      )}
                                    </div>

                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {managedUser.name ||
                                          "Unnamed User"}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {managedUser.email}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 pr-4">
                                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold capitalize">
                                    {managedUser.role}
                                  </span>
                                </td>

                                <td className="py-4 pr-4 text-sm text-gray-700">
                                  {managedUser.phone ||
                                    "Not provided"}
                                </td>

                                <td className="py-4 pr-4 text-sm text-gray-700">
                                  {formatDate(
                                    managedUser.created_at
                                  )}
                                </td>

                                <td className="py-4 pr-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                      managedUser.is_active
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {managedUser.is_active ? (
                                      <UserCheck className="w-3.5 h-3.5" />
                                    ) : (
                                      <UserX className="w-3.5 h-3.5" />
                                    )}
                                    {managedUser.is_active
                                      ? "Active"
                                      : "Inactive"}
                                  </span>
                                </td>

                                <td className="py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleUserStatus(
                                        managedUser
                                      )
                                    }
                                    disabled={
                                      busy || isSelf
                                    }
                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                                      managedUser.is_active
                                        ? "bg-red-50 text-red-700 hover:bg-red-100"
                                        : "bg-green-50 text-green-700 hover:bg-green-100"
                                    }`}
                                  >
                                    {managedUser.is_active ? (
                                      <UserX className="w-3.5 h-3.5" />
                                    ) : (
                                      <UserCheck className="w-3.5 h-3.5" />
                                    )}

                                    {busy
                                      ? "Updating..."
                                      : managedUser.is_active
                                      ? "Deactivate"
                                      : "Activate"}
                                  </button>

                                  {isSelf && (
                                    <p className="text-[10px] text-gray-400 mt-1">
                                      Current admin
                                    </p>
                                  )}
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section id="analytics-section" className="mb-7 scroll-mt-28">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Advanced Analytics
                </h2>

                <p className="text-sm text-gray-500">
                  Operational trends, complaint aging, priority and verification metrics.
                </p>
              </div>
            </div>

            <select
              value={analyticsPeriod}
              onChange={(e) => setAnalyticsPeriod(e.target.value)}
              className="border rounded-lg px-4 py-2.5 bg-white text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All available data</option>
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">
                    Period Complaints
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {advancedAnalytics.periodComplaints.length}
                  </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">
                    Verification Rate
                  </p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    {advancedAnalytics.verificationRate}%
                  </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">
                    Active Complaints
                  </p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {advancedAnalytics.activeCount}
                  </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">
                    Avg Active Age
                  </p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {formatAge(advancedAnalytics.averageAgeHours)}
                  </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <Clock3 className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* PRIORITY DISTRIBUTION */}

            <div className="bg-white border rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900">
                Complaints by Priority
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                Priority distribution for the selected period.
              </p>

              {advancedAnalytics.priorityData.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-gray-400">
                  No priority data available.
                </div>
              ) : (
                <div className="h-[280px] mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={advancedAnalytics.priorityData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />

                      <Bar
                        dataKey="value"
                        name="Complaints"
                        fill="#8b5cf6"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* AGING */}

            <div className="bg-white border rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900">
                Active Complaint Aging
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                Age buckets for unresolved complaints.
              </p>

              {advancedAnalytics.agingData.every(
                (item) => item.complaints === 0
              ) ? (
                <div className="h-[280px] flex items-center justify-center text-gray-400">
                  No active complaint aging data available.
                </div>
              ) : (
                <div className="h-[280px] mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={advancedAnalytics.agingData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />

                      <Bar
                        dataKey="complaints"
                        name="Active complaints"
                        fill="#f97316"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* MONTHLY TREND */}

            <div className="bg-white border rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900">
                Monthly Complaint Trend
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                Complaint submissions within the selected period.
              </p>

              {advancedAnalytics.monthlyTrendData.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-gray-400">
                  No monthly trend data available.
                </div>
              ) : (
                <div className="h-[280px] mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={advancedAnalytics.monthlyTrendData}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 0,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />

                      <Line
                        type="monotone"
                        dataKey="complaints"
                        name="Complaints"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* PERIOD SUMMARY */}

            <div className="bg-white border rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900">
                Period Summary
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                Key counts for the selected analytics period.
              </p>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-gray-600">
                    Verified complaints
                  </span>
                  <span className="font-semibold">
                    {advancedAnalytics.verifiedCount}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-gray-600">
                    Resolved complaints
                  </span>
                  <span className="font-semibold text-green-600">
                    {advancedAnalytics.resolvedCount}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-gray-600">
                    Rejected complaints
                  </span>
                  <span className="font-semibold text-red-600">
                    {advancedAnalytics.rejectedCount}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Active complaints
                  </span>
                  <span className="font-semibold text-orange-600">
                    {advancedAnalytics.activeCount}
                  </span>
                </div>
              </div>

              <div className="mt-5 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-blue-600 mt-0.5" />

                  <div>
                    <p className="font-semibold text-blue-900">
                      Analytics scope
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      These metrics are calculated from the complaints currently
                      returned by the admin API and the selected time period.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            ANALYTICS CHARTS
        ==================================================== */}

        <section className="mb-7">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Complaint Analytics
              </h2>

              <p className="text-sm text-gray-500">
                Overview of complaint activity and workload.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* STATUS PIE */}

            <div className="bg-white border rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900">
                Complaints by Status
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                Current complaint lifecycle distribution.
              </p>

              {statusChartData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-gray-400">
                  No complaint data available.
                </div>
              ) : (
                <div className="h-[320px] mt-3">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={105}
                        label
                      >
                        {statusChartData.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                PIE_COLORS[
                                  index %
                                    PIE_COLORS.length
                                ]
                              }
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip />

                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* CATEGORY BAR */}

            <div className="bg-white border rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900">
                Complaints by Category
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                Number of complaints for each civic category.
              </p>

              {categoryChartData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-gray-400">
                  No category data available.
                </div>
              ) : (
                <div className="h-[320px] mt-3">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={categoryChartData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 45,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        dataKey="name"
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />

                      <YAxis allowDecimals={false} />

                      <Tooltip />

                      <Bar
                        dataKey="complaints"
                        fill="#3b82f6"
                        radius={[
                          5,
                          5,
                          0,
                          0,
                        ]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* TIME LINE */}

            <div className="bg-white border rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900">
                Complaints Over Time
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                Recent complaint submissions.
              </p>

              {timeChartData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-gray-400">
                  No time-series data available.
                </div>
              ) : (
                <div className="h-[320px] mt-3">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={timeChartData}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 0,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="date" />

                      <YAxis
                        allowDecimals={false}
                      />

                      <Tooltip />

                      <Line
                        type="monotone"
                        dataKey="complaints"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* WORKER WORKLOAD */}

            <div className="bg-white border rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900">
                Worker Workload
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                Assigned and resolved complaints per worker.
              </p>

              {workerChartData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-gray-400">
                  No worker data available.
                </div>
              ) : (
                <div className="h-[320px] mt-3">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={workerChartData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 45,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        dataKey="name"
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />

                      <YAxis allowDecimals={false} />

                      <Tooltip />

                      <Legend />

                      <Bar
                        dataKey="assigned"
                        fill="#eab308"
                        name="Assigned"
                        radius={[
                          5,
                          5,
                          0,
                          0,
                        ]}
                      />

                      <Bar
                        dataKey="resolved"
                        fill="#22c55e"
                        name="Resolved"
                        radius={[
                          5,
                          5,
                          0,
                          0,
                        ]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ====================================================
            COMPLAINT MAP
        ==================================================== */}

        <section id="map-section" className="mb-7 scroll-mt-28">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <MapPinned className="w-5 h-5 text-blue-600" />

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Smart Complaint Heatmap
                </h2>

                <p className="text-sm text-gray-500">
                  Geographic complaint density calculated from the current
                  search and status filters.
                </p>
              </div>
            </div>

            <div className="inline-flex rounded-lg border bg-white p-1 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setMapViewMode("markers")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  mapViewMode === "markers"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Markers
              </button>

              <button
                type="button"
                onClick={() => setMapViewMode("heatmap")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  mapViewMode === "heatmap"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Heatmap
              </button>
            </div>
          </div>

          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            {mapComplaints.length === 0 ? (
              <div className="h-[420px] flex flex-col items-center justify-center text-center px-6">
                <MapPinned className="w-12 h-12 text-gray-300 mb-3" />

                <p className="font-semibold text-gray-900">
                  No complaint locations available
                </p>

                <p className="text-sm text-gray-500 mt-1 max-w-md">
                  Complaints need valid latitude and longitude values to appear
                  on the map. Try changing the current search or status filter.
                </p>
              </div>
            ) : (
              <div className="h-[420px] w-full">
                <MapContainer
                  center={[19.076, 72.8777]}
                  zoom={11}
                  scrollWheelZoom={true}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapBoundsController complaints={mapComplaints} />

                  {mapViewMode === "markers" &&
                    mapComplaints.map((complaint) => {
                      const latitude = Number(complaint.latitude);
                      const longitude = Number(complaint.longitude);
                      const markerColor = getMapStatusColor(
                        complaint.status
                      );

                      return (
                        <CircleMarker
                          key={complaint.id}
                          center={[latitude, longitude]}
                          radius={9}
                          pathOptions={{
                            color: "#ffffff",
                            weight: 2,
                            fillColor: markerColor,
                            fillOpacity: 0.9,
                          }}
                        >
                          <Popup>
                            <div className="min-w-[220px]">
                              <p className="text-xs font-mono text-gray-500">
                                {complaint.complaint_code}
                              </p>

                              <p className="font-semibold text-gray-900 mt-1">
                                {complaint.title}
                              </p>

                              <div className="mt-2 space-y-1 text-sm">
                                <p>
                                  <strong>Status:</strong>{" "}
                                  {complaint.status}
                                </p>

                                <p>
                                  <strong>Category:</strong>{" "}
                                  {complaint.categories?.name ||
                                    "Not specified"}
                                </p>

                                <p>
                                  <strong>Priority:</strong>{" "}
                                  {complaint.priority || "Not specified"}
                                </p>

                                {complaint.address && (
                                  <p>
                                    <strong>Address:</strong>{" "}
                                    {complaint.address}
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => openComplaint(complaint)}
                                className="mt-3 w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                              >
                                View Complaint
                              </button>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}

                  {mapViewMode === "heatmap" &&
                    heatmapData.map((point) => {
                      const heatColor = getHeatmapColor(
                        point.intensity
                      );

                      return (
                        <CircleMarker
                          key={`heat-${point.complaint.id}`}
                          center={[
                            point.latitude,
                            point.longitude,
                          ]}
                          radius={getHeatmapRadius(point.intensity)}
                          pathOptions={{
                            color: heatColor,
                            weight: 1,
                            fillColor: heatColor,
                            fillOpacity:
                              0.18 +
                              point.intensity * 0.35,
                          }}
                        >
                          <Popup>
                            <div className="min-w-[220px]">
                              <p className="text-xs font-mono text-gray-500">
                                {point.complaint.complaint_code}
                              </p>

                              <p className="font-semibold text-gray-900 mt-1">
                                {point.complaint.title}
                              </p>

                              <div className="mt-2 space-y-1 text-sm">
                                <p>
                                  <strong>Nearby complaints:</strong>{" "}
                                  {point.nearbyCount}
                                </p>

                                <p>
                                  <strong>Priority:</strong>{" "}
                                  {point.complaint.priority ||
                                    "Not specified"}
                                </p>

                                <p>
                                  <strong>Status:</strong>{" "}
                                  {point.complaint.status}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  openComplaint(point.complaint)
                                }
                                className="mt-3 w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                              >
                                View Complaint
                              </button>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                </MapContainer>
              </div>
            )}
          </div>

          {mapViewMode === "markers" ? (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
              {[
                ["Submitted", "#6b7280"],
                ["Verified", "#8b5cf6"],
                ["Assigned", "#eab308"],
                ["In Progress", "#3b82f6"],
                ["Resolved", "#22c55e"],
                ["Rejected", "#ef4444"],
              ].map(([status, color]) => (
                <div
                  key={status}
                  className="inline-flex items-center gap-2"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span>{status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
              <span className="font-semibold text-gray-700">
                Density:
              </span>

              {[
                ["Low", "#3b82f6"],
                ["Medium", "#eab308"],
                ["High", "#f97316"],
                ["Very High", "#ef4444"],
              ].map(([label, color]) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span>{label}</span>
                </div>
              ))}

              <span className="text-gray-400">
                Density uses a 1 km neighborhood and complaint priority.
              </span>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Showing {mapComplaints.length} complaint
            {mapComplaints.length === 1 ? "" : "s"} with valid coordinates.
            {mapViewMode === "heatmap" &&
              ` ${heatmapData.length} heatmap points calculated.`}
          </p>
        </section>

        {/* ====================================================
            FILTERS
        ==================================================== */}

        <div className="bg-white border rounded-2xl shadow-sm p-4 mb-5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <input
                type="text"
                placeholder="Search complaints..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="border rounded-lg px-4 py-2.5 bg-white"
            >
              <option value="All">
                All Status
              </option>

              <option value="Submitted">
                Submitted
              </option>

              <option value="Verified">
                Verified
              </option>

              <option value="Assigned">
                Assigned
              </option>

              <option value="In Progress">
                In Progress
              </option>

              <option value="Resolved">
                Resolved
              </option>

              <option value="Rejected">
                Rejected
              </option>
            </select>
          </div>
        </div>

        {/* ====================================================
            COMPLAINT MANAGEMENT
        ==================================================== */}

        <section id="complaints-section" className="bg-white border rounded-2xl shadow-sm overflow-hidden scroll-mt-28">
          <div className="p-5 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              Complaint Management
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Review, verify and assign citizen complaints.
            </p>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="py-16 text-center">
              <Wrench className="w-10 h-10 mx-auto text-gray-300 mb-3" />

              <p className="font-semibold text-gray-900">
                No complaints found
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Try changing your search or status filter.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredComplaints.map(
                (complaint) => (
                  <div
                    key={complaint.id}
                    className="p-5 hover:bg-gray-50"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="text-xs font-mono text-gray-500">
                            {
                              complaint.complaint_code
                            }
                          </span>

                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                              complaint.status
                            )}`}
                          >
                            {complaint.status}
                          </span>

                          {complaint.priority && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                              {complaint.priority}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900">
                          {complaint.title}
                        </h3>

                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {
                            complaint.description
                          }
                        </p>

                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500 mt-4">
                          <span>
                            Category:{" "}
                            <strong className="text-gray-700">
                              {complaint
                                .categories
                                ?.name ||
                                "Not specified"}
                            </strong>
                          </span>

                          <span>
                            Worker:{" "}
                            <strong className="text-gray-700">
                              {getWorkerName(
                                complaint
                              )}
                            </strong>
                          </span>

                          <span>
                            Created:{" "}
                            {formatDate(
                              complaint.created_at
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!complaint.verified_at && (
                          <button
                            onClick={() =>
                              verifyComplaint(
                                complaint.id
                              )
                            }
                            disabled={
                              verifyingId ===
                              complaint.id
                            }
                            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            <ShieldCheck className="w-4 h-4" />

                            {verifyingId ===
                            complaint.id
                              ? "Verifying..."
                              : "Verify"}
                          </button>
                        )}

                        <button
                          onClick={() =>
                            openComplaint(
                              complaint
                            )
                          }
                          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-100"
                        >
                          <Eye className="w-4 h-4" />

                          View
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
      </main>

      {/* ======================================================
          COMPLAINT MODAL
      ====================================================== */}

          {showAddWorkerModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Add New Worker
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Create a worker login and worker profile.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddWorkerModal}
                disabled={addingWorker}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={createWorker} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={workerForm.name}
                    onChange={(event) =>
                      setWorkerForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="e.g. Amit Sharma"
                    className="w-full px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={workerForm.email}
                    onChange={(event) =>
                      setWorkerForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="worker@smartcity.local"
                    className="w-full px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={workerForm.phone}
                    onChange={(event) =>
                      setWorkerForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="9876543210"
                    className="w-full px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={workerForm.password}
                    onChange={(event) =>
                      setWorkerForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    className="w-full px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Department *
                  </label>
                  <select
                    value={workerForm.department}
                    onChange={(event) =>
                      setWorkerForm((current) => ({
                        ...current,
                        department: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select department</option>
                    <option value="Public Works">Public Works</option>
                    <option value="Water Supply">Water Supply</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Roads & Transport">Roads & Transport</option>
                    <option value="Waste Management">Waste Management</option>
                    <option value="Sanitation">Sanitation</option>
                    <option value="Drainage & Sewerage">Drainage & Sewerage</option>
                    <option value="Parks & Gardens">Parks & Gardens</option>
                    <option value="Health & Public Safety">Health & Public Safety</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={workerForm.specialization}
                    onChange={(event) =>
                      setWorkerForm((current) => ({
                        ...current,
                        specialization: event.target.value,
                      }))
                    }
                    placeholder="e.g. Electrical Maintenance"
                    className="w-full px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  The new account will be created with the <strong>Worker</strong> role,
                  and the worker will initially be marked <strong>Active</strong> and
                  <strong> Available</strong>.
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeAddWorkerModal}
                  disabled={addingWorker}
                  className="px-4 py-2.5 border rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addingWorker}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingWorker ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Worker
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

  {selectedComplaint && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeComplaint}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold">
                  Complaint Details
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {
                    selectedComplaint.complaint_code
                  }
                </p>
              </div>

              <button
                onClick={closeComplaint}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* BASIC DETAILS */}

              <div>
                <p className="text-sm text-gray-500">
                  Title
                </p>

                <p className="font-semibold mt-1">
                  {selectedComplaint.title}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Description
                </p>

                <p className="mt-1 text-gray-700 whitespace-pre-wrap">
                  {
                    selectedComplaint.description
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    Category
                  </p>

                  <p className="font-medium mt-1">
                    {selectedComplaint
                      .categories?.name ||
                      "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Status
                  </p>

                  <span
                    className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                      selectedComplaint.status
                    )}`}
                  >
                    {
                      selectedComplaint.status
                    }
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Priority
                  </p>

                  <p className="font-medium mt-1">
                    {
                      selectedComplaint.priority
                    }
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Created
                  </p>

                  <p className="font-medium mt-1">
                    {formatDate(
                      selectedComplaint.created_at
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Assigned Worker
                  </p>

                  <p className="font-medium mt-1">
                    {getWorkerName(
                      selectedComplaint
                    )}
                  </p>
                </div>

                {selectedComplaint.resolved_at && (
                  <div>
                    <p className="text-sm text-gray-500">
                      Resolved
                    </p>

                    <p className="font-medium mt-1">
                      {formatDate(
                        selectedComplaint.resolved_at
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* VERIFICATION */}

              <div className="border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">
                      Verification
                    </p>

                    <p className="text-xs text-gray-500">
                      Admin verification status
                    </p>
                  </div>

                  {selectedComplaint.verified_at ? (
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      Verified
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                      Pending
                    </span>
                  )}
                </div>

                {selectedComplaint.verified_at && (
                  <p className="text-xs text-gray-500">
                    Verified:{" "}
                    {formatDate(
                      selectedComplaint.verified_at
                    )}
                  </p>
                )}

                {!selectedComplaint.verified_at && (
                  <button
                    onClick={() =>
                      verifyComplaint(
                        selectedComplaint.id
                      )
                    }
                    disabled={
                      verifyingId ===
                      selectedComplaint.id
                    }
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {verifyingId ===
                    selectedComplaint.id
                      ? "Verifying..."
                      : "Verify Complaint"}
                  </button>
                )}
              </div>

              {/* WORKER ASSIGNMENT */}

              <div className="border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-blue-600" />

                  <div>
                    <p className="font-semibold">
                      Assign Worker
                    </p>

                    <p className="text-xs text-gray-500">
                      Select a worker responsible for this
                      complaint.
                    </p>
                  </div>
                </div>

                <select
                  value={
                    selectedComplaint.assigned_worker_id ||
                    ""
                  }
                  onChange={(e) =>
                    assignWorker(
                      selectedComplaint.id,
                      e.target.value
                    )
                  }
                  disabled={
                    assigningId ===
                    selectedComplaint.id
                  }
                  className="w-full border rounded-lg px-4 py-3 bg-white"
                >
                  <option value="">
                    Select Worker
                  </option>

                  {workers.map((worker) => (
                    <option
                      key={worker.id}
                      value={worker.id}
                    >
                      {worker.worker_code} -{" "}
                      {worker.users?.name ||
                        "Worker"}{" "}
                      - {worker.department}
                    </option>
                  ))}
                </select>

                {assigningId ===
                  selectedComplaint.id && (
                  <p className="text-sm text-blue-600 mt-2">
                    Assigning complaint...
                  </p>
                )}
              </div>

              {/* STATUS HISTORY */}

              <div className="border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold">
                      Status History
                    </p>

                    <p className="text-xs text-gray-500">
                      Complete complaint lifecycle
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      loadComplaintHistory(
                        selectedComplaint.id
                      )
                    }
                    disabled={historyLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        historyLoading
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    Refresh
                  </button>
                </div>

                {historyError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                    {historyError}
                  </div>
                )}

                {historyLoading ? (
                  <div className="py-8 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />

                    <p className="text-sm text-gray-500">
                      Loading status history...
                    </p>
                  </div>
                ) : statusHistory.length ===
                  0 ? (
                  <div className="py-8 text-center">
                    <Clock3 className="w-8 h-8 mx-auto text-gray-300 mb-2" />

                    <p className="text-sm text-gray-500">
                      No status history available.
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    {statusHistory.map(
                      (
                        historyItem,
                        index
                      ) => (
                        <div
                          key={
                            historyItem.id ||
                            `${historyItem.created_at}-${index}`
                          }
                          className="relative flex gap-4"
                        >
                          {index <
                            statusHistory.length -
                              1 && (
                            <div className="absolute left-[11px] top-7 bottom-0 w-px bg-gray-200" />
                          )}

                          <div
                            className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${getStatusDotClass(
                              historyItem.new_status
                            )}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          </div>

                          <div className="pb-6 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                                  historyItem.new_status
                                )}`}
                              >
                                {
                                  historyItem.new_status
                                }
                              </span>

                              {historyItem.old_status && (
                                <span className="text-xs text-gray-400">
                                  {
                                    historyItem.old_status
                                  }{" "}
                                  →{" "}
                                  {
                                    historyItem.new_status
                                  }
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-500 mt-2">
                              {formatDate(
                                historyItem.created_at
                              )}
                            </p>

                            {historyItem.remarks && (
                              <div className="mt-2 bg-gray-50 border rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">
                                  Remarks
                                </p>

                                <p className="text-sm text-gray-700">
                                  {
                                    historyItem.remarks
                                  }
                                </p>
                              </div>
                            )}

                            <p className="text-xs text-gray-400 mt-2">
                              Changed by:{" "}
                              {getHistoryActor(
                                historyItem
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* LOCATION */}

              {selectedComplaint.latitude !=
                null &&
                selectedComplaint.longitude !=
                  null && (
                  <div className="border rounded-xl p-4">
                    <p className="font-semibold mb-2">
                      Complaint Location
                    </p>

                    {selectedComplaint.address && (
                      <p className="text-sm text-gray-600 mb-2">
                        Address:{" "}
                        {
                          selectedComplaint.address
                        }
                      </p>
                    )}

                    <p className="text-sm text-gray-600">
                      Latitude:{" "}
                      {
                        selectedComplaint.latitude
                      }
                    </p>

                    <p className="text-sm text-gray-600">
                      Longitude:{" "}
                      {
                        selectedComplaint.longitude
                      }
                    </p>

                    <a
                      href={`https://www.google.com/maps?q=${selectedComplaint.latitude},${selectedComplaint.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                )}
            </div>

            <div className="p-5 border-t flex justify-end">
              <button
                onClick={closeComplaint}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;