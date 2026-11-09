<template>
  <div class="fav-section">
    <div class="fav-section__head">
      收藏的穿搭
      <span v-if="outfits.list.length" class="count">{{ outfits.list.length }}</span>
    </div>

    <div v-if="outfits.list.length" class="fav-list">
      <div v-for="o in outfits.list" :key="o.id" class="fav-card">
        <div class="fav-card__imgs">
          <template v-for="it in o.items" :key="it.id">
            <!-- 单品还在衣柜：显示照片；已被删除：显示占位块 -->
            <img v-if="liveOf(it)" :src="liveOf(it).image" :alt="labelOf(it)" loading="lazy" />
            <div v-else class="ghost">
              <span v-if="it.mainColor" class="ghost__dot" :style="{ background: dotBg(it.mainColor) }" />
              <span class="ghost__text">{{ labelOf(it) }}</span>
              <span class="ghost__sub">已删除</span>
            </div>
          </template>
        </div>
        <div class="fav-card__foot">
          <span class="fav-card__date">{{ formatDate(o.createdAt) }} 收藏</span>
          <button class="del" type="button" @click="removeOutfit(o)">
            <van-icon name="delete-o" size="14" />
            删除
          </button>
        </div>
      </div>
    </div>

    <div v-else class="fav-empty">喜欢的搭配点「收藏这套」，就会出现在这里</div>
  </div>
</template>

<script setup>
import { showConfirmDialog, showToast } from 'vant'
import 'vant/es/dialog/style'
import 'vant/es/toast/style'
import { useWardrobeStore } from '../../../stores/wardrobe'
import { useOutfitsStore } from '../../../stores/outfits'
import { formatDate } from '../utils'

const wardrobe = useWardrobeStore()
const outfits = useOutfitsStore()

function liveOf(item) {
  return wardrobe.items.find((g) => g.id === item.id)
}

function labelOf(item) {
  return item.name || wardrobe.categoryLabel(item.category)
}

function dotBg(color) {
  return color === 'multi'
    ? 'conic-gradient(#d0342c, #f28c28, #e6c84f, #6a994e, #3a6ea5, #8e6bb8, #d0342c)'
    : color
}

function removeOutfit(o) {
  showConfirmDialog({
    title: '删除这套收藏？',
    message: '删除后可以重新搭配再收藏',
    confirmButtonText: '删除',
  })
    .then(() => {
      outfits.remove(o.id)
      showToast('已删除')
    })
    .catch(() => {})
}
</script>

<style scoped>
.fav-section__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 2px 10px;
  font-size: 15px;
  font-weight: 600;
  color: #3e2f23;
}

.count {
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  color: #fffdf8;
  background: #a97c5f;
}

.fav-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fav-card {
  background: var(--van-background-2, #fffdf8);
  border-radius: 12px;
  padding: 10px;
  box-shadow: 0 1px 4px rgba(62, 47, 35, 0.06);
}

.fav-card__imgs {
  display: flex;
  gap: 6px;
}

.fav-card__imgs img,
.ghost {
  flex: 1;
  min-width: 0;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
}

.fav-card__imgs img {
  display: block;
  object-fit: cover;
}

.ghost {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px dashed rgba(62, 47, 35, 0.2);
  background: #f7f2ea;
}

.ghost__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(62, 47, 35, 0.15);
}

.ghost__text {
  max-width: 90%;
  font-size: 11px;
  color: #3e2f23;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ghost__sub {
  font-size: 10px;
  color: rgba(62, 47, 35, 0.4);
}

.fav-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.fav-card__date {
  font-size: 11px;
  color: rgba(62, 47, 35, 0.5);
}

.del {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 2px;
  border: none;
  background: none;
  color: rgba(62, 47, 35, 0.5);
  font-size: 12px;
  cursor: pointer;
}

.fav-empty {
  padding: 18px 12px;
  border: 1px dashed rgba(169, 124, 95, 0.4);
  border-radius: 12px;
  text-align: center;
  font-size: 12px;
  color: rgba(62, 47, 35, 0.5);
}
</style>
