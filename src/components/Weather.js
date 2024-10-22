import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Sun, Moon, Droplet, Wind, Thermometer } from 'lucide-react';

const API_KEY = '3889ea1dcb16cbb77780ce07315b6574';
const CITIES = ['Delhi', 'Mumbai', 'Chennai', 'Bangalore', 'Kolkata', 'Hyderabad'];
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

const WeatherDashboard = () => {
  const [weatherData, setWeatherData] = useState({});
  const [dailySummaries, setDailySummaries] = useState({});
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [searchCity, setSearchCity] = useState(''); // Search city input
  const [unit, setUnit] = useState('C');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alertThreshold, setAlertThreshold] = useState(35);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchAllCitiesWeather = async () => {
      setLoading(true);
      const newWeatherData = {};
      for (const city of CITIES) {
        try {
          const data = await fetchWeather(city);
          newWeatherData[city] = data;
          updateDailySummary(city, data);
          checkAlerts(city, data);
        } catch (err) {
          console.error(`Error fetching data for ${city}:`, err);
          setError(`Error fetching data for ${city}: ${err.message}`); // Set error state
        }
      }
      setWeatherData(newWeatherData);
      setLoading(false);
    };

    fetchAllCitiesWeather();
    const interval = setInterval(fetchAllCitiesWeather, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const fetchWeather = async (city) => {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`
    );
    if (!response.ok) throw new Error('City not found or API limit exceeded');
    return await response.json();
  };

  // New function to fetch weather for the searched city
  const fetchSearchedCityWeather = async (city) => {
    if (city && city.trim() !== '') {
      try {
        const data = await fetchWeather(city.trim());
        setWeatherData((prev) => ({ ...prev, [city]: data }));
        updateDailySummary(city, data);
        checkAlerts(city, data);
        setSelectedCity(city); // Set the selected city to the searched city
        setSearchCity(''); // Clear the search input
        setError(null); // Clear any previous errors
      } catch (err) {
        setError(`Error fetching data for ${city}: ${err.message}`);
      }
    }
  };

  const updateDailySummary = (city, data) => {
    const date = new Date().toDateString();
    setDailySummaries((prev) => {
      const cityData = prev[city] || {};
      const dayData = cityData[date] || { temps: [], conditions: {} };

      return {
        ...prev,
        [city]: {
          ...cityData,
          [date]: {
            temps: [...dayData.temps, data.list[0].main.temp],
            conditions: {
              ...dayData.conditions,
              [data.list[0].weather[0].main]: (dayData.conditions[data.list[0].weather[0].main] || 0) + 1,
            },
          },
        },
      };
    });
  };

  const checkAlerts = (city, data) => {
    if (data.list[0].main.temp > alertThreshold) {
      setAlerts((prev) => [...prev, `Alert: Temperature in ${city} exceeds ${alertThreshold}°C`]);
    }
  };

  const convertTemp = (temp, toUnit) => {
    if (toUnit === 'F') return ((temp * 9) / 5 + 32).toFixed(1);
    if (toUnit === 'K') return (temp + 273.15).toFixed(1);
    return temp.toFixed(1);
  };

  const getDailySummary = (city) => {
    const date = new Date().toDateString();
    const summary = dailySummaries[city]?.[date];
    if (!summary) return null;

    const avgTemp = summary.temps.reduce((a, b) => a + b, 0) / summary.temps.length;
    const maxTemp = Math.max(...summary.temps);
    const minTemp = Math.min(...summary.temps);
    const dominantCondition = Object.entries(summary.conditions).reduce((a, b) => (a[1] > b[1] ? a : b))[0];

    return { avgTemp, maxTemp, minTemp, dominantCondition };
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white p-4 rounded-lg shadow-lg">
      {error}
    </div>
  );

  const currentWeather = weatherData[selectedCity];
  if (!currentWeather) return null;

  const hourlyForecast = currentWeather.list.slice(0, 8);
  const summary = getDailySummary(selectedCity); // Move this outside the JSX return

  return (
    <div className={`min-h-screen p-8 ${getBackgroundClass(currentWeather)} transition-colors duration-500`}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="p-2 rounded-lg bg-white"
          >
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search city..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="p-2 rounded-lg bg-white ml-2"
          />
          <button
            onClick={() => fetchSearchedCityWeather(searchCity)}
            className="p-2 rounded-lg bg-blue-500 text-white ml-2"
          >
            Search
          </button>

          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="p-2 rounded-lg bg-white"
          >
            <option value="C">Celsius</option>
            <option value="F">Fahrenheit</option>
            <option value="K">Kelvin</option>
          </select>
        </div>

        <div className="bg-white bg-opacity-80 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">
            {selectedCity}, {currentWeather.city.country}
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-5xl font-bold">{convertTemp(currentWeather.list[0].main.temp, unit)}°{unit}</p>
              <p className="text-xl">{currentWeather.list[0].weather[0].description}</p>
            </div>
            <img
              src={`https://openweathermap.org/img/wn/${currentWeather.list[0].weather[0].icon}@4x.png`}
              alt={currentWeather.list[0].weather[0].description}
              className="w-24 h-24"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex items-center">
              <Thermometer className="mr-2" />
              <span>Feels like: {convertTemp(currentWeather.list[0].main.feels_like, unit)}°{unit}</span>
            </div>
            <div className="flex items-center">
              <Droplet className="mr-2" />
              <span>Humidity: {currentWeather.list[0].main.humidity}%</span>
            </div>
            <div className="flex items-center">
              <Wind className="mr-2" />
              <span>Wind: {currentWeather.list[0].wind.speed} m/s</span>
            </div>
            <div className="flex items-center">
              {currentWeather.list[0].sys.pod === 'd' ? <Sun className="mr-2" /> : <Moon className="mr-2" />}
              <span>{currentWeather.list[0].sys.pod === 'd' ? 'Day' : 'Night'}</span>
            </div>
          </div>
        </div>

        {/* Updated BarChart */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Hourly Forecast</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyForecast.map(item => ({
                time: new Date(item.dt * 1000).getHours() + ':00',
                temp: convertTemp(item.main.temp, unit)
              }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="temp" fill="#1a83c486" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary section */}
        <div className="bg-white bg-opacity-80 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Daily Summary</h3>
          {summary ? (
            <div>
              <p>Average Temperature: {convertTemp(summary.avgTemp, unit)}°{unit}</p>
              <p>Maximum Temperature: {convertTemp(summary.maxTemp, unit)}°{unit}</p>
              <p>Minimum Temperature: {convertTemp(summary.minTemp, unit)}°{unit}</p>
              <p>Dominant Condition: {summary.dominantCondition}</p>
              <p className="mt-4">Today is a great day to enjoy outdoor activities, as the temperature is comfortable with some sunshine expected!</p>
            </div>
          ) : (
            <p>No data available for today.</p>
          )}
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="bg-red-500 text-white p-4 rounded-lg shadow-lg">
            <h3 className="font-bold">Alerts</h3>
            <ul>
              {alerts.map((alert, index) => (
                <li key={index}>{alert}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const getBackgroundClass = (weatherData) => {
  const condition = weatherData?.list[0]?.weather[0]?.main;
  if (condition === 'Clear') return 'bg-blue-100';
  if (condition === 'Clouds') return 'bg-gray-200';
  if (condition === 'Rain') return 'bg-blue-200';
  if (condition === 'Snow') return 'bg-white';
  return 'bg-gray-300';
};

export default WeatherDashboard;
