export default async function handler(req, res) {
    // Исправление: берем только первый IP из списка, если их несколько
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : '8.8.8.8';

    try {
        console.log("Checking weather for IP:", ip);

        const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
        const geoData = await geoRes.json();
        
        if (geoData.status !== 'success') {
            throw new Error(`Geo API failed: ${geoData.message}`);
        }

        const { lat, lon, city } = geoData;
        const KEY = process.env.OPENWEATHER_API_KEY;

        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${KEY}&units=metric&lang=ru`);
        
        if (!weatherRes.ok) {
            throw new Error(`Weather API returned status ${weatherRes.status}`);
        }

        const weatherData = await weatherRes.json();

        res.status(200).json({
            city: city,
            temp: Math.round(weatherData.main.temp),
            description: weatherData.weather[0].description
        });
    } catch (error) {
        // Выводим реальную ошибку в логи Vercel
        console.error("API Error Detail:", error.message);
        res.status(500).json({ error: "Failed to fetch data", details: error.message });
    }
}