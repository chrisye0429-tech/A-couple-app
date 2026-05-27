import * as ImagePicker from 'expo-image-picker';
import type { Dispatch, SetStateAction } from 'react';
import { Platform } from 'react-native';

import { materialManager } from '../materials';
import type { BackgroundMaterial, FontMaterial, StickerMaterial } from '../materials';
import { getSnappedFrame, type AlignmentGuide } from './editorAlignment';
import {
  clamp,
  createImageElement,
  createPaperFromBackground,
  createStickerElement,
  createTextElement,
  duplicateJournalElement,
  fitTextElementFrame,
  getMinElementSize,
  normalizeHexColor,
  normalizeRotation,
} from './editorModel';
import type { InlineControlAction } from './JournalCanvas';
import { saveLocalJournalPage } from './storage';
import type {
  EditorToolKind,
  JournalElement,
  JournalElementFrame,
  JournalPage,
  TextJournalElement,
} from './types';

function getNativeFallbackFontFamily(font: FontMaterial) {
  if (font.category === 'handwriting') {
    return Platform.select({
      android: 'serif',
      default: font.fallbackFontFamily === 'system-ui' ? undefined : font.fallbackFontFamily,
      ios: 'Kaiti SC',
    });
  }

  if (font.category === 'serif') {
    return Platform.select({
      android: 'serif',
      default: font.fallbackFontFamily === 'system-ui' ? undefined : font.fallbackFontFamily,
      ios: 'Times New Roman',
    });
  }

  return font.fallbackFontFamily === 'system-ui' ? undefined : font.fallbackFontFamily;
}

function isSameFrame(firstFrame: JournalElementFrame, secondFrame: JournalElementFrame) {
  return (
    firstFrame.x === secondFrame.x &&
    firstFrame.y === secondFrame.y &&
    firstFrame.width === secondFrame.width &&
    firstFrame.height === secondFrame.height &&
    firstFrame.rotation === secondFrame.rotation
  );
}

export function useEditorPageActions({
  elements,
  isAlignmentAssistEnabled,
  page,
  selectedElement,
  selectedElementId,
  textDraft,
  pushGestureHistoryEntry,
  pushHistoryEntry,
  resetGestureHistory,
  setActiveTool,
  setAlignmentGuide,
  setCustomBackgroundColor,
  setPage,
  setSelectedElementId,
  setStorageMessage,
}: {
  elements: JournalElement[];
  isAlignmentAssistEnabled: boolean;
  page: JournalPage;
  selectedElement?: JournalElement;
  selectedElementId?: string;
  textDraft: string;
  pushGestureHistoryEntry: (
    currentPage: JournalPage,
    elementId: string,
    kind: 'move' | 'resize',
  ) => void;
  pushHistoryEntry: (
    currentPage: JournalPage,
    currentSelectedElementId?: string,
  ) => void;
  resetGestureHistory: () => void;
  setActiveTool: Dispatch<SetStateAction<EditorToolKind>>;
  setAlignmentGuide: Dispatch<SetStateAction<AlignmentGuide | null>>;
  setCustomBackgroundColor: Dispatch<SetStateAction<string>>;
  setPage: Dispatch<SetStateAction<JournalPage>>;
  setSelectedElementId: Dispatch<SetStateAction<string | undefined>>;
  setStorageMessage: Dispatch<SetStateAction<string>>;
}) {
  const handleSelectElement = (elementId: string) => {
    setSelectedElementId(elementId);
    setPage((currentPage) => {
      const selected = currentPage.elements.find((element) => element.id === elementId);

      if (!selected) {
        return currentPage;
      }

      const topZIndex = Math.max(...currentPage.elements.map((element) => element.zIndex));
      const nextTextFrame =
        selected.kind === 'text' ? fitTextElementFrame(selected, currentPage.size) : selected.frame;
      const shouldLiftElement = selected.zIndex !== topZIndex;
      const shouldFitTextFrame = selected.kind === 'text' && !isSameFrame(selected.frame, nextTextFrame);

      if (!shouldLiftElement && !shouldFitTextFrame) {
        return currentPage;
      }

      return {
        ...currentPage,
        elements: currentPage.elements.map((element) =>
          element.id === elementId
            ? {
                ...element,
                frame: nextTextFrame,
                zIndex: shouldLiftElement ? topZIndex + 1 : element.zIndex,
              }
            : element,
        ),
        saveState: 'draft',
      };
    });
  };

  const handleMoveElement = (elementId: string, nextX: number, nextY: number) => {
    pushGestureHistoryEntry(page, elementId, 'move');

    setPage((currentPage) => {
      const movingElement = currentPage.elements.find((element) => element.id === elementId);

      if (!movingElement) {
        return currentPage;
      }

      const nextFrame = isAlignmentAssistEnabled
        ? getSnappedFrame({
            canvasSize: currentPage.size,
            elements: currentPage.elements,
            movingElement,
            nextX,
            nextY,
          })
        : {
            guide: {},
            x: clamp(nextX, 0, currentPage.size.width - movingElement.frame.width),
            y: clamp(nextY, 0, currentPage.size.height - movingElement.frame.height),
          };

      setAlignmentGuide(isAlignmentAssistEnabled ? nextFrame.guide : null);

      return {
        ...currentPage,
        elements: currentPage.elements.map((element) => {
          if (element.id !== elementId) {
            return element;
          }

          return {
            ...element,
            frame: {
              ...element.frame,
              x: nextFrame.x,
              y: nextFrame.y,
            },
          };
        }),
        saveState: 'draft',
      };
    });
    setStorageMessage('位置已调整，记得保存');
  };

  const handleFinishMoveElement = () => {
    resetGestureHistory();
    setAlignmentGuide(null);
  };

  const handleResizeElement = (elementId: string, nextFrame: JournalElementFrame) => {
    pushGestureHistoryEntry(page, elementId, 'resize');

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: currentPage.elements.map((element) => {
          if (element.id !== elementId) {
            return element;
          }

          const nextWidth = clamp(nextFrame.width, getMinElementSize(element.kind), currentPage.size.width);
          const nextHeight = clamp(nextFrame.height, getMinElementSize(element.kind), currentPage.size.height);

          return {
            ...element,
            frame: {
              ...element.frame,
              height: nextHeight,
              rotation: normalizeRotation(nextFrame.rotation),
              width: nextWidth,
              x: clamp(nextFrame.x, 0, currentPage.size.width - nextWidth),
              y: clamp(nextFrame.y, 0, currentPage.size.height - nextHeight),
            },
          };
        }),
        saveState: 'draft',
      };
    });
    setStorageMessage('元素已双指缩放，记得保存');
  };

  const handleRotateElementById = (elementId: string) => {
    pushHistoryEntry(page, elementId);

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: currentPage.elements.map((element) =>
          element.id === elementId
            ? {
                ...element,
                frame: {
                  ...element.frame,
                  rotation: normalizeRotation(element.frame.rotation + 15),
                },
              }
            : element,
        ),
        saveState: 'draft',
      };
    });
    setStorageMessage('元素已右转，记得保存');
  };

  const handleDuplicateElement = (elementId: string) => {
    const sourceElement = page.elements.find((element) => element.id === elementId);

    if (!sourceElement) {
      return;
    }

    pushHistoryEntry(page, elementId);
    const nextElement = duplicateJournalElement(sourceElement, page.elements.length + 1, page.size);

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: [...currentPage.elements, nextElement],
        saveState: 'draft',
      };
    });
    setSelectedElementId(nextElement.id);
    setStorageMessage('已复制一个相同元素');
  };

  const handleCycleElementOpacity = (elementId: string) => {
    pushHistoryEntry(page, elementId);

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: currentPage.elements.map((element) => {
          if (element.id !== elementId) {
            return element;
          }

          const opacitySteps = [1, 0.75, 0.5, 0.3];
          const currentOpacity = element.opacity ?? 1;
          const currentIndex = opacitySteps.findIndex((opacity) => opacity === currentOpacity);
          const nextOpacity = opacitySteps[(currentIndex + 1) % opacitySteps.length] ?? 1;

          return {
            ...element,
            opacity: nextOpacity,
          };
        }),
        saveState: 'draft',
      };
    });
    setStorageMessage('透明度已调整，记得保存');
  };

  const handleDeleteElementById = (elementId: string) => {
    pushHistoryEntry(page, elementId);

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: currentPage.elements.filter((element) => element.id !== elementId),
        saveState: 'draft',
      };
    });

    if (selectedElementId === elementId) {
      setSelectedElementId(undefined);
    }

    setStorageMessage('元素已删除，记得保存');
  };

  const handleInlineControlAction = (elementId: string, action: InlineControlAction) => {
    if (action === 'opacity') {
      handleCycleElementOpacity(elementId);
      return;
    }

    if (action === 'delete') {
      handleDeleteElementById(elementId);
      return;
    }

    if (action === 'duplicate') {
      handleDuplicateElement(elementId);
      return;
    }

    handleRotateElementById(elementId);
  };

  const handleTextStyleChange = (stylePatch: Partial<TextJournalElement>) => {
    if (!selectedElementId || selectedElement?.kind !== 'text') {
      setStorageMessage('请先选择一个文字元素');
      return;
    }

    pushHistoryEntry(page, selectedElementId);

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: currentPage.elements.map((element) => {
          if (element.id !== selectedElementId || element.kind !== 'text') {
            return element;
          }

          const nextElement = {
            ...element,
            ...stylePatch,
          };

          return {
            ...nextElement,
            frame: fitTextElementFrame(nextElement, currentPage.size),
          };
        }),
        saveState: 'draft',
      };
    });
    setStorageMessage('文字样式已更新，记得保存');
  };

  const handleSelectFont = async (font: FontMaterial) => {
    if (!selectedElementId || selectedElement?.kind !== 'text') {
      setStorageMessage('请先选择一个文字元素');
      return;
    }

    const targetElementId = selectedElementId;

    pushHistoryEntry(page, selectedElementId);
    setStorageMessage(`正在加载${font.name}`);

    const applyFontToTextElement = (fontFamily: string | undefined, fontName: string) => {
      setPage((currentPage) => ({
        ...currentPage,
        elements: currentPage.elements.map((element) => {
          if (element.id !== targetElementId || element.kind !== 'text') {
            return element;
          }

          const nextElement = {
            ...element,
            fontFamily,
            fontId: font.id,
            fontName,
            fontStyle: 'normal' as const,
            fontWeight: '400' as const,
          };

          return {
            ...nextElement,
            frame: fitTextElementFrame(nextElement, currentPage.size),
          };
        }),
        saveState: 'draft',
      }));
    };

    try {
      const preparedFont = await materialManager.prepareFontForPreview(font.id);

      if (!preparedFont?.registered) {
        const fallbackFontFamily = getNativeFallbackFontFamily(font);

        applyFontToTextElement(fallbackFontFamily, `${font.name}（本机替代）`);
        setStorageMessage(`${font.name}暂时无法注册，已使用本机替代字体`);
        return;
      }

      applyFontToTextElement(font.fontName, font.name);
      setStorageMessage(`已切换为${font.name}`);
    } catch {
      const fallbackFontFamily = getNativeFallbackFontFamily(font);

      applyFontToTextElement(fallbackFontFamily, `${font.name}（本机替代）`);
      setStorageMessage(`${font.name}加载失败，已使用本机替代字体`);
    }
  };

  const handleSelectBackground = (background: BackgroundMaterial) => {
    pushHistoryEntry(page, selectedElementId);

    setPage((currentPage) => ({
      ...currentPage,
      paper: createPaperFromBackground(background),
      saveState: 'draft',
    }));
    setStorageMessage(`已切换为${background.name}背景`);
  };

  const handleApplyCustomBackgroundColor = (colorValue: string) => {
    const nextColor = normalizeHexColor(colorValue);

    if (!nextColor) {
      setStorageMessage('请输入 6 位十六进制颜色，例如 #F5E6D3');
      return;
    }

    pushHistoryEntry(page, selectedElementId);

    setPage((currentPage) => ({
      ...currentPage,
      paper: {
        accentColor: nextColor,
        backgroundType: 'solid',
        color: nextColor,
        customizable: true,
        fitMode: 'cover',
        id: 'background-custom-solid',
        kind: 'solid',
        name: '自定义纯色',
      },
      saveState: 'draft',
    }));
    setCustomBackgroundColor(nextColor);
    setStorageMessage('已应用自定义纯色背景');
  };

  const handleScaleElement = (scaleDirection: 'down' | 'up') => {
    if (!selectedElementId) {
      setStorageMessage('请先选择一个元素');
      return;
    }

    pushHistoryEntry(page, selectedElementId);

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: currentPage.elements.map((element) => {
          if (element.id !== selectedElementId) {
            return element;
          }

          const scale = scaleDirection === 'up' ? 1.12 : 0.88;
          const nextWidth = clamp(
            Math.round(element.frame.width * scale),
            getMinElementSize(element.kind),
            currentPage.size.width,
          );
          const nextHeight = clamp(
            Math.round(element.frame.height * scale),
            getMinElementSize(element.kind),
            currentPage.size.height,
          );

          return {
            ...element,
            frame: {
              ...element.frame,
              height: nextHeight,
              width: nextWidth,
              x: clamp(element.frame.x, 0, currentPage.size.width - nextWidth),
              y: clamp(element.frame.y, 0, currentPage.size.height - nextHeight),
            },
          };
        }),
        saveState: 'draft',
      };
    });
    setStorageMessage(scaleDirection === 'up' ? '元素已放大，记得保存' : '元素已缩小，记得保存');
  };

  const handleRotateElement = (rotateDirection: 'left' | 'right') => {
    if (!selectedElementId) {
      setStorageMessage('请先选择一个元素');
      return;
    }

    pushHistoryEntry(page, selectedElementId);

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: currentPage.elements.map((element) => {
          if (element.id !== selectedElementId) {
            return element;
          }

          return {
            ...element,
            frame: {
              ...element.frame,
              rotation: normalizeRotation(
                element.frame.rotation + (rotateDirection === 'right' ? 15 : -15),
              ),
            },
          };
        }),
        saveState: 'draft',
      };
    });
    setStorageMessage(rotateDirection === 'right' ? '元素已右转，记得保存' : '元素已左转，记得保存');
  };

  const handleDeleteSelectedElement = () => {
    if (!selectedElementId) {
      setStorageMessage('请先选择一个元素');
      return;
    }

    pushHistoryEntry(page, selectedElementId);

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: currentPage.elements.filter((element) => element.id !== selectedElementId),
        saveState: 'draft',
      };
    });
    setSelectedElementId(undefined);
    setStorageMessage('元素已删除，记得保存');
  };

  const handleApplyTextEdit = () => {
    if (!selectedElementId || selectedElement?.kind !== 'text') {
      setStorageMessage('请先选择一个文字元素');
      return;
    }

    const nextContent = textDraft.trim();

    if (!nextContent) {
      setStorageMessage('文字内容不能为空');
      return;
    }

    pushHistoryEntry(page, selectedElementId);

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: currentPage.elements.map((element) => {
          if (element.id !== selectedElementId || element.kind !== 'text') {
            return element;
          }

          const nextElement = {
            ...element,
            content: textDraft,
          };

          return {
            ...nextElement,
            frame: fitTextElementFrame(nextElement, currentPage.size),
          };
        }),
        saveState: 'draft',
      };
    });
    setStorageMessage('文字已更新，记得保存');
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setStorageMessage('需要允许访问相册后才能添加图片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) {
      setStorageMessage('未选择图片');
      return;
    }

    const nextImageElement = createImageElement(elements.length + 1, result.assets[0].uri);

    pushHistoryEntry(page, selectedElementId);

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: [...currentPage.elements, nextImageElement],
        saveState: 'draft',
      };
    });
    setSelectedElementId(nextImageElement.id);
    setStorageMessage('已添加本地图片');
  };

  const handleChangeTool = async (tool: EditorToolKind) => {
    setActiveTool(tool);

    if (tool === 'image') {
      setStorageMessage('请选择本地图片');
      return;
    }

    if (tool === 'sticker') {
      setStorageMessage('请选择一个贴纸元素');
      return;
    }

    if (tool === 'paper') {
      setStorageMessage('请选择一个背景模板');
      return;
    }

    if (tool === 'page') {
      setStorageMessage('分页功能已预留');
      return;
    }

    if (tool === 'favorite') {
      setStorageMessage('已标记为收藏草稿');
      return;
    }

    const nextElement = createTextElement(elements.length + 1);

    pushHistoryEntry(page, selectedElementId);

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: [...currentPage.elements, nextElement],
        saveState: 'draft',
      };
    });
    setSelectedElementId(nextElement.id);
  };

  const handleAddSticker = (sticker: StickerMaterial) => {
    const nextStickerElement = createStickerElement(elements.length + 1, sticker, page.size);

    pushHistoryEntry(page, selectedElementId);

    setPage((currentPage) => {
      return {
        ...currentPage,
        elements: [...currentPage.elements, nextStickerElement],
        saveState: 'draft',
      };
    });
    setSelectedElementId(nextStickerElement.id);
    setStorageMessage(`已添加${sticker.name}贴纸`);
  };

  const handleSavePage = async () => {
    const pageToSave: JournalPage = {
      ...page,
      saveState: 'saved',
      updatedAtLabel: '刚刚',
    };

    setPage(pageToSave);
    setStorageMessage('正在保存到本机');

    try {
      await saveLocalJournalPage(pageToSave);
      setStorageMessage('已保存到本机');
    } catch {
      setPage((currentPage) => ({
        ...currentPage,
        saveState: 'draft',
      }));
      setStorageMessage('保存失败，请稍后重试');
    }
  };

  return {
    handleAddSticker,
    handleApplyCustomBackgroundColor,
    handleApplyTextEdit,
    handleChangeTool,
    handleDeleteSelectedElement,
    handleFinishMoveElement,
    handleInlineControlAction,
    handleMoveElement,
    handlePickImage,
    handleResizeElement,
    handleRotateElement,
    handleSavePage,
    handleScaleElement,
    handleSelectBackground,
    handleSelectElement,
    handleSelectFont,
    handleTextStyleChange,
  };
}
