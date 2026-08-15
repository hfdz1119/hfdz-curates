# HFDZ Home

`hfdz1119.top` 的个人网页入口。首页只收录会飞的猪自己的网页；原 HFDZ Curates 资源库保留在 `/curates`，不出现在首页导航中。

## Local development

```powershell
npm install
npm run dev
npm test
npm run build
```

生产构建目录为 `dist/`。

## Portal links

首页入口集中维护在 `src/data/portalSites.ts`。第一版固定包含：

- 个人主页：`me.hfdz1119.top`
- 私人笔记：HFDZ Knowledge Workers 地址
- 公开知识库：`wiki.hfdz1119.top`
- 图片管理：`image.hfdz1119.top`
- 服务状态：`status.hfdz1119.top`

入口页不请求实时状态，不包含服务器 IP、后台路径或凭据。状态详情由 Uptime Kuma 页面独立提供。

## Curates compatibility

- 资源库入口：`/curates`
- 资源详情：`/resources/:id`
- 分类、标签与资源仍由 `src/data/*.json` 管理。
- 收藏与搜索历史继续保存在当前设备的 localStorage。
- 资源详情 Markdown 继续放在 `src/content/resources/`。

## Cloudflare Pages

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: `22` 或更新的 LTS

先使用 Pages 预览地址完成验收，再将 `hfdz1119.top` 从 Portfolio 项目切换到 HFDZ Home。Portfolio 应先在 `me.hfdz1119.top` 验收通过。`public/_redirects` 保留 SPA 深链接回退，并只为已知 Portfolio 路径设置精确 301。

Cloudflare 项目、生产分支、自定义域名及重定向规则必须在仪表盘中单独核验；本仓库配置不能证明线上状态。
