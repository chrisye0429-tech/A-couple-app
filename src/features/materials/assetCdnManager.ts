import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import type { MaterialKind } from './types';

const ASSET_VERSION_STATE_KEY = 'couple-journal:asset-cdn:version-state';
const ASSET_CDN_CACHE_DIRECTORY = 'couple-journal-cdn-assets';

export type CdnAssetKind = MaterialKind | 'index';

export type CdnAssetFile = {
  path: string;
  kind: CdnAssetKind;
  hash: string;
  size: number;
  url?: string;
};

export type AssetVersionManifest = {
  version: string;
  updatedAt: string;
  baseUrl?: string;
  indexes?: {
    stickers?: string;
    fonts?: string;
    backgrounds?: string;
  };
  assets: CdnAssetFile[];
};

export type CachedAssetVersionState = {
  version: string;
  updatedAt: string;
  assetHashes: Record<string, string>;
  assetUris: Record<string, string>;
};

export type AssetCdnConfig = {
  versionUrl: string;
  baseUrl?: string;
};

export type AssetVersionCheckResult = {
  remoteVersion: string;
  localVersion?: string;
  hasUpdate: boolean;
  downloadedAssets: CdnAssetFile[];
  skippedAssets: CdnAssetFile[];
  failedAssets: Array<{
    asset: CdnAssetFile;
    reason: string;
  }>;
  assetUris: Record<string, string>;
};

export const defaultAssetCdnConfig: AssetCdnConfig = {
  versionUrl: 'https://cdn.jsdelivr.net/gh/YOUR_GITHUB_NAME/YOUR_REPO@main/assets/version.json',
};

export async function checkAndDownloadAssetUpdates(
  config: AssetCdnConfig = defaultAssetCdnConfig,
): Promise<AssetVersionCheckResult> {
  const remoteManifest = await fetchAssetVersionManifest(config.versionUrl);
  const cachedState = await getCachedAssetVersionState();
  const assetBaseUrl = config.baseUrl ?? remoteManifest.baseUrl ?? getBaseUrlFromVersionUrl(config.versionUrl);
  const downloadedAssets: CdnAssetFile[] = [];
  const skippedAssets: CdnAssetFile[] = [];
  const failedAssets: AssetVersionCheckResult['failedAssets'] = [];
  const nextAssetHashes = {
    ...(cachedState?.assetHashes ?? {}),
  };
  const nextAssetUris = {
    ...(cachedState?.assetUris ?? {}),
  };

  for (const asset of remoteManifest.assets) {
    const cachedHash = cachedState?.assetHashes[asset.path];
    const cachedUri = cachedState?.assetUris[asset.path];

    if (cachedHash === asset.hash && cachedUri && new File(cachedUri).exists) {
      skippedAssets.push(asset);
      continue;
    }

    try {
      const downloadedFile = await downloadCdnAsset(asset, assetBaseUrl);
      nextAssetHashes[asset.path] = asset.hash;
      nextAssetUris[asset.path] = downloadedFile.uri;
      downloadedAssets.push(asset);
    } catch (error) {
      failedAssets.push({
        asset,
        reason: error instanceof Error ? error.message : '未知下载错误',
      });
    }
  }

  const hasUpdate =
    !cachedState ||
    cachedState.version !== remoteManifest.version ||
    downloadedAssets.length > 0;

  if (downloadedAssets.length > 0 || cachedState?.version !== remoteManifest.version) {
    await saveCachedAssetVersionState({
      version: remoteManifest.version,
      updatedAt: remoteManifest.updatedAt,
      assetHashes: nextAssetHashes,
      assetUris: nextAssetUris,
    });
  }

  return {
    remoteVersion: remoteManifest.version,
    localVersion: cachedState?.version,
    hasUpdate,
    downloadedAssets,
    skippedAssets,
    failedAssets,
    assetUris: nextAssetUris,
  };
}

export async function fetchAssetVersionManifest(versionUrl: string) {
  const response = await fetch(versionUrl);

  if (!response.ok) {
    throw new Error(`素材版本文件获取失败：${response.status}`);
  }

  return response.json() as Promise<AssetVersionManifest>;
}

export async function getCachedAssetVersionState() {
  const cachedState = await AsyncStorage.getItem(ASSET_VERSION_STATE_KEY);

  if (!cachedState) {
    return null;
  }

  try {
    return JSON.parse(cachedState) as CachedAssetVersionState;
  } catch {
    return null;
  }
}

export async function clearCachedAssetVersionState() {
  await AsyncStorage.removeItem(ASSET_VERSION_STATE_KEY);
}

async function saveCachedAssetVersionState(state: CachedAssetVersionState) {
  await AsyncStorage.setItem(ASSET_VERSION_STATE_KEY, JSON.stringify(state));
}

async function downloadCdnAsset(asset: CdnAssetFile, baseUrl: string) {
  const directory = getAssetDirectory(asset.path);

  if (!directory.exists) {
    directory.create({
      intermediates: true,
      idempotent: true,
    });
  }

  const fileName = getFileName(asset.path);
  const targetFile = new File(directory, fileName);
  const assetUrl = asset.url ?? joinCdnUrl(baseUrl, asset.path);

  return File.downloadFileAsync(assetUrl, targetFile, {
    idempotent: true,
  });
}

function getAssetDirectory(assetPath: string) {
  const rootDirectory = new Directory(Paths.cache, ASSET_CDN_CACHE_DIRECTORY);

  if (!rootDirectory.exists) {
    rootDirectory.create({
      intermediates: true,
      idempotent: true,
    });
  }

  const directoryParts = assetPath.split('/').slice(0, -1);

  return directoryParts.reduce(
    (currentDirectory, directoryPart) => new Directory(currentDirectory, directoryPart),
    rootDirectory,
  );
}

function getFileName(assetPath: string) {
  return assetPath.split('/').pop() ?? assetPath;
}

function getBaseUrlFromVersionUrl(versionUrl: string) {
  return versionUrl.slice(0, versionUrl.lastIndexOf('/') + 1);
}

function joinCdnUrl(baseUrl: string, assetPath: string) {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const encodedPath = assetPath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `${normalizedBaseUrl}${encodedPath}`;
}
