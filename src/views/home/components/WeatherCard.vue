<template>
  <div class="weather-card">
    <!-- 顶行：城市（点击可换）+ 今天日期 -->
    <div class="weather-card__top">
      <button class="city" type="button" @click="$emit('select-city')">
        <van-icon name="location-o" size="14" />
        <span class="city__name">{{ city ? city.name : '选择城市' }}</span>
        <van-icon name="arrow-down" size="11" />
      </button>
      <span class="date">{{ dateText }}</span>
    </div>

    <!-- 定位 / 取天气中 -->
    <div v-if="loading" class="state">
      <van-loading size="18" color="#a97c5f">{{ city ? '获取天气中…' : '定位中…' }}</van-loading>
    </div>

    <!-- 出错：给重试和手动选城市两个出口 -->
    <div v-else-if="error" class="state state--error">
      <span class="state__text">{{ error }}</span>
      <div class="state__btns">
        <van-button size="small" round type="primary" @click="$emit('retry')">重试</van-button>
        <van-button size="small" round plain type="primary" @click="$emit('select-city')">
          手动选城市
        </van-button>
      </div>
    </div>

    <!-- 正常展示 -->
    <div v-else-if="weather" class="now">
      <span class="now__emoji">{{ emoji }}</span>
      <span class="now__temp">{{ weather.temp }}°</span>
      <span class="now__meta">
        <span class="now__text">{{ text }}</span>
        <span class="now__range">
          今日 {{ weather.min }}° ~ {{ weather.max }}° · 体感 {{ weather.feels }}°
        </span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { describeWeather, formatDate } from '../utils'

const props = defineProps({
  city: { type: Object, default: null },
  weather: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
defineEmits(['select-city', 'retry'])

const dateText = formatDate()
const text = computed(() => describeWeather(props.weather?.code)[0])
const emoji = computed(() => describeWeather(props.weather?.code)[1])
</script>

<style scoped>
.weather-card {
  background: var(--van-background-2, #fffdf8);
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(62, 47, 35, 0.06);
}

.weather-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.city {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: none;
  background: none;
  color: #3e2f23;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.city__name {
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date {
  font-size: 12px;
  color: rgba(62, 47, 35, 0.5);
}

.state {
  padding: 8px 0 10px;
}

.state--error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.state__text {
  font-size: 13px;
  color: rgba(62, 47, 35, 0.6);
}

.state__btns {
  display: flex;
  gap: 8px;
}

.now {
  display: flex;
  align-items: center;
  gap: 10px;
}

.now__emoji {
  font-size: 32px;
  line-height: 1;
}

.now__temp {
  font-size: 42px;
  font-weight: 700;
  line-height: 1;
  color: #3e2f23;
}

.now__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.now__text {
  font-size: 14px;
  font-weight: 500;
  color: #3e2f23;
}

.now__range {
  font-size: 12px;
  color: rgba(62, 47, 35, 0.5);
}
</style>
