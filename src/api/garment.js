// AI 识别衣物：把照片发给智谱 GLM-4V 视觉模型，返回结构化属性。
// 走开发服务器代理 /api/zhipu（见 vite.config.js），API Key 不经过前端。
import { CATEGORIES, COLOR_OPTIONS } from '../stores/wardrobe'

const MODEL = 'glm-4v-flash' // 免费视觉模型，快；类目没认出来时用下面的兜底模型再试
const FALLBACK_MODEL = 'glm-4.1v-thinking-flash' // 更强但更慢，同样免费
const API_URL = '/api/zhipu/api/paas/v4/chat/completions'

// 让模型只能从我们的选项里挑，返回后才能稳定映射成程序用的值
const PROMPT = `你是衣物识别助手。看这张衣物照片，只输出一个 JSON 对象，不要输出任何其他文字：
{"category":"类目，必须严格是[上装,下装,鞋,包,配饰]这五个词之一，禁止写"上衣"等其他说法","subCategory":"细分类目，如：T恤、衬衫、针织开衫、牛仔裤、半身裙、运动鞋、双肩包、帽子","mainColor":"从[黑,白,灰,米,焦糖,棕,红,粉,橙,黄,绿,蓝,紫,多色]中选最接近的主色","pattern":"图案：纯色/条纹/格子/印花/撞色/其他","material":"猜测材质，如：棉、牛仔、皮革、针织、雪纺","seasons":["适合季节，从[春,夏,秋,冬]多选"],"occasions":["适合场合，从[通勤,休闲,运动,约会,正式]多选"],"name":"8字以内的中文名称，如：白色纯棉T恤"}
如果照片里没有人穿的衣物、包或配饰，category 填"配饰"并在 name 里说明看不出是什么。`

// 模型偶尔不守规矩输出同义词（如"上衣"），做个别名兜底
const CATEGORY_ALIASES = {
  top: ['上衣', '外套', '夹克', '西装', '风衣', '羽绒服', 'T恤', '衬衫', '卫衣', '针织衫', '开衫', '马甲', 'polo', 'POLO'],
  bottom: ['裤子', '牛仔裤', '西裤', '短裤', '半身裙', '裙', '阔腿裤', '休闲裤', '打底裤'],
  shoes: ['鞋子', '运动鞋', '皮鞋', '靴子', '凉鞋', '拖鞋', '帆布鞋', '板鞋'],
  bag: ['包包', '手提包', '双肩包', '背包', '斜挎包', '钱包', '手包'],
  accessory: ['首饰', '饰品', '帽子', '围巾', '丝巾', '眼镜', '手表', '项链', '耳环', '腰带', '袜子'],
}

function mapCategory(text) {
  if (!text) return null
  const hit = CATEGORIES.find((c) => c.label === text || c.value === text)
  if (hit) return hit.value
  for (const [value, words] of Object.entries(CATEGORY_ALIASES)) {
    if (words.some((w) => text.includes(w))) return value
  }
  return null
}

function mapColor(label) {
  if (!label) return null
  const hit = COLOR_OPTIONS.find((c) => c.label === label)
  if (hit) return hit.value
  const fuzzy = COLOR_OPTIONS.find((c) => label.includes(c.label))
  return fuzzy ? fuzzy.value : null
}

function parseJson(text) {
  // 去掉可能的 ```json 代码块包裹
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('识别结果不是 JSON')
  return JSON.parse(m[0])
}

function mapResult(raw) {
  return {
    category: mapCategory(raw.category),
    subCategory: raw.subCategory || '',
    mainColor: mapColor(raw.mainColor),
    pattern: raw.pattern || '',
    material: raw.material || '',
    seasons: Array.isArray(raw.seasons) ? raw.seasons : [],
    occasions: Array.isArray(raw.occasions) ? raw.occasions : [],
    name: (raw.name || '').slice(0, 12),
  }
}

async function callModel(model, imageDataUrl) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageDataUrl } },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    })
    if (!res.ok) {
      throw new Error(`AI 接口返回 ${res.status}（密钥或额度问题可查 bigmodel.cn 控制台）`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } finally {
    clearTimeout(timer)
  }
}

export async function recognizeGarment(imageDataUrl) {
  let raw
  try {
    raw = parseJson(await callModel(MODEL, imageDataUrl))
  } catch (e) {
    console.warn('[识别] 首次调用失败，重试一次：', e?.message || e)
    raw = parseJson(await callModel(MODEL, imageDataUrl)) // 网络抖动/超时就再试一次
  }

  let result = mapResult(raw)
  if (!result.category) {
    // 快模型没给出有效类目：换更强的识别模型兜底
    try {
      result = mapResult(parseJson(await callModel(FALLBACK_MODEL, imageDataUrl)))
    } catch (e) {
      console.warn('[识别] 兜底模型也失败：', e?.message || e)
    }
  }
  return result
}
