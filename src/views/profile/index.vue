<template>
  <div class="page">
    <van-nav-bar title="我的" />

    <!-- 个人信息：emoji 头像 + 昵称 + 身高体重 + 衣柜数据 -->
    <section class="card me-card">
      <div class="me-card__top">
        <button
          type="button"
          class="avatar"
          aria-label="更换头像"
          @click="showAvatarPicker = true"
        >
          {{ store.avatar || '🐱' }}
        </button>

        <div class="me-card__fields">
          <van-field
            v-model="nickname"
            class="me-field"
            placeholder="起个昵称（最多 8 个字）"
            maxlength="8"
            @blur="saveField('nickname')"
          />
          <div class="body-row">
            <van-field
              v-model="height"
              class="me-field"
              type="digit"
              placeholder="身高"
              maxlength="3"
              @blur="saveField('height')"
            >
              <template #right-icon><span class="unit">cm</span></template>
            </van-field>
            <van-field
              v-model="weight"
              class="me-field"
              type="digit"
              placeholder="体重"
              maxlength="3"
              @blur="saveField('weight')"
            >
              <template #right-icon><span class="unit">kg</span></template>
            </van-field>
          </div>
        </div>
      </div>

      <!-- 衣柜数据：点击直达衣柜页 -->
      <button type="button" class="wardrobe-stat" @click="router.replace('/wardrobe')">
        <span class="wardrobe-stat__label">我的衣柜</span>
        <span class="wardrobe-stat__info">
          <template v-if="wardrobe.items.length">
            共 {{ wardrobe.items.length }} 件
            <em v-if="categorySummary">{{ categorySummary }}</em>
          </template>
          <template v-else>还空着，去添加</template>
          <van-icon name="arrow" color="rgba(62, 47, 35, 0.4)" />
        </span>
      </button>
    </section>

    <!-- 头像选择：8 个预设 emoji，点选即换 -->
    <van-popup v-model:show="showAvatarPicker" position="bottom" round>
      <div class="emoji-sheet">
        <div class="emoji-sheet__title">选个头像</div>
        <div class="emoji-grid">
          <button
            v-for="e in AVATAR_OPTIONS"
            :key="e"
            type="button"
            class="emoji-btn"
            :class="{ 'emoji-btn--on': (store.avatar || '🐱') === e }"
            @click="pickAvatar(e)"
          >
            {{ e }}
          </button>
        </div>
      </div>
    </van-popup>

    <!-- 穿衣画像：实时汇总下方三项设置，随点随变 -->
    <section class="card portrait">
      <h2 class="portrait__title">我的穿衣画像</h2>

      <!-- 什么都没选：引导语 -->
      <p v-if="isAllEmpty" class="portrait__empty">
        在下方选好偏好，将来的首页推荐会更懂你
      </p>

      <!-- 三行汇总，没设置的项显示浅灰占位 -->
      <template v-else>
        <div class="portrait__row">
          <span class="portrait__label">风格</span>
          <span class="portrait__value" :class="{ 'portrait__value--empty': !styleText }">
            {{ styleText || '未设置' }}
          </span>
        </div>
        <div class="portrait__row">
          <span class="portrait__label">肤色</span>
          <span class="portrait__value" :class="{ 'portrait__value--empty': !skinToneText }">
            {{ skinToneText || '未设置' }}
          </span>
        </div>
        <div class="portrait__row">
          <span class="portrait__label">场合</span>
          <span class="portrait__value" :class="{ 'portrait__value--empty': !occasionText }">
            {{ occasionText || '未设置' }}
          </span>
        </div>
      </template>
    </section>

    <!-- 风格偏好（多选） -->
    <section class="card">
      <h2 class="card__title">风格偏好</h2>
      <p class="card__desc">可多选，之后推荐搭配会优先参考你喜欢的风格</p>
      <div class="chip-row">
        <button
          v-for="s in STYLE_OPTIONS"
          :key="s.value"
          type="button"
          class="chip"
          :class="{ 'chip--on': store.styles.includes(s.value) }"
          @click="onToggle('style', s.value)"
        >
          {{ s.label }}
        </button>
      </div>
    </section>

    <!-- 肤色（单选，再点一下取消） -->
    <section class="card">
      <h2 class="card__title">肤色</h2>
      <p class="card__desc">帮助推荐更衬你肤色的颜色</p>
      <div class="chip-row">
        <button
          v-for="t in SKIN_TONE_OPTIONS"
          :key="t.value"
          type="button"
          class="chip"
          :class="{ 'chip--on': store.skinTone === t.value }"
          @click="onToggle('skin', t.value)"
        >
          <span class="skin-dot" :style="{ background: t.color }"></span>
          {{ t.label }}
        </button>
      </div>
    </section>

    <!-- 常去场合（多选） -->
    <section class="card">
      <h2 class="card__title">常去场合</h2>
      <p class="card__desc">可多选，按你常出的场合准备搭配方案</p>
      <div class="chip-row">
        <button
          v-for="o in OCCASION_OPTIONS"
          :key="o.value"
          type="button"
          class="chip"
          :class="{ 'chip--on': store.occasions.includes(o.value) }"
          @click="onToggle('occasion', o.value)"
        >
          {{ o.label }}
        </button>
      </div>
    </section>

    <p class="save-tip">改动会自动保存在本机</p>

    <!-- 帮助与反馈（参考竞品设置菜单） -->
    <van-cell-group class="help-group" :border="false">
      <van-cell title="常见问题" class="help-cell" is-link @click="openHelp('faq')" />
      <van-cell title="意见反馈" class="help-cell" is-link @click="openHelp('feedback')" />
      <van-cell title="关于「穿什么」" class="help-cell" is-link @click="openHelp('about')" />
    </van-cell-group>

    <!-- 帮助弹层：三个入口共用一个底部弹层 -->
    <van-popup
      :show="!!helpTab"
      position="bottom"
      round
      class="help-sheet"
      @update:show="onHelpSheetClose"
    >
      <!-- 常见问题 -->
      <div v-if="helpTab === 'faq'">
        <div class="help-sheet__title">常见问题</div>
        <div v-for="f in FAQS" :key="f.q" class="qa">
          <p class="qa__q">{{ f.q }}</p>
          <p class="qa__a">{{ f.a }}</p>
        </div>
      </div>

      <!-- 意见反馈 -->
      <div v-else-if="helpTab === 'feedback'">
        <div class="help-sheet__title">意见反馈</div>
        <van-field
          v-model="feedbackText"
          class="feedback-field"
          type="textarea"
          rows="4"
          maxlength="200"
          show-word-limit
          placeholder="说说哪里不好用、还想要什么功能…"
        />
        <van-button
          round
          block
          type="primary"
          class="feedback-btn"
          :disabled="!feedbackText.trim()"
          @click="submitFeedback"
        >
          提交反馈
        </van-button>
        <p class="feedback-note">本地内测阶段，反馈会先记录在本机</p>
      </div>

      <!-- 关于 -->
      <div v-else>
        <div class="help-sheet__title">关于「穿什么」</div>
        <p class="about-text">
          「穿什么」是你的口袋 AI 衣柜：拍照把衣服收进来、轻松管理衣柜，
          之后还有每日穿搭推荐、AI 试穿。
        </p>
        <p class="about-text about-text--sub">当前版本：本地内测版</p>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import 'vant/es/toast/style'
import {
  STYLE_OPTIONS,
  SKIN_TONE_OPTIONS,
  OCCASION_OPTIONS,
  AVATAR_OPTIONS,
  useProfileStore,
} from '../../stores/profile'
import { CATEGORIES, useWardrobeStore } from '../../stores/wardrobe'

const store = useProfileStore()
const wardrobe = useWardrobeStore()
const router = useRouter()

// 常见问题：只写本地内测阶段用户真会问的
const FAQS = [
  {
    q: '我的数据存在哪里？',
    a: '目前衣柜照片和个人偏好都保存在这台手机的浏览器里，不上传云端。换手机或清除浏览器数据会丢失，正式版会接入账号云同步。',
  },
  {
    q: '手机存储会满吗？',
    a: '照片都会压缩后再保存，但本地空间有限（约 5MB）。如果提示存满，可以删除一些旧单品再试。',
  },
  {
    q: 'AI 识别和白底图什么时候有？',
    a: '都在开发路线图上：AI 识别衣服、自动抠白底图、每日穿搭推荐会陆续推出。',
  },
]

// 衣柜数据行的类目分布，只列有单品的类目
const categorySummary = computed(() =>
  CATEGORIES.map((c) => ({ label: c.label, n: wardrobe.countByCategory(c.value) }))
    .filter((c) => c.n > 0)
    .map((c) => `${c.label} ${c.n}`)
    .join(' · ')
)

// 输入框绑本地副本，失焦时才写入 store 落盘（弹键盘过程不频繁写存储）
const nickname = ref(store.nickname)
const height = ref(store.height)
const weight = ref(store.weight)
const showAvatarPicker = ref(false)

function saveField(field) {
  const ok =
    field === 'nickname'
      ? store.setNickname(nickname.value)
      : field === 'height'
        ? store.setHeight(height.value)
        : store.setWeight(weight.value)
  // 回写 store 清理后的值（去空格、非法数字归空）
  nickname.value = store.nickname
  height.value = store.height
  weight.value = store.weight
  if (!ok) showToast('手机本地存储已满，设置没能保存')
}

function pickAvatar(e) {
  showAvatarPicker.value = false
  if (!store.setAvatar(e)) showToast('手机本地存储已满，设置没能保存')
}

// 帮助弹层：faq / feedback / about 三种内容共用一个弹层
const helpTab = ref('')
const feedbackText = ref('')

function openHelp(tab) {
  if (tab === 'feedback') feedbackText.value = ''
  helpTab.value = tab
}

function onHelpSheetClose(open) {
  if (!open) helpTab.value = ''
}

function submitFeedback() {
  if (!store.addFeedback(feedbackText.value.trim())) {
    showToast('手机本地存储已满，反馈没能记录')
    return
  }
  feedbackText.value = ''
  helpTab.value = ''
  showToast('已记录，谢谢反馈')
}

// 画像卡的汇总文案：值列表转成「通勤 · 简约」这样的展示
const styleText = computed(() =>
  store.styles.map((v) => store.styleLabel(v)).join(' · ')
)
const skinToneText = computed(() =>
  store.skinTone ? store.skinToneLabel(store.skinTone) : ''
)
const occasionText = computed(() =>
  store.occasions.map((v) => store.occasionLabel(v)).join(' · ')
)
const isAllEmpty = computed(
  () => !styleText.value && !skinToneText.value && !occasionText.value
)

// 统一入口：改动即落盘，存不下了（本地空间满）才打扰用户
function onToggle(kind, value) {
  const ok =
    kind === 'style'
      ? store.toggleStyle(value)
      : kind === 'skin'
        ? store.setSkinTone(value)
        : store.toggleOccasion(value)
  if (!ok) showToast('手机本地存储已满，设置没能保存')
}
</script>

<style scoped>
.card {
  margin: 12px;
  padding: 16px;
  border-radius: 12px;
  background: #fffdf8;
}

/* 个人信息卡：头像在左，昵称和身高体重在右，衣柜数据在底部 */
.me-card__top {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.avatar {
  flex: none;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #f7f2ea;
  box-shadow: inset 0 0 0 1px rgba(62, 47, 35, 0.08);
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
}

.me-card__fields {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.me-field {
  border-radius: 8px;
  background: #f7f2ea;
}

.body-row {
  display: flex;
  gap: 8px;
}

.body-row .me-field {
  flex: 1;
}

.unit {
  font-size: 12px;
  color: rgba(62, 47, 35, 0.55);
}

/* 衣柜数据行 */
.wardrobe-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 12px;
  padding-top: 12px;
  border: none;
  border-top: 1px dashed rgba(62, 47, 35, 0.15);
  background: none;
  font-size: 13px;
  color: #3e2f23;
  cursor: pointer;
}

.wardrobe-stat__label {
  font-size: 12px;
  color: rgba(62, 47, 35, 0.55);
}

.wardrobe-stat__info {
  display: flex;
  align-items: center;
}

.wardrobe-stat__info em {
  margin-left: 8px;
  font-style: normal;
  font-size: 12px;
  color: rgba(62, 47, 35, 0.55);
}

/* 帮助与反馈列表 */
.help-group {
  margin: 12px;
  border-radius: 12px;
  overflow: hidden;
}

.help-cell {
  background: #fffdf8;
}

/* 帮助弹层 */
.help-sheet {
  max-height: 80vh;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  overflow-y: auto;
}

.help-sheet__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 14px;
}

.qa__q {
  margin: 12px 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: #3e2f23;
}

.qa__a {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(62, 47, 35, 0.7);
}

.feedback-field {
  border-radius: 8px;
  background: #f7f2ea;
}

.feedback-btn {
  margin-top: 14px;
}

.feedback-note {
  margin: 10px 0 0;
  text-align: center;
  font-size: 12px;
  color: rgba(62, 47, 35, 0.4);
}

.about-text {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.7;
  color: rgba(62, 47, 35, 0.7);
}

.about-text--sub {
  text-align: center;
  font-size: 12px;
  color: rgba(62, 47, 35, 0.4);
}

/* 头像选择弹层 */
.emoji-sheet {
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
}

.emoji-sheet__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 14px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.emoji-btn {
  height: 56px;
  border: none;
  border-radius: 12px;
  background: #f7f2ea;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.emoji-btn--on {
  box-shadow: inset 0 0 0 2px #a97c5f;
}

/* 画像卡：标题带焦糖小竖条，和下面三张设置卡区分开 */
.portrait__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #3e2f23;
}

.portrait__title::before {
  content: '';
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: #a97c5f;
}

.portrait__empty {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(62, 47, 35, 0.55);
}

.portrait__row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 10px;
}

.portrait__label {
  flex: none;
  width: 30px;
  font-size: 12px;
  color: rgba(62, 47, 35, 0.55);
}

.portrait__value {
  font-size: 14px;
  color: #3e2f23;
  line-height: 1.5;
}

.portrait__value--empty {
  color: rgba(62, 47, 35, 0.35);
}

.card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #3e2f23;
}

.card__desc {
  margin: 4px 0 12px;
  font-size: 12px;
  color: rgba(62, 47, 35, 0.55);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid rgba(62, 47, 35, 0.18);
  background: #fffdf8;
  color: #3e2f23;
  font-size: 13px;
  cursor: pointer;
}

.chip--on {
  border-color: #a97c5f;
  background: #a97c5f;
  color: #fffdf8;
}

/* 肤色选项前的小色点：浅肤色加描边，奶白卡片上才看得清 */
.skin-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(62, 47, 35, 0.18);
}

.chip--on .skin-dot {
  box-shadow: inset 0 0 0 1px rgba(255, 253, 248, 0.6);
}

.save-tip {
  margin: 4px 0 16px;
  text-align: center;
  font-size: 12px;
  color: rgba(62, 47, 35, 0.4);
}
</style>
