import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 读 .env.local（ZHIPU_API_KEY 在里面，只留在开发服务器侧，不进前端代码）
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      // 按需自动引入 Vant 组件：模板里写 <van-xxx>，插件自动补全导入和样式
      Components({ resolvers: [VantResolver()] }),
    ],
    server: {
      host: true, // 允许局域网访问（手机调试），以后启动不用再加 --host
      // 允许 cloudflared 快速隧道的随机子域名访问（跨网络手机调试用）
      allowedHosts: ['.trycloudflare.com'],
      proxy: {
        // AI 接口转发：前端请求 /api/zhipu/** → https://open.bigmodel.cn/**
        // Authorization 由服务器注入，API Key 不暴露给浏览器
        '/api/zhipu': {
          target: 'https://open.bigmodel.cn',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zhipu/, ''),
          headers: { Authorization: `Bearer ${env.ZHIPU_API_KEY || ''}` },
        },
      },
    },
  }
})
