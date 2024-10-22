import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Sun, Moon, Droplet, Wind, Thermometer } from 'lucide-react';

const API_KEY = "3889ea1dcb16cbb77780ce07315b6574";
const CITIES = ["Delhi", "Mumbai", "Chennai", "Bangalore", "Kolkata", "Hyderabad"];
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
      `https://api.openweathermap.org/data/2.5/forecast?q=${city},IN&units=metric&appid=${API_KEY}`
    );
    if (!response.ok) throw new Error('City not found');
    return await response.json();
  };

  // New function to fetch weather for the searched city
  const fetchSearchedCityWeather = async (city) => {
    if (city && city.trim() !== '') {
      try {
        const data = await fetchWeather(city.trim());
        setWeatherData(prev => ({ ...prev, [city]: data }));
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
    setDailySummaries(prev => {
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
              [data.list[0].weather[0].main]: (dayData.conditions[data.list[0].weather[0].main] || 0) + 1
            }
          }
        }
      };
    });
  };

  const checkAlerts = (city, data) => {
    if (data.list[0].main.temp > alertThreshold) {
      setAlerts(prev => [...prev, `Alert: Temperature in ${city} exceeds ${alertThreshold}°C`]);
    }
  };

  const convertTemp = (temp, toUnit) => {
    if (toUnit === "F") return ((temp * 9 / 5) + 32).toFixed(1);
    if (toUnit === "K") return (temp + 273.15).toFixed(1);
    return temp.toFixed(1);
  };

  const getDailySummary = (city) => {
    const date = new Date().toDateString();
    const summary = dailySummaries[city]?.[date];
    if (!summary) return null;

    const avgTemp = summary.temps.reduce((a, b) => a + b, 0) / summary.temps.length;
    const maxTemp = Math.max(...summary.temps);
    const minTemp = Math.min(...summary.temps);
    const dominantCondition = Object.entries(summary.conditions).reduce((a, b) => a[1] > b[1] ? a : b)[0];

    return { avgTemp, maxTemp, minTemp, dominantCondition };
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-4">{error}</div>;

  const currentWeather = weatherData[selectedCity];
  if (!currentWeather) return null;

  const hourlyForecast = currentWeather.list.slice(0, 8);

  return (
    <div className={`min-h-screen p-8 ${getBackgroundClass(currentWeather)} transition-colors duration-500`}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <select 
            value={selectedCity} 
            onChange={(e) => setSelectedCity(e.target.value)}
            className="p-2 rounded-lg bg-white"
          >
            {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
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
          <h2 className="text-2xl font-bold mb-4">{selectedCity}, {currentWeather.city.country}</h2>
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

        <div className="bg-white bg-opacity-80 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Daily Summary</h3>
          {getDailySummary(selectedCity) ? (
            <div>
              <p>Average Temp: {convertTemp(getDailySummary(selectedCity).avgTemp, unit)}°{unit}</p>
              <p>Max Temp: {convertTemp(getDailySummary(selectedCity).maxTemp, unit)}°{unit}</p>
              <p>Min Temp: {convertTemp(getDailySummary(selectedCity).minTemp, unit)}°{unit}</p>
              <p>Dominant Condition: {getDailySummary(selectedCity).dominantCondition}</p>
            </div>
          ) : (
            <p>No daily summary available.</p>
          )}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={hourlyForecast}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dt_txt" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="main.temp" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourlyForecast}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dt_txt" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="main.temp" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {alerts.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
          {alerts.map((alert, index) => <div key={index}>{alert}</div>)}
        </div>
      )}
    </div>
  );
};

const getBackgroundClass = (currentWeather) => {
  if (currentWeather.list[0].weather[0].main === "Clear") return "bg-blue-300";
  if (currentWeather.list[0].weather[0].main === "Rain") return "bg-gray-400";
  if (currentWeather.list[0].weather[0].main === "Snow") return "bg-white";
  return "bg-gray-200";
};

export default WeatherDashboard;
