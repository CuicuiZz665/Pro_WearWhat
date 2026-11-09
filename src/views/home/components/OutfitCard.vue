<template>
  <div class="outfit-card">
    <div class="outfit-card__head">
      <span class="outfit-card__title">今日推荐</span>
      <span v-if="weather" class="chip">{{ weather.temp }}° {{ weatherText }}</span>
      <button v-if="outfit" class="shuffle" type="button" @click="regenerate">
        <van-icon name="replay" size="13" />
        换一套
      </button>
    </div>

    <template v-if="outfit">
      <!-- 上装 / 下装 / 鞋 并排；没有鞋时只有两格。点衣服去衣柜对应类目 -->
      <div class="row">
        <div v-for="g in outfitCells" :key="g.id" class="cell" @click="goToCategory(g)">
          <img :src="g.image" :alt="labelOf(g)" loading="lazy" />
          <span class="cell__label">{{ labelOf(g) }}</span>
        </div>
      </div>

      <div class="outfit-card__foot">
        <span class="advice">{{ adviceText || '今天穿这套，自在又好看' }}</span>
        <button
          class="fav"
          type="button"
          :class="{ 'fav--on': favorited }"
          @click="toggleFav"
        >
          <van-icon :name="favorited ? 'star' : 'star-o'" size="14" />
          {{ favorited ? '已收藏' : '收藏这套' }}
        </button>
      </div>
    </template>

    <!-- 衣柜凑不齐一套（缺上装或下装） -->
    <van-empty v-else image-size="80" :description="emptyText">
      <van-button round type="primary" size="small" replace to="/wardrobe">
        {{ wardrobe.items.length ? '去衣柜补几件' : '去衣柜添加单品' }}
      </van-button>
    </van-empty>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import 'vant/es/toast/style'
import { useWardrobeStore } from '../../../stores/wardrobe'
import { useOutfitsStore } from '../../../stores/outfits'
import { describeWeather, dressingAdvice, generateOutfit, outfitKey } from '../utils'

const props = defineProps({
  weather: { type: Object, default: null },
})

const router = useRouter()
const wardrobe = useWardrobeStore()
const outfits = useOutfitsStore()

// 点推荐里的某件衣服：跳到衣柜页并自动切到它所属的分类标签
function goToCategory(g) {
  router.push(`/wardrobe?category=${g.category}`)
}

const outfit = ref(null)
const outfitCells = computed(() =>
  outfit.value ? [outfit.value.top, outfit.value.bottom, outfit.value.shoe].filter(Boolean) : []
)
const key = computed(() => (outfit.value ? outfitKey(outfit.value) : ''))
const favorited = computed(() => !!key.value && outfits.has(key.value))

const weatherText = computed(() => (props.weather ? describeWeather(props.weather.code)[0] : ''))
const adviceText = computed(() =>
  props.weather ? `体感 ${props.weather.feels}°，${dressingAdvice(props.weather.feels)}` : ''
)

const emptyText = computed(() => {
  if (!wardrobe.items.length) return '衣柜还空着，先去添加几件衣服吧'
  const has = (v) => wardrobe.items.some((i) => i.category === v)
  if (!has('top')) return '还缺上装：凑齐上装 + 下装才能推荐'
  if (!has('bottom')) return '还缺下装：凑齐上装 + 下装才能推荐'
  return '凑不齐一套，去衣柜看看'
})

function labelOf(g) {
  return g.name || wardrobe.categoryLabel(g.category)
}

function regenerate() {
  // 把当前整套传进去：换一套时优先上下装（和鞋）一起换新
  const next = generateOutfit(wardrobe.items, outfit.value)
  if (!next) {
    outfit.value = null
    return
  }
  if (key.value && outfitKey(next) === key.value) {
    showToast('衣柜里暂时翻不出新组合，多添几件试试')
  }
  outfit.value = next
}

function toggleFav() {
  if (!outfit.value) return
  if (favorited.value) {
    outfits.removeByKey(key.value)
    showToast('已取消收藏')
    return
  }
  const snapshot = outfitCells.value.map((g) => ({
    id: g.id,
    name: g.name,
    category: g.category,
    mainColor: g.mainColor,
  }))
  const ok = outfits.add(snapshot)
  showToast(ok ? '已收藏，下方「收藏的穿搭」里能看到' : '手机本地存储已满，删几套收藏再试')
}

// 衣柜一有增删（含首次进入页面），就重新生成一套
watch(
  () => wardrobe.items.map((i) => i.id).join(','),
  () => regenerate(),
  { immediate: true }
)
</script>

<style scoped>
.outfit-card {
  background: var(--van-background-2, #fffdf8);
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(62, 47, 35, 0.06);
}

.outfit-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.outfit-card__title {
  font-size: 15px;
  font-weight: 600;
  color: #3e2f23;
}

.chip {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: #a97c5f;
  background: rgba(169, 124, 95, 0.12);
}

.shuffle {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  padding: 4px 2px;
  border: none;
  background: none;
  color: #a97c5f;
  font-size: 13px;
  cursor: pointer;
}

.row {
  display: flex;
  gap: 8px;
}

.cell {
  flex: 1;
  min-width: 0;
  border-radius: 10px;
  overflow: hidden;
  background: #f7f2ea;
  cursor: pointer;
}

.cell img {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.cell__label {
  display: block;
  padding: 5px 6px 6px;
  font-size: 11px;
  color: #3e2f23;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.outfit-card__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.advice {
  flex: 1;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(62, 47, 35, 0.6);
}

.fav {
  flex: none;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  border: 1px solid #a97c5f;
  border-radius: 999px;
  background: none;
  color: #a97c5f;
  font-size: 13px;
  cursor: pointer;
}

.fav--on {
  background: #a97c5f;
  color: #fffdf8;
}
</style>
