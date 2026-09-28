import { useEffect, useMemo, useRef, useState } from "react";
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
  Pencil,
  Mail,
  Briefcase,
  Activity,
  CheckCheck,
  Camera,
  KeyRound,
  Lock,
  Trash2,
  Gift,
  Trophy,
  Star,
  ThumbsUp,
  Bus,
  Car,
  TreePine,
  BookOpen,
  ShoppingBag,
  Landmark,
  Sparkles,
  Coins,
  Copy,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sliders,
  SlidersHorizontal,
  Tag,
  Bell,
  Shield,
  HardDrive,
  History,
  Palette,
  Info,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
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
  const [token, setToken] = useState(
    () => localStorage.getItem("access_token") || ""
  );
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

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

  // Work Completion Evidence & Verification State
  const [complaintEvidence, setComplaintEvidence] = useState(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [verifyingEvidence, setVerifyingEvidence] = useState(false);
  const [reworkModalOpen, setReworkModalOpen] = useState(false);
  const [reworkReason, setReworkReason] = useState("");

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

  // Department Management & Performance Center State
  const [customDepartments, setCustomDepartments] = useState(() => {
    try {
      const saved = localStorage.getItem("smartcity_custom_departments");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("smartcity_custom_departments", JSON.stringify(customDepartments));
    } catch {
      // local storage unavailable or quota exceeded
    }
  }, [customDepartments]);

  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentDetailTab, setDepartmentDetailTab] = useState("overview"); // 'overview' | 'workers' | 'complaints' | 'performance' | 'workload'
  const [departmentComplaintFilter, setDepartmentComplaintFilter] = useState("All"); // 'All' | 'Pending' | 'In Progress' | 'Resolved'
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [departmentWorkerSearch, setDepartmentWorkerSearch] = useState("");
  const [departmentComplaintSearch, setDepartmentComplaintSearch] = useState("");
  const [departmentViewMode, setDepartmentViewMode] = useState("cards"); // 'cards' | 'table'
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false);
  const [showEditDepartmentModal, setShowEditDepartmentModal] = useState(false);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({
    id: "",
    name: "",
    code: "",
    description: "",
    contact_email: "",
    contact_phone: "",
    head: "",
    is_active: true,
  });
  const [selectedWorkerForDetails, setSelectedWorkerForDetails] = useState(null);

  // Admin Profile & Account Center State
  const photoInputRef = useRef(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ==========================================================
  // REWARDS & BADGES MANAGEMENT STATE
  // ==========================================================
  const [rewardsTab, setRewardsTab] = useState("overview"); // 'overview' | 'catalog' | 'claims' | 'ledger' | 'badges' | 'leaderboard' | 'analytics'
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsOverview, setRewardsOverview] = useState(null);
  const [rewardsCatalog, setRewardsCatalog] = useState([]);
  const [rewardClaims, setRewardClaims] = useState([]);
  const [rewardsLedger, setRewardsLedger] = useState([]);
  const [adminBadges, setAdminBadges] = useState([]);
  const [rewardsLeaderboard, setRewardsLeaderboard] = useState([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("all");
  const [rewardsAnalytics, setRewardsAnalytics] = useState(null);

  // Filters & Search
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("All");
  const [catalogStatusFilter, setCatalogStatusFilter] = useState("All");
  const [catalogSort, setCatalogSort] = useState("default");

  const [claimsSearch, setClaimsSearch] = useState("");
  const [claimsStatusFilter, setClaimsStatusFilter] = useState("All");
  const [claimsSort, setClaimsSort] = useState("newest");

  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("All");

  const [badgeSearch, setBadgeSearch] = useState("");
  const [leaderboardSearch, setLeaderboardSearch] = useState("");

  // Modals & Action States
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [showEditRewardModal, setShowEditRewardModal] = useState(false);
  const [editingRewardItem, setEditingRewardItem] = useState(null);
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardFormData, setRewardFormData] = useState({
    name: "",
    description: "",
    points_required: 50,
    category: "General",
    icon: "Gift",
    popular: false,
    status: "Active",
  });

  const [selectedClaimForDetails, setSelectedClaimForDetails] = useState(null);
  const [claimActionConfirm, setClaimActionConfirm] = useState(null); // { claim, action: 'Approved' | 'Delivered' | 'Rejected' }
  const [updatingClaimId, setUpdatingClaimId] = useState(null);

  const [selectedBadgeForDetails, setSelectedBadgeForDetails] = useState(null);

  const copyClaimCode = (code) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      showToast("Voucher reference code copied!", "success");
    }
  };

  const renderRewardIcon = (iconName, className = "w-5 h-5") => {
    switch (iconName) {
      case "Bus": return <Bus className={className} />;
      case "Car": return <Car className={className} />;
      case "TreePine": return <TreePine className={className} />;
      case "BookOpen": return <BookOpen className={className} />;
      case "ShoppingBag": return <ShoppingBag className={className} />;
      case "Award": return <Award className={className} />;
      case "Landmark": return <Landmark className={className} />;
      case "Star": return <Star className={className} />;
      case "Trophy": return <Trophy className={className} />;
      case "CheckCircle2": return <CheckCircle2 className={className} />;
      case "CheckCheck": return <CheckCheck className={className} />;
      case "ThumbsUp": return <ThumbsUp className={className} />;
      case "ShieldCheck": return <ShieldCheck className={className} />;
      case "MapPin": return <MapPin className={className} />;
      default: return <Gift className={className} />;
    }
  };

  const loadRewardsData = async (authToken = token) => {
    const activeToken = authToken || token || localStorage.getItem("access_token");
    if (!activeToken) return;
    try {
      setRewardsLoading(true);
      const headers = { Authorization: `Bearer ${activeToken}` };
      const [overviewRes, catalogRes, claimsRes, ledgerRes, badgesRes, leaderboardRes, analyticsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/rewards/overview`, { headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/api/admin/rewards/catalog`, { headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/api/admin/rewards/claims`, { headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/api/admin/rewards/ledger?limit=300`, { headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/api/admin/rewards/badges`, { headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/api/admin/rewards/leaderboard?period=${leaderboardPeriod}`, { headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/api/admin/rewards/analytics`, { headers }).catch(() => null),
      ]);

      if (overviewRes?.data?.success) setRewardsOverview(overviewRes.data);
      if (catalogRes?.data?.success) setRewardsCatalog(catalogRes.data.catalog || []);
      if (claimsRes?.data?.success) setRewardClaims(claimsRes.data.claims || []);
      if (ledgerRes?.data?.success) setRewardsLedger(ledgerRes.data.transactions || []);
      if (badgesRes?.data?.success) setAdminBadges(badgesRes.data.badges || []);
      if (leaderboardRes?.data?.success) setRewardsLeaderboard(leaderboardRes.data.leaderboard || []);
      if (analyticsRes?.data?.success) setRewardsAnalytics(analyticsRes.data.analytics || null);
    } catch (err) {
      console.error("Failed to load rewards data:", err);
    } finally {
      setRewardsLoading(false);
    }
  };

  useEffect(() => {
    if (activeNav === "rewards" && token) {
      loadRewardsData(token);
    }
  }, [activeNav, token, leaderboardPeriod]);

  // Catalog filtered and sorted
  const filteredCatalog = useMemo(() => {
    let list = [...rewardsCatalog];
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase();
      list = list.filter((r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q)
      );
    }
    if (catalogCategoryFilter !== "All") {
      list = list.filter((r) => r.category === catalogCategoryFilter);
    }
    if (catalogStatusFilter !== "All") {
      list = list.filter((r) => r.status === catalogStatusFilter);
    }
    if (catalogSort === "points-asc") {
      list.sort((a, b) => Number(a.points_required) - Number(b.points_required));
    } else if (catalogSort === "points-desc") {
      list.sort((a, b) => Number(b.points_required) - Number(a.points_required));
    } else if (catalogSort === "claims") {
      list.sort((a, b) => Number(b.claims_count || 0) - Number(a.claims_count || 0));
    } else if (catalogSort === "name") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return list;
  }, [rewardsCatalog, catalogSearch, catalogCategoryFilter, catalogStatusFilter, catalogSort]);

  // Claims filtered and sorted
  const filteredClaims = useMemo(() => {
    let list = [...rewardClaims];
    if (claimsSearch.trim()) {
      const q = claimsSearch.toLowerCase();
      list = list.filter((c) =>
        (c.citizen_name || "").toLowerCase().includes(q) ||
        (c.citizen_email || "").toLowerCase().includes(q) ||
        (c.claim_code || "").toLowerCase().includes(q) ||
        (c.reward_name || "").toLowerCase().includes(q)
      );
    }
    if (claimsStatusFilter !== "All") {
      if (claimsStatusFilter === "Pending") {
        list = list.filter((c) => c.status === "Pending" || c.status === "Claimed");
      } else {
        list = list.filter((c) => c.status === claimsStatusFilter);
      }
    }
    if (claimsSort === "newest") {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (claimsSort === "oldest") {
      list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (claimsSort === "points-desc") {
      list.sort((a, b) => Number(b.points_spent || 0) - Number(a.points_spent || 0));
    }
    return list;
  }, [rewardClaims, claimsSearch, claimsStatusFilter, claimsSort]);

  // Ledger filtered
  const filteredLedger = useMemo(() => {
    let list = [...rewardsLedger];
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      list = list.filter((tx) =>
        (tx.citizen_name || "").toLowerCase().includes(q) ||
        (tx.citizen_email || "").toLowerCase().includes(q) ||
        (tx.reason || "").toLowerCase().includes(q) ||
        (tx.complaint_code || "").toLowerCase().includes(q)
      );
    }
    if (ledgerTypeFilter !== "All") {
      list = list.filter((tx) => tx.transaction_type === ledgerTypeFilter);
    }
    return list;
  }, [rewardsLedger, ledgerSearch, ledgerTypeFilter]);

  // Badges filtered
  const filteredBadges = useMemo(() => {
    let list = [...adminBadges];
    if (badgeSearch.trim()) {
      const q = badgeSearch.toLowerCase();
      list = list.filter((b) =>
        (b.title || "").toLowerCase().includes(q) ||
        (b.description || "").toLowerCase().includes(q) ||
        (b.category || "").toLowerCase().includes(q) ||
        (b.requirement || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [adminBadges, badgeSearch]);

  // Leaderboard filtered
  const filteredLeaderboard = useMemo(() => {
    let list = [...rewardsLeaderboard];
    if (leaderboardSearch.trim()) {
      const q = leaderboardSearch.toLowerCase();
      list = list.filter((u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rewardsLeaderboard, leaderboardSearch]);

  // Handlers for Add/Edit/Toggle Rewards
  const handleOpenAddReward = () => {
    setRewardFormData({
      name: "",
      description: "",
      points_required: 50,
      category: "Transit",
      icon: "Gift",
      popular: false,
      status: "Active",
    });
    setShowAddRewardModal(true);
  };

  const handleOpenEditReward = (item) => {
    setEditingRewardItem(item);
    setRewardFormData({
      name: item.name || "",
      description: item.description || "",
      points_required: item.points_required || 50,
      category: item.category || "General",
      icon: item.icon || "Gift",
      popular: Boolean(item.popular),
      status: item.status || "Active",
    });
    setShowEditRewardModal(true);
  };

  const handleCreateReward = async (e) => {
    e.preventDefault();
    if (!rewardFormData.name.trim()) {
      showToast("Reward name is required.", "error");
      return;
    }
    if (Number(rewardFormData.points_required) <= 0) {
      showToast("Points cost must be greater than zero.", "error");
      return;
    }
    try {
      setRewardSaving(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/rewards/catalog`,
        {
          name: rewardFormData.name.trim(),
          description: rewardFormData.description.trim(),
          points_required: Number(rewardFormData.points_required),
          category: rewardFormData.category,
          icon: rewardFormData.icon,
          popular: rewardFormData.popular,
          status: rewardFormData.status,
        },
        { headers: { Authorization: `Bearer ${token || localStorage.getItem("access_token")}` } }
      );
      if (res.data?.success) {
        showToast(res.data.message || "Reward added successfully!", "success");
        setShowAddRewardModal(false);
        loadRewardsData();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to create reward.", "error");
    } finally {
      setRewardSaving(false);
    }
  };

  const handleUpdateReward = async (e) => {
    e.preventDefault();
    if (!editingRewardItem) return;
    if (!rewardFormData.name.trim()) {
      showToast("Reward name is required.", "error");
      return;
    }
    if (Number(rewardFormData.points_required) <= 0) {
      showToast("Points cost must be greater than zero.", "error");
      return;
    }
    try {
      setRewardSaving(true);
      const res = await axios.patch(
        `${API_BASE_URL}/api/admin/rewards/catalog/${editingRewardItem.id}`,
        {
          name: rewardFormData.name.trim(),
          description: rewardFormData.description.trim(),
          points_required: Number(rewardFormData.points_required),
          category: rewardFormData.category,
          icon: rewardFormData.icon,
          popular: rewardFormData.popular,
          status: rewardFormData.status,
        },
        { headers: { Authorization: `Bearer ${token || localStorage.getItem("access_token")}` } }
      );
      if (res.data?.success) {
        showToast(res.data.message || "Reward updated successfully!", "success");
        setShowEditRewardModal(false);
        setEditingRewardItem(null);
        loadRewardsData();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to update reward.", "error");
    } finally {
      setRewardSaving(false);
    }
  };

  const handleToggleRewardStatus = async (item) => {
    const newStatus = item.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/api/admin/rewards/catalog/${item.id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token || localStorage.getItem("access_token")}` } }
      );
      if (res.data?.success) {
        showToast(`Reward '${item.name}' marked as ${newStatus}.`, "success");
        loadRewardsData();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to update status.", "error");
    }
  };

  const handleUpdateClaimStatus = async (claimId, newStatus) => {
    try {
      setUpdatingClaimId(claimId);
      const res = await axios.patch(
        `${API_BASE_URL}/api/admin/rewards/claims/${claimId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token || localStorage.getItem("access_token")}` } }
      );
      if (res.data?.success) {
        showToast(res.data.message || `Claim status updated to ${newStatus}.`, "success");
        setClaimActionConfirm(null);
        if (selectedClaimForDetails && selectedClaimForDetails.id === claimId) {
          setSelectedClaimForDetails((prev) => ({ ...prev, status: newStatus }));
        }
        loadRewardsData();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to update claim status.", "error");
    } finally {
      setUpdatingClaimId(null);
    }
  };


  // ==========================================================
  // ANNOUNCEMENTS & BROADCAST DISPATCH STATE
  // ==========================================================
  const [announcementsTab, setAnnouncementsTab] = useState("overview"); // 'overview' | 'create' | 'history'
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementsOverview, setAnnouncementsOverview] = useState(null);
  const [announcementsList, setAnnouncementsList] = useState([]);
  const [selectedAnnouncementForDetails, setSelectedAnnouncementForDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [announcementSending, setAnnouncementSending] = useState(false);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState(false);

  // Audience preview state
  const [audiencePreview, setAudiencePreview] = useState({
    recipient_count: 0,
    audience_label: "All Citizens",
    sample_recipients: [],
  });
  const [audiencePreviewLoading, setAudiencePreviewLoading] = useState(false);

  // Announcement Form State
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    category: "General",
    priority: "Normal", // 'Normal' | 'Important' | 'Urgent' | 'Emergency'
    audience: "all_citizens", // 'all_citizens' | 'all_workers' | 'all_users' | 'department' | 'specific_user'
    department: "",
    user_id: "",
  });

  // History Search & Filters
  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [announcementPriorityFilter, setAnnouncementPriorityFilter] = useState("All");
  const [announcementCategoryFilter, setAnnouncementCategoryFilter] = useState("All");
  const [announcementAudienceFilter, setAnnouncementAudienceFilter] = useState("All");
  const [announcementSort, setAnnouncementSort] = useState("newest"); // 'newest' | 'oldest' | 'recipients' | 'read_rate'

  const renderPriorityBadge = (priority) => {
    switch (priority) {
      case "Emergency":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping shrink-0" />
            Emergency
          </span>
        );
      case "Urgent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
            Urgent
          </span>
        );
      case "Important":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            Important
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            Normal
          </span>
        );
    }
  };

  // Load announcements data
  const loadAnnouncementsData = async (authToken = token) => {
    const activeToken = authToken || token || localStorage.getItem("access_token");
    if (!activeToken) return;
    try {
      setAnnouncementsLoading(true);
      const headers = { Authorization: `Bearer ${activeToken}` };
      const [overviewRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/announcements/overview`, { headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/api/admin/announcements`, { headers }).catch(() => null),
      ]);

      if (overviewRes?.data?.success) setAnnouncementsOverview(overviewRes.data);
      if (historyRes?.data?.success) setAnnouncementsList(historyRes.data.announcements || []);
    } catch (err) {
      console.error("Failed to load announcements data:", err);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  useEffect(() => {
    if (activeNav === "announcements" && token) {
      loadAnnouncementsData(token);
    }
  }, [activeNav, token]);

  // Fetch audience preview whenever audience parameters change
  useEffect(() => {
    if (!token || activeNav !== "announcements") return;
    const fetchPreview = async () => {
      try {
        setAudiencePreviewLoading(true);
        const params = new URLSearchParams({
          audience: announcementForm.audience,
        });
        if (announcementForm.audience === "department" && announcementForm.department) {
          params.append("department", announcementForm.department);
        }
        if (announcementForm.audience === "specific_user" && announcementForm.user_id) {
          params.append("user_id", announcementForm.user_id);
        }
        const res = await axios.get(
          `${API_BASE_URL}/api/admin/announcements/audience-preview?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token || localStorage.getItem("access_token")}` } }
        );
        if (res.data?.success) {
          setAudiencePreview(res.data);
        }
      } catch (err) {
        console.error("Audience preview fetch error:", err);
      } finally {
        setAudiencePreviewLoading(false);
      }
    };

    fetchPreview();
  }, [
    announcementForm.audience,
    announcementForm.department,
    announcementForm.user_id,
    token,
    activeNav,
  ]);

  // Dispatch announcement handler
  const handleDispatchAnnouncement = async () => {
    if (!announcementForm.title.trim()) {
      showToast("Announcement title is required.", "error");
      return;
    }
    if (!announcementForm.message.trim()) {
      showToast("Announcement message body is required.", "error");
      return;
    }
    if (announcementForm.audience === "department" && !announcementForm.department) {
      showToast("Please select a target municipal department.", "error");
      return;
    }
    if (announcementForm.audience === "specific_user" && !announcementForm.user_id) {
      showToast("Please select a recipient user.", "error");
      return;
    }

    try {
      setAnnouncementSending(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/announcements`,
        {
          title: announcementForm.title.trim(),
          message: announcementForm.message.trim(),
          category: announcementForm.category,
          priority: announcementForm.priority,
          audience: announcementForm.audience,
          department: announcementForm.department || null,
          user_id: announcementForm.user_id || null,
        },
        { headers: { Authorization: `Bearer ${token || localStorage.getItem("access_token")}` } }
      );

      if (res.data?.success) {
        showToast(res.data.message || "Announcement broadcast dispatched successfully!", "success");
        setShowSendConfirmModal(false);
        setAnnouncementForm({
          title: "",
          message: "",
          category: "General",
          priority: "Normal",
          audience: "all_citizens",
          department: "",
          user_id: "",
        });
        setAnnouncementsTab("history");
        loadAnnouncementsData();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to dispatch announcement.", "error");
    } finally {
      setAnnouncementSending(false);
    }
  };

  // Open details for a broadcast
  const handleOpenAnnouncementDetails = async (broadcastId) => {
    try {
      setDetailsLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/api/admin/announcements/${broadcastId}`,
        { headers: { Authorization: `Bearer ${token || localStorage.getItem("access_token")}` } }
      );
      if (res.data?.success) {
        setSelectedAnnouncementForDetails(res.data.announcement);
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to load broadcast details.", "error");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Delete announcement broadcast
  const handleDeleteAnnouncement = async (broadcastId) => {
    try {
      setDeletingAnnouncement(true);
      const res = await axios.delete(
        `${API_BASE_URL}/api/admin/announcements/${broadcastId}`,
        { headers: { Authorization: `Bearer ${token || localStorage.getItem("access_token")}` } }
      );
      if (res.data?.success) {
        showToast(res.data.message || "Broadcast deleted successfully.", "success");
        setAnnouncementToDelete(null);
        if (selectedAnnouncementForDetails?.id === broadcastId) {
          setSelectedAnnouncementForDetails(null);
        }
        loadAnnouncementsData();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to delete broadcast.", "error");
    } finally {
      setDeletingAnnouncement(false);
    }
  };

  // Duplicate / Resend announcement
  const handleDuplicateAnnouncement = (item) => {
    setAnnouncementForm({
      title: item.title || "",
      message: item.message || "",
      category: item.category || "General",
      priority: item.priority || "Normal",
      audience: "all_citizens",
      department: "",
      user_id: "",
    });
    setAnnouncementsTab("create");
    showToast("Announcement template loaded into editor.", "info");
  };

  // Filtered and sorted announcement history
  const filteredAnnouncements = useMemo(() => {
    let list = [...announcementsList];
    if (announcementSearch.trim()) {
      const q = announcementSearch.toLowerCase();
      list = list.filter((a) =>
        (a.title || "").toLowerCase().includes(q) ||
        (a.message || "").toLowerCase().includes(q) ||
        (a.category || "").toLowerCase().includes(q) ||
        (a.id || "").toLowerCase().includes(q)
      );
    }
    if (announcementPriorityFilter !== "All") {
      list = list.filter((a) => a.priority === announcementPriorityFilter);
    }
    if (announcementCategoryFilter !== "All") {
      list = list.filter((a) => a.category === announcementCategoryFilter);
    }
    if (announcementAudienceFilter !== "All") {
      list = list.filter((a) => (a.audience || "").toLowerCase().includes(announcementAudienceFilter.toLowerCase()));
    }
    if (announcementSort === "newest") {
      list.sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0));
    } else if (announcementSort === "oldest") {
      list.sort((a, b) => new Date(a.sent_at || 0) - new Date(b.sent_at || 0));
    } else if (announcementSort === "recipients") {
      list.sort((a, b) => (b.total_recipients || 0) - (a.total_recipients || 0));
    } else if (announcementSort === "read_rate") {
      list.sort((a, b) => (b.read_percentage || 0) - (a.read_percentage || 0));
    }
    return list;
  }, [
    announcementsList,
    announcementSearch,
    announcementPriorityFilter,
    announcementCategoryFilter,
    announcementAudienceFilter,
    announcementSort,
  ]);

  // ==========================================================
  // COMPLAINT #9: MUNICIPAL ADMINISTRATION SETTINGS & CATEGORIES
  // ==========================================================
  const [settingsTab, setSettingsTab] = useState("general"); // 'general' | 'complaints' | 'categories' | 'notifications' | 'rewards' | 'community' | 'workers' | 'escalation' | 'security' | 'branding' | 'maintenance' | 'audit'
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsOverview, setSettingsOverview] = useState(null);

  // Categories Management State
  const [settingsCategories, setSettingsCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [settingsCategoryFilter, setSettingsCategoryFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState("create"); // 'create' | 'edit'
  const [categoryForm, setCategoryForm] = useState({
    id: null,
    name: "",
    description: "",
    is_active: true,
  });
  const [savingCategory, setSavingCategory] = useState(false);

  // Audit / Activity State
  const [auditActivities, setAuditActivities] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState("all"); // 'all' | 'complaint' | 'announcement' | 'reward'

  // Security inside Settings
  const [secCurrentPassword, setSecCurrentPassword] = useState("");
  const [secNewPassword, setSecNewPassword] = useState("");
  const [secConfirmPassword, setSecConfirmPassword] = useState("");
  const [secPasswordLoading, setSecPasswordLoading] = useState(false);

  // Load Settings Data (Overview, Categories, Audit Stream)
  const loadSettingsData = async (authToken = token) => {
    const activeToken = authToken || token || localStorage.getItem("access_token");
    if (!activeToken) return;
    try {
      setSettingsLoading(true);
      const headers = { Authorization: `Bearer ${activeToken}` };
      const [overviewRes, catsRes, auditRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/settings/overview`, { headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/api/admin/categories`, { headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/api/admin/settings/audit-activity`, { headers }).catch(() => null),
      ]);

      if (overviewRes?.data?.success) setSettingsOverview(overviewRes.data);
      if (catsRes?.data?.success) setSettingsCategories(catsRes.data.categories || []);
      if (auditRes?.data?.success) setAuditActivities(auditRes.data.activities || []);
    } catch (err) {
      console.error("Failed to load settings data:", err);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeNav === "settings" && token) {
      loadSettingsData(token);
    }
  }, [activeNav, token]);

  // Open Category Create Modal
  const handleOpenAddCategory = () => {
    setCategoryModalMode("create");
    setCategoryForm({
      id: null,
      name: "",
      description: "",
      is_active: true,
    });
    setCategoryModalOpen(true);
  };

  // Open Category Edit Modal
  const handleOpenEditCategory = (cat) => {
    setCategoryModalMode("edit");
    setCategoryForm({
      id: cat.id,
      name: cat.name || "",
      description: cat.description || "",
      is_active: cat.is_active ?? true,
    });
    setCategoryModalOpen(true);
  };

  // Save Category (Create or Edit)
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showToast("Category name is required.", "error");
      return;
    }

    try {
      setSavingCategory(true);
      const headers = { Authorization: `Bearer ${token || localStorage.getItem("access_token")}` };
      if (categoryModalMode === "create") {
        const res = await axios.post(
          `${API_BASE_URL}/api/admin/categories`,
          {
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim() || null,
            is_active: categoryForm.is_active,
          },
          { headers }
        );
        if (res.data?.success) {
          showToast(res.data.message || "Category created successfully!", "success");
          setCategoryModalOpen(false);
          loadSettingsData();
        }
      } else {
        const res = await axios.patch(
          `${API_BASE_URL}/api/admin/categories/${categoryForm.id}`,
          {
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim() || null,
            is_active: categoryForm.is_active,
          },
          { headers }
        );
        if (res.data?.success) {
          showToast(res.data.message || "Category updated successfully!", "success");
          setCategoryModalOpen(false);
          loadSettingsData();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to save category.", "error");
    } finally {
      setSavingCategory(false);
    }
  };

  // Toggle Category Active Status
  const handleToggleCategoryActive = async (cat) => {
    try {
      const headers = { Authorization: `Bearer ${token || localStorage.getItem("access_token")}` };
      const newStatus = !cat.is_active;
      // Optimistic update
      setSettingsCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: newStatus } : c))
      );

      const res = await axios.patch(
        `${API_BASE_URL}/api/admin/categories/${cat.id}`,
        { is_active: newStatus },
        { headers }
      );
      if (res.data?.success) {
        showToast(
          `Category '${cat.name}' is now ${newStatus ? "Active" : "Inactive"}.`,
          "success"
        );
        loadSettingsData();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to update category status.", "error");
      loadSettingsData();
    }
  };

  // Handle Security Password Change inside Settings
  const handleSettingsChangePassword = async (e) => {
    e.preventDefault();
    if (!secCurrentPassword) {
      showToast("Please enter your current password.", "error");
      return;
    }
    if (secNewPassword.length < 6) {
      showToast("New password must be at least 6 characters.", "error");
      return;
    }
    if (secNewPassword !== secConfirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }

    try {
      setSecPasswordLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/profile/change-password`,
        {
          current_password: secCurrentPassword,
          new_password: secNewPassword,
        },
        { headers: { Authorization: `Bearer ${token || localStorage.getItem("access_token")}` } }
      );
      if (res.data?.success) {
        showToast("Password updated successfully!", "success");
        setSecCurrentPassword("");
        setSecNewPassword("");
        setSecConfirmPassword("");
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to update password.", "error");
    } finally {
      setSecPasswordLoading(false);
    }
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    let list = [...settingsCategories];
    if (settingsCategoryFilter === "active") list = list.filter((c) => c.is_active);
    if (settingsCategoryFilter === "inactive") list = list.filter((c) => !c.is_active);
    if (categorySearch.trim()) {
      const q = categorySearch.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [settingsCategories, settingsCategoryFilter, categorySearch]);

  // Filtered audit stream
  const filteredAuditActivities = useMemo(() => {
    let list = [...auditActivities];
    if (auditFilter !== "all") {
      list = list.filter((a) => a.type === auditFilter);
    }
    return list;
  }, [auditActivities, auditFilter]);

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
      const role = (parsedUser.role || "").toLowerCase().trim();
      if (role !== "admin") {
        if (role === "citizen") {
          navigate("/citizen/dashboard", { replace: true });
        } else if (role === "worker") {
          navigate("/worker/dashboard", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
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

      const [complaintsRes, workersRes, usersRes, profileRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/complaints/`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/workers`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/users`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/profile`, { headers }).catch(() => null),
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
      if (profileRes?.data?.success && profileRes.data.admin) {
        setAdminProfile(profileRes.data.admin);
        setUser((prev) => ({ ...prev, ...profileRes.data.admin }));
        setProfileForm({
          name: profileRes.data.admin.name || "",
          phone: profileRes.data.admin.phone || "",
        });
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

  // Load Completion Evidence
  const loadComplaintEvidence = async (complaintId) => {
    if (!complaintId || !token) return;
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
      console.error("Load evidence error in admin:", err);
    } finally {
      setLoadingEvidence(false);
    }
  };

  // Verify or Rework Completion Evidence Handler
  const handleVerifyCompletionEvidence = async (complaintId, action, customReason = "") => {
    if (!complaintId || !token) return;
    try {
      setVerifyingEvidence(true);
      setError("");
      setSuccess("");

      const payload = { action };
      if (action === "rework") {
        const cleanReason = customReason.trim() || reworkReason.trim();
        if (!cleanReason) {
          setError("Please provide a reason why rework is required by the field worker.");
          return;
        }
        payload.rework_reason = cleanReason;
      }

      const res = await axios.patch(
        `${API_BASE_URL}/api/admin/complaints/${complaintId}/completion-evidence/verify`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.data?.success) {
        setSuccess(
          action === "approve"
            ? "Complaint completion evidence approved & verified! Citizen and assigned worker notified."
            : "Rework request dispatched to assigned field worker."
        );
        setReworkModalOpen(false);
        setReworkReason("");

        // Refresh complaint
        const refreshed = await axios.get(`${API_BASE_URL}/api/complaints/${complaintId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refreshed.data?.success) {
          setSelectedComplaint(refreshed.data.complaint);
          setDetailSelectedStatus(refreshed.data.complaint.status);
        }
        await Promise.all([
          loadComplaintHistory(complaintId),
          loadComplaintEvidence(complaintId),
          loadDashboardData(token, true),
        ]);
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError(err.response?.data?.detail || "Failed to verify completion evidence.");
    } finally {
      setVerifyingEvidence(false);
    }
  };

  const openComplaint = async (complaint) => {
    setSelectedComplaint(complaint);
    setDetailSelectedWorker(complaint.assigned_worker_id || "");
    setDetailSelectedStatus(complaint.status || "Submitted");
    setDetailRemarks("");
    setReworkReason("");
    setReworkModalOpen(false);
    await Promise.all([
      loadComplaintHistory(complaint.id),
      loadComplaintEvidence(complaint.id),
    ]);
  };

  const closeComplaint = () => {
    setSelectedComplaint(null);
    setStatusHistory([]);
    setComplaintEvidence(null);
    setHistoryError("");
    setDetailRemarks("");
    setReworkModalOpen(false);
    setReworkReason("");
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
  // DEPARTMENT MANAGEMENT & PERFORMANCE CALCULATIONS
  // ==========================================================
  const DEFAULT_DEPARTMENTS_CONFIG = useMemo(() => [
    {
      id: "dept-roads",
      code: "DEPT-ROADS",
      name: "Road Maintenance",
      description: "Repairs road damage, potholes, bridges, and municipal transit corridors.",
      contact_email: "roads@smartcity.gov",
      contact_phone: "+91 22 2456 7891",
      head: "Chief Engineer Roads",
      is_active: true,
      categoryMatch: ["road", "pothole", "asphalt", "bridge"],
    },
    {
      id: "dept-sanitation",
      code: "DEPT-SAN",
      name: "Sanitation",
      description: "Municipal waste collection, public cleanliness, garbage bins, and recycling.",
      contact_email: "sanitation@smartcity.gov",
      contact_phone: "+91 22 2456 7892",
      head: "Director of Sanitation",
      is_active: true,
      categoryMatch: ["garbage", "sanitation", "waste", "clean", "trash", "dump"],
    },
    {
      id: "dept-water",
      code: "DEPT-WATER",
      name: "Water Department",
      description: "Drinking water supply, pipeline leakages, reservoir maintenance, and water quality.",
      contact_email: "water@smartcity.gov",
      contact_phone: "+91 22 2456 7893",
      head: "Superintendent Water Works",
      is_active: true,
      categoryMatch: ["water", "pipe", "pipeline", "leak", "supply", "drainage", "sewage"],
    },
    {
      id: "dept-electricity",
      code: "DEPT-ELEC",
      name: "Electricity",
      description: "Street lights, electrical junctions, transformers, and public power infrastructure.",
      contact_email: "electricity@smartcity.gov",
      contact_phone: "+91 22 2456 7894",
      head: "Chief Electrical Inspector",
      is_active: true,
      categoryMatch: ["electric", "street light", "light", "lamp", "power", "transformer"],
    },
    {
      id: "dept-traffic",
      code: "DEPT-TRAFFIC",
      name: "Traffic & Safety",
      description: "Traffic signals, road signage, pedestrian crossings, and public transit safety.",
      contact_email: "traffic@smartcity.gov",
      contact_phone: "+91 22 2456 7895",
      head: "Traffic Management Officer",
      is_active: true,
      categoryMatch: ["traffic", "signal", "sign", "pedestrian", "safety"],
    },
    {
      id: "dept-parks",
      code: "DEPT-PARKS",
      name: "Parks & Gardens",
      description: "Public park maintenance, municipal gardens, tree plantation, and civic green belts.",
      contact_email: "parks@smartcity.gov",
      contact_phone: "+91 22 2456 7896",
      head: "Horticulture Officer",
      is_active: true,
      categoryMatch: ["park", "garden", "tree", "plant", "horticulture", "green"],
    },
  ], []);

  const departmentsData = useMemo(() => {
    const map = new Map();

    DEFAULT_DEPARTMENTS_CONFIG.forEach((d) => {
      map.set(d.name.toLowerCase(), { ...d });
    });

    customDepartments.forEach((cd) => {
      map.set(cd.name.toLowerCase(), {
        ...cd,
        categoryMatch: cd.categoryMatch || [cd.name.toLowerCase().split(" ")[0]],
      });
    });

    // Also register any department that exists on worker records
    workers.forEach((w) => {
      const deptName = (w.department || "").trim();
      if (deptName && !map.has(deptName.toLowerCase())) {
        map.set(deptName.toLowerCase(), {
          id: "dept-" + deptName.toLowerCase().replace(/\s+/g, "-"),
          code: "DEPT-" + deptName.slice(0, 4).toUpperCase(),
          name: deptName,
          description: `Municipal division for ${deptName}`,
          contact_email: `${deptName.toLowerCase().replace(/\s+/g, "")}@smartcity.gov`,
          contact_phone: "+91 22 2456 7800",
          head: "Department Supervisor",
          is_active: true,
          categoryMatch: [deptName.toLowerCase().split(" ")[0]],
        });
      }
    });

    const results = [];

    map.forEach((dept) => {
      const dName = dept.name.toLowerCase();
      const firstWord = dName.split(" ")[0];

      // Match workers
      const deptWorkers = workers.filter((w) => {
        const wDept = (w.department || "").trim().toLowerCase();
        return wDept === dName || wDept.includes(firstWord) || (dName.includes(wDept) && wDept.length > 2);
      });

      const deptWorkerIds = new Set(deptWorkers.map((w) => w.id));

      // Match complaints (assigned to department worker OR matching category domain)
      const deptComplaints = complaints.filter((c) => {
        if (c.assigned_worker_id && deptWorkerIds.has(c.assigned_worker_id)) {
          return true;
        }
        const catName = (c.categories?.name || c.category_name || "").toLowerCase();
        const titleText = (c.title || "").toLowerCase();
        return (dept.categoryMatch || []).some((kw) => catName.includes(kw) || titleText.includes(kw));
      });

      const totalComplaints = deptComplaints.length;
      const resolvedComplaints = deptComplaints.filter((c) => c.status === "Resolved").length;
      const inProgressComplaints = deptComplaints.filter((c) => c.status === "In Progress").length;
      const rejectedComplaints = deptComplaints.filter((c) => c.status === "Rejected").length;
      const pendingComplaints = totalComplaints - resolvedComplaints - inProgressComplaints - rejectedComplaints;
      const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;

      // Worker performance
      const workerPerf = deptWorkers.map((w) => {
        const wComplaints = complaints.filter((c) => c.assigned_worker_id === w.id);
        const wTotal = wComplaints.length;
        const wRes = wComplaints.filter((c) => c.status === "Resolved").length;
        const wProg = wComplaints.filter((c) => c.status === "In Progress").length;
        const wPend = wTotal - wRes - wProg;
        const wRate = wTotal > 0 ? Math.round((wRes / wTotal) * 100) : 0;

        return {
          id: w.id,
          worker_code: w.worker_code,
          name: w.users?.name || "Municipal Worker",
          email: w.users?.email,
          phone: w.users?.phone,
          specialization: w.specialization || "General Maintenance",
          is_available: w.is_available,
          assigned_count: wTotal,
          resolved_count: wRes,
          in_progress_count: wProg,
          pending_count: wPend,
          resolution_rate: wRate,
        };
      });

      workerPerf.sort((a, b) => b.resolved_count - a.resolved_count || b.resolution_rate - a.resolution_rate);
      const topWorker = workerPerf.length > 0 && workerPerf[0].resolved_count > 0 ? workerPerf[0] : (workerPerf[0] || null);

      // Category breakdown
      const catDistribution = {};
      deptComplaints.forEach((c) => {
        const cName = c.categories?.name || "General";
        catDistribution[cName] = (catDistribution[cName] || 0) + 1;
      });

      results.push({
        ...dept,
        worker_count: deptWorkers.length,
        total_complaints: totalComplaints,
        pending_complaints: Math.max(0, pendingComplaints),
        in_progress_complaints: inProgressComplaints,
        resolved_complaints: resolvedComplaints,
        rejected_complaints: rejectedComplaints,
        resolution_rate: resolutionRate,
        workers: workerPerf,
        complaints: deptComplaints,
        top_worker: topWorker,
        category_distribution: catDistribution,
      });
    });

    results.sort((a, b) => b.total_complaints - a.total_complaints || b.worker_count - a.worker_count);
    return results;
  }, [workers, complaints, customDepartments, DEFAULT_DEPARTMENTS_CONFIG]);

  const filteredDepartments = useMemo(() => {
    if (!departmentSearch.trim()) return departmentsData;
    const q = departmentSearch.toLowerCase();
    return departmentsData.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.code && d.code.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        (d.head && d.head.toLowerCase().includes(q))
    );
  }, [departmentsData, departmentSearch]);

  const activeDepartment = useMemo(() => {
    if (!selectedDepartment) return null;
    return departmentsData.find((d) => d.id === selectedDepartment.id) || selectedDepartment;
  }, [departmentsData, selectedDepartment]);

  const filteredDeptWorkers = useMemo(() => {
    if (!activeDepartment || !activeDepartment.workers) return [];
    if (!departmentWorkerSearch.trim()) return activeDepartment.workers;
    const q = departmentWorkerSearch.toLowerCase();
    return activeDepartment.workers.filter(
      (w) =>
        (w.name || "").toLowerCase().includes(q) ||
        (w.worker_code || "").toLowerCase().includes(q) ||
        (w.email || "").toLowerCase().includes(q) ||
        (w.specialization || "").toLowerCase().includes(q)
    );
  }, [activeDepartment, departmentWorkerSearch]);

  const filteredDeptComplaints = useMemo(() => {
    if (!activeDepartment || !activeDepartment.complaints) return [];
    return activeDepartment.complaints
      .filter((c) => {
        if (departmentComplaintFilter === "Pending") {
          return c.status === "Submitted" || c.status === "Verified" || c.status === "Assigned";
        }
        if (departmentComplaintFilter === "In Progress") {
          return c.status === "In Progress";
        }
        if (departmentComplaintFilter === "Resolved") {
          return c.status === "Resolved";
        }
        return true;
      })
      .filter((c) => {
        if (!departmentComplaintSearch.trim()) return true;
        const q = departmentComplaintSearch.toLowerCase();
        return (
          (c.title || "").toLowerCase().includes(q) ||
          (c.complaint_code || "").toLowerCase().includes(q) ||
          ((c.categories?.name || "")).toLowerCase().includes(q) ||
          (c.address || "").toLowerCase().includes(q)
        );
      });
  }, [activeDepartment, departmentComplaintFilter, departmentComplaintSearch]);

  const handleOpenDepartment = (dept) => {
    setSelectedDepartment(dept);
    setDepartmentDetailTab("overview");
    setDepartmentComplaintFilter("All");
    setDepartmentWorkerSearch("");
    setDepartmentComplaintSearch("");
  };

  const handleOpenCreateDepartment = () => {
    setDepartmentForm({
      id: "",
      name: "",
      code: "",
      description: "",
      contact_email: "",
      contact_phone: "",
      head: "",
      is_active: true,
    });
    setShowAddDepartmentModal(true);
  };

  const handleOpenEditDepartment = (dept) => {
    setDepartmentForm({
      id: dept.id,
      name: dept.name,
      code: dept.code || "",
      description: dept.description || "",
      contact_email: dept.contact_email || "",
      contact_phone: dept.contact_phone || "",
      head: dept.head || "",
      is_active: dept.is_active !== undefined ? dept.is_active : true,
    });
    setShowEditDepartmentModal(true);
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    if (!departmentForm.name.trim()) {
      setError("Department name is required.");
      return;
    }

    try {
      setSavingDepartment(true);
      setError("");
      setSuccess("");

      const isEdit = Boolean(departmentForm.id);
      const slug = isEdit ? departmentForm.id : "dept-" + departmentForm.name.toLowerCase().replace(/\s+/g, "-");
      const code = departmentForm.code.trim() || "DEPT-" + departmentForm.name.slice(0, 4).toUpperCase();

      const deptPayload = {
        id: slug,
        code,
        name: departmentForm.name.trim(),
        description: departmentForm.description.trim() || `Municipal division for ${departmentForm.name.trim()}`,
        contact_email: departmentForm.contact_email.trim() || `${departmentForm.name.toLowerCase().replace(/\s+/g, "")}@smartcity.gov`,
        contact_phone: departmentForm.contact_phone.trim() || "+91 22 2456 7800",
        head: departmentForm.head.trim() || "Department Head",
        is_active: departmentForm.is_active,
      };

      setCustomDepartments((prev) => {
        const filtered = prev.filter((d) => d.id !== slug);
        return [...filtered, deptPayload];
      });

      if (selectedDepartment && selectedDepartment.id === slug) {
        setSelectedDepartment((prev) => ({ ...prev, ...deptPayload }));
      }

      // Sync with backend API
      try {
        if (isEdit) {
          await axios.patch(
            `${API_BASE_URL}/api/admin/departments/${slug}`,
            deptPayload,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          await axios.post(
            `${API_BASE_URL}/api/admin/departments`,
            deptPayload,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } catch (apiErr) {
        // Backend sync attempted, local state already updated
      }

      setSuccess(`Department '${deptPayload.name}' ${isEdit ? "updated" : "configured"} (Runtime Configuration).`);
      setShowAddDepartmentModal(false);
      setShowEditDepartmentModal(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save department.");
    } finally {
      setSavingDepartment(false);
    }
  };

  const handleToggleDepartmentStatus = async (dept) => {
    const nextStatus = !dept.is_active;
    const actionLabel = nextStatus ? "activate" : "deactivate";

    try {
      setError("");
      setSuccess("");

      setCustomDepartments((prev) => {
        const exists = prev.some((d) => d.id === dept.id);
        if (exists) {
          return prev.map((d) => (d.id === dept.id ? { ...d, is_active: nextStatus } : d));
        }
        return [...prev, { ...dept, is_active: nextStatus }];
      });

      if (selectedDepartment && selectedDepartment.id === dept.id) {
        setSelectedDepartment((prev) => ({ ...prev, is_active: nextStatus }));
      }

      // Sync with backend API
      try {
        await axios.patch(
          `${API_BASE_URL}/api/admin/departments/${dept.id}`,
          { is_active: nextStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (apiErr) {
        // Handled gracefully
      }

      setSuccess(`Department '${dept.name}' set to ${nextStatus ? "Active" : "Inactive"} (Runtime Configuration).`);
    } catch (err) {
      setError(`Failed to ${actionLabel} department.`);
    }
  };

  const handleOpenWorkerDetails = (worker) => {
    setSelectedWorkerForDetails(worker);
  };

  // ==========================================================
  // ADMIN PROFILE & ACCOUNT OPERATIONS
  // ==========================================================
  const loadAdminProfile = async (authToken = token) => {
    if (!authToken) return;
    try {
      setProfileLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/admin/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.data?.success && res.data.admin) {
        setAdminProfile(res.data.admin);
        setUser((prev) => ({ ...prev, ...res.data.admin }));
        setProfileForm({
          name: res.data.admin.name || "",
          phone: res.data.admin.phone || "",
        });
        try {
          const stored = localStorage.getItem("user");
          if (stored) {
            const parsed = JSON.parse(stored);
            localStorage.setItem("user", JSON.stringify({ ...parsed, ...res.data.admin }));
          }
        } catch {}
      }
    } catch (err) {
      console.error("Load admin profile error:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim() || profileForm.name.trim().length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }

    try {
      setProfileSaving(true);
      setError("");
      setSuccess("");

      const res = await axios.patch(
        `${API_BASE_URL}/api/admin/profile`,
        {
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim() || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success && res.data.admin) {
        setAdminProfile(res.data.admin);
        setUser((prev) => ({ ...prev, ...res.data.admin }));
        try {
          const stored = localStorage.getItem("user");
          if (stored) {
            const parsed = JSON.parse(stored);
            localStorage.setItem("user", JSON.stringify({ ...parsed, ...res.data.admin }));
          }
        } catch {}
        setProfileEditing(false);
        setSuccess("Admin profile updated successfully.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setError("Please select a valid image (JPG, PNG, WEBP, or GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    setSelectedPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmPhotoUpload = async () => {
    if (!selectedPhotoFile) return;

    try {
      setPhotoUploading(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("file", selectedPhotoFile);

      const res = await axios.post(
        `${API_BASE_URL}/api/admin/profile/photo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data?.success) {
        const newUrl = res.data.profile_image_url;
        setAdminProfile((prev) => ({ ...prev, profile_image_url: newUrl }));
        setUser((prev) => ({ ...prev, profile_image_url: newUrl }));
        try {
          const stored = localStorage.getItem("user");
          if (stored) {
            const parsed = JSON.parse(stored);
            localStorage.setItem("user", JSON.stringify({ ...parsed, profile_image_url: newUrl }));
          }
        } catch {}
        setPhotoPreview(null);
        setSelectedPhotoFile(null);
        setSuccess("Profile photo updated successfully.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to upload profile photo.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleCancelPhotoPreview = () => {
    setPhotoPreview(null);
    setSelectedPhotoFile(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    const confirmed = window.confirm("Are you sure you want to remove your profile photo?");
    if (!confirmed) return;

    try {
      setPhotoUploading(true);
      setError("");
      setSuccess("");

      await axios.delete(`${API_BASE_URL}/api/admin/profile/photo`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAdminProfile((prev) => ({ ...prev, profile_image_url: null }));
      setUser((prev) => ({ ...prev, profile_image_url: null }));
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.profile_image_url = null;
          localStorage.setItem("user", JSON.stringify(parsed));
        }
      } catch {}
      setPhotoPreview(null);
      setSelectedPhotoFile(null);
      setSuccess("Profile photo removed.");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to remove photo.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (!passwordForm.current_password) {
      setPasswordError("Current password is required.");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (passwordForm.current_password === passwordForm.new_password) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    try {
      setPasswordChanging(true);
      setError("");

      const res = await axios.post(
        `${API_BASE_URL}/api/admin/profile/change-password`,
        {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setSuccess("Administrator password changed successfully.");
        setPasswordForm({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
        setShowPasswordModal(false);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.detail || "Failed to change password.");
    } finally {
      setPasswordChanging(false);
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
    { id: "profile", label: "Admin Profile", icon: UserRound },
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
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full hover:bg-slate-100 transition border border-slate-200"
                    title="Admin Account & Profile"
                  >
                    {user?.profile_image_url ? (
                      <img
                        src={user.profile_image_url}
                        alt={user.name || "Admin"}
                        className="w-7 h-7 rounded-full object-cover border border-slate-300 shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-linear-to-tr from-slate-900 to-blue-700 text-white font-black text-[11px] flex items-center justify-center shrink-0">
                        {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                      </div>
                    )}
                    <div className="hidden sm:block text-left leading-tight">
                      <span className="block text-xs font-bold text-slate-800 truncate max-w-[120px]">
                        {user?.name || "Administrator"}
                      </span>
                      <span className="block text-[10px] font-semibold text-blue-600">
                        Super Admin
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                        userMenuOpen ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-3 border-b border-slate-100 bg-slate-50/50 rounded-xl mb-1.5 flex items-center gap-3">
                        {user?.profile_image_url ? (
                          <img
                            src={user.profile_image_url}
                            alt={user.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-300 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-xs text-slate-900 truncate">{user?.name || "Administrator"}</p>
                          <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                          <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800">
                            Super Administrator
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveNav("profile");
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100 rounded-lg transition mb-1"
                      >
                        <UserRound className="w-4 h-4 text-blue-600" />
                        Admin Account & Profile
                      </button>

                      <button
                        onClick={() => {
                          setShowPasswordModal(true);
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      >
                        <KeyRound className="w-4 h-4 text-slate-500" />
                        Change Password
                      </button>

                      <button
                        onClick={() => {
                          loadDashboard(token, true);
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      >
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                        Refresh Data
                      </button>

                      <button
                        onClick={() => {
                          setActiveNav("settings");
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      >
                        <Settings className="w-4 h-4 text-slate-500" />
                        Portal Settings
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
                {/* Header Banner & Management Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          Municipal Departments & Performance Center
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                          Real-time division metrics, municipal worker allocation, complaint workflows, and department lifecycle.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setDepartmentViewMode("cards")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                          departmentViewMode === "cards"
                            ? "bg-white text-blue-600 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Cards
                      </button>
                      <button
                        type="button"
                        onClick={() => setDepartmentViewMode("table")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                          departmentViewMode === "table"
                            ? "bg-white text-blue-600 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Table
                      </button>
                    </div>

                    {/* Add Department Button */}
                    <button
                      type="button"
                      onClick={handleOpenCreateDepartment}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      Add Department
                    </button>
                  </div>
                </div>

                {/* Citywide Department KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Total Departments</span>
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">
                      {departmentsData.length}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      {departmentsData.filter((d) => d.is_active).length} Active Divisions
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Municipal Workforce</span>
                      <Users className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">
                      {departmentsData.reduce((acc, d) => acc + d.worker_count, 0)}
                    </div>
                    <div className="text-[11px] font-medium text-slate-400 mt-1">
                      Assigned across {departmentsData.length} departments
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Assigned Complaints</span>
                      <Activity className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">
                      {departmentsData.reduce((acc, d) => acc + d.total_complaints, 0)}
                    </div>
                    <div className="text-[11px] font-medium text-slate-400 mt-1">
                      {departmentsData.reduce((acc, d) => acc + d.in_progress_complaints, 0)} In Progress
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Resolution Efficiency</span>
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">
                      {(() => {
                        const total = departmentsData.reduce((acc, d) => acc + d.total_complaints, 0);
                        const res = departmentsData.reduce((acc, d) => acc + d.resolved_complaints, 0);
                        return total > 0 ? Math.round((res / total) * 100) : 0;
                      })()}%
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-1">
                      {departmentsData.reduce((acc, d) => acc + d.resolved_complaints, 0)} Total Resolved
                    </div>
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search departments by name, code, head, or description..."
                      value={departmentSearch}
                      onChange={(e) => setDepartmentSearch(e.target.value)}
                      className="w-full pl-10 pr-9 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                    {departmentSearch && (
                      <button
                        type="button"
                        onClick={() => setDepartmentSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 whitespace-nowrap px-2">
                    Showing <span className="text-slate-900 font-bold">{filteredDepartments.length}</span> of {departmentsData.length} departments
                  </div>
                </div>

                {/* Empty State */}
                {filteredDepartments.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-800">No departments found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      No municipal divisions matched your search query. Try clearing the search or adding a new department.
                    </p>
                    <button
                      type="button"
                      onClick={() => setDepartmentSearch("")}
                      className="mt-4 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                    >
                      Clear Search Filter
                    </button>
                  </div>
                ) : departmentViewMode === "cards" ? (
                  /* Cards View */
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredDepartments.map((dept) => (
                      <div
                        key={dept.id}
                        className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          {/* Card Top: Code, Status & Actions */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                                {dept.code || "DEPT"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleDepartmentStatus(dept)}
                                title="Click to toggle Active/Inactive"
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition ${
                                  dept.is_active
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${dept.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                                {dept.is_active ? "Active" : "Inactive"}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenEditDepartment(dept)}
                              title="Edit Department"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Department Identity */}
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                              {dept.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {dept.description || "Municipal service division handling civic amenities."}
                            </p>
                            {dept.head && (
                              <p className="text-[11px] font-medium text-slate-400 mt-2 flex items-center gap-1">
                                <UserRound className="w-3 h-3 text-slate-400" />
                                Head: <span className="text-slate-700 font-semibold">{dept.head}</span>
                              </p>
                            )}
                          </div>

                          {/* Department Metrics Grid */}
                          <div className="grid grid-cols-4 gap-2 bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Workers</div>
                              <div className="text-sm font-black text-slate-900 mt-0.5">{dept.worker_count}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Total</div>
                              <div className="text-sm font-black text-blue-600 mt-0.5">{dept.total_complaints}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Active</div>
                              <div className="text-sm font-black text-amber-600 mt-0.5">{dept.in_progress_complaints + dept.pending_complaints}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Resolved</div>
                              <div className="text-sm font-black text-emerald-600 mt-0.5">{dept.resolved_complaints}</div>
                            </div>
                          </div>

                          {/* Resolution Efficiency Progress Bar */}
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold mb-1">
                              <span className="text-slate-500">Resolution Rate</span>
                              <span className={`${dept.resolution_rate >= 75 ? "text-emerald-600" : dept.resolution_rate >= 40 ? "text-amber-600" : "text-slate-600"}`}>
                                {dept.resolution_rate}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                  dept.resolution_rate >= 75
                                    ? "bg-emerald-500"
                                    : dept.resolution_rate >= 40
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                                }`}
                                style={{ width: `${Math.min(100, dept.resolution_rate)}%` }}
                              />
                            </div>
                          </div>

                          {/* Top Worker Spotlight (if any) */}
                          {dept.top_worker && dept.top_worker.resolved_count > 0 && (
                            <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 truncate">
                                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                                <div className="truncate">
                                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Top Performer</span>
                                  <span className="font-bold text-slate-900 truncate block">{dept.top_worker.name}</span>
                                </div>
                              </div>
                              <span className="text-[11px] font-extrabold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-lg shrink-0">
                                {dept.top_worker.resolved_count} resolved
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Footer Action */}
                        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDepartment(dept)}
                            className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Department Details & Performance
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Table View */
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <th className="py-3.5 px-4">Department</th>
                            <th className="py-3.5 px-3">Head</th>
                            <th className="py-3.5 px-3 text-center">Workers</th>
                            <th className="py-3.5 px-3 text-center">Assigned</th>
                            <th className="py-3.5 px-3 text-center">Pending</th>
                            <th className="py-3.5 px-3 text-center">In Progress</th>
                            <th className="py-3.5 px-3 text-center">Resolved</th>
                            <th className="py-3.5 px-3">Resolution Rate</th>
                            <th className="py-3.5 px-3 text-center">Status</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredDepartments.map((dept) => (
                            <tr key={dept.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                  <span>{dept.name}</span>
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                                    {dept.code || "DEPT"}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 truncate max-w-xs">{dept.description}</div>
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                                {dept.head || "—"}
                              </td>
                              <td className="py-3.5 px-3 text-center font-bold text-slate-900">
                                {dept.worker_count}
                              </td>
                              <td className="py-3.5 px-3 text-center font-bold text-blue-600">
                                {dept.total_complaints}
                              </td>
                              <td className="py-3.5 px-3 text-center text-slate-600">
                                {dept.pending_complaints}
                              </td>
                              <td className="py-3.5 px-3 text-center font-semibold text-amber-600">
                                {dept.in_progress_complaints}
                              </td>
                              <td className="py-3.5 px-3 text-center font-bold text-emerald-600">
                                {dept.resolved_complaints}
                              </td>
                              <td className="py-3.5 px-3 min-w-[130px]">
                                <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                                  <span className="text-slate-600">{dept.resolution_rate}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      dept.resolution_rate >= 75 ? "bg-emerald-500" : dept.resolution_rate >= 40 ? "bg-amber-500" : "bg-blue-500"
                                    }`}
                                    style={{ width: `${Math.min(100, dept.resolution_rate)}%` }}
                                  />
                                </div>
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDepartmentStatus(dept)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 transition ${
                                    dept.is_active
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${dept.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                                  {dept.is_active ? "Active" : "Inactive"}
                                </button>
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDepartment(dept)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-bold text-xs"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditDepartment(dept)}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs"
                                    title="Edit Department"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

                        {activeNav === "rewards" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold mb-3">
                        <Award className="w-3.5 h-3.5" />
                        <span>Civic Gamification & Municipal Incentives</span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                        Rewards &amp; Civic Badges Center
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                        Supervise citizen rewards catalog, verify redemption claims, inspect real points ledger, and monitor civic achievements.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadRewardsData()}
                        disabled={rewardsLoading}
                        className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${rewardsLoading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAddReward}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-2xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Reward</span>
                      </button>
                    </div>
                  </div>

                  {/* Navigation Sub-Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pt-6 mt-6 border-t border-white/10 no-scrollbar">
                    {[
                      { id: "overview", label: "Overview", icon: LayoutDashboard },
                      { id: "catalog", label: "Rewards Catalog", icon: Gift, count: rewardsCatalog.length },
                      {
                        id: "claims",
                        label: "Reward Claims",
                        icon: Award,
                        count: rewardClaims.length,
                        badge: rewardClaims.filter((c) => c.status === "Claimed" || c.status === "Pending").length,
                      },
                      { id: "ledger", label: "Points Ledger", icon: Coins, count: rewardsLedger.length },
                      { id: "badges", label: "Badges & Levels", icon: Trophy, count: adminBadges.length },
                      { id: "leaderboard", label: "Civic Leaderboard", icon: Users },
                      { id: "analytics", label: "Analytics", icon: BarChart3 },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = rewardsTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setRewardsTab(tab.id)}
                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                            isActive
                              ? "bg-white text-slate-900 shadow-md"
                              : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                          {tab.badge > 0 && (
                            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full">
                              {tab.badge}
                            </span>
                          )}
                          {!tab.badge && tab.count !== undefined && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${isActive ? "bg-slate-100 text-slate-700" : "bg-white/10 text-slate-300"}`}>
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ============================================================ */}
                {/* 1. OVERVIEW TAB */}
                {/* ============================================================ */}
                {rewardsTab === "overview" && (
                  <div className="space-y-6">
                    {/* Database Architecture Notice */}
                    <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-300">
                          <Coins className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-slate-900 text-sm">Supabase Database Integration Status</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Rewards Table Active
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Points transactions and redemption claims are permanently recorded in the Supabase <span className="font-semibold font-mono text-slate-800">rewards</span> table. Claim approvals, deliveries, and rejections (with automatic point refunds) sync live with citizen accounts.
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRewardsTab("claims")}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                        >
                          Review Claims
                        </button>
                      </div>
                    </div>

                    {/* KPI Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Catalog</span>
                          <Gift className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                          {rewardsOverview?.metrics?.active_rewards ?? rewardsCatalog.filter((r) => r.status === "Active").length}
                          <span className="text-xs text-slate-400 font-semibold ml-1">/ {rewardsCatalog.length} active</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Municipal reward items</p>
                      </div>

                      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Claims</span>
                          <Award className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                          {rewardsOverview?.metrics?.total_claims ?? rewardClaims.length}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Citizen redemptions</p>
                      </div>

                      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Action</span>
                          <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-amber-600">
                          {rewardsOverview?.metrics?.pending_claims ?? rewardClaims.filter((c) => c.status === "Claimed" || c.status === "Pending").length}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Awaiting fulfillment</p>
                      </div>

                      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Points Issued</span>
                          <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl font-black text-emerald-600">
                          +{rewardsOverview?.metrics?.total_points_issued ?? 0}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Earned by citizens</p>
                      </div>

                      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Points Redeemed</span>
                          <ArrowDownRight className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="text-2xl font-black text-purple-600">
                          -{rewardsOverview?.metrics?.total_points_redeemed ?? 0}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Spent on rewards</p>
                      </div>
                    </div>

                    {/* Secondary Metrics Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Badges</span>
                          <div className="text-xl font-black text-slate-900 mt-0.5">8 System Milestones</div>
                          <p className="text-xs text-slate-500">Evaluated on live complaint &amp; points records</p>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Star className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Citizens with Badges</span>
                          <div className="text-xl font-black text-slate-900 mt-0.5">
                            {rewardsOverview?.metrics?.citizens_with_badges ?? 0} Citizens
                          </div>
                          <p className="text-xs text-slate-500">Unlocked at least 1 civic achievement</p>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Participants</span>
                          <div className="text-xl font-black text-slate-900 mt-0.5">
                            {rewardsOverview?.metrics?.participating_citizens ?? 0} Citizens
                          </div>
                          <p className="text-xs text-slate-500">Active in complaints and rewards</p>
                        </div>
                      </div>
                    </div>

                    {/* Recent Claims Preview */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base">Recent Reward Claims</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Latest redemption requests submitted by citizens</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRewardsTab("claims")}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <span>View All Claims</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {rewardClaims.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
                          <Gift className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-700">No reward claims recorded yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">When citizens redeem points, claims appear here live.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 overflow-x-auto">
                          {rewardClaims.slice(0, 5).map((claim) => (
                            <div key={claim.id} className="py-3.5 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                  <Gift className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 text-xs truncate">{claim.reward_name}</div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span>{claim.citizen_name}</span>
                                    <span>&bull;</span>
                                    <span className="font-mono">{claim.claim_code}</span>
                                    <span>&bull;</span>
                                    <span className="text-purple-600 font-bold">{claim.points_spent} pts</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  claim.status === "Delivered" || claim.status === "Completed"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : claim.status === "Approved"
                                    ? "bg-blue-100 text-blue-800"
                                    : claim.status === "Rejected"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}>
                                  {claim.status}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedClaimForDetails(claim)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
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
                {/* 2. REWARDS CATALOG TAB */}
                {/* ============================================================ */}
                {rewardsTab === "catalog" && (
                  <div className="space-y-6">
                    {/* Controls Bar */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="relative flex-1 max-w-sm">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search catalog by name or description..."
                            value={catalogSearch}
                            onChange={(e) => setCatalogSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                          />
                        </div>

                        <select
                          value={catalogCategoryFilter}
                          onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="All">All Categories</option>
                          <option value="Transit">Transit</option>
                          <option value="Mobility">Mobility</option>
                          <option value="Environment">Environment</option>
                          <option value="Education">Education</option>
                          <option value="Sustainability">Sustainability</option>
                          <option value="Recognition">Recognition</option>
                          <option value="Culture">Culture</option>
                          <option value="General">General</option>
                        </select>

                        <select
                          value={catalogStatusFilter}
                          onChange={(e) => setCatalogStatusFilter(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="All">All Statuses</option>
                          <option value="Active">Active Only</option>
                          <option value="Inactive">Inactive Only</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={catalogSort}
                          onChange={(e) => setCatalogSort(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="default">Sort by Default</option>
                          <option value="points-asc">Points: Low to High</option>
                          <option value="points-desc">Points: High to Low</option>
                          <option value="claims">Most Claimed</option>
                          <option value="name">Name (A-Z)</option>
                        </select>

                        <button
                          type="button"
                          onClick={handleOpenAddReward}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Item</span>
                        </button>
                      </div>
                    </div>

                    {/* Catalog Grid */}
                    {filteredCatalog.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
                        <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="font-extrabold text-slate-900 text-sm">No matching rewards found</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Try adjusting your search query or filters, or add a new reward to the municipal catalog.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCatalog.map((item) => (
                          <div
                            key={item.id}
                            className={`bg-white border rounded-3xl p-5 shadow-xs transition flex flex-col justify-between ${
                              item.status === "Active" ? "border-slate-200/90 hover:border-slate-300" : "border-slate-200 bg-slate-50/50 opacity-75"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-3.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                                  {item.category || "General"}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {item.popular && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                      <Sparkles className="w-3 h-3" /> Popular
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                  {renderRewardIcon(item.icon, "w-6 h-6")}
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{item.name}</h4>
                                  <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-black">
                                    <Coins className="w-3 h-3 text-amber-600" />
                                    <span>{item.points_required} Points</span>
                                  </div>
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 mt-3 leading-relaxed line-clamp-2">
                                {item.description}
                              </p>
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-slate-500">
                                <span className="font-bold text-slate-900">{item.claims_count || 0}</span> claims
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleRewardStatus(item)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition ${
                                    item.status === "Active"
                                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {item.status === "Active" ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditReward(item)}
                                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[11px] font-bold transition flex items-center gap-1"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================ */}
                {/* 3. REWARD CLAIMS TAB */}
                {/* ============================================================ */}
                {rewardsTab === "claims" && (
                  <div className="space-y-6">
                    {/* Controls Bar */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="relative flex-1 max-w-sm">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search by citizen, email, voucher code, reward..."
                            value={claimsSearch}
                            onChange={(e) => setClaimsSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                          />
                        </div>

                        <select
                          value={claimsStatusFilter}
                          onChange={(e) => setClaimsStatusFilter(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="All">All Statuses</option>
                          <option value="Pending">Pending / Claimed</option>
                          <option value="Approved">Approved</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={claimsSort}
                          onChange={(e) => setClaimsSort(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="points-desc">Highest Points</option>
                        </select>
                      </div>
                    </div>

                    {/* Claims Table / List */}
                    {filteredClaims.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
                        <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="font-extrabold text-slate-900 text-sm">No redemption claims match criteria</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          When citizens redeem catalog vouchers using their civic points, requests appear here for admin review.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                <th className="py-3.5 px-4">Claim Code</th>
                                <th className="py-3.5 px-4">Citizen</th>
                                <th className="py-3.5 px-4">Reward Voucher</th>
                                <th className="py-3.5 px-3 text-center">Points</th>
                                <th className="py-3.5 px-3 text-center">Status</th>
                                <th className="py-3.5 px-3">Date</th>
                                <th className="py-3.5 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {filteredClaims.map((claim) => (
                                <tr key={claim.id} className="hover:bg-slate-50/70 transition">
                                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                    <div className="flex items-center gap-1.5">
                                      <span>{claim.claim_code}</span>
                                      <button
                                        type="button"
                                        onClick={() => copyClaimCode(claim.claim_code)}
                                        className="text-slate-400 hover:text-slate-700"
                                        title="Copy code"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                        {(claim.citizen_name || "C")[0].toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900">{claim.citizen_name}</div>
                                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{claim.citizen_email || "N/A"}</div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-slate-900">{claim.reward_name}</div>
                                    <div className="text-[11px] text-slate-500">{claim.reward_category}</div>
                                  </td>

                                  <td className="py-3.5 px-3 text-center">
                                    <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                                      {claim.points_spent} pts
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-3 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      claim.status === "Delivered" || claim.status === "Completed"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : claim.status === "Approved"
                                        ? "bg-blue-100 text-blue-800"
                                        : claim.status === "Rejected"
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}>
                                      {claim.status}
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                                    {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : "N/A"}
                                  </td>

                                  <td className="py-3.5 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedClaimForDetails(claim)}
                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs"
                                        title="View Details"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>

                                      {(claim.status === "Claimed" || claim.status === "Pending") && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => setClaimActionConfirm({ claim, action: "Approved" })}
                                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setClaimActionConfirm({ claim, action: "Rejected" })}
                                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition"
                                          >
                                            Reject
                                          </button>
                                        </>
                                      )}

                                      {claim.status === "Approved" && (
                                        <button
                                          type="button"
                                          onClick={() => setClaimActionConfirm({ claim, action: "Delivered" })}
                                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition"
                                        >
                                          Mark Delivered
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================ */}
                {/* 4. POINTS LEDGER TAB */}
                {/* ============================================================ */}
                {rewardsTab === "ledger" && (
                  <div className="space-y-6">
                    {/* Points Rules Summary Box */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Coins className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-sm">System Civic Points Ledger &amp; Rules</h3>
                            <p className="text-xs text-slate-500">Live ledger records directly from the database</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {filteredLedger.length} Total Transactions
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                          <span className="font-bold text-emerald-800 block mb-0.5">+10 Points</span>
                          <span className="text-slate-600 text-[11px]">Issued automatically when a complaint is verified by municipal officers.</span>
                        </div>
                        <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl">
                          <span className="font-bold text-blue-800 block mb-0.5">+20 Points</span>
                          <span className="text-slate-600 text-[11px]">Issued automatically when a complaint resolution is confirmed.</span>
                        </div>
                        <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-2xl">
                          <span className="font-bold text-purple-800 block mb-0.5">Voucher Redemptions</span>
                          <span className="text-slate-600 text-[11px]">Deducted from citizen balance upon claiming catalog perks.</span>
                        </div>
                      </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search transactions by citizen, reason, complaint code..."
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                        />
                      </div>

                      <select
                        value={ledgerTypeFilter}
                        onChange={(e) => setLedgerTypeFilter(e.target.value)}
                        className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="All">All Transaction Types</option>
                        <option value="Earned">Earned (+Points)</option>
                        <option value="Redemption">Redemption (-Points)</option>
                        <option value="Refund">Refunds</option>
                      </select>
                    </div>

                    {/* Ledger Table */}
                    {filteredLedger.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
                        <Coins className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="font-extrabold text-slate-900 text-sm">No ledger transactions match</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Points transactions will appear here as citizens earn rewards or redeem vouchers.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                <th className="py-3.5 px-4">Date &amp; Time</th>
                                <th className="py-3.5 px-4">Citizen</th>
                                <th className="py-3.5 px-3 text-center">Type</th>
                                <th className="py-3.5 px-3 text-center">Points</th>
                                <th className="py-3.5 px-4">Action / Reason</th>
                                <th className="py-3.5 px-4">Linked Complaint</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {filteredLedger.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                                  <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                                    {tx.created_at ? new Date(tx.created_at).toLocaleString() : "N/A"}
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-slate-900">{tx.citizen_name}</div>
                                    <div className="text-[11px] text-slate-400">{tx.citizen_email || "N/A"}</div>
                                  </td>

                                  <td className="py-3.5 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      tx.transaction_type === "Earned"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : tx.transaction_type === "Refund"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-purple-100 text-purple-800"
                                    }`}>
                                      {tx.transaction_type}
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-3 text-center font-black">
                                    {tx.points > 0 ? (
                                      <span className="text-emerald-600">+{tx.points}</span>
                                    ) : (
                                      <span className="text-purple-600">{tx.points}</span>
                                    )}
                                  </td>

                                  <td className="py-3.5 px-4 text-slate-800 max-w-xs truncate">
                                    {tx.reason}
                                  </td>

                                  <td className="py-3.5 px-4">
                                    {tx.complaint_code ? (
                                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                        {tx.complaint_code}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">N/A</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================ */}
                {/* 5. BADGES & LEVELS TAB */}
                {/* ============================================================ */}
                {rewardsTab === "badges" && (
                  <div className="space-y-6">
                    {/* Civic Levels Progression Scale */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                      <div className="mb-4">
                        <h3 className="font-extrabold text-slate-900 text-base">Civic Level Progression Pathway</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Automated citizen rank progression based on accumulated reward points</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-black text-amber-800 text-xs">Bronze Citizen</span>
                            <Award className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="text-lg font-black text-slate-900">0 - 49 pts</div>
                          <p className="text-[11px] text-slate-600 mt-1">Starting level for active registered citizens.</p>
                        </div>

                        <div className="p-4 rounded-2xl border border-slate-300 bg-slate-50/80">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-black text-slate-700 text-xs">Silver Sentinel</span>
                            <Award className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="text-lg font-black text-slate-900">50 - 99 pts</div>
                          <p className="text-[11px] text-slate-600 mt-1">Dedicated civic helper with verified reports.</p>
                        </div>

                        <div className="p-4 rounded-2xl border border-yellow-300 bg-yellow-50/70">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-black text-yellow-800 text-xs">Gold Guardian</span>
                            <Trophy className="w-4 h-4 text-yellow-600" />
                          </div>
                          <div className="text-lg font-black text-slate-900">100 - 249 pts</div>
                          <p className="text-[11px] text-slate-600 mt-1">Top tier community advocate and validator.</p>
                        </div>

                        <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/60">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-black text-indigo-800 text-xs">Platinum Champion</span>
                            <Star className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="text-lg font-black text-slate-900">250+ pts</div>
                          <p className="text-[11px] text-slate-600 mt-1">Municipal civic hero with sustained contributions.</p>
                        </div>
                      </div>
                    </div>

                    {/* Search Badges */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search badges by title, requirement..."
                          value={badgeSearch}
                          onChange={(e) => setBadgeSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        {filteredBadges.length} Achievement Badges
                      </span>
                    </div>

                    {/* Badges Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {filteredBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                                {badge.category}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                System Rule
                              </span>
                            </div>

                            <div className="flex items-start gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                                {renderRewardIcon(badge.icon, "w-5 h-5")}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-900 text-sm">{badge.title}</h4>
                                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{badge.requirement}</p>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                              {badge.description}
                            </p>
                          </div>

                          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-base font-black text-slate-900">{badge.earned_count || 0}</span>
                              <span className="text-[11px] text-slate-500 font-medium ml-1">citizens earned</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedBadgeForDetails(badge)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Details</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ============================================================ */}
                {/* 6. CIVIC LEADERBOARD TAB */}
                {/* ============================================================ */}
                {rewardsTab === "leaderboard" && (
                  <div className="space-y-6">
                    {/* Controls */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search citizens by name or email..."
                          value={leaderboardSearch}
                          onChange={(e) => setLeaderboardSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLeaderboardPeriod("all")}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                            leaderboardPeriod === "all"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          All-Time Rankings
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeaderboardPeriod("month")}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                            leaderboardPeriod === "month"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          Last 30 Days
                        </button>
                      </div>
                    </div>

                    {/* Leaderboard Table */}
                    {filteredLeaderboard.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="font-extrabold text-slate-900 text-sm">No citizens found on leaderboard</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Rankings update automatically based on verified complaint resolutions and civic points.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                <th className="py-3.5 px-4 text-center w-14">Rank</th>
                                <th className="py-3.5 px-4">Citizen</th>
                                <th className="py-3.5 px-4">Contact Info</th>
                                <th className="py-3.5 px-3 text-center">Active Points</th>
                                <th className="py-3.5 px-3 text-center">All-Time Points</th>
                                <th className="py-3.5 px-3 text-center">Submitted</th>
                                <th className="py-3.5 px-3 text-center">Resolved</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {filteredLeaderboard.map((citizen) => (
                                <tr key={citizen.user_id} className="hover:bg-slate-50/70 transition">
                                  <td className="py-3.5 px-4 text-center">
                                    {citizen.rank === 1 ? (
                                      <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-black inline-flex items-center justify-center text-xs">
                                        #1
                                      </span>
                                    ) : citizen.rank === 2 ? (
                                      <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-black inline-flex items-center justify-center text-xs">
                                        #2
                                      </span>
                                    ) : citizen.rank === 3 ? (
                                      <span className="w-7 h-7 rounded-full bg-amber-50 text-amber-800 font-black inline-flex items-center justify-center text-xs border border-amber-200">
                                        #3
                                      </span>
                                    ) : (
                                      <span className="font-bold text-slate-500">#{citizen.rank}</span>
                                    )}
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs shrink-0">
                                        {(citizen.name || "C")[0].toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900">{citizen.name}</div>
                                        <div className="text-[10px] text-slate-400">
                                          Member since {citizen.member_since ? new Date(citizen.member_since).toLocaleDateString() : "N/A"}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-3.5 px-4 text-slate-600">
                                    <div>{citizen.email || "No email on record"}</div>
                                    {citizen.phone && <div className="text-[11px] text-slate-400">{citizen.phone}</div>}
                                  </td>

                                  <td className="py-3.5 px-3 text-center">
                                    <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                      {citizen.total_points} pts
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-3 text-center">
                                    <span className="font-bold text-slate-700">
                                      {citizen.all_time_points} pts
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                                    {citizen.complaints_submitted}
                                  </td>

                                  <td className="py-3.5 px-3 text-center font-bold text-emerald-700">
                                    {citizen.complaints_resolved}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================ */}
                {/* 7. REWARD ANALYTICS TAB */}
                {/* ============================================================ */}
                {rewardsTab === "analytics" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Points Economy</span>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Total Issued</span>
                            <span className="font-black text-emerald-600">+{rewardsAnalytics?.points_summary?.total_issued ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Total Redeemed</span>
                            <span className="font-black text-purple-600">-{rewardsAnalytics?.points_summary?.total_redeemed ?? 0}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-700">Redemption Rate</span>
                            <span className="text-blue-600">{rewardsAnalytics?.points_summary?.redemption_rate_pct ?? 0}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Claims Status Breakdown</span>
                        <div className="mt-2 space-y-2">
                          {Object.entries(rewardsAnalytics?.status_distribution || { Claimed: 0, Approved: 0, Delivered: 0, Rejected: 0 }).map(([st, cnt]) => (
                            <div key={st} className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">{st}</span>
                              <span className="font-bold text-slate-900">{cnt}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Catalog by Category</span>
                        <div className="mt-2 space-y-2">
                          {(rewardsAnalytics?.category_distribution || []).map((cat) => (
                            <div key={cat.category} className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">{cat.category}</span>
                              <span className="font-bold text-slate-900">{cat.count} items</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Most Claimed Rewards List */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                      <h3 className="font-extrabold text-slate-900 text-base mb-1">Most Popular Rewards</h3>
                      <p className="text-xs text-slate-500 mb-4">Ranked by total claims from verified citizen accounts</p>

                      {(!rewardsAnalytics?.most_claimed || rewardsAnalytics.most_claimed.length === 0) ? (
                        <p className="text-xs text-slate-400 py-6 text-center">Not enough redemption data to rank rewards yet.</p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {rewardsAnalytics.most_claimed.map((item, idx) => (
                            <div key={item.name} className="py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                                  #{idx + 1}
                                </span>
                                <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                  {item.claims} claims
                                </span>
                                <span className="font-semibold text-purple-700">
                                  {item.points_redeemed} pts redeemed
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}


                        {activeNav === "announcements" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-3">
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>Municipal Communication & Emergency Alerts</span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                        Announcements &amp; Broadcast Console
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                        Dispatch public notices, emergency alerts, and departmental orders. Dispatched notifications sync live to citizen and workforce notification bells.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadAnnouncementsData()}
                        disabled={announcementsLoading}
                        className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${announcementsLoading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnnouncementsTab("create")}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black rounded-2xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-blue-500/25"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New Broadcast</span>
                      </button>
                    </div>
                  </div>

                  {/* Navigation Sub-Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pt-6 mt-6 border-t border-white/10 no-scrollbar">
                    {[
                      { id: "overview", label: "Overview", icon: LayoutDashboard },
                      { id: "create", label: "Create Announcement", icon: Megaphone },
                      { id: "history", label: "Broadcast History", icon: ClipboardList, count: announcementsList.length },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = announcementsTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAnnouncementsTab(tab.id)}
                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                            isActive
                              ? "bg-white text-slate-900 shadow-md"
                              : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                          {tab.count !== undefined && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${isActive ? "bg-slate-100 text-slate-700" : "bg-white/10 text-slate-300"}`}>
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ============================================================ */}
                {/* 1. OVERVIEW TAB */}
                {/* ============================================================ */}
                {announcementsTab === "overview" && (
                  <div className="space-y-6">
                    {/* Database Architecture Notice */}
                    <div className="bg-gradient-to-r from-indigo-50/90 to-blue-50/70 border border-indigo-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-300">
                          <Megaphone className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-slate-900 text-sm">Supabase Notification Table Integration</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Real Database Persistence
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Every broadcast is bulk-inserted into the real Supabase <span className="font-semibold font-mono text-slate-800">notifications</span> table (<code className="text-[11px] font-mono">type: "announcement"</code>). Unread badges increment live across citizen and worker portal bells. Note: Drafts and scheduled future dispatches are not supported by the database schema.
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAnnouncementsTab("create")}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                        >
                          Dispatch Notice
                        </button>
                      </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Broadcasts</span>
                          <Megaphone className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                          {announcementsOverview?.metrics?.total_announcements ?? announcementsList.length}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Dispatched notices</p>
                      </div>

                      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivered</span>
                          <CheckCheck className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-black text-blue-600">
                          {announcementsOverview?.metrics?.total_notifications_sent ?? 0}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Total recipient copies</p>
                      </div>

                      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Read by Citizens</span>
                          <Check className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl font-black text-emerald-600">
                          {announcementsOverview?.metrics?.total_read ?? 0}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Notifications marked read</p>
                      </div>

                      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unread Copies</span>
                          <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-amber-600">
                          {announcementsOverview?.metrics?.total_unread ?? 0}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Awaiting citizen review</p>
                      </div>

                      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Read Rate</span>
                          <TrendingUp className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                          {announcementsOverview?.metrics?.read_rate_pct ?? 0}%
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Engagement percentage</p>
                      </div>
                    </div>

                    {/* Quick Broadcast Action Shortcuts */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div
                        onClick={() => {
                          setAnnouncementForm((prev) => ({
                            ...prev,
                            priority: "Emergency",
                            category: "Emergency",
                            audience: "all_users",
                          }));
                          setAnnouncementsTab("create");
                        }}
                        className="bg-white border border-rose-200/90 rounded-3xl p-5 shadow-xs flex items-center gap-4 cursor-pointer hover:bg-rose-50/40 transition group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Quick Action</span>
                          </div>
                          <div className="text-sm font-extrabold text-slate-900 mt-0.5">Emergency Alert</div>
                          <p className="text-xs text-slate-500">Dispatch critical alert to all citizens &amp; workers</p>
                        </div>
                      </div>

                      <div
                        onClick={() => {
                          setAnnouncementForm((prev) => ({
                            ...prev,
                            priority: "Important",
                            category: "Infrastructure",
                            audience: "all_workers",
                          }));
                          setAnnouncementsTab("create");
                        }}
                        className="bg-white border border-blue-200/90 rounded-3xl p-5 shadow-xs flex items-center gap-4 cursor-pointer hover:bg-blue-50/40 transition group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                          <Wrench className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Workforce Order</span>
                          <div className="text-sm font-extrabold text-slate-900 mt-0.5">All Municipal Workers</div>
                          <p className="text-xs text-slate-500">Dispatch operational directive to all field crews</p>
                        </div>
                      </div>

                      <div
                        onClick={() => {
                          setAnnouncementForm((prev) => ({
                            ...prev,
                            priority: "Normal",
                            category: "General",
                            audience: "all_citizens",
                          }));
                          setAnnouncementsTab("create");
                        }}
                        className="bg-white border border-indigo-200/90 rounded-3xl p-5 shadow-xs flex items-center gap-4 cursor-pointer hover:bg-indigo-50/40 transition group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Civic Notice</span>
                          <div className="text-sm font-extrabold text-slate-900 mt-0.5">All Registered Citizens</div>
                          <p className="text-xs text-slate-500">Public service notice to all verified citizens</p>
                        </div>
                      </div>
                    </div>

                    {/* Recent Broadcasts Preview Table */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base">Recent Dispatched Broadcasts</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Audit log of announcements delivered to municipal accounts</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnnouncementsTab("history")}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <span>View Full History</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {announcementsList.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
                          <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-700">No broadcast announcements dispatched yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Use "New Broadcast" to send public alerts to citizens and staff.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 overflow-x-auto">
                          {announcementsList.slice(0, 5).map((item) => (
                            <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <Megaphone className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-2">
                                    <span>{item.title}</span>
                                    {renderPriorityBadge(item.priority)}
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span>{item.audience}</span>
                                    <span>&bull;</span>
                                    <span className="font-mono text-[10px]">{item.id}</span>
                                    <span>&bull;</span>
                                    <span>{item.total_recipients} recipients</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right hidden sm:block">
                                  <div className="text-xs font-bold text-slate-800">{item.read_percentage}% read</div>
                                  <div className="text-[10px] text-slate-400">{item.read_count} of {item.total_recipients}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAnnouncementDetails(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50"
                                  title="View broadcast delivery stats"
                                >
                                  <Eye className="w-4 h-4" />
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
                {/* 2. CREATE ANNOUNCEMENT TAB */}
                {/* ============================================================ */}
                {announcementsTab === "create" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Compose Form */}
                      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
                        <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-base">Compose Broadcast Notice</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Send a real-time notification to registered user accounts</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700">
                            Immediate Delivery
                          </span>
                        </div>

                        <div className="space-y-4">
                          {/* Announcement Title */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Announcement Title *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Water Pipeline Maintenance Schedule - Sectors 4 to 8"
                              value={announcementForm.title}
                              onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
                              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                              maxLength={160}
                            />
                            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                              <span>Be concise and descriptive. Shown as notification headline.</span>
                              <span>{announcementForm.title.length}/160</span>
                            </div>
                          </div>

                          {/* Priority & Category Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Priority Level *
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {["Normal", "Important", "Urgent", "Emergency"].map((p) => {
                                  const isSelected = announcementForm.priority === p;
                                  return (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => setAnnouncementForm((prev) => ({ ...prev, priority: p }))}
                                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition text-center ${
                                        isSelected
                                          ? p === "Emergency"
                                            ? "bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-200"
                                            : p === "Urgent"
                                            ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                            : p === "Important"
                                            ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                            : "bg-blue-600 text-white border-blue-600 shadow-sm"
                                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Municipal Category
                              </label>
                              <select
                                value={announcementForm.category}
                                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, category: e.target.value }))}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                <option value="General">General Notice</option>
                                <option value="Infrastructure">Infrastructure &amp; Roads</option>
                                <option value="Traffic">Traffic &amp; Transit</option>
                                <option value="Water">Water Supply</option>
                                <option value="Electricity">Electricity &amp; Power</option>
                                <option value="Sanitation">Sanitation &amp; Waste</option>
                                <option value="Public Safety">Public Safety</option>
                                <option value="Emergency">Disaster &amp; Emergency</option>
                              </select>
                            </div>
                          </div>

                          {/* Target Audience */}
                          <div className="pt-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Target Audience Selection *
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {[
                                { id: "all_citizens", label: "All Citizens", icon: Users },
                                { id: "all_workers", label: "All Workers", icon: Wrench },
                                { id: "all_users", label: "Citizens + Workers", icon: UserCheck },
                              ].map((aud) => {
                                const Icon = aud.icon;
                                const isSelected = announcementForm.audience === aud.id;
                                return (
                                  <button
                                    key={aud.id}
                                    type="button"
                                    onClick={() => setAnnouncementForm((prev) => ({ ...prev, audience: aud.id, department: "", user_id: "" }))}
                                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                                      isSelected
                                        ? "bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs"
                                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                                    <span className="text-xs font-bold">{aud.label}</span>
                                  </button>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => setAnnouncementForm((prev) => ({ ...prev, audience: "department", user_id: "" }))}
                                className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                                  announcementForm.audience === "department"
                                    ? "bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs"
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <Building2 className={`w-4 h-4 shrink-0 ${announcementForm.audience === "department" ? "text-blue-600" : "text-slate-400"}`} />
                                <span className="text-xs font-bold">Specific Department</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setAnnouncementForm((prev) => ({ ...prev, audience: "specific_user", department: "" }))}
                                className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                                  announcementForm.audience === "specific_user"
                                    ? "bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs"
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <User className={`w-4 h-4 shrink-0 ${announcementForm.audience === "specific_user" ? "text-blue-600" : "text-slate-400"}`} />
                                <span className="text-xs font-bold">Single Account / User</span>
                              </button>
                            </div>
                          </div>

                          {/* Conditional Department Target Dropdown */}
                          {announcementForm.audience === "department" && (
                            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl">
                              <label className="block text-xs font-bold text-blue-900 mb-1">
                                Select Municipal Department *
                              </label>
                              <select
                                value={announcementForm.department}
                                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, department: e.target.value }))}
                                className="w-full px-3 py-2 text-xs border border-blue-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                <option value="">-- Choose Department --</option>
                                {(announcementsOverview?.metrics?.departments || ["Sanitation", "Road Maintenance", "Water Department", "Electricity"]).map((dept) => (
                                  <option key={dept} value={dept}>{dept}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Conditional Specific User Dropdown */}
                          {announcementForm.audience === "specific_user" && (
                            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl">
                              <label className="block text-xs font-bold text-blue-900 mb-1">
                                Select Recipient User *
                              </label>
                              <select
                                value={announcementForm.user_id}
                                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, user_id: e.target.value }))}
                                className="w-full px-3 py-2 text-xs border border-blue-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                <option value="">-- Choose Registered Citizen or Worker --</option>
                                {allUsers.filter((u) => u.is_active).map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.role}) - {u.email}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Message Body */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Message Content *
                            </label>
                            <textarea
                              rows={5}
                              required
                              placeholder="Provide detailed information regarding the civic notice, scheduled timings, affected zones, and instructions..."
                              value={announcementForm.message}
                              onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, message: e.target.value }))}
                              className="w-full p-3.5 text-xs border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                              maxLength={2000}
                            />
                            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                              <span>Clear instructions prevent citizen inquiries and duplicate complaints.</span>
                              <span>{announcementForm.message.length}/2000</span>
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setAnnouncementForm({
                                title: "",
                                message: "",
                                category: "General",
                                priority: "Normal",
                                audience: "all_citizens",
                                department: "",
                                user_id: "",
                              })}
                              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                            >
                              Reset
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (!announcementForm.title.trim()) {
                                  showToast("Please provide an announcement title.", "error");
                                  return;
                                }
                                if (!announcementForm.message.trim()) {
                                  showToast("Please provide an announcement message.", "error");
                                  return;
                                }
                                setShowSendConfirmModal(true);
                              }}
                              className={`px-6 py-2.5 rounded-xl text-xs font-black text-white transition flex items-center gap-2 shadow-sm ${
                                announcementForm.priority === "Emergency"
                                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                              }`}
                            >
                              <Megaphone className="w-4 h-4" />
                              <span>Preview &amp; Send Broadcast</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Live Preview & Reach Counter */}
                      <div className="space-y-4">
                        {/* Live Reach Box */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Calculated Audience Reach
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">
                              {audiencePreviewLoading ? "..." : audiencePreview.recipient_count}
                            </span>
                            <span className="text-xs font-bold text-slate-500">Recipients</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {audiencePreview.audience_label}
                          </p>

                          {audiencePreview.sample_recipients && audiencePreview.sample_recipients.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                                Sample Recipients
                              </span>
                              <div className="space-y-1.5">
                                {audiencePreview.sample_recipients.slice(0, 3).map((r) => (
                                  <div key={r.id} className="text-[11px] text-slate-600 flex items-center justify-between">
                                    <span className="font-semibold text-slate-800">{r.name}</span>
                                    <span className="text-[10px] text-slate-400 uppercase">{r.role}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Recipient View Simulation */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                            Recipient Notification Bell View
                          </span>

                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                <Megaphone className="w-3 h-3" /> Announcement
                              </span>
                              <span className="text-[10px] text-slate-400">Just now</span>
                            </div>

                            <div className="font-bold text-slate-900 text-xs">
                              {announcementForm.title.trim()
                                ? `[${announcementForm.priority} • ${announcementForm.category}] ${announcementForm.title}`
                                : "[Normal • General] Announcement Headline"}
                            </div>

                            <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                              {announcementForm.message.trim() || "The announcement body text will render here inside the citizen or worker notification dropdown."}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2 text-center">
                            Rendered using NotificationBell component
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================================ */}
                {/* 3. BROADCAST HISTORY TAB */}
                {/* ============================================================ */}
                {announcementsTab === "history" && (
                  <div className="space-y-6">
                    {/* Controls Bar */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="relative flex-1 max-w-sm">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search broadcasts by title, message, ref..."
                            value={announcementSearch}
                            onChange={(e) => setAnnouncementSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                          />
                        </div>

                        <select
                          value={announcementPriorityFilter}
                          onChange={(e) => setAnnouncementPriorityFilter(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="All">All Priorities</option>
                          <option value="Normal">Normal</option>
                          <option value="Important">Important</option>
                          <option value="Urgent">Urgent</option>
                          <option value="Emergency">Emergency</option>
                        </select>

                        <select
                          value={announcementCategoryFilter}
                          onChange={(e) => setAnnouncementCategoryFilter(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="All">All Categories</option>
                          <option value="General">General</option>
                          <option value="Infrastructure">Infrastructure</option>
                          <option value="Traffic">Traffic</option>
                          <option value="Water">Water</option>
                          <option value="Electricity">Electricity</option>
                          <option value="Sanitation">Sanitation</option>
                          <option value="Public Safety">Public Safety</option>
                          <option value="Emergency">Emergency</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={announcementSort}
                          onChange={(e) => setAnnouncementSort(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="recipients">Most Recipients</option>
                          <option value="read_rate">Highest Read Rate</option>
                        </select>
                      </div>
                    </div>

                    {/* History Table */}
                    {filteredAnnouncements.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
                        <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="font-extrabold text-slate-900 text-sm">No announcements match search criteria</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Adjust your filters or dispatch a new municipal notice.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                <th className="py-3.5 px-4">Broadcast ID</th>
                                <th className="py-3.5 px-4">Title &amp; Priority</th>
                                <th className="py-3.5 px-3">Category</th>
                                <th className="py-3.5 px-4">Target Audience</th>
                                <th className="py-3.5 px-3 text-center">Recipients</th>
                                <th className="py-3.5 px-4">Read Rate</th>
                                <th className="py-3.5 px-3">Date Sent</th>
                                <th className="py-3.5 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {filteredAnnouncements.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/70 transition">
                                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-[11px]">
                                    {item.id}
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-slate-900 max-w-xs truncate">{item.title}</div>
                                    <div className="mt-1">{renderPriorityBadge(item.priority)}</div>
                                  </td>

                                  <td className="py-3.5 px-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                      {item.category}
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-4 text-slate-700 font-semibold text-xs">
                                    {item.audience}
                                  </td>

                                  <td className="py-3.5 px-3 text-center font-black text-slate-900">
                                    {item.total_recipients}
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <div className="w-28 space-y-1">
                                      <div className="flex justify-between text-[10px]">
                                        <span className="font-bold text-slate-700">{item.read_percentage}%</span>
                                        <span className="text-slate-400">{item.read_count}/{item.total_recipients}</span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-blue-600 rounded-full"
                                          style={{ width: `${Math.min(100, Math.max(5, item.read_percentage))}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-3.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                                    {item.sent_at ? new Date(item.sent_at).toLocaleDateString() : "N/A"}
                                  </td>

                                  <td className="py-3.5 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAnnouncementDetails(item.id)}
                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs"
                                        title="View Recipient Delivery Stats"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDuplicateAnnouncement(item)}
                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs"
                                        title="Reuse Template"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setAnnouncementToDelete(item)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs"
                                        title="Delete Broadcast Records"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


            {activeNav === "profile" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <UserRound className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Admin Account & Profile Center
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Manage your administrator identity, contact information, credentials, and municipal governance access.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {!profileEditing ? (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileForm({
                            name: user?.name || "",
                            phone: user?.phone || "",
                          });
                          setProfileEditing(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setProfileEditing(false)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
                      >
                        Cancel Editing
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Change Password
                    </button>
                  </div>
                </div>

                {/* Profile Grid: Left (Avatar & Identity) / Right (Personal Details & Edit) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Avatar & Municipal Identity */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col items-center text-center space-y-4">
                    {/* Avatar Display & Upload Area */}
                    <div className="relative group">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Photo Preview"
                          className="w-28 h-28 rounded-3xl object-cover border-4 border-blue-500 shadow-md ring-4 ring-blue-50"
                        />
                      ) : user?.profile_image_url ? (
                        <img
                          src={user.profile_image_url}
                          alt={user.name || "Admin"}
                          className="w-28 h-28 rounded-3xl object-cover border-4 border-white shadow-md ring-4 ring-slate-100"
                        />
                      ) : (
                        <div className="w-28 h-28 rounded-3xl bg-linear-to-tr from-slate-900 via-blue-900 to-blue-700 text-white font-black text-3xl flex items-center justify-center shadow-md ring-4 ring-slate-100">
                          {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                        </div>
                      )}

                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={photoInputRef}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </div>

                    {/* Photo Action Controls */}
                    {photoPreview ? (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleConfirmPhotoUpload}
                          disabled={photoUploading}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
                        >
                          {photoUploading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" /> Save Photo
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelPhotoPreview}
                          disabled={photoUploading}
                          className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={photoUploading}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {user?.profile_image_url ? "Change Photo" : "Upload Photo"}
                        </button>
                        {user?.profile_image_url && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            disabled={photoUploading}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                            title="Remove Profile Photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Admin Identity Headings */}
                    <div className="pt-2">
                      <h2 className="text-lg font-black text-slate-900">{user?.name || "Administrator"}</h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{user?.email}</p>
                    </div>

                    {/* Status & Role Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-lg border border-blue-200">
                        Super Administrator
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active & Operational
                      </span>
                    </div>

                    {/* Municipal Governance Scope */}
                    <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2.5 text-xs text-slate-600 mt-2">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Municipal Governance Scope
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Organization:</span>
                        <span className="font-bold text-slate-800">Smart City Municipal Corp</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Authority:</span>
                        <span className="font-bold text-slate-800">Full System Administration</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Jurisdiction:</span>
                        <span className="font-bold text-slate-800">Citywide Metropolitan Grid</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Personal Details & Edit Section */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base">
                          {profileEditing ? "Edit Administrator Information" : "Personal & Administrative Profile"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {profileEditing
                            ? "Update your profile details. Changes directly update your user record in the database."
                            : "Verified personal credentials and municipal administrative assignments."}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                        {profileEditing ? "Editing Mode" : "Read-Only View"}
                      </span>
                    </div>

                    {/* View Mode */}
                    {!profileEditing ? (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Full Name</span>
                            <span className="text-sm font-extrabold text-slate-900 mt-1 block">
                              {user?.name || "Administrator"}
                            </span>
                          </div>

                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Email</span>
                              <Lock className="w-3 h-3 text-slate-400" />
                            </div>
                            <span className="text-sm font-extrabold text-slate-900 mt-1 block truncate">
                              {user?.email}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">Official login credential</span>
                          </div>

                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Official Phone</span>
                            <span className="text-sm font-extrabold text-slate-900 mt-1 block">
                              {user?.phone || "Not on record"}
                            </span>
                          </div>

                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Official Designation</span>
                            <span className="text-sm font-extrabold text-blue-700 mt-1 block">
                              {adminProfile?.designation || "Super Administrator / Municipal Operations Controller"}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Department & Division
                          </span>
                          <span className="text-sm font-extrabold text-slate-800 block">
                            {adminProfile?.department || "Municipal Administration & Governance - Public Works & Civic Amenities"}
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed pt-1">
                            Responsible for citywide citizen grievance dispatch, municipal worker allocation, emergency complaint escalation, and public infrastructure status tracking.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Edit Mode Form */
                      <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                          <input
                            type="text"
                            required
                            value={profileForm.name}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Administrator Full Name"
                            className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Contact Phone
                            </label>
                            <input
                              type="tel"
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                              placeholder="+91 98765 43210"
                              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                              Primary Email
                              <Lock className="w-3 h-3 text-slate-400" />
                            </label>
                            <input
                              type="email"
                              disabled
                              value={user?.email || ""}
                              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              Email cannot be changed directly for administrative security.
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs text-blue-800 space-y-1">
                          <span className="font-bold flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-blue-600" />
                            Database Persistence Notice
                          </span>
                          <p className="text-[11px] leading-relaxed text-blue-900/80">
                            Updating your name or phone number immediately executes an authenticated update to the real <code>users</code> database record.
                          </p>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => setProfileEditing(false)}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={profileSaving}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                          >
                            {profileSaving ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" /> Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Account Security & Credentials */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base">Account Security & Credentials</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Cryptographic session integrity and security parameters.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Password Card */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Password Security</span>
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="text-xs font-extrabold text-slate-800 mt-2 block">
                          Cryptographically Hashed
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Protected with secure one-way hash algorithm.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPasswordModal(true)}
                        className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                        Change Password
                      </button>
                    </div>

                    {/* Account Lifecycle Card */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Account Identity</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-2 block">
                          ID: <span className="font-mono text-[11px] text-slate-600">{user?.id?.slice(0, 16)}...</span>
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Created: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Active Record"}
                        </p>
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1 text-center">
                        Verified Administrative Authority
                      </div>
                    </div>

                    {/* Session & Access Protection Card */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Access Protocol</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-2 block">
                          Bearer JWT Authentication
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Authenticated session with role-based claim verification.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 transition flex items-center justify-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out Session
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* VIEW: MUNICIPAL ADMINISTRATION SETTINGS CENTER */}
            {/* ============================================================ */}
            {activeNav === "settings" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
                      <Settings className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          Municipal Administration Settings Center
                        </h1>
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                          Live Connected
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Operational standards, category taxonomy, gamification rules, field staff governance, security credentials, and live database audit streams.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => loadSettingsData()}
                      disabled={settingsLoading}
                      className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${settingsLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Two-Column Responsive Layout: Sidebar Nav + Settings Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                  {/* Left-Side Settings Navigation Bar */}
                  <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-3 shadow-xs">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 pt-2 pb-2">
                      Settings Domains
                    </p>
                    <div className="space-y-1">
                      {[
                        { id: "general", label: "General", icon: Landmark, badge: "Standards" },
                        { id: "complaints", label: "Complaint Settings", icon: ClipboardList, badge: "Enforced" },
                        { id: "categories", label: "Categories", icon: Folder, badge: `${settingsCategories.length} Active` },
                        { id: "notifications", label: "Notifications", icon: Bell, badge: "Channels" },
                        { id: "rewards", label: "Rewards & Gamification", icon: Award, badge: "Engine" },
                        { id: "community", label: "Community", icon: Users, badge: "Verified" },
                        { id: "workers", label: "Worker Settings", icon: Wrench, badge: "Governance" },
                        { id: "escalation", label: "Escalation Rules", icon: Clock3, badge: "Triage" },
                        { id: "security", label: "Security", icon: ShieldCheck, badge: "Protected" },
                        { id: "branding", label: "Branding", icon: Sparkles, badge: "Emblem" },
                        { id: "maintenance", label: "Maintenance", icon: HardDrive, badge: "Operational" },
                        { id: "audit", label: "Audit / Activity", icon: History, badge: `${auditActivities.length} Logs` },
                      ].map((sec) => {
                        const Icon = sec.icon;
                        const isActive = settingsTab === sec.id;
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => setSettingsTab(sec.id)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left ${
                              isActive
                                ? "bg-slate-900 text-white shadow-xs"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                              <span className="truncate">{sec.label}</span>
                            </div>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {sec.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Database & Schema Integrity Card */}
                    <div className="mt-4 pt-3 border-t border-slate-100 px-3 text-[11px] text-slate-500 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span>Database Status:</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Connected
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Categories Storage:</span>
                        <span className="font-semibold text-slate-700">Supabase Table</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Audit Stream:</span>
                        <span className="font-semibold text-slate-700">Relational DB</span>
                      </div>
                    </div>
                  </div>

                  {/* Main Settings Content Workspace */}
                  <div className="lg:col-span-3 space-y-6">

                    {/* 1. GENERAL TAB */}
                    {settingsTab === "general" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                          <div>
                            <h2 className="text-lg font-black text-slate-900">General Municipal Standards</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Core municipal authority identity, portal contact points, and baseline operational SLAs.
                            </p>
                          </div>

                          <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-3">
                            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-800 leading-relaxed">
                              <strong>System-Level Runtime Standards:</strong> These core parameters govern portal branding and default triage rules. Stored in application runtime configuration. Database schema consolidation for dynamic key-value settings is scheduled for post-v10 infrastructure.
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Municipal Entity</span>
                              <div className="text-sm font-bold text-slate-900">
                                {settingsOverview?.portal_info?.municipality || "Smart City Municipal Corporation"}
                              </div>
                              <span className="text-[10px] text-slate-500 block">Civic Urban Local Body (ULB)</span>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Portal Title</span>
                              <div className="text-sm font-bold text-slate-900">
                                {settingsOverview?.portal_info?.name || "Smart City Grievance & Municipal Services Portal"}
                              </div>
                              <span className="text-[10px] text-slate-500 block">Official Citizen Grievance Gateway</span>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Citizen Support Email</span>
                              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                {settingsOverview?.portal_info?.contact_email || "support@smartcity.gov.in"}
                              </div>
                              <span className="text-[10px] text-slate-500 block">Public grievance correspondence</span>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Toll-Free Helpline</span>
                              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {settingsOverview?.portal_info?.helpline_phone || "1800-123-4567 (Toll Free, 24x7)"}
                              </div>
                              <span className="text-[10px] text-slate-500 block">Central civic call center</span>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Services Line</span>
                              <div className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-rose-500" />
                                {settingsOverview?.portal_info?.emergency_phone || "112 / 101 / 102"}
                              </div>
                              <span className="text-[10px] text-slate-500 block">Police, Fire, and Ambulance dispatch</span>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Default Grievance SLA</span>
                              <div className="text-sm font-bold text-slate-900">
                                {settingsOverview?.portal_info?.default_sla_hours || 48} Hours (Priority-Weighted)
                              </div>
                              <span className="text-[10px] text-slate-500 block">Standard resolution turnaround</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. COMPLAINT SETTINGS TAB */}
                    {settingsTab === "complaints" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                          <div>
                            <h2 className="text-lg font-black text-slate-900">Complaint Lifecycle &amp; Triage Rules</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Enforced operational policies governing citizen grievance submissions, transitions, and evidence.
                            </p>
                          </div>

                          <div className="space-y-3">
                            <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Mandatory Geolocation &amp; Address</span>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">Enforced</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  Every complaint filing requires GPS coordinates (latitude, longitude) and reverse-geocoded physical address to ensure accurate municipal field dispatch.
                                </p>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            </div>

                            <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Strict Lifecycle Status Progression</span>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">Enforced</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  Complaints follow a strict state machine: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">pending → in_progress → resolved → closed</code>. Invalid transitions are rejected at the API boundary.
                                </p>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            </div>

                            <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">State Transition Audit Logging</span>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">Enforced</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  All status changes, worker reassignments, and administrative verification remarks are permanently logged to the <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">complaint_status_history</code> table.
                                </p>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            </div>

                            <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Administrative Resolution Verification</span>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">Enforced</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  Resolved complaints require municipal administrative verification before transitioning to closed status, safeguarding civic service quality.
                                </p>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            </div>

                            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Anonymous Grievance Filing</span>
                                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-black uppercase rounded-full">Disabled</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  Disabled by design. Authenticated citizen accounts are required to maintain civic accountability, prevent spam, and award reward points.
                                </p>
                              </div>
                              <ShieldCheck className="w-5 h-5 text-slate-500 shrink-0" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. CATEGORIES TAB (REAL DATABASE PERSISTENCE) */}
                    {settingsTab === "categories" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-slate-900">Municipal Complaint Categories</h2>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  DB Persisted
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Managed directly in the live Supabase <code className="font-mono text-slate-700">categories</code> table. Controls available options when citizens report issues.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleOpenAddCategory}
                              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 self-start sm:self-auto"
                            >
                              <Plus className="w-4 h-4" /> Add Category
                            </button>
                          </div>

                          {/* Quick KPI Stats */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Total Categories</span>
                              <span className="text-xl font-black text-slate-900">{settingsCategories.length}</span>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                              <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-0.5">Active</span>
                              <span className="text-xl font-black text-emerald-800">
                                {settingsCategories.filter((c) => c.is_active).length}
                              </span>
                            </div>
                            <div className="p-3 bg-slate-100/70 rounded-2xl border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Inactive</span>
                              <span className="text-xl font-black text-slate-700">
                                {settingsCategories.filter((c) => !c.is_active).length}
                              </span>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                              <span className="text-[10px] font-bold text-blue-700 uppercase block mb-0.5">Linked Complaints</span>
                              <span className="text-xl font-black text-blue-900">
                                {settingsCategories.reduce((acc, c) => acc + (c.complaint_count || 0), 0)}
                              </span>
                            </div>
                          </div>

                          {/* Filter & Search Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
                              {["all", "active", "inactive"].map((f) => (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() => setSettingsCategoryFilter(f)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                                    settingsCategoryFilter === f
                                      ? "bg-white text-slate-900 shadow-xs"
                                      : "text-slate-500 hover:text-slate-800"
                                  }`}
                                >
                                  {f === "all" ? "All Categories" : f}
                                </button>
                              ))}
                            </div>

                            <div className="relative w-full sm:w-64">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                placeholder="Search categories..."
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                              />
                            </div>
                          </div>

                          {/* Categories List */}
                          {filteredCategories.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs">
                              No categories found matching your query.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              {filteredCategories.map((cat) => (
                                <div
                                  key={cat.id}
                                  className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col justify-between gap-3 hover:border-slate-300 transition"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                                          <Folder className="w-4 h-4 text-slate-600" />
                                        </div>
                                        <div>
                                          <h3 className="font-bold text-slate-900 text-xs sm:text-sm">{cat.name}</h3>
                                          <span className="text-[10px] text-slate-400 font-mono">ID: {cat.id?.slice(0, 8)}...</span>
                                        </div>
                                      </div>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                          cat.is_active
                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                            : "bg-slate-200 text-slate-600 border border-slate-300"
                                        }`}
                                      >
                                        {cat.is_active ? "Active" : "Inactive"}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                                      {cat.description || "No description provided."}
                                    </p>
                                  </div>

                                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                                      {cat.complaint_count || 0} complaints
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleCategoryActive(cat)}
                                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                                          cat.is_active
                                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                        }`}
                                      >
                                        {cat.is_active ? "Deactivate" : "Activate"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditCategory(cat)}
                                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
                                        title="Edit Category"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 4. NOTIFICATIONS TAB */}
                    {settingsTab === "notifications" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h2 className="text-lg font-black text-slate-900">Notification Alerting Channels</h2>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Active municipal broadcast dispatchers and automated complaint event notification triggers.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveNav("announcements")}
                              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                            >
                              <Megaphone className="w-3.5 h-3.5" /> Open Broadcasts Console
                            </button>
                          </div>

                          {/* Live Metrics */}
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl">
                              <span className="text-[10px] font-bold text-blue-700 uppercase block mb-0.5">Total Delivered</span>
                              <span className="text-xl font-black text-blue-900">
                                {settingsOverview?.notification_summary?.total || 0}
                              </span>
                            </div>
                            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                              <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-0.5">Read Notifications</span>
                              <span className="text-xl font-black text-emerald-800">
                                {settingsOverview?.notification_summary?.read || 0}
                              </span>
                            </div>
                            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl">
                              <span className="text-[10px] font-bold text-amber-700 uppercase block mb-0.5">Unread Notifications</span>
                              <span className="text-xl font-black text-amber-800">
                                {settingsOverview?.notification_summary?.unread || 0}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {[
                              {
                                title: "Municipal Broadcast Dispatcher",
                                desc: "Bulk announcements dispatched to citizens or field workers with multi-tier priority tags (Emergency, Urgent, Important, Normal).",
                                status: "Active (DB Persisted)",
                                channel: "notifications table (type=announcement)",
                              },
                              {
                                title: "Complaint Lifecycle Triggers",
                                desc: "Automated alerts dispatched to citizens whenever their complaint transitions (Submitted, Assigned, In Progress, Resolved).",
                                status: "Active (Automated)",
                                channel: "notifications table (type=status_change)",
                              },
                              {
                                title: "Field Worker Assignment Alerts",
                                desc: "Real-time dispatch alert received by municipal staff when a task is assigned to their worker ID.",
                                status: "Active (Automated)",
                                channel: "notifications table (type=assignment)",
                              },
                              {
                                title: "Civic Rewards & Badges Alerts",
                                desc: "Congratulatory notifications whenever a citizen earns civic points or unlocks a milestone badge.",
                                status: "Active (Automated)",
                                channel: "notifications table (type=reward)",
                              },
                            ].map((ch, idx) => (
                              <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{ch.title}</span>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">
                                      {ch.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600">{ch.desc}</p>
                                  <span className="text-[11px] text-slate-400 font-mono block">Delivery: {ch.channel}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5. REWARDS & GAMIFICATION TAB */}
                    {settingsTab === "rewards" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h2 className="text-lg font-black text-slate-900">Civic Gamification &amp; Rewards Engine</h2>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Manages civic point incentives, tier milestones, catalog redemptions, and citizen leaderboard.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveNav("rewards")}
                              className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                            >
                              <Award className="w-3.5 h-3.5" /> Open Rewards Center
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-sm">Civic Points Ledger</span>
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black uppercase rounded-full">Active</span>
                              </div>
                              <p className="text-xs text-slate-600">
                                Real-time ledger entries recorded in Supabase <code className="bg-white px-1 py-0.5 rounded border border-purple-200 font-mono text-[10px]">rewards</code> table. Standard: +50 pts (Verified Resolution), +10 pts (Civic Upvote), +5 pts (Community Comment).
                              </p>
                            </div>

                            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-sm">Citizen Leaderboard</span>
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black uppercase rounded-full">Active</span>
                              </div>
                              <p className="text-xs text-slate-600">
                                Dynamic ranking computed directly from cumulative points in the relational ledger, encouraging active civic participation.
                              </p>
                            </div>

                            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-sm">Civic Badges System</span>
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black uppercase rounded-full">6 Milestone Tiers</span>
                              </div>
                              <p className="text-xs text-slate-600">
                                Automatic unlock milestones: First Step (1 complaint), Neighborhood Watch (5), Civic Guardian (10), Community Champion (25), Eco Warrior (Sanitation), Municipal Hero (50).
                              </p>
                            </div>

                            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-sm">Municipal Rewards Catalog</span>
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black uppercase rounded-full">6 Incentives</span>
                              </div>
                              <p className="text-xs text-slate-600">
                                Municipal transit passes, property tax discounts, solar subsidies, and public parking vouchers manageable from the Admin Rewards console.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 6. COMMUNITY TAB */}
                    {settingsTab === "community" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                          <div>
                            <h2 className="text-lg font-black text-slate-900">Civic Community &amp; Public Engagement</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Enforced social collaboration, community discussion, and citizen verification safeguards.
                            </p>
                          </div>

                          <div className="space-y-3">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Civic Discussion &amp; Comments</span>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">Active</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  Citizens can post constructive observations and updates on neighborhood complaints. Persisted in <code className="font-mono text-slate-700">complaint_comments</code>.
                                </p>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Complaint Upvoting &amp; Support</span>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">Active</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  Neighbors can support complaints to escalate visibility. Prevented from double-voting by composite primary key constraint in <code className="font-mono text-slate-700">complaint_supports</code>.
                                </p>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Citizen Feedback &amp; Verification</span>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">Active</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  Citizens rate resolution quality (Satisfied, Neutral, Unsatisfied) after work completion. Persisted in <code className="font-mono text-slate-700">complaint_feedback</code>.
                                </p>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 7. WORKER SETTINGS TAB */}
                    {settingsTab === "workers" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h2 className="text-lg font-black text-slate-900">Field Staff &amp; Department Governance</h2>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Operational rules governing municipal field workers and department task routing.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveNav("workers")}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                            >
                              <Wrench className="w-3.5 h-3.5" /> Manage Workers
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Worker Availability Management</span>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">Enforced</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  Field worker duty availability toggles live in <code className="font-mono text-slate-700">workers.is_available</code> to prevent assigning tasks to off-duty personnel.
                                </p>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Department Task Allocation</span>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">Enforced</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  Staff are partitioned by municipal division (<code className="font-mono text-slate-700">workers.department</code>) including Roads, Water, Sanitation, and Electricity.
                                </p>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            </div>

                            <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Work-Completion Evidence Requirement</span>
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-full">Complaint #10 Scope</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  Mandatory photographic evidence and resolution notes before workers can resolve grievances will be introduced in Complaint #10.
                                </p>
                              </div>
                              <Clock3 className="w-5 h-5 text-amber-600 shrink-0" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 8. ESCALATION RULES TAB */}
                    {settingsTab === "escalation" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                          <div>
                            <h2 className="text-lg font-black text-slate-900">SLA Targets &amp; Escalation Thresholds</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Municipal service-level targets for public grievance resolution across priority tiers.
                            </p>
                          </div>

                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-800 leading-relaxed">
                              <strong>Operational Notice:</strong> Automatic escalation scheduler is not currently configured. Complaint prioritization is currently monitored via manual administrative triage and Priority tagging (Emergency, High, Medium, Low). Background cron-based auto-escalation requires a dedicated queue worker scheduled in post-v10 infrastructure.
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">Emergency Priority</span>
                              <div className="text-2xl font-black text-rose-900">6 Hours</div>
                              <p className="text-xs text-slate-600">Gas leaks, collapsed live wires, major water main bursts, severe road cave-ins.</p>
                            </div>

                            <div className="p-4 bg-orange-50/60 border border-orange-100 rounded-2xl space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 block">High Priority</span>
                              <div className="text-2xl font-black text-orange-900">24 Hours</div>
                              <p className="text-xs text-slate-600">Traffic signal failures, open manholes, sewage overflow in residential areas.</p>
                            </div>

                            <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">Medium Priority</span>
                              <div className="text-2xl font-black text-amber-900">48 Hours</div>
                              <p className="text-xs text-slate-600">Potholes, street light outage clusters, uncollected public waste bins.</p>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">Low Priority</span>
                              <div className="text-2xl font-black text-slate-900">72 Hours</div>
                              <p className="text-xs text-slate-600">Tree branch pruning, faded road markings, cosmetic sidewalk repairs.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 9. SECURITY TAB */}
                    {settingsTab === "security" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                          <div>
                            <h2 className="text-lg font-black text-slate-900">Admin Identity &amp; Credential Security</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Manage administrator authentication credentials, session security, and access tokens.
                            </p>
                          </div>

                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                            <span className="font-bold text-slate-900 block text-sm">Authenticated Admin Identity</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Name</span>
                                <span className="font-semibold text-slate-900">{user?.name || "Administrator"}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Email Address</span>
                                <span className="font-semibold text-slate-900">{user?.email || "admin@smartcity.gov.in"}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Role &amp; Status</span>
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Role: Admin (Active)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Safe Password Change Form */}
                          <div className="p-5 border border-slate-200 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2">
                              <KeyRound className="w-4 h-4 text-slate-700" />
                              <h3 className="font-bold text-slate-900 text-sm">Change Admin Password</h3>
                            </div>
                            <form onSubmit={handleSettingsChangePassword} className="space-y-3 max-w-md">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Current Password</label>
                                <input
                                  type="password"
                                  value={secCurrentPassword}
                                  onChange={(e) => setSecCurrentPassword(e.target.value)}
                                  placeholder="Enter current password"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">New Password (min 6 chars)</label>
                                <input
                                  type="password"
                                  value={secNewPassword}
                                  onChange={(e) => setSecNewPassword(e.target.value)}
                                  placeholder="Enter new password"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Confirm New Password</label>
                                <input
                                  type="password"
                                  value={secConfirmPassword}
                                  onChange={(e) => setSecConfirmPassword(e.target.value)}
                                  placeholder="Confirm new password"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={secPasswordLoading}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                              >
                                {secPasswordLoading ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating...
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5" /> Update Password
                                  </>
                                )}
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 10. BRANDING TAB */}
                    {settingsTab === "branding" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                          <div>
                            <h2 className="text-lg font-black text-slate-900">Municipal Branding &amp; Visual Identity</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Current municipal coat of arms, typography standards, and interface theme palette.
                            </p>
                          </div>

                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                            <img
                              src="/assets/smart-city-logo.png"
                              alt="Municipal Emblem"
                              className="w-16 h-16 object-contain rounded-2xl bg-white p-2 border border-slate-200 shrink-0"
                            />
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">Smart City Municipal Emblem</h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Compiled static asset: <code className="font-mono text-slate-700 text-[11px]">/assets/smart-city-logo.png</code>
                              </p>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">
                                Core Application Bundle
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 text-xs text-slate-600">
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                              <span className="font-bold text-slate-700">Interface Color Scheme</span>
                              <span className="font-medium text-slate-900">Slate &amp; Municipal Indigo</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                              <span className="font-bold text-slate-700">Typography Scale</span>
                              <span className="font-medium text-slate-900">Inter / System Sans-Serif</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                              <span className="font-bold text-slate-700">Dynamic Asset Uploads</span>
                              <span className="font-medium text-slate-500">Disabled (Static Bundle Integrity)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 11. MAINTENANCE TAB */}
                    {settingsTab === "maintenance" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                          <div>
                            <h2 className="text-lg font-black text-slate-900">Platform Maintenance &amp; Health</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Cloud infrastructure operational mode, database connectivity, and deployment health.
                            </p>
                          </div>

                          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                                <span className="font-black text-emerald-900 text-sm">All Municipal Services Operational</span>
                              </div>
                              <p className="text-xs text-emerald-700">
                                API Gateway, Supabase Relational Cluster, Storage Buckets, and Notification Dispatchers are healthy.
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-emerald-200/80 text-emerald-900 font-bold text-xs rounded-xl shrink-0">
                              Operational
                            </span>
                          </div>

                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                            <div className="font-bold text-slate-800">Infrastructure Governance:</div>
                            <p className="text-slate-600 leading-relaxed">
                              Platform maintenance windows and zero-downtime rolling updates are managed at the cloud infrastructure/reverse-proxy layer (Render Web Services &amp; Supabase Cloud). In-app maintenance switches are intentionally disabled to prevent accidental administrative lockout.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 12. AUDIT / ACTIVITY TAB (REAL RELATIONAL DATA) */}
                    {settingsTab === "audit" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-slate-900">Municipal Operational Audit Stream</h2>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  Live DB Logs
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Chronological audit stream compiled directly from relational tables: <code className="font-mono text-slate-700">complaint_status_history</code>, <code className="font-mono text-slate-700">notifications</code>, and <code className="font-mono text-slate-700">rewards</code>.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => loadSettingsData()}
                              disabled={settingsLoading}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${settingsLoading ? "animate-spin" : ""}`} /> Refresh Stream
                            </button>
                          </div>

                          {/* Filter Tabs */}
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
                            {[
                              { id: "all", label: "All Activities" },
                              { id: "complaint", label: "Complaint Lifecycle" },
                              { id: "announcement", label: "Broadcast Announcements" },
                              { id: "reward", label: "Civic Rewards" },
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setAuditFilter(tab.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                                  auditFilter === tab.id
                                    ? "bg-white text-slate-900 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* Activity Items List */}
                          {filteredAuditActivities.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs">
                              No activity records found in this category.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {filteredAuditActivities.map((act) => (
                                <div
                                  key={act.id}
                                  className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                >
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                          act.type === "complaint"
                                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                                            : act.type === "announcement"
                                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                                            : "bg-purple-100 text-purple-800 border border-purple-200"
                                        }`}
                                      >
                                        {act.source_badge}
                                      </span>
                                      <span className="font-bold text-slate-900">{act.title}</span>
                                    </div>
                                    <p className="text-slate-600">{act.description}</p>
                                    <span className="text-[10px] text-slate-400 font-mono block">
                                      Table: <strong className="text-slate-600">{act.source_table}</strong>
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 shrink-0 font-medium self-end sm:self-center">
                                    {act.created_at ? new Date(act.created_at).toLocaleString() : "N/A"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

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

              {/* Work Completion Evidence Review Card */}
              {complaintEvidence?.photo_url && (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                          Work Completion Evidence Review
                        </h4>
                        <p className="text-xs text-slate-500">
                          Field evidence submitted by {complaintEvidence.worker_name || "Assigned Worker"} (#{complaintEvidence.worker_code || "W"})
                        </p>
                      </div>
                    </div>

                    {selectedComplaint.status === "Verified" ? (
                      <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-full border border-purple-200 flex items-center gap-1.5 shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                        Verified & Approved
                      </span>
                    ) : selectedComplaint.status === "Resolved" ? (
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 font-bold text-xs rounded-full border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Awaiting Municipal Verification
                      </span>
                    ) : complaintEvidence.rework_reason ? (
                      <span className="px-3 py-1 bg-rose-50 text-rose-700 font-bold text-xs rounded-full border border-rose-200 flex items-center gap-1.5 shadow-2xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Rework Requested
                      </span>
                    ) : null}
                  </div>

                  {/* Before & After Photo Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Before (Citizen Initial Report)
                      </span>
                      <img
                        src={
                          selectedComplaint.photo_url ||
                          getFallbackImage(selectedComplaint.categories?.name, selectedComplaint.title)
                        }
                        alt="Before Work"
                        className="w-full h-48 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1.5">
                        After (Worker Completion Evidence)
                      </span>
                      <img
                        src={complaintEvidence.photo_url}
                        alt="After Completion Evidence"
                        className="w-full h-48 rounded-2xl object-cover border-2 border-emerald-400 shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">
                        Work Performed On-Site
                      </span>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {complaintEvidence.work_performed || "Repairs completed on site."}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">
                        Worker Completion Remarks
                      </span>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {complaintEvidence.completion_remarks || "No additional remarks provided."}
                      </p>
                    </div>
                  </div>

                  {/* Rework Reason notice if present */}
                  {complaintEvidence.rework_reason && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-700">
                      <strong>Current Rework Instruction:</strong> {complaintEvidence.rework_reason}
                    </div>
                  )}

                  {/* Verification Action Controls */}
                  {selectedComplaint.status === "Resolved" && (
                    <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        Inspect the evidence photos and work description before granting municipal verification.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setReworkModalOpen(true)}
                          disabled={verifyingEvidence}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Request Rework
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyCompletionEvidence(selectedComplaint.id, "approve")}
                          disabled={verifyingEvidence}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {verifyingEvidence ? "Verifying..." : "Approve & Verify Work"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* REQUEST REWORK MODAL */}
              {reworkModalOpen && (
                <div
                  className="fixed inset-0 bg-slate-900/60 z-60 flex items-center justify-center p-4 backdrop-blur-2xs animate-in fade-in"
                  onClick={() => setReworkModalOpen(false)}
                >
                  <div
                    className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                        Request Field Work Rework
                      </h4>
                      <button
                        onClick={() => setReworkModalOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="py-4 space-y-3">
                      <p className="text-xs text-slate-600">
                        Please explain why the submitted completion evidence is inadequate or what further actions are needed. The complaint will be placed back into <strong>In Progress</strong> and the assigned worker will be alerted.
                      </p>
                      <textarea
                        rows={3}
                        required
                        value={reworkReason}
                        onChange={(e) => setReworkReason(e.target.value)}
                        placeholder="e.g. The pothole was only partially filled; please level and compact asphalt evenly..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-rose-500 resize-none"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setReworkModalOpen(false)}
                        className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleVerifyCompletionEvidence(selectedComplaint.id, "rework", reworkReason)
                        }
                        disabled={verifyingEvidence || !reworkReason.trim()}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                      >
                        {verifyingEvidence ? "Sending..." : "Confirm Rework Request"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

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

      {/* ============================================================ */}
      {/* MODAL: DEPARTMENT DETAILS & PERFORMANCE */}
      {/* ============================================================ */}
      {selectedDepartment && activeDepartment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {activeDepartment.name}
                    </h2>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                      {activeDepartment.code || "DEPT"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleDepartmentStatus(activeDepartment)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition ${
                        activeDepartment.is_active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${activeDepartment.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {activeDepartment.is_active ? "Active Division" : "Inactive Division"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeDepartment.head ? `Head: ${activeDepartment.head} • ` : ""}
                    {activeDepartment.contact_email ? `${activeDepartment.contact_email} • ` : ""}
                    {activeDepartment.contact_phone || "+91 22 2456 7800"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleOpenEditDepartment(activeDepartment)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDepartment(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex items-center gap-1 border-b border-slate-200 pt-2 overflow-x-auto text-xs font-bold scrollbar-none">
              {[
                { id: "overview", label: "Overview" },
                { id: "workers", label: `Workers (${activeDepartment.worker_count})` },
                { id: "complaints", label: `Complaints (${activeDepartment.total_complaints})` },
                { id: "performance", label: "Performance & Top Worker" },
                { id: "workload", label: "Workload Breakdown" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDepartmentDetailTab(tab.id)}
                  className={`px-4 py-2.5 whitespace-nowrap border-b-2 transition ${
                    departmentDetailTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content Body */}
            <div className="overflow-y-auto py-5 space-y-6 flex-1 pr-1">
              {/* TAB 1: OVERVIEW */}
              {departmentDetailTab === "overview" && (
                <div className="space-y-6">
                  {/* Quick Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Workforce</div>
                      <div className="text-xl font-black text-slate-900 mt-1">{activeDepartment.worker_count} Workers</div>
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-blue-500 uppercase">Total Complaints</div>
                      <div className="text-xl font-black text-blue-700 mt-1">{activeDepartment.total_complaints}</div>
                    </div>
                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-amber-600 uppercase">Active / In Progress</div>
                      <div className="text-xl font-black text-amber-700 mt-1">
                        {activeDepartment.in_progress_complaints + activeDepartment.pending_complaints}
                      </div>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase">Resolved Complaints</div>
                      <div className="text-xl font-black text-emerald-700 mt-1">{activeDepartment.resolved_complaints}</div>
                    </div>
                  </div>

                  {/* Resolution Rate Progress */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-slate-700">Division Resolution Efficiency</span>
                      <span className="text-blue-600 font-extrabold">{activeDepartment.resolution_rate}% Resolved</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          activeDepartment.resolution_rate >= 75
                            ? "bg-emerald-500"
                            : activeDepartment.resolution_rate >= 40
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min(100, activeDepartment.resolution_rate)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>Pending: {activeDepartment.pending_complaints}</span>
                      <span>In Progress: {activeDepartment.in_progress_complaints}</span>
                      <span>Resolved: {activeDepartment.resolved_complaints}</span>
                      <span>Rejected: {activeDepartment.rejected_complaints}</span>
                    </div>
                  </div>

                  {/* Description & Contact Profile */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Department Mandate</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {activeDepartment.description || "Official municipal division responsible for public safety, civic infrastructure, and maintenance across urban sectors."}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Contact Directory</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <UserRound className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">Head:</span> {activeDepartment.head || "Not designated"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">Email:</span> {activeDepartment.contact_email || "N/A"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">Helpline:</span> {activeDepartment.contact_phone || "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Category Distribution */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Complaint Categories Handled
                    </h4>
                    {Object.keys(activeDepartment.category_distribution || {}).length === 0 ? (
                      <p className="text-xs text-slate-400">No complaints logged yet under this department.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(activeDepartment.category_distribution).map(([catName, count]) => (
                          <div
                            key={catName}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                          >
                            <span>{catName}</span>
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px]">
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: WORKERS */}
              {departmentDetailTab === "workers" && (
                <div className="space-y-4">
                  {/* Worker Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search workers by name, code, specialization, or email..."
                      value={departmentWorkerSearch}
                      onChange={(e) => setDepartmentWorkerSearch(e.target.value)}
                      className="w-full pl-10 pr-9 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                    {departmentWorkerSearch && (
                      <button
                        type="button"
                        onClick={() => setDepartmentWorkerSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {filteredDeptWorkers.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">No workers found in this department.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Add a worker with department set to "{activeDepartment.name}" to assign workforce here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredDeptWorkers.map((w) => (
                        <div
                          key={w.id}
                          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-blue-200 transition space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-extrabold text-slate-900 text-sm">{w.name}</h4>
                                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                  {w.worker_code}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {w.specialization || "General Municipal Specialist"}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                w.is_available
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {w.is_available ? "Available" : "Busy"}
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2 bg-slate-50 rounded-xl p-2.5 text-center text-xs">
                            <div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase">Assigned</div>
                              <div className="font-bold text-slate-900 mt-0.5">{w.assigned_count}</div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase">In Prog</div>
                              <div className="font-bold text-amber-600 mt-0.5">{w.in_progress_count}</div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase">Resolved</div>
                              <div className="font-bold text-emerald-600 mt-0.5">{w.resolved_count}</div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase">Rate</div>
                              <div className="font-bold text-blue-600 mt-0.5">{w.resolution_rate}%</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {w.email || "No email on record"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenWorkerDetails(w)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              Profile <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: COMPLAINTS */}
              {departmentDetailTab === "complaints" && (
                <div className="space-y-4">
                  {/* Status Filters & Search */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                      {["All", "Pending", "In Progress", "Resolved"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setDepartmentComplaintFilter(status)}
                          className={`px-3 py-1 rounded-lg transition ${
                            departmentComplaintFilter === status
                              ? "bg-white text-blue-600 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>

                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search complaints..."
                        value={departmentComplaintSearch}
                        onChange={(e) => setDepartmentComplaintSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
                      />
                      {departmentComplaintSearch && (
                        <button
                          type="button"
                          onClick={() => setDepartmentComplaintSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Complaint List Table */}
                  {filteredDeptComplaints.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">No complaints match filter criteria.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Try resetting the status filter or search query.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                            <th className="py-2.5 px-4">Complaint</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Priority</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredDeptComplaints.slice(0, 25).map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-2.5 px-4 max-w-xs">
                                <div className="font-bold text-slate-900 truncate">{c.title}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{c.complaint_code || c.id?.slice(0, 8)}</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                {c.categories?.name || c.category_name || "General"}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    c.priority === "High" || c.priority === "Emergency"
                                      ? "bg-rose-50 text-rose-700"
                                      : c.priority === "Medium"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {c.priority || "Medium"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    c.status === "Resolved"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : c.status === "In Progress"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                                {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                              </td>
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedComplaint(c)}
                                  className="text-blue-600 hover:text-blue-800 font-bold text-xs"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredDeptComplaints.length > 25 && (
                        <div className="p-2 text-center bg-slate-50 text-[11px] text-slate-400 font-semibold border-t border-slate-100">
                          Showing top 25 of {filteredDeptComplaints.length} complaints
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PERFORMANCE & TOP WORKER */}
              {departmentDetailTab === "performance" && (
                <div className="space-y-6">
                  {/* Top Worker Spotlight Banner */}
                  {activeDepartment.top_worker ? (
                    <div className="bg-gradient-to-r from-amber-50 via-amber-100/40 to-yellow-50 border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
                            <Award className="w-8 h-8" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md">
                                Department Top Performer
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-500">
                                {activeDepartment.top_worker.worker_code}
                              </span>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mt-1">
                              {activeDepartment.top_worker.name}
                            </h3>
                            <p className="text-xs text-slate-600">
                              {activeDepartment.top_worker.specialization} • {activeDepartment.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="bg-white/80 rounded-2xl p-3 border border-amber-200 text-center min-w-[90px]">
                            <div className="text-[10px] font-bold text-amber-700 uppercase">Resolved</div>
                            <div className="text-lg font-black text-emerald-600 mt-0.5">
                              {activeDepartment.top_worker.resolved_count}
                            </div>
                          </div>
                          <div className="bg-white/80 rounded-2xl p-3 border border-amber-200 text-center min-w-[90px]">
                            <div className="text-[10px] font-bold text-amber-700 uppercase">Efficiency</div>
                            <div className="text-lg font-black text-blue-600 mt-0.5">
                              {activeDepartment.top_worker.resolution_rate}%
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenWorkerDetails(activeDepartment.top_worker)}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-amber-200/60 text-[11px] text-amber-900/70 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        Criteria: Top worker identification is computed directly from verified citizen complaint resolutions.
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
                      <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">No worker resolution records yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        As workers resolve complaints, the department's top performer will be highlighted automatically.
                      </p>
                    </div>
                  )}

                  {/* Worker Performance Leaderboard Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Workforce Performance Rankings
                      </h4>
                      <span className="text-[11px] font-medium text-slate-500">
                        {activeDepartment.workers?.length || 0} active workers evaluated
                      </span>
                    </div>

                    {(!activeDepartment.workers || activeDepartment.workers.length === 0) ? (
                      <div className="p-8 text-center text-xs text-slate-400 font-medium">
                        No workers currently assigned to {activeDepartment.name}.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                            <th className="py-2.5 px-4 text-center">Rank</th>
                            <th className="py-2.5 px-3">Worker</th>
                            <th className="py-2.5 px-3">Specialization</th>
                            <th className="py-2.5 px-3 text-center">Assigned</th>
                            <th className="py-2.5 px-3 text-center">Resolved</th>
                            <th className="py-2.5 px-3 text-center">In Progress</th>
                            <th className="py-2.5 px-4">Efficiency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {activeDepartment.workers.map((w, idx) => (
                            <tr key={w.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-2.5 px-4 text-center font-black">
                                {idx === 0 ? (
                                  <span className="inline-block w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] leading-5 font-bold">1</span>
                                ) : idx === 1 ? (
                                  <span className="inline-block w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] leading-5 font-bold">2</span>
                                ) : idx === 2 ? (
                                  <span className="inline-block w-5 h-5 rounded-full bg-amber-50 text-amber-700 text-[10px] leading-5 font-bold">3</span>
                                ) : (
                                  <span className="text-slate-400">{idx + 1}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  onClick={() => handleOpenWorkerDetails(w)}
                                  className="text-left font-bold text-slate-900 hover:text-blue-600 transition"
                                >
                                  {w.name}
                                </button>
                                <div className="text-[10px] font-mono text-slate-400">{w.worker_code}</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{w.specialization}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-900">{w.assigned_count}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{w.resolved_count}</td>
                              <td className="py-2.5 px-3 text-center font-semibold text-amber-600">{w.in_progress_count}</td>
                              <td className="py-2.5 px-4 min-w-[120px]">
                                <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                                  <span>{w.resolution_rate}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      w.resolution_rate >= 75 ? "bg-emerald-500" : w.resolution_rate >= 40 ? "bg-amber-500" : "bg-blue-500"
                                    }`}
                                    style={{ width: `${Math.min(100, w.resolution_rate)}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: WORKLOAD */}
              {departmentDetailTab === "workload" && (
                <div className="space-y-6">
                  {/* Status Breakdown Distribution */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                      Workload Status Distribution
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Pending Review</div>
                        <div className="text-lg font-black text-slate-700 mt-1">{activeDepartment.pending_complaints}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {activeDepartment.total_complaints > 0
                            ? Math.round((activeDepartment.pending_complaints / activeDepartment.total_complaints) * 100)
                            : 0}% of total
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
                        <div className="text-[10px] font-bold text-amber-700 uppercase">Under Active Repair</div>
                        <div className="text-lg font-black text-amber-700 mt-1">{activeDepartment.in_progress_complaints}</div>
                        <div className="text-[10px] text-amber-600 mt-0.5">
                          {activeDepartment.total_complaints > 0
                            ? Math.round((activeDepartment.in_progress_complaints / activeDepartment.total_complaints) * 100)
                            : 0}% of total
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                        <div className="text-[10px] font-bold text-emerald-700 uppercase">Resolved & Closed</div>
                        <div className="text-lg font-black text-emerald-700 mt-1">{activeDepartment.resolved_complaints}</div>
                        <div className="text-[10px] text-emerald-600 mt-0.5">
                          {activeDepartment.total_complaints > 0
                            ? Math.round((activeDepartment.resolved_complaints / activeDepartment.total_complaints) * 100)
                            : 0}% of total
                        </div>
                      </div>

                      <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl">
                        <div className="text-[10px] font-bold text-rose-700 uppercase">Rejected / Duplicate</div>
                        <div className="text-lg font-black text-rose-700 mt-1">{activeDepartment.rejected_complaints}</div>
                        <div className="text-[10px] text-rose-600 mt-0.5">
                          {activeDepartment.total_complaints > 0
                            ? Math.round((activeDepartment.rejected_complaints / activeDepartment.total_complaints) * 100)
                            : 0}% of total
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Worker Workload Allocation */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Workforce Load Balance
                    </h4>
                    <p className="text-xs text-slate-500 -mt-2">
                      Active complaint load (Pending + In Progress) per assigned municipal technician.
                    </p>

                    {(!activeDepartment.workers || activeDepartment.workers.length === 0) ? (
                      <p className="text-xs text-slate-400">No workers available for workload mapping.</p>
                    ) : (
                      <div className="space-y-3">
                        {activeDepartment.workers.map((w) => {
                          const activeCount = w.in_progress_count + w.pending_count;
                          const loadStatus = activeCount > 5 ? "High Load" : activeCount > 2 ? "Moderate" : "Optimal";
                          return (
                            <div key={w.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-4">
                              <div className="min-w-[140px]">
                                <div className="font-bold text-slate-900 text-xs">{w.name}</div>
                                <div className="text-[10px] text-slate-400">{w.specialization}</div>
                              </div>
                              <div className="flex-1 max-w-xs hidden sm:block">
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      activeCount > 5 ? "bg-rose-500" : activeCount > 2 ? "bg-amber-500" : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(10, activeCount * 15))}%` }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-slate-700">
                                  {activeCount} active tasks
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    loadStatus === "High Load"
                                      ? "bg-rose-50 text-rose-700"
                                      : loadStatus === "Moderate"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {loadStatus}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Department ID: <span className="font-mono text-slate-600">{activeDepartment.id}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDepartment(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD / EDIT DEPARTMENT */}
      {/* ============================================================ */}
      {(showAddDepartmentModal || showEditDepartmentModal) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {showEditDepartmentModal ? "Edit Municipal Department" : "Add Municipal Department"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {showEditDepartmentModal ? "Update division details and leadership" : "Configure a new civic service department"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddDepartmentModal(false);
                  setShowEditDepartmentModal(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="space-y-4">
              <div className="flex items-start gap-2.5 p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">System Notice:</span> Municipal service divisions are mapped to municipal worker profiles and active system configuration. Newly created departments are saved to runtime configuration.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Health & Vector Control"
                  value={departmentForm.name}
                  onChange={(e) => setDepartmentForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code / Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. DEPT-HLTH"
                    value={departmentForm.code}
                    onChange={(e) => setDepartmentForm((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Head of Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Chief Medical Officer"
                    value={departmentForm.head}
                    onChange={(e) => setDepartmentForm((prev) => ({ ...prev, head: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="dept@smartcity.gov"
                    value={departmentForm.contact_email}
                    onChange={(e) => setDepartmentForm((prev) => ({ ...prev, contact_email: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 22 2456 7890"
                    value={departmentForm.contact_phone}
                    onChange={(e) => setDepartmentForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Mandate</label>
                <textarea
                  rows={2}
                  placeholder="Scope of work and public responsibilities..."
                  value={departmentForm.description}
                  onChange={(e) => setDepartmentForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="deptActiveCheck"
                  checked={departmentForm.is_active}
                  onChange={(e) => setDepartmentForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="deptActiveCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Department is currently active and accepting complaints
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDepartmentModal(false);
                    setShowEditDepartmentModal(false);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDepartment}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {savingDepartment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : showEditDepartmentModal ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Update Department
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Create Department
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: WORKER DETAILS PROFILE */}
      {/* ============================================================ */}
      {selectedWorkerForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserRound className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-base">{selectedWorkerForDetails.name}</h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                      {selectedWorkerForDetails.worker_code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedWorkerForDetails.specialization || "Municipal Technician"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkerForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase">Assigned</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{selectedWorkerForDetails.assigned_count}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase">Pending</div>
                <div className="text-base font-black text-slate-600 mt-0.5">{selectedWorkerForDetails.pending_count}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase">In Prog</div>
                <div className="text-base font-black text-amber-600 mt-0.5">{selectedWorkerForDetails.in_progress_count}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase">Resolved</div>
                <div className="text-base font-black text-emerald-600 mt-0.5">{selectedWorkerForDetails.resolved_count}</div>
              </div>
            </div>

            {/* Resolution Efficiency */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-600">Resolution Efficiency</span>
                <span className="text-blue-600 font-extrabold">{selectedWorkerForDetails.resolution_rate}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    selectedWorkerForDetails.resolution_rate >= 75
                      ? "bg-emerald-500"
                      : selectedWorkerForDetails.resolution_rate >= 40
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(100, selectedWorkerForDetails.resolution_rate)}%` }}
                />
              </div>
            </div>

            {/* Contact & Status Information */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-semibold text-slate-800">{selectedWorkerForDetails.email || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-800">{selectedWorkerForDetails.phone || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Availability:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                    selectedWorkerForDetails.is_available
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {selectedWorkerForDetails.is_available ? "Available for Dispatch" : "Unavailable"}
                </span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-[11px] text-blue-700">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Worker profile verified. Sensitive security credentials and passwords remain encrypted.</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedWorkerForDetails(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CHANGE ADMIN PASSWORD */}
      {/* ============================================================ */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Change Administrator Password</h3>
                  <p className="text-xs text-slate-500">Update your security login credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError("");
                  setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                    placeholder="Enter existing password"
                    className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Must be at least 8 characters long.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                    placeholder="Re-enter new password"
                    className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600">
                <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span>Backend validates existing password before hashing the new password. Plaintext is never stored.</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError("");
                    setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordChanging}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {passwordChanging ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" /> Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ============================================================ */}
      {/* MODAL 1: ADD / EDIT REWARD */}
      {/* ============================================================ */}
      {(showAddRewardModal || showEditRewardModal) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {showEditRewardModal ? "Edit Municipal Reward Item" : "Add Municipal Reward Item"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {showEditRewardModal ? "Modify catalog perks and points required" : "Add an incentive voucher to the citizen catalog"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddRewardModal(false);
                  setShowEditRewardModal(false);
                  setEditingRewardItem(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={showEditRewardModal ? handleUpdateReward : handleCreateReward} className="space-y-4">
              <div className="flex items-start gap-2.5 p-3 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-[11px] text-blue-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <div>
                  <span className="font-bold">Catalog Sync:</span> Updates made here immediately sync with the Citizen Rewards Center. Existing redemption records preserve their historical points and reference codes.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reward Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Municipal Garden Pass"
                  value={rewardFormData.name}
                  onChange={(e) => setRewardFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Points Cost *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 50"
                    value={rewardFormData.points_required}
                    onChange={(e) => setRewardFormData((prev) => ({ ...prev, points_required: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={rewardFormData.category}
                    onChange={(e) => setRewardFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Transit">Transit</option>
                    <option value="Mobility">Mobility</option>
                    <option value="Environment">Environment</option>
                    <option value="Education">Education</option>
                    <option value="Sustainability">Sustainability</option>
                    <option value="Recognition">Recognition</option>
                    <option value="Culture">Culture</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Icon Representation</label>
                  <select
                    value={rewardFormData.icon}
                    onChange={(e) => setRewardFormData((prev) => ({ ...prev, icon: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Gift">Gift Box</option>
                    <option value="Bus">Bus / Transit</option>
                    <option value="Car">Car / Parking</option>
                    <option value="TreePine">Tree / Park</option>
                    <option value="BookOpen">Book / Library</option>
                    <option value="ShoppingBag">Eco Bag</option>
                    <option value="Award">Award / Ribbon</option>
                    <option value="Landmark">Landmark / Museum</option>
                    <option value="Star">Star Badge</option>
                    <option value="Trophy">Trophy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={rewardFormData.status}
                    onChange={(e) => setRewardFormData((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Active">Active (Available)</option>
                    <option value="Inactive">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain terms of use and fulfillment method..."
                  value={rewardFormData.description}
                  onChange={(e) => setRewardFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="popularCheck"
                  checked={rewardFormData.popular}
                  onChange={(e) => setRewardFormData((prev) => ({ ...prev, popular: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="popularCheck" className="text-xs font-bold text-slate-700 select-none">
                  Highlight as "Popular / Featured" item
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRewardModal(false);
                    setShowEditRewardModal(false);
                    setEditingRewardItem(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rewardSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {rewardSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{showEditRewardModal ? "Update Reward" : "Save Reward"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: CLAIM DETAILS */}
      {/* ============================================================ */}
      {selectedClaimForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Voucher Redemption Details</h3>
                  <p className="text-xs text-slate-500">Municipal claim verification record</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClaimForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Redemption Code</span>
                  <span className="font-mono font-black text-base text-slate-900">{selectedClaimForDetails.claim_code}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyClaimCode(selectedClaimForDetails.claim_code)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedClaimForDetails.status === "Delivered" || selectedClaimForDetails.status === "Completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : selectedClaimForDetails.status === "Approved"
                      ? "bg-blue-100 text-blue-800"
                      : selectedClaimForDetails.status === "Rejected"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {selectedClaimForDetails.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Points Deducted</span>
                  <span className="font-black text-purple-700 text-sm">
                    {selectedClaimForDetails.points_spent} points
                  </span>
                </div>
              </div>

              <div className="p-3.5 border border-slate-200/90 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Citizen Information</div>
                <div className="font-bold text-slate-900 text-sm">{selectedClaimForDetails.citizen_name}</div>
                <div className="text-slate-600 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedClaimForDetails.citizen_email || "No email on record"}</span>
                </div>
                {selectedClaimForDetails.citizen_phone && (
                  <div className="text-slate-600 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedClaimForDetails.citizen_phone}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 text-slate-500">
                  Current Account Balance: <span className="font-bold text-slate-800">{selectedClaimForDetails.citizen_balance} points</span>
                </div>
              </div>

              <div className="p-3.5 border border-slate-200/90 rounded-2xl space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reward Specification</div>
                <div className="font-bold text-slate-900 text-sm">{selectedClaimForDetails.reward_name}</div>
                <div className="text-slate-600 leading-relaxed text-xs">{selectedClaimForDetails.reward_description}</div>
              </div>
            </div>

            {/* Quick Status Action Buttons inside details modal */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedClaimForDetails(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Close
              </button>

              <div className="flex items-center gap-1.5">
                {(selectedClaimForDetails.status === "Claimed" || selectedClaimForDetails.status === "Pending") && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const clm = selectedClaimForDetails;
                        setClaimActionConfirm({ claim: clm, action: "Approved" });
                      }}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      Approve Claim
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const clm = selectedClaimForDetails;
                        setClaimActionConfirm({ claim: clm, action: "Rejected" });
                      }}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition"
                    >
                      Reject (Refund)
                    </button>
                  </>
                )}

                {selectedClaimForDetails.status === "Approved" && (
                  <button
                    type="button"
                    onClick={() => {
                      const clm = selectedClaimForDetails;
                      setClaimActionConfirm({ claim: clm, action: "Delivered" });
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    Mark Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: CLAIM ACTION CONFIRMATION */}
      {/* ============================================================ */}
      {claimActionConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                claimActionConfirm.action === "Rejected"
                  ? "bg-rose-50 text-rose-600"
                  : claimActionConfirm.action === "Delivered"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-blue-50 text-blue-600"
              }`}>
                {claimActionConfirm.action === "Rejected" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : claimActionConfirm.action === "Delivered" ? (
                  <CheckCheck className="w-5 h-5" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Confirm Claim {claimActionConfirm.action}
                </h3>
                <p className="text-xs text-slate-500">Voucher Ref: {claimActionConfirm.claim?.claim_code}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {claimActionConfirm.action === "Rejected" ? (
                <>
                  Are you sure you want to reject this claim for <span className="font-bold text-slate-900">{claimActionConfirm.claim?.reward_name}</span>?
                  This will automatically refund <span className="font-bold text-purple-700">{claimActionConfirm.claim?.points_spent} points</span> back to <span className="font-bold text-slate-900">{claimActionConfirm.claim?.citizen_name}</span> and dispatch a notification.
                </>
              ) : claimActionConfirm.action === "Delivered" ? (
                <>
                  Mark voucher <span className="font-bold text-slate-900">{claimActionConfirm.claim?.claim_code}</span> as fulfilled / delivered to <span className="font-bold text-slate-900">{claimActionConfirm.claim?.citizen_name}</span>?
                </>
              ) : (
                <>
                  Approve redemption claim for <span className="font-bold text-slate-900">{claimActionConfirm.claim?.reward_name}</span> submitted by <span className="font-bold text-slate-900">{claimActionConfirm.claim?.citizen_name}</span>?
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClaimActionConfirm(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingClaimId !== null}
                onClick={() => handleUpdateClaimStatus(claimActionConfirm.claim.id, claimActionConfirm.action)}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                  claimActionConfirm.action === "Rejected"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : claimActionConfirm.action === "Delivered"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {updatingClaimId === claimActionConfirm.claim?.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <span>Confirm {claimActionConfirm.action}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: BADGE DETAILS & RECENT EARNERS */}
      {/* ============================================================ */}
      {selectedBadgeForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  {renderRewardIcon(selectedBadgeForDetails.icon, "w-5 h-5")}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">{selectedBadgeForDetails.title}</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {selectedBadgeForDetails.category} Milestone
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBadgeForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Milestone Requirement</div>
                <div className="font-extrabold text-slate-900 text-xs mt-0.5">{selectedBadgeForDetails.requirement}</div>
                <p className="text-slate-600 text-[11px] mt-1">{selectedBadgeForDetails.description}</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Total Earners</span>
                  <span className="text-xl font-black text-amber-900">
                    {selectedBadgeForDetails.earned_count || 0} Citizens
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                  Live DB Calculation
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 text-xs mb-2">Recent Citizen Earners</h4>
                {(!selectedBadgeForDetails.recent_earners || selectedBadgeForDetails.recent_earners.length === 0) ? (
                  <p className="text-slate-400 text-xs py-4 text-center bg-slate-50 rounded-xl border border-slate-100">
                    No citizens have unlocked this milestone criteria yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                    {selectedBadgeForDetails.recent_earners.map((earner) => (
                      <div key={earner.user_id} className="p-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                            {(earner.name || "C")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{earner.name}</div>
                            <div className="text-[10px] text-slate-400">{earner.email || "No email"}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {earner.current_progress} achieved
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBadgeForDetails(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: BROADCAST SEND CONFIRMATION */}
      {/* ============================================================ */}
      {showSendConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                announcementForm.priority === "Emergency"
                  ? "bg-rose-50 text-rose-600"
                  : announcementForm.priority === "Urgent"
                  ? "bg-orange-50 text-orange-600"
                  : "bg-blue-50 text-blue-600"
              }`}>
                {announcementForm.priority === "Emergency" ? (
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                ) : (
                  <Megaphone className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Confirm Broadcast Dispatch
                </h3>
                <p className="text-xs text-slate-500">Live delivery to municipal user accounts</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Priority:</span>
                <div>{renderPriorityBadge(announcementForm.priority)}</div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-bold text-slate-800">{announcementForm.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Audience:</span>
                <span className="font-bold text-slate-800">{audiencePreview.audience_label}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200/80">
                <span className="text-slate-700 font-bold">Estimated Recipients:</span>
                <span className="font-black text-blue-700">{audiencePreview.recipient_count} accounts</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Headline
              </span>
              <p className="text-xs font-bold text-slate-900">{announcementForm.title}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Message Preview
              </span>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-h-24 overflow-y-auto">
                {announcementForm.message}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSendConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={announcementSending}
                onClick={handleDispatchAnnouncement}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                  announcementForm.priority === "Emergency"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {announcementSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                  </>
                ) : (
                  <>
                    <Megaphone className="w-3.5 h-3.5" /> Confirm &amp; Dispatch
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: BROADCAST DETAILS & RECIPIENT READ STATS */}
      {/* ============================================================ */}
      {selectedAnnouncementForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Broadcast Delivery &amp; Read Statistics</h3>
                  <p className="text-xs text-slate-500 font-mono">Ref: {selectedAnnouncementForDetails.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnnouncementForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">{selectedAnnouncementForDetails.title}</div>
                  <div>{renderPriorityBadge(selectedAnnouncementForDetails.priority)}</div>
                </div>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {selectedAnnouncementForDetails.message}
                </p>
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Audience: <strong className="text-slate-700">{selectedAnnouncementForDetails.audience}</strong></span>
                  <span>Sent: {selectedAnnouncementForDetails.sent_at ? new Date(selectedAnnouncementForDetails.sent_at).toLocaleString() : "N/A"}</span>
                </div>
              </div>

              {/* Read Progress Summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block mb-0.5">Total Delivered</span>
                  <span className="text-xl font-black text-blue-900">{selectedAnnouncementForDetails.total_recipients}</span>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-0.5">Read</span>
                  <span className="text-xl font-black text-emerald-800">{selectedAnnouncementForDetails.read_count}</span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5 font-bold">({selectedAnnouncementForDetails.read_percentage}%)</span>
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block mb-0.5">Unread</span>
                  <span className="text-xl font-black text-amber-800">{selectedAnnouncementForDetails.unread_count}</span>
                </div>
              </div>

              {/* Recipient Breakdown Table */}
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs mb-2">Recipient Delivery Audit</h4>
                {(!selectedAnnouncementForDetails.recipients || selectedAnnouncementForDetails.recipients.length === 0) ? (
                  <p className="text-slate-400 text-xs py-4 text-center bg-slate-50 rounded-xl">No recipient records found.</p>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-black">
                        <tr>
                          <th className="py-2.5 px-3">Recipient</th>
                          <th className="py-2.5 px-2">Role</th>
                          <th className="py-2.5 px-2">Department</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {selectedAnnouncementForDetails.recipients.map((rec) => (
                          <tr key={rec.notification_id || rec.user_id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              <div>{rec.name}</div>
                              <div className="text-[10px] text-slate-400">{rec.email || "N/A"}</div>
                            </td>
                            <td className="py-2 px-2 uppercase text-[10px] text-slate-500 font-bold">
                              {rec.role}
                            </td>
                            <td className="py-2 px-2 text-[11px] text-slate-600">
                              {rec.department || "General"}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {rec.is_read ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  <Check className="w-3 h-3" /> Read
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3" /> Unread
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const ann = selectedAnnouncementForDetails;
                  setSelectedAnnouncementForDetails(null);
                  handleDuplicateAnnouncement(ann);
                }}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Reuse as Template</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedAnnouncementForDetails(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DELETE ANNOUNCEMENT CONFIRMATION */}
      {/* ============================================================ */}
      {announcementToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Delete Announcement Broadcast?</h3>
                <p className="text-xs text-slate-500 font-mono">{announcementToDelete.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">"{announcementToDelete.title}"</span>?
              This will remove all <span className="font-bold text-rose-700">{announcementToDelete.total_recipients} recipient notification copies</span> from the Supabase database. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAnnouncementToDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAnnouncement}
                onClick={() => handleDeleteAnnouncement(announcementToDelete.id)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                {deletingAnnouncement ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CATEGORY ADD / EDIT MODAL (REAL PERSISTENCE IN categories TABLE) */}
      {/* ============================================================ */}
      {categoryModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !savingCategory && setCategoryModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {categoryModalMode === "create" ? "Add Complaint Category" : "Edit Complaint Category"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {categoryModalMode === "create" ? "Create a new civic grievance category in Supabase" : "Update category details in database"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={savingCategory}
                onClick={() => setCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Public Parks & Trees"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Describe the nature of civic issues reported under this category..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Active Status</span>
                  <span className="text-[11px] text-slate-500 block">
                    When active, citizens can select this category when filing complaints.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryForm({ ...categoryForm, is_active: !categoryForm.is_active })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    categoryForm.is_active
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {categoryForm.is_active ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Active
                    </>
                  ) : (
                    "Inactive"
                  )}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={savingCategory}
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {savingCategory ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> {categoryModalMode === "create" ? "Create Category" : "Save Changes"}
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