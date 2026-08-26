import { json } from "./_shared/catalogV2.js";

function coordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

export function resolveWeatherLocation(request) {
  const params = new URL(request.url).searchParams;
  const queryLatitude = coordinate(params.get("lat"), -90, 90);
  const queryLongitude = coordinate(params.get("lon"), -180, 180);
  if (params.has("lat") || params.has("lon")) {
    if (queryLatitude === null || queryLongitude === null) throw new Error("经纬度无效。");
    return { latitude: queryLatitude, longitude: queryLongitude, city: (params.get("city") || "当前位置").slice(0, 60) };
  }

  const cf = request.cf ?? {};
  const latitude = coordinate(cf.latitude, -90, 90);
  const longitude = coordinate(cf.longitude, -180, 180);
  if (latitude === null || longitude === null) throw new Error("无法识别访问位置。");
  const city = [cf.city, cf.region].find((value) => typeof value === "string" && value.trim()) ?? cf.country ?? "访问位置";
  return { latitude, longitude, city: String(city).slice(0, 60) };
}

export async function onRequestGet({ request }) {
  let location;
  try { location = resolveWeatherLocation(request); }
  catch (error) { return json({ error: error.message || "经纬度无效。" }, 400); }

  const { latitude, longitude, city } = location;
  const cache = caches.default;
  const cacheCity = encodeURIComponent(city.toLocaleLowerCase());
  const cacheKey = new Request(`https://weather.hfdz.local/${latitude.toFixed(2)},${longitude.toFixed(2)}/${cacheCity}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstream = new URL("https://api.open-meteo.com/v1/forecast");
  upstream.searchParams.set("latitude", String(latitude));
  upstream.searchParams.set("longitude", String(longitude));
  upstream.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code");
  upstream.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  upstream.searchParams.set("timezone", "auto");
  upstream.searchParams.set("forecast_days", "3");
  try {
    const response = await fetch(upstream, { cf: { cacheTtl: 600 } });
    if (!response.ok) return json({ error: "天气服务暂时不可用。" }, 502);
    const data = await response.json();
    const result = {
      location: city,
      current: { temperature: data.current.temperature_2m, apparentTemperature: data.current.apparent_temperature, weatherCode: data.current.weather_code },
      forecast: data.daily.time.map((date, index) => ({ date, maximum: data.daily.temperature_2m_max[index], minimum: data.daily.temperature_2m_min[index], weatherCode: data.daily.weather_code[index] })),
    };
    const output = json(result, 200, { "cache-control": "public, max-age=600" });
    await cache.put(cacheKey, output.clone());
    return output;
  } catch { return json({ error: "天气服务连接失败。" }, 503); }
}
