<template>
  <div class="page">
    <van-nav-bar title="我的衣柜" />

    <!-- 分类筛选：全部 + 五大类目 -->
    <van-tabs
      v-model:active="activeCategory"
      shrink
      sticky
      color="#a97c5f"
      title-active-color="#a97c5f"
      title-inactive-color="#3e2f23"
      :line-width="20"
      class="cat-tabs"
    >
      <van-tab v-for="t in tabs" :key="t.value" :title="t.label" :name="t.value" />
    </van-tabs>

    <!-- 单品九宫格 -->
    <div v-if="filteredItems.length" class="grid">
      <GarmentCard v-for="g in filteredItems" :key="g.id" :garment="g" @tap="openDetail(g)" />
    </div>

    <!-- 空状态 -->
    <van-empty v-else image-size="90" :description="emptyText">
      <van-button
        v-if="!store.items.length"
        round
        type="primary"
        size="small"
        @click="openAdd"
      >
        添加第一件单品
      </van-button>
    </van-empty>

    <!-- 右下角悬浮「+」 -->
    <div class="fab" role="button" aria-label="添加单品" @click="openAdd">
      <van-icon name="plus" color="#fffdf8" size="22" />
    </div>

    <!-- 添加 / 编辑：顶部标签停在具体分类时，新增自动带入该类目 -->
    <GarmentFormSheet
      v-model:show="showForm"
      :garment="editingGarment"
      :default-category="activeCategory === 'all' ? '' : activeCategory"
      @saved="onSaved"
    />

    <!-- 单品详情 -->
    <GarmentDetailSheet
      v-model:show="showDetail"
      :garment="detailGarment"
      @edit="openEdit"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CATEGORIES, useWardrobeStore } from '../../stores/wardrobe'
import GarmentCard from './components/GarmentCard.vue'
import GarmentFormSheet from './components/GarmentFormSheet.vue'
import GarmentDetailSheet from './components/GarmentDetailSheet.vue'
import { dhash } from './utils'

const route = useRoute()
const store = useWardrobeStore()

// 打开页面时给没有指纹的旧单品补指纹（重复检测上线前存的数据），静默完成
onMounted(async () => {
  for (const item of store.items) {
    if (item.imageHash || !item.image) continue
    try {
      store.update(item.id, { imageHash: await dhash(item.image) })
    } catch {
      // 单张失败跳过，不影响其他
    }
  }
})

const tabs = [{ value: 'all', label: '全部' }, ...CATEGORIES]
const activeCategory = ref('all')

// 支持带类目跳进来：如首页今日推荐点某件衣服 → /#/wardrobe?category=top
// （非法值忽略；从底部导航正常进衣柜不带参数，保持上次停留的分类）
watch(
  () => route.query.category,
  (cat) => {
    if (cat && tabs.some((t) => t.value === cat)) activeCategory.value = cat
  },
  { immediate: true }
)

const filteredItems = computed(() =>
  activeCategory.value === 'all'
    ? store.items
    : store.items.filter((i) => i.category === activeCategory.value)
)

const emptyText = computed(() =>
  store.items.length ? '这个分类还没有单品' : '衣柜还空着，点右下角 + 添加第一件吧'
)

const showForm = ref(false)
const editingGarment = ref(null)
const showDetail = ref(false)
const detailGarment = ref(null)

function openAdd() {
  editingGarment.value = null
  showForm.value = true
}

function openDetail(g) {
  detailGarment.value = g
  showDetail.value = true
}

// 详情里点「编辑」：先关详情，再用这件单品打开表单
function openEdit(g) {
  showDetail.value = false
  editingGarment.value = g
  showForm.value = true
}

function onSaved() {
  showForm.value = false
  editingGarment.value = null
}
</script>

<style scoped>
.cat-tabs {
  background: #f7f2ea;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
  padding: 12px;
}

/* 右下角悬浮「+」：底部导航栏上方，避免被遮住 */
.fab {
  position: fixed;
  right: 18px;
  bottom: 82px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #a97c5f;
  box-shadow: 0 4px 12px rgba(169, 124, 95, 0.45);
  cursor: pointer;
  z-index: 10;
}
</style>
