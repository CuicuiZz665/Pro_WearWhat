import { defineStore } from 'pinia'

// 风格偏好（多选）：第一版 8 项常见风格，想加减随时改这里
export const STYLE_OPTIONS = [
  { value: 'commute', label: '通勤' },
  { value: 'casual', label: '休闲' },
  { value: 'sporty', label: '运动' },
  { value: 'sweet', label: '甜美' },
  { value: 'cool', label: '酷感' },
  { value: 'vintage', label: '复古' },
  { value: 'minimal', label: '简约' },
  { value: 'french', label: '法式' },
]

// 肤色（单选）：color 是选项前小色点的颜色
export const SKIN_TONE_OPTIONS = [
  { value: 'cool-fair', label: '冷白皮', color: '#f7e8e6' },
  { value: 'warm-fair', label: '暖白皮', color: '#f5e3cd' },
  { value: 'natural', label: '自然肤色', color: '#ecc9a6' },
  { value: 'wheat', label: '小麦色', color: '#d8a273' },
  { value: 'deep', label: '深肤色', color: '#a06b45' },
]

// 常去场合（多选）：推荐搭配时按场合出方案
export const OCCASION_OPTIONS = [
  { value: 'daily', label: '日常' },
  { value: 'work', label: '上班' },
  { value: 'date', label: '约会' },
  { value: 'sport', label: '运动' },
  { value: 'travel', label: '旅行' },
  { value: 'formal', label: '正式' },
]

// 预设 emoji 头像（本地内测没有账号，不用真实照片，省存储空间）
export const AVATAR_OPTIONS = ['🐱', '🦊', '🐻', '🐰', '🌸', '☕', '🍑', '🌙']

const STORAGE_KEY = 'wearwhat_profile'

// 输入框里敲出来的身高体重可能不是正常数字，收拢成合法字符串或空
function cleanNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? String(Math.floor(n)) : ''
}

// 读本地旧数据时顺手过滤掉不在选项集里的值，防止手改 localStorage 出脏数据
function load() {
  const empty = {
    avatar: '',
    nickname: '',
    height: '',
    weight: '',
    styles: [],
    skinTone: '',
    occasions: [],
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const saved = raw ? JSON.parse(raw) : {}
    return {
      avatar: AVATAR_OPTIONS.includes(saved.avatar) ? saved.avatar : '',
      nickname: typeof saved.nickname === 'string' ? saved.nickname.trim().slice(0, 8) : '',
      height: cleanNumber(saved.height),
      weight: cleanNumber(saved.weight),
      styles: (Array.isArray(saved.styles) ? saved.styles : []).filter((v) =>
        STYLE_OPTIONS.some((o) => o.value === v)
      ),
      skinTone: SKIN_TONE_OPTIONS.some((o) => o.value === saved.skinTone)
        ? saved.skinTone
        : '',
      occasions: (Array.isArray(saved.occasions) ? saved.occasions : []).filter(
        (v) => OCCASION_OPTIONS.some((o) => o.value === v)
      ),
    }
  } catch {
    return empty
  }
}

// 个人偏好：我的页设置，首页推荐共用，本地内测阶段持久化到 localStorage
export const useProfileStore = defineStore('profile', {
  state: () => load(),

  getters: {
    styleLabel() {
      return (value) => STYLE_OPTIONS.find((o) => o.value === value)?.label || value
    },
    skinToneLabel() {
      return (value) => SKIN_TONE_OPTIONS.find((o) => o.value === value)?.label || '未设置'
    },
    occasionLabel() {
      return (value) => OCCASION_OPTIONS.find((o) => o.value === value)?.label || value
    },
  },

  actions: {
    // 每次改动后落盘；localStorage 空间不足时返回 false，由页面提示
    persist() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            avatar: this.avatar,
            nickname: this.nickname,
            height: this.height,
            weight: this.weight,
            styles: this.styles,
            skinTone: this.skinTone,
            occasions: this.occasions,
          })
        )
        return true
      } catch {
        return false
      }
    },

    setAvatar(value) {
      this.avatar = value
      return this.persist()
    },

    setNickname(value) {
      this.nickname = value.trim().slice(0, 8)
      return this.persist()
    },

    setHeight(value) {
      this.height = cleanNumber(value)
      return this.persist()
    },

    setWeight(value) {
      this.weight = cleanNumber(value)
      return this.persist()
    },

    toggleStyle(value) {
      this.styles = this.styles.includes(value)
        ? this.styles.filter((v) => v !== value)
        : [...this.styles, value]
      return this.persist()
    },

    setSkinTone(value) {
      this.skinTone = this.skinTone === value ? '' : value
      return this.persist()
    },

    toggleOccasion(value) {
      this.occasions = this.occasions.includes(value)
        ? this.occasions.filter((v) => v !== value)
        : [...this.occasions, value]
      return this.persist()
    },

    // 意见反馈：本地内测没有后端，先记在本机，将来接云端时再迁走
    addFeedback(text) {
      try {
        const list = JSON.parse(localStorage.getItem('wearwhat_feedback') || '[]')
        list.push({ text, time: Date.now() })
        localStorage.setItem('wearwhat_feedback', JSON.stringify(list))
        return true
      } catch {
        return false
      }
    },
  },
})
