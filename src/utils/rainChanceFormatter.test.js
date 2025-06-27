/**
 * Test file for rain chance formatter utility
 * Run with: npm test rainChanceFormatter.test.js
 */

import { 
  formatRainChance, 
  getRainChanceExplanation, 
  getRainChanceColorClass,
  getRainChanceIcon 
} from './rainChanceFormatter.js';

// Test formatRainChance function
// // // // console.log('Testing formatRainChance function:');
// // // // console.log('10% English:', formatRainChance(10, 'en', true, 'full')); // Should be "Very Low (10%)"
// // // // console.log('10% Myanmar:', formatRainChance(10, 'mm', true, 'full')); // Should be "အလွန်နည်း (10%)"
// // // // console.log('35% English:', formatRainChance(35, 'en', true, 'full')); // Should be "Low (35%)"
// // // // console.log('55% English:', formatRainChance(55, 'en', true, 'full')); // Should be "Moderate (55%)"
// // // // console.log('75% English:', formatRainChance(75, 'en', true, 'full')); // Should be "High (75%)"
// // // // console.log('90% English:', formatRainChance(90, 'en', true, 'full')); // Should be "Very High (90%)"

// // // // console.log('\nTesting short format:');
// // // // console.log('35% Short:', formatRainChance(35, 'en', false, 'short')); // Should be "Low"
// // // // console.log('75% Short:', formatRainChance(75, 'en', false, 'short')); // Should be "High"

// // // // console.log('\nTesting getRainChanceExplanation function:');
// // // // console.log('10% English:', getRainChanceExplanation(10, 'en')); // Should be "Rain is very unlikely"
// // // // console.log('10% Myanmar:', getRainChanceExplanation(10, 'mm')); // Should be "မိုးရွာနိုင်ခြေ အလွန်နည်းပါသည်"
// // // // console.log('75% English:', getRainChanceExplanation(75, 'en')); // Should be "Rain is likely"

// // // // console.log('\nTesting getRainChanceColorClass function:');
// // // // console.log('10% Light mode:', getRainChanceColorClass(10, false)); // Should be green
// // // // console.log('10% Dark mode:', getRainChanceColorClass(10, true)); // Should be green
// // // // console.log('75% Light mode:', getRainChanceColorClass(75, false)); // Should be red
// // // // console.log('75% Dark mode:', getRainChanceColorClass(75, true)); // Should be red

// // // // console.log('\nTesting getRainChanceIcon function:');
// // // // console.log('10% Icon:', getRainChanceIcon(10)); // Should be "☀️"
// // // // console.log('35% Icon:', getRainChanceIcon(35)); // Should be "🌤️"
// // // // console.log('55% Icon:', getRainChanceIcon(55)); // Should be "⛅"
// // // // console.log('75% Icon:', getRainChanceIcon(75)); // Should be "🌦️"
// // // // console.log('90% Icon:', getRainChanceIcon(90)); // Should be "🌧️"

// // // // console.log('\nTesting edge cases:');
// // // // console.log('null value:', formatRainChance(null, 'en', true, 'full')); // Should be ""
// // // // console.log('undefined value:', formatRainChance(undefined, 'en', true, 'full')); // Should be ""
// // // // console.log('NaN value:', formatRainChance(NaN, 'en', true, 'full')); // Should be ""
// // // // console.log('0% value:', formatRainChance(0, 'en', true, 'full')); // Should be "Very Low (0%)"
// // // // console.log('100% value:', formatRainChance(100, 'en', true, 'full')); // Should be "Very High (100%)"

// // // // console.log('\nAll tests completed!');
