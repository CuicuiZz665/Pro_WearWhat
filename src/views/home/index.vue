<template>
  <div class="page">
    <van-nav-bar title="今天穿什么" />

    <div class="home">
      <!-- 天气：城市 + 温度 + 天气现象 -->
      <WeatherCard
        :city="city"
        :weather="weather"
        :loading="loading"
        :error="errorText"
        @select-city="showPicker = true"
        @retry="initWeather"
      />

      <!-- 今日推荐：一套搭配 + 换一套 + 收藏 -->
      <OutfitCard :weather="weather" />

      <!-- 收藏的穿搭方案 -->
      <FavoriteList />
    </div>

    <!-- 搜索 / 切换城市 -->
    <CityPicker v-model:show="showPicker" @select="onCitySelected" @relocate="onRelocate" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchIpLocation, fetchWeather } from '../../api/weather'
import WeatherCard from './components/WeatherCard.vue'
import OutfitCard from './components/OutfitCard.vue'
import FavoriteList from './components/FavoriteList.vue'
import CityPicker from './components/CityPicker.vue'

// 记住上次用的城市，下次打开直接取天气，不用重新定位
const CITY_KEY = 'wearwhat_city'

const city = ref(null)
const weather = ref(null)
const loading = ref(false)
const errorText = ref('')
const showPicker = ref(false)

function readSavedCity() {
  try {
    const c = JSON.parse(localStorage.getItem(CITY_KEY))
    return c && c.name && c.lat != null ? c : null
  } catch {
    return null
  }
}

function saveCity(c) {
  try {
    localStorage.setItem(CITY_KEY, JSON.stringify(c))
  } catch {
    // 存不下就算了，下次重新定位
  }
}

// 取天气：已有城市就直接取；没有就先读上次记住的，再没有就 IP 定位
async function initWeather() {
  loading.value = true
  errorText.value = ''
  try {
    if (!city.value) {
      city.value = readSavedCity() || (await fetchIpLocation())
      if (city.value) saveCity(city.value)
    }
    if (!city.value) {
      errorText.value = '没定位到你的城市，手动选一个吧'
      return
    }
    weather.value = await fetchWeather(city.value.lat, city.value.lon)
  } catch {
    errorText.value = '天气没取到，检查一下网络再试试'
  } finally {
    loading.value = false
  }
}

// 手动选了城市：记住它，重新取天气
function onCitySelected(c) {
  showPicker.value = false
  city.value = c
  weather.value = null
  saveCity(c)
  initWeather()
}

// 重新定位：忘掉记住的城市，重新走一遍 IP 定位
function onRelocate() {
  showPicker.value = false
  city.value = null
  weather.value = null
  try {
    localStorage.removeItem(CITY_KEY)
  } catch {
    // 忽略
  }
  initWeather()
}

onMounted(initWeather)
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 12px 16px;
}
</style>
