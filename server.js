const express = require('express');
const cors = require('cors');
const axios = require('axios');
const OpenAI = require('openai');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cache = new NodeCache({ stdTTL: 86400 }); // Cache de 24h

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const ImageSchema = new mongoose.Schema({
    url: String,
    tags: [String],
});

const Image = mongoose.model('Image', ImageSchema);

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

async function refineQuery(query) {
    const cachedQuery = cache.get(query);
    if (cachedQuery) {
        return cachedQuery;
    }
    
    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "system", content: "Tu es un moteur de recherche intelligent pour des images." },
                   { role: "user", content: `Améliore cette requête de recherche d'images : ${query}` }]
    });
    const refinedQuery = response.choices[0].message.content;
    cache.set(query, refinedQuery);
    return refinedQuery;
}

async function indexImage(url, description) {
    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "system", content: "Analyse cette image et génère une liste de mots-clés pertinents." },
                   { role: "user", content: `Image URL: ${url}\nDescription: ${description}` }]
    });
    const tags = response.choices[0].message.content.toLowerCase().split(',').map(tag => tag.trim());
    const image = new Image({ url, tags });
    await image.save();
}

app.post('/index', async (req, res) => {
    const { url, description } = req.body;
    if (!url || !description) return res.status(400).json({ error: "URL et description requis" });

    try {
        await indexImage(url, description);
        res.json({ message: "Image indexée avec succès" });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'indexation de l'image" });
    }
});

app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier envoyé" });

    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const description = req.body.description || "";

    try {
        await indexImage(imageUrl, description);
        res.json({ message: "Image uploadée et indexée", url: imageUrl });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'indexation de l'image" });
    }
});

app.get('/search', async (req, res) => {
    const userQuery = req.query.q;
    if (!userQuery) return res.status(400).json({ error: "Aucune requête fournie" });

    try {
        const refinedQuery = await refineQuery(userQuery);
        const keywords = refinedQuery.toLowerCase().split(' ');
        const results = await Image.find({ tags: { $all: keywords } });
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'analyse de la requête" });
    }
});

app.delete('/delete/:id', async (req, res) => {
    try {
        await Image.findByIdAndDelete(req.params.id);
        res.json({ message: "Image supprimée avec succès" });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la suppression de l'image" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
