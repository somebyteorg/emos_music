# EMOS Music

EMOS Music 是一个基于 SvelteKit 和 Svelte 5 的音乐播放器前端项目，使用 EMOS REST API 作为音乐数据源。项目侧重玻璃拟态视觉、音乐浏览、搜索、收藏和播放体验。

## 技术栈

- SvelteKit
- Svelte 5 Runes
- TypeScript
- Vite
- Cloudflare adapter
- 传统 CSS 与 CSS 自定义属性

## 本地开发

安装依赖：

```sh
npm install
```

启动开发服务器：

```sh
npm run dev
```

生产构建：

```sh
npm run build
```

类型检查：

```sh
npm run check
```

代码检查：

```sh
npm run lint
```

## 环境变量

项目通过 `.env` 配置 EMOS API 代理目标和登录入口。请不要把本地 `.env` 提交到仓库。

常用变量：

```sh
VITE_EMOS_API_URL=
VITE_EMOS_ORIGIN=
```

## 许可证

本项目源码基于 MIT License 开源，详见 [LICENSE](./LICENSE)。

## 免责声明

本项目仅作为 EMOS 音乐客户端前端的学习、研究与个人使用示例，不提供、存储或分发任何音乐、歌词、封面、音频文件或其他受版权保护的内容。

项目中展示或播放的数据来自用户自行配置的 EMOS REST API。音乐内容、媒体资源、歌词、封面、艺人信息等数据的权利归其各自权利人所有。使用者应确保自己对接的 API、账号、数据来源和使用方式符合当地法律法规、平台规则和相关版权许可。

本项目作者不对第三方 API 的可用性、数据准确性、版权合规性、账号权限、播放资源有效性或使用者的部署行为承担责任。因使用、修改、部署或分发本项目产生的任何风险和后果，由使用者自行承担。

如果你是相关内容的权利人，并认为本项目中的描述、示例或链接涉及不当使用，请通过 GitHub Issues 联系处理。
