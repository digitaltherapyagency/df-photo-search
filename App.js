import { useState } from "react";
import axios from "axios";

export default function App() {
  const [query, setQuery] = useState("");
  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState("");

  const searchImages = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/search?q=${query}`);
      setImages(response.data);
    } catch (error) {
      console.error("Erreur de recherche", error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const uploadImage = async () => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append("image", file);
    formData.append("description", description);
    
    try {
      await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Image uploadée avec succès");
      setFile(null);
      setPreview(null);
      setDescription("");
      searchImages();
    } catch (error) {
      console.error("Erreur lors de l'upload", error);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Recherche d'Images</h1>
      <input 
        type="text" 
        placeholder="Rechercher des images..." 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
        className="border p-2 w-full mb-2" 
      />
      <button onClick={searchImages} className="bg-blue-500 text-white px-4 py-2 rounded w-full mb-4">Rechercher</button>
      
      <h2 className="text-lg font-semibold mb-2">Uploader une image</h2>
      <input 
        type="file" 
        onChange={handleFileChange} 
        className="border p-2 w-full mb-2" 
      />
      {preview && <img src={preview} alt="Aperçu" className="w-full h-32 object-cover mb-2" />}
      <input 
        type="text" 
        placeholder="Description de l'image" 
        value={description} 
        onChange={(e) => setDescription(e.target.value)} 
        className="border p-2 w-full mb-2" 
      />
      <button onClick={uploadImage} className="bg-green-500 text-white px-4 py-2 rounded w-full mb-4">Uploader</button>
      
      <h2 className="text-lg font-semibold mb-2">Résultats</h2>
      <div className="grid grid-cols-2 gap-4">
        {images.map((img) => (
          <img key={img._id} src={img.url} alt="result" className="w-full h-32 object-cover" />
        ))}
      </div>
    </div>
  );
}