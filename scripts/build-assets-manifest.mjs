import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const assetsRoot = path.join(projectRoot, 'assets');
const versionFilePath = path.join(assetsRoot, 'version.json');
const ignoredFileNames = new Set(['version.json', '.DS_Store', '.gitkeep']);

async function main() {
  const currentVersion = await readVersionFile();
  const files = await listAssetFiles(assetsRoot);
  const assets = await Promise.all(
    files.map(async (filePath) => {
      const content = await readFile(filePath);
      const fileStat = await stat(filePath);
      const relativePath = toPosixPath(path.relative(assetsRoot, filePath));

      return {
        path: relativePath,
        kind: getAssetKind(relativePath),
        hash: createHash('sha256').update(content).digest('hex'),
        size: fileStat.size,
      };
    }),
  );

  const nextVersion = {
    ...currentVersion,
    updatedAt: new Date().toISOString(),
    assets: assets.sort((left, right) => left.path.localeCompare(right.path)),
  };

  await writeFile(versionFilePath, `${JSON.stringify(nextVersion, null, 2)}\n`);
  console.log(`已更新素材版本清单：${assets.length} 个文件`);
}

async function readVersionFile() {
  try {
    return JSON.parse(await readFile(versionFilePath, 'utf8'));
  } catch {
    return {
      version: new Date().toISOString().slice(0, 10).replaceAll('-', '.'),
      updatedAt: new Date().toISOString(),
      baseUrl: 'https://cdn.jsdelivr.net/gh/YOUR_GITHUB_NAME/YOUR_REPO@main/assets/',
      indexes: {
        stickers: 'stickers/index.json',
        fonts: 'fonts/fonts.json',
        backgrounds: 'backgrounds/index.json',
      },
      assets: [],
    };
  }
}

async function listAssetFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listAssetFiles(entryPath);
      }

      if (ignoredFileNames.has(entry.name)) {
        return [];
      }

      return [entryPath];
    }),
  );

  return files.flat();
}

function getAssetKind(relativePath) {
  if (relativePath.startsWith('stickers/')) {
    return 'sticker';
  }

  if (relativePath.startsWith('fonts/')) {
    return 'font';
  }

  if (relativePath.startsWith('backgrounds/')) {
    return 'background';
  }

  return 'index';
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
