# Project Structure: Next.js Weather App

This document outlines the pages and data models for the Next.js frontend of the weather application.

## Pages

### 1. Home Page (`/`)

The main landing page of the application.

- **URL**: `/`
- **Components**:
    - `SearchBar`: For finding new locations.
    - `CurrentWeatherCard`: Displays the current weather conditions for the selected location.
    - `HourlyTimeline`: Shows the weather forecast for the next 24 hours (reusing/refactoring the existing component).
    - `WeeklyForecast`: A list showing the forecast for the next 7 days.
    - `Header`: Contains navigation, settings icon, and maybe the current location name.

### 2. Location Details Page (`/location/[city]`)

A page to display detailed weather information for a specific location.

- **URL**: `/location/[city]` (e.g., `/location/yangon`)
- **Functionality**: This page will be similar to the Home Page but will be dedicated to a specific city passed in the URL. This is useful for sharing and bookmarking.

### 3. Settings Page (`/settings`)

A page for users to customize their experience.

- **URL**: `/settings`
- **Components**:
    - `UnitSelector`: Toggle between Celsius/Fahrenheit.
    - `LanguageSelector`: Toggle between English and Burmese.
    - `ThemeSwitcher`: Toggle between light and dark mode.
    - `LocationManager`: Add, remove, and reorder saved locations.

## Data Models (Frontend)

These models define the structure of the data used within the React components.

### `CurrentWeather`

```json
{
  "location": "Yangon, MM",
  "temperature": 32,
  "feelsLike": 38,
  "condition": "Partly Cloudy",
  "weatherCode": 1001,
  "windSpeed": 10,
  "windDirection": "SW",
  "humidity": 75,
  "pressure": 1012,
  "visibility": 16,
  "uvIndex": 8
}
```

### `HourlyForecast`

Represents a single hour in the forecast. An array of these will be used for the hourly timeline.

```json
{
  "time": "2023-10-27T14:00:00Z",
  "temperature": 31,
  "precipitationProbability": 20,
  "weatherCode": 1001
}
```

### `DailyForecast`

Represents a single day in the weekly forecast.

```json
{
  "date": "2023-10-28",
  "tempMax": 34,
  "tempMin": 25,
  "weatherCode": 1000,
  "sunrise": "2023-10-28T06:05:00Z",
  "sunset": "2023-10-28T17:35:00Z"
}
```

### `Location`

Used for search results and saved locations.

```json
{
  "name": "Yangon",
  "lat": 16.8409,
  "lon": 96.1735,
  "country": "Myanmar"
}
```

### `Settings`

Represents the user's preferences, to be stored in local storage.

```json
{
  "units": "metric",
  "language": "en",
  "theme": "dark",
  "locations": [
    { "name": "Yangon", "lat": 16.8409, "lon": 96.1735, "country": "Myanmar" },
    { "name": "Mandalay", "lat": 21.9588, "lon": 96.0891, "country": "Myanmar" }
  ]
}
```
