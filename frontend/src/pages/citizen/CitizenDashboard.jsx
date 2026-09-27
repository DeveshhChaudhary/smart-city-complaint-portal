import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  Award,
  BarChart3,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  LogOut,
  MapPin,
  RefreshCw,
  UserRound,
  Pencil,
  Trophy,
  Star,
  Wrench,
  X,
  XCircle,
  LayoutDashboard,
  ListChecks,
  Map,
  Gift,
  Search,
  SearchX,
  ThumbsUp,
  MessageCircle,
  Check,
  Flag,
} from "lucide-react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import NotificationBell from "../../components/NotificationBell";

const API_BASE_URL = "http://127.0.0.1:8000";

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

  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [rewardData, setRewardData] = useState({
    total_points: 0,
    reward_count: 0,
    rewards: [],
  });
  const [rewardsLoading, setRewardsLoading] = useState(true);
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

  const [rewardsError, setRewardsError] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Feature 9E — Community Support & Verification
  const [communityComplaints, setCommunityComplaints] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityError, setCommunityError] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityDiscussion, setCommunityDiscussion] = useState(null);
  const [communityActionLoading, setCommunityActionLoading] = useState(false);
  const [communityComment, setCommunityComment] = useState("");
  const [communityFeedbackLoading, setCommunityFeedbackLoading] = useState(false);

  const [statusHistory, setStatusHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const getToken = () => {
    return localStorage.getItem("access_token");
  };

  const getUser = () => {
    try {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        return null;
      }

      return JSON.parse(savedUser);
    } catch (error) {
      console.error("Failed to read saved user:", error);
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/login", { replace: true });
  };

  const openProfile = () => {
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
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        return;
      }
      setProfileError(error.response?.data?.detail || "Failed to update profile.");
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
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        if (error.response?.status === 403) {
          setPasswordError(error.response?.data?.detail || "Password change is not allowed.");
        } else {
          logout();
        }
        return;
      }
      setPasswordError(error.response?.data?.detail || "Failed to change password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      setLeaderboardError("");

      const token = getToken();

      if (!token) {
        logout();
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/leaderboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setLeaderboard(
        Array.isArray(response.data?.leaderboard)
          ? response.data.leaderboard
          : []
      );

      setLeaderboardRank(
        response.data?.current_user_rank ?? null
      );
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        logout();
        return;
      }

      setLeaderboardError(
        error.response?.data?.detail ||
          "Failed to load leaderboard."
      );
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchRewards = async () => {
    try {
      setRewardsLoading(true);
      setRewardsError("");

      const token = getToken();
      const currentUser = getUser();

      if (!token || !currentUser) {
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/rewards/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setRewardData({
        total_points: Number(response.data?.total_points || 0),
        reward_count: Number(response.data?.reward_count || 0),
        rewards: Array.isArray(response.data?.rewards)
          ? response.data.rewards
          : [],
      });
    } catch (error) {
      console.error("Failed to fetch rewards:", error);

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        logout();
        return;
      }

      setRewardsError(
        error.response?.data?.detail ||
          "Failed to load rewards."
      );
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
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const complaintData = Array.isArray(
        response.data?.complaints
      )
        ? response.data.complaints
        : [];

      setComplaints(complaintData);

      if (isRefresh) {
        setSuccess("Complaints refreshed successfully.");
      }

      if (selectedComplaint) {
        const updatedSelected = complaintData.find(
          (complaint) =>
            complaint.id === selectedComplaint.id
        );

        if (updatedSelected) {
          setSelectedComplaint(updatedSelected);
        }
      }
    } catch (error) {
      console.error("Failed to fetch complaints:", error);

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        logout();
        return;
      }

      setError(
        error.response?.data?.detail ||
          error.response?.data?.message ||
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
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        setCityStats(response.data.stats || {});
      }
    } catch (error) {
      console.error("Failed to fetch city statistics:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        return;
      }

      setCityStatsError(
        error.response?.data?.detail ||
          "City progress is temporarily unavailable."
      );
    } finally {
      setCityStatsLoading(false);
    }
  };

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
    fetchComplaints();
    fetchRewards();
    fetchLeaderboard();
    fetchCityStats();
    fetchCommunityComplaints();
  }, []);

  const totalComplaints = complaints.length;

  const activeComplaints = complaints.filter(
    (complaint) =>
      complaint.status !== "Resolved" &&
      complaint.status !== "Rejected"
  ).length;

  const resolvedComplaints = complaints.filter(
    (complaint) => complaint.status === "Resolved"
  ).length;

  const rejectedComplaints = complaints.filter(
    (complaint) => complaint.status === "Rejected"
  ).length;

  const getStatusClass = (status) => {
    switch (status) {
      case "Submitted":
        return "bg-blue-100 text-blue-700";

      case "Verified":
        return "bg-purple-100 text-purple-700";

      case "Assigned":
        return "bg-yellow-100 text-yellow-700";

      case "In Progress":
        return "bg-orange-100 text-orange-700";

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
        return "bg-blue-500";

      case "Verified":
        return "bg-purple-500";

      case "Assigned":
        return "bg-yellow-500";

      case "In Progress":
        return "bg-orange-500";

      case "Resolved":
        return "bg-green-500";

      case "Rejected":
        return "bg-red-500";

      default:
        return "bg-gray-400";
    }
  };

  const getHistoryStatusClass = (status) => {
    switch (status) {
      case "Submitted":
        return "bg-blue-100 text-blue-700 border-blue-200";

      case "Verified":
        return "bg-purple-100 text-purple-700 border-purple-200";

      case "Assigned":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";

      case "In Progress":
        return "bg-orange-100 text-orange-700 border-orange-200";

      case "Resolved":
        return "bg-green-100 text-green-700 border-green-200";

      case "Rejected":
        return "bg-red-100 text-red-700 border-red-200";

      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    try {
      return new Date(date).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return date;
    }
  };

  const getAssignedWorkerName = (complaint) => {
    if (complaint?.workers?.users?.name) {
      return complaint.workers.users.name;
    }

    if (complaint?.workers?.worker_code) {
      return complaint.workers.worker_code;
    }

    return "Not assigned yet";
  };

  const getAssignedWorkerDepartment = (complaint) => {
    return complaint?.workers?.department || null;
  };

  const getAssignedWorkerSpecialization = (complaint) => {
    return complaint?.workers?.specialization || null;
  };


  const fetchCommunityComplaints = async () => {
    const token = getToken();
    if (!token) {
      logout();
      return;
    }

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
    } catch (error) {
      console.error("Failed to fetch community complaints:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        return;
      }

      setCommunityError(
        error.response?.data?.detail ||
          "Community complaints are temporarily unavailable."
      );
    } finally {
      setCommunityLoading(false);
    }
  };

  const openCommunityDiscussion = async (complaint) => {
    const token = getToken();
    if (!token) {
      logout();
      return;
    }

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
    } catch (error) {
      console.error("Failed to load community discussion:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        return;
      }

      setCommunityError(
        error.response?.data?.detail ||
          "Unable to load the community discussion."
      );
    } finally {
      setCommunityActionLoading(false);
    }
  };

  const refreshCommunityDiscussion = async (complaintId, fallbackComplaint = null) => {
    const token = getToken();
    if (!token) {
      logout();
      return;
    }

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
    if (!token) {
      logout();
      return;
    }

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
    } catch (error) {
      console.error("Failed to update support vote:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        return;
      }

      setCommunityError(
        error.response?.data?.detail ||
          "Unable to update your support vote."
      );
    } finally {
      setCommunityActionLoading(false);
    }
  };

  const submitCommunityFeedback = async (complaint, feedbackType) => {
    const token = getToken();
    if (!token) {
      logout();
      return;
    }

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
    } catch (error) {
      console.error("Failed to submit community feedback:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        return;
      }

      setCommunityError(
        error.response?.data?.detail ||
          "Unable to submit community feedback."
      );
    } finally {
      setCommunityFeedbackLoading(false);
    }
  };

  const removeCommunityFeedback = async (complaint) => {
    const token = getToken();
    if (!token) {
      logout();
      return;
    }

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
    } catch (error) {
      console.error("Failed to remove community feedback:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        return;
      }

      setCommunityError(
        error.response?.data?.detail ||
          "Unable to remove your community feedback."
      );
    } finally {
      setCommunityFeedbackLoading(false);
    }
  };

  const submitCommunityComment = async (event) => {
    event.preventDefault();

    const token = getToken();
    if (!token) {
      logout();
      return;
    }

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
    } catch (error) {
      console.error("Failed to add community comment:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        return;
      }

      setCommunityError(
        error.response?.data?.detail ||
          "Unable to add your comment."
      );
    } finally {
      setCommunityActionLoading(false);
    }
  };

  const deleteCommunityComment = async (commentId) => {
    const token = getToken();
    if (!token) {
      logout();
      return;
    }

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
    } catch (error) {
      console.error("Failed to delete community comment:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        return;
      }

      setCommunityError(
        error.response?.data?.detail ||
          "Unable to delete the comment."
      );
    } finally {
      setCommunityActionLoading(false);
    }
  };

  const getHistory = async (complaintId) => {
    const token = getToken();

    if (!token) {
      logout();
      return;
    }

    try {
      setHistoryLoading(true);
      setHistoryError("");

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/${complaintId}/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStatusHistory(
        Array.isArray(response.data?.history)
          ? response.data.history
          : []
      );
    } catch (error) {
      console.error(
        "Failed to fetch complaint history:",
        error
      );

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        logout();
        return;
      }

      setHistoryError(
        error.response?.data?.detail ||
          "Failed to load complaint status history."
      );

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

  const complaintCategories = useMemo(() => {
    return [...new Set(complaints.map((complaint) => complaint.categories?.name).filter(Boolean))].sort();
  }, [complaints]);

  const activeComplaintFilters = [
    complaintFilterSearch.trim(),
    statusFilter !== "All" ? statusFilter : "",
    categoryFilter !== "All" ? categoryFilter : "",
    priorityFilter !== "All" ? priorityFilter : "",
    dateFilter !== "All" ? dateFilter : "",
  ].filter(Boolean).length;

  const clearComplaintFilters = () => {
    setComplaintFilterSearch("");
    setStatusFilter("All");
    setCategoryFilter("All");
    setPriorityFilter("All");
    setDateFilter("All");
  };

  const trackComplaintById = async () => {
    const query = complaintSearch.trim();

    if (!query) {
      setTrackMessage("Enter a complaint ID or complaint code.");
      return;
    }

    setTrackingComplaint(true);
    setTrackMessage("");

    try {
      const normalizedQuery = query.toLowerCase();

      // First check the complaints already loaded for this citizen.
      const localComplaint = complaints.find((complaint) =>
        String(complaint.id || "").toLowerCase() === normalizedQuery ||
        String(complaint.complaint_code || "").toLowerCase() === normalizedQuery
      );

      if (localComplaint) {
        await openComplaintDetails(localComplaint);
        setTrackMessage("");
        return;
      }

      // If a UUID was entered, ask the protected backend endpoint for the complaint.
      // The backend still enforces that citizens can only access their own complaints.
      const token = getToken();
      if (!token) {
        logout();
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const complaint = response.data?.complaint;

      if (complaint) {
        setComplaints((current) => {
          const exists = current.some((item) => item.id === complaint.id);
          return exists ? current : [complaint, ...current];
        });
        await openComplaintDetails(complaint);
      } else {
        setTrackMessage("Complaint not found.");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        return;
      }

      if (error.response?.status === 403) {
        setTrackMessage("You can only track complaints submitted from your account.");
      } else if (error.response?.status === 404) {
        setTrackMessage("No complaint was found with this ID.");
      } else {
        setTrackMessage(
          error.response?.data?.detail ||
            "Unable to track this complaint. Please check the ID and try again."
        );
      }
    } finally {
      setTrackingComplaint(false);
    }
  };

  const currentHistoryIndex = useMemo(() => {
    if (
      !selectedComplaint ||
      statusHistory.length === 0
    ) {
      return -1;
    }

    return statusHistory.length - 1;
  }, [selectedComplaint, statusHistory]);

  const getCurrentStatusDescription = (status) => {
    switch (status) {
      case "Submitted":
        return "Your complaint has been submitted and is waiting for review.";

      case "Verified":
        return "Your complaint has been verified by the administrator.";

      case "Assigned":
        return "Your complaint has been assigned to a city worker.";

      case "In Progress":
        return "The assigned worker is currently working on your complaint.";

      case "Resolved":
        return "Your complaint has been marked as resolved.";

      case "Rejected":
        return "Your complaint has been rejected. Check the timeline for remarks.";

      default:
        return "Your complaint status has been updated.";
    }
  };

  const getRewardLevel = (points) => {
    if (points >= 100) {
      return {
        name: "Civic Champion",
        description: "100+ points earned",
        nextPoints: null,
        icon: Trophy,
      };
    }

    if (points >= 50) {
      return {
        name: "Civic Helper",
        description: "50+ points earned",
        nextPoints: 100,
        icon: Award,
      };
    }

    if (points >= 25) {
      return {
        name: "Civic Starter",
        description: "25+ points earned",
        nextPoints: 50,
        icon: Star,
      };
    }

    return {
      name: "New Citizen",
      description: "Start earning civic points",
      nextPoints: 25,
      icon: Star,
    };
  };

  const rewardLevel = getRewardLevel(rewardData.total_points);
  const RewardLevelIcon = rewardLevel.icon;

  const rewardProgress = rewardLevel.nextPoints
    ? Math.min(
        100,
        Math.round(
          (rewardData.total_points / rewardLevel.nextPoints) * 100
        )
      )
    : 100;

  const achievementBadges = useMemo(() => {
    const submitted = complaints.length;
    const resolved = complaints.filter(
      (item) => String(item.status || "").toLowerCase() === "resolved"
    ).length;
    const points = Number(rewardData.total_points || 0);

    return [
      {
        id: "first-report",
        icon: MapPin,
        title: "First Report",
        description: "Submit your first civic complaint.",
        unlocked: submitted >= 1,
        progress: Math.min(submitted, 1),
        target: 1,
      },
      {
        id: "civic-starter",
        icon: Award,
        title: "Civic Starter",
        description: "Submit 5 civic complaints.",
        unlocked: submitted >= 5,
        progress: Math.min(submitted, 5),
        target: 5,
      },
      {
        id: "civic-contributor",
        icon: Trophy,
        title: "Civic Contributor",
        description: "Submit 10 civic complaints.",
        unlocked: submitted >= 10,
        progress: Math.min(submitted, 10),
        target: 10,
      },
      {
        id: "community-helper",
        icon: CheckCircle2,
        title: "Community Helper",
        description: "Have 3 complaints resolved.",
        unlocked: resolved >= 3,
        progress: Math.min(resolved, 3),
        target: 3,
      },
      {
        id: "civic-champion",
        icon: Star,
        title: "Civic Champion",
        description: "Earn 100 civic reward points.",
        unlocked: points >= 100,
        progress: Math.min(points, 100),
        target: 100,
      },
    ];
  }, [complaints, rewardData.total_points]);

  const unlockedBadgeCount = achievementBadges.filter((badge) => badge.unlocked).length;

  const personalResolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;
  const statusStatistics = [
    { label: "Submitted", value: complaints.filter((c) => c.status === "Submitted").length, className: "bg-blue-500" },
    { label: "Verified", value: complaints.filter((c) => c.status === "Verified").length, className: "bg-purple-500" },
    { label: "Assigned", value: complaints.filter((c) => c.status === "Assigned").length, className: "bg-yellow-500" },
    { label: "In Progress", value: complaints.filter((c) => c.status === "In Progress").length, className: "bg-orange-500" },
    { label: "Resolved", value: resolvedComplaints, className: "bg-green-500" },
    { label: "Rejected", value: rejectedComplaints, className: "bg-red-500" },
  ];
  const maxStatusCount = Math.max(...statusStatistics.map((item) => item.value), 1);

  const mapComplaints = complaints
    .map((complaint) => ({
      ...complaint,
      latitude: Number(complaint.latitude ?? complaint.lat),
      longitude: Number(complaint.longitude ?? complaint.lng ?? complaint.lon),
    }))
    .filter((complaint) => Number.isFinite(complaint.latitude) && Number.isFinite(complaint.longitude));

  const mapCenter = mapComplaints.length
    ? [mapComplaints[0].latitude, mapComplaints[0].longitude]
    : [20.5937, 78.9629];

  const heatmapPoints = mapComplaints.map((complaint) => {
    let nearbyCount = 0;

    mapComplaints.forEach((other) => {
      const latDiff = complaint.latitude - other.latitude;
      const lngDiff = complaint.longitude - other.longitude;
      const distanceKm = Math.sqrt(
        Math.pow(latDiff * 111, 2) +
        Math.pow(lngDiff * 111 * Math.cos((complaint.latitude * Math.PI) / 180), 2)
      );

      if (distanceKm <= 1) nearbyCount += 1;
    });

    return {
      ...complaint,
      density: nearbyCount,
    };
  });

  const maxHeatDensity = heatmapPoints.reduce(
    (max, point) => Math.max(max, point.density),
    1
  );

  const solvedCount = complaints.filter((item) => String(item.status || "").toLowerCase() === "resolved").length;
  const ongoingCount = complaints.filter((item) => !["resolved", "rejected"].includes(String(item.status || "").toLowerCase())).length;
  const rejectedCount = complaints.filter((item) => String(item.status || "").toLowerCase() === "rejected").length;
  const resolutionProgress = totalComplaints ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;


  const filteredCommunityComplaints = useMemo(() => {
    const query = communitySearch.trim().toLowerCase();

    return communityComplaints.filter((complaint) => {
      if (!query) return true;

      return [
        complaint.title,
        complaint.description,
        complaint.location,
        complaint.address,
        complaint.complaint_code,
        complaint.categories?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [communityComplaints, communitySearch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
          </div>
          <p className="font-semibold text-slate-800">Loading your dashboard</p>
          <p className="text-sm text-slate-500 mt-1">Fetching your latest civic activity...</p>
        </div>
      </div>
    );
  }

  const profilePhoto = user?.profile_image_url;
  const firstName = (user?.name || "Citizen").split(" ")[0];

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      {/* Top navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-extrabold tracking-tight text-slate-900 leading-tight">Smart City</p>
              <p className="text-[11px] font-medium text-slate-500">Citizen Portal</p>
            </div>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <button onClick={openProfile} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition">
              {profilePhoto ? (
                <img src={profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  {(user?.name || "C").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</p>
                <p className="text-[11px] text-slate-500">Citizen</p>
              </div>
            </button>
            <button onClick={openProfile} className="sm:hidden w-9 h-9 rounded-full overflow-hidden border border-slate-200">
              {profilePhoto ? <img src={profilePhoto} alt="" className="w-full h-full object-cover" /> : <UserRound className="w-5 h-5 mx-auto text-slate-500" />}
            </button>
            <button onClick={logout} title="Logout" className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Section navigation */}
      <nav className="sticky top-16 z-30 bg-white/90 backdrop-blur border-b border-slate-200 overflow-x-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 min-w-max h-12">
          {[
            ["overview", "Overview", LayoutDashboard],
            ["my-complaints", "My Complaints", ListChecks],
            ["city-progress", "City Progress", CheckCircle2],
            ["city-map", "City Map", Map],
            ["rewards", "Rewards", Gift],
            ["leaderboard", "Leaderboard", Trophy],
            ["achievements", "Achievements", Award],
            ["community", "Community", MessageCircle],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition"
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          <button onClick={openProfile} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition">
            <UserRound className="w-4 h-4" /> Profile
          </button>
        </div>
      </nav>

      {/* Complaint tracker */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 whitespace-nowrap">
              <Search className="w-4 h-4 text-blue-600" />
              Track a complaint
            </div>
            <div className="flex-1 flex gap-2 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={complaintSearch}
                  onChange={(e) => { setComplaintSearch(e.target.value); setTrackMessage(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") trackComplaintById(); }}
                  placeholder="Enter complaint ID or complaint code..."
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={trackComplaintById}
                disabled={trackingComplaint}
                className="px-5 h-10 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition whitespace-nowrap"
              >
                {trackingComplaint ? "Tracking..." : "Track"}
              </button>
            </div>
            {trackMessage && (
              <p className="text-xs font-medium text-red-600">{trackMessage}</p>
            )}
          </div>
        </div>
      </div>

      <main id="overview" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div><p className="font-semibold">Something went wrong</p><p className="text-sm mt-1">{error}</p></div>
          </div>
        )}
        {success && (
          <div className="mb-5 flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4">
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div><p className="font-semibold">Success</p><p className="text-sm mt-1">{success}</p></div>
            <button onClick={() => setSuccess("")} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700/80 via-slate-950 to-indigo-950" />
          <div className="absolute -right-20 -top-24 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute right-20 bottom-[-100px] w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-semibold text-blue-100 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Your civic activity dashboard
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                Good to see you, {firstName}.
              </h1>
              <p className="mt-3 text-slate-300 max-w-xl text-sm sm:text-base leading-7">
                Report local problems, follow every update, and contribute to a cleaner and better city.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => navigate("/citizen/complaints/new")} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition shadow-lg">
                  <MapPin className="w-5 h-5" /> Report a Problem
                </button>
                <button onClick={() => document.getElementById("my-complaints")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/15 transition">
                  <Eye className="w-4 h-4" /> Track Complaints
                </button>
              </div>
            </div>

            <div className="w-full lg:w-[330px] rounded-2xl bg-white/10 border border-white/15 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Civic level</span>
                <RewardLevelIcon className="w-6 h-6 text-amber-300" />
              </div>
              <p className="text-2xl font-bold mt-2">{rewardLevel.name}</p>
              <p className="text-sm text-slate-300 mt-1">{rewardData.total_points} points earned</p>
              <div className="mt-4 h-2.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full rounded-full bg-amber-300 transition-all duration-700" style={{ width: `${rewardProgress}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-slate-300 mt-2">
                <span>Current progress</span>
                <span>{rewardLevel.nextPoints ? `${rewardLevel.nextPoints - rewardData.total_points} pts to next` : "Max level"}</span>
              </div>
            </div>
          </div>
        </section>

        {/* KPI cards */}
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Complaints", value: totalComplaints, icon: MapPin, iconBg: "bg-blue-50", iconText: "text-blue-600", accent: "border-blue-100" },
            { label: "Active", value: activeComplaints, icon: Clock3, iconBg: "bg-amber-50", iconText: "text-amber-600", accent: "border-amber-100" },
            { label: "Resolved", value: resolvedComplaints, icon: CheckCircle2, iconBg: "bg-emerald-50", iconText: "text-emerald-600", accent: "border-emerald-100" },
            { label: "Reward Points", value: rewardData.total_points, icon: Trophy, iconBg: "bg-violet-50", iconText: "text-violet-600", accent: "border-violet-100" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`bg-white rounded-2xl border ${item.accent} p-5 shadow-sm hover:shadow-md transition`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                    <p className="text-3xl font-extrabold tracking-tight mt-2 text-slate-900">{item.value}</p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl ${item.iconBg} ${item.iconText} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* City progress */}
        <section id="city-progress" className="scroll-mt-32 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-6">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">City progress</p>
                  <h2 className="text-xl font-extrabold mt-0.5">How the city is responding</h2>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-3 max-w-2xl">Aggregated complaint progress across the portal. Individual complaint details remain private to authorized users.</p>
              {cityStatsError && <p className="text-xs text-red-600 mt-2">{cityStatsError}</p>}
            </div>

            <div className="w-full xl:w-[520px]">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-slate-700">City resolution rate</span>
                <span className="font-extrabold text-emerald-600">
                  {cityStatsLoading ? "—" : `${cityStats.resolution_rate || 0}%`}
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Number(cityStats.resolution_rate) || 0)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                {[
                  { label: "Total", value: cityStats.total, cls: "text-blue-700 bg-blue-50" },
                  { label: "Resolved", value: cityStats.resolved, cls: "text-emerald-700 bg-emerald-50" },
                  { label: "Ongoing", value: cityStats.ongoing, cls: "text-amber-700 bg-amber-50" },
                  { label: "Rejected", value: cityStats.rejected, cls: "text-red-700 bg-red-50" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl px-3 py-2.5 ${item.cls}`}>
                    <p className="text-[11px] font-semibold opacity-80">{item.label}</p>
                    <p className="text-lg font-extrabold mt-0.5">{cityStatsLoading ? "—" : item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-800">Your contribution</p>
                <p className="text-xs text-slate-500 mt-0.5">Progress of the complaints you have personally reported.</p>
              </div>
              <div className="text-sm font-bold text-slate-700">{resolutionProgress}% resolved</div>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${resolutionProgress}%` }} />
            </div>
            <div className="flex flex-wrap gap-4 mt-2.5 text-xs font-medium text-slate-500">
              <span><b className="text-emerald-600">{solvedCount}</b> Solved</span>
              <span><b className="text-amber-600">{ongoingCount}</b> Ongoing</span>
              <span><b className="text-red-600">{rejectedCount}</b> Rejected</span>
            </div>
          </div>
        </section>

        {/* City map */}
        <section id="city-map" className="scroll-mt-32 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Civic issue map</p>
              <h2 className="text-xl font-extrabold mt-1">Problems reported on the map</h2>
              <p className="text-sm text-slate-500 mt-1">Use Heatmap to see complaint concentration or Markers to inspect individual complaints.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button onClick={() => setMapView("heatmap")} className={`px-3 py-2 rounded-lg ${mapView === "heatmap" ? "bg-white shadow-sm text-blue-700" : "text-slate-500"}`}>Heatmap</button>
                <button onClick={() => setMapView("markers")} className={`px-3 py-2 rounded-lg ${mapView === "markers" ? "bg-white shadow-sm text-blue-700" : "text-slate-500"}`}>Markers</button>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700">● {solvedCount} Solved</span>
              <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700">● {ongoingCount} Ongoing</span>
              <span className="px-3 py-1.5 rounded-full bg-red-50 text-red-700">● {rejectedCount} Rejected</span>
            </div>
          </div>
          <div className="h-[420px] w-full bg-slate-100">
            <MapContainer center={mapCenter} zoom={mapComplaints.length ? 13 : 5} scrollWheelZoom className="h-full w-full">
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <CitizenMapBounds points={mapComplaints} />
              {mapView === "heatmap" ? (
                heatmapPoints.map((complaint) => {
                  const intensity = complaint.density / maxHeatDensity;
                  const radius = 18 + intensity * 32;
                  const fillColor = intensity >= 0.75 ? "#ef4444" : intensity >= 0.45 ? "#f59e0b" : "#22c55e";
                  return (
                    <CircleMarker
                      key={`heat-${complaint.id}`}
                      center={[complaint.latitude, complaint.longitude]}
                      radius={radius}
                      pathOptions={{ color: fillColor, fillColor, fillOpacity: 0.22, weight: 1, opacity: 0.45 }}
                    >
                      <Popup>
                        <div className="min-w-[220px]">
                          <p className="font-bold text-slate-900">Complaint density area</p>
                          <p className="text-sm mt-1"><b>{complaint.density}</b> complaint{complaint.density !== 1 ? "s" : ""} within approximately 1 km</p>
                          <p className="text-xs text-slate-500 mt-2">Example complaint: {complaint.complaint_code || complaint.id}</p>
                          <button onClick={() => openComplaintDetails(complaint)} className="mt-3 w-full px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold">View Complaint</button>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })
              ) : (
                mapComplaints.map((complaint) => {
                  const status = String(complaint.status || "").toLowerCase();
                  const fillColor = status === "resolved" ? "#10b981" : status === "rejected" ? "#ef4444" : "#f59e0b";
                  return (
                    <CircleMarker key={complaint.id} center={[complaint.latitude, complaint.longitude]} radius={9} pathOptions={{ color: fillColor, fillColor, fillOpacity: 0.8, weight: 2 }}>
                      <Popup>
                        <div className="min-w-[210px]">
                          <p className="font-bold text-slate-900">{complaint.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{complaint.complaint_code || complaint.id}</p>
                          <div className="mt-2 space-y-1 text-sm">
                            <p><b>Status:</b> {complaint.status}</p>
                            <p><b>Priority:</b> {complaint.priority || "Normal"}</p>
                            <p><b>Category:</b> {complaint.categories?.name || "Uncategorized"}</p>
                          </div>
                          <button onClick={() => openComplaintDetails(complaint)} className="mt-3 w-full px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold">View Complaint</button>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })
              )}
            </MapContainer>
          </div>
          {!mapComplaints.length && (
            <div className="px-5 py-3 text-xs text-slate-500 border-t border-slate-100">No complaints with valid latitude/longitude are available yet. Complaints will appear here once location coordinates are saved.</div>
          )}
        </section>

        {/* Two-column dashboard */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">My civic activity</p>
                <h2 className="text-xl font-extrabold mt-1">Recent Complaints</h2>
                <p className="text-sm text-slate-500 mt-1">Follow the latest status of issues you reported.</p>
              </div>
              <button onClick={() => fetchComplaints(true)} disabled={refreshing} className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center disabled:opacity-50" title="Refresh complaints">
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="p-5 sm:p-6">
              {complaints.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-200 rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 mx-auto flex items-center justify-center">
                    <MapPin className="w-7 h-7 text-blue-500" />
                  </div>
                  <p className="font-bold mt-4">No complaints yet</p>
                  <p className="text-sm text-slate-500 mt-1">Your submitted complaints will appear here.</p>
                  <button onClick={() => navigate("/citizen/complaints/new")} className="mt-4 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">Submit a Complaint</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {complaints.slice(0, 4).map((complaint) => (
                    <div key={complaint.id} className="group rounded-2xl border border-slate-200 p-4 sm:p-5 hover:border-blue-200 hover:shadow-sm transition">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900 truncate">{complaint.title}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusClass(complaint.status)}`}>{complaint.status}</span>
                          </div>
                          <p className="text-xs font-mono text-slate-400 mt-1">{complaint.complaint_code || complaint.id}</p>
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{complaint.description}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                            <span>{complaint.categories?.name || "Uncategorized"}</span>
                            <span>Priority: {complaint.priority || "Normal"}</span>
                            <span>{formatDate(complaint.created_at)}</span>
                          </div>
                        </div>
                        <button onClick={() => openComplaintDetails(complaint)} className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-blue-700 transition">
                          <Eye className="w-4 h-4" /> View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {complaints.length > 4 && (
              <div className="px-5 sm:px-6 pb-5">
                <button onClick={() => document.getElementById("my-complaints")?.scrollIntoView({ behavior: "smooth" })} className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
                  View all {complaints.length} complaints
                </button>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-600">Rewards</p>
              <h2 className="text-xl font-extrabold mt-1">Civic Impact</h2>
              <p className="text-sm text-slate-500 mt-1">Your contribution is tracked through civic points.</p>
            </div>
            <div className="p-5 sm:p-6">
              {rewardsError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{rewardsError}</div>
              ) : (
                <>
                  <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white p-5">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm text-white/75">Available points</p><p className="text-4xl font-extrabold mt-1">{rewardData.total_points}</p></div>
                      <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center"><Trophy className="w-6 h-6" /></div>
                    </div>
                    <p className="text-sm text-white/75 mt-4">{rewardData.reward_count} reward transaction{rewardData.reward_count === 1 ? "" : "s"}</p>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                    <div className="flex justify-between items-center gap-3">
                      <div><p className="font-bold">{rewardLevel.name}</p><p className="text-xs text-slate-500 mt-1">{rewardLevel.description}</p></div>
                      <RewardLevelIcon className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-violet-600 rounded-full" style={{ width: `${rewardProgress}%` }} /></div>
                  </div>
                  <button onClick={() => document.getElementById("rewards")?.scrollIntoView({ behavior: "smooth" })} className="w-full mt-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-sm hover:bg-slate-50">View reward history</button>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Leaderboard */}
        <section id="leaderboard" className="scroll-mt-32 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Community</p>
              <h2 className="text-xl font-extrabold mt-1 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Civic Leaderboard</h2>
              <p className="text-sm text-slate-500 mt-1">A transparent view of earned civic points.</p>
            </div>
            <button onClick={fetchLeaderboard} disabled={leaderboardLoading} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${leaderboardLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
          <div className="p-5 sm:p-6">
            {leaderboardError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{leaderboardError}</div>
            ) : leaderboardLoading ? (
              <div className="py-8 text-center text-slate-500"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />Loading leaderboard...</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 rounded-2xl bg-amber-50 border border-amber-100 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Your rank</p>
                  <p className="text-4xl font-extrabold text-slate-900 mt-2">{leaderboardRank ? `#${leaderboardRank}` : "—"}</p>
                  <p className="text-sm text-slate-600 mt-2">Keep contributing through meaningful civic reports.</p>
                </div>
                <div className="lg:col-span-2 space-y-2">
                  {leaderboard.slice(0, 5).map((citizen) => {
                    const isCurrentUser = citizen.user_id === user?.id;
                    return (
                      <div key={citizen.user_id} className={`flex items-center gap-3 p-3.5 rounded-xl border ${isCurrentUser ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-slate-50/50"}`}>
                        <span className="w-8 text-center font-extrabold text-slate-500">#{citizen.rank}</span>
                        {citizen.profile_image_url ? <img src={citizen.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover border border-white" /> : <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center"><UserRound className="w-4 h-4 text-slate-400" /></div>}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><p className="font-semibold truncate">{citizen.name}</p>{isCurrentUser && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">YOU</span>}</div>
                          <p className="text-xs text-slate-500 mt-0.5">{citizen.complaints_submitted} submitted · {citizen.complaints_resolved} resolved</p>
                        </div>
                        <p className="font-extrabold text-amber-600">{citizen.total_points}<span className="block text-[10px] font-medium text-slate-400 text-right">points</span></p>
                      </div>
                    );
                  })}
                  {leaderboard.length === 0 && <div className="py-8 text-center text-slate-500">No leaderboard data available.</div>}
                </div>
              </div>
            )}
          </div>
        </section>


        {/* Feature 9E — Community Support & Verification */}
        <section id="community" className="scroll-mt-32 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Community participation</p>
                <h2 className="text-xl font-extrabold mt-1">Community Issues</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Support issues you also face, give community feedback, and discuss reported problems.
                </p>
              </div>
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={communitySearch}
                  onChange={(event) => setCommunitySearch(event.target.value)}
                  placeholder="Search community issues..."
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {communityError && (
              <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Community feature unavailable</p>
                  <p className="text-sm mt-1">{communityError}</p>
                </div>
                <button onClick={() => setCommunityError("")} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {communityLoading ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto text-indigo-600 mb-2" />
                Loading community issues...
              </div>
            ) : filteredCommunityComplaints.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl">
                <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold mt-3">No community issues found</p>
                <p className="text-sm text-slate-500 mt-1">
                  Try a different search or check back after more complaints are submitted.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredCommunityComplaints.map((complaint) => {
                  const supportCount = Number(
                    complaint.support_count ?? complaint.supports_count ?? 0
                  );
                  const genuineCount = Number(
                    complaint.genuine_count ?? complaint.genuine_votes ?? 0
                  );
                  const notGenuineCount = Number(
                    complaint.not_genuine_count ?? complaint.not_genuine_votes ?? 0
                  );
                  const commentCount = Number(
                    complaint.comment_count ?? complaint.comments_count ?? 0
                  );
                  const supported = Boolean(
                    complaint.current_user_supported ?? complaint.user_supported
                  );
                  const feedback = complaint.current_user_feedback ?? complaint.user_feedback ?? null;
                  const isOwnComplaint =
                    String(complaint.citizen_id || complaint.user_id || "") === String(user?.id || "");

                  return (
                    <article key={complaint.id} className="rounded-2xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-sm transition">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-slate-900">{complaint.title}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusClass(complaint.status)}`}>
                              {complaint.status}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-slate-400 mt-1">{complaint.complaint_code || complaint.id}</p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 mt-4 line-clamp-3 whitespace-pre-wrap">
                        {complaint.description}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                        <span>{complaint.categories?.name || "Uncategorized"}</span>
                        {(complaint.location || complaint.address) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {complaint.location || complaint.address}
                          </span>
                        )}
                        <span>{formatDate(complaint.created_at)}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="rounded-xl bg-blue-50 px-3 py-2.5 text-center">
                          <p className="text-lg font-extrabold text-blue-700">{supportCount}</p>
                          <p className="text-[11px] font-semibold text-blue-600">Face this too</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
                          <p className="text-lg font-extrabold text-emerald-700">{genuineCount}</p>
                          <p className="text-[11px] font-semibold text-emerald-600">Genuine</p>
                        </div>
                        <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-center">
                          <p className="text-lg font-extrabold text-amber-700">{notGenuineCount}</p>
                          <p className="text-[11px] font-semibold text-amber-600">Not Genuine</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          type="button"
                          disabled={communityActionLoading || isOwnComplaint}
                          onClick={() => toggleCommunitySupport(complaint)}
                          title={isOwnComplaint ? "You cannot support your own complaint." : ""}
                          className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold border transition disabled:opacity-50 ${
                            supported
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-blue-200 text-blue-700 hover:bg-blue-50"
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          {supported ? "You face this too" : "I face this too"}
                        </button>

                        <button
                          type="button"
                          disabled={communityFeedbackLoading || isOwnComplaint}
                          onClick={() =>
                            feedback === "genuine"
                              ? removeCommunityFeedback(complaint)
                              : submitCommunityFeedback(complaint, "genuine")
                          }
                          title={isOwnComplaint ? "You cannot vote on your own complaint." : ""}
                          className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold border transition disabled:opacity-50 ${
                            feedback === "genuine"
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          <Check className="w-4 h-4" /> Genuine
                        </button>

                        <button
                          type="button"
                          disabled={communityFeedbackLoading || isOwnComplaint}
                          onClick={() =>
                            feedback === "not_genuine"
                              ? removeCommunityFeedback(complaint)
                              : submitCommunityFeedback(complaint, "not_genuine")
                          }
                          title={isOwnComplaint ? "You cannot vote on your own complaint." : ""}
                          className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold border transition disabled:opacity-50 ${
                            feedback === "not_genuine"
                              ? "bg-amber-500 border-amber-500 text-white"
                              : "border-amber-200 text-amber-700 hover:bg-amber-50"
                          }`}
                        >
                          <Flag className="w-4 h-4" /> Not Genuine
                        </button>

                        <button
                          type="button"
                          onClick={() => openCommunityDiscussion(complaint)}
                          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-indigo-700 transition ml-auto"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Discuss {commentCount > 0 ? `(${commentCount})` : ""}
                        </button>
                      </div>

                      {isOwnComplaint && (
                        <p className="text-[11px] text-slate-400 mt-3">
                          You can view the community discussion for your complaint, but you cannot vote on your own issue.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Full complaints */}
        <section id="my-complaints" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Complaint management</p>
              <h2 className="text-xl font-extrabold mt-1">My Complaints</h2>
              <p className="text-sm text-slate-500 mt-1">Track every complaint and open its complete timeline.</p>
            </div>
            <button onClick={() => fetchComplaints(true)} disabled={refreshing} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="p-5 sm:p-6">
            {complaints.length === 0 ? (
              <div className="py-14 text-center"><MapPin className="w-8 h-8 mx-auto text-slate-300" /><p className="font-bold mt-3">No complaints yet</p><button onClick={() => navigate("/citizen/complaints/new")} className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold">Report your first issue</button></div>
            ) : (
              <>
                <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/40 p-4 sm:p-5 mb-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-blue-600">Search & Filters</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">Find exactly the complaints you want to track.</p>
                    </div>
                    <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-white border border-blue-100 text-xs font-bold text-blue-700">
                      {filteredComplaints.length} matching
                    </span>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        value={complaintFilterSearch}
                        onChange={(e) => setComplaintFilterSearch(e.target.value)}
                        placeholder="Search by title, complaint code, category, or location..."
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    </div>
                    <button onClick={clearComplaintFilters} disabled={!activeComplaintFilters} className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">Clear filters</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option value="All">All statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Verified">Verified</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option value="All">All categories</option>
                      {complaintCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option value="All">All priorities</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                    </select>
                    <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option value="All">Any date</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-3 text-xs text-slate-500">
                    <span>{activeComplaintFilters ? `${activeComplaintFilters} filter${activeComplaintFilters > 1 ? "s" : ""} active` : "Showing all complaints"}</span>
                    <span className="font-semibold text-slate-700">{filteredComplaints.length} of {complaints.length} complaints</span>
                  </div>
                </div>

                {filteredComplaints.length === 0 ? (
                  <div className="py-14 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <SearchX className="w-9 h-9 mx-auto text-slate-300" />
                    <p className="font-bold mt-3">No matching complaints</p>
                    <p className="text-sm text-slate-500 mt-1">Try changing your search or filters.</p>
                    <button onClick={clearComplaintFilters} className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">Reset filters</button>
                  </div>
                ) : (
              <div className="space-y-4">
                {filteredComplaints.map((complaint) => (
                  <article key={complaint.id} className="border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-blue-200 transition">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0"><MapPin className="w-5 h-5 text-blue-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-lg">{complaint.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusClass(complaint.status)}`}>{complaint.status}</span>
                        </div>
                        <p className="text-xs font-mono text-slate-400 mt-1">{complaint.complaint_code || complaint.id}</p>
                        <p className="text-sm text-slate-600 mt-3 whitespace-pre-line line-clamp-3">{complaint.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                          <div><p className="text-[11px] uppercase tracking-wide text-slate-400">Category</p><p className="text-sm font-semibold mt-0.5">{complaint.categories?.name || "Not specified"}</p></div>
                          <div><p className="text-[11px] uppercase tracking-wide text-slate-400">Priority</p><p className="text-sm font-semibold mt-0.5">{complaint.priority || "Normal"}</p></div>
                          <div><p className="text-[11px] uppercase tracking-wide text-slate-400">Worker</p><p className="text-sm font-semibold mt-0.5">{getAssignedWorkerName(complaint)}</p></div>
                          <div><p className="text-[11px] uppercase tracking-wide text-slate-400">Submitted</p><p className="text-sm font-semibold mt-0.5">{formatDate(complaint.created_at)}</p></div>
                        </div>
                      </div>
                      <div className="flex flex-row lg:flex-col gap-2">
                        <button onClick={() => openComplaintDetails(complaint)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold"><Eye className="w-4 h-4" /> Details</button>
                        {complaint.latitude != null && complaint.longitude != null && <a href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold"><MapPin className="w-4 h-4" /> Location</a>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Personal Civic Statistics */}
        <section id="statistics" className="scroll-mt-32 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-blue-600" /></div>
              <div><h2 className="text-xl font-extrabold">Your Civic Statistics</h2><p className="text-sm text-slate-500 mt-1">A personal snapshot of your participation in the city portal.</p></div>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Submitted</p><p className="text-3xl font-extrabold mt-2">{totalComplaints}</p><p className="text-xs text-slate-400 mt-1">Total complaints</p></div>
              <div className="rounded-2xl bg-green-50 border border-green-100 p-4"><p className="text-xs font-bold uppercase tracking-wide text-green-700">Resolved</p><p className="text-3xl font-extrabold text-green-700 mt-2">{resolvedComplaints}</p><p className="text-xs text-green-600 mt-1">Successfully resolved</p></div>
              <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4"><p className="text-xs font-bold uppercase tracking-wide text-orange-700">Active</p><p className="text-3xl font-extrabold text-orange-700 mt-2">{activeComplaints}</p><p className="text-xs text-orange-600 mt-1">Still being processed</p></div>
              <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-4"><p className="text-xs font-bold uppercase tracking-wide text-yellow-700">Points</p><p className="text-3xl font-extrabold text-yellow-700 mt-2">{rewardData.total_points}</p><p className="text-xs text-yellow-600 mt-1">Civic reward points</p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4"><div><h3 className="font-bold">Complaint Status Breakdown</h3><p className="text-xs text-slate-500 mt-1">Current distribution of your complaints.</p></div><BarChart3 className="w-5 h-5 text-slate-400" /></div>
                <div className="space-y-3">
                  {statusStatistics.map((item) => <div key={item.label}><div className="flex justify-between text-xs mb-1.5"><span className="font-semibold text-slate-600">{item.label}</span><span className="font-bold">{item.value}</span></div><div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${item.className}`} style={{ width: `${(item.value / maxStatusCount) * 100}%` }} /></div></div>)}
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5"><p className="text-sm font-semibold text-blue-100">Personal Resolution Rate</p><p className="text-5xl font-extrabold mt-3">{personalResolutionRate}%</p><p className="text-sm text-blue-100 mt-2">Resolved complaints compared with all complaints you submitted.</p><div className="mt-5 h-2.5 rounded-full bg-white/20 overflow-hidden"><div className="h-full rounded-full bg-white" style={{ width: `${personalResolutionRate}%` }} /></div><div className="flex justify-between mt-2 text-xs text-blue-100"><span>{resolvedComplaints} resolved</span><span>{totalComplaints} total</span></div></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
              <div className="rounded-2xl border p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Civic Level</p><p className="font-extrabold mt-2">{rewardLevel.name}</p><p className="text-xs text-slate-500 mt-1">{rewardData.total_points} points earned</p></div>
              <div className="rounded-2xl border p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Achievements</p><p className="font-extrabold mt-2">{unlockedBadgeCount} unlocked</p><p className="text-xs text-slate-500 mt-1">Across {achievementBadges.length} badges</p></div>
              <div className="rounded-2xl border p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Rejected</p><p className="font-extrabold mt-2">{rejectedComplaints}</p><p className="text-xs text-slate-500 mt-1">Complaints marked rejected</p></div>
            </div>
          </div>
        </section>

        {/* Achievement badges */}
        <section id="achievements" className="scroll-mt-32 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Achievements</p>
              <h2 className="text-xl font-extrabold mt-1">Civic Badges</h2>
              <p className="text-sm text-slate-500 mt-1">Milestones earned from your civic activity.</p>
            </div>
            <div className="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-bold">
              {unlockedBadgeCount}/{achievementBadges.length} unlocked
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              {achievementBadges.map((badge) => {
                const BadgeIcon = badge.icon;
                const progressPercent = Math.round((badge.progress / badge.target) * 100);

                return (
                  <div
                    key={badge.id}
                    className={`rounded-2xl border p-4 transition ${
                      badge.unlocked
                        ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm"
                        : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        badge.unlocked
                          ? "bg-amber-100 text-amber-600"
                          : "bg-slate-200 text-slate-400"
                      }`}>
                        <BadgeIcon className="w-6 h-6" />
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full ${
                        badge.unlocked
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-500"
                      }`}>
                        {badge.unlocked ? "Unlocked" : "Locked"}
                      </span>
                    </div>

                    <h3 className="font-extrabold mt-4">{badge.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{badge.description}</p>

                    <div className="mt-4">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                        <span>Progress</span>
                        <span>{badge.progress}/{badge.target}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            badge.unlocked ? "bg-amber-500" : "bg-slate-400"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-sm font-bold text-blue-900">How badges are earned</p>
              <p className="text-xs text-blue-700 mt-1">
                Badges are calculated automatically from your submitted complaints,
                resolved complaints, and civic reward points.
              </p>
            </div>
          </div>
        </section>

        {/* Reward history */}
        <section id="rewards" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-600">Points history</p>
            <h2 className="text-xl font-extrabold mt-1">Reward History</h2>
          </div>
          <div className="p-5 sm:p-6">
            {rewardsError ? <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{rewardsError}</div> : rewardData.rewards.length === 0 ? (
              <div className="py-8 text-center text-slate-500 border border-dashed rounded-2xl"><Trophy className="w-7 h-7 mx-auto text-slate-300 mb-2" />No reward transactions yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rewardData.rewards.map((reward) => (
                  <div key={reward.id} className="flex items-center justify-between gap-4 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0"><Star className="w-5 h-5 text-emerald-600" /></div>
                      <div className="min-w-0"><p className="font-semibold truncate">{reward.reason || "Reward earned"}</p><p className="text-xs text-slate-500 mt-1">{formatDate(reward.created_at)}</p></div>
                    </div>
                    <span className="font-extrabold text-emerald-600">+{reward.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Profile modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setProfileOpen(false)}>
          <div className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 px-5 sm:px-6 py-5 flex items-center justify-between">
              <div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Account</p><h2 className="text-xl font-extrabold mt-1">My Profile</h2></div>
              <button onClick={() => setProfileOpen(false)} className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 sm:p-6 space-y-6">
              <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-3xl font-bold overflow-hidden border-4 border-white shadow-md">
                    {profileImagePreview || profileForm.profile_image_url ? <img src={profileImagePreview || profileForm.profile_image_url} alt="Profile" className="w-full h-full object-cover" /> : (user?.name || "C").charAt(0).toUpperCase()}
                  </div>
                  <label htmlFor="profile-photo-input" className="absolute -right-2 -bottom-2 w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center cursor-pointer shadow-md"><Camera className="w-4 h-4" /></label>
                  <input id="profile-photo-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { setProfileError("Profile photo must be 5 MB or smaller."); event.target.value = ""; return; } setProfileError(""); setProfileImageFile(file); setProfileImagePreview(URL.createObjectURL(file)); }} />
                </div>
                <div className="text-center sm:text-left"><p className="text-2xl font-extrabold">{user?.name}</p><p className="text-sm text-slate-500 mt-1">{user?.email}</p><span className="inline-flex mt-3 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">Citizen account</span></div>
              </div>

              <form onSubmit={saveProfile} className="space-y-4">
                <div className="flex items-center gap-2"><Pencil className="w-4 h-4 text-blue-600" /><h3 className="font-bold">Profile Information</h3></div>
                {profileError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{profileError}</div>}
                <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label><input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label><input value={user?.email || ""} disabled className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-xl px-4 py-3" /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label><input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} maxLength={20} placeholder="Enter phone number" className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="flex flex-wrap gap-3">
                  <label htmlFor="profile-photo-input" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer font-semibold"><Camera className="w-4 h-4" /> {profileImageFile ? "Change Photo" : "Choose Photo"}</label>
                  {profileImageFile && <button type="button" onClick={() => { setProfileImageFile(null); setProfileImagePreview(user?.profile_image_url || ""); }} className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold">Remove New Photo</button>}
                </div>
                <p className="text-xs text-slate-400">JPG, PNG, WEBP or GIF. Maximum 5 MB.</p>
                <button type="submit" disabled={profileSaving} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">{profileSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}{profileSaving ? "Saving..." : "Save Profile"}</button>
              </form>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-bold mb-4">Change Password</h3>
                {passwordError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{passwordError}</div>}
                {passwordSuccess && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 text-sm">{passwordSuccess}</div>}
                <form onSubmit={changePassword} className="space-y-3">
                  <input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} placeholder="Current password" className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  <input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} placeholder="New password (minimum 8 characters)" className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" required minLength={8} />
                  <input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} placeholder="Confirm new password" className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" required minLength={8} />
                  <button type="submit" disabled={passwordSaving} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-50">{passwordSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}{passwordSaving ? "Changing..." : "Change Password"}</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Community discussion modal */}
      {communityDiscussion && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCommunityDiscussion(null)}
        >
          <div
            className="bg-white w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 px-5 sm:px-7 py-5 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Community discussion</p>
                <h2 className="text-xl font-extrabold mt-1 truncate">
                  {communityDiscussion.complaint?.title}
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  {communityDiscussion.complaint?.complaint_code || communityDiscussion.complaint?.id}
                </p>
              </div>
              <button
                onClick={() => setCommunityDiscussion(null)}
                className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-7 space-y-5">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {communityDiscussion.complaint?.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-3 py-1.5 rounded-full bg-white text-xs font-bold text-blue-700 border border-blue-100">
                    👍 {Number(communityDiscussion.support_count ?? 0)} support
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-white text-xs font-bold text-emerald-700 border border-emerald-100">
                    ✓ {Number(communityDiscussion.genuine_count ?? 0)} genuine
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-white text-xs font-bold text-amber-700 border border-amber-100">
                    ⚠ {Number(communityDiscussion.not_genuine_count ?? 0)} not genuine
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-extrabold text-lg">Comments</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Share useful local context or information about this issue.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {Array.isArray(communityDiscussion.comments) ? communityDiscussion.comments.length : 0} comments
                  </span>
                </div>

                <form onSubmit={submitCommunityComment} className="flex flex-col sm:flex-row gap-2 mb-5">
                  <input
                    value={communityComment}
                    onChange={(event) => setCommunityComment(event.target.value)}
                    placeholder="Write a comment..."
                    maxLength={1000}
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={communityActionLoading || !communityComment.trim()}
                    className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Comment
                  </button>
                </form>

                {!Array.isArray(communityDiscussion.comments) || communityDiscussion.comments.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-slate-200 rounded-2xl">
                    <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-bold mt-3">No comments yet</p>
                    <p className="text-sm text-slate-500 mt-1">Be the first citizen to comment.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {communityDiscussion.comments.map((comment) => {
                      const commentUserId = comment.user_id || comment.citizen_id;
                      const isOwnComment = String(commentUserId || "") === String(user?.id || "");

                      return (
                        <div key={comment.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
                              {(comment.user?.name || comment.user_name || "C").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-slate-800">
                                  {comment.user?.name || comment.user_name || "Citizen"}
                                </p>
                                <span className="text-[11px] text-slate-400">
                                  {formatDate(comment.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap break-words">
                                {comment.comment}
                              </p>
                              {isOwnComment && (
                                <button
                                  type="button"
                                  onClick={() => deleteCommunityComment(comment.id)}
                                  disabled={communityActionLoading}
                                  className="mt-2 text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                                >
                                  Delete comment
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-500">
                Community feedback is informational. Official complaint verification and status decisions remain under the city's administrative workflow.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complaint details modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeComplaintDetails}>
          <div className="bg-white w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 px-5 sm:px-7 py-5 flex items-center justify-between">
              <div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Complaint tracking</p><h2 className="text-xl font-extrabold mt-1">{selectedComplaint.title}</h2><p className="text-xs font-mono text-slate-400 mt-1">{selectedComplaint.complaint_code || selectedComplaint.id}</p></div>
              <button onClick={closeComplaintDetails} className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 sm:p-7 space-y-5">
              <div className="rounded-2xl bg-slate-950 text-white p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div><p className="text-xs uppercase tracking-wider text-slate-400">Current status</p><span className={`inline-flex mt-2 px-3 py-1.5 rounded-full text-sm font-bold ${getStatusClass(selectedComplaint.status)}`}>{selectedComplaint.status}</span></div>
                  <div className="sm:text-right"><p className="text-xs text-slate-400">Last update</p><p className="font-semibold mt-1">{statusHistory.length ? formatDate(statusHistory[statusHistory.length - 1].created_at) : formatDate(selectedComplaint.created_at)}</p></div>
                </div>
                <p className="text-sm text-slate-300 mt-4">{getCurrentStatusDescription(selectedComplaint.status)}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 p-5">
                  <h3 className="font-extrabold text-lg">Complaint Information</h3>
                  <p className="text-sm text-slate-500 mt-3">Description</p>
                  <p className="text-slate-700 mt-1 whitespace-pre-wrap">{selectedComplaint.description}</p>
                  <div className="grid grid-cols-2 gap-4 mt-5">
                    <div><p className="text-xs text-slate-400 uppercase">Category</p><p className="font-semibold mt-1">{selectedComplaint.categories?.name || "Not specified"}</p></div>
                    <div><p className="text-xs text-slate-400 uppercase">Priority</p><p className="font-semibold mt-1">{selectedComplaint.priority || "Normal"}</p></div>
                    <div><p className="text-xs text-slate-400 uppercase">Submitted</p><p className="font-semibold mt-1">{formatDate(selectedComplaint.created_at)}</p></div>
                    {selectedComplaint.resolved_at && <div><p className="text-xs text-slate-400 uppercase">Resolved</p><p className="font-semibold mt-1">{formatDate(selectedComplaint.resolved_at)}</p></div>}
                  </div>
                  {selectedComplaint.address && <div className="mt-5"><p className="text-xs text-slate-400 uppercase">Address</p><p className="font-semibold mt-1">{selectedComplaint.address}</p></div>}
                  {selectedComplaint.latitude != null && selectedComplaint.longitude != null && <a href={`https://www.google.com/maps?q=${selectedComplaint.latitude},${selectedComplaint.longitude}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-semibold"><MapPin className="w-4 h-4" /> Open Location</a>}
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Wrench className="w-5 h-5 text-blue-600" /></div><div><h3 className="font-extrabold">Assigned Worker</h3><p className="text-xs text-slate-500">Complaint handler</p></div></div>
                  {selectedComplaint.assigned_worker_id || selectedComplaint.workers ? (
                    <div className="rounded-xl bg-slate-50 p-4"><p className="font-bold">{getAssignedWorkerName(selectedComplaint)}</p>{getAssignedWorkerDepartment(selectedComplaint) && <p className="text-sm text-slate-600 mt-1">{getAssignedWorkerDepartment(selectedComplaint)}</p>}{getAssignedWorkerSpecialization(selectedComplaint) && <p className="text-sm text-slate-600 mt-1">{getAssignedWorkerSpecialization(selectedComplaint)}</p>}</div>
                  ) : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">A worker has not been assigned yet.</div>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div><h3 className="font-extrabold text-lg">Status Timeline</h3><p className="text-sm text-slate-500 mt-1">Every recorded status change is shown below.</p></div>
                  <button onClick={() => getHistory(selectedComplaint.id)} disabled={historyLoading} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold"><RefreshCw className={`w-4 h-4 ${historyLoading ? "animate-spin" : ""}`} /> Refresh</button>
                </div>
                {historyLoading ? <div className="py-10 text-center text-slate-500"><RefreshCw className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />Loading timeline...</div> : historyError ? <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{historyError}</div> : statusHistory.length === 0 ? <div className="py-10 text-center text-slate-500"><Clock3 className="w-8 h-8 mx-auto text-slate-300 mb-2" />No status history available.</div> : (
                  <div className="relative">
                    {statusHistory.map((history, index) => {
                      const isLast = index === statusHistory.length - 1;
                      return (
                        <div key={history.id || `${history.created_at}-${index}`} className="relative flex gap-4">
                          {!isLast && <div className="absolute left-4 top-9 bottom-0 w-px bg-slate-200" />}
                          <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getStatusDotClass(history.new_status)}`}>
                            {history.new_status === "Resolved" ? <CheckCircle2 className="w-4 h-4 text-white" /> : history.new_status === "Rejected" ? <XCircle className="w-4 h-4 text-white" /> : <Clock3 className="w-4 h-4 text-white" />}
                          </div>
                          <div className="flex-1 pb-7">
                            <div className="flex flex-wrap items-center gap-2"><span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${getHistoryStatusClass(history.new_status)}`}>{history.new_status}</span>{history.old_status && <span className="text-xs text-slate-400">{history.old_status} → {history.new_status}</span>}</div>
                            <p className="text-xs text-slate-500 mt-2">{formatDate(history.created_at)}</p>
                            {history.remarks && <div className="mt-2 rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="text-xs font-semibold text-slate-500">Remarks</p><p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{history.remarks}</p></div>}
                            {history.changed_by && <p className="text-[11px] text-slate-400 mt-2">Updated by: {history.changed_by}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CitizenDashboard;
