import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import bg from "../assets/bg-glass.png";

function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`https://docsign-backend.onrender.com/api/auth/register`, form);
      alert("Registered successfully!");
      navigate("/login");
    } catch (err) {
      console.error("Register error:", err);
      const message = err?.response?.data?.message || "Registration failed.";
      alert(message);
    }
  };

  return (
    <div
      className="h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-gray-100/20 backdrop-blur-md border border-white/30 p-8 rounded-xl shadow-xl w-96 space-y-4 text-black"
      >
        <h2 className="text-2xl font-semibold text-center">Sign Up</h2>
        <input
          name="name"
          value={form.name}
          placeholder="Name"
          onChange={handleChange}
          className="w-full p-2 rounded bg-white/80 border border-gray-300 text-black placeholder-black"
          required
        />
        <input
          name="email"
          value={form.email}
          placeholder="Email"
          onChange={handleChange}
          className="w-full p-2 rounded bg-white/80 border border-gray-300 text-black placeholder-black"
          required
        />
        <input
          type="password"
          name="password"
          value={form.password}
          placeholder="Password"
          onChange={handleChange}
          className="w-full p-2 rounded bg-white/80 border border-gray-300 text-black placeholder-black"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
}

export default Register;
