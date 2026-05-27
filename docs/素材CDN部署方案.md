# 素材 CDN 部署方案

## 当前目标

本方案用于把贴纸、字体和背景素材发布到免费 CDN，并让 App 启动时可以检查素材版本，按需增量下载新素材。

首版采用免费方案：

- GitHub Pages：托管 `assets/` 静态素材。
- jsDelivr：作为 GitHub 仓库文件的 CDN 加速访问入口。

## 目录结构

当前项目已建立以下目录：

```text
assets/
├── stickers/
│   ├── daily/
│   ├── plant/
│   └── index.json
├── fonts/
│   ├── SourceHanSans.ttf
│   └── fonts.json
├── backgrounds/
│   ├── solid/
│   ├── pattern/
│   └── index.json
└── version.json
```

说明：

- `stickers/`：按贴纸分类存放图片素材，推荐 PNG 或 WebP。
- `fonts/`：存放字体文件和字体索引。
- `backgrounds/`：存放背景图片或背景索引。
- `version.json`：素材总版本文件，记录当前版本、更新时间、素材文件路径、hash 和大小。

## 发布脚本

当前新增两个脚本：

- `npm run assets:manifest`：扫描 `assets/`，计算文件 hash 和大小，更新 `assets/version.json`。
- `npm run assets:prepare-cdn`：先更新版本清单，再把 `assets/` 复制到 `dist/assets-cdn/`，用于 GitHub Pages 发布。

脚本位置：

- `scripts/build-assets-manifest.mjs`
- `scripts/prepare-assets-cdn.mjs`

每次新增、替换或删除素材后，应先运行：

```bash
npm run assets:manifest
```

如果要本地预览即将发布的目录，则运行：

```bash
npm run assets:prepare-cdn
```

## GitHub Pages

当前已新增 GitHub Actions 工作流：

- `.github/workflows/deploy-assets.yml`

推送到 `main` 且 `assets/` 或脚本变化时，工作流会：

1. 检出代码。
2. 生成素材版本清单。
3. 生成 `dist/assets-cdn/` 发布目录。
4. 上传到 GitHub Pages。

使用前需要在 GitHub 仓库中启用 Pages：

- Source 选择 GitHub Actions。
- 确认仓库默认分支为 `main`，或同步修改工作流里的分支名。

## jsDelivr CDN 地址

如果素材发布在 GitHub Pages，可直接使用 Pages 域名：

```text
https://你的用户名.github.io/你的仓库名/version.json
```

如果要走 jsDelivr，可使用仓库 `main` 分支里的 `assets/` 目录：

```text
https://cdn.jsdelivr.net/gh/你的用户名/你的仓库名@main/assets/version.json
```

当前 `assets/version.json` 和 `src/features/materials/assetCdnManager.ts` 里使用的是占位地址：

```text
https://cdn.jsdelivr.net/gh/YOUR_GITHUB_NAME/YOUR_REPO@main/assets/version.json
```

正式发布前必须替换为真实仓库地址。

## App 端版本检查

版本检查代码位置：

- `src/features/materials/assetCdnManager.ts`

核心方法：

```ts
import { checkAndDownloadAssetUpdates } from './features/materials';

await checkAndDownloadAssetUpdates({
  versionUrl: 'https://cdn.jsdelivr.net/gh/你的用户名/你的仓库名@main/assets/version.json',
});
```

执行逻辑：

1. App 获取远程 `version.json`。
2. 与本机保存的素材版本和每个文件 hash 对比。
3. 已存在且 hash 未变化的素材跳过下载。
4. 新增或 hash 变化的素材下载到 Expo 缓存目录。
5. 下载完成后保存本机素材版本状态。

当前缓存目录：

```text
couple-journal-cdn-assets
```

## 增量更新规则

- 素材不变：不重复下载。
- 新增素材：只下载新增文件。
- 替换素材：如果 hash 改变，则重新下载该文件。
- 删除素材：当前不会主动删除旧缓存，后续可以增加清理策略。

## 注意事项

- 字体文件通常较大，应优先懒加载，避免 App 启动时下载过多内容。
- GitHub Pages 和 jsDelivr 有缓存延迟，素材刚更新后可能不会立刻生效。
- 免费 CDN 不适合存放隐私素材；情侣用户上传的私人图片不能放在这个公开 CDN。
- 商用发布前需要逐项确认贴纸、字体和背景素材授权。
