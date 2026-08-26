import { describe, expect, it } from "vitest";
import { resolveWeatherLocation } from "./weather.js";

function request(url, cf) {
  const value = new Request(url);
  Object.defineProperty(value, "cf", { value: cf, configurable: true });
  return value;
}

describe("weather location resolution", () => {
  it("prefers explicit browser coordinates", () => {
    const value = request("https://example.com/api/weather?lat=22.3&lon=114.2&city=%E7%B2%BE%E7%A1%AE%E4%BD%8D%E7%BD%AE", { latitude: "1", longitude: "2", city: "Proxy" });
    expect(resolveWeatherLocation(value)).toEqual({ latitude: 22.3, longitude: 114.2, city: "精确位置" });
  });

  it("uses Cloudflare visitor geolocation when coordinates are omitted", () => {
    const value = request("https://example.com/api/weather", { latitude: "31.2304", longitude: "121.4737", city: "上海市", country: "CN" });
    expect(resolveWeatherLocation(value)).toEqual({ latitude: 31.2304, longitude: 121.4737, city: "上海市" });
  });

  it("rejects requests without usable location data", () => {
    expect(() => resolveWeatherLocation(request("https://example.com/api/weather", {}))).toThrow("无法识别访问位置");
  });

  it("rejects invalid explicit coordinates instead of silently using IP location", () => {
    const value = request("https://example.com/api/weather?lat=999&lon=114", { latitude: "31", longitude: "121", city: "上海市" });
    expect(() => resolveWeatherLocation(value)).toThrow("经纬度无效");
  });
});
