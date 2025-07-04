import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Upload, FileText, FileSignature, CheckCircle, Edit2, Eye, Download, Trash2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

function Dashboard() {
  const [pendingDocs, setPendingDocs] = useState([]);
  const [signedDocs, setSignedDocs] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [previewPages, setPreviewPages] = useState({});
  const [pdfLoadError, setPdfLoadError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.signed) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      fetchDocuments();
      return () => clearTimeout(timer);
    }
    fetchDocuments();
  }, [location.state]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      
      const res = await fetch(`https://docsign-backend.onrender.com/api/docs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        const allDocs = data.docs || [];
        setPendingDocs(allDocs.filter(doc => doc.status !== 'completed'));
        setSignedDocs(allDocs.filter(doc => doc.status === 'completed'));
      }
    } catch (err) {
      console.error("Failed to load docs:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

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

      const res = await fetch("https://docsign-backend.onrender.com/api/docs/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`, // ✅ only this header
    // ❌ Do NOT set 'Content-Type' manually for FormData
  },
  body: formData, // ✅ Let browser handle boundaries automatically
});


      const data = await res.json();
      if (res.ok) {
        setUploadMessage(`✅ Uploaded: ${data.doc.originalName}`);
        setFile(null);
        fetchDocuments();
      } else {
        setUploadMessage(`❌ Upload failed: ${data.message}`);
      }
    } catch (err) {
      setUploadMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    const confirm = window.confirm("Are you sure you want to delete this document?");
    if (!confirm) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://docsign-backend.onrender.com/api/docs/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        fetchDocuments();
      } else {
        alert(`Delete failed: ${data.message}`);
      }
    } catch (err) {
      alert("Delete error: " + err.message);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const token = localStorage.getItem("token");
      const filePath = doc.status === 'completed' && doc.signedFilePath 
        ? doc.signedFilePath 
        : doc.filePath;
      const filePathClean = filePath.replace(/^\/+/, "");
      const response = await fetch(`https://docsign-backend.onrender.com/${filePathClean}`, {

        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to download file');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = doc.status === 'completed' 
        ? `Signed_${doc.originalName}`
        : doc.originalName;
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document');
    }
  };

  const handleEdit = (docId) => {
    // Navigate to sign page with edit mode enabled
    navigate(`/sign/${docId}`, { 
      state: { 
        editMode: true,
        returnTo: '/dashboard' 
      }
    });
  };

  const handleSign = (docId) => {
    // Navigate to sign page for new signature
    navigate(`/sign/${docId}`, { 
      state: { 
        editMode: false,
        returnTo: '/dashboard' 
      }
    });
  };

  const togglePreview = (docId) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null);
      setPdfLoadError(null);
    } else {
      setExpandedDocId(docId);
    }
  };

  const getDocumentUrl = (doc) => {
    if (doc.status === 'completed' && doc.signedFilePath) {
      return `https://docsign-backend.onrender.com/${doc.signedFilePath.replace(/\\/g, "/")}`;
    }
    return `https://docsign-backend.onrender.com/${doc.filePath.replace(/\\/g, "/")}`;
  };

  const onDocumentLoadSuccess = ({ numPages }, docId) => {
    setPreviewPages(prev => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        numPages,
        currentPage: 1
      }
    }));
    setPdfLoadError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error("PDF load error:", error);
    setPdfLoadError(`Failed to load PDF. Please ensure the file exists at the specified path.`);
  };

  const changePreviewPage = (docId, delta) => {
    setPreviewPages(prev => {
      const currentPage = prev[docId]?.currentPage || 1;
      const numPages = prev[docId]?.numPages || 1;
      const newPage = Math.max(1, Math.min(numPages, currentPage + delta));
      
      return {
        ...prev,
        [docId]: {
          ...prev[docId],
          currentPage: newPage
        }
      };
    });
  };

  const currentDocs = activeTab === "pending" ? pendingDocs : signedDocs;

  return (
    <div className="min-h-screen flex bg-cover bg-center bg-no-repeat dark:bg-gray-900" style={{ backgroundImage: "url('/bg-mountains.jpg')" }}>
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <CheckCircle size={20} />
            Document signed successfully!
          </div>
        </div>
      )}

      <div className="flex-1 relative z-10 p-6 md:p-10 bg-gradient-to-br from-indigo-100/70 via-white/70 to-cyan-100/70 dark:from-gray-800 dark:to-gray-900">
        <h1 className="text-4xl font-extrabold text-center text-indigo-700 dark:text-white mb-10">
          Welcome to DocSign Dashboard
        </h1>

        <div className="flex justify-center mb-10" id="upload-card">
          <div className="bg-white/60 dark:bg-gray-700 backdrop-blur-md border border-white/30 dark:border-gray-600 rounded-2xl p-6 shadow-xl flex flex-col items-center w-full max-w-md">
            <Upload size={44} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold mt-4 text-indigo-800 dark:text-white">Upload PDF Document</h2>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="mt-4 w-full p-2 rounded bg-white text-black border border-gray-300 dark:bg-gray-600 dark:text-white"
            />
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="mt-4 bg-indigo-600 text-white py-2 px-5 rounded-full hover:bg-indigo-700 disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload PDF"}
            </button>
            {uploadMessage && <p className="text-sm mt-3 text-indigo-800 dark:text-white text-center">{uploadMessage}</p>}
          </div>
        </div>

        <div className="max-w-5xl mx-auto bg-white/60 dark:bg-gray-700 backdrop-blur-md rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-indigo-800 dark:text-white flex items-center gap-2">
              <FileText size={24} /> 
              {activeTab === "pending" ? "Pending Documents" : "Signed Documents"}
            </h2>
            <div className="flex border-b">
              <button
                className={`px-4 py-2 ${activeTab === "pending" ? "border-b-2 border-blue-500" : ""}`}
                onClick={() => setActiveTab("pending")}
              >
                Pending
              </button>
              <button
                className={`px-4 py-2 ${activeTab === "signed" ? "border-b-2 border-blue-500" : ""}`}
                onClick={() => setActiveTab("signed")}
              >
                Signed
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : currentDocs.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300">
              {activeTab === "pending" ? "No pending documents." : "No signed documents yet."}
            </p>
          ) : (
            <div className="space-y-4">
              {currentDocs.map((doc) => (
                <div
                  key={doc._id}
                  className="bg-white/90 dark:bg-gray-800 rounded-lg shadow border dark:border-gray-600 overflow-hidden"
                >
                  <div className="flex justify-between items-center p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        doc.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-indigo-900 dark:text-white">{doc.originalName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-300">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePreview(doc._id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm flex items-center"
                      >
                        <Eye size={16} className="mr-1" />
                        {expandedDocId === doc._id ? "Hide" : "Preview"}
                      </button>
                      
                      <button
                        onClick={() => handleDownload(doc)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm flex items-center"
                      >
                        <Download size={16} className="mr-1" />
                        Download
                      </button>
                      
                      {activeTab === "pending" ? (
                        <button
                          onClick={() => handleSign(doc._id)}
                          className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-sm flex items-center"
                        >
                          <FileSignature size={16} className="mr-1" />
                          Sign
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEdit(doc._id)}
                          className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-sm flex items-center"
                        >
                          <Edit2 size={16} className="mr-1" />
                          Edit
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm flex items-center"
                      >
                        <Trash2 size={16} className="mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {expandedDocId === doc._id && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-sm font-medium">
                            Status: {doc.status === 'completed' ? (
                              <span className="text-green-600">Signed</span>
                            ) : (
                              <span className="text-yellow-600">Pending</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => changePreviewPage(doc._id, -1)}
                            disabled={(previewPages[doc._id]?.currentPage || 1) <= 1}
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="text-sm">
                            Page {(previewPages[doc._id]?.currentPage || 1)} of {previewPages[doc._id]?.numPages || '--'}
                          </span>
                          <button 
  onClick={() => changePreviewPage(doc._id, 1)}
  disabled={(previewPages[doc._id]?.currentPage || 1) >= (previewPages[doc._id]?.numPages || 1)}
  className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm disabled:opacity-50"
>
  Next
</button>

                        </div>
                      </div>
                      
                      <div className="flex justify-center bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        {pdfLoadError ? (
                          <div className="text-center py-10 text-red-500">
                            {pdfLoadError}
                          </div>
                        ) : (
                          <Document
                            file={getDocumentUrl(doc)}
                            onLoadSuccess={(pdf) => onDocumentLoadSuccess(pdf, doc._id)}
                            onLoadError={onDocumentLoadError}
                            loading={
                              <div className="text-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                                Loading PDF...
                              </div>
                            }
                            className="max-w-full"
                          >
                            <Page 
                              pageNumber={previewPages[doc._id]?.currentPage || 1}
                              width={600}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                            />
                          </Document>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;