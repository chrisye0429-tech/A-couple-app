import { clamp } from './editorModel';
import type { JournalElement, JournalPage } from './types';

export type AlignmentGuide = {
  x?: number;
  y?: number;
};

type AlignmentCandidate = {
  value: number;
};

type SnapResult = {
  value: number;
  offset: number;
  distance: number;
};

const ALIGNMENT_THRESHOLD = 6;

export function getSnappedFrame({
  canvasSize,
  elements,
  movingElement,
  nextX,
  nextY,
}: {
  canvasSize: JournalPage['size'];
  elements: JournalElement[];
  movingElement: JournalElement;
  nextX: number;
  nextY: number;
}) {
  const clampedX = clamp(nextX, 0, canvasSize.width - movingElement.frame.width);
  const clampedY = clamp(nextY, 0, canvasSize.height - movingElement.frame.height);
  const verticalCandidates = getVerticalAlignmentCandidates(canvasSize, elements, movingElement.id);
  const horizontalCandidates = getHorizontalAlignmentCandidates(canvasSize, elements, movingElement.id);
  const verticalSnap = findNearestSnap(
    [
      { value: clampedX, offset: 0 },
      { value: clampedX + movingElement.frame.width / 2, offset: movingElement.frame.width / 2 },
      { value: clampedX + movingElement.frame.width, offset: movingElement.frame.width },
    ],
    verticalCandidates,
  );
  const horizontalSnap = findNearestSnap(
    [
      { value: clampedY, offset: 0 },
      { value: clampedY + movingElement.frame.height / 2, offset: movingElement.frame.height / 2 },
      { value: clampedY + movingElement.frame.height, offset: movingElement.frame.height },
    ],
    horizontalCandidates,
  );

  return {
    guide: {
      x: verticalSnap?.value,
      y: horizontalSnap?.value,
    },
    x: verticalSnap
      ? clamp(verticalSnap.value - verticalSnap.offset, 0, canvasSize.width - movingElement.frame.width)
      : clampedX,
    y: horizontalSnap
      ? clamp(horizontalSnap.value - horizontalSnap.offset, 0, canvasSize.height - movingElement.frame.height)
      : clampedY,
  };
}

function getVerticalAlignmentCandidates(
  canvasSize: JournalPage['size'],
  elements: JournalElement[],
  movingElementId: string,
): AlignmentCandidate[] {
  return [
    { value: 0 },
    { value: canvasSize.width / 2 },
    { value: canvasSize.width },
    ...elements
      .filter((element) => element.id !== movingElementId)
      .flatMap((element) => [
        { value: element.frame.x },
        { value: element.frame.x + element.frame.width / 2 },
        { value: element.frame.x + element.frame.width },
      ]),
  ];
}

function getHorizontalAlignmentCandidates(
  canvasSize: JournalPage['size'],
  elements: JournalElement[],
  movingElementId: string,
): AlignmentCandidate[] {
  return [
    { value: 0 },
    { value: canvasSize.height / 2 },
    { value: canvasSize.height },
    ...elements
      .filter((element) => element.id !== movingElementId)
      .flatMap((element) => [
        { value: element.frame.y },
        { value: element.frame.y + element.frame.height / 2 },
        { value: element.frame.y + element.frame.height },
      ]),
  ];
}

function findNearestSnap(
  movingPoints: Array<{ value: number; offset: number }>,
  candidates: AlignmentCandidate[],
): SnapResult | null {
  let bestSnap: SnapResult | null = null;

  movingPoints.forEach((point) => {
    candidates.forEach((candidate) => {
      const distance = Math.abs(point.value - candidate.value);

      if (distance > ALIGNMENT_THRESHOLD) {
        return;
      }

      if (!bestSnap || distance < bestSnap.distance) {
        bestSnap = {
          distance,
          offset: point.offset,
          value: candidate.value,
        };
      }
    });
  });

  return bestSnap;
}
