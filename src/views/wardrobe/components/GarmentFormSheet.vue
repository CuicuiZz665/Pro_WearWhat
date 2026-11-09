<template>
  <van-popup
    :show="show"
    position="bottom"
    round
    closeable
    class="form-sheet"
    @update:show="$emit('update:show', $event)"
  >
    <div class="form-sheet__title">{{ isEdit ? '编辑单品' : '添加单品' }}</div>

    <!-- 照片：未选时是上传框，选了之后是预览图，点击都可重新选 -->
    <div v-if="!photo" class="photo-box" @click="showPicker = true">
      <van-icon name="photograph" size="26" color="#a97c5f" />
      <span>拍照 / 从相册选择</span>
    </div>
    <div v-else class="photo-preview" @click="showPicker = true">
      <img :src="photo" alt="单品照片" />
      <span class="photo-preview__tip">点击更换</span>
    </div>

    <!-- AI 自动识别状态 -->
    <div v-if="recognizeHint" class="recognize-hint">
      <van-loading v-if="recognizing" size="14" color="#a97c5f" />
      <span>{{ recognizeHint }}</span>
    </div>

    <!-- 类目（必选） -->
    <div class="field-label">类目 <em>*</em></div>
    <div class="chip-row">
      <button
        v-for="c in CATEGORIES"
        :key="c.value"
        type="button"
        class="chip"
        :class="{ 'chip--on': category === c.value }"
        @click="pickCategory(c.value)"
      >
        {{ c.label }}
      </button>
    </div>

    <!-- 主色（可选，再点一下取消选中） -->
    <div class="field-label">主色（可选）</div>
    <div class="swatch-row">
      <button
        v-for="c in COLOR_OPTIONS"
        :key="c.value"
        type="button"
        class="swatch"
        :class="{
          'swatch--on': mainColor === c.value,
          'swatch--light': isLightColor(c.value),
        }"
        :style="{ background: swatchBg(c.value) }"
        @click="pickColor(c.value)"
      >
        <span v-if="c.value === 'multi'">多色</span>
      </button>
    </div>

    <!-- 备注（可选） -->
    <div class="field-label">备注（可选）</div>
    <van-field
      v-model="name"
      class="name-field"
      placeholder="给这件衣服起个名，方便认"
      maxlength="12"
    />

    <div class="form-sheet__footer">
      <van-button round block type="primary" :loading="saving" @click="onSave">保存</van-button>
    </div>

    <!-- 拍照 or 相册 -->
    <van-action-sheet
      v-model:show="showPicker"
      :actions="pickerActions"
      cancel-text="取消"
      @select="onPickerSelect"
    />

    <!-- 隐藏的文件选择框：capture 限定调用相机 -->
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      hidden
      @change="onFileChosen"
    />
    <input ref="albumInput" type="file" accept="image/*" hidden @change="onFileChosen" />

    <!-- 疑似重复：同一张照片或很像的同款，让用户自己决定加不加 -->
    <van-dialog
      v-model:show="showDupDialog"
      title="疑似重复"
      :message="dupMessage"
      show-cancel-button
      confirm-button-text="仍然添加"
      cancel-button-text="不加了"
      @cancel="closeForm"
    />
  </van-popup>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { showToast } from 'vant'
import 'vant/es/toast/style'
import { CATEGORIES, COLOR_OPTIONS, useWardrobeStore } from '../../../stores/wardrobe'
import { recognizeGarment } from '../../../api/garment'
import { compressImage, dhash, hammingDistance } from '../utils'

const props = defineProps({
  show: { type: Boolean, default: false },
  // 传入已有单品 = 编辑模式；不传 = 添加模式
  garment: { type: Object, default: null },
  // 添加模式的默认类目：顶部标签停在某个分类（如「上装」）时自动带入，用户不用再选
  defaultCategory: { type: String, default: '' },
})
const emit = defineEmits(['update:show', 'saved'])

const store = useWardrobeStore()
const isEdit = computed(() => !!props.garment)

const photo = ref('')
const category = ref('')
const mainColor = ref('')
const name = ref('')
const saving = ref(false)

const showPicker = ref(false)
const cameraInput = ref(null)
const albumInput = ref(null)

// AI 自动识别状态；用户手动选过的字段不被识别结果覆盖
const recognizing = ref(false)
const recognizeHint = ref('')
const userTouched = ref({ category: false, mainColor: false })
let recognizeSeq = 0 // 换照片会让旧识别结果作废，避免乱填

// 重复检测：照片指纹比对（同一张照片）+ 属性软匹配（很像的同款）
const photoHash = ref('')
const dupGuard = ref(false) // 每张照片最多提示一次
const showDupDialog = ref(false)
const dupMessage = ref('')

const pickerActions = computed(() => {
  const actions = [{ name: '拍照' }, { name: '从相册选择' }]
  if (photo.value) actions.push({ name: '删除照片', color: '#d0342c' })
  return actions
})

// 每次打开弹层时重置表单：编辑模式带入单品已有信息；添加模式带入顶部标签选中的类目
watch(
  () => props.show,
  (open) => {
    if (!open) return
    photo.value = props.garment?.image || ''
    category.value = props.garment?.category || props.defaultCategory || ''
    mainColor.value = props.garment?.mainColor || ''
    name.value = props.garment?.name || ''
    recognizing.value = false
    recognizeHint.value = ''
    userTouched.value = { category: false, mainColor: false }
    // 重复检测状态复位；编辑模式带入旧照片的指纹（换照片会重算）
    photoHash.value = props.garment?.imageHash || ''
    dupGuard.value = false
    showDupDialog.value = false
    if (props.garment?.image && !photoHash.value) {
      dhash(props.garment.image)
        .then((h) => {
          if (photo.value === props.garment?.image) photoHash.value = h
        })
        .catch(() => {})
    }
  }
)

function pickCategory(value) {
  userTouched.value.category = true
  category.value = value
}

function pickColor(value) {
  userTouched.value.mainColor = true
  mainColor.value = mainColor.value === value ? '' : value
}

function swatchBg(value) {
  return value === 'multi'
    ? 'conic-gradient(#d0342c, #f28c28, #e6c84f, #6a994e, #3a6ea5, #8e6bb8, #d0342c)'
    : value
}

// 浅色色块加个描边，否则在奶白背景上看不见
function isLightColor(value) {
  return ['#f5f5f0', '#e8dcc8', '#e6c84f', '#f2b8c6'].includes(value)
}

function onPickerSelect(action) {
  showPicker.value = false
  if (action.name === '拍照') cameraInput.value?.click()
  else if (action.name === '从相册选择') albumInput.value?.click()
  else if (action.name === '删除照片') photo.value = ''
}

async function onFileChosen(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // 允许下次选同一张图也能触发 change
  if (!file) return
  saving.value = true
  try {
    photo.value = await compressImage(file)
    autoRecognize()
    checkPhotoDuplicate()
  } catch {
    showToast('这张图读取失败，换一张试试')
  } finally {
    saving.value = false
  }
}

// 同一张照片重复上传：本地指纹比对，瞬间出结果、不花钱
async function checkPhotoDuplicate() {
  const seq = recognizeSeq
  try {
    const hash = await dhash(photo.value)
    if (seq !== recognizeSeq || dupGuard.value) return // 照片换过了或已提示过
    photoHash.value = hash
    let best = null
    for (const item of store.items) {
      if (item.id === props.garment?.id || !item.imageHash) continue
      const d = hammingDistance(hash, item.imageHash)
      if (d <= 8 && (!best || d < best.d)) best = { item, d }
    }
    if (best) {
      dupGuard.value = true
      const label = best.item.name || store.categoryLabel(best.item.category)
      dupMessage.value = `这张照片好像已经添加过，衣柜里有一件「${label}」。要继续添加吗？`
      showDupDialog.value = true
    }
  } catch {
    // 指纹算不出来不影响正常添加
  }
}

// 名字像不像：完全相等 / 一方包含另一方 / 有 2 字以上重合（如"红衬衫"vs"红色衬衫"）
function namesAlike(a, b) {
  if (!a || !b) return false
  if (a === b || a.includes(b) || b.includes(a)) return true
  for (let i = 0; i + 2 <= a.length; i++) {
    if (b.includes(a.slice(i, i + 2))) return true
  }
  return false
}

// 不同照片但很像的同款：类目 + 主色 + 名称都对得上时提示
function checkLookalike(r) {
  if (dupGuard.value || !r.category || !r.mainColor || !r.name) return
  const hit = store.items.find((item) => {
    if (item.id === props.garment?.id) return false
    return (
      item.category === r.category &&
      item.mainColor === r.mainColor &&
      namesAlike(item.name, r.name)
    )
  })
  if (hit) {
    dupGuard.value = true
    dupMessage.value = `衣柜里已有一件很像的「${hit.name}」（类目、颜色、名称都相近），可能是同一件衣服。要继续添加吗？`
    showDupDialog.value = true
  }
}

function closeForm() {
  emit('update:show', false)
}

// 选完照片自动识别：类目、主色自动选好，名称给个建议；失败不拦着，手动填就行
async function autoRecognize() {
  const seq = ++recognizeSeq
  recognizing.value = true
  recognizeHint.value = 'AI 识别中…'
  try {
    const r = await recognizeGarment(photo.value)
    if (seq !== recognizeSeq) return // 等待期间照片换过了，这次结果作废
    if (r.category && !userTouched.value.category) category.value = r.category
    if (r.mainColor && !userTouched.value.mainColor) mainColor.value = r.mainColor
    if (r.name && !name.value.trim()) name.value = r.name
    recognizeHint.value = r.category
      ? '已自动识别，可手动修改'
      : 'AI 没认出类目，手动选一下更稳妥'
    checkLookalike(r)
  } catch {
    if (seq !== recognizeSeq) return
    recognizeHint.value = '没认出来，手动选一下类目就行'
  } finally {
    if (seq === recognizeSeq) recognizing.value = false
  }
}

function onSave() {
  if (!photo.value) {
    showToast('请先添加一张照片')
    return
  }
  if (!category.value) {
    showToast('请选择类目')
    return
  }
  const data = {
    image: photo.value,
    imageHash: photoHash.value, // 供以后上传时做重复检测
    category: category.value,
    mainColor: mainColor.value,
    name: name.value.trim(),
  }
  const ok = isEdit.value ? store.update(props.garment.id, data) : store.add(data)
  if (!ok) {
    // localStorage 存满：不关弹层，让用户换张图或删些旧衣服再试
    showToast('手机本地存储已满，删除一些旧单品再试')
    return
  }
  showToast(isEdit.value ? '已保存' : '已加入衣柜')
  emit('saved')
}
</script>

<style scoped>
.form-sheet {
  max-height: 88vh;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  overflow-y: auto;
}

.form-sheet__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 14px;
}

.photo-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 150px;
  border: 1px dashed #a97c5f;
  border-radius: 12px;
  color: #a97c5f;
  font-size: 13px;
  background: rgba(169, 124, 95, 0.04);
  cursor: pointer;
}

.photo-preview {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
}

.photo-preview img {
  display: block;
  width: 100%;
  max-height: 260px;
  object-fit: contain;
  background: #fff;
}

.photo-preview__tip {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  color: #fffdf8;
  background: rgba(62, 47, 35, 0.55);
}

.recognize-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #a97c5f;
}

.field-label {
  margin: 16px 0 8px;
  font-size: 13px;
  color: #3e2f23;
}

.field-label em {
  font-style: normal;
  color: #d0342c;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
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

.swatch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.swatch {
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: #3e2f23;
}

.swatch--light {
  box-shadow: inset 0 0 0 1px rgba(62, 47, 35, 0.15);
}

.swatch--on {
  outline: 2px solid #a97c5f;
  outline-offset: 2px;
}

.name-field {
  border-radius: 8px;
  background: #f7f2ea;
}

.form-sheet__footer {
  margin-top: 20px;
}
</style>
