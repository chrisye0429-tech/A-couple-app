export type MaterialKind = 'sticker' | 'font' | 'background';

export type MaterialSource = 'local' | 'cdn';

export type StickerProvider = 'iconify' | 'flaticon' | 'emoji';

export type StickerStatus = 'ready' | 'placeholder';

export type FontProvider = 'google-fonts' | 'jsdelivr' | 'local-cdn';

export type FontStatus = 'ready' | 'pending-review';

export type BackgroundMaterialType = 'solid' | 'gradient' | 'pattern' | 'texture';

export type BackgroundRenderMode =
  | 'solid'
  | 'grid'
  | 'dot'
  | 'lined'
  | 'kraft'
  | 'watercolor'
  | 'vintage'
  | 'floral'
  | 'polka'
  | 'stripe'
  | 'plaid'
  | 'cloud'
  | 'star';

export type BackgroundFitMode = 'tile' | 'cover';

export type SupportedLanguage = 'zh-Hans' | 'zh-Hant' | 'en' | 'ja' | 'ko';

export type BaseMaterial = {
  id: string;
  kind: MaterialKind;
  name: string;
  category: string;
  tags: string[];
  source: MaterialSource;
  priority: number;
};

export type StickerMaterial = BaseMaterial & {
  kind: 'sticker';
  imageUrl: string;
  thumbnailUrl: string;
  provider?: StickerProvider;
  license?: string;
  attribution?: string;
  status?: StickerStatus;
  emoji?: string;
  notes?: string;
};

export type FontMaterial = BaseMaterial & {
  kind: 'font';
  fontFileUrl: string;
  fontName: string;
  supportedLanguages: SupportedLanguage[];
  provider?: FontProvider;
  license?: string;
  status?: FontStatus;
  previewText?: string;
  fallbackFontFamily?: string;
  recommendedLineHeight?: number;
  notes?: string;
};

export type BackgroundMaterial = BaseMaterial & {
  kind: 'background';
  imageUrl: string;
  backgroundType: BackgroundMaterialType;
  previewUrl: string;
  color?: string;
  secondaryColor?: string;
  accentColor?: string;
  renderMode?: BackgroundRenderMode;
  fitMode?: BackgroundFitMode;
  customizable?: boolean;
};

export type Material = StickerMaterial | FontMaterial | BackgroundMaterial;

export type MaterialIndexConfig = {
  version: number;
  pageSize: number;
  updatedAt: string;
  stickers: StickerMaterial[];
  fonts: FontMaterial[];
  backgrounds: BackgroundMaterial[];
};

export type StickerCategoryConfig = {
  id: string;
  name: string;
  description: string;
  stickers: StickerMaterial[];
};

export type StickerLibraryConfig = {
  version: number;
  pageSize: number;
  updatedAt: string;
  sourceNote: string;
  categories: StickerCategoryConfig[];
};

export type FontLibraryConfig = {
  version: number;
  pageSize: number;
  updatedAt: string;
  sourceNote: string;
  fonts: FontMaterial[];
};

export type FontPreviewConfig = {
  fontFamily: string;
  previewText: string;
  fallbackFontFamily: string;
  lineHeight: number;
};

export type MaterialQuery = {
  kind?: MaterialKind;
  category?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
};

export type MaterialPage<T extends Material = Material> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export type CachedMaterial = {
  materialId: string;
  cacheKey: string;
  kind?: MaterialKind;
  remoteUrl?: string;
  fileName?: string;
  uri: string;
  cachedAt: string;
};

export type MaterialCacheAdapter = {
  getCachedUri(cacheKey: string, kind?: MaterialKind): Promise<string | null>;
  cacheRemoteFile(cacheKey: string, remoteUrl: string, kind: MaterialKind): Promise<string>;
  saveCategoryCache(categoryKey: string, materialIds: string[]): Promise<void>;
  getCategoryCache(categoryKey: string): Promise<string[]>;
};

export type FontRegistrar = {
  registerFont(fontName: string, fontFileUri: string): Promise<void>;
};
