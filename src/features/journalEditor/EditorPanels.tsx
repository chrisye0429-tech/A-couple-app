import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../../theme';
import type { BackgroundMaterial, FontMaterial, StickerMaterial } from '../materials';
import { getStickerDisplay } from './editorModel';
import { PaperBackground } from './JournalCanvas';
import { editorTools } from './mockData';
import type { EditorToolKind, JournalElement, JournalPage, TextJournalElement } from './types';

const textColorOptions = [
  { name: '墨绿', color: '#315F50' },
  { name: '莓红', color: '#D96B8A' },
  { name: '深墨', color: '#2F2A2C' },
  { name: '暖棕', color: '#8A6546' },
];

const customBackgroundColorOptions = [
  '#FFF8FA',
  '#F5E6D3',
  '#E8C4C4',
  '#C1D5A4',
  '#DDEAF0',
  '#F7A58C',
];

type StickerCategory = {
  id: string;
  name: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function HistoryControls({
  canRedo,
  canUndo,
  onRedo,
  onUndo,
}: {
  canRedo: boolean;
  canUndo: boolean;
  onRedo: () => void;
  onUndo: () => void;
}) {
  return (
    <View style={styles.historyControls}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="撤销最近一步编辑"
        disabled={!canUndo}
        onPress={onUndo}
        style={[styles.historyButton, !canUndo ? styles.historyButtonDisabled : null]}
      >
        <Text style={[styles.historyIcon, !canUndo ? styles.historyTextDisabled : null]}>↶</Text>
        <Text style={[styles.historyText, !canUndo ? styles.historyTextDisabled : null]}>回退</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="恢复刚才撤销的编辑"
        disabled={!canRedo}
        onPress={onRedo}
        style={[styles.historyButton, !canRedo ? styles.historyButtonDisabled : null]}
      >
        <Text style={[styles.historyIcon, !canRedo ? styles.historyTextDisabled : null]}>↷</Text>
        <Text style={[styles.historyText, !canRedo ? styles.historyTextDisabled : null]}>前进</Text>
      </Pressable>
    </View>
  );
}

type EditorBottomToolBarProps = {
  activeTool: EditorToolKind;
  isPanelOpen?: boolean;
  onChangeTool: (tool: EditorToolKind) => void;
};

function EditorToolIcon({
  active,
  icon,
}: {
  active: boolean;
  icon: string;
}) {
  return (
    <Text style={[styles.toolIcon, active ? styles.toolIconActive : null]}>
      {icon}
    </Text>
  );
}

export function EditorBottomToolBar({
  activeTool,
  isPanelOpen = true,
  onChangeTool,
}: EditorBottomToolBarProps) {
  return (
    <View style={styles.toolBar}>
      {editorTools.map((tool) => {
        const isActive = isPanelOpen && tool.kind === activeTool;

        return (
          <Pressable
            key={tool.kind}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tool.label}：${tool.description}`}
            onPress={() => onChangeTool(tool.kind)}
            style={[styles.toolButton, isActive ? styles.toolButtonActive : null]}
          >
            <EditorToolIcon active={isActive} icon={tool.icon} />
            <Text style={[styles.toolLabel, isActive ? styles.toolLabelActive : null]}>
              {tool.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToolBar(props: EditorBottomToolBarProps) {
  return <EditorBottomToolBar {...props} />;
}

export function BackgroundPalette({
  activeTool,
  backgrounds,
  currentPaperId,
  customColor,
  onApplyCustomColor,
  onChangeCustomColor,
  onCreatePreviewPaper,
  onSelectBackground,
}: {
  activeTool: EditorToolKind;
  backgrounds: BackgroundMaterial[];
  currentPaperId: string;
  customColor: string;
  onApplyCustomColor: (color: string) => void;
  onChangeCustomColor: (color: string) => void;
  onCreatePreviewPaper: (background: BackgroundMaterial) => JournalPage['paper'];
  onSelectBackground: (background: BackgroundMaterial) => void;
}) {
  if (activeTool !== 'paper') {
    return null;
  }

  return (
    <View style={styles.backgroundPalette}>
      <View style={styles.sizeTextGroup}>
        <Text style={styles.sizeTitle}>背景模板</Text>
        <Text style={styles.sizeMeta}>20 种手账背景，纯色、纹理和图案都可直接切换</Text>
      </View>
      <View style={styles.backgroundTemplateGrid}>
        {backgrounds.map((background) => {
          const isSelected = background.id === currentPaperId;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`切换为${background.name}背景`}
              key={background.id}
              onPress={() => onSelectBackground(background)}
              style={[
                styles.backgroundTemplateButton,
                isSelected ? styles.backgroundTemplateButtonActive : null,
              ]}
            >
              <View style={styles.backgroundPreview}>
                <PaperBackground
                  canvasSize={{ width: 56, height: 72 }}
                  paper={onCreatePreviewPaper(background)}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.backgroundTemplateName,
                  isSelected ? styles.backgroundTemplateNameActive : null,
                ]}
              >
                {background.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.customColorPanel}>
        <View style={styles.sizeTextGroup}>
          <Text style={styles.textStyleLabel}>自定义纯色</Text>
          <Text style={styles.sizeMeta}>可点选常用色，也可输入 #RRGGBB</Text>
        </View>
        <View style={styles.customColorRow}>
          {customBackgroundColorOptions.map((colorOption) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`选择自定义背景颜色${colorOption}`}
              key={colorOption}
              onPress={() => {
                onChangeCustomColor(colorOption);
                onApplyCustomColor(colorOption);
              }}
              style={styles.backgroundColorSwatchButton}
            >
              <View style={[styles.backgroundColorSwatch, { backgroundColor: colorOption }]} />
            </Pressable>
          ))}
        </View>
        <View style={styles.customColorInputRow}>
          <TextInput
            autoCapitalize="characters"
            onChangeText={onChangeCustomColor}
            placeholder="#F5E6D3"
            placeholderTextColor={colors.mutedText}
            style={styles.customColorInput}
            value={customColor}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="应用自定义纯色背景"
            onPress={() => onApplyCustomColor(customColor)}
            style={styles.applyCustomColorButton}
          >
            <Text style={styles.applyCustomColorButtonText}>应用</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function StickerPalette({
  activeCategory,
  activeTool,
  categories,
  stickers,
  onAddSticker,
  onChangeCategory,
}: {
  activeCategory: string;
  activeTool: EditorToolKind;
  categories: StickerCategory[];
  stickers: StickerMaterial[];
  onAddSticker: (sticker: StickerMaterial) => void;
  onChangeCategory: (category: string) => void;
}) {
  if (activeTool !== 'sticker') {
    return null;
  }

  return (
    <View style={styles.stickerPalette}>
      <View style={styles.sizeTextGroup}>
        <Text style={styles.sizeTitle}>贴纸素材</Text>
        <Text style={styles.sizeMeta}>已接入本地贴纸库，按分类浏览，每类显示前 20 个</Text>
      </View>
      <View style={styles.stickerCategoryRow}>
        {categories.map((category) => {
          const isActive = category.id === activeCategory;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`查看${category.name}贴纸`}
              key={category.id}
              onPress={() => onChangeCategory(category.id)}
              style={[styles.stickerCategoryButton, isActive ? styles.stickerCategoryButtonActive : null]}
            >
              <Text
                style={[
                  styles.stickerCategoryText,
                  isActive ? styles.stickerCategoryTextActive : null,
                ]}
              >
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.stickerPresetGrid}>
        {stickers.map((sticker) => {
          const stickerDisplay = getStickerDisplay(sticker);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`添加${sticker.name}贴纸`}
              key={sticker.id}
              onPress={() => onAddSticker(sticker)}
              style={styles.stickerPresetButton}
            >
              <View
                style={[
                  styles.stickerPresetIcon,
                  { backgroundColor: stickerDisplay.backgroundColor },
                ]}
              >
                <Text style={[styles.stickerPresetLabel, { color: stickerDisplay.color }]}>
                  {stickerDisplay.label}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.stickerPresetName}>
                {sticker.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ImagePickerPanel({
  activeTool,
  onPickImage,
}: {
  activeTool: EditorToolKind;
  onPickImage: () => void;
}) {
  if (activeTool !== 'image') {
    return null;
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>本地图片</Text>
      <Text style={styles.emptyText}>从手机相册选择图片后，会添加到当前手账画布。</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="从相册添加图片"
        onPress={onPickImage}
        style={styles.panelPrimaryButton}
      >
        <Text style={styles.panelPrimaryButtonText}>选择图片</Text>
      </Pressable>
    </View>
  );
}

export function FavoritePanel({ activeTool }: { activeTool: EditorToolKind }) {
  if (activeTool !== 'favorite') {
    return null;
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>收藏</Text>
      <Text style={styles.emptyText}>这里会显示你收藏的背景、贴纸、文字样式和图片元素。</Text>
      <Text style={styles.propertyLine}>当前本地原型暂未保存收藏列表。</Text>
    </View>
  );
}

export function PageManagementPanel({ activeTool }: { activeTool: EditorToolKind }) {
  if (activeTool !== 'page') {
    return null;
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>分页管理</Text>
      <Text style={styles.emptyText}>后续会在这里管理增加、删除和复制手账页。</Text>
      <View style={styles.pageActionRow}>
        <View style={styles.pageActionPreview}>
          <Text style={styles.pageActionIcon}>＋</Text>
          <Text style={styles.pageActionText}>新增页</Text>
        </View>
        <View style={styles.pageActionPreview}>
          <Text style={styles.pageActionIcon}>⧉</Text>
          <Text style={styles.pageActionText}>复制页</Text>
        </View>
        <View style={styles.pageActionPreview}>
          <Text style={styles.pageActionIcon}>×</Text>
          <Text style={styles.pageActionText}>删除页</Text>
        </View>
      </View>
    </View>
  );
}

export function LayerList({
  elements,
  selectedElementId,
  onSelectElement,
}: {
  elements: JournalElement[];
  selectedElementId?: string;
  onSelectElement: (id: string) => void;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>图层</Text>
      {elements
        .slice()
        .sort((a, b) => b.zIndex - a.zIndex)
        .map((element) => {
          const isSelected = element.id === selectedElementId;

          return (
            <Pressable
              key={element.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectElement(element.id)}
              style={[styles.layerRow, isSelected ? styles.layerRowActive : null]}
            >
              <Text style={[styles.layerName, isSelected ? styles.layerNameActive : null]}>
                {element.name}
              </Text>
              <Text style={styles.layerKind}>{element.kind}</Text>
            </Pressable>
          );
        })}
    </View>
  );
}

export function TextEditPanel({
  element,
  fontOptions,
  textDraft,
  onApplyText,
  onChangeText,
  onChangeTextStyle,
  onSelectFont,
}: {
  element?: JournalElement;
  fontOptions: FontMaterial[];
  textDraft: string;
  onApplyText: () => void;
  onChangeText: (text: string) => void;
  onChangeTextStyle: (stylePatch: Partial<TextJournalElement>) => void;
  onSelectFont: (font: FontMaterial) => void;
}) {
  const isTextElement = element?.kind === 'text';
  const textElement = isTextElement ? element : undefined;
  const fontSize = textElement?.fontSize ?? 15;
  const isBold = textElement?.fontWeight === '900';
  const isItalic = textElement?.fontStyle === 'italic';

  return (
    <View style={styles.textEditPanel}>
      <View style={styles.textEditHeader}>
        <View style={styles.sizeTextGroup}>
          <Text style={styles.sizeTitle}>文字内容</Text>
          <Text style={styles.sizeMeta}>
            {isTextElement ? `正在编辑：${element.name}` : '选择文字元素后可编辑内容'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="应用文字内容"
          disabled={!isTextElement}
          onPress={onApplyText}
          style={[styles.applyTextButton, !isTextElement ? styles.sizeButtonDisabled : null]}
        >
          <Text style={[styles.applyTextButtonText, !isTextElement ? styles.sizeButtonTextDisabled : null]}>
            应用文字
          </Text>
        </Pressable>
      </View>
      <TextInput
        editable={isTextElement}
        multiline
        onChangeText={onChangeText}
        placeholder="选择文字后在这里输入内容"
        placeholderTextColor={colors.mutedText}
        style={[styles.textEditInput, !isTextElement ? styles.textEditInputDisabled : null]}
        textAlignVertical="top"
        value={isTextElement ? textDraft : ''}
      />
      <View style={styles.textStylePanel}>
        <View style={styles.textStyleGroup}>
          <Text style={styles.textStyleLabel}>字号</Text>
          <View style={styles.textStyleActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="减小文字字号"
              disabled={!isTextElement}
              onPress={() => onChangeTextStyle({ fontSize: clamp(fontSize - 1, 12, 28) })}
              style={[styles.textStyleButton, !isTextElement ? styles.sizeButtonDisabled : null]}
            >
              <Text style={[styles.textStyleButtonText, !isTextElement ? styles.sizeButtonTextDisabled : null]}>
                A-
              </Text>
            </Pressable>
            <Text style={styles.fontSizeValue}>{fontSize}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="增大文字字号"
              disabled={!isTextElement}
              onPress={() => onChangeTextStyle({ fontSize: clamp(fontSize + 1, 12, 28) })}
              style={[styles.textStyleButton, !isTextElement ? styles.sizeButtonDisabled : null]}
            >
              <Text style={[styles.textStyleButtonText, !isTextElement ? styles.sizeButtonTextDisabled : null]}>
                A+
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.textStyleGroup}>
          <Text style={styles.textStyleLabel}>字形</Text>
          <View style={styles.textStyleActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="切换文字加粗"
              disabled={!isTextElement}
              onPress={() => onChangeTextStyle({ fontWeight: isBold ? '700' : '900' })}
              style={[
                styles.textStyleButton,
                isBold ? styles.textStyleButtonActive : null,
                !isTextElement ? styles.sizeButtonDisabled : null,
              ]}
            >
              <Text
                style={[
                  styles.textStyleButtonText,
                  isBold ? styles.textStyleButtonTextActive : null,
                  !isTextElement ? styles.sizeButtonTextDisabled : null,
                ]}
              >
                粗
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="切换文字斜体"
              disabled={!isTextElement}
              onPress={() => onChangeTextStyle({ fontStyle: isItalic ? 'normal' : 'italic' })}
              style={[
                styles.textStyleButton,
                isItalic ? styles.textStyleButtonActive : null,
                !isTextElement ? styles.sizeButtonDisabled : null,
              ]}
            >
              <Text
                style={[
                  styles.textStyleButtonText,
                  isItalic ? styles.textStyleButtonTextActive : null,
                  !isTextElement ? styles.sizeButtonTextDisabled : null,
                ]}
              >
                斜
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.textStyleGroup}>
          <Text style={styles.textStyleLabel}>字体</Text>
          <View style={styles.fontOptionGrid}>
            {fontOptions.map((font) => {
              const isSelected = textElement?.fontId === font.id;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`选择${font.name}字体`}
                  disabled={!isTextElement}
                  key={font.id}
                  onPress={() => onSelectFont(font)}
                  style={[
                    styles.fontOptionButton,
                    isSelected ? styles.fontOptionButtonActive : null,
                    !isTextElement ? styles.sizeButtonDisabled : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.fontOptionName,
                      isSelected ? styles.fontOptionNameActive : null,
                      !isTextElement ? styles.sizeButtonTextDisabled : null,
                    ]}
                  >
                    {font.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.fontOptionPreview}>
                    {font.previewText ?? '今天也想认真记录'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.textStyleGroup}>
          <Text style={styles.textStyleLabel}>颜色</Text>
          <View style={styles.colorSwatchRow}>
            {textColorOptions.map((option) => {
              const isSelected = textElement?.color === option.color;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`设置文字颜色为${option.name}`}
                  disabled={!isTextElement}
                  key={option.color}
                  onPress={() => onChangeTextStyle({ color: option.color })}
                  style={[
                    styles.colorSwatchButton,
                    isSelected ? styles.colorSwatchButtonActive : null,
                    !isTextElement ? styles.colorSwatchButtonDisabled : null,
                  ]}
                >
                  <View style={[styles.colorSwatch, { backgroundColor: option.color }]} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

export function Inspector({
  activeTool,
  element,
}: {
  activeTool: EditorToolKind;
  element?: JournalElement;
}) {
  if (!element) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>属性</Text>
        <Text style={styles.emptyText}>请选择一个页面元素。</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>属性</Text>
      <Text style={styles.propertyName}>{element.name}</Text>
      <Text style={styles.propertyLine}>当前工具：{activeTool}</Text>
      <Text style={styles.propertyLine}>
        位置：x {element.frame.x} / y {element.frame.y}
      </Text>
      <Text style={styles.propertyLine}>
        尺寸：{element.frame.width} x {element.frame.height}
      </Text>
      <Text style={styles.propertyLine}>旋转：{element.frame.rotation}°</Text>
      <Text style={styles.propertyLine}>透明度：{Math.round((element.opacity ?? 1) * 100)}%</Text>
      {element.kind === 'text' ? (
        <>
          <Text style={styles.propertyLine}>字体：{element.fontName ?? '系统默认'}</Text>
          <Text style={styles.propertyLine}>内容：{element.content}</Text>
        </>
      ) : null}
      {element.kind === 'sticker' ? (
        <Text style={styles.propertyLine}>贴纸：{element.label}</Text>
      ) : null}
      {element.kind === 'image' ? (
        <Text style={styles.propertyLine}>来源：{element.sourceLabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  historyControls: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  historyButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    minWidth: 70,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  historyButtonDisabled: {
    backgroundColor: colors.background,
  },
  historyIcon: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  historyText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  historyTextDisabled: {
    color: colors.mutedText,
  },
  toolBar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  toolButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  toolButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  toolIcon: {
    color: colors.mutedText,
    fontSize: 22,
    fontWeight: '800',
  },
  toolIconActive: {
    color: colors.primary,
  },
  toolLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  toolLabelActive: {
    color: colors.primary,
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.mutedText,
    fontSize: 13,
  },
  panelPrimaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  panelPrimaryButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
  },
  pageActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pageActionPreview: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    paddingVertical: 12,
  },
  pageActionIcon: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  pageActionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  sizeTextGroup: {
    gap: 4,
  },
  sizeTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  sizeMeta: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
  },
  backgroundPalette: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  backgroundTemplateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  backgroundTemplateButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 7,
    width: '22.6%',
  },
  backgroundTemplateButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  backgroundPreview: {
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 72,
    overflow: 'hidden',
    position: 'relative',
    width: 56,
  },
  backgroundTemplateName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    maxWidth: '100%',
  },
  backgroundTemplateNameActive: {
    color: colors.primary,
  },
  customColorPanel: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  customColorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  backgroundColorSwatchButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  backgroundColorSwatch: {
    borderRadius: 12,
    height: 24,
    width: 24,
  },
  customColorInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  customColorInput: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  applyCustomColorButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  applyCustomColorButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
  },
  stickerPalette: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  stickerCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stickerCategoryButton: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  stickerCategoryButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  stickerCategoryText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  stickerCategoryTextActive: {
    color: colors.primary,
  },
  stickerPresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stickerPresetButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 8,
    width: 70,
  },
  stickerPresetIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  stickerPresetLabel: {
    fontSize: 28,
    fontWeight: '800',
  },
  stickerPresetName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 56,
  },
  layerRow: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  layerRowActive: {
    backgroundColor: colors.primarySoft,
  },
  layerName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  layerNameActive: {
    color: colors.primary,
  },
  layerKind: {
    color: colors.mutedText,
    fontSize: 12,
  },
  textEditPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  textEditHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  applyTextButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  applyTextButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  textEditInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 82,
    padding: 10,
  },
  textEditInputDisabled: {
    color: colors.mutedText,
  },
  textStylePanel: {
    gap: 12,
  },
  textStyleGroup: {
    gap: 8,
  },
  textStyleLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  textStyleActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  textStyleButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 46,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  textStyleButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  textStyleButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  textStyleButtonTextActive: {
    color: colors.primary,
  },
  sizeButtonDisabled: {
    opacity: 0.45,
  },
  sizeButtonTextDisabled: {
    color: colors.mutedText,
  },
  fontSizeValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 28,
    textAlign: 'center',
  },
  fontOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fontOptionButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 9,
    width: 132,
  },
  fontOptionButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  fontOptionName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  fontOptionNameActive: {
    color: colors.primary,
  },
  fontOptionPreview: {
    color: colors.mutedText,
    fontSize: 11,
  },
  colorSwatchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSwatchButton: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
  },
  colorSwatchButtonActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  colorSwatchButtonDisabled: {
    opacity: 0.45,
  },
  colorSwatch: {
    borderRadius: 8,
    height: 26,
    width: 26,
  },
  propertyName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  propertyLine: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
});
