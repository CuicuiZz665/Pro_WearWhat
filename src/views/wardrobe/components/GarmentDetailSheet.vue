<template>
  <van-popup
    :show="show"
    position="bottom"
    round
    closeable
    class="detail-sheet"
    @update:show="$emit('update:show', $event)"
  >
    <div class="detail-sheet__img">
      <img :src="garment?.image" alt="单品大图" />
    </div>

    <van-cell-group inset class="detail-sheet__cells">
      <van-cell title="类目" :value="garment ? store.categoryLabel(garment.category) : ''" />
      <van-cell title="主色" :value="garment ? store.colorLabel(garment.mainColor) : ''">
        <template v-if="garment?.mainColor" #icon>
          <span class="d-dot" :style="{ background: dotBg }"></span>
        </template>
      </van-cell>
      <van-cell title="备注" :value="garment?.name || '—'" />
      <van-cell title="添加时间" :value="garment ? formatDate(garment.createdAt) : ''" />
    </van-cell-group>

    <div class="detail-sheet__btns">
      <van-button round plain type="danger" class="btn" @click="showConfirm = true">
        删除
      </van-button>
      <van-button round type="primary" class="btn" @click="$emit('edit', garment)">
        编辑
      </van-button>
    </div>

    <van-dialog
      v-model:show="showConfirm"
      title="删除单品"
      message="确定从衣柜删除这件单品吗？删除后找不回来。"
      show-cancel-button
      confirm-button-color="#d0342c"
      @confirm="onConfirmDelete"
    />
  </van-popup>
</template>

<script setup>
import { computed, ref } from 'vue'
import { showToast } from 'vant'
import 'vant/es/toast/style'
import { useWardrobeStore } from '../../../stores/wardrobe'
import { formatDate } from '../utils'

const props = defineProps({
  show: { type: Boolean, default: false },
  garment: { type: Object, default: null },
})
const emit = defineEmits(['update:show', 'edit'])

const store = useWardrobeStore()
const showConfirm = ref(false)

const dotBg = computed(() =>
  props.garment?.mainColor === 'multi'
    ? 'conic-gradient(#d0342c, #f28c28, #e6c84f, #6a994e, #3a6ea5, #8e6bb8, #d0342c)'
    : props.garment?.mainColor || 'transparent'
)

function onConfirmDelete() {
  const ok = store.remove(props.garment.id)
  showToast(ok ? '已删除' : '删除失败，请重试')
  if (ok) emit('update:show', false)
}
</script>

<style scoped>
.detail-sheet {
  padding: 16px 0 calc(16px + env(safe-area-inset-bottom));
}

.detail-sheet__img {
  display: flex;
  justify-content: center;
  padding: 4px 16px 12px;
}

.detail-sheet__img img {
  max-width: 100%;
  max-height: 46vh;
  object-fit: contain;
  border-radius: 12px;
  background: #fff;
}

.detail-sheet__cells {
  margin: 0 16px;
}

.d-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 6px;
  border-radius: 50%;
  border: 1px solid rgba(62, 47, 35, 0.15);
  vertical-align: -1px;
}

.detail-sheet__btns {
  display: flex;
  gap: 12px;
  padding: 16px 16px 0;
}

.btn {
  flex: 1;
}
</style>
