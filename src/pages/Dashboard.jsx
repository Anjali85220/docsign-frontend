import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, PenTool, FileText } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function Dashboard() {
  const [file, setFile] = useState(null);
  const [docs, setDocs] = useState([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadMessage("");
  };

  const handleUpload = async () => {
    if (!file) return setUploadMessage("❌ Please select a PDF file.");

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      setIsUploading(true);
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/docs/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadMessage(`✅ Uploaded: ${data.doc.originalName}`);
        setFile(null);
        fetchDocs(); // Refresh list
        navigate(`/sign/${data.doc._id}`);
      } else {
        setUploadMessage(`❌ Upload failed: ${data.message}`);
      }
    } catch (err) {
      setUploadMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const fetchDocs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/docs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setDocs(data.docs);
    } catch (err) {
      console.error("Failed to load docs:", err.message);
    }
  };

  const handleDelete = async (docId) => {
    const confirm = window.confirm("Are you sure you want to delete this document?");
    if (!confirm) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/docs/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        alert("Deleted successfully.");
        setDocs((prev) => prev.filter((d) => d._id !== docId));
      } else {
        alert(`Delete failed: ${data.message}`);
      }
    } catch (err) {
      alert("Delete error: " + err.message);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-cyan-100 p-6">
      <h1 className="text-4xl font-extrabold text-center text-indigo-700 drop-shadow mb-10">
        Welcome to DocSign Dashboard
      </h1>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Upload Card */}
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-xl flex flex-col items-center transition-transform hover:scale-105">
          <Upload size={44} className="text-indigo-600" />
          <h2 className="text-xl font-bold mt-4 text-indigo-800">Upload Document</h2>
          <p className="text-center text-sm mt-2 text-gray-700">Upload your PDF to sign and share digitally.</p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="mt-4 w-full p-2 rounded bg-white text-black border border-gray-300"
          />
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="mt-4 bg-indigo-600 text-white py-2 px-5 rounded-full hover:bg-indigo-700 disabled:opacity-60"
          >
            {isUploading ? "Uploading..." : "Upload PDF"}
          </button>
          {uploadMessage && <p className="text-sm mt-3 text-indigo-800 text-center">{uploadMessage}</p>}
        </div>

        {/* Create Signature Card */}
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-xl flex flex-col items-center transition-transform hover:scale-105">
          <PenTool size={44} className="text-indigo-600" />
          <h2 className="text-xl font-bold mt-4 text-indigo-800">Draw or Type Signature</h2>
          <p className="text-center text-sm mt-2 text-gray-700">Use mouse or keyboard to create your reusable e-signature.</p>
          <button
            onClick={() => navigate("/signature")}
            className="mt-6 bg-indigo-600 text-white py-2 px-5 rounded-full hover:bg-indigo-700"
          >
            Create Signature
          </button>
        </div>
      </div>

      {/* Document List */}
      <div className="max-w-5xl mx-auto mt-12 bg-white/60 backdrop-blur-md rounded-xl p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-indigo-800 flex items-center gap-2">
          <FileText size={24} /> Your Uploaded Documents
        </h2>

        {docs.length === 0 ? (
          <p className="text-gray-600">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-4">
            {docs.map((doc) => (
              <div
                key={doc._id}
                className="flex justify-between items-center bg-white/90 p-3 rounded shadow border"
              >
                <div>
                  <p className="font-medium text-indigo-900">{doc.originalName}</p>
                  <p className="text-sm text-gray-500">Uploaded: {new Date(doc.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setSelectedDoc(doc.filePath)}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="text-red-600 font-semibold hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-3xl w-full relative">
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-3 right-4 text-2xl text-red-500 font-bold"
            >
              &times;
            </button>
            <Document file={`http://localhost:5000/${selectedDoc}`} onLoadError={console.error}>
              <Page pageNumber={1} />
            </Document>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
