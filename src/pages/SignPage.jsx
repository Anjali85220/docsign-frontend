import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { FaCheckCircle, FaDownload, FaEdit, FaTimes, FaSave, FaSignOutAlt } from 'react-icons/fa';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";
  
function SignPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.search.includes('edit=true');

  // State management
  const [fileUrl, setFileUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState("");
  const [placeholders, setPlaceholders] = useState([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [activeSignatureTab, setActiveSignatureTab] = useState("text");
  const [signatureText, setSignatureText] = useState("");
  const [signatureImage, setSignatureImage] = useState(null);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState(null);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({ width: 600, height: 800, scale: 1 });
  const [showSignedPdf, setShowSignedPdf] = useState(false);

  // Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const pageRef = useRef(null);

  // Helper function to construct proper file URLs
  const constructFileUrl = (filePath) => {
  if (!filePath) return null;
  
  // Remove any leading slashes and backslashes
  let cleanPath = filePath.replace(/^[\\\\/]+/, '').replace(/\\\\/g, '/');
  
  // Ensure the path starts with 'uploads/' if it's not already there
  if (!cleanPath.startsWith('uploads/')) {
    cleanPath = `uploads/${cleanPath}`;
  }
  
  // Remove any double slashes
  cleanPath = cleanPath.replace(/\/+/g, '/');
  
  const baseUrl = 'https://docsign-backend.onrender.com';
  const fullUrl = `${baseUrl}/${cleanPath}`;
  console.log('Constructed URL:', fullUrl);
  return fullUrl;
};
  // Fetch document and existing signatures
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        setError("");
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication token not found");
          return;
        }

        const res = await fetch(`https://docsign-backend.onrender.com/api/docs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`);
        }

        const data = await res.json();
        console.log('Document data:', data);

        if (!data.doc) {
          throw new Error("Document not found in response");
        }

        if (!data.doc.filePath) {
          throw new Error("File path not found in document");
        }

        const fileUrl = constructFileUrl(data.doc.filePath);
        console.log('Setting file URL:', fileUrl);
        setFileUrl(fileUrl);

        if (isEditMode && data.doc.signatures) {
          const loadedPlaceholders = data.doc.signatures.map(sig => ({
            ...sig,
            x: sig.x,
            y: sig.y,
            page: sig.page,
            locked: true
          }));
          setPlaceholders(loadedPlaceholders);
        }

        setIsConfirmed(data.doc.signed || false);
        if (data.doc.signedFilePath) {
          const signedUrl = constructFileUrl(data.doc.signedFilePath);
          setSignedPdfUrl(signedUrl);
        }
      } catch (err) {
        console.error("Error fetching document:", err);
        setError(`Failed to load document: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDocument();
    }
  }, [id, isEditMode]);

  // Drawing functions
  const startDrawing = (e) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.closePath();
    setIsDrawing(false);
    setSignatureData(canvas.toDataURL());
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  // Improved signature image upload handling
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPG, JPEG, or PNG)');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageDataUrl = event.target.result;
      setSignatureImage(imageDataUrl);
      setSignatureData(imageDataUrl);
    };
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      alert('Error reading the image file. Please try again.');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Document interactions
  const handleSignPlaceholder = (placeholderId) => {
    setSelectedPlaceholder(placeholderId);
    setShowSignModal(true);
  };

  const applySignature = () => {
    if (!signatureData && !signatureText) return;
    setPlaceholders(prev => 
      prev.map(p => 
        p.id === selectedPlaceholder
          ? {
              ...p,
              signed: true,
              signature: signatureData || signatureText,
              signatureType: signatureData ? "image" : "text",
              showBox: false
            }
          : p
      )
    );
    setShowSignModal(false);
    setSignatureText("");
    setSignatureImage(null);
    setSignatureData(null);
    clearCanvas();
  };

  const handlePageClick = (e) => {
    if (!isPlacing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / viewport.scale) - 20;
    const y = (e.clientY - rect.top) / viewport.scale;
    setPlaceholders(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        x: Math.max(0, x),
        y,
        fixed: false,
        page: pageNumber,
        signed: false,
        signature: null,
        signatureType: null,
        showBox: true,
        containerWidth: rect.width,
        containerHeight: rect.height,
        originalWidth: pdfDimensions.width,
        originalHeight: pdfDimensions.height
      }
    ]);
    setIsPlacing(false);
  };

  const handleRemove = (id) => {
    setPlaceholders(prev => prev.filter(p => p.id !== id));
  };

  const handleEdit = (id) => {
    const placeholder = placeholders.find(p => p.id === id);
    if (placeholder) {
      setSelectedPlaceholder(id);
      if (placeholder.signatureType === "text") {
        setSignatureText(placeholder.signature);
        setActiveSignatureTab("text");
      } else if (placeholder.signatureType === "image") {
        setSignatureImage(placeholder.signature);
        setSignatureData(placeholder.signature);
        setActiveSignatureTab("upload");
      }
      setShowSignModal(true);
    }
  };

  const handleDragMove = useCallback((e) => {
    if (!isDragging || !dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startX) / viewport.scale;
    const dy = (e.clientY - dragRef.current.startY) / viewport.scale;
    setPlaceholders(prev => 
      prev.map(p => 
        p.id === dragRef.current.id
          ? { ...p, x: dragRef.current.originalX + dx, y: dragRef.current.originalY + dy }
          : p
      )
    );
  }, [isDragging, viewport.scale]);

  const handleDragStart = (e, id) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      originalX: placeholders.find(p => p.id === id).x,
      originalY: placeholders.find(p => p.id === id).y
    };
  };

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleDownloadSignedPdf = () => {
    if (!signedPdfUrl) {
      setError("No signed document available for download");
      return;
    }
    const link = document.createElement('a');
    link.href = signedPdfUrl;
    link.target = '_blank';
    link.download = `signed_document_${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirm = async () => {
  try {
    setIsLoading(true);
    setError("");

    // Validate required conditions
    if (!numPages) {
      throw new Error("PDF not loaded yet");
    }

    // Verify all signatures are completed
    const allSigned = normalizedPlaceholders.every(p => p.signed);
    if (!allSigned) {
      alert("Please sign all placeholders before confirming");
      return;
    }

    // Prepare request payload
    const normalizedPlaceholders = placeholders.map(placeholder => ({
      ...placeholder,
      x: placeholder.x * (pdfDimensions.width / viewport.width),
      y: pdfDimensions.height - (placeholder.y * (pdfDimensions.height / viewport.height)),
      pageWidth: pdfDimensions.width,
      pageHeight: pdfDimensions.height
    }));

    // Make API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000); // 10 second timeout

    const res = await fetch(`https://docsign-backend.onrender.com/api/docs/${id}/complete`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signatures: normalizedPlaceholders,
        pdfWidth: pdfDimensions.width,
        pdfHeight: pdfDimensions.height
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || res.statusText);
    }

    const data = await res.json();

    if (data.doc?.signedFilePath) {
      const signedUrl = constructFileUrl(data.doc.signedFilePath);
      setSignedPdfUrl(signedUrl);
      setShowSignedPdf(true);
    }

    setShowSuccess(true);
    setIsConfirmed(true);

  } catch (err) {
    console.error("Error completing document:", err);
    
    if (err.name === 'AbortError') {
      setError("Request timed out. Please try again.");
    } else if (err.response?.status === 401) {
      setError("Session expired. Please log in again.");
    } else {
      setError(`Failed to complete document: ${err.message || 'An unexpected error occurred'}`);
    }
  } finally {
    setIsLoading(false);
  }
};
  const handleExit = () => {
    if (placeholders.length > 0 && !isConfirmed) {
      if (window.confirm("You have unsigned placeholders. Are you sure you want to exit?")) {
        navigate("/dashboard");
      }
    } else {
      navigate("/dashboard");
    }
  };

  // PDF document handlers
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setError("");
    console.log('PDF loaded successfully with', numPages, 'pages');
  };

  const onDocumentLoadError = (error) => {
    console.error("PDF load error:", error);
    setError(`Failed to load PDF file: ${error.message || 'Unknown error'}. Please check if the file exists and is accessible.`);
  };

  const onPageLoadSuccess = (page) => {
    const { width, height } = page.getViewport({ scale: 1 });
    setPdfDimensions({ width, height });
    console.log('Page loaded successfully. Dimensions:', { width, height });
  };

  const onRenderSuccess = () => {
    const container = containerRef.current;
    if (container) {
      const pageElement = container.querySelector('.react-pdf__Page');
      if (pageElement) {
        const { width, height } = pageElement.getBoundingClientRect();
        setViewport({
          width,
          height,
          scale: width / 600
        });
      }
    }
  };

  // Show loading state
  if (isLoading && !fileUrl) {
    return (
      <div className="flex min-h-screen bg-gray-100 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md p-4 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Tools</h2>
        {!isConfirmed && (
          <>
            <button
              onClick={() => setIsPlacing(true)}
              className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full ${
                isPlacing ? "ring-2 ring-blue-400" : ""
              }`}
            >
              {isPlacing ? "Click on PDF to place" : "Add Signature Placeholder"}
            </button>
            <button
              onClick={() => setPlaceholders([])}
              disabled={placeholders.length === 0}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 w-full disabled:opacity-50"
            >
              Remove All
            </button>
          </>
        )}
        <button
          onClick={handleDownloadSignedPdf}
          className={`bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 w-full flex items-center justify-center gap-2 ${
            isConfirmed ? "" : "hidden"
          }`}
        >
          <FaDownload /> Download Signed PDF
        </button>
        <div className="flex space-x-2">
          <button
            onClick={handleConfirm}
            disabled={isLoading || isConfirmed || placeholders.length === 0 || !placeholders.every(p => p.signed)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? "Processing..." : (
              <>
                <FaSave /> Confirm
              </>
            )}
          </button>
          <button
            onClick={handleExit}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex-1 flex items-center justify-center gap-2"
          >
            <FaSignOutAlt /> Exit
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-start p-6 relative">
        {showSuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md text-center">
              <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Document Signed Successfully!</h2>
              <p className="text-gray-600 mb-4">You can now download the signed document.</p>
              <button
                onClick={() => setShowSuccess(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-4">
          {isEditMode ? "Edit Signatures" : "Sign Document"}
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-2xl">
            <p className="font-semibold">Error:</p>
            <pre className="whitespace-pre-wrap">{error}</pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {fileUrl && (
          <div className="relative">
            {showSignedPdf && signedPdfUrl ? (
              <div className="border rounded shadow-lg">
                <Document
                  file={signedPdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                      <p>Loading signed PDF...</p>
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center h-64 text-red-600">
                      <p>Error loading signed PDF</p>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    width={600}
                  />
                </Document>
              </div>
            ) : (
              <div
                className="relative"
                onClick={handlePageClick}
                ref={containerRef}
              >
                <Document
                  file={fileUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                      <p>Loading PDF...</p>
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center h-64 text-red-600">
                      <p>Error loading PDF</p>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    width={600}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    inputRef={pageRef}
                    onLoadSuccess={onPageLoadSuccess}
                    onRenderSuccess={onRenderSuccess}
                  />
                </Document>

                {/* Signature Placeholders */}
                {(!isConfirmed || isEditMode) && placeholders
                  .filter(ph => ph.page === pageNumber)
                  .map(ph => (
                    <div
                      key={ph.id}
                      onMouseDown={(e) => handleDragStart(e, ph.id)}
                      style={{
                        position: "absolute",
                        top: `${ph.y}px`,
                        left: `${Math.max(0, ph.x)}px`,
                        zIndex: 10,
                        cursor: isDragging && dragRef.current?.id === ph.id ? 'grabbing' : 'grab'
                      }}
                      className={`${ph.showBox ? 'w-40 h-12 border-2 border-dashed border-yellow-600 bg-yellow-100/50' : ''} flex items-center justify-center`}
                    >
                      {ph.signed ? (
                        <div className="flex items-center gap-2 p-1">
                          {ph.signatureType === "text" ? (
                            <span className="text-gray-800 font-bold text-sm">
                              {ph.signature}
                            </span>
                          ) : (
                            <img
                              src={ph.signature}
                              alt="Signature"
                              className="max-h-10 max-w-[150px] object-contain"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTAwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRkZGIi8+Cjx0ZXh0IHg9IjUwIiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TaWduYXR1cmU8L3RleHQ+Cjwvc3ZnPg==';
                                e.target.alt = 'Signature image not available';
                              }}
                            />
                          )}
                          {(!isConfirmed || isEditMode) && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(ph.id);
                                }}
                                className="bg-yellow-500 text-white p-1 rounded text-xs"
                                title="Edit"
                              >
                                <FaEdit size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemove(ph.id);
                                }}
                                className="bg-red-500 text-white p-1 rounded text-xs"
                                title="Remove"
                              >
                                <FaTimes size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSignPlaceholder(ph.id);
                            }}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                          >
                            Sign
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(ph.id);
                            }}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Page navigation */}
        {numPages > 1 && (
          <div className="flex items-center justify-center mt-6 gap-4">
            <button
              onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
              disabled={pageNumber === 1}
              className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-lg font-medium">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
              disabled={pageNumber === numPages}
              className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Signature</h2>
            <div className="flex border-b mb-4">
              <button
                className={`px-4 py-2 ${activeSignatureTab === "text" ? "border-b-2 border-blue-500" : ""}`}
                onClick={() => setActiveSignatureTab("text")}
              >
                Text
              </button>
              <button
                className={`px-4 py-2 ${activeSignatureTab === "draw" ? "border-b-2 border-blue-500" : ""}`}
                onClick={() => setActiveSignatureTab("draw")}
              >
                Draw
              </button>
              <button
                className={`px-4 py-2 ${activeSignatureTab === "upload" ? "border-b-2 border-blue-500" : ""}`}
                onClick={() => setActiveSignatureTab("upload")}
              >
                Upload
              </button>
            </div>

            {activeSignatureTab === "text" && (
              <div className="mb-4">
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="Enter your signature"
                  className="w-full p-2 border rounded"
                />
              </div>
            )}

            {activeSignatureTab === "draw" && (
              <div className="mb-4">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="border rounded bg-white cursor-crosshair w-full"
                />
                <button
                  onClick={clearCanvas}
                  className="mt-2 bg-gray-300 px-3 py-1 rounded"
                >
                  Clear
                </button>
              </div>
            )}

            {activeSignatureTab === "upload" && (
              <div className="mb-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full p-2 border rounded"
                />
                {signatureImage && (
                  <div className="mt-2">
                    <img
                      src={signatureImage}
                      alt="Signature preview"
                      className="max-h-20 max-w-full object-contain border rounded"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSignModal(false);
                  setSignatureText("");
                  setSignatureImage(null);
                  setSignatureData(null);
                  clearCanvas();
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={applySignature}
                disabled={!signatureData && !signatureText}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Apply Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignPage;