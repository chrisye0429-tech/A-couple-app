import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoFont from 'expo-font';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'react-native';

import fontLibraryConfig from './fonts.json';
import materialIndexConfig from './materialIndex.json';
import stickerLibraryConfig from './stickers.json';
import type {
  CachedMaterial,
  FontLibraryConfig,
  FontMaterial,
  FontPreviewConfig,
  FontRegistrar,
  Material,
  MaterialCacheAdapter,
  MaterialIndexConfig,
  MaterialKind,
  MaterialPage,
  MaterialQuery,
  StickerLibraryConfig,
  StickerMaterial,
} from './types';

const DEFAULT_FIRST_SCREEN_LIMIT = 20;
const DEFAULT_PAGE_SIZE = 20;
const CACHE_PREFIX = 'couple-journal:materials';
const FONT_CACHE_DIRECTORY = 'couple-journal-fonts';
const SUPPORTED_FONT_EXTENSIONS = ['ttf', 'otf', 'woff', 'woff2', 'ttc'];

const fontLibrary = fontLibraryConfig as FontLibraryConfig;
const stickerLibrary = stickerLibraryConfig as StickerLibraryConfig;
const materialIndex = createMaterialIndexWithLibraries(
  materialIndexConfig as MaterialIndexConfig,
  {
    fonts: fontLibrary,
    stickers: stickerLibrary,
  },
);

export class AsyncStorageMaterialCacheAdapter implements MaterialCacheAdapter {
  async getCachedUri(cacheKey: string, kind?: MaterialKind) {
    const cachedRecord = await AsyncStorage.getItem(this.getMaterialCacheKey(cacheKey));

    if (!cachedRecord) {
      return null;
    }

    try {
      const cachedMaterial = JSON.parse(cachedRecord) as CachedMaterial;

      if (kind === 'font') {
        if (!cachedMaterial.uri.startsWith('file://')) {
          return null;
        }

        return new File(cachedMaterial.uri).exists ? cachedMaterial.uri : null;
      }

      return cachedMaterial.uri;
    } catch {
      return null;
    }
  }

  async cacheRemoteFile(cacheKey: string, remoteUrl: string, kind: MaterialKind) {
    if (kind === 'font') {
      const fileName = this.getFontCacheFileName(cacheKey, remoteUrl);
      const fontFile = await this.cacheFontFile(cacheKey, remoteUrl);

      await this.saveMaterialCache({
        materialId: cacheKey,
        cacheKey,
        kind,
        remoteUrl,
        fileName,
        uri: fontFile.uri,
        cachedAt: new Date().toISOString(),
      });

      return fontFile.uri;
    }

    if ((kind === 'sticker' || kind === 'background') && isRemoteHttpUrl(remoteUrl)) {
      await Image.prefetch(remoteUrl);
    }

    const cachedMaterial: CachedMaterial = {
      materialId: cacheKey,
      cacheKey,
      kind,
      remoteUrl,
      uri: remoteUrl,
      cachedAt: new Date().toISOString(),
    };

    await this.saveMaterialCache(cachedMaterial);

    return remoteUrl;
  }

  async saveCategoryCache(categoryKey: string, materialIds: string[]) {
    await AsyncStorage.setItem(this.getCategoryCacheKey(categoryKey), JSON.stringify(materialIds));
  }

  async getCategoryCache(categoryKey: string) {
    const cachedRecord = await AsyncStorage.getItem(this.getCategoryCacheKey(categoryKey));

    if (!cachedRecord) {
      return [];
    }

    try {
      return JSON.parse(cachedRecord) as string[];
    } catch {
      return [];
    }
  }

  private getMaterialCacheKey(cacheKey: string) {
    return `${CACHE_PREFIX}:item:${cacheKey}`;
  }

  private getCategoryCacheKey(categoryKey: string) {
    return `${CACHE_PREFIX}:category:${categoryKey}`;
  }

  private async cacheFontFile(cacheKey: string, remoteUrl: string) {
    if (remoteUrl.startsWith('file://')) {
      return new File(remoteUrl);
    }

    const directory = new Directory(Paths.cache, FONT_CACHE_DIRECTORY);

    if (!directory.exists) {
      directory.create({
        intermediates: true,
        idempotent: true,
      });
    }

    const file = new File(directory, this.getFontCacheFileName(cacheKey, remoteUrl));

    if (file.exists) {
      return file;
    }

    return File.downloadFileAsync(remoteUrl, file, {
      idempotent: true,
    });
  }

  private getFontCacheFileName(cacheKey: string, remoteUrl: string) {
    return `${sanitizeFileName(cacheKey)}${getRemoteFontExtension(remoteUrl)}`;
  }

  private async saveMaterialCache(cachedMaterial: CachedMaterial) {
    await AsyncStorage.setItem(
      this.getMaterialCacheKey(cachedMaterial.cacheKey),
      JSON.stringify(cachedMaterial),
    );
  }
}

export type MaterialManagerOptions = {
  index?: MaterialIndexConfig;
  fontLibrary?: FontLibraryConfig;
  stickerLibrary?: StickerLibraryConfig;
  cacheAdapter?: MaterialCacheAdapter;
  fontRegistrar?: FontRegistrar;
  firstScreenLimit?: number;
};

export class MaterialManager {
  private readonly index: MaterialIndexConfig;
  private readonly fontLibrary: FontLibraryConfig;
  private readonly stickerLibrary: StickerLibraryConfig;
  private readonly cacheAdapter: MaterialCacheAdapter;
  private readonly fontRegistrar?: FontRegistrar;
  private readonly firstScreenLimit: number;
  private readonly registeredFontNames = new Set<string>();

  constructor(options: MaterialManagerOptions = {}) {
    this.fontLibrary = options.fontLibrary ?? fontLibrary;
    this.stickerLibrary = options.stickerLibrary ?? stickerLibrary;
    this.index = options.index ?? createMaterialIndexWithLibraries(materialIndex, {
      fonts: this.fontLibrary,
      stickers: this.stickerLibrary,
    });
    this.cacheAdapter = options.cacheAdapter ?? new AsyncStorageMaterialCacheAdapter();
    this.fontRegistrar = options.fontRegistrar ?? createExpoFontRegistrar(ExpoFont.loadAsync);
    this.firstScreenLimit = options.firstScreenLimit ?? DEFAULT_FIRST_SCREEN_LIMIT;
  }

  getFirstScreenMaterials() {
    return this.getAllMaterials()
      .sort((left, right) => right.priority - left.priority)
      .slice(0, this.firstScreenLimit);
  }

  getMaterialById(materialId: string) {
    return this.getAllMaterials().find((material) => material.id === materialId) ?? null;
  }

  listMaterials<T extends Material = Material>(query: MaterialQuery = {}): MaterialPage<T> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.max(1, query.pageSize ?? this.index.pageSize ?? DEFAULT_PAGE_SIZE);
    const filteredMaterials = this.getAllMaterials()
      .filter((material) => this.matchesKind(material, query.kind))
      .filter((material) => this.matchesCategory(material, query.category))
      .filter((material) => this.matchesTags(material, query.tags))
      .sort((left, right) => right.priority - left.priority) as T[];
    const start = (page - 1) * pageSize;
    const items = filteredMaterials.slice(start, start + pageSize);

    return {
      items,
      page,
      pageSize,
      total: filteredMaterials.length,
      hasMore: start + pageSize < filteredMaterials.length,
    };
  }

  listCategories(kind?: MaterialKind) {
    return Array.from(
      new Set(
        this.getAllMaterials()
          .filter((material) => this.matchesKind(material, kind))
          .map((material) => material.category),
      ),
    ).sort();
  }

  listStickerCategories() {
    return this.stickerLibrary.categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      total: category.stickers.length,
    }));
  }

  listFonts(query: Omit<MaterialQuery, 'kind'> = {}): MaterialPage<FontMaterial> {
    return this.listMaterials<FontMaterial>({
      ...query,
      kind: 'font',
    });
  }

  getFontPreviewConfig(fontId: string, previewText?: string): FontPreviewConfig | null {
    const material = this.getMaterialById(fontId);

    if (!material || material.kind !== 'font') {
      return null;
    }

    return {
      fontFamily: material.fontName,
      previewText: previewText ?? material.previewText ?? '今天也想认真记录我们的小日常',
      fallbackFontFamily: material.fallbackFontFamily ?? 'system-ui',
      lineHeight: material.recommendedLineHeight ?? 1.45,
    };
  }

  async prepareFontForPreview(fontId: string) {
    const material = this.getMaterialById(fontId);

    if (!material || material.kind !== 'font') {
      return null;
    }

    return this.cacheFont(material);
  }

  listStickers(query: Omit<MaterialQuery, 'kind'> = {}): MaterialPage<StickerMaterial> {
    return this.listMaterials<StickerMaterial>({
      ...query,
      kind: 'sticker',
    });
  }

  async cacheFirstScreenMaterials() {
    const materials = this.getFirstScreenMaterials();

    await Promise.all(materials.map((material) => this.cacheMaterial(material)));

    return materials;
  }

  async cacheCategory(kind: MaterialKind, category: string) {
    const categoryMaterials = this.listMaterials({ kind, category, page: 1, pageSize: Number.MAX_SAFE_INTEGER })
      .items;
    const cachedMaterials = await Promise.all(categoryMaterials.map((material) => this.cacheMaterial(material)));

    await this.cacheAdapter.saveCategoryCache(this.getCategoryCacheKey(kind, category), categoryMaterials.map((material) => material.id));

    return cachedMaterials;
  }

  async getCachedCategory(kind: MaterialKind, category: string) {
    const cachedMaterialIds = await this.cacheAdapter.getCategoryCache(this.getCategoryCacheKey(kind, category));

    return cachedMaterialIds
      .map((materialId) => this.getMaterialById(materialId))
      .filter((material): material is Material => Boolean(material));
  }

  async cacheMaterial(material: Material) {
    if (material.kind === 'font') {
      return this.cacheFont(material);
    }

    if (
      (material.kind === 'sticker' && material.provider === 'emoji') ||
      (material.kind === 'background' && !isRemoteHttpUrl(material.imageUrl))
    ) {
      return {
        material,
        uri: material.imageUrl,
      };
    }

    const remoteUrl = material.kind === 'sticker' ? material.imageUrl : material.imageUrl;
    const cachedUri = await this.resolveOrCacheRemoteFile(material.id, remoteUrl, material.kind);

    return {
      material,
      uri: cachedUri,
    };
  }

  private async cacheFont(font: FontMaterial) {
    const cachedFontUri = await this.resolveOrCacheRemoteFile(font.id, font.fontFileUrl, font.kind);
    const isLoaded = this.isFontRegistered(font.fontName);

    if (this.fontRegistrar && !isLoaded) {
      await this.fontRegistrar.registerFont(font.fontName, cachedFontUri);
      this.registeredFontNames.add(font.fontName);
    }

    return {
      material: font,
      uri: cachedFontUri,
      registered: this.isFontRegistered(font.fontName),
    };
  }

  private async resolveOrCacheRemoteFile(cacheKey: string, remoteUrl: string, kind: MaterialKind) {
    const cachedUri = await this.cacheAdapter.getCachedUri(cacheKey, kind);

    if (cachedUri) {
      return cachedUri;
    }

    return this.cacheAdapter.cacheRemoteFile(cacheKey, remoteUrl, kind);
  }

  private getAllMaterials(): Material[] {
    return [
      ...this.index.stickers,
      ...this.index.fonts,
      ...this.index.backgrounds,
    ];
  }

  private matchesKind(material: Material, kind?: MaterialKind) {
    return !kind || material.kind === kind;
  }

  private matchesCategory(material: Material, category?: string) {
    return !category || material.category === category;
  }

  private matchesTags(material: Material, tags?: string[]) {
    if (!tags?.length) {
      return true;
    }

    return tags.every((tag) => material.tags.includes(tag));
  }

  private getCategoryCacheKey(kind: MaterialKind, category: string) {
    return `${kind}:${category}`;
  }

  private isFontRegistered(fontName: string) {
    return this.registeredFontNames.has(fontName) || ExpoFont.isLoaded(fontName);
  }
}

function createMaterialIndexWithLibraries(
  index: MaterialIndexConfig,
  libraries: {
    fonts: FontLibraryConfig;
    stickers: StickerLibraryConfig;
  },
): MaterialIndexConfig {
  const fontMap = new Map<string, FontMaterial>();
  const stickerMap = new Map<string, StickerMaterial>();

  index.fonts.forEach((font) => {
    fontMap.set(font.id, font);
  });

  libraries.fonts.fonts.forEach((font) => {
    fontMap.set(font.id, font);
  });

  index.stickers.forEach((sticker) => {
    stickerMap.set(sticker.id, sticker);
  });

  libraries.stickers.categories.forEach((category) => {
    category.stickers.forEach((sticker) => {
      stickerMap.set(sticker.id, sticker);
    });
  });

  return {
    ...index,
    pageSize: Math.max(libraries.fonts.pageSize, libraries.stickers.pageSize, index.pageSize),
    fonts: Array.from(fontMap.values()),
    stickers: Array.from(stickerMap.values()),
  };
}

export function createExpoFontRegistrar(loadAsync: (fontMap: Record<string, string>) => Promise<void>): FontRegistrar {
  return {
    async registerFont(fontName, fontFileUri) {
      await loadAsync({
        [fontName]: fontFileUri,
      });
    },
  };
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function getRemoteFontExtension(remoteUrl: string) {
  const cleanPath = remoteUrl.split('?')[0]?.split('#')[0] ?? '';
  const extension = cleanPath.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();

  if (extension && SUPPORTED_FONT_EXTENSIONS.includes(extension)) {
    return `.${extension}`;
  }

  return '.font';
}

function isRemoteHttpUrl(uri: string) {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

export const materialManager = new MaterialManager();
