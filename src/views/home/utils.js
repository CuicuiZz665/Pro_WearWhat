// 首页本地工具：天气文案、穿搭推荐算法、日期格式化

// ---------- 天气 ----------

// WMO 天气代码 → [描述, emoji]（Open-Meteo 返回的就是这套代码）
const WEATHER_CODE_MAP = {
  0: ['晴', '☀️'],
  1: ['晴间多云', '🌤️'],
  2: ['多云', '⛅'],
  3: ['阴', '☁️'],
  45: ['雾', '🌫️'],
  48: ['雾凇', '🌫️'],
  51: ['毛毛雨', '🌦️'],
  53: ['毛毛雨', '🌦️'],
  55: ['毛毛雨', '🌦️'],
  56: ['冻毛毛雨', '🌧️'],
  57: ['冻毛毛雨', '🌧️'],
  61: ['小雨', '🌧️'],
  63: ['中雨', '🌧️'],
  65: ['大雨', '🌧️'],
  66: ['冻雨', '🌧️'],
  67: ['冻雨', '🌧️'],
  71: ['小雪', '🌨️'],
  73: ['中雪', '🌨️'],
  75: ['大雪', '❄️'],
  77: ['雪粒', '🌨️'],
  80: ['阵雨', '🌦️'],
  81: ['阵雨', '🌧️'],
  82: ['暴雨', '⛈️'],
  85: ['阵雪', '🌨️'],
  86: ['阵雪', '❄️'],
  95: ['雷阵雨', '⛈️'],
  96: ['雷阵雨伴冰雹', '⛈️'],
  99: ['雷阵雨伴冰雹', '⛈️'],
}

export function describeWeather(code) {
  return WEATHER_CODE_MAP[code] || ['未知', '🌡️']
}

// 体感温度 → 穿衣建议文案
export function dressingAdvice(feels) {
  if (feels >= 30) return '炎热，短袖短裤轻薄透气，注意防晒'
  if (feels >= 26) return '偏热，短袖或薄衫就很舒服'
  if (feels >= 21) return '舒适，单衣或薄长袖正合适'
  if (feels >= 16) return '微凉，长袖外再备一件薄外套'
  if (feels >= 10) return '偏凉，外套或卫衣可以安排上了'
  if (feels >= 4) return '冷，厚外套加毛衣保暖'
  return '严寒，羽绒服围巾帽子全副武装'
}

// 当前时间 → 「11月2日 周日」
export function formatDate(ts = Date.now()) {
  const d = new Date(ts)
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 周${week}`
}

// ---------- 穿搭推荐（本地规则版） ----------
// 说明：衣柜单品目前只有 类目/主色/备注 三个有效字段（季节、材质等
// 要等 AI 识别接入），所以第一版按「颜色和谐打分 + 随机扰动」挑。

// 主色 → 色彩家族（色值与 stores/wardrobe.js 的 COLOR_OPTIONS 一一对应）
const COLOR_FAMILY = {
  '#1f1f1f': 'neutral', // 黑
  '#f5f5f0': 'neutral', // 白
  '#9b9b9b': 'neutral', // 灰
  '#e8dcc8': 'neutral', // 米
  '#a97c5f': 'earth', // 焦糖
  '#8b5a2b': 'earth', // 棕
  '#d0342c': 'warm', // 红
  '#f28c28': 'warm', // 橙
  '#e6c84f': 'warm', // 黄
  '#f2b8c6': 'warm', // 粉
  '#6a994e': 'cool', // 绿
  '#3a6ea5': 'cool', // 蓝
  '#8e6bb8': 'cool', // 紫
  multi: 'multi', // 多色/花色
}

// 两件单品的颜色和谐分（0 ~ 3，越高越搭）
function pairScore(colorA, colorB) {
  const fa = COLOR_FAMILY[colorA] || 'unknown'
  const fb = COLOR_FAMILY[colorB] || 'unknown'
  // 没选颜色：不加分也不扣分
  if (fa === 'unknown' || fb === 'unknown') return 1.5
  // 多色本身花，配中性色还行，配花色容易乱
  if (fa === 'multi' || fb === 'multi') return fa === fb ? 1 : 1.6
  // 中性色（黑白灰米）百搭
  if (fa === 'neutral' || fb === 'neutral') return fa === fb ? 3 : 2
  // 同家族：焦糖配棕、红配粉，和谐
  if (fa === fb) return 2.4
  // 大地色 × 亮色：能穿
  if (fa === 'earth' || fb === 'earth') return 1.2
  // 暖亮色 × 冷色：红配绿、黄配紫这类撞色，扣分
  const warmCool = ['warm', 'cool']
  if (warmCool.includes(fa) && warmCool.includes(fb)) return 0.2
  return 1
}

function outfitScore(outfit) {
  const { top, bottom, shoe } = outfit
  // 上下装的搭配权重最高，鞋是锦上添花
  let s = pairScore(top.mainColor, bottom.mainColor) * 2
  if (shoe) {
    s += pairScore(top.mainColor, shoe.mainColor)
    s += pairScore(bottom.mainColor, shoe.mainColor)
  }
  return s
}

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]

// 一套搭配的唯一标识（判断重复、是否已收藏都用它）
export function outfitKey(outfit) {
  return [outfit.top, outfit.bottom, outfit.shoe]
    .filter(Boolean)
    .map((i) => i.id)
    .join('|')
}

// 生成一套推荐：随机抽 80 个组合打分（颜色和谐分 + 随机扰动），
// 从分数最高的前 3 名里再随机挑一套，保证「换一套」既顺眼又不重样。
// current：当前展示的这套（点「换一套」时传入）——
//   优先挑「上下装（和鞋）都和当前不同」的组合，让整套一起换新；
//   某个类目衣柜里不足两件时换不动，就不强求（比如裤子只有一条，裤子保持）。
export function generateOutfit(items, current = null) {
  const tops = items.filter((i) => i.category === 'top')
  const bottoms = items.filter((i) => i.category === 'bottom')
  const shoes = items.filter((i) => i.category === 'shoes')
  // 上装 + 下装是硬门槛，鞋可以没有
  if (!tops.length || !bottoms.length) return null

  const excludeKey = current ? outfitKey(current) : ''
  const wantNewTop = current && tops.length >= 2
  const wantNewBottom = current && bottoms.length >= 2
  const wantNewShoe = current && current.shoe && shoes.length >= 2

  const strict = [] // 整套都换新的候选（优先用）
  const loose = [] // 实在凑不齐「全换新」时兜底
  for (let n = 0; n < 80; n++) {
    const outfit = {
      top: rand(tops),
      bottom: rand(bottoms),
      shoe: shoes.length ? rand(shoes) : null,
    }
    const key = outfitKey(outfit)
    if (key === excludeKey) continue
    const scored = { outfit, score: outfitScore(outfit) + Math.random() * 1.2 }
    const allNew =
      (!wantNewTop || outfit.top.id !== current.top.id) &&
      (!wantNewBottom || outfit.bottom.id !== current.bottom.id) &&
      (!wantNewShoe || outfit.shoe.id !== current.shoe.id)
    if (allNew) strict.push(scored)
    else loose.push(scored)
  }
  const pool = strict.length ? strict : loose
  // 兜底池也空（衣柜太小，怎么抽都是当前这套）：原样回一套
  if (!pool.length) {
    return { top: tops[0], bottom: bottoms[0], shoe: shoes.length ? shoes[0] : null }
  }
  pool.sort((x, y) => y.score - x.score)
  return rand(pool.slice(0, Math.min(3, pool.length))).outfit
}
