# React Weather App

This is a simple weather application built with React and Vite. It uses the Tomorrow.io and OpenCage APIs to fetch weather and geocoding data.

## Features

*   **Current Weather:** View the current weather conditions for your location.
*   **Hourly & Daily Forecasts:** See the weather forecast for the next 24 hours and the next 7 days.
*   **Search:** Search for any city to get its weather data.
*   **Settings:** Customize the theme (dark/light), temperature units (°C/°F), and language (English/Burmese).
*   **Location Management:** Save your favorite locations for quick access.

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v16 or later)
*   [npm](https://www.npmjs.com/) (or [Yarn](https://yarnpkg.com/))

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up API Keys:**

    You'll need to get API keys from the following services:

    *   [**Tomorrow.io**](https://www.tomorrow.io/weather-api/) for weather data.
    *   [**OpenCage Geocoder**](https://opencagedata.com/) for geocoding city names.

    Once you have your keys, create a `.env.local` file in the root of the project and add your keys like this:

    ```
    VITE_TOMORROW_IO_API_KEY=your_tomorrow_io_api_key
    VITE_OPENCAGE_API_KEY=your_opencage_api_key
    ```

    Ensure the `src/services/weatherService.js` file correctly imports and uses these environment variables.

### Running the Development Server

To start the development server, run:

```bash
npm run dev
```

This will start the application on `http://localhost:5173` (or another port if 5173 is busy).

## Available Scripts

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm run preview`: Previews the production build locally.

## Project Structure

*   `src/components`: Contains all the React components.
*   `src/context`: Contains the React Context for state management.
*   `src/pages`: Contains the page components for each route.
*   `src/services`: Contains the services for fetching data from external APIs.
*   `src/main.jsx`: The main entry point for the application.
