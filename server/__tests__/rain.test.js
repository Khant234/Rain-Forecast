// server/__tests__/rain.test.js
// Jest tests for rain forecast logic only
process.env.TOMORROW_API_KEY = 'dummy-key';
const { getRainForecast } = require('../weather');
const fetch = require('node-fetch');

jest.mock('node-fetch');

const mockRainyResponse = {
  data: {
    timelines: {
      hourly: [
        { time: '2024-06-01T10:00:00Z', values: { precipitationProbability: 80, precipitationType: 1 } },
        { time: '2024-06-01T11:00:00Z', values: { precipitationProbability: 60, precipitationType: 1 } },
      ]
    }
  }
};

const mockDryResponse = {
  data: {
    timelines: {
      hourly: [
        { time: '2024-06-01T10:00:00Z', values: { precipitationProbability: 10, precipitationType: 0 } },
        { time: '2024-06-01T11:00:00Z', values: { precipitationProbability: 5, precipitationType: 0 } },
      ]
    }
  }
};

describe('Rain Forecast API', () => {
  afterEach(() => jest.clearAllMocks());

  it('should detect rain in forecast', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => mockRainyResponse });
    const data = await getRainForecast(10, 10);
    const rainSoon = data.data.timelines.hourly.some(t => t.values.precipitationProbability >= 50 && t.values.precipitationType === 1);
    expect(rainSoon).toBe(true);
  });

  it('should not detect rain when dry', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => mockDryResponse });
    const data = await getRainForecast(20, 20);
    const rainSoon = data.data.timelines.hourly.some(t => t.values.precipitationProbability >= 50 && t.values.precipitationType === 1);
    expect(rainSoon).toBe(false);
  });
});
