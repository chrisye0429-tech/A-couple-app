import { Dimensions } from 'react-native';

import { colors } from '../../theme';
import type { BackgroundMaterial, StickerMaterial } from '../materials';
import type {
  ImageJournalElement,
  JournalElement,
  JournalPage,
  StickerJournalElement,
  TextJournalElement,
} from './types';

const MOBILE_PAPER_WIDTH = Math.min(Math.round(Dimensions.get('window').width), 390);

export const MOBILE_PAPER_SIZE = {
  width: MOBILE_PAPER_WIDTH,
  height: Math.round((MOBILE_PAPER_WIDTH * 4) / 3),
};

const stickerSymbolByName: Record<string, string> = {
  咖啡: '☕',
  书籍: '📚',
  闹钟: '⏰',
  礼物: '🎁',
  购物袋: '🛍',
  多肉: '🪴',
  仙人掌: '🌵',
  龟背竹: '🌿',
  玫瑰花: '🌹',
  向日葵: '🌻',
  猫咪: '🐱',
  柴犬: '🐶',
  兔子: '🐰',
  小熊: '🐻',
  小狐狸: '🦊',
  胶带: '▰',
  回形针: '📎',
  标签: '🏷',
  图钉: '📌',
  羽毛: '🪶',
  樱花: '🌸',
  雪花: '❄',
  枫叶: '🍁',
  太阳: '☀',
  云朵: '☁',
  蛋糕: '🍰',
  冰淇淋: '🍦',
  奶茶: '🧋',
  披萨: '🍕',
  寿司: '🍣',
  飞机: '✈',
  相机: '📷',
  地图: '🗺',
  行李箱: '🧳',
  明信片: '✉',
  钢笔: '✒',
  铅笔: '✏',
  橡皮: '▱',
  尺子: '📏',
  笔记本: '📓',
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeRotation(rotation: number) {
  if (rotation > 180) {
    return rotation - 360;
  }

  if (rotation < -180) {
    return rotation + 360;
  }

  return rotation;
}

export function getMinElementSize(kind: JournalElement['kind']) {
  if (kind === 'text') {
    return 54;
  }

  if (kind === 'sticker') {
    return 36;
  }

  return 64;
}

function getTextLineUnits(line: string) {
  return Array.from(line || ' ').reduce((total, character) => {
    if (/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(character)) {
      return total + 1;
    }

    if (/\s/.test(character)) {
      return total + 0.35;
    }

    return total + 0.62;
  }, 0);
}

export function fitTextElementFrame(
  element: TextJournalElement,
  canvasSize: JournalPage['size'],
): TextJournalElement['frame'] {
  const fontSize = element.fontSize || 15;
  const lineHeight = Math.round(fontSize * 1.45);
  const lines = element.content.split('\n');
  const maxTextWidth = Math.max(72, Math.round(canvasSize.width * 0.86));
  const rawLineWidths = lines.map((line) => Math.ceil(getTextLineUnits(line) * fontSize));
  const contentWidth = Math.max(...rawLineWidths, Math.round(fontSize * 2));
  const nextWidth = clamp(Math.ceil(contentWidth + 4), 36, maxTextWidth);
  const visualLineCount = rawLineWidths.reduce(
    (total, lineWidth) => total + Math.max(1, Math.ceil(lineWidth / nextWidth)),
    0,
  );
  const nextHeight = clamp(Math.ceil(visualLineCount * lineHeight + 4), lineHeight + 4, canvasSize.height);

  return {
    ...element.frame,
    height: nextHeight,
    width: nextWidth,
    x: clamp(element.frame.x, 0, canvasSize.width - nextWidth),
    y: clamp(element.frame.y, 0, canvasSize.height - nextHeight),
  };
}

export function normalizeJournalPageForMobile(page: JournalPage): JournalPage {
  const widthRatio = MOBILE_PAPER_SIZE.width / page.size.width;
  const heightRatio = MOBILE_PAPER_SIZE.height / page.size.height;
  const hasMobileSize =
    page.size.width === MOBILE_PAPER_SIZE.width && page.size.height === MOBILE_PAPER_SIZE.height;

  return {
    ...page,
    paper: normalizePaperBackground(page.paper),
    size: MOBILE_PAPER_SIZE,
    elements: page.elements.map((element) => {
      const nextFrame = hasMobileSize
        ? element.frame
        : {
            ...element.frame,
            height: Math.round(element.frame.height * heightRatio),
            width: Math.round(element.frame.width * widthRatio),
            x: Math.round(element.frame.x * widthRatio),
            y: Math.round(element.frame.y * heightRatio),
          };

      if (element.kind === 'text') {
        const nextElement = {
          ...element,
          backgroundColor: 'transparent',
          fontFamily: element.fontFamily,
          fontId: element.fontId,
          fontName: element.fontName,
          fontStyle: element.fontStyle ?? 'normal',
          fontWeight: element.fontWeight ?? '700',
          frame: nextFrame,
          opacity: element.opacity ?? 1,
        };

        return {
          ...nextElement,
          frame: fitTextElementFrame(nextElement, MOBILE_PAPER_SIZE),
        };
      }

      return {
        ...element,
        ...(element.kind === 'sticker'
          ? {
              backgroundColor: 'transparent',
              imageUri: element.imageUri ?? getRenderableStickerImageUri(element.sourceUrl),
            }
          : null),
        frame: nextFrame,
        opacity: element.opacity ?? 1,
      };
    }),
  };
}

export function normalizePaperBackground(paper: JournalPage['paper']): JournalPage['paper'] {
  if (paper.id && paper.backgroundType && paper.fitMode) {
    return paper;
  }

  if (paper.kind === 'lined') {
    return {
      ...paper,
      accentColor: paper.accentColor ?? '#C9B7A3',
      backgroundType: 'texture',
      color: paper.color || '#FFFDF7',
      fitMode: 'tile',
      id: paper.id || 'background-texture-lined',
      name: paper.name || '横线纸',
      secondaryColor: paper.secondaryColor ?? '#EADFD2',
    };
  }

  if (paper.kind === 'grid') {
    return {
      ...paper,
      accentColor: paper.accentColor ?? '#9FBBA8',
      backgroundType: 'texture',
      color: paper.color || '#FFFDF8',
      fitMode: 'tile',
      secondaryColor: paper.secondaryColor ?? '#E3ECE5',
    };
  }

  if (paper.kind === 'dot') {
    return {
      ...paper,
      accentColor: paper.accentColor ?? '#7C9EB2',
      backgroundType: 'texture',
      color: paper.color || '#FFFDF8',
      fitMode: 'tile',
      secondaryColor: paper.secondaryColor ?? '#D7DFE3',
    };
  }

  return {
    ...paper,
    backgroundType: 'solid',
    color: paper.color || colors.surface,
    fitMode: 'cover',
    kind: paper.kind === 'border' ? 'solid' : paper.kind,
  };
}

export function createPaperFromBackground(background: BackgroundMaterial): JournalPage['paper'] {
  return {
    accentColor: background.accentColor,
    backgroundType: background.backgroundType,
    color: background.color ?? colors.surface,
    customizable: background.customizable,
    fitMode: background.fitMode,
    id: background.id,
    kind: background.renderMode ?? 'solid',
    name: background.name,
    secondaryColor: background.secondaryColor,
  };
}

export function normalizeHexColor(value: string) {
  const cleanValue = value.trim().replace(/^#/, '');

  if (!/^[0-9a-fA-F]{6}$/.test(cleanValue)) {
    return null;
  }

  return `#${cleanValue.toUpperCase()}`;
}

export function createTextElement(order: number): TextJournalElement {
  const offset = (order % 3) * 18;

  return {
    backgroundColor: 'transparent',
    color: colors.text,
    content: '写下今天想记住的话',
    fontFamily: undefined,
    fontId: 'system-default',
    fontName: '系统默认',
    fontSize: 15,
    fontStyle: 'normal',
    fontWeight: '700',
    frame: {
      height: 86,
      rotation: 0,
      width: 180,
      x: 54 + offset,
      y: 172 + offset,
    },
    id: `text-${Date.now()}`,
    kind: 'text',
    name: `文字 ${order}`,
    opacity: 1,
    zIndex: order + 1,
  };
}

export function createStickerElement(
  order: number,
  sticker: StickerMaterial,
  canvasSize: JournalPage['size'] = MOBILE_PAPER_SIZE,
): StickerJournalElement {
  const offset = (order % 4) * 14;
  const stickerDisplay = getStickerDisplay(sticker);
  const stickerSize = Math.round(clamp(canvasSize.width * 0.2, 52, 76));

  return {
    backgroundColor: 'transparent',
    color: stickerDisplay.color,
    frame: {
      height: stickerSize,
      rotation: order % 2 === 0 ? -8 : 8,
      width: stickerSize,
      x: Math.round(
        clamp((canvasSize.width - stickerSize) / 2 + offset, 0, canvasSize.width - stickerSize),
      ),
      y: Math.round(
        clamp((canvasSize.height - stickerSize) / 2 + offset, 0, canvasSize.height - stickerSize),
      ),
    },
    id: `sticker-${Date.now()}`,
    imageUri: getRenderableStickerImageUri(sticker.imageUrl),
    kind: 'sticker',
    label: stickerDisplay.label,
    name: `${sticker.name}贴纸`,
    opacity: 1,
    provider: sticker.provider,
    sourceUrl: sticker.imageUrl,
    status: sticker.status,
    stickerId: sticker.id,
    zIndex: order + 1,
  };
}

export function getStickerDisplay(sticker: StickerMaterial) {
  const label = sticker.emoji ?? stickerSymbolByName[sticker.name] ?? sticker.name.slice(0, 1);

  return {
    backgroundColor: 'transparent',
    color: getStickerTextColor(sticker.category),
    label,
  };
}

export function getRenderableStickerImageUri(sourceUrl?: string) {
  const normalizedSourceUrl = sourceUrl?.split('?')[0]?.toLowerCase();

  if (!sourceUrl || sourceUrl.startsWith('emoji://') || normalizedSourceUrl?.endsWith('.svg')) {
    return undefined;
  }

  return sourceUrl;
}

export function getStickerTextColor(category: string) {
  if (category === 'emotion' || category === 'love' || category === 'anniversary') {
    return '#B13F5C';
  }

  if (category === 'constellation') {
    return '#6552A3';
  }

  return colors.text;
}

export function createImageElement(order: number, uri: string): ImageJournalElement {
  const offset = (order % 3) * 18;

  return {
    frame: {
      height: 132,
      rotation: order % 2 === 0 ? -4 : 4,
      width: 142,
      x: 32 + offset,
      y: 44 + offset,
    },
    id: `image-${Date.now()}`,
    kind: 'image',
    name: `图片 ${order}`,
    opacity: 1,
    sourceLabel: '本地图片',
    tintColor: colors.accent,
    uri,
    zIndex: order + 1,
  };
}

export function duplicateJournalElement(
  element: JournalElement,
  order: number,
  canvasSize: JournalPage['size'],
): JournalElement {
  const nextWidth = element.frame.width;
  const nextHeight = element.frame.height;
  const nextFrame = {
    ...element.frame,
    x: clamp(element.frame.x + 16, 0, canvasSize.width - nextWidth),
    y: clamp(element.frame.y + 16, 0, canvasSize.height - nextHeight),
  };

  return {
    ...element,
    frame: nextFrame,
    id: `${element.kind}-${Date.now()}`,
    name: `${element.name} 副本`,
    opacity: element.opacity ?? 1,
    zIndex: order + 1,
  };
}
