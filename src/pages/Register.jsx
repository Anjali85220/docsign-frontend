import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import bg from "../assets/bg-glass.png";

function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/auth/register", form);
      alert("Registered successfully!");
      navigate("/login");
    } catch (err) {
      alert(err.response.data.message || "Registration failed.");
    }
  };

  return (
    <div
      className="h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <form onSubmit={handleSubmit} className="bg-white/20 backdrop-blur-md border border-white/30 p-8 rounded-xl shadow-xl w-96 space-y-4 text-white">
        <h2 className="text-2xl font-semibold text-center">Sign Up</h2>
        <input name="name" placeholder="Name" onChange={handleChange} className="w-full p-2 rounded bg-white/10 border border-white/30" />
        <input name="email" placeholder="Email" onChange={handleChange} className="w-full p-2 rounded bg-white/10 border border-white/30" />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} className="w-full p-2 rounded bg-white/10 border border-white/30" />
        <button type="submit" className="w-full bg-blue-600 py-2 rounded hover:bg-blue-700">Sign Up</button>
      </form>
    </div>
  );
}

export default Register;
