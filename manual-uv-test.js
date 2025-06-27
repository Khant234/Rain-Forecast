// Manual UV Test - Run this in Node.js to test the logic
// node manual-uv-test.js

const TEST_LAT = 16.8661;
const TEST_LON = 96.1951;
const MYANMAR_TIMEZONE_OFFSET = 6.5;

// Replicate the timezone calculation logic
function getTimezoneOffset(lat, lon) {
  const baseOffset = lon / 15;
  
  const timezoneAdjustments = {
    myanmar: { latMin: 9, latMax: 29, lonMin: 92, lonMax: 102, offset: 6.5 },
    india: { latMin: 6, latMax: 37, lonMin: 68, lonMax: 97, offset: 5.5 },
    china: { latMin: 18, latMax: 54, lonMin: 73, lonMax: 135, offset: 8 },
  };

  for (const [region, zone] of Object.entries(timezoneAdjustments)) {
    if (lat >= zone.latMin && lat <= zone.latMax && 
        lon >= zone.lonMin && lon <= zone.lonMax) {
      // // // // console.log(`🌍 Using ${region} timezone offset: UTC+${zone.offset}`);
      return zone.offset;
    }
  }

  const roundedOffset = Math.round(baseOffset * 2) / 2;
  // // // // console.log(`🌍 Using longitude-based timezone offset: UTC+${roundedOffset}`);
  return roundedOffset;
}

// Replicate the nighttime detection logic
function isNighttime(timestamp, lat, lon) {
  const date = new Date(timestamp);
  const utcHour = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  
  const timezoneOffset = getTimezoneOffset(lat, lon);
  
  const localTime = utcHour + (utcMinutes / 60) + timezoneOffset;
  const localHour = ((localTime % 24) + 24) % 24;
  
  const isNight = localHour < 6 || localHour >= 18;
  
  return {
    isNight,
    localHour: Math.floor(localHour),
    localMinutes: Math.floor((localHour % 1) * 60),
    timezoneOffset
  };
}

// Replicate the UV validation logic
function validateUVIndex(uvIndex, timestamp, lat, lon) {
  const timeInfo = isNighttime(timestamp, lat, lon);
  if (timeInfo.isNight) {
    return 0;
  }
  return Math.max(0, Math.min(15, Math.round(uvIndex || 0)));
}

// // // // console.log('🧪 Manual UV Index Tests');
// // // // console.log('========================');

// Test timezone calculation
// // // // console.log('\n📍 Timezone Test:');
const calculatedOffset = getTimezoneOffset(TEST_LAT, TEST_LON);
// // // // console.log(`Expected: UTC+${MYANMAR_TIMEZONE_OFFSET}`);
// // // // console.log(`Calculated: UTC+${calculatedOffset}`);
// // // // console.log(`Accurate: ${Math.abs(calculatedOffset - MYANMAR_TIMEZONE_OFFSET) <= 0.1 ? '✅ PASS' : '❌ FAIL'}`);

// Test specific times
// // // // console.log('\n🕐 Time Tests:');
const testTimes = [
  { utc: '2024-01-01T02:00:00Z', desc: '2:00 UTC' },
  { utc: '2024-01-01T06:00:00Z', desc: '6:00 UTC' },
  { utc: '2024-01-01T12:00:00Z', desc: '12:00 UTC' },
  { utc: '2024-01-01T14:00:00Z', desc: '14:00 UTC' },
  { utc: '2024-01-01T18:00:00Z', desc: '18:00 UTC' },
  { utc: '2024-01-01T23:30:00Z', desc: '23:30 UTC' }
];

testTimes.forEach(test => {
  const timeInfo = isNighttime(test.utc, TEST_LAT, TEST_LON);
  // // // // console.log(`${test.desc} → Local: ${timeInfo.localHour}:${timeInfo.localMinutes.toString().padStart(2, '0')} (${timeInfo.isNight ? 'Night' : 'Day'})`);
});

// Test UV validation
// // // // console.log('\n☀️ UV Validation Tests:');
const uvTests = [
  { time: '2024-01-01T02:00:00Z', uv: 8, expected: 8, desc: 'Day time' },
  { time: '2024-01-01T06:00:00Z', uv: 5, expected: 5, desc: 'Day time' },
  { time: '2024-01-01T12:00:00Z', uv: 11, expected: 0, desc: 'Night time' },
  { time: '2024-01-01T14:00:00Z', uv: 7, expected: 0, desc: 'Night time' },
  { time: '2024-01-01T08:00:00Z', uv: 20, expected: 15, desc: 'Day - UV too high' },
];

let passed = 0;
uvTests.forEach(test => {
  const result = validateUVIndex(test.uv, test.time, TEST_LAT, TEST_LON);
  const timeInfo = isNighttime(test.time, TEST_LAT, TEST_LON);
  const success = result === test.expected;
  if (success) passed++;
  
  // // // // console.log(`${success ? '✅' : '❌'} ${test.desc}: UV ${test.uv} → ${result} (expected ${test.expected})`);
  // // // // console.log(`   Local: ${timeInfo.localHour}:${timeInfo.localMinutes.toString().padStart(2, '0')} (${timeInfo.isNight ? 'Night' : 'Day'})`);
});

// // // // console.log(`\n📊 Summary: ${passed}/${uvTests.length} tests passed`);
