<template>
  <div class="g-card" @click="$emit('tap', garment)">
    <div class="g-card__img">
      <img :src="garment.image" :alt="garment.name || categoryText" loading="lazy" />
    </div>
    <div class="g-card__info">
      <span class="g-card__dot" :style="{ background: dotColor }"></span>
      <span class="g-card__name">{{ garment.name || categoryText }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useWardrobeStore } from '../../../stores/wardrobe'

const props = defineProps({
  garment: { type: Object, required: true },
})
defineEmits(['tap'])

const store = useWardrobeStore()
const categoryText = computed(() => store.categoryLabel(props.garment.category))
// 没选主色就不显示圆点；多色用彩虹渐变圆点
const dotColor = computed(() =>
  props.garment.mainColor === 'multi'
    ? 'conic-gradient(#d0342c, #f28c28, #e6c84f, #6a994e, #3a6ea5, #8e6bb8, #d0342c)'
    : props.garment.mainColor || 'transparent'
)
</script>

<style scoped>
.g-card {
  background: var(--van-background-2, #fffdf8);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(62, 47, 35, 0.06);
  cursor: pointer;
}

.g-card__img {
  aspect-ratio: 1 / 1;
}

.g-card__img img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.g-card__info {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px 6px;
}

.g-card__dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid rgba(62, 47, 35, 0.15);
}

.g-card__name {
  font-size: 11px;
  color: #3e2f23;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
