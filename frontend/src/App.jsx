import "./App.css";
import { useRef, useState, useEffect } from "react";
import { UploadCloud } from "lucide-react";

function App() {
  const fileInputRef = useRef();
  const [imageName, setImageName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [compressedReady, setCompressedReady] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageName(file.name);
    setUploadedFileName(file.name);
    setUploading(true);
    setSuccess(false);
    setCompressedReady(false);

    const uploadUrl = `https://uploaded-images-825765422669.s3.amazonaws.com/${encodeURIComponent(file.name)}`;

    try {
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });
      setSuccess(true);
    } catch (error) {
      console.error("Upload failed", error);
      setSuccess(false);
    }

    setUploading(false);
  };

  const compressedUrl = uploadedFileName
    ? `https://processed-images-825765422669.s3.amazonaws.com/compressed-${encodeURIComponent(
        uploadedFileName
      )}`
    : null;

  // Check if compressed image exists every 5 seconds
  useEffect(() => {
    if (!uploadedFileName) return;
  
    const interval = setInterval(async () => {
      const url = `https://processed-images-825765422669.s3.amazonaws.com/compressed-${encodeURIComponent(uploadedFileName)}`;
      try {
        const response = await fetch(url, { method: "GET", mode: "cors" });
        if (response.ok) {
          setCompressedReady(true);
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Error checking compressed image", error);
        console.log("Compressed image not ready yet...");
      }
    }, 2000);
  
    return () => clearInterval(interval);
  }, [uploadedFileName]);
  

  return (
    <div className="text-white flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Compress Image</h1>

      <button
        className="bg-white text-white-900 flex items-center gap-2 px-6 py-2 rounded-xl shadow-lg hover:bg-gray-200 transition"
        onClick={() => fileInputRef.current.click()}
        disabled={uploading}
      >
        <UploadCloud size={20} />
        {uploading ? "Uploading..." : "Upload"}
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        className="hidden"
        accept="image/*"
      />

      {imageName && (
        <p className="mt-4 text-sm text-gray-400">
          Selected: <span className="font-medium">{imageName}</span>
        </p>
      )}

      {success && (
        <p className="mt-2 text-green-400 font-semibold">Image uploaded successfully!</p>
      )}

      {success && !compressedReady && (
        <p className="mt-4 text-yellow-400 font-medium animate-pulse">
          Processing image, please wait...
        </p>
      )}

      {compressedReady && (
        <div className="mt-6">
          <a
            href={compressedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            See Compressed Image
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
