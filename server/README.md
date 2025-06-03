# Weather Proxy Server

This proxy server caches Tomorrow.io API responses to serve thousands of users with minimal API calls.

## Features

- ✅ Multi-level caching (exact, 5km grid)
- ✅ Load balancing between 2 API keys
- ✅ Automatic rate limit management
- ✅ Cache hit rate tracking
- ✅ Real-time statistics

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure API Keys

Create a `.env` file:

```env
TOMORROW_API_KEY_1=your_first_api_key
TOMORROW_API_KEY_2=your_second_api_key
PORT=3001
```

### 3. Run Locally

```bash
npm run dev
```

Server will start at http://localhost:3001

### 4. Test the API

```bash
# Get weather
curl http://localhost:3001/api/weather/16.8661/96.1951

# View statistics
curl http://localhost:3001/api/stats
```

## Deploy to Vercel

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Add Secrets

```bash
vercel secrets add tomorrow-api-key-1 "your_first_key"
vercel secrets add tomorrow-api-key-2 "your_second_key"
```

### 3. Deploy

```bash
vercel
```

### 4. Update React App

Add to your `.env`:

```env
REACT_APP_PROXY_URL=https://your-proxy.vercel.app/api/weather
```

## API Endpoints

### GET /api/weather/:lat/:lon

Returns weather data with caching.

Response includes:
- Weather data from Tomorrow.io
- `cached`: boolean indicating if from cache
- `cacheType`: "exact" or "5km grid"
- `cacheHitRate`: Current cache efficiency

### GET /api/stats

Returns server statistics:
- Total requests
- Cache hits
- API calls made
- API key usage
- Estimated user capacity

## Monitoring

View real-time stats at: http://localhost:3001/api/stats

Example output:
```json
{
  "stats": {
    "totalRequests": 1523,
    "cacheHits": 1456,
    "apiCalls": 67,
    "cacheHitRate": "95.6%"
  },
  "apiKeys": [
    {
      "id": 1,
      "daily": "45/500",
      "hourly": "12/25"
    },
    {
      "id": 2,
      "daily": "22/500",
      "hourly": "8/25"
    }
  ],
  "estimatedUsers": 152,
  "maxCapacity": 10000
}
```

## Cache Strategy

1. **Exact Match** (1 hour TTL)
   - Precise coordinates

2. **5km Grid** (2 hours TTL)
   - Rounds to ~0.05 degrees
   - Good for nearby users

3. **Automatic Promotion**
   - Grid hits promote to exact cache
   - Reduces future API calls

## Cost Savings

With 2 API keys (1000 calls/day):
- Without proxy: 100 users max
- With proxy: 5,000-10,000 users
- Savings: 98%+ API calls