import { useMemo, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { colors } from '../../theme';
import type { BackgroundRenderMode } from '../materials';
import type { AlignmentGuide } from './editorAlignment';
import { clamp, getMinElementSize } from './editorModel';
import type { JournalElement, JournalElementFrame, JournalPage } from './types';

const BACKGROUND_PATTERN_STEP = 24;
const BACKGROUND_PATTERN_COLUMNS = Array.from({ length: 14 }, (_, index) => index);
const BACKGROUND_PATTERN_ROWS = Array.from({ length: 18 }, (_, index) => index);
const INLINE_HANDLE_OFFSET = 18;
const INLINE_HANDLE_SIZE = 36;

export type InlineControlAction = 'opacity' | 'delete' | 'duplicate' | 'rotate';

type TransformStart = {
  angle: number;
  centerAbsoluteX: number;
  centerAbsoluteY: number;
  distance: number;
  frame: JournalElementFrame;
};

function getPointAngle(x: number, y: number, centerX: number, centerY: number) {
  return (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
}

function rotatePoint(x: number, y: number, rotation: number) {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function normalizeRotation(rotation: number) {
  if (rotation > 180) {
    return rotation - 360;
  }

  if (rotation < -180) {
    return rotation + 360;
  }

  return rotation;
}

export function JournalCanvas({
  alignmentGuide,
  canvasSize,
  elements,
  paper,
  selectedElementId,
  onEditTextElement,
  onFinishMoveElement,
  onInlineControlAction,
  onMoveElement,
  onResizeElement,
  onSelectElement,
}: {
  alignmentGuide: AlignmentGuide | null;
  canvasSize: JournalPage['size'];
  elements: JournalElement[];
  paper: JournalPage['paper'];
  selectedElementId?: string;
  onEditTextElement: (id: string) => void;
  onFinishMoveElement: () => void;
  onInlineControlAction: (id: string, action: InlineControlAction) => void;
  onMoveElement: (id: string, x: number, y: number) => void;
  onResizeElement: (id: string, frame: JournalElementFrame) => void;
  onSelectElement: (id: string) => void;
}) {
  return (
    <View style={[styles.canvas, { height: canvasSize.height, width: canvasSize.width }]}>
      <PaperBackground canvasSize={canvasSize} paper={paper} />
      {alignmentGuide?.x !== undefined ? (
        <View style={[styles.verticalGuide, { left: alignmentGuide.x }]} />
      ) : null}
      {alignmentGuide?.y !== undefined ? (
        <View style={[styles.horizontalGuide, { top: alignmentGuide.y }]} />
      ) : null}
      {elements
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((element) => (
          <CanvasElement
            key={element.id}
            canvasSize={canvasSize}
            element={element}
            isSelected={element.id === selectedElementId}
            onEditText={() => onEditTextElement(element.id)}
            onFinishMove={onFinishMoveElement}
            onInlineControlAction={onInlineControlAction}
            onMove={onMoveElement}
            onResize={onResizeElement}
            onSelect={() => onSelectElement(element.id)}
          />
        ))}
    </View>
  );
}

export function PaperBackground({
  canvasSize,
  paper,
}: {
  canvasSize: JournalPage['size'];
  paper: JournalPage['paper'];
}) {
  const renderMode = getPaperRenderMode(paper.kind);
  const baseColor = paper.color || colors.surface;
  const secondaryColor = paper.secondaryColor ?? 'rgba(255,255,255,0.48)';
  const accentColor = paper.accentColor ?? colors.primarySoft;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.paperBackground,
        {
          backgroundColor: baseColor,
          height: canvasSize.height,
          width: canvasSize.width,
        },
      ]}
    >
      {renderMode === 'grid' ? (
        <>
          {BACKGROUND_PATTERN_COLUMNS.map((index) => (
            <View
              key={`grid-column-${index}`}
              style={[
                styles.backgroundVerticalLine,
                { backgroundColor: secondaryColor, left: index * BACKGROUND_PATTERN_STEP },
              ]}
            />
          ))}
          {BACKGROUND_PATTERN_ROWS.map((index) => (
            <View
              key={`grid-row-${index}`}
              style={[
                styles.backgroundHorizontalLine,
                { backgroundColor: secondaryColor, top: index * BACKGROUND_PATTERN_STEP },
              ]}
            />
          ))}
        </>
      ) : null}

      {renderMode === 'dot' ? (
        <View style={styles.dotPatternLayer}>
          {BACKGROUND_PATTERN_ROWS.flatMap((row) =>
            BACKGROUND_PATTERN_COLUMNS.map((column) => (
              <View
                key={`dot-${row}-${column}`}
                style={[
                  styles.dotPatternDot,
                  {
                    backgroundColor: accentColor,
                    left: column * BACKGROUND_PATTERN_STEP + 7,
                    top: row * BACKGROUND_PATTERN_STEP + 7,
                  },
                ]}
              />
            )),
          )}
        </View>
      ) : null}

      {renderMode === 'lined' ? (
        <>
          {BACKGROUND_PATTERN_ROWS.map((index) => (
            <View
              key={`line-${index}`}
              style={[
                styles.backgroundHorizontalLine,
                {
                  backgroundColor: secondaryColor,
                  top: 24 + index * BACKGROUND_PATTERN_STEP,
                },
              ]}
            />
          ))}
        </>
      ) : null}

      {renderMode === 'kraft' ? (
        <>
          {BACKGROUND_PATTERN_ROWS.map((index) => (
            <View
              key={`kraft-line-${index}`}
              style={[
                styles.kraftTextureLine,
                {
                  backgroundColor: index % 2 === 0 ? secondaryColor : accentColor,
                  left: -20 + (index % 4) * 18,
                  top: index * 25,
                },
              ]}
            />
          ))}
          {BACKGROUND_PATTERN_COLUMNS.map((index) => (
            <View
              key={`kraft-fleck-${index}`}
              style={[
                styles.paperFleck,
                {
                  backgroundColor: accentColor,
                  left: 18 + index * 22,
                  top: 28 + (index % 6) * 54,
                },
              ]}
            />
          ))}
        </>
      ) : null}

      {renderMode === 'watercolor' ? (
        <>
          <View style={[styles.watercolorPatchLarge, { backgroundColor: secondaryColor }]} />
          <View style={[styles.watercolorPatchSmall, { backgroundColor: accentColor }]} />
          <View style={[styles.watercolorPatchBottom, { backgroundColor: secondaryColor }]} />
        </>
      ) : null}

      {renderMode === 'vintage' ? (
        <>
          <View style={[styles.vintageEdgeTop, { backgroundColor: secondaryColor }]} />
          <View style={[styles.vintageEdgeBottom, { backgroundColor: secondaryColor }]} />
          {BACKGROUND_PATTERN_COLUMNS.map((index) => (
            <View
              key={`vintage-fleck-${index}`}
              style={[
                styles.paperFleck,
                {
                  backgroundColor: accentColor,
                  left: 12 + index * 24,
                  top: 18 + (index % 8) * 43,
                },
              ]}
            />
          ))}
        </>
      ) : null}

      {renderMode === 'floral' ? (
        <BackgroundSymbolPattern symbols={['✿', '❀', '✽']} color={accentColor} />
      ) : null}
      {renderMode === 'polka' ? <PolkaPattern color={secondaryColor} /> : null}
      {renderMode === 'stripe' ? <StripePattern color={secondaryColor} /> : null}
      {renderMode === 'plaid' ? (
        <>
          <StripePattern color={secondaryColor} />
          {BACKGROUND_PATTERN_ROWS.map((index) => (
            <View
              key={`plaid-row-${index}`}
              style={[
                styles.plaidHorizontalBand,
                {
                  backgroundColor: accentColor,
                  top: index * 48,
                },
              ]}
            />
          ))}
        </>
      ) : null}
      {renderMode === 'cloud' ? (
        <BackgroundSymbolPattern symbols={['☁', '☁︎']} color={accentColor} />
      ) : null}
      {renderMode === 'star' ? (
        <BackgroundSymbolPattern symbols={['☆', '✦', '✧']} color={accentColor} />
      ) : null}
    </View>
  );
}

function getPaperRenderMode(kind: JournalPage['paper']['kind']): BackgroundRenderMode {
  if (kind === 'plain' || kind === 'border') {
    return 'solid';
  }

  return kind;
}

function BackgroundSymbolPattern({
  color,
  symbols,
}: {
  color: string;
  symbols: string[];
}) {
  return (
    <>
      {BACKGROUND_PATTERN_ROWS.slice(0, 9).flatMap((row) =>
        BACKGROUND_PATTERN_COLUMNS.slice(0, 7).map((column) => {
          const symbol = symbols[(row + column) % symbols.length] ?? symbols[0] ?? '';

          return (
            <Text
              key={`symbol-${row}-${column}`}
              style={[
                styles.backgroundSymbol,
                {
                  color,
                  left: column * 48 + (row % 2) * 18,
                  top: row * 45 + (column % 2) * 7,
                },
              ]}
            >
              {symbol}
            </Text>
          );
        }),
      )}
    </>
  );
}

function PolkaPattern({ color }: { color: string }) {
  return (
    <>
      {BACKGROUND_PATTERN_ROWS.slice(0, 10).flatMap((row) =>
        BACKGROUND_PATTERN_COLUMNS.slice(0, 8).map((column) => (
          <View
            key={`polka-${row}-${column}`}
            style={[
              styles.polkaDot,
              {
                backgroundColor: color,
                left: column * 42 + (row % 2) * 18,
                top: row * 42,
              },
            ]}
          />
        )),
      )}
    </>
  );
}

function StripePattern({ color }: { color: string }) {
  return (
    <>
      {BACKGROUND_PATTERN_COLUMNS.map((index) => (
        <View
          key={`stripe-${index}`}
          style={[
            styles.stripeBand,
            {
              backgroundColor: color,
              left: index * 44,
            },
          ]}
        />
      ))}
    </>
  );
}

function CanvasElement({
  canvasSize,
  element,
  isSelected,
  onEditText,
  onFinishMove,
  onInlineControlAction,
  onMove,
  onResize,
  onSelect,
}: {
  canvasSize: JournalPage['size'];
  element: JournalElement;
  isSelected: boolean;
  onEditText: () => void;
  onFinishMove: () => void;
  onInlineControlAction: (id: string, action: InlineControlAction) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, frame: JournalElementFrame) => void;
  onSelect: () => void;
}) {
  const dragStart = useRef({ x: element.frame.x, y: element.frame.y });
  const transformStart = useRef<TransformStart | null>(null);
  const pendingResizeFrame = useRef<JournalElementFrame | null>(null);
  const resizeAnimationFrame = useRef<number | null>(null);
  const hasMovedElement = useRef(false);
  const hasTransformedElement = useRef(false);
  const controlOffset = isSelected ? INLINE_HANDLE_OFFSET : 0;
  const containerWidth = element.frame.width + controlOffset * 2;
  const containerHeight = element.frame.height + controlOffset * 2;
  const emitResizeFrame = (nextFrame: JournalElementFrame) => {
    pendingResizeFrame.current = nextFrame;

    if (resizeAnimationFrame.current !== null) {
      return;
    }

    resizeAnimationFrame.current = requestAnimationFrame(() => {
      resizeAnimationFrame.current = null;

      if (pendingResizeFrame.current) {
        onResize(element.id, pendingResizeFrame.current);
      }
    });
  };
  const flushResizeFrame = () => {
    if (resizeAnimationFrame.current !== null) {
      cancelAnimationFrame(resizeAnimationFrame.current);
      resizeAnimationFrame.current = null;
    }

    if (pendingResizeFrame.current) {
      onResize(element.id, pendingResizeFrame.current);
      pendingResizeFrame.current = null;
    }
  };
  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(1)
        .shouldCancelWhenOutside(false)
        .onBegin(() => {
          onSelect();
          hasMovedElement.current = false;
          dragStart.current = {
            x: element.frame.x,
            y: element.frame.y,
          };
        })
        .onUpdate((event) => {
          hasMovedElement.current = true;
          const nextX = clamp(
            dragStart.current.x + event.translationX,
            0,
            canvasSize.width - element.frame.width,
          );
          const nextY = clamp(
            dragStart.current.y + event.translationY,
            0,
            canvasSize.height - element.frame.height,
          );

          onMove(element.id, Math.round(nextX), Math.round(nextY));
        })
        .onFinalize(() => {
          if (hasMovedElement.current) {
            hasMovedElement.current = false;
            onFinishMove();
          }
        }),
    [
      canvasSize.height,
      canvasSize.width,
      element.frame.height,
      element.frame.width,
      element.frame.x,
      element.frame.y,
      element.id,
      element.kind,
      isSelected,
      onFinishMove,
      onMove,
      onSelect,
    ],
  );
  const transformGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(1)
        .shouldCancelWhenOutside(false)
        .onBegin((event) => {
          onSelect();
          hasTransformedElement.current = false;

          const startFrame = element.frame;
          const centerLocalX = controlOffset + startFrame.width / 2;
          const centerLocalY = controlOffset + startFrame.height / 2;
          const handleLocalX = containerWidth - INLINE_HANDLE_SIZE + event.x;
          const handleLocalY = event.y;
          const vectorToTouch = rotatePoint(
            handleLocalX - centerLocalX,
            handleLocalY - centerLocalY,
            startFrame.rotation,
          );
          const centerAbsoluteX = event.absoluteX - vectorToTouch.x;
          const centerAbsoluteY = event.absoluteY - vectorToTouch.y;
          const distance = Math.max(
            getPointDistance(event.absoluteX, event.absoluteY, centerAbsoluteX, centerAbsoluteY),
            INLINE_HANDLE_SIZE / 2,
          );

          transformStart.current = {
            angle: getPointAngle(event.absoluteX, event.absoluteY, centerAbsoluteX, centerAbsoluteY),
            centerAbsoluteX,
            centerAbsoluteY,
            distance,
            frame: startFrame,
          };
        })
        .onUpdate((event) => {
          if (!transformStart.current) {
            return;
          }

          hasTransformedElement.current = true;
          const start = transformStart.current;
          const startFrame = start.frame;
          const nextDistance = Math.max(
            getPointDistance(event.absoluteX, event.absoluteY, start.centerAbsoluteX, start.centerAbsoluteY),
            INLINE_HANDLE_SIZE / 2,
          );
          const scale = clamp(nextDistance / start.distance, 0.35, 2.8);
          const nextWidth = Math.round(
            clamp(startFrame.width * scale, getMinElementSize(element.kind), canvasSize.width),
          );
          const nextHeight = Math.round(
            clamp(startFrame.height * scale, getMinElementSize(element.kind), canvasSize.height),
          );
          const frameCenterX = startFrame.x + startFrame.width / 2;
          const frameCenterY = startFrame.y + startFrame.height / 2;
          const nextAngle = getPointAngle(
            event.absoluteX,
            event.absoluteY,
            start.centerAbsoluteX,
            start.centerAbsoluteY,
          );
          const angleDelta = normalizeRotation(nextAngle - start.angle);

          emitResizeFrame({
            ...startFrame,
            height: nextHeight,
            rotation: normalizeRotation(startFrame.rotation + angleDelta),
            width: nextWidth,
            x: Math.round(clamp(frameCenterX - nextWidth / 2, 0, canvasSize.width - nextWidth)),
            y: Math.round(clamp(frameCenterY - nextHeight / 2, 0, canvasSize.height - nextHeight)),
          });
        })
        .onFinalize(() => {
          flushResizeFrame();
          transformStart.current = null;

          if (hasTransformedElement.current) {
            hasTransformedElement.current = false;
            onFinishMove();
          }
        }),
    [
      canvasSize.height,
      canvasSize.width,
      containerWidth,
      controlOffset,
      element.frame,
      element.id,
      element.kind,
      onFinishMove,
      onResize,
      onSelect,
      emitResizeFrame,
      flushResizeFrame,
    ],
  );
  const deleteTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .maxDistance(8)
        .onEnd((_, success) => {
          if (success) {
            onInlineControlAction(element.id, 'delete');
          }
        }),
    [element.id, onInlineControlAction],
  );
  const opacityTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .maxDistance(8)
        .onEnd((_, success) => {
          if (success) {
            onInlineControlAction(element.id, 'opacity');
          }
        }),
    [element.id, onInlineControlAction],
  );
  const duplicateTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .maxDistance(8)
        .onEnd((_, success) => {
          if (success) {
            onInlineControlAction(element.id, 'duplicate');
          }
        }),
    [element.id, onInlineControlAction],
  );
  const textEditTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .numberOfTaps(2)
        .maxDistance(10)
        .onEnd((_, success) => {
          if (success) {
            onSelect();
            onEditText();
          }
        }),
    [onEditText, onSelect],
  );
  const textContentGesture = useMemo(
    () => Gesture.Simultaneous(dragGesture, textEditTapGesture),
    [dragGesture, textEditTapGesture],
  );
  const elementFrame = {
    height: containerHeight,
    left: element.frame.x - controlOffset,
    top: element.frame.y - controlOffset,
    transform: [{ rotate: `${element.frame.rotation}deg` }],
    width: containerWidth,
    zIndex: element.zIndex,
  };
  const contentFrame = {
    height: element.frame.height,
    left: controlOffset,
    top: controlOffset,
    width: element.frame.width,
  };
  const contentOpacity = element.opacity ?? 1;
  const selectedControls = isSelected ? (
    <InlineElementControls
      deleteGesture={deleteTapGesture}
      duplicateGesture={duplicateTapGesture}
      offset={controlOffset}
      opacityGesture={opacityTapGesture}
      transformGesture={transformGesture}
    />
  ) : null;

  if (element.kind === 'image') {
    return (
      <View
        accessibilityRole="button"
        collapsable={false}
        style={[styles.canvasElement, elementFrame]}
      >
        <GestureDetector gesture={dragGesture}>
          <View
            collapsable={false}
            style={[
              styles.elementContent,
              styles.imageElement,
              contentFrame,
              { borderColor: element.tintColor, opacity: contentOpacity },
            ]}
          >
            {element.uri ? (
              <Image source={{ uri: element.uri }} style={styles.imagePreview} />
            ) : (
              <Text style={[styles.imageLabel, { color: element.tintColor }]}>
                {element.sourceLabel}
              </Text>
            )}
          </View>
        </GestureDetector>
        {selectedControls}
      </View>
    );
  }

  if (element.kind === 'text') {
    const fontVariantStyle = element.fontFamily
      ? {
          fontFamily: element.fontFamily,
        }
      : {
          fontStyle: element.fontStyle ?? 'normal',
          fontWeight: element.fontWeight ?? '700',
        };

    return (
      <View
        accessibilityRole="button"
        collapsable={false}
        style={[styles.canvasElement, elementFrame]}
      >
        <GestureDetector gesture={textContentGesture}>
          <View
            collapsable={false}
            style={[styles.elementContent, styles.textElement, contentFrame, { opacity: contentOpacity }]}
          >
            <Text
              style={[
                styles.textElementContent,
                {
                  color: element.color,
                  fontSize: element.fontSize,
                  lineHeight: Math.round(element.fontSize * 1.45),
                  ...fontVariantStyle,
                },
              ]}
            >
              {element.content}
            </Text>
          </View>
        </GestureDetector>
        {selectedControls}
      </View>
    );
  }

  const stickerFontSize = Math.max(
    18,
    Math.round(Math.min(element.frame.width, element.frame.height) * 0.72),
  );

  return (
    <View
      accessibilityRole="button"
      collapsable={false}
      style={[styles.canvasElement, elementFrame]}
    >
      <GestureDetector gesture={dragGesture}>
        <View
          collapsable={false}
          style={[
            styles.elementContent,
            styles.stickerElement,
            contentFrame,
            { opacity: contentOpacity },
          ]}
        >
          {element.imageUri ? (
            <Image source={{ uri: element.imageUri }} style={styles.stickerImage} />
          ) : (
            <Text style={[styles.stickerLabel, { color: element.color, fontSize: stickerFontSize }]}>
              {element.label}
            </Text>
          )}
        </View>
      </GestureDetector>
      {selectedControls}
    </View>
  );
}

function getPointDistance(x: number, y: number, centerX: number, centerY: number) {
  const deltaX = x - centerX;
  const deltaY = y - centerY;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function InlineElementControls({
  deleteGesture,
  duplicateGesture,
  offset,
  opacityGesture,
  transformGesture,
}: {
  deleteGesture: ReturnType<typeof Gesture.Tap>;
  duplicateGesture: ReturnType<typeof Gesture.Tap>;
  offset: number;
  opacityGesture: ReturnType<typeof Gesture.Tap>;
  transformGesture: ReturnType<typeof Gesture.Pan>;
}) {
  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.inlineSelectionBox,
          {
            bottom: offset,
            left: offset,
            right: offset,
            top: offset,
          },
        ]}
      />
      <GestureDetector gesture={deleteGesture}>
        <View collapsable={false} style={[styles.inlineHandle, styles.inlineHandleTopLeft]}>
          <Text style={styles.inlineHandleText}>×</Text>
        </View>
      </GestureDetector>
      <GestureDetector gesture={transformGesture}>
        <View collapsable={false} style={[styles.inlineHandle, styles.inlineHandleTopRight]}>
          <Text style={styles.inlineHandleText}>⟳</Text>
        </View>
      </GestureDetector>
      <GestureDetector gesture={opacityGesture}>
        <View collapsable={false} style={[styles.inlineHandle, styles.inlineHandleBottomLeft]}>
          <Text style={styles.inlineHandleText}>◐</Text>
        </View>
      </GestureDetector>
      <GestureDetector gesture={duplicateGesture}>
        <View collapsable={false} style={[styles.inlineHandle, styles.inlineHandleBottomRight]}>
          <Text style={styles.inlineHandleText}>⊞</Text>
        </View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primarySoft,
    borderRadius: 8,
    borderWidth: 1,
    height: 430,
    overflow: 'hidden',
    position: 'relative',
  },
  paperBackground: {
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
  },
  verticalGuide: {
    backgroundColor: colors.accent,
    bottom: 0,
    opacity: 0.65,
    position: 'absolute',
    top: 0,
    width: 1,
    zIndex: 9998,
  },
  horizontalGuide: {
    backgroundColor: colors.accent,
    height: 1,
    left: 0,
    opacity: 0.65,
    position: 'absolute',
    right: 0,
    zIndex: 9998,
  },
  backgroundVerticalLine: {
    bottom: 0,
    opacity: 0.72,
    position: 'absolute',
    top: 0,
    width: 1,
  },
  backgroundHorizontalLine: {
    height: 1,
    left: 0,
    opacity: 0.72,
    position: 'absolute',
    right: 0,
  },
  dotPatternLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  dotPatternDot: {
    borderRadius: 2,
    height: 4,
    opacity: 0.36,
    position: 'absolute',
    width: 4,
  },
  kraftTextureLine: {
    borderRadius: 4,
    height: 2,
    opacity: 0.13,
    position: 'absolute',
    transform: [{ rotate: '-8deg' }],
    width: 360,
  },
  paperFleck: {
    borderRadius: 2,
    height: 4,
    opacity: 0.18,
    position: 'absolute',
    width: 4,
  },
  watercolorPatchLarge: {
    borderRadius: 90,
    height: 155,
    left: -24,
    opacity: 0.42,
    position: 'absolute',
    top: 18,
    width: 190,
  },
  watercolorPatchSmall: {
    borderRadius: 72,
    height: 126,
    opacity: 0.22,
    position: 'absolute',
    right: -24,
    top: 88,
    width: 150,
  },
  watercolorPatchBottom: {
    borderRadius: 82,
    bottom: 20,
    height: 118,
    left: 74,
    opacity: 0.25,
    position: 'absolute',
    width: 178,
  },
  vintageEdgeTop: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    height: 34,
    left: 0,
    opacity: 0.25,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  vintageEdgeBottom: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    bottom: 0,
    height: 46,
    left: 0,
    opacity: 0.22,
    position: 'absolute',
    right: 0,
  },
  backgroundSymbol: {
    fontSize: 15,
    fontWeight: '800',
    opacity: 0.32,
    position: 'absolute',
  },
  polkaDot: {
    borderRadius: 11,
    height: 22,
    opacity: 0.34,
    position: 'absolute',
    width: 22,
  },
  stripeBand: {
    bottom: 0,
    opacity: 0.24,
    position: 'absolute',
    top: 0,
    transform: [{ rotate: '7deg' }],
    width: 18,
  },
  plaidHorizontalBand: {
    height: 16,
    left: 0,
    opacity: 0.12,
    position: 'absolute',
    right: 0,
  },
  canvasElement: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    position: 'absolute',
  },
  elementContent: {
    position: 'absolute',
  },
  inlineSelectionBox: {
    borderColor: 'rgba(111, 100, 104, 0.72)',
    borderRadius: 3,
    borderStyle: 'dashed',
    borderWidth: 1.2,
    position: 'absolute',
  },
  inlineHandle: {
    alignItems: 'center',
    backgroundColor: '#F47DA7',
    borderColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    width: 36,
    zIndex: 9999,
  },
  inlineHandleTopLeft: {
    left: 0,
    top: 0,
  },
  inlineHandleTopRight: {
    right: 0,
    top: 0,
  },
  inlineHandleBottomLeft: {
    bottom: 0,
    left: 0,
  },
  inlineHandleBottomRight: {
    bottom: 0,
    right: 0,
  },
  inlineHandleText: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 27,
    textAlign: 'center',
  },
  imageElement: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePreview: {
    height: '100%',
    width: '100%',
  },
  imageLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  textElement: {
    justifyContent: 'center',
  },
  textElementContent: {
    lineHeight: 22,
  },
  stickerElement: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerImage: {
    height: '100%',
    resizeMode: 'contain',
    width: '100%',
  },
  stickerLabel: {
    fontWeight: '900',
  },
});
