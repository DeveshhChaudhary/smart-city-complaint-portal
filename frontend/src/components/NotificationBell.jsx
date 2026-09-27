import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Bell,
  Check,
  CheckCheck,
  ClipboardCheck,
  Filter,
  Info,
  RefreshCw,
  Search,
  UserPlus,
  X,
  XCircle,
  Wrench,
} from "lucide-react";

const API_BASE_URL =
  "https://smart-city-complaint-portal-krs3.onrender.com";

const TYPE_CONFIG = {
  new_complaint: {
    label: "New Complaint",
    icon: ClipboardCheck,
    className: "bg-blue-100 text-blue-700",
  },
  complaint_assigned: {
    label: "Assignment",
    icon: UserPlus,
    className: "bg-purple-100 text-purple-700",
  },
  status_update: {
    label: "Status Update",
    icon: Wrench,
    className: "bg-amber-100 text-amber-700",
  },
  reward: {
    label: "Reward",
    icon: CheckCheck,
    className: "bg-green-100 text-green-700",
  },
  general: {
    label: "General",
    icon: Info,
    className: "bg-gray-100 text-gray-700",
  },
};

const getToken = () => localStorage.getItem("access_token");

const getTypeConfig = (type) =>
  TYPE_CONFIG[type] || TYPE_CONFIG.general;

const formatRelativeTime = (value) => {
  if (!value) return "Just now";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (diffSeconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(diffSeconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatExactDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [error, setError] = useState("");

  const wrapperRef = useRef(null);

  const fetchNotifications = async (isRefresh = false) => {
    const token = getToken();

    if (!token) {
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/api/notifications/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const incoming = Array.isArray(
        response.data?.notifications
      )
        ? response.data.notifications
        : [];

      setNotifications(incoming);

      const serverUnread = Number(
        response.data?.unread_count
      );

      if (Number.isFinite(serverUnread)) {
        setUnreadCount(serverUnread);
      } else {
        setUnreadCount(
          incoming.filter(
            (notification) => !notification.is_read
          ).length
        );
      }
    } catch (err) {
      console.error("Notification fetch error:", err);

      if (err.response?.status !== 401) {
        setError(
          err.response?.data?.detail ||
            "Unable to load notifications."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications(false);

    const interval = window.setInterval(() => {
      fetchNotifications(true);
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    fetchNotifications(false);
  }, [isOpen]);

  const markAsRead = async (notificationId) => {
    const token = getToken();

    if (!token || !notificationId) {
      return;
    }

    try {
      setActionId(notificationId);
      setError("");

      await axios.patch(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );

      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (err) {
      console.error(
        "Mark notification read error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to mark notification as read."
      );
    } finally {
      setActionId(null);
    }
  };

  const markAllAsRead = async () => {
    const token = getToken();

    if (!token || unreadCount === 0) {
      return;
    }

    try {
      setActionId("all");
      setError("");

      await axios.patch(
        `${API_BASE_URL}/api/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error(
        "Mark all notifications read error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to mark all notifications as read."
      );
    } finally {
      setActionId(null);
    }
  };

  const availableTypes = useMemo(() => {
    const values = notifications
      .map((notification) => notification.type || "general")
      .filter(Boolean);

    return [...new Set(values)];
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesRead =
        filter === "all" ||
        (filter === "unread" && !notification.is_read) ||
        (filter === "read" && notification.is_read);

      const notificationType =
        notification.type || "general";

      const matchesType =
        typeFilter === "all" ||
        notificationType === typeFilter;

      const matchesSearch =
        !query ||
        notification.title
          ?.toLowerCase()
          .includes(query) ||
        notification.message
          ?.toLowerCase()
          .includes(query) ||
        notification.complaint_id
          ?.toLowerCase()
          .includes(query);

      return (
        matchesRead &&
        matchesType &&
        matchesSearch
      );
    });
  }, [
    notifications,
    filter,
    typeFilter,
    search,
  ]);

  const displayedUnreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.is_read
      ).length,
    [notifications]
  );

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative inline-flex items-center justify-center w-11 h-11 rounded-xl border bg-white hover:bg-gray-50 transition"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5 text-gray-700" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[min(420px,calc(100vw-2rem))] bg-white border border-gray-200 rounded-2xl shadow-2xl z-[100] overflow-hidden">
          <div className="px-4 py-4 border-b bg-gray-50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">
                    Notifications
                  </h3>

                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  Live updates refresh automatically.
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fetchNotifications(true)}
                  disabled={refreshing}
                  className="p-2 rounded-lg hover:bg-white text-gray-500 disabled:opacity-50"
                  title="Refresh notifications"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      refreshing
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-white text-gray-500"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search notifications..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 mt-3">
              {[
                ["all", "All"],
                ["unread", "Unread"],
                ["read", "Read"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    filter === value
                      ? "bg-blue-600 text-white"
                      : "bg-white border text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              ))}

              <div className="ml-auto">
                <div className="relative">
                  <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />

                  <select
                    value={typeFilter}
                    onChange={(event) =>
                      setTypeFilter(event.target.value)
                    }
                    className="pl-7 pr-2 py-1.5 border rounded-lg text-xs bg-white text-gray-600 outline-none"
                    aria-label="Filter notification type"
                  >
                    <option value="all">
                      All types
                    </option>

                    {availableTypes.map((type) => (
                      <option key={type} value={type}>
                        {getTypeConfig(type).label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {unreadCount > 0 && (
            <div className="px-4 py-2 border-b bg-white flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {displayedUnreadCount} unread notification
                {displayedUnreadCount === 1
                  ? ""
                  : "s"}
              </span>

              <button
                type="button"
                onClick={markAllAsRead}
                disabled={actionId === "all"}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            </div>
          )}

          {error && (
            <div className="mx-4 mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />

              <p className="text-xs flex-1">
                {error}
              </p>

              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="max-h-[430px] overflow-y-auto">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-gray-500">
                  Loading notifications...
                </p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-gray-400" />
                </div>

                <p className="font-semibold text-gray-800">
                  No notifications found
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Try changing the filters or search.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map(
                  (notification) => {
                    const config = getTypeConfig(
                      notification.type
                    );

                    const Icon = config.icon;

                    return (
                      <div
                        key={notification.id}
                        className={`px-4 py-4 transition ${
                          notification.is_read
                            ? "bg-white"
                            : "bg-blue-50/60"
                        } hover:bg-gray-50`}
                      >
                        <div className="flex gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.className}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p
                                  className={`text-sm ${
                                    notification.is_read
                                      ? "font-medium text-gray-800"
                                      : "font-bold text-gray-900"
                                  }`}
                                >
                                  {notification.title ||
                                    "Notification"}
                                </p>

                                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">
                                  {config.label}
                                </span>
                              </div>

                              <span
                                className="text-[11px] text-gray-400 whitespace-nowrap"
                                title={formatExactDate(
                                  notification.created_at
                                )}
                              >
                                {formatRelativeTime(
                                  notification.created_at
                                )}
                              </span>
                            </div>

                            <p className="text-xs text-gray-600 mt-2 leading-5">
                              {notification.message}
                            </p>

                            {notification.complaint_id && (
                              <p className="text-[11px] text-gray-400 mt-1 font-mono truncate">
                                Complaint:{" "}
                                {notification.complaint_id}
                              </p>
                            )}

                            {!notification.is_read && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleNotificationClick(
                                    notification
                                  )
                                }
                                disabled={
                                  actionId ===
                                  notification.id
                                }
                                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Mark as read
                              </button>
                            )}
                          </div>

                          {!notification.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 border-t bg-gray-50 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              {notifications.length} total notification
              {notifications.length === 1 ? "" : "s"}
            </span>

            <span className="text-[11px] text-gray-400">
              Auto-refresh: 30s
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;