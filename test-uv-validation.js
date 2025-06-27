// UV Index Validation Test Script
// Run this in the browser console to test the UV validation logic

import { 
    isNighttime, 
    getTimezoneOffset, 
    validateUVIndex 
} from './src/services/weatherService.js';

// Test configuration
const TEST_LAT = 16.8661;  // Yangon latitude
const TEST_LON = 96.1951;  // Yangon longitude
const MYANMAR_TIMEZONE_OFFSET = 6.5; // UTC+6:30

// console.log('🧪 Starting UV Index Validation Tests...');

// Test 1: Timezone Calculation
// console.log('\n📍 Test 1: Timezone Calculation');
const calculatedOffset = getTimezoneOffset(TEST_LAT, TEST_LON);
const offsetAccuracy = Math.abs(calculatedOffset - MYANMAR_TIMEZONE_OFFSET);
// console.log(`Expected: UTC+${MYANMAR_TIMEZONE_OFFSET}`);
// console.log(`Calculated: UTC+${calculatedOffset}`);
// console.log(`Accuracy: ${offsetAccuracy <= 0.1 ? '✅ PASS' : '❌ FAIL'} (±${offsetAccuracy.toFixed(1)} hours)`);

// Test 2: Nighttime Detection
// console.log('\n🌙 Test 2: Nighttime Detection');
const testTimes = [
    { time: '2024-01-01T02:00:00Z', expected: true, desc: 'Night (2 AM UTC = 8:30 AM local)' },
    { time: '2024-01-01T06:00:00Z', expected: false, desc: 'Day (6 AM UTC = 12:30 PM local)' },
    { time: '2024-01-01T12:00:00Z', expected: false, desc: 'Day (12 PM UTC = 6:30 PM local)' },
    { time: '2024-01-01T14:00:00Z', expected: true, desc: 'Night (2 PM UTC = 8:30 PM local)' },
    { time: '2024-01-01T18:00:00Z', expected: true, desc: 'Night (6 PM UTC = 12:30 AM+1 local)' },
    { time: '2024-01-01T23:00:00Z', expected: true, desc: 'Night (11 PM UTC = 5:30 AM+1 local)' }
];

let nighttimeTestsPassed = 0;
testTimes.forEach(test => {
    const timeInfo = isNighttime(test.time, TEST_LAT, TEST_LON);
    const passed = timeInfo.isNight === test.expected;
    if (passed) nighttimeTestsPassed++;
    
    // console.log(`${passed ? '✅' : '❌'} ${test.desc}`);
    // console.log(`   Local time: ${timeInfo.localHour}:${timeInfo.localMinutes.toString().padStart(2, '0')}`);
    // console.log(`   Expected: ${test.expected ? 'Night' : 'Day'}, Got: ${timeInfo.isNight ? 'Night' : 'Day'}`);
});

// console.log(`\nNighttime Detection: ${nighttimeTestsPassed}/${testTimes.length} tests passed`);

// Test 3: UV Index Validation
// console.log('\n☀️ Test 3: UV Index Validation');
const uvTestCases = [
    { time: '2024-01-01T02:00:00Z', uv: 8, expected: 0, desc: 'Night - should be 0' },
    { time: '2024-01-01T06:00:00Z', uv: 5, expected: 5, desc: 'Day - valid UV' },
    { time: '2024-01-01T08:00:00Z', uv: 20, expected: 15, desc: 'Day - UV too high' },
    { time: '2024-01-01T10:00:00Z', uv: -5, expected: 0, desc: 'Day - negative UV' },
    { time: '2024-01-01T14:00:00Z', uv: 7, expected: 0, desc: 'Night - should be 0' },
    { time: '2024-01-01T18:00:00Z', uv: 3, expected: 0, desc: 'Night - should be 0' }
];

let uvTestsPassed = 0;
uvTestCases.forEach(test => {
    const result = validateUVIndex(test.uv, test.time, TEST_LAT, TEST_LON);
    const passed = result === test.expected;
    if (passed) uvTestsPassed++;
    
    // console.log(`${passed ? '✅' : '❌'} ${test.desc}`);
    // console.log(`   Input UV: ${test.uv}, Expected: ${test.expected}, Got: ${result}`);
});

// console.log(`\nUV Validation: ${uvTestsPassed}/${uvTestCases.length} tests passed`);

// Test 4: Current Time Test
// console.log('\n🕐 Test 4: Current Time Test');
const now = new Date();
const currentTimeInfo = isNighttime(now.toISOString(), TEST_LAT, TEST_LON);
const currentUV = 8; // Simulate current UV
const correctedUV = validateUVIndex(currentUV, now.toISOString(), TEST_LAT, TEST_LON);

// console.log(`Current UTC: ${now.toISOString()}`);
// console.log(`Local time: ${currentTimeInfo.localHour}:${currentTimeInfo.localMinutes.toString().padStart(2, '0')}`);
// console.log(`Timezone offset: UTC+${currentTimeInfo.timezoneOffset}`);
// console.log(`Is nighttime: ${currentTimeInfo.isNight}`);
// console.log(`UV correction: ${currentUV} → ${correctedUV}`);

// Summary
// console.log('\n📊 Test Summary');
const totalTests = testTimes.length + uvTestCases.length + 1; // +1 for timezone test
const totalPassed = (offsetAccuracy <= 0.1 ? 1 : 0) + nighttimeTestsPassed + uvTestsPassed;

// console.log(`Total tests: ${totalTests}`);
// console.log(`Passed: ${totalPassed}`);
// console.log(`Failed: ${totalTests - totalPassed}`);
// console.log(`Success rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

if (totalPassed === totalTests) {
    // console.log('🎉 All tests passed! UV validation logic is working correctly.');
} else {
    // console.log('⚠️ Some tests failed. Check the implementation.');
}

// Export results for external use
window.uvValidationTestResults = {
    timezoneAccuracy: offsetAccuracy <= 0.1,
    nighttimeTestsPassed,
    nighttimeTestsTotal: testTimes.length,
    uvTestsPassed,
    uvTestsTotal: uvTestCases.length,
    totalPassed,
    totalTests,
    successRate: (totalPassed / totalTests) * 100
};

// console.log('\n✅ Test results saved to window.uvValidationTestResults');
