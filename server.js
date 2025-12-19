// index.js

/**
 * Ключевые константы:
 * 1. OPENWEATHER_API_KEY: Берется из переменных окружения AWS Lambda.
 * 2. GEO_API_URL: Адрес бесплатного сервиса для GeoLocation по IP.
 */
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const GEO_API_URL = "http://ip-api.com/json/"; 

/**
 * Основной обработчик AWS Lambda.
 * @param {object} event - Объект, переданный API Gateway (содержит IP клиента).
 */
exports.handler = async (event, context) => {
    
    // --- 1. ИЗВЛЕЧЕНИЕ IP КЛИЕНТА ---
    
    // IP находится в event.requestContext.http.sourceIp (для HTTP API)
    const clientIp = event.requestContext.http.sourceIp; 

    // Проверка, если IP не найден или это локальный тестовый IP
    if (!clientIp || clientIp === '127.0.0.1') {
        console.warn('IP not found or is test IP. Returning error.');
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Client IP address is required." }),
        };
    }

    try {
        // --- 2. ЗАПРОС GEO LOCATION (IP -> Координаты) ---
        
        const geoResponse = await fetch(`${GEO_API_URL}${clientIp}`);
        
        if (!geoResponse.ok) {
            console.error('Geo API failed:', geoResponse.status, geoResponse.statusText);
            return { statusCode: 502, body: JSON.stringify({ message: "External Geo API is unavailable." }) };
        }
        
        const geoData = await geoResponse.json();

        if (geoData.status !== 'success' || !geoData.lat || !geoData.lon) {
            console.error('Geo API returned error status:', geoData);
            return { statusCode: 404, body: JSON.stringify({ message: "Could not geolocate IP." }) };
        }

        const { lat, lon, city } = geoData; // Получаем широту, долготу и название города

        // --- 3. ЗАПРОС OPENWEATHERMAP (Координаты -> Погода) ---
        
        if (!OPENWEATHER_API_KEY) {
             console.error('OPENWEATHER_API_KEY is missing!');
             return { statusCode: 500, body: JSON.stringify({ message: "API key is missing in environment variables." }) };
        }
        
        // Запрос погоды. units=metric для Цельсия, lang=ru для русского описания
        const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ru`;

        const weatherResponse = await fetch(weatherApiUrl);

        if (!weatherResponse.ok) {
            console.error('Weather API failed:', weatherResponse.status, weatherResponse.statusText);
            return { statusCode: 502, body: JSON.stringify({ message: "External Weather API is unavailable." }) };
        }

        const weatherData = await weatherResponse.json();

        // --- 4. ФОРМИРОВАНИЕ ОТВЕТА ---

        const finalResponse = {
            city: city, // Город, полученный из Geo API
            temperature: Math.round(weatherData.main.temp), // Округляем температуру
            weatherDescription: weatherData.weather[0].description, // Описание погоды
            weatherIcon: weatherData.weather[0].icon, // Код иконки для фронтенда
            feelsLike: Math.round(weatherData.main.feels_like)
        };
        
        // Возвращаем HTTP-ответ
        return {
            statusCode: 200,
            headers: {
                // Обязательно для CORS! Разрешаем любому фронтенду запрашивать наш API
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(finalResponse),
        };

    } catch (error) {
        console.error("Critical error in Lambda handler:", error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ message: "An unexpected error occurred." }) 
        };
    }
};