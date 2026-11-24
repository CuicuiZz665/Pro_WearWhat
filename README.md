# 穿什么 WearWhat

> 面向手机 H5 的个人 AI 衣柜与穿搭助手：**拍照识别衣物 → 管理数字衣橱 → 按天气推荐穿搭**。
>
> 当前阶段：**本地内测**（未部署公网）· 个人独立 AI 产品项目 · 当前版本 **v0.2.0**
> （版本划分为追溯整理，Tag / Release 待补标，详见 [CHANGELOG.md](./CHANGELOG.md)）

## 功能现状

### ✅ 已实现（以 main 分支当前代码为准）

- **三页应用**（Vant 4 底部导航）：
  - **首页「今天穿什么」**：天气卡片（IP 自动定位城市，失败可手动搜索切换）、按当地天气生成本地规则穿搭推荐、一键收藏穿搭方案
  - **衣柜「我的衣柜」**：分类筛选 + 单品九宫格；拍照 / 选图添加单品，AI 自动识别后可手动修改；单品详情查看与编辑
  - **我的**：穿衣画像、风格偏好、肤色、常去场合设置
- **AI 衣物识别**（智谱 GLM-4V 视觉模型）：识别类目、细分类目、主色、图案、材质、适合季节、适合场合，并生成 8 字以内名称；主模型（glm-4v-flash）失败自动换兜底模型（glm-4.1v-thinking-flash）；类目识别带同义词别名兜底
- **AI 材质识别增强**（v0.2.0）：区分照片可直接观察的织法/面料外观与只能推测的纤维成分，返回「材质判断依据」；判断不出时如实标注「未知」；材质带「待确认」状态，由程序（而非 AI）根据用户操作维护
- **衣物重复检测**（v0.2.0）：添加单品时提示疑似重复
- **数据本地持久化**：衣柜、收藏穿搭、偏好均经 Pinia 写入 localStorage（key 前缀 `wearwhat_`），刷新不丢失

### 🚧 测试中

- 手机端真机内测与 AI 识别效果调优（含一个未提交的开发调试桥：手机浏览器访问 `/#/__inspect` 可把手机 localStorage 数据回传电脑，仅存在于开发服务器，构建产物不含）

### 🗺 规划中（未开工，不构成已上线承诺）

- **v0.3.0（暂定）**：AI 识别质量评测
- 白底商品图生成（本地部署 rembg 抠图）
- 云端部署：Cloudflare Pages（前端）+ Supabase（数据）
- AI 试穿（远期探索）

## 技术架构

| 层 | 选型 |
|---|---|
| 框架 | Vue 3（JS，`<script setup>`）+ Vite |
| UI | Vant 4，按需自动引入（unplugin-vue-components） |
| 路由 | vue-router 4，**hash 模式**（`/#/wardrobe`，静态托管不 404） |
| 状态 | Pinia（衣柜 `wardrobe` / 收藏穿搭 `outfits` / 偏好 `profile`），localStorage 持久化 |
| AI | 智谱 GLM-4V 系列：前端请求 `/api/zhipu/**` 由 Vite 开发服务器代理转发到 open.bigmodel.cn，`ZHIPU_API_KEY` 只存在于服务器侧，不进前端代码 |
| 天气 | open-meteo（天气 + 城市搜索）+ IP 定位（主 ipwho.is，备用 ipapi.co），免费无需注册 |
| 主题 | 温柔米杏（CSS 变量在 `src/styles/index.css`） |

## 本地运行

> 实测环境：macOS · Node v24 / npm 11（更低版本未测）。npm 已配国内镜像源。

```bash
npm install

# AI 识别必需：在项目根目录创建 .env.local（已被 .gitignore 忽略，勿提交勿外发）
#   ZHIPU_API_KEY=你的智谱APIKey

npm run dev     # 启动后访问 http://localhost:5173
npm run build   # 构建验证（每次改动后跑一次确认无错误）
```

**两点如实说明：**

1. **AI 识别依赖开发服务器代理**：`/api/zhipu` 转发是 `npm run dev` 的能力；`npm run build` 产出的静态文件没有该代理，直接部署后 AI 识别不可用。这也是当前阶段「本地内测、不部署公网」的原因之一，云端代理方案在规划中。
2. **手机访问属于开发调试方式，不是正式部署**：开发服务器已配 `host: true`，手机连同一 Wi-Fi 访问 `http://<电脑IP>:5173` 可用于调试；`vite.config.js` 亦允许 `*.trycloudflare.com` 隧道域名做跨网络调试。以上均为调试手段，稳定性以本地桌面访问为准。

## 目录结构

```
src/
├── api/        # 后端/AI 接口（garment.js 衣物识别、weather.js 定位与天气）
├── components/ # 跨页面通用组件
├── router/     # 页面地址表（hash 路由）
├── stores/     # Pinia：wardrobe 衣柜 / outfits 收藏穿搭 / profile 偏好
├── styles/     # 全局样式与米杏主题变量
└── views/      # 页面：home / wardrobe / profile
WearWhat/       # 产品文档中心（14 篇阶段文档 + 导航）
```

## 文档导航

| 文档 | 用途 |
|---|---|
| [WearWhat/README.md](./WearWhat/README.md) | 产品文档中心：立项说明书、用户研究等阶段文档的统一入口 |
| [PROJECT.md](./PROJECT.md) | 内部协作文档：技术决策、目录职责、协作规则（给 AI 助手与开发者看） |
| [GIT.md](./GIT.md) | Git 约定：远端、分支、提交信息、版本与发布规则 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本历史与变更记录 |

产品调研与需求文档的提交保留在 Git 历史中，不单独作为应用版本里程碑。

## Roadmap

- **v0.3.0（暂定）**：AI 识别质量评测
- 之后：白底商品图生成 → 云端部署（Cloudflare Pages + Supabase）→ AI 试穿（远期）

顺序与范围随内测反馈调整；已完成的变更记录见 [CHANGELOG.md](./CHANGELOG.md)。

---

个人独立项目，暂未设置开源许可证。项目演进细节见 Git 提交历史与 [WearWhat/README.md](./WearWhat/README.md)。
