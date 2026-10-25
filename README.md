# MarkCard

一个在浏览器中把 Markdown 排版为 PNG 卡片的创作工具。

## 本地运行

需要 Node.js 24.21.0 和 pnpm 12.10.1（版本记录于 `.node-version` 与 `packageManager`）。

```powershell
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
```

打开终端显示的实际地址，默认是 http://127.0.0.1:5173/。端口占用时 Vite 会选择下一个可用端口。

## 已实现

- Markdown 编辑与安全渲染：标题、引用、列表、表格、链接、代码高亮。
- 12 套模板：极简白、奶油纸、墨色夜读、薄荷清新、落日渐变、极光紫、终端代码、杂志编辑、蓝图笔记、复古报刊、手帐便签、大字金句。
- 字体、配色、背景、宽度、边距、圆角、阴影、代码主题与署名调整；颜色使用 Popover 色板和自定义 HEX，宽度预设使用 Tabs。
- 单张自适应长卡，使用独占一行的 `<!-- card-break -->` 手动分卡，代码块内不分卡。
- 当前卡片或全部卡片 PNG 导出，支持 1× / 2×，逐张下载与进度提示。
- IndexedDB 当前草稿自动保存；本地图片、Markdown 导入导出、完整项目 JSON 备份恢复。
- 默认 Neutral 样式的三栏工作台；两条可拖动分隔线、右侧模板标签、手机标签页布局。界面根字号默认 16px、文字统一 1rem，可通过右上角全局设置调整界面字号（12–24px）及圆角（0–24px），设置保存在本地；卡片字号和圆角独立。全局设置以右侧抽屉展示，并提供亮色、暗色、跟随系统三种外观，跟随系统时自动响应系统主题变化。

通过编辑工具栏的“更多操作”导入、下载备份、载入示例或清空作品；Ctrl / Cmd + S 下载完整项目备份。切换模板保留正文和署名，将外观恢复为该模板默认值。

## 数据与限制

无需登录，没有服务端或云端同步。正文与图片留在当前浏览器；清理站点数据、更换浏览器或域名后无法保证恢复，应定期下载项目 JSON。JSON 包含图片，Markdown 文件只包含文本。

首期不自动请求外部图片，不代理跨域资源；遇到远程图片会显示替换提示，并阻止不完整导出。请用编辑器顶部工具栏的图片按钮插入 PNG/JPEG/WebP；单图 ≤ 5MB，合计 ≤ 20MB。正文最多 100,000 字符，项目导入最大 35MB。不支持原始 HTML 执行、自定义 CSS、公式、流程图、自动分页和 PDF/JPEG 导出。

卡片高度随内容增长；导出安全限制为单边 16,384px、总计 32MP，具体设备仍可能有更低限制。过长时手动分卡或降低倍率。浏览器可能要求允许多文件下载，也可逐张导出。

## 验证

```powershell
pnpm run check
pnpm run test
pnpm run build
pnpm exec playwright install chromium firefox webkit
pnpm run test:e2e
```

本机 Playwright 的 Chromium 项目使用已安装的 Microsoft Edge，CI 使用 Playwright Chromium。若本机没有 Edge，可移除 `playwright.config.ts` 的本机 channel 配置后使用下载的 Chromium。自动化覆盖三种浏览器引擎；手机采用 375px 视口验证，不等于 iOS/Android 真机验证。

工具栏包含撤销、重做、标题、加粗、斜体、删除线、引用、列表、链接、代码、表格、分隔线、分卡与图片。多张卡片在预览区纵向排列；底栏显示实时日期时间与本地存储说明。

测试包含可拖动布局、统一字号、实时钟、工具栏操作、分卡边界、不可信内容、备份校验、草稿恢复、图片导入恢复、12 套模板真实 PNG、存储失败与手机布局。测试下载和截图位于被 Git 忽略的 `artifacts/`。`pnpm format` 格式化业务代码与文档；CLI 生成的 UI 目录保留上游格式，Input 内为文件上传补充了无 v-model 的分支。

## 技术结构

Vue 3 + TypeScript + Vite + Pinia + Vue Router + Tailwind CSS + shadcn-vue。使用指定的 shadcnui-vue-simple-template 技能搭建，根目录 AGENTS.md 保存 UI 组件强制约束。

- `src/views/WorkspaceView.vue`：创作工作台与导入导出流程。
- `src/components/workspace/`：编辑工具栏、独立预览、模板标签、排版与背景设置。
- `src/components/card/CardRenderer.vue`：预览与导出共享的卡片组件。
- `src/templates/`、`src/styles/cards.css`：模板注册表、默认值与排版。
- `src/features/markdown/`：Markdown、安全净化与分卡。
- `src/features/persistence/`：IndexedDB、图片和项目备份校验。
- `src/features/export/`：独立快照、资源就绪检查、PNG 生成。

## GitHub Pages（已准备，尚未执行）

目标仓库：https://github.com/yeyongzhi/MarkCard 。本地分支保持 `dev`，按用户要求暂不推送，不会触发远程 Actions。

后续获准发布时，在仓库 Settings → Pages 将 Source 设为 GitHub Actions，并核实稳定分支是否为 `main`。工作流 `.github/workflows/deploy-pages.yml` 在 `main` push 或手动触发时执行类型检查、单元测试、生产构建、浏览器测试，成功后才上传并部署 dist；PR 仅检查，不部署。若实际默认分支不同，同步修改 push 分支。部署 job 仅允许仓库默认分支。

工作流使用 configure-pages 的 base_path 设置 Vite base；本地默认 `/`，Pages 项目站点一般为 `/MarkCard/`。Router 使用 hash history，避免静态托管刷新路由 404。可通过 `VITE_BASE_PATH` 覆盖构建路径，不要在 Vite 环境变量中存放密钥。未绑定自定义域名。

需要回滚时，回退引入问题的代码并重新构建发布；不可通过清空用户草稿解决升级兼容问题。

## 项目文档

- [项目说明书](docs/project-guide.md)
- [技术开发说明书](docs/technical-design.md)
