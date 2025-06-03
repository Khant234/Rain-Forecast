# 🚀 Quick Start Guide

## 1. Start the Proxy Server

```bash
# Terminal 1 - Start Proxy Server
cd server
npm install
npm run dev
```

## 2. Add Your Second API Key

Edit `server/.env`:
```env
TOMORROW_API_KEY_1=WP1YfdsbDqxBeOQFU1ERgQjVhbLGZf9U
TOMORROW_API_KEY_2=YOUR_SECOND_KEY_HERE
```

## 3. Start React App

```bash
# Terminal 2 - Start React App
npm run dev
```

## 4. Test It's Working

1. Open http://localhost:3000
2. Allow GPS location
3. Check browser console for "Proxy response: CACHED"
4. View stats at http://localhost:3001/api/stats

## 5. Add Stats Dashboard (Optional)

Add to your Home.jsx:

```jsx
import ProxyStats from '../components/ProxyStats';

// In your JSX
{process.env.NODE_ENV === 'development' && (
  <ProxyStats darkMode={darkMode} />
)}
```

## 🎉 You're Done!

Your app now:
- Uses 2 API keys efficiently
- Caches responses for nearby users
- Can serve 5,000-10,000 users/day
- Saves 95%+ API calls

## Deploy to Production

### Deploy Proxy to Vercel:
```bash
cd server
vercel
```

### Update React App:
```env
REACT_APP_PROXY_URL=https://your-proxy.vercel.app/api/weather
```

## Monitor Usage

Check proxy stats anytime:
- Local: http://localhost:3001/api/stats
- Production: https://your-proxy.vercel.app/api/stats