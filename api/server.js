const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// داده‌های موقت
let adsData = [
    { id: 1, title: "ماشین اسپرت", price: "500,000", gameId: "G123", playerName: "Player1", description: "ماشین اسپرت تمیز", category: "cars", images: ["https://via.placeholder.com/150"], details: "ماشین اسپرت با موتور قوی، تمیز، بیمه تا پایان سال", published: true, createdAt: new Date().toISOString() },
    { id: 2, title: "موتور سنگین", price: "200,000", gameId: "G124", playerName: "Player2", description: "موتور سنگین وارداتی", category: "motorcycles", images: ["https://via.placeholder.com/150"], details: "موتور سنگین وارداتی، کم کارکرد", published: true, createdAt: new Date().toISOString() },
    { id: 3, title: "خانه ویلایی", price: "2,000,000", gameId: "G125", playerName: "Player3", description: "خانه ویلایی لوکس", category: "houses", images: ["https://via.placeholder.com/150"], location: "LV", details: "خانه ویلایی با امکانات کامل", published: true, createdAt: new Date().toISOString() },
    { id: 4, title: "لپ‌تاپ گیمینگ", price: "50,000", gameId: "G126", playerName: "Player4", description: "لپ‌تاپ گیمینگ قدرتمند", category: "items", images: ["https://via.placeholder.com/150"], details: "لپ‌تاپ گیمینگ با مشخصات بالا", published: true, createdAt: new Date().toISOString() },
    { id: 5, title: "دوچرخه حرفه‌ای", price: "10,000", gameId: "G127", playerName: "Player5", description: "دوچرخه کوهستان", category: "others", images: ["https://via.placeholder.com/150"], details: "دوچرخه کوهستان مناسب برای حرفه‌ای‌ها", published: true, createdAt: new Date().toISOString() }
];

// Routes
app.get('/api/ads', (req, res) => {
    res.json(adsData);
});

app.post('/api/ads', (req, res) => {
    const newAd = {
        id: Date.now(),
        ...req.body,
        published: false,
        createdAt: new Date().toISOString()
    };
    adsData.push(newAd);
    res.json(newAd);
});

app.put('/api/ads/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = adsData.findIndex(ad => ad.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Ad not found' });
    }
    
    adsData[index] = { ...adsData[index], ...req.body };
    res.json(adsData[index]);
});

app.delete('/api/ads/:id', (req, res) => {
    const id = parseInt(req.params.id);
    adsData = adsData.filter(ad => ad.id !== id);
    res.json({ success: true });
});

// Handle all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
