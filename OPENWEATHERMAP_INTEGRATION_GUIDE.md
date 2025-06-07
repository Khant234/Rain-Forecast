# 🌤️ OpenWeatherMap Integration Guide

This guide explains how to set up and use OpenWeatherMap API as an alternative weather data source for your Rain Forecast application.

## 📋 Overview

The OpenWeatherMap integration provides:
- **Alternative weather data source** when Tomorrow.io API is unavailable
- **Comprehensive weather data** including current conditions, hourly and daily forecasts
- **Myanmar timezone conversion** for accurate local time display
- **Data validation and formatting** consistent with existing UI components
- **Intelligent fallback system** with automatic provider switching

## 🚀 Quick Setup

### 1. Get OpenWeatherMap API Key

1. **Visit OpenWeatherMap**
   - Go to [https://openweathermap.org/api](https://openweathermap.org/api)
   - Click "Sign Up" to create a free account

2. **Choose Your Plan**
   - **Free Tier**: 1,000 calls/day, 60 calls/minute
   - **Paid Plans**: Higher limits available if needed
   - For development/testing, the free tier is usually sufficient

3. **Generate API Key**
   - Log in to your OpenWeatherMap account
   - Navigate to "API keys" section
   - Generate a new API key
   - Copy the API key immediately

### 2. Configure Environment Variables

Add your OpenWeatherMap API key to `.env.local`:

```env
# OpenWeatherMap API Key for weather data (alternative/fallback provider)
# Get your free API key from https://openweathermap.org/api
VITE_OPENWEATHERMAP_API_KEY=your_actual_openweathermap_api_key_here
OPENWEATHERMAP_API_KEY=your_actual_openweathermap_api_key_here
```

Replace `your_actual_openweathermap_api_key_here` with your actual API key.

### 3. Restart Development Servers

```bash
# Restart frontend
npm run dev

# Restart backend (in separate terminal)
cd server
npm run dev
```

## 🔧 Configuration Options

### Provider Priority

The application uses this fallback order:

1. **Tomorrow.io** (primary) - High-quality data but blocked in Myanmar
2. **OpenWeatherMap** (fallback) - Reliable alternative with global coverage
3. **Mock Data** (last resort) - Realistic fallback when APIs fail

### API Endpoints

- **Main Weather Endpoint**: `/api/weather` (uses intelligent fallback)
- **OpenWeatherMap Direct**: `/api/weather/openweathermap` (OpenWeatherMap only)
- **Provider Status**: `/api/stats` (shows provider availability)

## 📊 Features

### Data Coverage

**Current Weather:**
- Temperature (actual and apparent)
- Humidity and pressure
- Wind speed and direction
- Weather conditions and descriptions
- Visibility and cloud cover
- UV index (when available)

**Forecasts:**
- **Hourly**: 48 hours of detailed forecasts
- **Daily**: 7 days of daily summaries
- **Precipitation**: Probability and intensity
- **Astronomical**: Sunrise and sunset times

### Data Validation

All weather data is validated and formatted according to your preferences:
- **Temperature**: Displayed as whole numbers
- **Wind Speed**: Maximum 1 decimal place
- **Humidity/Pressure**: Whole numbers
- **UV Index**: 0-15 range, whole numbers
- **Precipitation**: Clean percentages with descriptive labels

### Myanmar Timezone Support

- **Automatic Conversion**: All timestamps converted to Myanmar time (UTC+6.5)
- **UV Index Validation**: Nighttime detection using local time
- **Accurate Forecasts**: All forecast times in local timezone

## 🧪 Testing

### Test the Integration

1. **Open Test Page**
   ```
   http://localhost:3000/test-openweathermap-integration.html
   ```

2. **Run All Tests**
   - Configuration Test
   - Provider Availability
   - Direct API Test
   - Service Layer Test
   - Fallback Logic Test
   - Data Transformation Test
   - Myanmar Timezone Test

### Manual Testing

```bash
# Test OpenWeatherMap direct endpoint
curl -X POST http://localhost:3001/api/weather/openweathermap \
  -H "Content-Type: application/json" \
  -d '{"lat": 16.8661, "lon": 96.1951}'

# Test main endpoint (with fallback)
curl -X POST http://localhost:3001/api/weather \
  -H "Content-Type: application/json" \
  -d '{"lat": 16.8661, "lon": 96.1951}'
```

## 🔍 Troubleshooting

### Common Issues

#### ❌ **API Key Not Working**
**Problem**: "OpenWeatherMap API not configured" error
**Solution**: 
- Verify API key is correctly added to `.env.local`
- Ensure both `VITE_OPENWEATHERMAP_API_KEY` and `OPENWEATHERMAP_API_KEY` are set
- Restart both frontend and backend servers
- Check API key is active on OpenWeatherMap dashboard

#### ❌ **Rate Limit Exceeded**
**Problem**: "429 Too Many Requests" error
**Solution**:
- Check your usage on OpenWeatherMap dashboard
- Wait for rate limit to reset (hourly/daily)
- Consider upgrading your OpenWeatherMap plan
- Use caching to reduce API calls

#### ❌ **Data Format Issues**
**Problem**: Weather data not displaying correctly
**Solution**:
- Check browser console for transformation errors
- Verify data structure in test page
- Ensure all required fields are present
- Check Myanmar timezone conversion

#### ❌ **Fallback Not Working**
**Problem**: Application not falling back to OpenWeatherMap
**Solution**:
- Verify OpenWeatherMap API key is configured
- Check provider status in test page
- Review browser console for error messages
- Ensure provider management system is working

### Debug Information

**Check Provider Status:**
```javascript
// In browser console
fetch('/api/stats').then(r => r.json()).then(console.log);
```

**Test Specific Provider:**
```javascript
// Test OpenWeatherMap directly
fetch('/api/weather/openweathermap', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({lat: 16.8661, lon: 96.1951})
}).then(r => r.json()).then(console.log);
```

## 📈 Performance

### Caching Strategy

- **Server-side caching**: 1 hour for exact coordinates, 2 hours for 5km grid
- **Client-side caching**: 30 minutes for weather data
- **Intelligent cache**: Separate cache entries per provider

### API Efficiency

- **Batch Requests**: Current + forecast data fetched together
- **Optimized Fields**: Only necessary data fields requested
- **Rate Limiting**: Built-in rate limiting and retry logic
- **Error Handling**: Graceful degradation with fallbacks

## 🔐 Security

### Best Practices

1. **Environment Variables**: Never commit API keys to version control
2. **Server-side Proxy**: API keys hidden from frontend
3. **Rate Limiting**: Prevent API abuse
4. **Error Handling**: Don't expose sensitive error details

### API Key Management

```env
# ✅ Correct - Use environment variables
VITE_OPENWEATHERMAP_API_KEY=your_key_here

# ❌ Wrong - Never hardcode in source
const API_KEY = "your_key_here";
```

## 📞 Support

### OpenWeatherMap Resources

- **Documentation**: [https://openweathermap.org/api](https://openweathermap.org/api)
- **API Reference**: [https://openweathermap.org/current](https://openweathermap.org/current)
- **Support**: [https://openweathermap.org/support](https://openweathermap.org/support)

### Application Support

- **Test Integration**: Use `test-openweathermap-integration.html`
- **Check Logs**: Review browser console and server logs
- **Provider Status**: Monitor `/api/stats` endpoint
- **Diagnostics**: Use `/api/diagnostics` for detailed status

## ✅ Success Checklist

- [ ] OpenWeatherMap account created
- [ ] API key generated and copied
- [ ] Environment variables configured in `.env.local`
- [ ] Both frontend and backend servers restarted
- [ ] Test page shows successful configuration
- [ ] Weather data loads from OpenWeatherMap
- [ ] Fallback system working correctly
- [ ] Myanmar timezone conversion active
- [ ] Data formatting matches preferences

## 🎉 Congratulations!

Your Rain Forecast application now has a robust, multi-provider weather system with OpenWeatherMap as a reliable fallback option. The application will automatically switch between providers based on availability, ensuring users always have access to accurate weather data.

The integration maintains all your existing preferences for data formatting, Myanmar timezone support, and UI compatibility while providing enhanced reliability through provider diversity.
