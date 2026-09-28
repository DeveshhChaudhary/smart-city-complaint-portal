import { useEffect, useMemo, useState, Fragment, useRef } from "react";
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
  ThumbsDown,
  Trash2,
  Send,
  Filter,
  Trophy,
  UserRound,
  Wrench,
  X,
  XCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Crosshair,
  SlidersHorizontal,
  Layers,
  RotateCcw,
  Bus,
  Car,
  TreePine,
  BookOpen,
  ShoppingBag,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  CheckCheck,
  History,
  Tag,
  Copy,
  TrendingUp,
} from "lucide-react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import NotificationBell from "../../components/NotificationBell";
import smartCityLogo from "../../assets/smart-city-logo.png";

const API_BASE_URL = "https://smart-city-complaint-portal-krs3.onrender.com";

function CitizenMapBounds({ points, userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (userLocation && Number.isFinite(userLocation[0]) && Number.isFinite(userLocation[1])) {
      map.flyTo(userLocation, 14, { duration: 1 });
      return;
    }
    if (!points || !points.length) return;
    const bounds = points.map((point) => [point.latitude, point.longitude]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, points, userLocation]);

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
    all_time_earned: 0,
    total_spent: 0,
    reward_count: 0,
    rewards: [],
    claims: [],
    catalog: [],
  });
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [rewardsError, setRewardsError] = useState("");

  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardRank, setLeaderboardRank] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("all"); // "all" | "month"
  const [leaderboardSearch, setLeaderboardSearch] = useState("");

  // Reward claiming & center sub-navigation states
  const [rewardSubTab, setRewardSubTab] = useState("catalog"); // "catalog" | "claims" | "points" | "badges" | "leaderboard" | "impact"
  const [rewardCategoryFilter, setRewardCategoryFilter] = useState("All");
  const [selectedRewardToClaim, setSelectedRewardToClaim] = useState(null);
  const [claimingReward, setClaimingReward] = useState(false);
  const [claimSuccessModal, setClaimSuccessModal] = useState(null);
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all"); // "all" | "earned" | "spent"

  const [complaintSearch, setComplaintSearch] = useState("");
  const [complaintFilterSearch, setComplaintFilterSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");

  const [trackingComplaint, setTrackingComplaint] = useState(false);
  const [trackMessage, setTrackMessage] = useState("");
  const [showTrackModal, setShowTrackModal] = useState(false);

  // Civic Map Filters & Interactive State
  const [mapCategoryFilter, setMapCategoryFilter] = useState("All");
  const [mapStatusFilter, setMapStatusFilter] = useState("All");
  const [mapTimeFilter, setMapTimeFilter] = useState("All");
  const [mapLocationFilter, setMapLocationFilter] = useState("All");
  const [mapViewMode, setMapViewMode] = useState("markers"); // "markers" | "heatmap"
  const [userGeoLocation, setUserGeoLocation] = useState(null); // [lat, lng]
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

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
  const [complaintEvidence, setComplaintEvidence] = useState(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Community complaints, filters, verification, and discussion modal
  const [communityComplaints, setCommunityComplaints] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityError, setCommunityError] = useState("");
  const [communityFilterSearch, setCommunityFilterSearch] = useState("");
  const [communityStatusFilter, setCommunityStatusFilter] = useState("All");
  const [communityCategoryFilter, setCommunityCategoryFilter] = useState("All");
  const [communitySortBy, setCommunitySortBy] = useState("recent");
  const [communityAreaFilter, setCommunityAreaFilter] = useState("All");

  // Selected community complaint for instant details & async comments modal
  const [selectedCommunityComplaint, setSelectedCommunityComplaint] = useState(null);
  const [communityComments, setCommunityComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [communityComment, setCommunityComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [votingComplaintId, setVotingComplaintId] = useState(null);
  const fetchingCommentsRef = useRef(null);
  const commentInputRef = useRef(null);

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

  const fetchLeaderboard = async (period = leaderboardPeriod) => {
    try {
      setLeaderboardLoading(true);
      setLeaderboardError("");
      const token = getToken();
      if (!token) return;

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/leaderboard?period=${period || "all"}`,
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
        all_time_earned: Number(response.data?.all_time_earned || 0),
        total_spent: Number(response.data?.total_spent || 0),
        reward_count: Number(response.data?.reward_count || 0),
        rewards: Array.isArray(response.data?.rewards) ? response.data.rewards : [],
        claims: Array.isArray(response.data?.claims) ? response.data.claims : [],
        catalog: Array.isArray(response.data?.catalog) ? response.data.catalog : [],
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

  const handleInitiateClaim = (reward) => {
    if (rewardData.total_points < reward.points_required) {
      const missing = reward.points_required - rewardData.total_points;
      showToast(`You need ${missing} more points to claim ${reward.name}.`, "error");
      return;
    }
    setSelectedRewardToClaim(reward);
  };

  const handleConfirmClaim = async () => {
    if (!selectedRewardToClaim) return;
    try {
      setClaimingReward(true);
      const token = getToken();
      const response = await axios.post(
        `${API_BASE_URL}/api/complaints/rewards/claim`,
        { reward_id: selectedRewardToClaim.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.success) {
        const claimResult = response.data.claim;
        const newTotalPoints = response.data.total_points;

        setRewardData((prev) => ({
          ...prev,
          total_points: newTotalPoints,
          total_spent: (prev.total_spent || 0) + (claimResult.points_spent || 0),
          reward_count: (prev.reward_count || 0) + 1,
          claims: [claimResult, ...(prev.claims || [])],
          rewards: [
            {
              id: claimResult.id,
              points: -claimResult.points_spent,
              reason: `Claimed: ${claimResult.reward_name} (Ref: ${claimResult.claim_code})`,
              created_at: claimResult.created_at,
            },
            ...(prev.rewards || []),
          ],
        }));

        setSelectedRewardToClaim(null);
        setClaimSuccessModal(claimResult);
        showToast(response.data.message || "Reward claimed successfully!", "success");
        fetchLeaderboard();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to claim reward. Please try again.", "error");
    } finally {
      setClaimingReward(false);
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

  // Open community complaint details modal INSTANTLY (0ms latency)
  const openCommunityModal = (complaint, focusComments = false) => {
    setSelectedCommunityComplaint(complaint);
    setCommunityComments([]);
    setCommentsError("");
    setCommunityComment("");
    setCommentsLoading(true);

    // Fetch comments asynchronously
    fetchCommunityComments(complaint.id);

    if (focusComments) {
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 150);
    }
  };

  const closeCommunityModal = () => {
    setSelectedCommunityComplaint(null);
    setCommunityComments([]);
    setCommentsError("");
    setCommunityComment("");
    setCommentsLoading(false);
    fetchingCommentsRef.current = null;
  };

  const fetchCommunityComments = async (complaintId) => {
    const token = getToken();
    if (!token) return;

    fetchingCommentsRef.current = complaintId;
    try {
      setCommentsLoading(true);
      setCommentsError("");

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints/${complaintId}/community`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Verify that this response is still for the currently open complaint
      if (fetchingCommentsRef.current === complaintId) {
        const fetchedComments = Array.isArray(response.data?.comments)
          ? response.data.comments
          : [];
        setCommunityComments(fetchedComments);

        // Sync counts
        const updatedDetails = response.data;
        setSelectedCommunityComplaint((prev) => {
          if (!prev || prev.id !== complaintId) return prev;
          return {
            ...prev,
            support_count: updatedDetails.support_count ?? prev.support_count,
            user_supported: updatedDetails.user_supported ?? prev.user_supported,
            genuine_count: updatedDetails.genuine_count ?? prev.genuine_count,
            not_genuine_count: updatedDetails.not_genuine_count ?? prev.not_genuine_count,
            user_feedback: updatedDetails.user_feedback ?? prev.user_feedback,
            comment_count: updatedDetails.comment_count ?? fetchedComments.length,
          };
        });

        // Also sync item in community complaints list
        setCommunityComplaints((prevList) =>
          prevList.map((item) =>
            item.id === complaintId
              ? {
                  ...item,
                  support_count: updatedDetails.support_count ?? item.support_count,
                  user_supported: updatedDetails.user_supported ?? item.user_supported,
                  genuine_count: updatedDetails.genuine_count ?? item.genuine_count,
                  not_genuine_count: updatedDetails.not_genuine_count ?? item.not_genuine_count,
                  user_feedback: updatedDetails.user_feedback ?? item.user_feedback,
                  comment_count: updatedDetails.comment_count ?? fetchedComments.length,
                }
              : item
          )
        );
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      if (fetchingCommentsRef.current === complaintId) {
        setCommentsError(
          err.response?.data?.detail || "Unable to load community comments. Please try again."
        );
      }
    } finally {
      if (fetchingCommentsRef.current === complaintId) {
        setCommentsLoading(false);
      }
    }
  };

  const handleToggleSupport = async (complaint, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const token = getToken();
    if (!token) return;

    if (complaint.is_owner || String(complaint.citizen_id || complaint.user_id || "") === String(user?.id || "")) {
      setCommunityError("You cannot support your own complaint.");
      return;
    }

    if (votingComplaintId === complaint.id) return;
    setVotingComplaintId(complaint.id);

    const isCurrentlySupported = Boolean(complaint.current_user_supported ?? complaint.user_supported);

    try {
      if (isCurrentlySupported) {
        await axios.delete(`${API_BASE_URL}/api/complaints/${complaint.id}/support`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Local state update
        setCommunityComplaints((prev) =>
          prev.map((item) =>
            item.id === complaint.id
              ? {
                  ...item,
                  user_supported: false,
                  current_user_supported: false,
                  support_count: Math.max(0, (item.support_count || 1) - 1),
                }
              : item
          )
        );

        setSelectedCommunityComplaint((prev) =>
          prev && prev.id === complaint.id
            ? {
                ...prev,
                user_supported: false,
                current_user_supported: false,
                support_count: Math.max(0, (prev.support_count || 1) - 1),
              }
            : prev
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/api/complaints/${complaint.id}/support`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Local state update
        setCommunityComplaints((prev) =>
          prev.map((item) =>
            item.id === complaint.id
              ? {
                  ...item,
                  user_supported: true,
                  current_user_supported: true,
                  support_count: (item.support_count || 0) + 1,
                }
              : item
          )
        );

        setSelectedCommunityComplaint((prev) =>
          prev && prev.id === complaint.id
            ? {
                ...prev,
                user_supported: true,
                current_user_supported: true,
                support_count: (prev.support_count || 0) + 1,
              }
            : prev
        );
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setCommunityError(err.response?.data?.detail || "Unable to update support vote.");
    } finally {
      setVotingComplaintId(null);
    }
  };

  const handleVoteFeedback = async (complaint, feedbackType, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const token = getToken();
    if (!token) return;

    if (complaint.is_owner || String(complaint.citizen_id || complaint.user_id || "") === String(user?.id || "")) {
      setCommunityError("You cannot vote on the genuineness of your own complaint.");
      return;
    }

    if (votingComplaintId === complaint.id) return;
    setVotingComplaintId(complaint.id);

    const currentVote = complaint.user_feedback;

    try {
      if (currentVote === feedbackType) {
        // Toggle off / remove vote
        await axios.delete(`${API_BASE_URL}/api/complaints/${complaint.id}/feedback`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const updateItem = (item) => ({
          ...item,
          user_feedback: null,
          genuine_count:
            feedbackType === "genuine"
              ? Math.max(0, (item.genuine_count || 1) - 1)
              : item.genuine_count || 0,
          not_genuine_count:
            feedbackType === "not_genuine"
              ? Math.max(0, (item.not_genuine_count || 1) - 1)
              : item.not_genuine_count || 0,
        });

        setCommunityComplaints((prev) =>
          prev.map((item) => (item.id === complaint.id ? updateItem(item) : item))
        );

        setSelectedCommunityComplaint((prev) =>
          prev && prev.id === complaint.id ? updateItem(prev) : prev
        );
      } else {
        // Submit or change vote
        await axios.post(
          `${API_BASE_URL}/api/complaints/${complaint.id}/feedback`,
          { feedback_type: feedbackType },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const updateItem = (item) => {
          let gCount = item.genuine_count || 0;
          let ngCount = item.not_genuine_count || 0;

          if (currentVote === "genuine") gCount = Math.max(0, gCount - 1);
          if (currentVote === "not_genuine") ngCount = Math.max(0, ngCount - 1);

          if (feedbackType === "genuine") gCount += 1;
          if (feedbackType === "not_genuine") ngCount += 1;

          return {
            ...item,
            user_feedback: feedbackType,
            genuine_count: gCount,
            not_genuine_count: ngCount,
          };
        };

        setCommunityComplaints((prev) =>
          prev.map((item) => (item.id === complaint.id ? updateItem(item) : item))
        );

        setSelectedCommunityComplaint((prev) =>
          prev && prev.id === complaint.id ? updateItem(prev) : prev
        );
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setCommunityError(err.response?.data?.detail || "Unable to submit verification vote.");
    } finally {
      setVotingComplaintId(null);
    }
  };

  const handleAddCommunityComment = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    const complaintId = selectedCommunityComplaint?.id;
    const commentText = communityComment.trim();
    if (!complaintId || !commentText) return;

    try {
      setSubmittingComment(true);
      const response = await axios.post(
        `${API_BASE_URL}/api/complaints/${complaintId}/comments`,
        { comment: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const returnedComment = response.data?.comment;
      const newCommentObj = returnedComment
        ? {
            ...returnedComment,
            user_name: returnedComment.user_name || user?.name || "Citizen",
            profile_image_url: returnedComment.profile_image_url || user?.profile_image_url,
          }
        : {
            id: `temp-${Date.now()}`,
            user_id: user?.id,
            user_name: user?.name || "Citizen",
            profile_image_url: user?.profile_image_url,
            comment: commentText,
            created_at: new Date().toISOString(),
          };

      setCommunityComments((prev) => [...prev, newCommentObj]);
      setCommunityComment("");

      // Update comment count on open modal & community card list
      setSelectedCommunityComplaint((prev) =>
        prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev
      );

      setCommunityComplaints((prev) =>
        prev.map((item) =>
          item.id === complaintId
            ? { ...item, comment_count: (item.comment_count || 0) + 1 }
            : item
        )
      );
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setCommunityError(err.response?.data?.detail || "Unable to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteCommunityComment = async (commentId) => {
    const token = getToken();
    if (!token) return;

    const complaintId = selectedCommunityComplaint?.id;
    if (!complaintId || !commentId) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/api/complaints/${complaintId}/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCommunityComments((prev) => prev.filter((item) => item.id !== commentId));

      setSelectedCommunityComplaint((prev) =>
        prev ? { ...prev, comment_count: Math.max(0, (prev.comment_count || 1) - 1) } : prev
      );

      setCommunityComplaints((prev) =>
        prev.map((item) =>
          item.id === complaintId
            ? { ...item, comment_count: Math.max(0, (item.comment_count || 1) - 1) }
            : item
        )
      );
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        return;
      }
      setCommunityError(err.response?.data?.detail || "Unable to delete comment.");
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

  const loadComplaintEvidence = async (complaintId) => {
    if (!complaintId) return;
    const token = getToken();
    if (!token) return;
    try {
      setLoadingEvidence(true);
      setComplaintEvidence(null);
      const res = await axios.get(
        `${API_BASE_URL}/api/complaints/${complaintId}/completion-evidence`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success && res.data.evidence) {
        setComplaintEvidence({
          ...res.data.evidence,
          rework_reason: res.data.rework_reason,
          verification_status: res.data.verification_status,
          is_verified: res.data.is_verified,
        });
      }
    } catch (err) {
      console.error("Citizen load evidence error:", err);
    } finally {
      setLoadingEvidence(false);
    }
  };

  const openComplaintDetails = async (complaint) => {
    setSelectedComplaint(complaint);
    setStatusHistory([]);
    setHistoryError("");
    setComplaintEvidence(null);
    await Promise.all([
      getHistory(complaint.id),
      loadComplaintEvidence(complaint.id),
    ]);
  };

  const closeComplaintDetails = () => {
    setSelectedComplaint(null);
    setStatusHistory([]);
    setHistoryError("");
    setComplaintEvidence(null);
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
    const p = Math.max(0, Number(points) || 0);
    if (p >= 500) {
      return {
        level: 5,
        name: "City Legend",
        nextLevelName: null,
        nextPoints: 0,
        minPoints: 500,
        maxPoints: 500,
        progressPct: 100,
        icon: Trophy,
        badgeBg: "bg-amber-500 text-white",
        textColor: "text-amber-600",
        description: "The pinnacle of urban citizenship and civic dedication.",
      };
    }
    if (p >= 250) {
      return {
        level: 4,
        name: "Civic Champion",
        nextLevelName: "City Legend",
        nextPoints: 500 - p,
        minPoints: 250,
        maxPoints: 500,
        progressPct: Math.min(100, Math.round(((p - 250) / 250) * 100)),
        icon: Star,
        badgeBg: "bg-purple-600 text-white",
        textColor: "text-purple-600",
        description: "Outstanding champion actively improving municipal infrastructure.",
      };
    }
    if (p >= 100) {
      return {
        level: 3,
        name: "Urban Ambassador",
        nextLevelName: "Civic Champion",
        nextPoints: 250 - p,
        minPoints: 100,
        maxPoints: 250,
        progressPct: Math.min(100, Math.round(((p - 100) / 150) * 100)),
        icon: Award,
        badgeBg: "bg-blue-600 text-white",
        textColor: "text-blue-600",
        description: "Influential community pillar driving local civic resolutions.",
      };
    }
    if (p >= 50) {
      return {
        level: 2,
        name: "Community Guardian",
        nextLevelName: "Urban Ambassador",
        nextPoints: 100 - p,
        minPoints: 50,
        maxPoints: 100,
        progressPct: Math.min(100, Math.round(((p - 50) / 50) * 100)),
        icon: ShieldCheck,
        badgeBg: "bg-emerald-600 text-white",
        textColor: "text-emerald-600",
        description: "Committed guardian reporting hazards and keeping streets safe.",
      };
    }
    return {
      level: 1,
      name: "Civic Scout",
      nextLevelName: "Community Guardian",
      nextPoints: 50 - p,
      minPoints: 0,
      maxPoints: 50,
      progressPct: Math.min(100, Math.round((p / 50) * 100)),
      icon: MapPin,
      badgeBg: "bg-slate-700 text-white",
      textColor: "text-slate-700",
      description: "Welcome to the civic network! Start reporting issues to rank up.",
    };
  };

  const rewardLevel = getRewardLevel(rewardData.total_points);

  const achievementBadges = useMemo(() => {
    const sub = complaints.length;
    const res = resolvedCount;
    const pts = Number(rewardData.total_points || 0);
    const supportedCount = (communityComplaints || []).filter((c) => c.user_supported).length;
    const verifiedCount = (communityComplaints || []).filter((c) => c.user_feedback !== null && c.user_feedback !== undefined).length;

    return [
      {
        id: "b1",
        title: "First Report",
        desc: "Submit your 1st civic complaint",
        requirement: "Submit 1 complaint",
        current: Math.min(1, sub),
        target: 1,
        progressPct: Math.min(100, Math.round((sub / 1) * 100)),
        unlocked: sub >= 1,
        icon: MapPin,
      },
      {
        id: "b2",
        title: "Civic Starter",
        desc: "Submit 5 civic complaints",
        requirement: "Submit 5 complaints",
        current: Math.min(5, sub),
        target: 5,
        progressPct: Math.min(100, Math.round((sub / 5) * 100)),
        unlocked: sub >= 5,
        icon: Award,
      },
      {
        id: "b3",
        title: "Civic Contributor",
        desc: "Submit 10 civic complaints",
        requirement: "Submit 10 complaints",
        current: Math.min(10, sub),
        target: 10,
        progressPct: Math.min(100, Math.round((sub / 10) * 100)),
        unlocked: sub >= 10,
        icon: Trophy,
      },
      {
        id: "b4",
        title: "Community Helper",
        desc: "Have 3 complaints resolved",
        requirement: "3 complaints resolved",
        current: Math.min(3, res),
        target: 3,
        progressPct: Math.min(100, Math.round((res / 3) * 100)),
        unlocked: res >= 3,
        icon: CheckCircle2,
      },
      {
        id: "b5",
        title: "Civic Resolver",
        desc: "Have 5 complaints resolved",
        requirement: "5 complaints resolved",
        current: Math.min(5, res),
        target: 5,
        progressPct: Math.min(100, Math.round((res / 5) * 100)),
        unlocked: res >= 5,
        icon: CheckCheck,
      },
      {
        id: "b6",
        title: "Active Supporter",
        desc: "Support 3 community issues",
        requirement: "Support 3 complaints",
        current: Math.min(3, supportedCount),
        target: 3,
        progressPct: Math.min(100, Math.round((supportedCount / 3) * 100)),
        unlocked: supportedCount >= 3,
        icon: ThumbsUp,
      },
      {
        id: "b7",
        title: "Verified Citizen",
        desc: "Verify 3 community issues",
        requirement: "Vote genuine/not genuine on 3 issues",
        current: Math.min(3, verifiedCount),
        target: 3,
        progressPct: Math.min(100, Math.round((verifiedCount / 3) * 100)),
        unlocked: verifiedCount >= 3,
        icon: ShieldCheck,
      },
      {
        id: "b8",
        title: "Civic Champion",
        desc: "Accumulate 100+ reward points",
        requirement: "Earn 100 points",
        current: Math.min(100, pts),
        target: 100,
        progressPct: Math.min(100, Math.round((pts / 100) * 100)),
        unlocked: pts >= 100,
        icon: Star,
      },
    ];
  }, [complaints.length, resolvedCount, rewardData.total_points, communityComplaints]);

  const defaultRewardCatalog = [
    {
      id: "rew-transit-pass",
      name: "City Metro 1-Day Transit Pass",
      description: "Unlimited one-day travel on municipal city metro and bus transit networks.",
      points_required: 50,
      category: "Transit",
      status: "Active",
      icon: "Bus",
      popular: true,
    },
    {
      id: "rew-parking-voucher",
      name: "Smart Parking 2-Hour Voucher",
      description: "2 hours of complimentary municipal public parking at any Smart City designated lot.",
      points_required: 40,
      category: "Mobility",
      status: "Active",
      icon: "Car",
    },
    {
      id: "rew-tree-plant",
      name: "Plant a Tree in City Park",
      description: "Dedicate a native sapling planted by the Parks Department with a geotagged civic certificate.",
      points_required: 80,
      category: "Environment",
      status: "Active",
      icon: "TreePine",
      popular: true,
    },
    {
      id: "rew-library-gold",
      name: "Central Library Gold Pass",
      description: "3-month priority access to municipal digital archives, research rooms, and coworking spaces.",
      points_required: 60,
      category: "Education",
      status: "Active",
      icon: "BookOpen",
    },
    {
      id: "rew-eco-kit",
      name: "Civic Eco-Friendly Kit",
      description: "Jute tote bag, reusable stainless steel bottle, and municipal compost starter kit.",
      points_required: 75,
      category: "Sustainability",
      status: "Active",
      icon: "ShoppingBag",
    },
    {
      id: "rew-civic-certificate",
      name: "Official Civic Champion Certificate",
      description: "Personalized digital certificate of civic excellence signed by City Municipal Authority.",
      points_required: 100,
      category: "Recognition",
      status: "Active",
      icon: "Award",
    },
    {
      id: "rew-heritage-pass",
      name: "Municipal Heritage & Museum Pass",
      description: "Free admission for 2 persons to all city museums and cultural heritage sites.",
      points_required: 90,
      category: "Culture",
      status: "Active",
      icon: "Landmark",
    },
  ];

  const getRewardIcon = (iconName) => {
    switch (iconName) {
      case "Bus": return Bus;
      case "Car": return Car;
      case "TreePine": return TreePine;
      case "BookOpen": return BookOpen;
      case "ShoppingBag": return ShoppingBag;
      case "Award": return Award;
      case "Landmark": return Landmark;
      default: return Gift;
    }
  };

  const copyToClipboard = (text, label = "Code") => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`, "success");
    }
  };

  const activeRewardsCatalog = useMemo(() => {
    return Array.isArray(rewardData.catalog) && rewardData.catalog.length > 0
      ? rewardData.catalog
      : defaultRewardCatalog;
  }, [rewardData.catalog]);

  const filteredCatalog = useMemo(() => {
    return activeRewardsCatalog.filter((item) => {
      if (rewardCategoryFilter !== "All" && item.category !== rewardCategoryFilter) {
        return false;
      }
      return true;
    });
  }, [activeRewardsCatalog, rewardCategoryFilter]);

  const filteredHistory = useMemo(() => {
    const list = Array.isArray(rewardData.rewards) ? rewardData.rewards : [];
    if (historyTypeFilter === "earned") {
      return list.filter((r) => Number(r.points || 0) > 0);
    }
    if (historyTypeFilter === "spent") {
      return list.filter((r) => Number(r.points || 0) < 0 || (r.reason && r.reason.startsWith("Claimed:")));
    }
    return list;
  }, [rewardData.rewards, historyTypeFilter]);

  const filteredLeaderboardList = useMemo(() => {
    if (!leaderboardSearch.trim()) return leaderboard;
    const q = leaderboardSearch.toLowerCase();
    return leaderboard.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [leaderboard, leaderboardSearch]);

  const unlockedBadgesCount = useMemo(() => {
    return achievementBadges.filter((b) => b.unlocked).length;
  }, [achievementBadges]);

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

  // Dynamic Civic Map filter options derived strictly from existing complaint records
  const mapCategoryOptions = useMemo(() => {
    const cats = new Set();
    complaints.forEach((c) => {
      const name = c.categories?.name || c.category_name;
      if (name && name.trim()) cats.add(name.trim());
    });
    const standardCategories = [
      "Roads & Potholes",
      "Garbage & Sanitation",
      "Water Supply",
      "Street Lights & Electricity",
      "Drainage",
      "Traffic & Signals",
      "Other",
    ];
    standardCategories.forEach((sc) => cats.add(sc));
    return ["All Categories", ...Array.from(cats).sort()];
  }, [complaints]);

  const mapLocationOptions = useMemo(() => {
    const locs = new Set();
    let hasUnspecified = false;
    complaints.forEach((c) => {
      const addr = c.address ? c.address.trim() : "";
      if (addr) {
        locs.add(addr);
      } else {
        hasUnspecified = true;
      }
    });
    const list = Array.from(locs).sort();
    if (hasUnspecified) {
      list.push("Unspecified Locality");
    }
    return ["All Areas / Localities", ...list];
  }, [complaints]);

  // Filtered complaints matching all active map criteria
  const filteredMapComplaints = useMemo(() => {
    const now = Date.now();

    return mapComplaints.filter((c) => {
      // 1. Category Filter
      if (mapCategoryFilter !== "All" && mapCategoryFilter !== "All Categories") {
        const catName = c.categories?.name || c.category_name || "Other";
        if (catName !== mapCategoryFilter) return false;
      }

      // 2. Status Filter
      if (mapStatusFilter !== "All" && mapStatusFilter !== "All Statuses") {
        const st = (c.status || "").toLowerCase();
        if (mapStatusFilter === "Submitted/Pending") {
          if (st !== "submitted" && st !== "pending") return false;
        } else if (mapStatusFilter === "In Progress") {
          if (st !== "in progress" && st !== "assigned") return false;
        } else if (mapStatusFilter === "Resolved") {
          if (st !== "resolved") return false;
        } else if (mapStatusFilter === "Rejected") {
          if (st !== "rejected") return false;
        }
      }

      // 3. Time Period Filter
      if (mapTimeFilter !== "All" && mapTimeFilter !== "All Time") {
        if (!c.created_at) return false;
        const createdMs = new Date(c.created_at).getTime();
        const diffHours = (now - createdMs) / (1000 * 60 * 60);
        if (mapTimeFilter === "Today" && diffHours > 24) return false;
        if (mapTimeFilter === "Last 7 Days" && diffHours > 24 * 7) return false;
        if (mapTimeFilter === "Last 30 Days" && diffHours > 24 * 30) return false;
        if (mapTimeFilter === "Last 3 Months" && diffHours > 24 * 90) return false;
      }

      // 4. Locality / Area Filter
      if (mapLocationFilter !== "All" && mapLocationFilter !== "All Areas / Localities") {
        if (mapLocationFilter === "Unspecified Locality") {
          if (c.address && c.address.trim()) return false;
        } else {
          if (!c.address || c.address.trim() !== mapLocationFilter) return false;
        }
      }

      return true;
    });
  }, [mapComplaints, mapCategoryFilter, mapStatusFilter, mapTimeFilter, mapLocationFilter]);

  // Spatial density calculation for Heatmap mode
  const heatmapData = useMemo(() => {
    return filteredMapComplaints.map((pt, _, arr) => {
      let nearbyCount = 0;
      arr.forEach((other) => {
        const dLat = pt.latitude - other.latitude;
        const dLng = pt.longitude - other.longitude;
        if (dLat * dLat + dLng * dLng < 0.0004) {
          nearbyCount++;
        }
      });

      let heatColor = "#FBBF24";
      let coreColor = "#F59E0B";
      let intensityLabel = "Low Density";
      let outerRadius = 24;
      let innerRadius = 10;

      if (nearbyCount >= 4) {
        heatColor = "#EF4444";
        coreColor = "#B91C1C";
        intensityLabel = "High Concentration";
        outerRadius = 38;
        innerRadius = 16;
      } else if (nearbyCount >= 2) {
        heatColor = "#F97316";
        coreColor = "#EA580C";
        intensityLabel = "Moderate Concentration";
        outerRadius = 30;
        innerRadius = 13;
      }

      return {
        ...pt,
        nearbyCount,
        heatColor,
        coreColor,
        intensityLabel,
        outerRadius,
        innerRadius,
      };
    });
  }, [filteredMapComplaints]);

  const handleResetMapFilters = () => {
    setMapCategoryFilter("All");
    setMapStatusFilter("All");
    setMapTimeFilter("All");
    setMapLocationFilter("All");
    setUserGeoLocation(null);
    setGeoError("");
  };

  const handleLocateMe = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        const { latitude, longitude } = pos.coords;
        setUserGeoLocation([latitude, longitude]);
      },
      (err) => {
        setGeoLocating(false);
        if (err.code === 1) {
          setGeoError("Location permission denied. Please allow access in browser settings.");
        } else {
          setGeoError("Unable to retrieve location. Please try again.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Real statistics derived strictly from community API complaints
  const communityStats = useMemo(() => {
    const total = communityComplaints.length;
    const totalSupports = communityComplaints.reduce((sum, c) => sum + (c.support_count || 0), 0);
    const totalGenuine = communityComplaints.reduce((sum, c) => sum + (c.genuine_count || 0), 0);
    const totalNotGenuine = communityComplaints.reduce((sum, c) => sum + (c.not_genuine_count || 0), 0);
    const totalComments = communityComplaints.reduce((sum, c) => sum + (c.comment_count || 0), 0);
    const totalResolved = communityComplaints.filter(
      (c) => String(c.status || "").toLowerCase() === "resolved"
    ).length;

    return {
      total,
      totalSupports,
      totalGenuine,
      totalNotGenuine,
      totalComments,
      totalResolved,
    };
  }, [communityComplaints]);

  // Dynamic Category options for Community Filter
  const communityCategoryOptions = useMemo(() => {
    const cats = new Set();
    communityComplaints.forEach((c) => {
      const name = c.categories?.name || c.category_name;
      if (name && name.trim()) cats.add(name.trim());
    });
    return ["All Categories", ...Array.from(cats).sort()];
  }, [communityComplaints]);

  // Filtered Community Complaints with search, status, category, nearby and sorting
  const filteredCommunityComplaints = useMemo(() => {
    let result = [...communityComplaints];
    const search = communityFilterSearch.trim().toLowerCase();

    // 1. Text Search (title, complaint_code, id, description, category, address)
    if (search) {
      result = result.filter((c) => {
        const text = [
          c.title,
          c.complaint_code,
          c.id,
          c.description,
          c.categories?.name,
          c.category_name,
          c.address,
          c.location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(search);
      });
    }

    // 2. Status / Quick tab filter
    if (communityStatusFilter === "Unresolved") {
      result = result.filter(
        (c) => !["resolved", "rejected"].includes(String(c.status || "").toLowerCase())
      );
    } else if (communityStatusFilter === "Resolved") {
      result = result.filter((c) => String(c.status || "").toLowerCase() === "resolved");
    } else if (communityStatusFilter !== "All") {
      result = result.filter(
        (c) => String(c.status || "").toLowerCase() === communityStatusFilter.toLowerCase()
      );
    }

    // 3. Nearby / My Area filter
    if (communityAreaFilter === "Nearby") {
      const myAddresses = complaints
        .map((c) => c.address)
        .filter(Boolean)
        .map((a) => a.trim().toLowerCase());
      if (myAddresses.length > 0) {
        result = result.filter((c) => {
          if (!c.address) return false;
          const addr = c.address.trim().toLowerCase();
          return myAddresses.some((myA) => addr.includes(myA) || myA.includes(addr));
        });
      } else {
        result = result.filter((c) => Boolean(c.address && c.address.trim()));
      }
    }

    // 4. Category filter
    if (communityCategoryFilter !== "All" && communityCategoryFilter !== "All Categories") {
      result = result.filter((c) => {
        const name = c.categories?.name || c.category_name || "Other";
        return name === communityCategoryFilter;
      });
    }

    // 5. Sorting
    if (communitySortBy === "supported") {
      result.sort((a, b) => (b.support_count || 0) - (a.support_count || 0));
    } else if (communitySortBy === "discussed") {
      result.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
    } else {
      // Default: most recent
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return result;
  }, [
    communityComplaints,
    communityFilterSearch,
    communityStatusFilter,
    communityAreaFilter,
    communityCategoryFilter,
    communitySortBy,
    complaints,
  ]);

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
            {/* Header with Title and Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Civic Map
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Interactive spatial visualization and density intelligence for local civic complaints.
                </p>
              </div>

              {/* View Mode Toggle: [ Markers ] [ Heatmap ] + [ Locate Me ] */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setMapViewMode("markers")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                      mapViewMode === "markers"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Markers</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapViewMode("heatmap")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                      mapViewMode === "heatmap"
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span>Heatmap</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleLocateMe}
                  disabled={geoLocating}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition disabled:opacity-60"
                  title="Center map on your location"
                >
                  <Crosshair className={`w-3.5 h-3.5 text-blue-600 ${geoLocating ? "animate-spin" : ""}`} />
                  <span>{geoLocating ? "Locating..." : "Locate Me"}</span>
                </button>
              </div>
            </div>

            {/* Geolocation feedback if any */}
            {geoError && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-xs">
                <span>{geoError}</span>
                <button
                  type="button"
                  onClick={() => setGeoError("")}
                  className="text-amber-600 hover:text-amber-800 font-bold ml-2"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Live Map Statistics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Mapped
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {mapComplaints.length}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  All GPS-located issues
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
                  Active Issues
                </span>
                <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                  {mapComplaints.filter((c) => c.status !== "Resolved" && c.status !== "Rejected").length}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Pending & in progress
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                  Resolved
                </span>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                  {mapComplaints.filter((c) => c.status === "Resolved").length}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Successfully addressed
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                  Visible Filtered
                </span>
                <p className="text-xl sm:text-2xl font-black text-blue-600 mt-1">
                  {filteredMapComplaints.length}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Showing on current map
                </span>
              </div>
            </div>

            {/* Filter Controls Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                  <span>Interactive Map Filters</span>
                </div>
                {(mapCategoryFilter !== "All" ||
                  mapStatusFilter !== "All" ||
                  mapTimeFilter !== "All" ||
                  mapLocationFilter !== "All") && (
                  <button
                    type="button"
                    onClick={handleResetMapFilters}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Category Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={mapCategoryFilter}
                    onChange={(e) => setMapCategoryFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {mapCategoryOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Status Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={mapStatusFilter}
                    onChange={(e) => setMapStatusFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Submitted/Pending">Submitted / Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* 3. Time Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Time Period
                  </label>
                  <select
                    value={mapTimeFilter}
                    onChange={(e) => setMapTimeFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Time</option>
                    <option value="Today">Today (Last 24h)</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                    <option value="Last 3 Months">Last 3 Months</option>
                  </select>
                </div>

                {/* 4. Location / Locality Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Area / Locality
                  </label>
                  <select
                    value={mapLocationFilter}
                    onChange={(e) => setMapLocationFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {mapLocationOptions.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Main Interactive Map Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">
                    {mapViewMode === "markers" ? "Marker View" : "Density Heatmap"}
                  </span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="text-slate-500">
                    {filteredMapComplaints.length} complaint{filteredMapComplaints.length === 1 ? "" : "s"} visible
                  </span>
                </div>
                <span className="text-slate-400 text-[11px]">
                  {mapViewMode === "markers"
                    ? "Click any marker to inspect complaint details"
                    : "Clusters highlight geographic concentration of civic issues"}
                </span>
              </div>

              {/* Map Container */}
              <div className="h-[420px] sm:h-[540px] w-full rounded-2xl overflow-hidden border border-slate-200 relative isolate z-0">
                {filteredMapComplaints.length > 0 || userGeoLocation ? (
                  <MapContainer
                    center={userGeoLocation || mapCenter}
                    zoom={13}
                    className="h-full w-full z-0"
                    style={{ zIndex: 0 }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <CitizenMapBounds
                      points={filteredMapComplaints}
                      userLocation={userGeoLocation}
                    />

                    {/* User Current Location Marker */}
                    {userGeoLocation && (
                      <CircleMarker
                        center={userGeoLocation}
                        radius={10}
                        pathOptions={{
                          color: "#2563EB",
                          weight: 3,
                          fillColor: "#60A5FA",
                          fillOpacity: 0.9,
                        }}
                      >
                        <Popup>
                          <div className="p-1 text-xs">
                            <p className="font-bold text-slate-900">Your Current Location</p>
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              {userGeoLocation[0].toFixed(5)}, {userGeoLocation[1].toFixed(5)}
                            </p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    )}

                    {/* MARKERS MODE */}
                    {mapViewMode === "markers" &&
                      filteredMapComplaints.map((c) => {
                        const markerColor =
                          c.status === "Resolved"
                            ? "#10B981"
                            : c.status === "In Progress" || c.status === "Assigned"
                            ? "#F59E0B"
                            : c.status === "Rejected"
                            ? "#EF4444"
                            : "#3B82F6";

                        return (
                          <CircleMarker
                            key={c.id}
                            center={[c.latitude, c.longitude]}
                            radius={9}
                            pathOptions={{
                              color: "#FFFFFF",
                              weight: 2.5,
                              fillColor: markerColor,
                              fillOpacity: 0.9,
                            }}
                          >
                            <Popup>
                              <div className="p-1 space-y-1.5 max-w-[240px]">
                                {c.complaint_code && (
                                  <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                    #{c.complaint_code}
                                  </span>
                                )}
                                <p className="font-bold text-slate-900 text-sm leading-tight mt-1">
                                  {c.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {c.categories?.name || c.category_name || "Civic Issue"}
                                  </span>
                                  {getStatusBadge(c.status)}
                                </div>
                                <p className="text-xs text-slate-500 flex items-center gap-1 pt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span className="truncate">
                                    {c.address || `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`}
                                  </span>
                                </p>
                                {c.created_at && (
                                  <p className="text-[10px] text-slate-400">
                                    Reported: {new Date(c.created_at).toLocaleDateString()} ({getTimeAgo(c.created_at)})
                                  </p>
                                )}
                                <div className="pt-2 border-t border-slate-100">
                                  <button
                                    onClick={() => openComplaintDetails(c)}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                  >
                                    <span>Open Complaint Details</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </Popup>
                          </CircleMarker>
                        );
                      })}

                    {/* HEATMAP MODE */}
                    {mapViewMode === "heatmap" &&
                      heatmapData.map((pt) => (
                        <Fragment key={`heat-group-${pt.id}`}>
                          {/* Outer soft glow ring */}
                          <CircleMarker
                            center={[pt.latitude, pt.longitude]}
                            radius={pt.outerRadius}
                            pathOptions={{
                              stroke: false,
                              fillColor: pt.heatColor,
                              fillOpacity: 0.28,
                            }}
                          />
                          {/* Inner hot core */}
                          <CircleMarker
                            center={[pt.latitude, pt.longitude]}
                            radius={pt.innerRadius}
                            pathOptions={{
                              stroke: true,
                              color: "#FFFFFF",
                              weight: 1.5,
                              fillColor: pt.coreColor,
                              fillOpacity: 0.85,
                            }}
                          >
                            <Popup>
                              <div className="p-1 space-y-1.5 max-w-[240px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                    {pt.intensityLabel}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    {pt.nearbyCount} issue{pt.nearbyCount === 1 ? "" : "s"} in cluster
                                  </span>
                                </div>
                                <p className="font-bold text-slate-900 text-sm leading-tight mt-1">
                                  {pt.title}
                                </p>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span className="truncate">
                                    {pt.address || `${pt.latitude.toFixed(4)}, ${pt.longitude.toFixed(4)}`}
                                  </span>
                                </p>
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                  {getStatusBadge(pt.status)}
                                  <button
                                    onClick={() => openComplaintDetails(pt)}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                                  >
                                    Inspect &rarr;
                                  </button>
                                </div>
                              </div>
                            </Popup>
                          </CircleMarker>
                        </Fragment>
                      ))}
                  </MapContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50">
                    <MapIcon className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="font-bold text-slate-800 text-sm">No Mapped Complaints Match Filters</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Try resetting your category, status, or time period filters to view issues across the city.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetMapFilters}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Map Legend */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                      {mapViewMode === "markers" ? "Marker Status Legend" : "Heatmap Intensity Legend"}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {mapViewMode === "markers"
                        ? "Color-coded indicators represent the real-time lifecycle status of each complaint."
                        : "Higher color intensity and radial glow represent higher spatial concentration of complaints."}
                    </p>
                  </div>

                  {mapViewMode === "markers" ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-xs"></span>
                        <span className="text-slate-700 font-medium">Submitted / Pending</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow-xs"></span>
                        <span className="text-slate-700 font-medium">In Progress</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs"></span>
                        <span className="text-slate-700 font-medium">Resolved</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-xs"></span>
                        <span className="text-slate-700 font-medium">Rejected</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                        <span className="text-slate-700 font-medium">Low (1-2)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                        <span className="text-slate-700 font-medium">Moderate (3)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span className="text-slate-700 font-medium">High / Critical (4+)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: COMMUNITY ENGAGEMENT FEED                             */}
        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* TAB 4: UPGRADED COMMUNITY ENGAGEMENT FEED                    */}
        {/* ============================================================ */}
        {activeTab === "community" && (
          <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* 1. Header with Title, Description, and Refresh Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Community Feed
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Support, verify, and discuss neighborhood issues submitted by fellow citizens.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchCommunityComplaints()}
                  disabled={communityLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition disabled:opacity-60"
                  title="Refresh Community Feed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${communityLoading ? "animate-spin" : ""}`} />
                  <span>{communityLoading ? "Refreshing..." : "Refresh Feed"}</span>
                </button>
              </div>
            </div>

            {/* 2. Real Community Statistics Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                <div className="flex items-center justify-between text-blue-600 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Feed</span>
                  <ListChecks className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {communityStats.total}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Reported civic issues</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                <div className="flex items-center justify-between text-indigo-600 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Supports</span>
                  <ThumbsUp className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
                  {communityStats.totalSupports}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Citizen upvotes</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                <div className="flex items-center justify-between text-emerald-600 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Genuine</span>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                  {communityStats.totalGenuine}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Authentic verifications</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                <div className="flex items-center justify-between text-purple-600 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Comments</span>
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-purple-600">
                  {communityStats.totalComments}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Discussion notes</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between text-emerald-600 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Resolved</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                  {communityStats.totalResolved}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Fixed by municipal teams</p>
              </div>
            </div>

            {/* 3. Community Search & Filter Toolbar */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Search Field */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={communityFilterSearch}
                    onChange={(e) => setCommunityFilterSearch(e.target.value)}
                    placeholder="Search community issues by title, code, description, category, or address..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {communityFilterSearch && (
                    <button
                      type="button"
                      onClick={() => setCommunityFilterSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Quick Status / Locality Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: "All", value: "All" },
                    { label: "Nearby / My Area", value: "Nearby" },
                    { label: "Unresolved", value: "Unresolved" },
                    { label: "Resolved", value: "Resolved" },
                  ].map((tab) => {
                    const isActive =
                      tab.value === "Nearby"
                        ? communityAreaFilter === "Nearby"
                        : communityStatusFilter === tab.value && communityAreaFilter !== "Nearby";

                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => {
                          if (tab.value === "Nearby") {
                            setCommunityAreaFilter(communityAreaFilter === "Nearby" ? "All" : "Nearby");
                          } else {
                            setCommunityAreaFilter("All");
                            setCommunityStatusFilter(tab.value);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {tab.value === "Nearby" && <MapPin className="w-3.5 h-3.5" />}
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Select Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                {/* Category Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={communityCategoryFilter}
                    onChange={(e) => setCommunityCategoryFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {communityCategoryOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Lifecycle Status
                  </label>
                  <select
                    value={communityStatusFilter}
                    onChange={(e) => {
                      setCommunityAreaFilter("All");
                      setCommunityStatusFilter(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Submitted">Submitted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Unresolved">All Unresolved</option>
                  </select>
                </div>

                {/* Sort By Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Sort Feed By
                  </label>
                  <select
                    value={communitySortBy}
                    onChange={(e) => setCommunitySortBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="supported">Most Supported</option>
                    <option value="discussed">Most Discussed</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Indicators & Reset Action */}
              {(communityFilterSearch ||
                communityStatusFilter !== "All" ||
                communityCategoryFilter !== "All" ||
                communityCategoryFilter !== "All Categories" ||
                communityAreaFilter !== "All" ||
                communitySortBy !== "recent") && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">
                    Showing <strong className="text-slate-800">{filteredCommunityComplaints.length}</strong> of {communityComplaints.length} complaints
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCommunityFilterSearch("");
                      setCommunityStatusFilter("All");
                      setCommunityCategoryFilter("All");
                      setCommunityAreaFilter("All");
                      setCommunitySortBy("recent");
                    }}
                    className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Community Complaints Grid */}
            {communityLoading ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-sm">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
                <p className="font-bold text-slate-800 text-base">Loading Community Issues...</p>
                <p className="text-xs text-slate-500 mt-1">Connecting to live municipal database.</p>
              </div>
            ) : filteredCommunityComplaints.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-sm">
                <SearchX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-extrabold text-slate-800 text-lg">No Complaints Match Your Criteria</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Try adjusting your search terms, changing the category, or clearing the active filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCommunityFilterSearch("");
                    setCommunityStatusFilter("All");
                    setCommunityCategoryFilter("All");
                    setCommunityAreaFilter("All");
                    setCommunitySortBy("recent");
                  }}
                  className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  Reset Community Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredCommunityComplaints.map((item) => {
                  const isOwner = Boolean(
                    item.is_owner || String(item.citizen_id || item.user_id || "") === String(user?.id || "")
                  );
                  const isSupported = Boolean(item.current_user_supported ?? item.user_supported);
                  const isVoting = votingComplaintId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => openCommunityModal(item)}
                      className="group bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Category & Status */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                            {item.categories?.name || item.category_name || "Civic Issue"}
                          </span>
                          {getStatusBadge(item.status)}
                        </div>

                        {/* Image Preview if Available */}
                        {item.photo_url ? (
                          <div className="w-full h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/70 mb-3.5 relative">
                            <img
                              src={item.photo_url}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            {item.complaint_code && (
                              <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg shadow-sm">
                                #{item.complaint_code}
                              </span>
                            )}
                          </div>
                        ) : (
                          item.complaint_code && (
                            <div className="mb-2">
                              <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                                #{item.complaint_code}
                              </span>
                            </div>
                          )
                        )}

                        {/* Complaint Title */}
                        <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-blue-600 transition line-clamp-1 leading-snug">
                          {item.title}
                        </h3>

                        {/* Short Description */}
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>

                        {/* Location and Date/Time */}
                        <div className="space-y-1 mt-3.5 pt-3 border-t border-slate-100 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{item.address || item.location || "Community Locality"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <Clock3 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>{getTimeAgo(item.created_at)}</span>
                            {isOwner && (
                              <span className="ml-auto font-bold text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                Your Complaint
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Interaction & Action Bar */}
                      <div className="pt-4 border-t border-slate-100 mt-4 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-1.5">
                          {/* Genuine Button */}
                          <button
                            type="button"
                            onClick={(e) => handleVoteFeedback(item, "genuine", e)}
                            disabled={isVoting || isOwner}
                            className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                              item.user_feedback === "genuine"
                                ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300"
                                : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                            } ${isOwner ? "opacity-60 cursor-not-allowed" : ""}`}
                            title={isOwner ? "You cannot vote on your own complaint" : "Verify issue as genuine"}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Genuine</span>
                            <span className="ml-0.5 text-[11px] opacity-80">({item.genuine_count || 0})</span>
                          </button>

                          {/* Not Genuine Button */}
                          <button
                            type="button"
                            onClick={(e) => handleVoteFeedback(item, "not_genuine", e)}
                            disabled={isVoting || isOwner}
                            className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                              item.user_feedback === "not_genuine"
                                ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300"
                                : "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                            } ${isOwner ? "opacity-60 cursor-not-allowed" : ""}`}
                            title={isOwner ? "You cannot vote on your own complaint" : "Flag issue as not genuine"}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>False</span>
                            <span className="ml-0.5 text-[11px] opacity-80">({item.not_genuine_count || 0})</span>
                          </button>

                          {/* Support Button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleSupport(item, e)}
                            disabled={isVoting || isOwner}
                            className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                              isSupported
                                ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300"
                                : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                            } ${isOwner ? "opacity-60 cursor-not-allowed" : ""}`}
                            title={isOwner ? "You cannot support your own complaint" : "Support this complaint"}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>{item.support_count || 0}</span>
                          </button>
                        </div>

                        {/* Bottom Row: Comments and View Details Button */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCommunityModal(item, true);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-slate-200/60 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                            <span>{item.comment_count || 0} Comments</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCommunityModal(item);
                            }}
                            className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-0.5 hover:underline"
                          >
                            <span>View Details</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: CIVIC REWARDS & LEADERBOARD                           */}
        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* TAB 5: CIVIC REWARDS CENTER & LEADERBOARD                     */}
        {/* ============================================================ */}
        {activeTab === "rewards" && (
          <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header & Balance Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Municipal Civic Recognition Program</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Civic Rewards Center &amp; Leaderboard
                </h1>
                <p className="text-sm text-slate-300 mt-1 max-w-xl">
                  Earn points by reporting verified issues, resolve community problems, unlock badges, and redeem official municipal perks.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    fetchRewards();
                    fetchLeaderboard();
                  }}
                  disabled={rewardsLoading || leaderboardLoading}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold px-4 py-3 rounded-2xl backdrop-blur-sm transition border border-white/10"
                  title="Refresh balance and leaderboard"
                >
                  <RefreshCw className={`w-4 h-4 ${rewardsLoading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* 1. REWARDS OVERVIEW (8 Metric Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Current Points */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Balance</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight">
                    {rewardData.total_points}
                    <span className="text-xs font-bold text-slate-400 ml-1">pts</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Available to redeem</p>
                </div>
              </div>

              {/* Civic Level */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Civic Level</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${rewardLevel.badgeBg}`}>
                    <rewardLevel.icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black text-slate-900 truncate">
                    Lvl {rewardLevel.level} • {rewardLevel.name}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{rewardLevel.description}</p>
                </div>
              </div>

              {/* Points to Next Level */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Level Goal</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>{rewardLevel.nextLevelName ? `Lvl ${rewardLevel.level + 1}` : "Max Level"}</span>
                    <span>{rewardLevel.progressPct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${rewardLevel.progressPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {rewardLevel.nextPoints ? `${rewardLevel.nextPoints} pts needed` : "Top tier reached!"}
                  </p>
                </div>
              </div>

              {/* Total Rewards Claimed */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Claimed Rewards</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Gift className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {(rewardData.claims || []).length}
                    <span className="text-xs font-bold text-slate-400 ml-1">vouchers</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{rewardData.total_spent || 0} pts redeemed</p>
                </div>
              </div>

              {/* Leaderboard Rank */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Citizen Rank</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
                    {leaderboardRank ? `#${leaderboardRank}` : "--"}
                    <span className="text-xs font-bold text-slate-400 ml-1">of {leaderboard.length || "--"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Citywide standing</p>
                </div>
              </div>

              {/* Complaints Filed */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Filed</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ListChecks className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {complaints.length}
                    <span className="text-xs font-bold text-slate-400 ml-1">issues</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Municipal reports</p>
                </div>
              </div>

              {/* Resolved Complaints */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resolved</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                    {resolvedCount}
                    <span className="text-xs font-bold text-slate-400 ml-1">fixed</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {complaints.length ? Math.round((resolvedCount / complaints.length) * 100) : 0}% success rate
                  </p>
                </div>
              </div>

              {/* Earned Badges */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Badges Earned</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Star className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {unlockedBadgesCount}
                    <span className="text-xs font-bold text-slate-400 ml-1">/ {achievementBadges.length}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Achievements unlocked</p>
                </div>
              </div>
            </div>

            {/* SUB-NAVIGATION TABS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setRewardSubTab("catalog")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                  rewardSubTab === "catalog"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>Claim Rewards</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  rewardSubTab === "catalog" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {activeRewardsCatalog.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRewardSubTab("claims")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                  rewardSubTab === "claims"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <History className="w-4 h-4" />
                <span>Claim History</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  rewardSubTab === "claims" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {(rewardData.claims || []).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRewardSubTab("points")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                  rewardSubTab === "points"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Points Ledger</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  rewardSubTab === "points" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {(rewardData.rewards || []).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRewardSubTab("badges")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                  rewardSubTab === "badges"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Badges &amp; Levels</span>
              </button>

              <button
                type="button"
                onClick={() => setRewardSubTab("leaderboard")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                  rewardSubTab === "leaderboard"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Leaderboard</span>
              </button>

              <button
                type="button"
                onClick={() => setRewardSubTab("impact")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                  rewardSubTab === "impact"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>Civic Impact</span>
              </button>
            </div>

            {/* 2. SUB-TAB 1: CLAIM REWARDS CATALOG */}
            {rewardSubTab === "catalog" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {["All", "Transit", "Mobility", "Environment", "Education", "Sustainability", "Recognition", "Culture"].map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setRewardCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                          rewardCategoryFilter === cat
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>

                {/* Reward Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCatalog.map((reward) => {
                    const RewardIcon = getRewardIcon(reward.icon);
                    const canAfford = rewardData.total_points >= reward.points_required;
                    const pointsDeficit = reward.points_required - rewardData.total_points;

                    return (
                      <div
                        key={reward.id}
                        className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between group"
                      >
                        <div>
                          {/* Card Header: Category & Popular badge */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                              <Tag className="w-3 h-3 text-slate-400" />
                              <span>{reward.category}</span>
                            </span>

                            {reward.popular && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                                <Sparkles className="w-3 h-3" />
                                <span>Popular</span>
                              </span>
                            )}
                          </div>

                          {/* Reward Icon & Title */}
                          <div className="flex items-start gap-4 mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-100 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                              <RewardIcon className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                                {reward.name}
                              </h3>
                              <div className="inline-flex items-center gap-1 mt-1 text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg">
                                <Trophy className="w-3 h-3" />
                                <span>{reward.points_required} Points Required</span>
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-slate-600 leading-relaxed mt-2 mb-4">
                            {reward.description}
                          </p>
                        </div>

                        {/* Card Footer: Status & Claim Button */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{reward.status || "Active"}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleInitiateClaim(reward)}
                            disabled={!canAfford}
                            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                              canAfford
                                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                            }`}
                          >
                            {canAfford ? (
                              <>
                                <span>Claim Reward</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                                <span>Need {pointsDeficit} pts</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. SUB-TAB 2: REWARD CLAIM HISTORY */}
            {rewardSubTab === "claims" && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm animate-fadeIn">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Your Claimed Rewards</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Official vouchers and redemption codes generated for your claimed municipal perks.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {(rewardData.claims || []).length} Claimed
                  </span>
                </div>

                {(!rewardData.claims || rewardData.claims.length === 0) ? (
                  <div className="py-12 text-center text-slate-500 max-w-sm mx-auto">
                    <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                      <Gift className="w-7 h-7" />
                    </div>
                    <p className="font-bold text-slate-800 text-sm">No Rewards Claimed Yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      You currently have {rewardData.total_points} civic points available. Browse the reward catalog to claim your first municipal benefit!
                    </p>
                    <button
                      type="button"
                      onClick={() => setRewardSubTab("catalog")}
                      className="mt-4 inline-flex items-center gap-1.5 bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition hover:bg-blue-700"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>Browse Catalog</span>
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {rewardData.claims.map((claim) => (
                      <div key={claim.id || claim.claim_code} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Gift className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{claim.reward_name}</h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                                <span>Ref: {claim.claim_code}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(claim.claim_code, "Voucher code")}
                                  className="text-slate-400 hover:text-slate-700 ml-1"
                                  title="Copy reference code"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {formatDate(claim.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                          <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                            -{claim.points_spent} pts
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" />
                            <span>{claim.status || "Claimed"}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. SUB-TAB 3: POINTS TRANSACTION HISTORY LEDGER */}
            {rewardSubTab === "points" && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Points Transaction Ledger</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verifiable database records of all points earned from reporting and spent on civic claims.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setHistoryTypeFilter("all")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        historyTypeFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTypeFilter("earned")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        historyTypeFilter === "earned" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Earned (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTypeFilter("spent")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        historyTypeFilter === "spent" ? "bg-white text-rose-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Spent (-)
                    </button>
                  </div>
                </div>

                {filteredHistory.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <p className="font-bold text-sm">No points records found.</p>
                    <p className="text-xs text-slate-400 mt-1">Submit civic complaints to earn recognition points!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredHistory.map((item, idx) => {
                      const pts = Number(item.points || 0);
                      const isEarned = pts > 0;

                      return (
                        <div key={item.id || idx} className="py-3.5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isEarned ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                              }`}
                            >
                              {isEarned ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-900">{item.reason || "Civic points transaction"}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(item.created_at)}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-sm font-black ${
                                isEarned ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {isEarned ? `+${pts}` : pts} pts
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 5. SUB-TAB 4: BADGES & CIVIC LEVELS */}
            {rewardSubTab === "badges" && (
              <div className="space-y-6 sm:space-y-8 animate-fadeIn">
                {/* Civic Level Pathway */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900 mb-2">Civic Level Progression Pathway</h2>
                  <p className="text-xs text-slate-500 mb-6">
                    As you report and verify issues, your civic level automatically advances, unlocking municipal recognition.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {[
                      { lvl: 1, name: "Civic Scout", pts: "0 - 49 pts", icon: MapPin, color: "text-slate-600", bg: "bg-slate-100" },
                      { lvl: 2, name: "Community Guardian", pts: "50 - 99 pts", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
                      { lvl: 3, name: "Urban Ambassador", pts: "100 - 249 pts", icon: Award, color: "text-blue-600", bg: "bg-blue-50" },
                      { lvl: 4, name: "Civic Champion", pts: "250 - 499 pts", icon: Star, color: "text-purple-600", bg: "bg-purple-50" },
                      { lvl: 5, name: "City Legend", pts: "500+ pts", icon: Trophy, color: "text-amber-600", bg: "bg-amber-50" },
                    ].map((step) => {
                      const StepIcon = step.icon;
                      const isCurrent = rewardLevel.level === step.lvl;
                      const isCompleted = rewardLevel.level > step.lvl;

                      return (
                        <div
                          key={step.lvl}
                          className={`rounded-2xl p-4 border text-center transition relative ${
                            isCurrent
                              ? "bg-blue-50/60 border-blue-400 shadow-md ring-2 ring-blue-200"
                              : isCompleted
                              ? "bg-emerald-50/40 border-emerald-200"
                              : "bg-slate-50 border-slate-200 opacity-60"
                          }`}
                        >
                          {isCurrent && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Your Level
                            </span>
                          )}

                          <div className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-2 ${step.bg} ${step.color}`}>
                            <StepIcon className="w-5 h-5" />
                          </div>
                          <p className="font-black text-xs text-slate-900">Level {step.lvl}</p>
                          <p className="font-bold text-[11px] text-slate-700 mt-0.5 truncate">{step.name}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{step.pts}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 8 Achievement Badges Grid */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Achievement Badges ({unlockedBadgesCount} / {achievementBadges.length} Unlocked)</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Track your civic milestones and unlock municipal recognition badges.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {achievementBadges.map((badge) => {
                      const Icon = badge.icon;
                      return (
                        <div
                          key={badge.id}
                          className={`rounded-2xl p-5 border transition flex flex-col justify-between ${
                            badge.unlocked
                              ? "bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200 shadow-sm"
                              : "bg-slate-50/60 border-slate-200 opacity-70"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div
                                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                                  badge.unlocked
                                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                                    : "bg-slate-200 text-slate-400"
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                              </div>

                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  badge.unlocked
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-200 text-slate-500"
                                }`}
                              >
                                {badge.unlocked ? "Unlocked" : "Locked"}
                              </span>
                            </div>

                            <h4 className="font-extrabold text-sm text-slate-900">{badge.title}</h4>
                            <p className="text-xs text-slate-500 mt-1">{badge.desc}</p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                              <span>Requirement: {badge.requirement}</span>
                              <span>{badge.current} / {badge.target}</span>
                            </div>
                            <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                  badge.unlocked ? "bg-emerald-600" : "bg-slate-400"
                                }`}
                                style={{ width: `${badge.progressPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 6. SUB-TAB 5: LEADERBOARD */}
            {rewardSubTab === "leaderboard" && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm animate-fadeIn">
                {/* Leaderboard Header & Period Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">City Contributor Rankings</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Top citizens active in reporting and improving city infrastructure.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Period Filter (All Time vs This Month) */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setLeaderboardPeriod("all");
                          fetchLeaderboard("all");
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          leaderboardPeriod === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        All Time
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLeaderboardPeriod("month");
                          fetchLeaderboard("month");
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          leaderboardPeriod === "month" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        This Month
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={leaderboardSearch}
                        onChange={(e) => setLeaderboardSearch(e.target.value)}
                        placeholder="Search citizen..."
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Current User Standings Card */}
                {leaderboardRank && (
                  <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow">
                        #{leaderboardRank}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-sm text-slate-900">Your Current Position</p>
                          <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-2 py-0.5 rounded-full">
                            You
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Rank #{leaderboardRank} with {rewardData.total_points} total points and {resolvedCount} resolved issues.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Table Content */}
                {leaderboardLoading ? (
                  <div className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-xs font-bold">Loading civic leaderboard...</p>
                  </div>
                ) : filteredLeaderboardList.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <p className="font-bold text-sm">No leaderboard entries found.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredLeaderboardList.map((c, i) => {
                      const isMe = c.user_id === user?.id;

                      return (
                        <div
                          key={c.user_id || i}
                          className={`py-3.5 px-3 rounded-2xl flex items-center justify-between gap-4 transition ${
                            isMe ? "bg-blue-50/70 border border-blue-200 font-bold" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Rank Badge */}
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                                c.rank === 1
                                  ? "bg-amber-100 text-amber-800 shadow-sm"
                                  : c.rank === 2
                                  ? "bg-slate-200 text-slate-700 shadow-sm"
                                  : c.rank === 3
                                  ? "bg-orange-100 text-orange-800 shadow-sm"
                                  : "text-slate-400 bg-slate-100"
                              }`}
                            >
                              #{c.rank || i + 1}
                            </div>

                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center overflow-hidden flex-shrink-0">
                              {c.profile_image_url ? (
                                <img src={c.profile_image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (c.name || "C").charAt(0).toUpperCase()
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-sm text-slate-900">{c.name || "Citizen"}</p>
                                {isMe && (
                                  <span className="text-[9px] font-black uppercase bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">
                                {c.complaints_resolved || 0} resolved • {c.complaints_submitted || 0} submitted
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-sm text-purple-600">
                              {c.total_points || 0} pts
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 7. SUB-TAB 6: PERSONAL CIVIC IMPACT */}
            {rewardSubTab === "impact" && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm animate-fadeIn space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Your Civic Impact Summary</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real metrics reflecting your positive footprint in keeping city infrastructure clean, safe, and functional.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="rounded-2xl p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3">
                      <ListChecks className="w-5 h-5" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{complaints.length}</h3>
                    <p className="font-bold text-xs text-slate-700 mt-1">Issues Reported to City</p>
                    <p className="text-[11px] text-slate-500 mt-1">Each verified issue helps municipal departments deploy crews promptly.</p>
                  </div>

                  <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{resolvedCount}</h3>
                    <p className="font-bold text-xs text-slate-700 mt-1">Issues Successfully Resolved</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {complaints.length ? Math.round((resolvedCount / complaints.length) * 100) : 0}% of your reported problems have been solved by municipal workers.
                    </p>
                  </div>

                  <div className="rounded-2xl p-5 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/80">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-3">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{rewardData.all_time_earned || rewardData.total_points}</h3>
                    <p className="font-bold text-xs text-slate-700 mt-1">All-Time Civic Points Earned</p>
                    <p className="text-[11px] text-slate-500 mt-1">Cumulative points earned contributing toward municipal recognition and benefits.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* 2. COMPLAINT DETAILS MODAL (Direct Match to Screen 7)        */}
      {/* ============================================================ */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
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

              {/* Work Completion Evidence Card (Citizen View) */}
              {complaintEvidence?.photo_url && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      Work Completion Evidence
                    </h4>
                    {selectedComplaint.status === "Verified" ? (
                      <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-full border border-purple-200 flex items-center gap-1.5 shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                        Work Verified by Municipality
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 font-bold text-xs rounded-full border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                        <Clock3 className="w-3.5 h-3.5 text-amber-600" />
                        Awaiting Municipal Verification
                      </span>
                    )}
                  </div>

                  {/* Before vs After Photo Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Before (Your Reported Photo)
                      </span>
                      <img
                        src={
                          selectedComplaint.photo_url ||
                          "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&auto=format&fit=crop&q=80"
                        }
                        alt="Reported Issue"
                        className="w-full h-44 rounded-xl object-cover border border-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1.5">
                        After (Completed Work by Worker)
                      </span>
                      <img
                        src={complaintEvidence.photo_url}
                        alt="Completion Evidence"
                        className="w-full h-44 rounded-xl object-cover border-2 border-emerald-400 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Work Performed Note */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      Action Taken on Site
                    </span>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {complaintEvidence.work_performed || "Repairs and resolution completed on site."}
                    </p>
                  </div>

                  {complaintEvidence.completion_remarks && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                        Worker Remarks
                      </span>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {complaintEvidence.completion_remarks}
                      </p>
                    </div>
                  )}

                  {complaintEvidence.submitted_at && (
                    <p className="text-[10px] text-slate-400">
                      Work completed on {formatDate(complaintEvidence.submitted_at)}
                    </p>
                  )}
                </div>
              )}

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
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
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
      {/* 5. COMMUNITY COMPLAINT DETAILS & DISCUSSION MODAL            */}
      {/* ============================================================ */}
      {selectedCommunityComplaint && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
          onClick={closeCommunityModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-slate-100 flex flex-col my-auto transition-all"
          >
            {/* Modal Sticky Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 p-5 sm:p-6 flex items-center justify-between z-10">
              <div>
                <p className="text-xs font-semibold text-slate-400">
                  Community Feed &gt; <span className="text-blue-600 font-bold">Complaint Details</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 line-clamp-1">
                    {selectedCommunityComplaint.title}
                  </h3>
                  {selectedCommunityComplaint.complaint_code && (
                    <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex-shrink-0">
                      #{selectedCommunityComplaint.complaint_code}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closeCommunityModal}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-5 sm:p-7 space-y-6">
              {/* Photo hero if available */}
              {selectedCommunityComplaint.photo_url && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-80 bg-slate-100">
                  <img
                    src={selectedCommunityComplaint.photo_url}
                    alt={selectedCommunityComplaint.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Status, Category & Priority Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-3 py-1 rounded-full">
                    {selectedCommunityComplaint.categories?.name || selectedCommunityComplaint.category_name || "Civic Issue"}
                  </span>
                  {getStatusBadge(selectedCommunityComplaint.status)}
                  {selectedCommunityComplaint.priority && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                      {selectedCommunityComplaint.priority} Priority
                    </span>
                  )}
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>Reported</div>
                  <div className="font-bold text-slate-800">
                    {formatDate(selectedCommunityComplaint.created_at)}
                  </div>
                </div>
              </div>

              {/* Description & Location */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Complaint Description
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-white border border-slate-200/70 p-4 rounded-2xl whitespace-pre-wrap">
                  {selectedCommunityComplaint.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                  <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>
                    {selectedCommunityComplaint.address || selectedCommunityComplaint.location || "Community Locality"}
                  </span>
                </div>
              </div>

              {/* Community Verification & Support Panel */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Community Verification &amp; Collective Support
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Citizen votes verify authentic neighborhood issues for civic response teams.
                    </p>
                  </div>
                  {/* Verification percentage pill */}
                  {(() => {
                    const totalVotes =
                      (selectedCommunityComplaint.genuine_count || 0) +
                      (selectedCommunityComplaint.not_genuine_count || 0);
                    const pct =
                      totalVotes > 0
                        ? Math.round(((selectedCommunityComplaint.genuine_count || 0) / totalVotes) * 100)
                        : 0;

                    return totalVotes > 0 ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                        {pct}% Deemed Genuine
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 self-start sm:self-auto">
                        No verification votes yet
                      </span>
                    );
                  })()}
                </div>

                {/* Progress bar visual ratio */}
                {(() => {
                  const gCount = selectedCommunityComplaint.genuine_count || 0;
                  const ngCount = selectedCommunityComplaint.not_genuine_count || 0;
                  const total = gCount + ngCount;
                  const gPct = total > 0 ? (gCount / total) * 100 : 50;

                  return (
                    <div className="space-y-1.5">
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${total > 0 ? gPct : 0}%` }}
                          className="bg-emerald-500 h-full transition-all duration-300"
                        />
                        <div
                          style={{ width: `${total > 0 ? 100 - gPct : 0}%` }}
                          className="bg-rose-500 h-full transition-all duration-300"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span className="text-emerald-700 font-bold">{gCount} Genuine</span>
                        <span className="text-rose-700 font-bold">{ngCount} Disputed / False</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Interactive Verification Buttons inside Modal */}
                {(() => {
                  const isOwner = Boolean(
                    selectedCommunityComplaint.is_owner ||
                      String(selectedCommunityComplaint.citizen_id || selectedCommunityComplaint.user_id || "") ===
                        String(user?.id || "")
                  );
                  const isVoting = votingComplaintId === selectedCommunityComplaint.id;
                  const isSupported = Boolean(
                    selectedCommunityComplaint.current_user_supported ?? selectedCommunityComplaint.user_supported
                  );

                  return (
                    <div className="pt-2">
                      {isOwner && (
                        <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 text-blue-600" />
                          <span>You reported this complaint. Self-voting and self-support are disabled.</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Genuine Vote */}
                        <button
                          type="button"
                          onClick={(e) => handleVoteFeedback(selectedCommunityComplaint, "genuine", e)}
                          disabled={isVoting || isOwner}
                          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                            selectedCommunityComplaint.user_feedback === "genuine"
                              ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                          } ${isOwner ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <Check className="w-4 h-4" />
                          <span>Vote Genuine ({selectedCommunityComplaint.genuine_count || 0})</span>
                        </button>

                        {/* Not Genuine Vote */}
                        <button
                          type="button"
                          onClick={(e) => handleVoteFeedback(selectedCommunityComplaint, "not_genuine", e)}
                          disabled={isVoting || isOwner}
                          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                            selectedCommunityComplaint.user_feedback === "not_genuine"
                              ? "bg-rose-600 text-white ring-2 ring-rose-300"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-rose-50 hover:text-rose-700"
                          } ${isOwner ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Flag Not Genuine ({selectedCommunityComplaint.not_genuine_count || 0})</span>
                        </button>

                        {/* Support Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleSupport(selectedCommunityComplaint, e)}
                          disabled={isVoting || isOwner}
                          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                            isSupported
                              ? "bg-blue-600 text-white ring-2 ring-blue-300"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-blue-50 hover:text-blue-700"
                          } ${isOwner ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>Support ({selectedCommunityComplaint.support_count || 0})</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Community Discussion / Comments Thread */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Community Discussion
                    </h4>
                    <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {selectedCommunityComplaint.comment_count ?? communityComments.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Civil discussion visible to community members
                  </span>
                </div>

                {/* Asynchronous Comments Content */}
                {commentsLoading ? (
                  <div className="py-8 space-y-3">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Loading discussion notes...</span>
                    </div>
                    {/* Skeleton Rows */}
                    {[1, 2].map((sk) => (
                      <div key={sk} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 animate-pulse flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="w-24 h-3 bg-slate-200 rounded" />
                          <div className="w-3/4 h-3 bg-slate-200 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : commentsError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span>{commentsError}</span>
                    <button
                      type="button"
                      onClick={() => fetchCommunityComments(selectedCommunityComplaint.id)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition self-start"
                    >
                      Retry Loading
                    </button>
                  </div>
                ) : communityComments.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 border border-slate-100 rounded-2xl">
                    <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No comments yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Be the first citizen to leave a note or update regarding this issue.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {communityComments.map((cm) => {
                      const isMyComment = String(cm.user_id) === String(user?.id);
                      const initial = (cm.user_name || "Citizen").charAt(0).toUpperCase();

                      return (
                        <div
                          key={cm.id}
                          className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-start justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 overflow-hidden text-xs">
                              {cm.profile_image_url ? (
                                <img
                                  src={cm.profile_image_url}
                                  alt={cm.user_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                initial
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 truncate">
                                  {cm.user_name || "Citizen"}
                                </span>
                                {isMyComment && (
                                  <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded">
                                    You
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {getTimeAgo(cm.created_at)}
                                </span>
                              </div>
                              <p className="text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
                                {cm.comment}
                              </p>
                            </div>
                          </div>

                          {isMyComment && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCommunityComment(cm.id)}
                              className="text-slate-400 hover:text-red-600 transition p-1 flex-shrink-0"
                              title="Delete your comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* New Comment Submission Form */}
                <form onSubmit={handleAddCommunityComment} className="pt-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 overflow-hidden hidden sm:flex">
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
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={communityComment}
                    onChange={(e) => setCommunityComment(e.target.value)}
                    placeholder="Share a neighborhood update or note..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !communityComment.trim()}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition"
                  >
                    {submittingComment ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Post</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5B. CLAIM CONFIRMATION MODAL                                 */}
      {/* ============================================================ */}
      {selectedRewardToClaim && !claimSuccessModal && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          onClick={() => {
            if (!claimingReward) setSelectedRewardToClaim(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-slate-100 transition-all space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Confirm Reward Claim</h3>
                  <p className="text-xs text-slate-500">Municipal Civic Benefit Redemption</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!claimingReward) setSelectedRewardToClaim(null);
                }}
                disabled={claimingReward}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reward Summary Card */}
            <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {selectedRewardToClaim.category}
                </span>
                <span className="text-xs font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-lg">
                  {selectedRewardToClaim.points_required} Points
                </span>
              </div>
              <h4 className="font-extrabold text-sm text-slate-900">{selectedRewardToClaim.name}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{selectedRewardToClaim.description}</p>
            </div>

            {/* Points Cost Breakdown */}
            <div className="rounded-2xl p-4 bg-gradient-to-br from-purple-50/60 to-indigo-50/60 border border-purple-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Current Civic Balance:</span>
                <span className="font-black text-slate-900">{rewardData.total_points} pts</span>
              </div>
              <div className="flex items-center justify-between text-rose-600">
                <span>Reward Points Required:</span>
                <span className="font-black">-{selectedRewardToClaim.points_required} pts</span>
              </div>
              <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between text-sm font-black text-slate-900">
                <span>Remaining Balance After Claim:</span>
                <span className="text-purple-700">
                  {rewardData.total_points - selectedRewardToClaim.points_required} pts
                </span>
              </div>
            </div>

            {/* Notice Note */}
            <p className="text-[11px] text-slate-400 leading-normal">
              By confirming, points will be deducted directly from your account ledger in the database, and an official reference claim voucher code will be issued.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRewardToClaim(null)}
                disabled={claimingReward}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmClaim}
                disabled={claimingReward}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 transition disabled:opacity-50"
              >
                {claimingReward ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Claim</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5C. CLAIM SUCCESS VOUCHER MODAL                              */}
      {/* ============================================================ */}
      {claimSuccessModal && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          onClick={() => setClaimSuccessModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-slate-100 transition-all text-center space-y-5"
          >
            {/* Celebration Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                Claim Confirmed
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">Reward Claimed Successfully!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You have redeemed <span className="font-bold text-slate-800">{claimSuccessModal.reward_name}</span> for {claimSuccessModal.points_spent} civic points.
              </p>
            </div>

            {/* Voucher Code Box */}
            <div className="rounded-2xl p-4 bg-slate-50 border-2 border-dashed border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Official Voucher Code</span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-mono font-black text-blue-700 tracking-wider">
                  {claimSuccessModal.claim_code}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(claimSuccessModal.claim_code, "Voucher code")}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition"
                  title="Copy code"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Present this reference code or voucher at designated municipal counters.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setClaimSuccessModal(null);
                  setRewardSubTab("claims");
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                View Claim History
              </button>

              <button
                type="button"
                onClick={() => setClaimSuccessModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
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
