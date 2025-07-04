import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import bg from "../assets/bg-glass.png";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, form);
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      alert(err.response.data.message || "Login failed.");
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
          onChange={handleChange}
          className="w-full p-2 rounded bg-white/80 border border-gray-300 text-black placeholder-black"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          className="w-full p-2 rounded bg-white/80 border border-gray-300 text-black placeholder-black"
        />
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
