const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const ADS_FILE = path.join(__dirname, 'ads.json');

// Initialize ads.json
async function initAdsFile() {
    try {
        await fs.access(ADS_FILE);
    } catch {
        const initialAds = [
            { id: 1, title: "ماشین اسپرت", price: "500,000", gameId: "G123", playerName: "Player1", description: "ماشین اسپرت تمیز", category: "cars", image: "https://via.placeholder.com/150", details: "ماشین اسپرت با موتور قوی، تمیز، بیمه تا پایان سال", published: true },
            { id: 2, title: "موتور سنگین", price: "200,000", gameId: "G124", playerName: "Player2", description: "موتور سنگین وارداتی", category: "motorcycles", image: "https://via.placeholder.com/150", details: "موتور سنگین وارداتی، کم کارکرد", published: true },
            { id: 3, title: "خانه ویلایی", price: "2,000,000", gameId: "G125", playerName: "Player3", description: "خانه ویلایی لوکس", category: "houses", image: "https://via.placeholder.com/150", details: "خانه ویلایی با امکانات کامل", published: true },
            { id: 4, title: "لپ‌تاپ گیمینگ", price: "50,000", gameId: "G126", playerName: "Player4", description: "لپ‌تاپ گیمینگ قدرتمند", category: "items", image: "https://via.placeholder.com/150", details: "لپ‌تاپ گیمینگ با مشخصات بالا", published: true },
            { id: 5, title: "دوچرخه حرفه‌ای", price: "10,000", gameId: "G127", playerName: "Player5", description: "دوچرخه کوهستان", category: "others", image: "https://via.placeholder.com/150", details: "دوچرخه کوهستان مناسب برای حرفه‌ای‌ها", published: true }
        ];
        await fs.writeFile(ADS_FILE, JSON.stringify(initialAds, null, 2));
    }
}

// Routes
app.get('/api/ads', async (req, res) => {
    try {
        const data = await fs.readFile(ADS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});