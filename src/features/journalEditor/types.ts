import type {
  BackgroundFitMode,
  BackgroundMaterialType,
  BackgroundRenderMode,
} from '../materials';

export type JournalElementKind = 'image' | 'text' | 'sticker';

export type PaperBackgroundKind = BackgroundRenderMode | 'plain' | 'border';

export type EditorToolKind = 'image' | 'text' | 'paper' | 'sticker' | 'page' | 'favorite';

export type JournalElementFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type BaseJournalElement = {
  id: string;
  kind: JournalElementKind;
  name: string;
  frame: JournalElementFrame;
  zIndex: number;
  opacity?: number;
  locked?: boolean;
};

export type ImageJournalElement = BaseJournalElement & {
  kind: 'image';
  sourceLabel: string;
  tintColor: string;
  uri?: string;
};

export type TextJournalElement = BaseJournalElement & {
  kind: 'text';
  content: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  fontId?: string;
  fontFamily?: string;
  fontName?: string;
  fontStyle?: 'normal' | 'italic';
  fontWeight?: '400' | '700' | '900';
};

export type StickerJournalElement = BaseJournalElement & {
  kind: 'sticker';
  stickerId?: string;
  label: string;
  color: string;
  backgroundColor: string;
  imageUri?: string;
  sourceUrl?: string;
  provider?: string;
  status?: string;
};

export type JournalElement =
  | ImageJournalElement
  | TextJournalElement
  | StickerJournalElement;

export type JournalPage = {
  id: string;
  title: string;
  folderName: string;
  paper: {
    id: string;
    name: string;
    kind: PaperBackgroundKind;
    color: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundType?: BackgroundMaterialType;
    fitMode?: BackgroundFitMode;
    customizable?: boolean;
  };
  size: {
    width: number;
    height: number;
  };
  elements: JournalElement[];
  updatedAtLabel: string;
  saveState: 'draft' | 'saved' | 'syncing';
};

export type EditorTool = {
  kind: EditorToolKind;
  label: string;
  icon: string;
  description: string;
};
