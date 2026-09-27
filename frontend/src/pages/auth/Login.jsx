import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "https://smart-city-complaint-portal-krs3.onrender.com";

function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Registration
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    clearMessages();
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        {
          email: email.trim(),
          password,
        }
      );

      const data = response.data;

      if (!data?.access_token || !data?.user) {
        setError("Login response from server was invalid.");
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "citizen") {
        navigate("/citizen/dashboard", { replace: true });
      } else if (data.user.role === "worker") {
        navigate("/worker/dashboard", { replace: true });
      } else if (data.user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        setError("Invalid user role.");
      }
    } catch (error) {
      console.error("Login error:", error);

      if (error.response?.data?.detail) {
        setError(
          Array.isArray(error.response.data.detail)
            ? error.response.data.detail
                .map((item) => item.msg || String(item))
                .join(", ")
            : error.response.data.detail
        );
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.request) {
        setError(
          "Unable to connect to the Smart City server. Please try again."
        );
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!registerEmail.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!registerPassword) {
      setError("Please enter a password.");
      return;
    }

    if (registerPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (registerPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_BASE_URL}/api/auth/register`,
        {
          name: name.trim(),
          email: registerEmail.trim(),
          phone: phone.trim() || null,
          password: registerPassword,
          role: "citizen",
        }
      );

      const message =
        response.data?.message ||
        "Account created successfully. Please login.";

      setSuccess(message);

      setName("");
      setPhone("");
      setRegisterEmail("");
      setRegisterPassword("");
      setConfirmPassword("");

      setMode("login");

      setEmail(registerEmail.trim());
    } catch (error) {
      console.error("Registration error:", error);

      if (error.response?.data?.detail) {
        setError(
          Array.isArray(error.response.data.detail)
            ? error.response.data.detail
                .map((item) => item.msg || String(item))
                .join(", ")
            : error.response.data.detail
        );
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.request) {
        setError(
          "Unable to connect to the Smart City server. Please try again."
        );
      } else {
        setError(
          "Registration failed. Please check your details and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">SC</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            Smart City Portal
          </h1>

          <p className="text-gray-500 mt-2">
            {mode === "login"
              ? "Login to your account"
              : "Create your citizen account"}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => switchMode("login")}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
              mode === "login"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
              mode === "register"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-5 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <p className="text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="text-blue-600 font-semibold hover:underline"
              >
                Create Account
              </button>
            </p>
          </form>
        )}

        {/* REGISTRATION FORM */}
        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                autoComplete="tel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>

              <input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>

              <input
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            {/* Role information */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              <p className="text-xs text-blue-700">
                <span className="font-bold">Account type:</span> Citizen
              </p>

              <p className="text-xs text-blue-600 mt-1">
                Public registration is available only for citizen accounts.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading ? "Creating Account..." : "Create Citizen Account"}
            </button>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-blue-600 font-semibold hover:underline"
              >
                Login
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;