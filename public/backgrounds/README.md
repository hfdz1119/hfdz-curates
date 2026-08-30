# HFDZ Home background

项目内置 `hfdz-default-desktop.jpg` 和 `hfdz-default-mobile.jpg`，分别用于电脑和移动端；即使图床地址失效，也会自动回退到当前设备对应的默认背景。

如需替换项目默认背景，请保留桌面端和移动端两个文件名，或同步修改 `src/data/portalAppearance.ts`。

建议：

- 使用 WebP，横向图片建议至少 1920×1080。
- 文件尽量控制在 1 MB 以内。
- 重要主体放在画面中央附近，页面会通过 `object-fit: cover` 自动适配电脑和手机。
- 删除或缺少该图片时，首页会自动显示原有 Aurora 背景。
