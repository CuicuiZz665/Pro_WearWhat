// 天气相关接口：全部用免费、无需注册的开放接口（本地内测够用）
// 页面不直接写网络请求，统一从这里调（见 api/README.md）

// 带超时的 fetch：接口挂了不能把页面卡死
async function fetchJSON(url, timeout = 6000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// 1）IP 定位：按手机当前网络的出口估计城市（精确到城市级）
//    之所以不用浏览器 GPS 定位：手机通过 http://电脑IP:5173 访问时属于
//    「不安全来源」，浏览器会直接禁用 GPS 定位接口；IP 定位则哪里都能用。
//    主用 ipwho.is（国内实测能通），失败换 ipapi.co 再试一次（它偶尔会被
//    Cloudflare 人机验证拦下）；都失败返回 null，由页面引导手动选城市。
export async function fetchIpLocation() {
  let loc = null
  try {
    const d = await fetchJSON('https://ipwho.is/')
    if (d && d.success && d.latitude != null) {
      loc = { name: d.city || d.region || '当前位置', lat: d.latitude, lon: d.longitude }
    }
  } catch {
    // 换下一家
  }
  if (!loc) {
    try {
      const d = await fetchJSON('https://ipapi.co/json/?lang=zh-CN')
      if (d && d.latitude != null) {
        loc = { name: d.city || d.region || '当前位置', lat: d.latitude, lon: d.longitude }
      }
    } catch {
      // 放弃，交回页面
    }
  }
  if (!loc) return null

  // IP 定位接口给的多是英文名（如 Beijing），借城市搜索接口换成中文（北京）；
  // 换不到就保留原名，不影响取天气
  try {
    const hit = (await searchCity(loc.name))[0]
    if (hit) loc.name = hit.name
  } catch {
    // 保留英文名
  }
  return loc
}

// 2）天气：Open-Meteo（免费无 key）
//    返回 { temp 当前温度, feels 体感温度, code 天气代码, min 今日最低, max 今日最高 }
export async function fetchWeather(lat, lon) {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,apparent_temperature,weather_code' +
    '&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto'
  const d = await fetchJSON(url)
  const c = d.current || {}
  const day = d.daily || {}
  return {
    temp: Math.round(c.temperature_2m),
    feels: Math.round(c.apparent_temperature ?? c.temperature_2m),
    code: c.weather_code ?? 0,
    min: Math.round(day.temperature_2m_min?.[0] ?? c.temperature_2m),
    max: Math.round(day.temperature_2m_max?.[0] ?? c.temperature_2m),
  }
}

// 3）城市搜索：Open-Meteo 地理编码（支持中文搜索，如「杭州」）
//    返回 [{ name, admin1 省/州, country 国家, lat, lon }]
export async function searchCity(keyword) {
  const url =
    'https://geocoding-api.open-meteo.com/v1/search' +
    `?name=${encodeURIComponent(keyword)}&count=10&language=zh&format=json`
  const d = await fetchJSON(url)
  return (d.results || []).map((r) => ({
    name: r.name,
    admin1: r.admin1 || '',
    country: r.country || '',
    lat: r.latitude,
    lon: r.longitude,
  }))
}
