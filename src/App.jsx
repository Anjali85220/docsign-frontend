import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SignPage from "./pages/SignPage";        // 👈 New route
  // 👈 Optional: draw/type signature

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sign/:id" element={<SignPage />} />         {/* 👈 Load PDF to sign */}
       
      </Routes>
    </Router>
  );
}

export default App;
