import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Bell,
  Check,
  CheckCheck,
  RefreshCw,
  AlertCircle,
  UserPlus,
  MessageCircle,
  Info,
  X,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const dropdownRef = useRef(null);

  const getToken = () => {
    return localStorage.getItem("access_token");
  };

  const fetchNotifications = async () => {
    const token = getToken();

    if (!token) {
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(
        `${API_BASE_URL}/api/notifications/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data;

      if (data?.success) {
        const notificationList = Array.isArray(data.notifications)
          ? data.notifications
          : [];

        setNotifications(notificationList);

        const unread = notificationList.filter(
          (notification) => !notification.is_read
        ).length;

        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);

      if (error.response?.status === 401) {
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const markAsRead = async (notificationId) => {
    const token = getToken();

    if (!token) {
      return;
    }

    try {
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
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const token = getToken();

    if (!token || unreadCount === 0) {
      return;
    }

    try {
      setMarkingAll(true);

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
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "new_complaint":
        return <AlertCircle className="w-5 h-5 text-blue-600" />;

      case "complaint_assigned":
        return <UserPlus className="w-5 h-5 text-purple-600" />;

      case "status_update":
        return <MessageCircle className="w-5 h-5 text-green-600" />;

      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTimeAgo = (date) => {
    if (!date) {
      return "";
    }

    const created = new Date(date);
    const now = new Date();

    const difference = Math.floor(
      (now.getTime() - created.getTime()) / 1000
    );

    if (difference < 60) {
      return "Just now";
    }

    if (difference < 3600) {
      return `${Math.floor(difference / 60)} min ago`;
    }

    if (difference < 86400) {
      return `${Math.floor(difference / 3600)} hr ago`;
    }

    if (difference < 604800) {
      return `${Math.floor(difference / 86400)} day ago`;
    }

    return created.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div
      ref={dropdownRef}
      className="relative"
      style={{ zIndex: 100 }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg border bg-white hover:bg-gray-50 transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-700" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          style={{ zIndex: 200 }}
        >
          <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">
                Notifications
              </h3>

              <p className="text-xs text-gray-500 mt-0.5">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount > 1 ? "s" : ""
                    }`
                  : "You're all caught up"}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchNotifications}
                disabled={loading}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                title="Refresh notifications"
              >
                <RefreshCw
                  className={`w-4 h-4 text-gray-600 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                title="Close"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {unreadCount > 0 && (
            <div className="px-4 py-2 border-b bg-gray-50">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={markingAll}
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />

                {markingAll
                  ? "Marking..."
                  : "Mark all as read"}
              </button>
            </div>
          )}

          <div className="max-h-[420px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="py-10 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />

                <p className="text-sm text-gray-500">
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center px-5">
                <Bell className="w-8 h-8 mx-auto text-gray-300 mb-3" />

                <p className="font-medium text-gray-700">
                  No notifications
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  New complaint and status updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b last:border-b-0 transition ${
                    notification.is_read
                      ? "bg-white"
                      : "bg-blue-50"
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notification.is_read
                          ? "bg-gray-100"
                          : "bg-white"
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm ${
                            notification.is_read
                              ? "font-medium text-gray-800"
                              : "font-bold text-gray-900"
                          }`}
                        >
                          {notification.title}
                        </p>

                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        <p className="text-xs text-gray-400">
                          {getTimeAgo(notification.created_at)}
                        </p>

                        {!notification.is_read && (
                          <button
                            type="button"
                            onClick={() =>
                              markAsRead(notification.id)
                            }
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;