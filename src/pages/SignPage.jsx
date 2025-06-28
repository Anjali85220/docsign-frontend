import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function SignPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/docs/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setDoc(data.doc);
        } else {
          setError(data.message || "Failed to fetch document.");
        }
      } catch (err) {
        setError("Error: " + err.message);
      }
    };

    fetchDoc();
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!doc) return <p>Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">Sign Document</h1>
      <iframe
        src={`http://localhost:5000/${doc.filePath}`}
        className="w-full max-w-4xl h-[80vh] border rounded-lg shadow-lg"
        title="PDF Viewer"
      ></iframe>
    </div>
  );
}

export default SignPage;
