import { defineStore } from 'pinia'

const STORAGE_KEY = 'wearwhat_outfits'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// 一套搭配的唯一标识：按 上装|下装|鞋 顺序拼接单品 id
function keyOf(outfit) {
  return outfit.items.map((i) => i.id).join('|')
}

// 收藏的穿搭方案：首页收藏/展示，本地内测阶段持久化到 localStorage
// 每套只存单品的「轻量快照」{ id, name, category, mainColor }，不存图片：
// 图片是很大的 dataURL，重复存一份很容易把 localStorage（约 5MB）撑爆。
// 展示时按 id 去衣柜里找原图，单品被删了就显示占位块。
export const useOutfitsStore = defineStore('outfits', {
  state: () => ({ list: load() }),

  getters: {
    has() {
      return (key) => this.list.some((o) => keyOf(o) === key)
    },
  },

  actions: {
    // 每次增删后落盘；localStorage 空间不足时返回 false，由页面提示
    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.list))
        return true
      } catch {
        return false
      }
    },

    // items：[{ id, name, category, mainColor }]
    add(items) {
      this.list.unshift({
        id: 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        createdAt: Date.now(),
        items,
      })
      return this.persist()
    },

    remove(id) {
      this.list = this.list.filter((o) => o.id !== id)
      return this.persist()
    },

    removeByKey(key) {
      this.list = this.list.filter((o) => keyOf(o) !== key)
      return this.persist()
    },
  },
})
