import { defineStore } from 'pinia'

// 五大类目（已定决策：上装·下装·鞋·包·配饰）
export const CATEGORIES = [
  { value: 'top', label: '上装' },
  { value: 'bottom', label: '下装' },
  { value: 'shoes', label: '鞋' },
  { value: 'bag', label: '包' },
  { value: 'accessory', label: '配饰' },
]

// 表单里可选的主色色板（multi = 多色/花色）
export const COLOR_OPTIONS = [
  { value: '#1f1f1f', label: '黑' },
  { value: '#f5f5f0', label: '白' },
  { value: '#9b9b9b', label: '灰' },
  { value: '#e8dcc8', label: '米' },
  { value: '#a97c5f', label: '焦糖' },
  { value: '#8b5a2b', label: '棕' },
  { value: '#d0342c', label: '红' },
  { value: '#f2b8c6', label: '粉' },
  { value: '#f28c28', label: '橙' },
  { value: '#e6c84f', label: '黄' },
  { value: '#6a994e', label: '绿' },
  { value: '#3a6ea5', label: '蓝' },
  { value: '#8e6bb8', label: '紫' },
  { value: 'multi', label: '多色' },
]

const STORAGE_KEY = 'wearwhat_wardrobe'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// 衣柜数据：三页共用，本地内测阶段持久化到 localStorage
export const useWardrobeStore = defineStore('wardrobe', {
  state: () => ({ items: load() }),

  getters: {
    categoryLabel() {
      return (value) => CATEGORIES.find((c) => c.value === value)?.label || '未分类'
    },
    colorLabel() {
      return (value) => (value ? COLOR_OPTIONS.find((c) => c.value === value)?.label || '其他' : '未选')
    },
    countByCategory(state) {
      return (value) => state.items.filter((i) => i.category === value).length
    },
  },

  actions: {
    // 每次增删改后落盘；localStorage 空间不足时返回 false，由页面提示
    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items))
        return true
      } catch {
        return false
      }
    },

    add(data) {
      const now = Date.now()
      this.items.unshift({
        id: 'g' + now.toString(36) + Math.random().toString(36).slice(2, 6),
        // 以下字段等 AI 识别（api/garment.js）接入后由模型填充，本地版留空
        subCategory: '',
        material: '',
        pattern: '',
        styleTags: [],
        seasons: [],
        occasions: [],
        whiteImage: '',
        wearCount: 0,
        createdAt: now,
        ...data,
      })
      return this.persist()
    },

    update(id, patch) {
      const item = this.items.find((i) => i.id === id)
      if (item) Object.assign(item, patch)
      return this.persist()
    },

    remove(id) {
      this.items = this.items.filter((i) => i.id !== id)
      return this.persist()
    },
  },
})
