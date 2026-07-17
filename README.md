# Navigation Hub

`nav.hfdz1119.top` 的独立 React 资源中心。它与现有作品集、知识库、图床和状态 Worker 分离部署。

## Local development

```powershell
npm install
npm run dev
npm test
npm run build
```

打开 Vite 输出的本地地址。生产构建目录为 `dist/`。

## Content workflow

- 新增分类：更新 `src/data/categories.json`。
- 新增标签：更新 `src/data/tags.json`。
- 新增资源：更新 `src/data/resources.json`，再运行 `npm test`；资源 ID、分类、标签和链接均由 Zod 验证。
- 长文详情：将 Markdown 放进 `src/content/resources/`，并在资源的 `detailPath` 中引用文件名。
- 精选资源：设置 `featured: true` 和唯一的 `featuredRank`。最近新增由 `createdAt` 自动排序。
- 本地图标：放入 `public/icons/<icon>.svg`；没有图标时界面会使用首字母回退。

## Cloudflare Pages

创建独立 Cloudflare Pages 项目，连接该项目所在 Git 仓库，设置：

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: `22` 或更新的 LTS

部署成功后在 Pages 的 Custom Domains 中绑定 `nav.hfdz1119.top`。`public/_redirects` 已包含 SPA 路由回退，资源详情链接可直接访问。

可选地在 Pages 环境变量中设置 `VITE_CF_ANALYTICS_TOKEN`。未设置时不会加载 Cloudflare Web Analytics beacon。

## Boundaries

浏览器收藏与搜索历史仅存于当前设备的 localStorage。导出文件为版本化 JSON，导入会合并有效资源 ID，不会覆盖已有收藏。状态栏只请求公开的 `https://status.hfdz1119.top/api/services`，不会包含私有路径或凭据。
