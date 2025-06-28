import { useNavigate } from "react-router-dom";
import bg from "../assets/bg-night.png";

function Home() {
  const navigate = useNavigate();

  return (
    <div
      className="h-screen bg-cover bg-center flex flex-col justify-center items-center text-white"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">DocSign</h1>
     <p className="text-3xl mb-10">
  Secure, sign, and share your documents digitally with ease.</p>


      <div className="space-x-4">
        <button
          onClick={() => navigate("/register")}
          className="bg-white text-blue-600 px-6 py-2 rounded-full font-semibold shadow-lg hover:bg-gray-200"
        >
          Register
        </button>
        <button
          onClick={() => navigate("/login")}
          className="border border-white px-6 py-2 rounded-full hover:bg-white hover:text-blue-800"
        >
          Login
        </button>
      </div>
    </div>
  );
}

export default Home;
