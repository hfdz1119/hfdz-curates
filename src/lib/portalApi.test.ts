import { describe, expect, it } from "vitest";
import { isWeatherResponse } from "./portalApi";

describe("weather response guard", () => {
  const response = { location: "香港", current: { temperature: 28, apparentTemperature: 31, humidity: 75, windSpeed: 12, weatherCode: 2, aqi: null, uvIndex: 5.2 }, forecast: [{ date: "2026-08-27", maximum: 31, minimum: 26, weatherCode: 2, uvIndex: 6 }] };
  it("accepts extended weather fields and missing AQI", () => expect(isWeatherResponse(response)).toBe(true));
  it("rejects malformed extended fields", () => expect(isWeatherResponse({ ...response, current: { ...response.current, humidity: "75" } })).toBe(false));
});
