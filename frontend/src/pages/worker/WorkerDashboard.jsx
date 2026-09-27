import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  LogOut,
  RefreshCw,
  UserRound,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../../components/NotificationBell";

const API_BASE_URL = "http://127.0.0.1:8000";

function WorkerDashboard() {
  const navigate = useNavigate();

  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [worker, setWorker] = useState(null);
  const [complaints, setComplaints] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const [statusHistory, setStatusHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [updatingId, setUpdatingId] = useState(null);

  const [remarks, setRemarks] = useState("");

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

  const loadWorkerData = async (
    authToken = token,
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

      const headers = {
        Authorization: `Bearer ${authToken}`,
      };

      const [workerResponse, complaintsResponse] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/api/worker/me`, {
            headers,
          }),
          axios.get(`${API_BASE_URL}/api/worker/complaints`, {
            headers,
          }),
        ]);

      if (workerResponse.data?.success) {
        setWorker(workerResponse.data.worker);
      }

      if (complaintsResponse.data?.success) {
        setComplaints(
          complaintsResponse.data.complaints || []
        );
      } else {
        setComplaints([]);
      }
    } catch (err) {
      console.error("Worker dashboard error:", err);

      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        navigate("/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.detail ||
          "Failed to load worker dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
        setStatusHistory(response.data.history || []);
      } else {
        setStatusHistory([]);
      }
    } catch (err) {
      console.error("Complaint history error:", err);

      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        navigate("/login", { replace: true });
        return;
      }

      setHistoryError(
        err.response?.data?.detail ||
          "Failed to load complaint status history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const openComplaint = async (complaint) => {
    setSelectedComplaint(complaint);
    setRemarks("");
    setHistoryError("");

    await loadComplaintHistory(complaint.id);
  };

  const closeComplaint = () => {
    setSelectedComplaint(null);
    setStatusHistory([]);
    setHistoryError("");
    setRemarks("");
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/login", { replace: true });
  };

  const updateComplaintStatus = async (
    complaintId,
    newStatus
  ) => {
    if (!complaintId || !newStatus) {
      return;
    }

    try {
      setUpdatingId(complaintId);
      setError("");
      setSuccess("");

      const finalRemarks =
        remarks.trim() ||
        `Status updated by worker to ${newStatus}.`;

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

      setSuccess(
        `Complaint status changed to ${newStatus}.`
      );

      setRemarks("");

      await loadWorkerData(token, true);

      const complaintResponse = await axios.get(
        `${API_BASE_URL}/api/complaints/${complaintId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (complaintResponse.data?.success) {
        const updatedComplaint =
          complaintResponse.data.complaint;

        setSelectedComplaint(updatedComplaint);

        if (
          Array.isArray(
            complaintResponse.data.status_history
          )
        ) {
          setStatusHistory(
            complaintResponse.data.status_history
          );
        } else {
          await loadComplaintHistory(complaintId);
        }
      } else {
        await loadComplaintHistory(complaintId);
      }
    } catch (err) {
      console.error("Status update error:", err);

      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        navigate("/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.detail ||
          "Failed to update complaint status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => {
    const total = complaints.length;

    const assigned = complaints.filter(
      (complaint) => complaint.status === "Assigned"
    ).length;

    const inProgress = complaints.filter(
      (complaint) => complaint.status === "In Progress"
    ).length;

    const resolved = complaints.filter(
      (complaint) => complaint.status === "Resolved"
    ).length;

    const rejected = complaints.filter(
      (complaint) => complaint.status === "Rejected"
    ).length;

    return {
      total,
      assigned,
      inProgress,
      resolved,
      rejected,
    };
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    if (statusFilter === "All") {
      return complaints;
    }

    return complaints.filter(
      (complaint) => complaint.status === statusFilter
    );
  }, [complaints, statusFilter]);

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

  const getHistoryActor = (historyItem) => {
    if (historyItem.changed_by) {
      return historyItem.changed_by;
    }

    return "System";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />

          <p className="text-gray-600">
            Loading worker dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ================= HEADER ================= */}

      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Wrench className="w-7 h-7 text-blue-600" />

                <h1 className="text-2xl font-bold text-gray-900">
                  Worker Dashboard
                </h1>
              </div>

              <p className="text-sm text-gray-500 mt-1">
                Smart City Complaint Portal
              </p>
            </div>

            <div className="flex items-center gap-3">
              {worker && (
                <div className="hidden sm:flex items-center gap-3 bg-gray-50 border rounded-xl px-4 py-2">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserRound className="w-5 h-5 text-blue-600" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.name || "Worker"}
                    </p>

                    <p className="text-xs text-gray-500">
                      {worker.worker_code} •{" "}
                      {worker.department}
                    </p>
                  </div>
                </div>
              )}

              <NotificationBell />

              <button
                onClick={() => loadWorkerData(token, true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    refreshing ? "animate-spin" : ""
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ================= ALERTS ================= */}

        {error && (
          <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />

            <div>
              <p className="font-semibold">
                Something went wrong
              </p>

              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />

            <div>
              <p className="font-semibold">Success</p>

              <p className="text-sm mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* ================= WORKER INFO ================= */}

        {worker && (
          <div className="mb-6 bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-blue-600" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {user?.name || "Worker"}
                  </h2>

                  <p className="text-sm text-gray-500">
                    {worker.worker_code} •{" "}
                    {worker.department}
                  </p>

                  {worker.specialization && (
                    <p className="text-xs text-gray-400 mt-1">
                      {worker.specialization}
                    </p>
                  )}
                </div>
              </div>

              <div
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  worker.is_available
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    worker.is_available
                      ? "bg-green-500"
                      : "bg-gray-400"
                  }`}
                />

                {worker.is_available
                  ? "Available"
                  : "Unavailable"}
              </div>
            </div>
          </div>
        )}

        {/* ================= STATS ================= */}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              My Complaints
            </p>

            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.total}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Assigned
            </p>

            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.assigned}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              In Progress
            </p>

            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.inProgress}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Resolved
            </p>

            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.resolved}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Rejected
            </p>

            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.rejected}
            </p>
          </div>
        </div>

        {/* ================= COMPLAINTS ================= */}

        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Assigned Complaints
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Complaints assigned to your worker account.
                </p>
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className="border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="All">All Status</option>

                <option value="Assigned">Assigned</option>

                <option value="In Progress">
                  In Progress
                </option>

                <option value="Resolved">Resolved</option>

                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Wrench className="w-6 h-6 text-gray-400" />
              </div>

              <h3 className="font-semibold text-gray-900">
                No complaints assigned
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                There are currently no complaints assigned
                to your worker account.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="p-5 hover:bg-gray-50 transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-gray-500">
                          {complaint.complaint_code}
                        </span>

                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                            complaint.status
                          )}`}
                        >
                          {complaint.status}
                        </span>

                        {complaint.priority && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            {complaint.priority}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900">
                        {complaint.title}
                      </h3>

                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {complaint.description}
                      </p>

                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500 mt-4">
                        <span>
                          Category:{" "}
                          <strong className="text-gray-700">
                            {complaint.categories?.name ||
                              "Not specified"}
                          </strong>
                        </span>

                        <span>
                          Created:{" "}
                          {formatDate(
                            complaint.created_at
                          )}
                        </span>

                        {complaint.address && (
                          <span>
                            Location: {complaint.address}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {complaint.status === "Assigned" && (
                        <button
                          onClick={() =>
                            openComplaint(complaint)
                          }
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          Start Work
                        </button>
                      )}

                      {complaint.status === "In Progress" && (
                        <button
                          onClick={() =>
                            openComplaint(complaint)
                          }
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                        >
                          Update Work
                        </button>
                      )}

                      <button
                        onClick={() =>
                          openComplaint(complaint)
                        }
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4" />

                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ================= MODAL ================= */}

      {selectedComplaint && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeComplaint}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}

            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Complaint Details
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {selectedComplaint.complaint_code}
                </p>
              </div>

              <button
                onClick={closeComplaint}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* BASIC DETAILS */}

              <div>
                <p className="text-sm text-gray-500">
                  Title
                </p>

                <p className="font-semibold text-gray-900 mt-1">
                  {selectedComplaint.title}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Description
                </p>

                <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    Category
                  </p>

                  <p className="font-medium text-gray-900 mt-1">
                    {selectedComplaint.categories?.name ||
                      "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Priority
                  </p>

                  <p className="font-medium text-gray-900 mt-1">
                    {selectedComplaint.priority ||
                      "Normal"}
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
                    {selectedComplaint.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Created
                  </p>

                  <p className="font-medium text-gray-900 mt-1">
                    {formatDate(
                      selectedComplaint.created_at
                    )}
                  </p>
                </div>
              </div>

              {/* ADDRESS */}

              {selectedComplaint.address && (
                <div className="border rounded-xl p-4">
                  <p className="text-sm text-gray-500">
                    Address
                  </p>

                  <p className="text-gray-700 mt-1">
                    {selectedComplaint.address}
                  </p>
                </div>
              )}

              {/* LOCATION */}

              {selectedComplaint.latitude != null &&
                selectedComplaint.longitude != null && (
                  <div className="border rounded-xl p-4">
                    <p className="font-semibold text-gray-900 mb-2">
                      Complaint Location
                    </p>

                    <p className="text-sm text-gray-700">
                      Latitude:{" "}
                      {selectedComplaint.latitude}
                    </p>

                    <p className="text-sm text-gray-700">
                      Longitude:{" "}
                      {selectedComplaint.longitude}
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

              {/* UPDATE STATUS */}

              {(selectedComplaint.status === "Assigned" ||
                selectedComplaint.status ===
                  "In Progress") && (
                <div className="border rounded-xl p-4">
                  <div className="mb-4">
                    <p className="font-semibold text-gray-900">
                      Update Complaint
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      Update the complaint status and add
                      remarks for the citizen.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remarks
                    </label>

                    <textarea
                      value={remarks}
                      onChange={(e) =>
                        setRemarks(e.target.value)
                      }
                      rows={4}
                      placeholder="Enter work/update remarks..."
                      className="w-full border rounded-lg px-3 py-3 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {selectedComplaint.status ===
                      "Assigned" && (
                      <button
                        onClick={() =>
                          updateComplaintStatus(
                            selectedComplaint.id,
                            "In Progress"
                          )
                        }
                        disabled={
                          updatingId ===
                          selectedComplaint.id
                        }
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${
                            updatingId ===
                            selectedComplaint.id
                              ? "animate-spin"
                              : ""
                          }`}
                        />

                        {updatingId === selectedComplaint.id
                          ? "Updating..."
                          : "Start Work"}
                      </button>
                    )}

                    {selectedComplaint.status ===
                      "In Progress" && (
                      <>
                        <button
                          onClick={() =>
                            updateComplaintStatus(
                              selectedComplaint.id,
                              "Resolved"
                            )
                          }
                          disabled={
                            updatingId ===
                            selectedComplaint.id
                          }
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />

                          {updatingId ===
                          selectedComplaint.id
                            ? "Updating..."
                            : "Mark Resolved"}
                        </button>

                        <button
                          onClick={() =>
                            updateComplaintStatus(
                              selectedComplaint.id,
                              "Rejected"
                            )
                          }
                          disabled={
                            updatingId ===
                            selectedComplaint.id
                          }
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />

                          {updatingId ===
                          selectedComplaint.id
                            ? "Updating..."
                            : "Reject"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* STATUS HISTORY */}

              <div className="border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Status History
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
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
                ) : statusHistory.length === 0 ? (
                  <div className="py-8 text-center">
                    <Clock3 className="w-8 h-8 mx-auto text-gray-300 mb-2" />

                    <p className="text-sm text-gray-500">
                      No status history available.
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    {statusHistory.map(
                      (historyItem, index) => (
                        <div
                          key={
                            historyItem.id ||
                            `${historyItem.created_at}-${index}`
                          }
                          className="relative flex gap-4"
                        >
                          {index <
                            statusHistory.length - 1 && (
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
                                {historyItem.new_status}
                              </span>

                              {historyItem.old_status && (
                                <span className="text-xs text-gray-400">
                                  {historyItem.old_status}{" "}
                                  →{" "}
                                  {historyItem.new_status}
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

                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {historyItem.remarks}
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
            </div>

            {/* MODAL FOOTER */}

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

export default WorkerDashboard;