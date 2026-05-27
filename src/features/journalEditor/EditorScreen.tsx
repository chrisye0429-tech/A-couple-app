import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '../../theme';
import { materialManager } from '../materials';
import type { BackgroundMaterial, FontMaterial, StickerMaterial } from '../materials';
import type { AlignmentGuide } from './editorAlignment';
import {
  createPaperFromBackground,
  normalizeJournalPageForMobile,
} from './editorModel';
import {
  BackgroundPalette,
  EditorBottomToolBar,
  FavoritePanel,
  HistoryControls,
  ImagePickerPanel,
  PageManagementPanel,
  StickerPalette,
  TextEditPanel,
} from './EditorPanels';
import { JournalCanvas } from './JournalCanvas';
import { sampleJournalPage } from './mockData';
import { loadLocalJournalPage } from './storage';
import type { EditorToolKind, JournalElement, JournalPage, TextJournalElement } from './types';
import { useEditorHistory } from './useEditorHistory';
import { useEditorPageActions } from './useEditorPageActions';

const backgroundTemplates = materialManager.listMaterials<BackgroundMaterial>({
  kind: 'background',
  page: 1,
  pageSize: 40,
}).items;

const fontOptions = materialManager.listFonts({
  page: 1,
  pageSize: 20,
}).items;

const stickerCategories = materialManager.listStickerCategories();

const DEFAULT_STICKER_CATEGORY = stickerCategories[0]?.id ?? 'daily';
const BOTTOM_TOOL_BAR_HEIGHT = 72;
const SHEET_HEIGHT = Math.min(Dimensions.get('window').height * 0.48, 390);

export function EditorScreen({ onBackHome }: { onBackHome?: () => void }) {
  const [activeTool, setActiveTool] = useState<EditorToolKind>('paper');
  const [isToolPanelOpen, setIsToolPanelOpen] = useState(false);
  const [page, setPage] = useState<JournalPage>(() => normalizeJournalPageForMobile(sampleJournalPage));
  const [selectedElementId, setSelectedElementId] = useState<string | undefined>(
    sampleJournalPage.elements[1]?.id,
  );
  const [storageMessage, setStorageMessage] = useState('本地示例已准备');
  const [alignmentGuide, setAlignmentGuide] = useState<AlignmentGuide | null>(null);
  const [isAlignmentAssistEnabled, setIsAlignmentAssistEnabled] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [customBackgroundColor, setCustomBackgroundColor] = useState('#FFF8FA');
  const [activeStickerCategory, setActiveStickerCategory] = useState(DEFAULT_STICKER_CATEGORY);

  const elements = page.elements;
  const stickerMaterials = useMemo(
    () =>
      materialManager.listStickers({
        category: activeStickerCategory,
        page: 1,
        pageSize: 20,
      }).items,
    [activeStickerCategory],
  );
  const {
    canRedo,
    canUndo,
    handleRedo,
    handleUndo,
    pushGestureHistoryEntry,
    pushHistoryEntry,
    resetGestureHistory,
    resetHistory,
  } = useEditorHistory({
    onClearTransientState: () => setAlignmentGuide(null),
    page,
    selectedElementId,
    setPage,
    setSelectedElementId,
    setStorageMessage,
  });

  useEffect(() => {
    let isMounted = true;

    async function restoreLocalPage() {
      try {
        const localPage = await loadLocalJournalPage();

        if (!isMounted || !localPage) {
          return;
        }

        const normalizedPage = normalizeJournalPageForMobile(localPage);

        setPage(normalizedPage);
        setSelectedElementId(normalizedPage.elements[0]?.id);
        resetHistory();
        setStorageMessage('已读取本机保存');
      } catch {
        if (isMounted) {
          setStorageMessage('读取失败，使用示例页');
        }
      }
    }

    restoreLocalPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selectedElementId),
    [elements, selectedElementId],
  );

  useEffect(() => {
    if (selectedElement?.kind === 'text') {
      setTextDraft(selectedElement.content);
      return;
    }

    setTextDraft('');
  }, [selectedElement]);

  const {
    handleAddSticker,
    handleApplyCustomBackgroundColor,
    handleApplyTextEdit,
    handleChangeTool,
    handleFinishMoveElement,
    handleInlineControlAction,
    handleMoveElement,
    handlePickImage,
    handleResizeElement,
    handleSavePage,
    handleSelectBackground,
    handleSelectElement,
    handleSelectFont,
    handleTextStyleChange,
  } = useEditorPageActions({
    elements,
    isAlignmentAssistEnabled,
    page,
    pushGestureHistoryEntry,
    pushHistoryEntry,
    resetGestureHistory,
    selectedElement,
    selectedElementId,
    setActiveTool,
    setAlignmentGuide,
    setCustomBackgroundColor,
    setPage,
    setSelectedElementId,
    setStorageMessage,
    textDraft,
  });
  const handleBottomToolChange = (tool: EditorToolKind) => {
    if (tool === activeTool && isToolPanelOpen) {
      setIsToolPanelOpen(false);
      setStorageMessage('已收起工具面板');
      return;
    }

    setIsToolPanelOpen(true);
    void handleChangeTool(tool);
  };
  const handleCloseToolPanel = () => {
    setIsToolPanelOpen(false);
    setStorageMessage('已收起工具面板');
  };
  const handleAddStickerAndClose = (sticker: StickerMaterial) => {
    handleAddSticker(sticker);
    setIsToolPanelOpen(false);
  };
  const handlePickImageAndClose = async () => {
    await handlePickImage();
    setIsToolPanelOpen(false);
  };
  const handleApplyTextAndKeepPanel = () => {
    handleApplyTextEdit();
  };
  const handleCanvasEditTextElement = (elementId: string) => {
    handleSelectElement(elementId);

    const nextElement = elements.find((element) => element.id === elementId);

    if (nextElement?.kind !== 'text') {
      return;
    }

    setActiveTool('text');
    setIsToolPanelOpen(true);
    setTextDraft(nextElement.content);
    setStorageMessage('可继续修改文字内容、字号和字体');
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.previewScroller, styles.previewContent]}>
        <View style={styles.editorHeader}>
          {onBackHome ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="返回首页"
              onPress={onBackHome}
              style={styles.backHomeButton}
            >
              <Text style={styles.backHomeIcon}>‹</Text>
              <Text style={styles.backHomeText}>返回首页</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="保存当前手账页面"
            onPress={handleSavePage}
            style={styles.headerSaveButton}
          >
            <Text style={styles.headerSaveButtonText}>保存</Text>
          </Pressable>
        </View>

        <View style={styles.quickControlRow}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: isAlignmentAssistEnabled }}
            accessibilityLabel="对齐辅助开关"
            onPress={() => {
              setIsAlignmentAssistEnabled((currentValue) => {
                const nextValue = !currentValue;

                if (!nextValue) {
                  setAlignmentGuide(null);
                }

                setStorageMessage(nextValue ? '对齐辅助已开启' : '对齐辅助已关闭');
                return nextValue;
              });
            }}
            style={[
              styles.alignmentToggle,
              isAlignmentAssistEnabled ? styles.alignmentToggleActive : null,
            ]}
          >
            <Text
              style={[
                styles.alignmentToggleText,
                isAlignmentAssistEnabled ? styles.alignmentToggleTextActive : null,
              ]}
            >
              对齐辅助：{isAlignmentAssistEnabled ? '开' : '关'}
            </Text>
          </Pressable>
          <HistoryControls
            canRedo={canRedo}
            canUndo={canUndo}
            onRedo={handleRedo}
            onUndo={handleUndo}
          />
        </View>

        <View style={styles.canvasFrame}>
          <JournalCanvas
            canvasSize={page.size}
            elements={elements}
            paper={page.paper}
            selectedElementId={selectedElementId}
            onSelectElement={handleSelectElement}
            onEditTextElement={handleCanvasEditTextElement}
            onMoveElement={handleMoveElement}
            onResizeElement={handleResizeElement}
            onFinishMoveElement={handleFinishMoveElement}
            onInlineControlAction={handleInlineControlAction}
            alignmentGuide={alignmentGuide}
          />
        </View>
      </View>

      <EditorBottomSheet visible={isToolPanelOpen} onClose={handleCloseToolPanel}>
        <EditorToolPanel
          activeTool={activeTool}
          backgrounds={backgroundTemplates}
          currentPaperId={page.paper.id}
          customColor={customBackgroundColor}
          element={selectedElement}
          fontOptions={fontOptions}
          stickerCategories={stickerCategories}
          stickers={stickerMaterials}
          textDraft={textDraft}
          onApplyCustomColor={handleApplyCustomBackgroundColor}
          onAddSticker={handleAddStickerAndClose}
          onApplyText={handleApplyTextAndKeepPanel}
          onChangeCustomColor={setCustomBackgroundColor}
          onChangeStickerCategory={setActiveStickerCategory}
          onChangeText={setTextDraft}
          onChangeTextStyle={handleTextStyleChange}
          onCreatePreviewPaper={createPaperFromBackground}
          onPickImage={handlePickImageAndClose}
          onSelectBackground={handleSelectBackground}
          onSelectFont={handleSelectFont}
          selectedStickerCategory={activeStickerCategory}
        />
      </EditorBottomSheet>

      <View style={styles.bottomToolBarLayer}>
        <EditorBottomToolBar
          activeTool={activeTool}
          isPanelOpen={isToolPanelOpen}
          onChangeTool={handleBottomToolChange}
        />
      </View>
    </View>
  );
}

type EditorToolPanelProps = {
  activeTool: EditorToolKind;
  backgrounds: BackgroundMaterial[];
  currentPaperId: string;
  customColor: string;
  element?: JournalElement;
  fontOptions: FontMaterial[];
  selectedStickerCategory: string;
  stickerCategories: Array<{ id: string; name: string }>;
  stickers: StickerMaterial[];
  textDraft: string;
  onAddSticker: (sticker: StickerMaterial) => void;
  onApplyCustomColor: (color: string) => void;
  onApplyText: () => void;
  onChangeCustomColor: (color: string) => void;
  onChangeStickerCategory: (category: string) => void;
  onChangeText: (text: string) => void;
  onChangeTextStyle: (stylePatch: Partial<TextJournalElement>) => void;
  onCreatePreviewPaper: (background: BackgroundMaterial) => JournalPage['paper'];
  onPickImage: () => void;
  onSelectBackground: (background: BackgroundMaterial) => void;
  onSelectFont: (font: FontMaterial) => void;
};

function EditorToolPanel({
  activeTool,
  backgrounds,
  currentPaperId,
  customColor,
  element,
  fontOptions,
  selectedStickerCategory,
  stickerCategories,
  stickers,
  textDraft,
  onAddSticker,
  onApplyCustomColor,
  onApplyText,
  onChangeCustomColor,
  onChangeStickerCategory,
  onChangeText,
  onChangeTextStyle,
  onCreatePreviewPaper,
  onPickImage,
  onSelectBackground,
  onSelectFont,
}: EditorToolPanelProps) {
  return (
    <>
      <BackgroundPalette
        activeTool={activeTool}
        backgrounds={backgrounds}
        currentPaperId={currentPaperId}
        customColor={customColor}
        onApplyCustomColor={onApplyCustomColor}
        onChangeCustomColor={onChangeCustomColor}
        onCreatePreviewPaper={onCreatePreviewPaper}
        onSelectBackground={onSelectBackground}
      />

      <StickerPalette
        activeCategory={selectedStickerCategory}
        activeTool={activeTool}
        categories={stickerCategories}
        stickers={stickers}
        onAddSticker={onAddSticker}
        onChangeCategory={onChangeStickerCategory}
      />

      <ImagePickerPanel activeTool={activeTool} onPickImage={onPickImage} />

      <FavoritePanel activeTool={activeTool} />

      <PageManagementPanel activeTool={activeTool} />

      {activeTool === 'text' ? (
        <TextEditPanel
          element={element}
          fontOptions={fontOptions}
          textDraft={textDraft}
          onChangeText={onChangeText}
          onApplyText={onApplyText}
          onChangeTextStyle={onChangeTextStyle}
          onSelectFont={onSelectFont}
        />
      ) : null}
    </>
  );
}

function EditorBottomSheet({
  children,
  onClose,
  visible,
}: {
  children: ReactNode;
  onClose: () => void;
  visible: boolean;
}) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [shouldRender, setShouldRender] = useState(visible);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 8,
        onPanResponderGrant: () => {
          translateY.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(Math.min(gestureState.dy, SHEET_HEIGHT));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 84 || gestureState.vy > 0.75) {
            onClose();
            return;
          }

          Animated.spring(translateY, {
            damping: 24,
            stiffness: 220,
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            damping: 24,
            stiffness: 220,
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [onClose, translateY],
  );

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      translateY.stopAnimation();
      Animated.spring(translateY, {
        damping: 24,
        stiffness: 220,
        toValue: 0,
        useNativeDriver: true,
      }).start();
      return;
    }

    translateY.stopAnimation();
    Animated.timing(translateY, {
      duration: 180,
      toValue: SHEET_HEIGHT,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShouldRender(false);
      }
    });
  }, [translateY, visible]);

  if (!shouldRender) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.sheetLayer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="关闭素材面板"
        onPress={onClose}
        style={styles.sheetBackdrop}
      />
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.sheetHeader}>
          <View style={styles.sheetHandle} />
        </View>
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingBottom: BOTTOM_TOOL_BAR_HEIGHT + 10,
  },
  previewScroller: {
    flex: 1,
  },
  previewContent: {
    gap: 6,
    paddingBottom: 0,
  },
  bottomToolBarLayer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: 10,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
    zIndex: 30,
  },
  sheetLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(47, 42, 44, 0.16)',
    bottom: BOTTOM_TOOL_BAR_HEIGHT,
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    bottom: BOTTOM_TOOL_BAR_HEIGHT,
    height: SHEET_HEIGHT,
    left: 0,
    overflow: 'hidden',
    paddingHorizontal: 14,
    position: 'absolute',
    right: 0,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingBottom: 10,
    paddingTop: 10,
  },
  sheetHandle: {
    backgroundColor: colors.border,
    borderRadius: 2,
    height: 4,
    width: 42,
  },
  sheetContent: {
    gap: 14,
    paddingBottom: 18,
  },
  editorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 2,
  },
  quickControlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  backHomeButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  backHomeIcon: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '500',
    lineHeight: 32,
  },
  backHomeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  headerSaveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  headerSaveButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  canvasFrame: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  alignmentToggle: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  alignmentToggleActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  alignmentToggleText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  alignmentToggleTextActive: {
    color: colors.primary,
  },
  twoColumn: {
    gap: 12,
  },
});
