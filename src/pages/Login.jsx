import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import bg from "../assets/bg-glass.png";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
        form
      );

      // Check for token in response
      if (res.data && res.data.token) {
        localStorage.setItem("token", res.data.token);
        navigate("/dashboard");
      } else {
        alert("Login failed: No token received.");
        console.log("Unexpected response:", res);
      }
    } catch (err) {
      console.error("Login error:", err);
      const message =
        err?.response?.data?.message || "Login failed. Please try again.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white/20 backdrop-blur-md border border-white/30 p-8 rounded-xl shadow-xl w-96 space-y-4 text-black"
      >
        <h2 className="text-2xl font-semibold text-center">Login</h2>

        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full p-2 rounded bg-white/80 border border-gray-300 text-black placeholder-black"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full p-2 rounded bg-white/80 border border-gray-300 text-black placeholder-black"
          required
        />

        <button
          type="submit"
          className={`w-full py-2 rounded text-white ${
            loading ? "bg-gray-500" : "bg-green-600 hover:bg-green-700"
          }`}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;
