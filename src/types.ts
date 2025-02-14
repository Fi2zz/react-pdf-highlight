export interface LTWH {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface LTWHP extends LTWH {
  pageNumber?: number;
}

export interface Scaled {
  x1: number;
  y1: number;

  x2: number;
  y2: number;

  width: number;
  height: number;

  pageNumber?: number;
}

export interface Position {
  boundingRect: LTWHP;
  rects: Array<LTWHP>;
  pageNumber: number;
}

export interface ScaledPosition {
  boundingRect: Scaled;
  rects: Array<Scaled>;
  pageNumber: number;
  usePdfCoordinates?: boolean;
}

export interface Content {
  text?: string;
  image?: string;
}

export interface HighlightContent {
  content?: Content;
}

export interface Comment {
  text: string;
  emoji?: string;
}

export interface HighlightComment {
  comment?: Comment;
}

export interface ViewportHighlight extends HighlightContent, HighlightComment {
  position: Position;
  id?: string;
}

export type HighlightType = "text" | "image";

export interface IHighlight extends Omit<ViewportHighlight, "position"> {
  id?: string;
  position: ScaledPosition;
  comment?: Comment;
  content?: Content;
  type?: HighlightType;
}

export interface Viewport {
  convertToPdfPoint: (x: number, y: number) => Array<number>;
  convertToViewportRectangle: (pdfRectangle: Array<number>) => Array<number>;
  width: number;
  height: number;
}

export interface Page {
  node: HTMLElement;
  number: number;
}
export type Highlights = IHighlight[];
