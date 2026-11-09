<template>
  <van-popup
    :show="show"
    position="bottom"
    round
    closeable
    @update:show="$emit('update:show', $event)"
  >
    <div class="picker">
      <div class="picker__title">选择城市</div>

      <van-search
        v-model="keyword"
        shape="round"
        placeholder="输入城市名，如：杭州"
        background="transparent"
      />

      <!-- 重新自动定位的入口 -->
      <button class="relocate" type="button" @click="$emit('relocate')">
        <van-icon name="aim" size="15" />
        使用当前位置重新定位
      </button>

      <div v-if="loading" class="picker__tip">
        <van-loading size="14" color="#a97c5f" />
        搜索中…
      </div>
      <div v-else-if="!keyword.trim()" class="picker__tip">输入城市名搜索，选中后立即生效</div>
      <div v-else-if="!results.length" class="picker__tip">没搜到这个城市，换个写法试试</div>
      <div v-else class="picker__list">
        <button
          v-for="(c, i) in results"
          :key="i"
          class="picker__item"
          type="button"
          @click="choose(c)"
        >
          <span class="picker__name">{{ c.name }}</span>
          <span class="picker__sub">{{ [c.admin1, c.country].filter(Boolean).join(' · ') }}</span>
        </button>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, watch } from 'vue'
import { searchCity } from '../../../api/weather'

defineProps({
  show: { type: Boolean, default: false },
})
const emit = defineEmits(['update:show', 'select', 'relocate'])

const keyword = ref('')
const results = ref([])
const loading = ref(false)
let timer = null

// 输入停顿 400ms 再搜索，避免每敲一个字就发一次请求
watch(keyword, (kw) => {
  clearTimeout(timer)
  if (!kw.trim()) {
    results.value = []
    loading.value = false
    return
  }
  loading.value = true
  timer = setTimeout(async () => {
    try {
      results.value = await searchCity(kw.trim())
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  }, 400)
})

function choose(c) {
  emit('select', { name: c.name, lat: c.lat, lon: c.lon })
  emit('update:show', false)
}
</script>

<style scoped>
.picker {
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
}

.picker__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.relocate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  margin: 6px 0 10px;
  padding: 10px;
  border: 1px dashed #a97c5f;
  border-radius: 10px;
  background: rgba(169, 124, 95, 0.04);
  color: #a97c5f;
  font-size: 13px;
  cursor: pointer;
}

.picker__tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 18px 0;
  font-size: 12px;
  color: rgba(62, 47, 35, 0.5);
}

.picker__list {
  max-height: 46vh;
  overflow-y: auto;
}

.picker__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 10px 6px;
  border: none;
  border-bottom: 1px solid rgba(62, 47, 35, 0.06);
  background: none;
  text-align: left;
  cursor: pointer;
}

.picker__name {
  font-size: 14px;
  color: #3e2f23;
}

.picker__sub {
  font-size: 11px;
  color: rgba(62, 47, 35, 0.45);
}
</style>
