# 穿什么（WearWhat）项目说明

> **任何 AI 助手/新会话在动手前，请先读完本文件。**
> 用户是编程新手，解释请用白话。

## 一、项目简介

- 面向手机 H5 的个人 AI 衣柜与穿搭助手，产品名**「穿什么」**
- 核心闭环：拍照识别单品 → 生成白底商品图 → 管理衣柜 → 穿搭推荐（远期：AI 试穿）
- 当前阶段：**本地内测**，不部署公网；后续计划 Cloudflare Pages（前端）+ Supabase（数据）免费方案
- 项目根目录：`/Users/cuiweikang/Documents/Pro_WearWhat`

## 二、环境与常用命令

- macOS，Node v24.18 / npm 11
- npm 已配国内镜像源（npmmirror），缓存目录已换 `~/.npm-cache`（旧缓存有 root 权限问题，勿改回）
- 启动开发服务器：`npm run dev`（vite.config.js 已配 `host: true`，手机连同一 Wi-Fi 访问 `http://电脑IP:5173`）
- 构建验证：`npm run build`（每次改动后跑一次确认无错误）

## 三、技术栈

- Vue3 + Vite（vue 模板，JS 非 TS）
- UI 组件库：**Vant 4**，已配按需自动引入（unplugin-vue-components + @vant/auto-import-resolver），模板里直接写 `<van-xxx>` 即可，无需手动 import
- 路由：vue-router 4，**hash 模式**（部署到任何静态托管都不 404，勿改 history 模式）
- 数据：Pinia 已安装未使用，衣柜数据将存 `src/stores/`

## 四、目录结构与职责

```
src/
├── api/            # 所有后端/AI 接口请求（识别 garment.js、白底图 matting.js、推荐 outfit.js）
├── assets/         # 图片素材
├── components/     # 跨页面通用组件（如单品卡片 GarmentCard.vue）
├── composables/    # 可复用逻辑（如 usePhotoUpload.js 拍照+压缩+上传）
├── router/         # 页面地址表（新页面在此登记）
├── stores/         # 全局共享数据（衣柜数据，三页共用）
├── styles/         # 全局样式与主题（index.css 含米杏主题变量）
├── utils/          # 纯工具函数
└── views/          # 页面，一页一文件夹
    ├── home/       # 首页：天气+今日推荐+收藏的穿搭方案
    ├── wardrobe/   # 衣柜：分类筛选+白底图九宫格+添加单品入口
    └── profile/    # 我的：风格偏好/肤色/场合设置
```

## 五、已定决策（不要擅自更改，改动前先问用户）

| 决策 | 内容 |
|---|---|
| 页面结构 | **三页**：首页 / 衣柜 / 我的（穿搭方案并入首页） |
| 主题 | **温柔米杏**：背景 `#f7f2ea`、卡片 `#fffdf8`、正文 `#3e2f23`、主色焦糖 `#a97c5f`（CSS 变量在 `styles/index.css`） |
| 底部导航图标 | 首页 `home-o`、衣柜 `bag-o`、我的 `user-o` |
| 协作规则 | **产品层决定**（页面/颜色/文案/功能取舍）出选项让用户拍板；**技术层默认**可自行决定但说明理由 |
| 命名 | 产品名"穿什么"，npm 包名 `pro-wearwhat`，文件夹 `Pro_WearWhat` |

## 六、单品数据字段（草案，衣柜页开发时落地到 stores）

`id / 类目(上装·下装·鞋·包·配饰) / 细分类目 / 主色 / 材质 / 图案 / 风格标签 / 适合季节 / 适合场合 / 原图URL / 白底图URL / 用户标签 / 穿着频次 / 添加时间`

## 七、开发路线图

1. **衣柜页（进行中，下一任务）**：本地版——选图/拍照上传 + 单品卡片九宫格 + 分类筛选，数据暂存 localStorage（经 Pinia）
2. AI 识别：多模态大模型识图输出结构化属性 → `api/garment.js`
3. 白底图：本地部署 rembg 抠图 → `api/matting.js`
4. 首页：天气 API + 规则版推荐
5. 我的页：偏好设置
6. 部署：Cloudflare Pages（`chuanshenme` 项目名）+ Supabase

## 八、多窗口协作规则（重要）

- 每个窗口**只负责自己的 `src/views/<页面名>/` 文件夹**内的文件
- 共享文件（`router/` `styles/` `stores/` `api/` `components/`）需要改动时：小改可直接做但要在回复里声明；结构性改动回主窗口处理
- 动手前先看自己负责的文件夹现状，避免覆盖别人的工作
- 每完成一个功能跑 `npm run build` 验证
