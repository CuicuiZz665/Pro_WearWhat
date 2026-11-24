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

    <!-- 材质（AI 推测）：状态由程序维护，AI 结果一律待确认；用户确认/修改后才变已确认 -->
    <div class="field-label">
      材质
      <span
        v-if="material"
        class="status-pill"
        :class="materialStatus === 'confirmed' ? 'status-pill--ok' : 'status-pill--pending'"
      >{{ materialStatus === 'confirmed' ? '已确认' : '待确认' }}</span>
    </div>
    <div class="material-row">
      <button
        type="button"
        class="chip"
        :class="{ 'chip--on': showMaterialEditor }"
        @click="showMaterialEditor = !showMaterialEditor"
      >
        {{ material || '未识别，点此填写' }}
      </button>
      <button
        v-if="material && materialStatus !== 'confirmed'"
        type="button"
        class="chip chip--confirm"
        @click="confirmMaterial"
      >
        ✓ 确认
      </button>
    </div>
    <!-- AI 判断依据：默认只显示一行，点「依据」展开全文 -->
    <div v-if="materialReason" class="material-reason">
      <span class="material-reason__tag" @click="reasonExpanded = !reasonExpanded">依据</span>
      <span class="material-reason__text" :class="{ 'material-reason__text--full': reasonExpanded }">{{ materialReason }}</span>
    </div>
    <!-- 材质修改面板：选常用词 / 自定义 / 未知，选完即视为已确认 -->
    <div v-if="showMaterialEditor" class="material-editor">
      <div class="chip-row">
        <button
          v-for="m in MATERIAL_OPTIONS"
          :key="m"
          type="button"
          class="chip"
          :class="{ 'chip--on': material === m }"
          @click="pickMaterial(m)"
        >
          {{ m }}
        </button>
        <button
          type="button"
          class="chip"
          :class="{ 'chip--on': material === '未知' }"
          @click="pickMaterial('未知')"
        >
          未知
        </button>
      </div>
      <div class="material-editor__custom">
        <van-field
          v-model="customMaterial"
          class="name-field"
          placeholder="其他材质，手动输入"
          maxlength="12"
          @keyup.enter="submitCustomMaterial"
        />
        <van-button size="small" round class="material-editor__btn" @click="submitCustomMaterial">填入</van-button>
      </div>
      <div class="material-editor__tip">选择或输入后即视为已确认；不处理也可直接保存（保持待确认）</div>
    </div>

    <!-- 备注（可选） -->
    <div class="field-label">备注（可选）</div>
    <van-field
      v-model="name"
      class="name-field"
      placeholder="给这件衣服起个名，方便认"
      maxlength="12"
    />

    <!-- 识别中禁止保存：避免识别返回前表单还挂着旧照片属性（或空值）就被存进去；失败后按钮恢复，手动填完照样能存 -->
    <div class="form-sheet__footer">
      <van-button round block type="primary" :loading="saving" :disabled="recognizing" @click="onSave">保存</van-button>
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
// AI 识别的扩展属性：暂无手动输入入口，识别后随保存写入（见 autoRecognize / onSave）
const subCategory = ref('')
const material = ref('')
const materialReason = ref('')
// 材质确认状态，只由程序根据用户操作维护：pending 待确认 / confirmed 用户已确认。
// AI 识别结果一律置 pending，AI 永远无权声称已确认。
const materialStatus = ref('pending')
const pattern = ref('')
const seasons = ref([])
const occasions = ref([])
const saving = ref(false)

// 材质确认区：常用材质候选（织法/成分混排，与现有 material 字段的取词习惯一致）
const MATERIAL_OPTIONS = ['棉', '羊毛', '羊绒', '真丝', '亚麻', '牛仔', '皮革', '针织', '雪纺', '涤纶', '腈纶']
const showMaterialEditor = ref(false)
const customMaterial = ref('')
const reasonExpanded = ref(false)

const showPicker = ref(false)
const cameraInput = ref(null)
const albumInput = ref(null)

// AI 自动识别状态；用户手动选过的字段不被识别结果覆盖
const recognizing = ref(false)
const recognizeHint = ref('')
const userTouched = ref({ category: false, mainColor: false, material: false })
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
    // 编辑模式带入已有扩展字段，保存时不至于被空值覆盖丢失
    subCategory.value = props.garment?.subCategory || ''
    material.value = props.garment?.material || ''
    materialReason.value = props.garment?.materialReason || ''
    // 旧数据没有 materialStatus：只在内存里按待确认展示，不写回 localStorage
    materialStatus.value = props.garment?.materialStatus || 'pending'
    pattern.value = props.garment?.pattern || ''
    seasons.value = Array.isArray(props.garment?.seasons) ? props.garment.seasons : []
    occasions.value = Array.isArray(props.garment?.occasions) ? props.garment.occasions : []
    recognizing.value = false
    recognizeHint.value = ''
    userTouched.value = { category: false, mainColor: false, material: false }
    showMaterialEditor.value = false
    customMaterial.value = ''
    reasonExpanded.value = false
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

// 换照片/删照片：旧照片对应的一切识别属性全部作废，等新照片重新识别。
// 否则照片 B 会沿用照片 A 的名称/类目/材质等结论，确认状态也是对着旧照片确认的，不能再算数。
function resetForNewPhoto() {
  category.value = ''
  mainColor.value = ''
  name.value = ''
  subCategory.value = ''
  pattern.value = ''
  seasons.value = []
  occasions.value = []
  material.value = ''
  materialReason.value = ''
  materialStatus.value = 'pending'
  // 照片换了，用户在旧照片上的手动修改一并作废，新识别结果才写得进来
  userTouched.value = { category: false, mainColor: false, material: false }
  showMaterialEditor.value = false
  customMaterial.value = ''
  reasonExpanded.value = false
}

function onPickerSelect(action) {
  showPicker.value = false
  if (action.name === '拍照') cameraInput.value?.click()
  else if (action.name === '从相册选择') albumInput.value?.click()
  else if (action.name === '删除照片') {
    photo.value = ''
    resetForNewPhoto()
  }
}

async function onFileChosen(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // 允许下次选同一张图也能触发 change
  if (!file) return
  saving.value = true
  try {
    photo.value = await compressImage(file)
    resetForNewPhoto() // 新照片的识别属性必须重新识别，不能带着旧照片的结论
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

// 名称是 AI 按模板生成的「颜色+材质/款式+品类」，颜色信息已由 mainColor 字段单独承载，
// 比较相似度前只剥掉开头的颜色前缀（含深/浅修饰，如"深蓝色"），
// 不删名称中间的颜色单字，避免误删有意义的文字
const COLOR_WORDS = [...COLOR_OPTIONS.map((c) => c.label), '深', '浅']

function stripColorPrefix(name) {
  let s = name
  let stripped = true
  while (stripped) {
    stripped = false
    for (const w of COLOR_WORDS) {
      if (s.startsWith(w)) {
        s = s.slice(w.length)
        stripped = true
        break
      }
    }
  }
  return s.trim()
}

// 名字像不像：剥掉颜色前缀后，完全相等 / 一方包含另一方 / 有 2 字以上重合（如"红衬衫"vs"红色衬衫"）
function namesAlike(a, b) {
  if (!a || !b) return false
  const sa = stripColorPrefix(a)
  const sb = stripColorPrefix(b)
  if (!sa || !sb) return false // 剥完只剩颜色词，没有区分度
  if (sa === sb || sa.includes(sb) || sb.includes(sa)) return true
  for (let i = 0; i + 2 <= sa.length; i++) {
    if (sb.includes(sa.slice(i, i + 2))) return true
  }
  return false
}

// 细分类目像不像：相等或一方包含另一方都算同类（"衬衫"和"长袖衬衫"不算不同款）；
// 双方都有且互不包含（如"衬衫"vs"毛衣"）才算明确不同的款
function subCategoriesMatch(a, b) {
  if (!a || !b) return true // 一方缺失时不以此排除，交给名称判断
  return a === b || a.includes(b) || b.includes(a)
}

// 不同照片但很像的同款：类目 + 主色 + 细分类目 + 名称都对得上时才提示
function checkLookalike(r) {
  if (dupGuard.value || !r.category || !r.mainColor || !r.name) return
  const hit = store.items.find((item) => {
    if (item.id === props.garment?.id) return false
    return (
      item.category === r.category &&
      item.mainColor === r.mainColor &&
      subCategoriesMatch(item.subCategory, r.subCategory) &&
      namesAlike(item.name, r.name)
    )
  })
  if (hit) {
    dupGuard.value = true
    dupMessage.value = `衣柜里有一件可能相似的「${hit.name}」（类目、颜色、款式都相近），不一定是同一件衣服。若不是，可以选择继续添加。`
    showDupDialog.value = true
  }
}

function closeForm() {
  emit('update:show', false)
}

// 用户表态「AI 猜得对」：值不变，只翻确认状态（状态只能由用户操作触发）
function confirmMaterial() {
  if (!material.value) return
  materialStatus.value = 'confirmed'
}

// 用户改材质：改完即视为已确认；AI 的旧依据不再适用，换成用户填写说明；
// 并标记 userTouched，防止这张照片迟到的识别结果覆盖用户输入
function pickMaterial(value) {
  material.value = value
  materialReason.value = '用户手动填写'
  materialStatus.value = 'confirmed'
  userTouched.value.material = true
  showMaterialEditor.value = false
  reasonExpanded.value = false
}

function submitCustomMaterial() {
  const v = customMaterial.value.trim()
  if (!v) return
  pickMaterial(v.slice(0, 12))
  customMaterial.value = ''
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
    // 扩展字段直接采用识别结果（AI 漏返回时兜底为空值，不影响保存）；
    // 写入前已通过 seq 校验，换照片后旧结果不会串进来
    subCategory.value = r.subCategory || ''
    // 材质三件套随识别结果写入并重置为待确认；
    // 但用户在这张照片上手动改过材质时不覆盖（迟到的识别结果不能盖掉用户输入）
    if (!userTouched.value.material) {
      material.value = r.material || ''
      materialReason.value = r.materialReason || ''
      materialStatus.value = 'pending' // AI 结果一律待确认，已确认只能来自用户操作
    }
    pattern.value = r.pattern || ''
    seasons.value = Array.isArray(r.seasons) ? r.seasons : []
    occasions.value = Array.isArray(r.occasions) ? r.occasions : []
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
    // AI 识别的扩展属性（编辑时由 watch 从旧数据带回，不会因保存而丢失）
    subCategory: subCategory.value,
    material: material.value,
    materialReason: materialReason.value,
    // 确认状态随表单落盘；用户没处理过就保持 pending，不影响保存
    materialStatus: materialStatus.value || 'pending',
    pattern: pattern.value,
    seasons: seasons.value,
    occasions: occasions.value,
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

/* 材质确认区 */
.status-pill {
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  vertical-align: 1px;
}

.status-pill--pending {
  color: #b06e2c;
  background: rgba(242, 140, 40, 0.14);
}

.status-pill--ok {
  color: #4c7a3d;
  background: rgba(106, 153, 78, 0.14);
}

.material-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip--confirm {
  border-color: #6a994e;
  color: #4c7a3d;
  background: rgba(106, 153, 78, 0.08);
}

.material-reason {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 8px;
  font-size: 11px;
  color: rgba(62, 47, 35, 0.6);
}

.material-reason__tag {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  color: #a97c5f;
  background: rgba(169, 124, 95, 0.1);
  cursor: pointer;
}

.material-reason__text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1; /* 默认一行，点「依据」展开全文 */
  overflow: hidden;
}

.material-reason__text--full {
  -webkit-line-clamp: unset;
}

.material-editor {
  margin-top: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(169, 124, 95, 0.06);
}

.material-editor__custom {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.material-editor__custom .name-field {
  flex: 1;
}

.material-editor__btn {
  flex-shrink: 0;
  color: #a97c5f;
  border-color: #a97c5f;
}

.material-editor__tip {
  margin-top: 8px;
  font-size: 10px;
  color: rgba(62, 47, 35, 0.5);
}

.form-sheet__footer {
  margin-top: 20px;
}
</style>
