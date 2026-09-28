import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  Award,
  BarChart3,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Gift,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  Star,
  ThumbsUp,
  Trophy,
  UserRound,
  Wrench,
  X,
  XCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import NotificationBell from "../../components/NotificationBell";
import smartCityLogo from "../../assets/smart-city-logo.png";

const API_BASE_URL = "https://smart-city-complaint-portal-krs3.onrender.com";

function CitizenMapBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = points.map((point) => [point.latitude, point.longitude]);
    map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
  }, [map, points]);

  return null;
}

function CitizenDashboard() {
  const navigate = useNavigate();

  // Active navigation tab matching visual layout
  const [activeTab, setActiveTab] = useState("home"); // "home" | "complaints" | "map" | "community" | "rewards"

  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [rewardData, setRewardData] = useState({
    total_points: 0,
    reward_count: 0,
    rewards: [],
  });
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [rewardsError, setRewardsError] = useState("");

  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardRank, setLeaderboardRank] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState("");

  const [complaintSearch, setComplaintSearch] = useState("");
  const [complaintFilterSearch, setComplaintFilterSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");

  const [trackingComplaint, setTrackingComplaint] = useState(false);
  const [trackMessage, setTrackMessage] = useState("");
  const [showTrackModal, setShowTrackModal] = useState(false);

  const [mapView, setMapView] = useState("heatmap");
  const [cityStats, setCityStats] = useState({
    total: 0,
    resolved: 0,
    ongoing: 0,
    rejected: 0,
    resolution_rate: 0,
  });
  const [cityStatsLoading, setCityStatsLoading] = useState(true);
  const [cityStatsError, setCityStatsError] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Profile modal
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    profile_image_url: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Selected complaint detail modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Community support and verification
  const [communityComplaints, setCommunityComplaints] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityError, setCommunityError] = useState("");
  const [communityDiscussion, setCommunityDiscussion] = useState(null);
  const [communityActionLoading, setCommunityActionLoading] = useState(false);
  const [communityComment, setCommunityComment] = useState("");
  const [communityFeedbackLoading, setCommunityFeedbackLoading] = useState(false);

  const getToken = () => {
    return localStorage.getItem("access_token");
  };

  const getUser = () => {
    try {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) return null;
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const openProfile = () => {
    setUserMenuOpen(false);
    setProfileError("");
    setPasswordError("");
    setPasswordSuccess("");
    setProfileForm({
      name: user?.name || "",
      phone: user?.phone || "",
      profile_image_url: user?.profile_image_url || "",
    });
    setProfileImageFile(null);
    setProfileImagePreview(user?.profile_image_url || "");
    setPasswordForm({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    setProfileOpen(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      logout();
      return;
    }
    if (!profileForm.name.trim()) {
      setProfileError("Name is required.");
      return;
    }
    try {
      setProfileSaving(true);
      setProfileError("");
      let profileImageUrl = profileForm.profile_image_url.trim() || null;

      if (profileImageFile) {
        const formData = new FormData();
        formData.append("file", profileImageFile);

        const uploadResponse = await axios.post(
          `${API_BASE_URL}/api/auth/profile/photo`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );

        profileImageUrl = uploadResponse.data?.profile_image_url || null;
      }

      const response = await axios.patch(
        `${API_BASE_URL}/api/auth/profile`,
        {
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim() || null,
          profile_image_url: profileImageUrl,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedUser = response.data?.user;
      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
      setSuccess("Profile updated successfully.");
      setProfileOpen(false);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setProfileError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      logout();
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }
    try {
      setPasswordSaving(true);
      setPasswordError("");
      setPasswordSuccess("");
      const response = await axios.patch(
        `${API_BASE_URL}/api/auth/password`,
        {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordSuccess(response.data?.message || "Password changed successfully.");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (err.response?.status === 403) {
          setPasswordError(err.response?.data?.detail || "Password change is not allowed.");
        } else {
          logout();
        }
        return;
      }
      setPasswordError(err.response?.data?.detail || "Failed to change password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      setLeaderboardError("");
      const token = getToken();
      if (!token) return;

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/leaderboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLeaderboard(Array.isArray(response.data?.leaderboard) ? response.data.leaderboard : []);
      setLeaderboardRank(response.data?.current_user_rank ?? null);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setLeaderboardError(err.response?.data?.detail || "Failed to load leaderboard.");
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchRewards = async () => {
    try {
      setRewardsLoading(true);
      setRewardsError("");
      const token = getToken();
      if (!token) return;

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/rewards/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRewardData({
        total_points: Number(response.data?.total_points || 0),
        reward_count: Number(response.data?.reward_count || 0),
        rewards: Array.isArray(response.data?.rewards) ? response.data.rewards : [],
      });
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setRewardsError(err.response?.data?.detail || "Failed to load rewards.");
    } finally {
      setRewardsLoading(false);
    }
  };

  const fetchComplaints = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      setSuccess("");

      const token = getToken();
      const currentUser = getUser();
      if (!token || !currentUser) {
        logout();
        return;
      }
      setUser(currentUser);

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/citizen/${currentUser.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const complaintData = Array.isArray(response.data?.complaints)
        ? response.data.complaints
        : [];
      setComplaints(complaintData);

      if (isRefresh) {
        setSuccess("Complaints refreshed successfully.");
      }

      if (selectedComplaint) {
        const updatedSelected = complaintData.find(
          (c) => c.id === selectedComplaint.id
        );
        if (updatedSelected) {
          setSelectedComplaint(updatedSelected);
        }
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Failed to load complaints. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCityStats = async () => {
    try {
      setCityStatsLoading(true);
      setCityStatsError("");
      const token = getToken();
      if (!token) return;

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/city/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.success) {
        setCityStats(response.data.stats || {});
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setCityStatsError(
        err.response?.data?.detail || "City progress is temporarily unavailable."
      );
    } finally {
      setCityStatsLoading(false);
    }
  };

  const fetchCommunityComplaints = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setCommunityLoading(true);
      setCommunityError("");

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/community`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = Array.isArray(response.data?.complaints)
        ? response.data.complaints
        : Array.isArray(response.data)
        ? response.data
        : [];
      setCommunityComplaints(data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setCommunityError(
        err.response?.data?.detail || "Community complaints are temporarily unavailable."
      );
    } finally {
      setCommunityLoading(false);
    }
  };

  const openCommunityDiscussion = async (complaint) => {
    const token = getToken();
    if (!token) return;

    try {
      setCommunityActionLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/${complaint.id}/community`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCommunityDiscussion({
        complaint,
        ...(response.data || {}),
      });
      setCommunityComment("");
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setCommunityError(
        err.response?.data?.detail || "Unable to load community discussion."
      );
    } finally {
      setCommunityActionLoading(false);
    }
  };

  const refreshCommunityDiscussion = async (complaintId, fallbackComplaint = null) => {
    const token = getToken();
    if (!token) return;

    const response = await axios.get(
      `${API_BASE_URL}/api/complaints/${complaintId}/community`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setCommunityDiscussion({
      complaint:
        fallbackComplaint ||
        communityDiscussion?.complaint ||
        communityComplaints.find((item) => item.id === complaintId),
      ...(response.data || {}),
    });
  };

  const toggleCommunitySupport = async (complaint) => {
    const token = getToken();
    if (!token) return;

    if (String(complaint.citizen_id || complaint.user_id || "") === String(user?.id || "")) {
      setCommunityError("You cannot support your own complaint.");
      return;
    }

    try {
      setCommunityActionLoading(true);
      const isSupported = Boolean(
        complaint.current_user_supported ?? complaint.user_supported
      );

      if (isSupported) {
        await axios.delete(
          `${API_BASE_URL}/api/complaints/${complaint.id}/support`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/api/complaints/${complaint.id}/support`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      await fetchCommunityComplaints();
      if (communityDiscussion?.complaint?.id === complaint.id) {
        await refreshCommunityDiscussion(complaint.id);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setCommunityError(err.response?.data?.detail || "Unable to update support vote.");
    } finally {
      setCommunityActionLoading(false);
    }
  };

  const submitCommunityFeedback = async (complaint, feedbackType) => {
    const token = getToken();
    if (!token) return;

    try {
      setCommunityFeedbackLoading(true);
      await axios.post(
        `${API_BASE_URL}/api/complaints/${complaint.id}/feedback`,
        { feedback_type: feedbackType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchCommunityComplaints();
      if (communityDiscussion?.complaint?.id === complaint.id) {
        await refreshCommunityDiscussion(complaint.id);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setCommunityError(err.response?.data?.detail || "Unable to submit feedback.");
    } finally {
      setCommunityFeedbackLoading(false);
    }
  };

  const removeCommunityFeedback = async (complaint) => {
    const token = getToken();
    if (!token) return;

    try {
      setCommunityFeedbackLoading(true);
      await axios.delete(
        `${API_BASE_URL}/api/complaints/${complaint.id}/feedback`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchCommunityComplaints();
      if (communityDiscussion?.complaint?.id === complaint.id) {
        await refreshCommunityDiscussion(complaint.id);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setCommunityError(err.response?.data?.detail || "Unable to remove feedback.");
    } finally {
      setCommunityFeedbackLoading(false);
    }
  };

  const submitCommunityComment = async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) return;

    const complaintId = communityDiscussion?.complaint?.id;
    const comment = communityComment.trim();
    if (!complaintId || !comment) return;

    try {
      setCommunityActionLoading(true);
      await axios.post(
        `${API_BASE_URL}/api/complaints/${complaintId}/comments`,
        { comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommunityComment("");
      await refreshCommunityDiscussion(complaintId);
      await fetchCommunityComplaints();
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setCommunityError(err.response?.data?.detail || "Unable to add comment.");
    } finally {
      setCommunityActionLoading(false);
    }
  };

  const deleteCommunityComment = async (commentId) => {
    const token = getToken();
    if (!token) return;

    const complaintId = communityDiscussion?.complaint?.id;
    if (!complaintId) return;

    try {
      setCommunityActionLoading(true);
      await axios.delete(
        `${API_BASE_URL}/api/complaints/${complaintId}/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await refreshCommunityDiscussion(complaintId);
      await fetchCommunityComplaints();
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setCommunityError(err.response?.data?.detail || "Unable to delete comment.");
    } finally {
      setCommunityActionLoading(false);
    }
  };

  const getHistory = async (complaintId) => {
    const token = getToken();
    if (!token) return;

    try {
      setHistoryLoading(true);
      setHistoryError("");

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/${complaintId}/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStatusHistory(Array.isArray(response.data?.history) ? response.data.history : []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setHistoryError(err.response?.data?.detail || "Failed to load complaint status history.");
      setStatusHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openComplaintDetails = async (complaint) => {
    setSelectedComplaint(complaint);
    setStatusHistory([]);
    setHistoryError("");
    await getHistory(complaint.id);
  };

  const closeComplaintDetails = () => {
    setSelectedComplaint(null);
    setStatusHistory([]);
    setHistoryError("");
  };

  const trackComplaintById = async () => {
    const query = complaintSearch.trim();
    if (!query) {
      setTrackMessage("Please enter a complaint ID or complaint code.");
      return;
    }

    setTrackingComplaint(true);
    setTrackMessage("");

    try {
      const normalizedQuery = query.toLowerCase();
      const localComplaint = complaints.find(
        (c) =>
          String(c.id || "").toLowerCase() === normalizedQuery ||
          String(c.complaint_code || "").toLowerCase() === normalizedQuery
      );

      if (localComplaint) {
        setShowTrackModal(false);
        setComplaintSearch("");
        await openComplaintDetails(localComplaint);
        return;
      }

      const token = getToken();
      if (!token) {
        logout();
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const complaint = response.data?.complaint;
      if (complaint) {
        setComplaints((current) => {
          const exists = current.some((item) => item.id === complaint.id);
          return exists ? current : [complaint, ...current];
        });
        setShowTrackModal(false);
        setComplaintSearch("");
        await openComplaintDetails(complaint);
      } else {
        setTrackMessage("Complaint not found.");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        return;
      }
      if (err.response?.status === 403) {
        setTrackMessage("You can only track complaints submitted from your account.");
      } else if (err.response?.status === 404) {
        setTrackMessage("No complaint was found with this ID.");
      } else {
        setTrackMessage(err.response?.data?.detail || "Unable to track complaint.");
      }
    } finally {
      setTrackingComplaint(false);
    }
  };

  // Lifecycle boot
  useEffect(() => {
    const token = getToken();
    const currentUser = getUser();

    if (!token || !currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    if (currentUser.role !== "citizen") {
      if (currentUser.role === "worker") {
        navigate("/worker/dashboard", { replace: true });
      } else if (currentUser.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        logout();
      }
      return;
    }

    setUser(currentUser);

    const loadDashboardData = async () => {
      await fetchComplaints();
      await fetchRewards();
      await fetchLeaderboard();
      await fetchCityStats();
      await fetchCommunityComplaints();
    };

    loadDashboardData();
  }, []);

  // Filtered complaints calculations
  const filteredComplaints = useMemo(() => {
    const search = complaintFilterSearch.trim().toLowerCase();
    const now = new Date();

    return [...complaints]
      .filter((complaint) => {
        if (search) {
          const haystack = [
            complaint.title,
            complaint.description,
            complaint.complaint_code,
            complaint.id,
            complaint.categories?.name,
            complaint.location,
            complaint.address,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          if (!haystack.includes(search)) return false;
        }

        if (statusFilter !== "All" && complaint.status !== statusFilter) return false;

        const categoryName = complaint.categories?.name || "Not specified";
        if (categoryFilter !== "All" && categoryName !== categoryFilter) return false;

        if (priorityFilter !== "All" && (complaint.priority || "Normal") !== priorityFilter) return false;

        if (dateFilter !== "All" && complaint.created_at) {
          const created = new Date(complaint.created_at);
          const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
          const cutoff = new Date(now);
          cutoff.setDate(cutoff.getDate() - days);
          if (created < cutoff) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [complaints, complaintFilterSearch, statusFilter, categoryFilter, priorityFilter, dateFilter]);

  // Status counters
  const totalCount = complaints.length;
  const submittedCount = complaints.filter((c) => c.status === "Submitted").length;
  const ongoingCount = complaints.filter(
    (c) => !["resolved", "rejected"].includes(String(c.status || "").toLowerCase())
  ).length;
  const resolvedCount = complaints.filter(
    (c) => String(c.status || "").toLowerCase() === "resolved"
  ).length;
  const rejectedCount = complaints.filter(
    (c) => String(c.status || "").toLowerCase() === "rejected"
  ).length;

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return date;
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return "";
    try {
      const created = new Date(date);
      const now = new Date();
      const diffSec = Math.floor((now - created) / 1000);
      if (diffSec < 60) return "Just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`;
      return created.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "resolved") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
          Resolved
        </span>
      );
    }
    if (s === "in progress" || s === "assigned") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          In Progress
        </span>
      );
    }
    if (s === "submitted" || s === "verified") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
          Submitted
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
        {status}
      </span>
    );
  };

  const getRewardLevel = (points) => {
    if (points >= 100) return { name: "Civic Champion", nextPoints: null, icon: Trophy };
    if (points >= 50) return { name: "Civic Helper", nextPoints: 100, icon: Award };
    if (points >= 25) return { name: "Civic Starter", nextPoints: 50, icon: Star };
    return { name: "New Citizen", nextPoints: 25, icon: Star };
  };

  const rewardLevel = getRewardLevel(rewardData.total_points);

  const achievementBadges = useMemo(() => {
    const sub = complaints.length;
    const res = resolvedCount;
    const pts = Number(rewardData.total_points || 0);

    return [
      { id: "1", title: "First Report", desc: "Submit 1 civic issue", unlocked: sub >= 1, icon: MapPin },
      { id: "2", title: "Civic Starter", desc: "Submit 5 civic issues", unlocked: sub >= 5, icon: Award },
      { id: "3", title: "Civic Contributor", desc: "Submit 10 civic issues", unlocked: sub >= 10, icon: Trophy },
      { id: "4", title: "Community Helper", desc: "3 issues resolved", unlocked: res >= 3, icon: CheckCircle2 },
      { id: "5", title: "Civic Champion", desc: "100+ reward points", unlocked: pts >= 100, icon: Star },
    ];
  }, [complaints.length, resolvedCount, rewardData.total_points]);

  const mapComplaints = complaints
    .map((c) => ({
      ...c,
      latitude: Number(c.latitude ?? c.lat),
      longitude: Number(c.longitude ?? c.lng ?? c.lon),
    }))
    .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));

  const mapCenter = mapComplaints.length
    ? [mapComplaints[0].latitude, mapComplaints[0].longitude]
    : [19.076, 72.8777];

  const getAssignedWorkerName = (c) => {
    if (c?.workers?.users?.name) return c.workers.users.name;
    if (c?.workers?.worker_code) return c.workers.worker_code;
    return "Not assigned yet";
  };

  const userInitials = (user?.name || "Citizen")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* ============================================================ */}
      {/* 1. TOP NAVBAR (Matches Reference Screen 2 & Screen 6)         */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Portal Branding */}
          <div
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-full p-0.5 bg-white ring-2 ring-blue-100 shadow-sm flex items-center justify-center overflow-hidden">
              <img
                src={smartCityLogo}
                alt="Smart City Portal"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="font-black text-slate-900 tracking-tight text-base sm:text-lg leading-tight group-hover:text-blue-600 transition">
                SMART CITY
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Complaint Portal
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab("home")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                activeTab === "home"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab("complaints")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                activeTab === "complaints"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              My Complaints
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                activeTab === "map"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setActiveTab("community")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                activeTab === "community"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Community
            </button>
            <button
              onClick={() => setActiveTab("rewards")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                activeTab === "rewards"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Leaderboard
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Quick Track Button */}
            <button
              onClick={() => setShowTrackModal(true)}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-xl transition border border-slate-200"
              title="Track by ID or Code"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track Issue</span>
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Profile Pill */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 border border-slate-200 transition"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm overflow-hidden">
                  {user?.profile_image_url ? (
                    <img
                      src={user.profile_image_url}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userInitials
                  )}
                </div>
                <span className="text-sm font-bold text-slate-800 hidden sm:inline">
                  {user?.name?.split(" ")[0] || "Citizen"}
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    userMenuOpen ? "rotate-90" : ""
                  }`}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-800">{user?.name || "Citizen"}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={openProfile}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition"
                  >
                    <UserRound className="w-4 h-4 text-blue-600" />
                    Edit Profile
                  </button>
                  <button
                    onClick={openProfile}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition"
                  >
                    <Pencil className="w-4 h-4 text-teal-600" />
                    Change Password
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={logout}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition"
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-24 lg:pb-8 space-y-6">
        {/* Banner Feedback Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError("")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1">{success}</div>
            <button onClick={() => setSuccess("")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: HOME VIEW (Direct Match to Screen 2 in Reference)    */}
        {/* ============================================================ */}
        {activeTab === "home" && (
          <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Hero Welcome Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="max-w-xl z-10 text-center md:text-left">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Hello, {user?.name?.split(" ")[0] || "Citizen"} 👋
                </h1>
                <p className="text-slate-500 text-sm sm:text-base mt-2 font-medium">
                  Help make your city better. Report issues and track their progress in real-time.
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6">
                  <button
                    onClick={() => navigate("/citizen/complaints/new")}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-md hover:shadow-blue-500/25 transition duration-150 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Report a Problem</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("complaints")}
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-3.5 rounded-2xl transition text-sm"
                  >
                    <ListChecks className="w-4 h-4" />
                    <span>View All Complaints</span>
                  </button>
                </div>
              </div>

              {/* City Graphic Accent */}
              <div className="w-full md:w-80 h-40 sm:h-48 rounded-2xl bg-gradient-to-tr from-blue-100/80 via-emerald-100/60 to-amber-100/70 p-4 flex items-center justify-center relative overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 opacity-80 flex items-center justify-center">
                  <img
                    src={smartCityLogo}
                    alt="City Skyline"
                    className="w-32 h-32 object-contain opacity-90 drop-shadow-md"
                  />
                </div>
                <div className="absolute bottom-2 left-3 right-3 text-center bg-white/80 backdrop-blur-sm rounded-xl py-1 text-[11px] font-bold text-slate-700 shadow-sm">
                  Active Civic Monitoring
                </div>
              </div>
            </div>

            {/* 4 Metrics Cards Row (Direct Match to Screen 2) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Total Complaints */}
              <div
                onClick={() => {
                  setStatusFilter("All");
                  setActiveTab("complaints");
                }}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <ListChecks className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {totalCount}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                    Total Complaints
                  </div>
                </div>
              </div>

              {/* In Progress */}
              <div
                onClick={() => {
                  setStatusFilter("In Progress");
                  setActiveTab("complaints");
                }}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:border-amber-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <Clock3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {ongoingCount}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                    In Progress
                  </div>
                </div>
              </div>

              {/* Resolved */}
              <div
                onClick={() => {
                  setStatusFilter("Resolved");
                  setActiveTab("complaints");
                }}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:border-emerald-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {resolvedCount}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                    Resolved
                  </div>
                </div>
              </div>

              {/* Reward Points */}
              <div
                onClick={() => setActiveTab("rewards")}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:border-purple-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {rewardData.total_points}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                    Reward Points
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Complaints Section (Direct Match to Screen 2) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Recent Complaints
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Latest issues reported from your account
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("complaints")}
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition"
                >
                  <span>View All</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {complaints.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <p className="text-base font-bold text-slate-800">No complaints reported yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Spot an issue in your neighborhood? Report it to city workers.
                  </p>
                  <button
                    onClick={() => navigate("/citizen/complaints/new")}
                    className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    + Report First Problem
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {complaints.slice(0, 4).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => openComplaintDetails(c)}
                      className="group flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {c.photo_url ? (
                            <img
                              src={c.photo_url}
                              alt={c.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                          ) : (
                            <Wrench className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        {/* Info */}
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
                            {c.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{c.address || c.categories?.name || "Civic location"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Meta */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                          {getTimeAgo(c.created_at)}
                        </span>
                        {getStatusBadge(c.status)}
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* City Wide Statistics Banner */}
            <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                  Municipal Progress
                </span>
                <h3 className="text-xl sm:text-2xl font-bold mt-1">
                  City-Wide Grievance Resolution
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md">
                  Active municipal teams are resolving community issues across all wards.
                </p>
              </div>

              <div className="flex items-center gap-6 sm:gap-10 text-center flex-shrink-0">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    {cityStats.total || 0}
                  </div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">City Total</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                    {cityStats.resolved || 0}
                  </div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Resolved</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-blue-400">
                    {cityStats.resolution_rate || 0}%
                  </div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Rate</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: MY COMPLAINTS VIEW (Direct Match to Screen 6)         */}
        {/* ============================================================ */}
        {activeTab === "complaints" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  My Complaints
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  View and track all your submitted complaints.
                </p>
              </div>
              <button
                onClick={() => navigate("/citizen/complaints/new")}
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow text-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Report Problem</span>
              </button>
            </div>

            {/* Filter Pills & Search (Screen 6) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: "All", count: totalCount, value: "All" },
                  { label: "Submitted", count: submittedCount, value: "Submitted" },
                  { label: "In Progress", count: ongoingCount, value: "In Progress" },
                  { label: "Resolved", count: resolvedCount, value: "Resolved" },
                  { label: "Rejected", count: rejectedCount, value: "Rejected" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                      statusFilter === tab.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        statusFilter === tab.value ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={complaintFilterSearch}
                  onChange={(e) => setComplaintFilterSearch(e.target.value)}
                  placeholder="Search by title, location, category, or code..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Complaints List (Screen 6) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
              {filteredComplaints.length === 0 ? (
                <div className="py-16 text-center">
                  <SearchX className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-base font-bold text-slate-800">No complaints match your filter</p>
                  <p className="text-xs text-slate-500 mt-1">Try resetting the status filter or search keyword.</p>
                  <button
                    onClick={() => {
                      setStatusFilter("All");
                      setComplaintFilterSearch("");
                    }}
                    className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredComplaints.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => openComplaintDetails(c)}
                      className="group flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        {/* Thumbnail */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {c.photo_url ? (
                            <img
                              src={c.photo_url}
                              alt={c.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                          ) : (
                            <Wrench className="w-6 h-6 text-slate-400" />
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
                            {c.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{c.address || c.categories?.name || "Location"}</span>
                            </span>
                            {c.complaint_code && (
                              <span className="text-slate-400 font-mono text-[11px]">
                                #{c.complaint_code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Date & Status Pill */}
                      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                        <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                          {getTimeAgo(c.created_at)}
                        </span>
                        {getStatusBadge(c.status)}
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: INTERACTIVE MAP VIEW                                  */}
        {/* ============================================================ */}
        {activeTab === "map" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Civic Map
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Geographic visualization of civic complaints in your area.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mapped Issues: {mapComplaints.length}
                </span>
                <span className="text-xs text-slate-500">Click any marker to inspect details</span>
              </div>

              <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-slate-200 relative">
                <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <CitizenMapBounds points={mapComplaints} />
                  {mapComplaints.map((c) => (
                    <CircleMarker
                      key={c.id}
                      center={[c.latitude, c.longitude]}
                      radius={9}
                      pathOptions={{
                        color:
                          c.status === "Resolved"
                            ? "#10B981"
                            : c.status === "In Progress"
                            ? "#F59E0B"
                            : "#3B82F6",
                        fillColor:
                          c.status === "Resolved"
                            ? "#10B981"
                            : c.status === "In Progress"
                            ? "#F59E0B"
                            : "#3B82F6",
                        fillOpacity: 0.8,
                      }}
                    >
                      <Popup>
                        <div className="p-1 space-y-1">
                          <p className="font-bold text-slate-900 text-sm">{c.title}</p>
                          <p className="text-xs text-slate-500">{c.address || c.categories?.name}</p>
                          <div className="pt-2">
                            <button
                              onClick={() => openComplaintDetails(c)}
                              className="text-xs font-bold text-blue-600 hover:underline"
                            >
                              Open Complaint Details &rarr;
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: COMMUNITY ENGAGEMENT FEED                             */}
        {/* ============================================================ */}
        {activeTab === "community" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Community Feed
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Support, verify, and discuss neighborhood issues submitted by fellow citizens.
              </p>
            </div>

            {communityLoading ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-slate-500">Loading community issues...</p>
              </div>
            ) : communityComplaints.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
                <p className="font-bold text-slate-800">No community complaints found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {communityComplaints.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                          {item.categories?.name || "Civic Issue"}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                      <h3 className="font-bold text-base text-slate-900 line-clamp-1">{item.title}</h3>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3">
                        <Clock3 className="w-3.5 h-3.5" />
                        <span>{getTimeAgo(item.created_at)}</span>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-slate-100 mt-5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Support / Upvote */}
                        <button
                          onClick={() => toggleCommunitySupport(item)}
                          disabled={communityActionLoading}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            Boolean(item.current_user_supported ?? item.user_supported)
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{item.support_count || 0}</span>
                        </button>

                        {/* Genuine Feedback */}
                        <button
                          onClick={() =>
                            item.user_feedback === "genuine"
                              ? removeCommunityFeedback(item)
                              : submitCommunityFeedback(item, "genuine")
                          }
                          disabled={communityFeedbackLoading}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                            item.user_feedback === "genuine"
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                          title="Verify as genuine"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{item.genuine_count || 0}</span>
                        </button>
                      </div>

                      {/* Discussion Trigger */}
                      <button
                        onClick={() => openCommunityDiscussion(item)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 p-1"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{item.comment_count || 0} Comments</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: CIVIC REWARDS & LEADERBOARD                           */}
        {/* ============================================================ */}
        {activeTab === "rewards" && (
          <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Civic Leaderboard &amp; Rewards
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Earn recognition and points for reporting and verifying community issues.
              </p>
            </div>

            {/* Achievement Badges Grid */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Your Civic Achievements</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {achievementBadges.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={badge.id}
                      className={`rounded-2xl p-4 border text-center transition ${
                        badge.unlocked
                          ? "bg-emerald-50/50 border-emerald-200 shadow-sm"
                          : "bg-slate-50 border-slate-200 opacity-60"
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-2 ${
                          badge.unlocked
                            ? "bg-emerald-600 text-white shadow"
                            : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-xs text-slate-900">{badge.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{badge.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Top Citizen Contributors</h2>
              {leaderboardLoading ? (
                <div className="py-8 text-center text-slate-500">Loading leaderboard...</div>
              ) : leaderboard.length === 0 ? (
                <div className="py-8 text-center text-slate-500">No leaderboard entries found.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {leaderboard.map((c, i) => (
                    <div
                      key={c.user_id || i}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                            i === 0
                              ? "bg-amber-100 text-amber-700"
                              : i === 1
                              ? "bg-slate-200 text-slate-700"
                              : i === 2
                              ? "bg-orange-100 text-orange-700"
                              : "text-slate-400"
                          }`}
                        >
                          #{i + 1}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{c.name || "Citizen"}</p>
                          <p className="text-[11px] text-slate-400">{c.complaints_resolved || 0} resolved</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-sm text-purple-600">
                          {c.total_points || 0} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* 2. COMPLAINT DETAILS MODAL (Direct Match to Screen 7)        */}
      {/* ============================================================ */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          onClick={closeComplaintDetails}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 transition-all"
          >
            {/* Modal Header & Breadcrumb (Screen 7) */}
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 p-5 sm:p-6 flex items-center justify-between z-10">
              <div>
                <p className="text-xs font-semibold text-slate-400">
                  My Complaints &gt; <span className="text-blue-600 font-bold">Complaint Details</span>
                </p>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                  {selectedComplaint.title}
                </h3>
              </div>
              <button
                onClick={closeComplaintDetails}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Photo hero if available */}
              {selectedComplaint.photo_url && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-72 bg-slate-100">
                  <img
                    src={selectedComplaint.photo_url}
                    alt={selectedComplaint.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Status & Code */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 font-mono">
                    #{selectedComplaint.complaint_code || selectedComplaint.id}
                  </span>
                  <div className="mt-1">{getStatusBadge(selectedComplaint.status)}</div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>Submitted</div>
                  <div className="font-bold text-slate-800">{formatDate(selectedComplaint.created_at)}</div>
                </div>
              </div>

              {/* Description & Location */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-white border border-slate-200/70 p-4 rounded-2xl">
                  {selectedComplaint.description}
                </p>
                {selectedComplaint.address && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>{selectedComplaint.address}</span>
                  </div>
                )}
              </div>

              {/* Assigned Worker Info */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Assigned Municipal Worker</p>
                    <p className="text-sm font-bold text-slate-900">
                      {getAssignedWorkerName(selectedComplaint)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vertical Lifecycle Status Timeline (Direct Match to Screen 7) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Status Timeline
                </h4>

                {historyLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
                    Loading timeline...
                  </div>
                ) : statusHistory.length === 0 ? (
                  <div className="py-4 text-xs text-slate-400 text-center">
                    No status updates recorded yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {statusHistory.map((h, i) => (
                      <div key={h.id || i} className="relative">
                        <div
                          className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                            h.new_status === "Resolved"
                              ? "bg-emerald-500"
                              : h.new_status === "In Progress"
                              ? "bg-amber-500"
                              : "bg-blue-600"
                          }`}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{h.new_status}</p>
                          <p className="text-[11px] text-slate-400">{formatDate(h.created_at)}</p>
                          {h.remarks && (
                            <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                              {h.remarks}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. TRACK COMPLAINT BY ID MODAL                               */}
      {/* ============================================================ */}
      {showTrackModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg text-slate-900">Track Civic Issue</h3>
              <button
                onClick={() => setShowTrackModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Enter your complaint UUID or complaint reference code (e.g. #CMP-...)
            </p>
            <div className="space-y-4">
              <input
                type="text"
                value={complaintSearch}
                onChange={(e) => setComplaintSearch(e.target.value)}
                placeholder="Enter complaint ID or code..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {trackMessage && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {trackMessage}
                </p>
              )}
              <button
                onClick={trackComplaintById}
                disabled={trackingComplaint}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {trackingComplaint ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Track Progress"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. EDIT PROFILE & PASSWORD MODAL                             */}
      {/* ============================================================ */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-xl text-slate-900">Citizen Profile Settings</h3>
              <button
                onClick={() => setProfileOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {profileError && (
              <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-xl text-xs">{profileError}</div>
            )}
            {passwordError && (
              <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-xl text-xs">{passwordError}</div>
            )}
            {passwordSuccess && (
              <div className="mb-4 bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs">
                {passwordSuccess}
              </div>
            )}

            {/* Profile Info Form */}
            <form onSubmit={saveProfile} className="space-y-4 mb-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Personal Information
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Profile Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setProfileImageFile(e.target.files[0]);
                      setProfileImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="text-xs text-slate-500"
                />
                {profileImagePreview && (
                  <img
                    src={profileImagePreview}
                    alt="Preview"
                    className="w-12 h-12 rounded-full mt-2 object-cover border"
                  />
                )}
              </div>
              <button
                type="submit"
                disabled={profileSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                {profileSaving ? "Saving Profile..." : "Update Profile"}
              </button>
            </form>

            {/* Password Change Form */}
            <form onSubmit={changePassword} className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Change Password
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, current_password: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, new_password: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm"
                  placeholder="Min 8 characters"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={passwordSaving}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                {passwordSaving ? "Updating Password..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. COMMUNITY COMMENTS DRAWER                                 */}
      {/* ============================================================ */}
      {communityDiscussion && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end"
          onClick={() => setCommunityDiscussion(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-6 animate-slideLeft"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="font-extrabold text-base text-slate-900">Community Discussion</h3>
                <button
                  onClick={() => setCommunityDiscussion(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-3">
                <p className="font-bold text-sm text-slate-900">
                  {communityDiscussion.complaint?.title}
                </p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {communityDiscussion.complaint?.description}
                </p>
              </div>

              {/* Comments list */}
              <div className="mt-5 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {(communityDiscussion.comments || []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No comments yet. Start the conversation.
                  </p>
                ) : (
                  (communityDiscussion.comments || []).map((cm) => (
                    <div key={cm.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{cm.users?.name || "Citizen"}</span>
                        <span className="text-[10px] text-slate-400">{getTimeAgo(cm.created_at)}</span>
                      </div>
                      <p className="text-slate-700 mt-1">{cm.comment}</p>
                      {String(cm.user_id) === String(user?.id) && (
                        <button
                          onClick={() => deleteCommunityComment(cm.id)}
                          className="text-[10px] text-red-500 hover:underline mt-1 font-semibold"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Comment input form */}
            <form onSubmit={submitCommunityComment} className="pt-4 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={communityComment}
                onChange={(e) => setCommunityComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={communityActionLoading || !communityComment.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. MOBILE BOTTOM NAVIGATION (Matches Reference Screen 8)    */}
      {/* ============================================================ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-2 flex items-center justify-around text-slate-600">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activeTab === "home" ? "text-blue-600" : "text-slate-500"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </button>
        <button
          onClick={() => setActiveTab("complaints")}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activeTab === "complaints" ? "text-blue-600" : "text-slate-500"
          }`}
        >
          <ListChecks className="w-5 h-5" />
          <span>Complaints</span>
        </button>
        <button
          onClick={() => navigate("/citizen/complaints/new")}
          className="flex flex-col items-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-slate-700 mt-1">Report</span>
        </button>
        <button
          onClick={() => setActiveTab("map")}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            activeTab === "map" ? "text-blue-600" : "text-slate-500"
          }`}
        >
          <MapIcon className="w-5 h-5" />
          <span>Map</span>
        </button>
        <button
          onClick={openProfile}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-500"
        >
          <UserRound className="w-5 h-5" />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}

export default CitizenDashboard;
