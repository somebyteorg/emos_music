# AGENTS.md — EMOS Music 工程规范

> **每次开始新功能或修改代码前，必须先阅读本文件。**

## 项目概述

EMOS Music 是一个基于 SvelteKit 的音乐播放器前端项目，使用 EMOS REST API 作为音乐数据源。

- **框架**: SvelteKit + Svelte 5 Runes 模式
- **样式**: 传统 CSS + CSS 自定义属性（无 Tailwind）
- **视觉**: 玻璃拟态效果
- **数据源**: EMOS REST API（通过 Vite 代理 `/api/emos`，接口以 Postman 集合为准）
- **播放器**: EMOS REST API 音乐资源接口

---

## 开发流程（必须遵守）

### 1. 需求分析阶段

- 明确功能需求：需要哪些组件？哪些路由？哪些 API？哪些样式？
- 评估是否在当前 EMOS API 能力范围内

### 2. 设计阶段

- 确定新增文件的位置和命名（参考下方目录规范）
- 确定需要修改的现有文件
- 确定数据流：API → 服务层 → 页面 load → 组件 props
- 如果涉及新的 API 接口，先在 `src/lib/services/emos.ts` 的 EMOS 适配层中添加

### 3. 实现阶段

- 每完成一个逻辑单元，立即验证（构建 + 视觉检查）
- 新增 CSS 必须放在 `src/lib/styles/` 对应文件中，**禁止组件内联 `<style>`**
- 新增组件必须使用 Svelte 5 Runes 语法（`$state`、`$derived`、`$effect`、`$props`）

### 4. 验证阶段

- 运行 `npm run build` 确保构建通过
- 运行 `npm run check` 确保类型检查通过
- 运行 `npm run lint` 检查代码规范

---

## 目录结构规范

```
src/
├── app.css                          # 全局设计 Token（颜色、间距、材质变量、页面过渡）
├── app.d.ts                         # 全局类型声明
├── app.html                         # HTML 模板
├── lib/
│   ├── assets/                      # 静态资源（图片等）
│   ├── components/                  # 公共可复用 Svelte 组件（≥2 处使用）
│   │   ├── ContentModal.svelte      # 内容弹窗（歌词详情等）
│   │   ├── ContextualMenu.svelte    # 上下文下拉菜单
│   │   ├── DetailHeader.svelte      # 公共详情头部（支持 headingsSlot Snippet）
│   │   ├── EllipseLockup.svelte     # 圆形头像卡片（艺人）
│   │   ├── ErrorState.svelte        # 通用错误状态
│   │   ├── FullListPage.svelte      # 公共全量列表页（专辑/歌曲/歌单/艺人）
│   │   ├── FullPlayer.svelte        # 全屏播放器（封面+歌词+播放控制）
│   │   ├── HeaderNav.svelte         # 页面标题导航条（首页等复用）
│   │   ├── MoreArtistWorks.svelte   # 更多艺人作品（歌曲+专辑详情页复用）
│   │   ├── Navigation.svelte        # 侧边导航（NavItem 已内联，底部 EMOS 登录入口）
│   │   ├── PlayerBar.svelte         # 底部播放器（SidePanel 已内联）
│   │   ├── ProductLockupCard.svelte # 产品卡片（专辑/歌单封面）
│   │   ├── PulseSpinner.svelte      # 加载动画（仅用于分页加载更多）
│   │   ├── SectionHeader.svelte     # 区块头部
│   │   ├── ShelfSection.svelte      # Shelf 区块
│   │   ├── SongsList.svelte         # 歌曲列表
│   │   └── TrackLockup.svelte       # 歌曲排行行组件（未来可复用）
│   ├── data/                        # 静态数据（导航项等）
│   │   └── nav-items.ts
│   ├── services/                    # API 服务层
│   │   └── emos.ts                  # EMOS 音乐 API 适配层
│   ├── stores/                      # Svelte stores
│   │   ├── emos-auth.ts             # EMOS API 授权状态（localStorage 持久化）
│   │   ├── page-cache.ts            # 通用缓存（TTL + LRU + setPageDataBatch + scrollPositions）
│   │   ├── player.ts                # 播放器状态管理
│   │   └── recent-search-store.ts   # 最近搜索（localStorage 持久化，最多10条）
│   ├── styles/                      # 公共 CSS 样式
│   │   ├── artwork-component.css    # 封面组件样式
│   │   ├── contextual-menu.css      # 上下文下拉菜单样式
│   │   ├── content-modal.css        # 内容弹窗样式
│   │   ├── detail-header.css        # 公共详情头部样式
│   │   ├── error-state.css          # 错误状态样式
│   │   ├── full-player.css           # 全屏播放器样式
│   │   ├── multiline-clamp.css      # 多行截断样式
│   │   ├── nav-item.css             # 导航项样式（Navigation 内联使用）
│   │   ├── navigation.css           # 导航栏样式
│   │   ├── play-more-buttons.css    # 播放/更多按钮样式
│   │   ├── player-bar.css           # 播放器栏样式
│   │   ├── product-lockup.css       # 产品卡片 + category-brick__placeholder
│   │   ├── pulse-spinner.css        # 加载动画样式（仅分页场景）
│   │   ├── section.css              # 通用区块样式
│   │   ├── shelf-grid.css           # 网格布局样式
│   │   ├── side-panel.css           # 待播面板样式（PlayerBar 内联使用）
│   │   ├── songs-list.css           # 歌曲列表样式
│   │   ├── songs-list-footer.css    # 歌曲列表 footer 样式
│   │   └── track-lockup.css         # 歌曲排行行样式
│   ├── types/                       # TypeScript 类型定义
│   │   └── emos.ts                  # EMOS 音乐业务类型
│   └── utils/                       # 工具函数
│       ├── concurrent.ts            # 并发限制器
│       ├── constants.ts             # 硬编码常量 + ICONS + createShareCopyMenu + MenuItemDef/MenuGroupDef
│       ├── format.ts                # 格式化工具（formatDuration、formatTotalDuration、albumSubtitle）
│       ├── menu-state.svelte.js     # 菜单弹出位置/目标状态（Runes 运行时）
│       ├── menu-state.svelte.d.ts   # 菜单状态类型声明
│       └── page-cache-helper.ts     # createPageCache 辅助函数
└── routes/                          # SvelteKit 路由页面
    ├── +layout.svelte               # 全局布局（含页面 opacity 过渡）
    ├── +page.svelte                 # 首页
    ├── playlist/[id]/               # 歌单详情
    ├── album/[id]/                  # 专辑详情
    ├── artist/[name]/[id]/          # 歌手详情
    │   ├── components/              # 歌手专属组件
    │   │   └── LatestRelease.svelte # 最新发布
    │   └── styles/                  # 歌手专属样式
    │       ├── artist-page.css
    │       └── latest-release.css
    ├── list/[type]/[name]/[id]/     # 公共全量列表页
    ├── search/                      # 搜索页
    │   ├── components/              # 搜索专属组件
    │   │   ├── SearchBox.svelte     # 搜索框+建议下拉
    │   │   ├── TopResults.svelte    # 最佳结果
    │   │   ├── SongResults.svelte   # 歌曲结果
    │   │   ├── AlbumResults.svelte  # 专辑结果
    │   │   ├── PlaylistResults.svelte # 歌单结果
    │   │   └── RecentSearches.svelte # 最近搜索
    │   └── styles/                  # 搜索专属样式
    │       ├── search-box.css       # 搜索框+建议样式
    │       ├── scope-bar.css        # 筛选 pill 样式
    │       ├── search-page.css      # 搜索页布局+分类网格
    │       └── search-results.css   # 搜索结果样式
    └── song/[id]/                   # 歌曲详情
        ├── components/              # 歌曲专属组件
        │   └── CreditSection.svelte # 制作人员区块
        └── styles/                  # 歌曲专属样式
            ├── song-header.css
            └── song-content.css
```

### 目录组织原则

- **页面专属组件** → `src/routes/xxx/components/`
- **页面专属样式** → `src/routes/xxx/styles/`
- **公共组件** → `src/lib/components/`（≥2 处使用才提取）
- **公共样式** → `src/lib/styles/`
- 位置即语义：看路径就知道是公共还是专属

### 登录体系

- **EMOS API 授权** → 侧边栏底部按钮 → 解决内容浏览、收藏和播放资源获取
- 流程: 打开网站 → 检测 EMOS API 授权 → 浏览内容 → 点击播放 → 使用 EMOS 音乐资源播放地址正常播放
- 全局状态管理: `emos-auth.ts`（EMOS API 授权状态）
- 登录按钮直接跳转 EMOS link 登录入口，不再使用登录弹窗
- EMOS API 授权方式: 使用 Postman 中的 link 登录流程，前端直接打开 `VITE_EMOS_ORIGIN` 下的 `/link`，登录回跳 URL 会携带 `token`，应用启动时必须先提取并持久化该 `token`，再检测 `/api/emos/sign/check`
- EMOS API 认证信息: 登录成功后必须保存 link 回跳链接携带的 `token`；`/api/emos/sign/check` 只校验登录态，不返回 `token`；后续音乐接口请求必须携带 `Authorization: Bearer <token>`

---

## 编码规范

### Svelte 组件

- **必须使用 Svelte 5 Runes 语法**：`$state`、`$derived`、`$effect`、`$props`、`$bindable`
- **禁止使用** Svelte 4 语法：`export let`、`$:` 响应式声明、`{@html}`（XSS 风险）
- Props 声明：`let { prop1, prop2 = defaultValue } = $props<{ prop1: Type; prop2?: Type }>()`
- 可绑定 Props：`let { value = $bindable(defaultValue) } = $props<{ value?: Type }>()`

### CSS 样式

- **禁止组件内联 `<style>`**，所有样式必须放在对应 CSS 文件中
- 公共组件样式放 `src/lib/styles/`，页面专属样式放路由目录的 `styles/` 下
- 组件通过 `import '$lib/styles/xxx.css'` 或 `import './styles/xxx.css'` 引入样式
- CSS 变量命名使用 camelCase（如 `--systemPrimary`、`--keyColor`），**不要重命名**
- 新增 CSS 变量时，在 `src/app.css` 的 `:root` 中定义（亮色）和 `@media (prefers-color-scheme: dark)` 中定义（暗色）
- 使用 BEM 命名：`.block__element--modifier`

### 图标与常量

- **SVG 图标 path 数据**必须集中到 `src/lib/utils/constants.ts` 的 `ICONS` 对象中，禁止在组件/页面中内联定义
- 新增图标时，在 `ICONS` 中添加以大写蛇形命名（如 `SHARE`、`LINK`、`HEART_FILLED`）
- 其他硬编码常量同样集中到 `constants.ts`，按类别分组（`ARTWORK_SIZE`、`PLAY_COUNT`、`PAGINATION`、`UI`、`PLAYER`、`ICONS`）
- **分享菜单工厂函数** `createShareCopyMenu(urlFn, extraItems?)` 集中在 `constants.ts`，接受返回 URL 的函数和可选的额外菜单项，返回 `MenuGroupDef[]`。内部自动处理"分享+拷贝链接"菜单项构建，`extraItems` 会插入到分享项之前
- 底层 `createShareMenuChildren(copyUrl)` 已改为内部函数（不再导出），由 `createShareCopyMenu` 内部调用
- 菜单类型定义 `MenuItemDef`、`MenuGroupDef` 也在 `constants.ts` 中

### TypeScript

- **禁止 `any`**，必须提供具体类型
- 音乐业务返回类型定义在 `src/lib/types/emos.ts`
- 第三方库类型声明放在 `src/lib/types/` 目录
- 空 catch 必须使用 `console.warn` 记录，禁止静默吞错
- 函数必须添加返回类型注解

### API 服务层

- 所有 EMOS 音乐 API 调用必须通过 `src/lib/services/emos.ts` 的适配层
- 新增 API 方法必须添加 JSDoc 注释和返回类型
- 使用 `concurrentLimit()` 控制并发请求（默认 6 并发）
- API 代理配置在 `vite.config.ts` 的 `server.proxy` 中

### EMOS API 注意事项（必须遵守）

- **接口来源**：音乐接口以 `api.postman_collection.json` 中"音乐相关"分组为准，禁止新增网易云接口。
- **代理路径**：浏览器端音乐 API 统一请求 `/api/emos/...`，link 登录入口直接打开 `VITE_EMOS_ORIGIN` 下的 `/link`，禁止在前端硬编码 API 地址或登录凭据。
- **路径映射**：`.env` 中 `VITE_EMOS_API_URL=https://emos.best/api` 时，前端 `/api/emos/music/song/list` 会代理到后端 `/api/music/song/list`。
- **分页接口**：EMOS 返回 `page`、`page_size`、`total`、`items`，分页判断使用 `offset + items.length < total`。
- **缺失能力**：EMOS Postman 音乐接口当前不提供歌单分类等能力，适配层必须使用歌曲/专辑/歌手列表安全降级或返回空数组。
- **认证信息**：link 登录回跳 URL 中的 `token` 是唯一认证来源；`/api/emos/sign/check` 仅返回 `{"is_sign":true,"user_id":"..."}`，**不返回 token**。应用启动时从 URL 提取 token 持久化到 localStorage，后续所有 `/api/emos/...` 请求携带 `Authorization: Bearer <token>`。
- **播放地址**：歌曲播放走 `/api/music/song/{music_song_id}/media/list` 选择资源，再调用 `/api/music/song/{music_song_id}/media/playUrl`。
- **可用歌曲过滤**：EMOS 数据库中仅约 2% 歌曲有实际媒体文件。所有歌曲列表请求**必须**带 `has_media=1` 参数，否则返回大量无法播放的歌曲。
- **实际可用 API（音乐客户端）**：
  - 读取：`/music/song/list`、`/music/song/search`、`/music/album/list`、`/music/person/list`、`/music/song/{id}/lyric/list`、`/music/song/{id}/media/list`、`/music/song/{id}/media/playUrl`、`/sign/check`
  - 写入（仅收藏）：`/music/favorite`（PUT，type=ms/ma/mp）
  - **不需要的 API**：`/music/sync`、`/music/syncSpotifyArtist`、`/music/rating`、`/music/song/{id}/lyric/create`、`/music/song/{id}/lyric/delete`、`/music/song/{id}/media/delete`、`/music/song/{id}/media/move`、`/music/song/{id}/delete`、`/music/song/batchHashExist`、`/music/song/{id}/updateVideoId`、`/music/album/{id}/updateVideoId`
- **响应字段异常**：歌曲列表和搜索结果中 `person_artists[].person_id` 恒为 `null`，但 `person_artists[].name` 和 `person_artists[].image_profile_url` 正常。艺人列表 `/music/person/list` 中 `person_id` 有值。歌曲详情需通过 `listSongs({song_id: id})` 获取。

### 数据加载

- 页面数据加载使用 SvelteKit `+page.ts` 的 `load` 函数
- 使用 `async/await`，禁止 `.then()` 链式调用
- 必须添加 `ErrorState` 组件处理加载失败
- 路由参数使用 `Number(params.id) || 0` 防止 NaN

### 动画与交互

- 使用 CSS `transition` 实现动画，优先于 `animation`
- 面板/抽屉类组件使用 `transform: translateX/Y` + `visibility` 控制显隐，**不要使用 `display: none` 切换**（无法做过渡动画）
- 不要使用 `<dialog>` 的 `showModal()`（模态层会阻止页面交互和滚动）
- **页面加载动画**：使用全局 opacity 过渡（`+layout.svelte` 中 `navigating` store 控制 `.page--loading` class），不使用 spinner/skeleton
- **分页加载更多**：FullListPage 中使用 PulseSpinner 作为 inline 加载指示器

### 常量管理

- 硬编码常量必须集中到 `src/lib/utils/constants.ts`
- 按类别分组：`ARTWORK_SIZE`、`PLAY_COUNT`、`PAGINATION`、`UI`、`PLAYER`、`ICONS`
- `format.ts` 中的共享格式化函数：`formatDuration`、`formatTotalDuration`、`albumSubtitle`

---

## 环境配置

- 环境变量通过 `.env` 文件配置，参考 `.env.example`
- 使用 `loadEnv()` 在 `vite.config.ts` 中加载
- EMOS API 代理目标通过 `VITE_EMOS_API_URL` 配置，EMOS 根路径代理目标通过 `VITE_EMOS_ORIGIN` 配置
- **禁止**在代码中硬编码 API 地址

---

## 构建与验证命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run check        # TypeScript 类型检查
npm run lint         # ESLint 代码检查
npm run format       # Prettier 格式化
```

每次修改后必须运行 `npm run build` 确认构建通过。

---

## 已知问题

- `npm run check` 当前为 0 个错误，但仍有若干 Svelte 可访问性与响应式警告，后续可单独整理
- `<a href="#">` 占位链接：歌手名/专辑名等，等后续实现对应路由时替换
- 不需要 `--joe-color` 着色背景功能
- `.svelte.ts` 文件在 SSR 构建时无法被 rolldown 解析，必须使用普通 `.ts` 文件 + subscribe 模式
- EMOS API `person_artists[].person_id` 在歌曲/搜索响应中恒为 `null`，导致歌手详情页链接可能无法正确关联（需通过歌手名字间接匹配）
- EMOS 搜索接口返回的歌曲字段不完整（缺少 `duration`、`albums` 等），与 `/music/song/list` 响应格式不一致
- `has_media` 与 `count_medias` 偶尔不一致（`has_media=true` 但 `count_medias=0`），以 `has_media` 为准

---

## AGENTS.md 维护规范

> **本文件是活文档，必须随项目演进而持续更新。**

### 必须更新 AGENTS.md 的场景

1. **新增组件**：在目录结构中添加组件文件名和注释
2. **新增 CSS 文件**：在目录结构中添加样式文件名和注释
3. **新增类型定义**：在目录结构中添加类型文件
4. **新增工具函数/常量**：在目录结构中添加，若新增常量类别需更新编码规范
5. **新增路由页面**：在目录结构中添加路由
6. **新增编码规范**：在对应章节添加规则
7. **修复已知问题**：从"已知问题"中移除或更新
8. **新增已知问题/技术债**：记录到"已知问题"章节，标注后续处理计划
9. **新增 CSS 变量**：若涉及新的设计 Token，需在编码规范中说明
