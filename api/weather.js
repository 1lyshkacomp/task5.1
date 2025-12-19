
export default async function handler(req, res) {
    // 1. Получаем IP (Vercel прокидывает его в заголовках)
    const ip = req.headers['x-forwarded-for'] || '8.8.8.8';
    const GEO_API = `http://ip-api.com/json/${ip}`;

    try {
        // 2. Геолокация
        const geoRes = await fetch(GEO_API);
        const geoData = await geoRes.json();
        
        const { lat, lon, city } = geoData;

        // 3. Погода (OpenWeather)
        const KEY = process.env.OPENWEATHER_API_KEY;
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${KEY}&units=metric&lang=ru`;
        
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        // 4. Ответ
        res.status(200).json({
            city: city,
            temp: Math.round(weatherData.main.temp),
            description: weatherData.weather[0].description
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch data" });
    }
}