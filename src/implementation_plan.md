# Next.js Weather App: Implementation Plan

This document outlines the 10-phase implementation plan for developing the Next.js weather application frontend.

### Phase 1: Project Setup and Basic Layout
- Initialize a new Next.js project with Tailwind CSS.
- Create the basic file and folder structure (`components`, `pages`, `lib`, `styles`).
- Create a main layout component (`Layout.js`) that includes a header and footer.
- Set up basic routing for Home (`/`), Location (`/location/[city]`), and Settings (`/settings`) pages.

### Phase 2: Home Page UI - Current Weather
- Create the `CurrentWeatherCard` component.
- Use static/mock data to populate the card.
- Style the card using Tailwind CSS, including light/dark mode support.
- Create the `SearchBar` component UI (no functionality yet).
- Integrate these components into the Home page.

### Phase 3: Home Page UI - Forecasts
- Refactor the existing `HourlyTimeline.jsx` component to fit the new structure and use the `HourlyForecast` model.
- Create the `WeeklyForecast` component UI.
- Populate both components with mock data.
- Integrate them into the Home page.

### Phase 4: Data Fetching Logic
- Identify a free weather API (e.g., OpenWeatherMap, WeatherAPI, or Tomorrow.io).
- Create a service/utility module (`lib/weatherApi.js`) to handle API calls.
- Implement functions to fetch current weather, hourly forecast, and daily forecast.
- Replace mock data on the Home page with live data for a default location.

### Phase 5: Search Functionality
- Implement the logic for the `SearchBar` component.
- On submitting the search, call a geo-location or search endpoint from the weather API.
- Update the application state with the new location's weather data.
- Implement the dynamic `[city]` page to display weather for the searched location.

### Phase 6: State Management for Settings
- Create a React Context or use a state management library (like Zustand or Redux Toolkit) for managing global settings (units, language, theme).
- Implement logic to persist settings to `localStorage`.
- Wrap the application in the state provider.

### Phase 7: Implementing Settings Page
- Build the UI for the Settings page (`/settings`).
- Create the `UnitSelector`, `LanguageSelector`, and `ThemeSwitcher` components.
- Connect these components to the global settings state.
- Ensure that changing a setting (e.g., from Celsius to Fahrenheit) updates the display across the application.

### Phase 8: Dark Mode and Theming
- Ensure all components correctly adapt to the theme setting from the global state.
- Use Tailwind's `dark:` variant and CSS variables for easy theme switching.
- Fine-tune colors and styles for both light and dark modes for a polished look.

### Phase 9: Location Management
- Implement the `LocationManager` component on the Settings page.
- Allow users to add the current location to a list of saved locations.
- Allow users to view, select, and delete locations from their saved list.
- Persist the list of saved locations in `localStorage` via the settings state.

### Phase 10: Refinement and Deployment
- Add loading and error states for all data-fetching operations.
- Perform a full review of the UI for responsiveness and consistency.
- Add basic accessibility features (ARIA labels, semantic HTML).
- Prepare the application for deployment (e.g., on Vercel or Netlify).
- Write a `README.md` with instructions on how to set up and run the project.

## Dependencies and Tools

- React 18+
- TypeScript
- Redux Toolkit
- React Router 6
- Tailwind CSS
- Axios
- Jest
- React Testing Library
- Cypress
- ESLint
- Prettier

## Success Criteria

- All pages implemented according to structure
- Complete test coverage
- Responsive design working on all devices
- Performance metrics meeting targets
- Accessibility standards met
- Documentation complete
- Ready for backend integration
