import { PDFDocumentProxy } from "pdfjs-dist";
import type { PageViewport } from "pdfjs-dist/types/web/pdf_viewer";
import type { PDFViewer } from "pdfjs-dist/web/pdf_viewer.d.mts";
import { createContext, PropsWithChildren, useContext } from "react";
import {
  scaledToViewport as libScaledToViewport,
  viewportToScaled as libViewportToScaled,
} from "../lib/coordinates";
import { getAreaAsPNG as libGetAreaAsPNG } from "../lib/get-area-as-png";
import { LTWH, LTWHP, Position, Scaled, ScaledPosition } from "../types";
import { HighlighterProps, IHighlight } from "./Highlighter";
export type TypeHighlighter = {
  scaledPositionToViewport?: (pos: ScaledPosition) => Position;
  viewportPositionToScaled?: (po: Position) => ScaledPosition;
  viewportToScaled: (r: LTWHP, r2: { width: number; height: number }) => Scaled;
  screenshot: (position: LTWH, pageNumber: number) => string;
  scrollPageIntoView: (pageNumber: number, destArray?: any[]) => void;
  getPageView: (index: number) => any;
  getPageViewport: (index: number) => PageViewport;
  convertToPdfPoint: (pageNumber: number, x: number, y: number) => number[];
  scaledToViewport: (
    pageNumber: number,
    scaled: Scaled,
    usePdfCoordinates?: boolean
  ) => LTWHP;
  pdfDocument?: PDFDocumentProxy;
  pdfViewer: PDFViewer | null;
};
function createWithViewer(viewer: PDFViewer | null) {
  return (fn: (...args: any[]) => any) =>
    (...args: any[]) =>
      fn(viewer!, ...args);
}

/**
 * Transforms scaled position coordinates to viewport coordinates based on the provided PDF viewer and position details.
 *
 * @param viewer - The PDFViewer instance used to get the viewport of the specific page.
 * @param position - An object containing details about the position including pageNumber, boundingRect, rects, and usePdfCoordinates.
 * @returns An object with transformed boundingRect, rects, and pageNumber in viewport coordinates.
 */
function scaledPositionToViewport(viewer: PDFViewer, position: ScaledPosition) {
  const { pageNumber, boundingRect, rects, usePdfCoordinates } = position;
  const viewport = viewer.getPageView(pageNumber - 1).viewport;
  return {
    boundingRect: libScaledToViewport(
      boundingRect,
      viewport,
      usePdfCoordinates
    ),
    rects: (rects || []).map((rect) =>
      libScaledToViewport(rect, viewport, usePdfCoordinates)
    ),
    pageNumber,
  };
}

/**
 * Converts a rectangle from the viewport coordinates to the scaled coordinates.
 *
 * @param viewer - The PDFViewer instance.
 * @param pageNumber - The page number of the PDF.
 * @param rect - The rectangle in viewport coordinates.
 * @returns The rectangle converted to scaled coordinates.
 */

function viewportToScaled(viewer: PDFViewer, pageNumber: number, rect: any) {
  const viewport = viewer!.getPageView(
    (rect.pageNumber || pageNumber) - 1
  ).viewport;
  return libViewportToScaled(rect, viewport);
}

/**
 * Converts a viewport position to a scaled position based on the current viewer's viewport.
 *
 * @param viewer - The PDFViewer instance containing the viewport information.
 * @param position - The Position object containing the bounding rectangle and/or individual rects to be scaled.
 * @returns A ScaledPosition object with the bounding rectangle and rects adjusted to the current viewport scale.
 *
 * The function calculates the scaled dimensions of the bounding rectangle and any additional rects provided in the position object.
 * It uses the viewport of the specified page to perform the scaling, ensuring that the coordinates are accurate relative to the current view.
 */
function viewportPositionToScaled(
  viewer: PDFViewer,
  position: Position
): ScaledPosition {
  const viewport = viewer.getPageView(position.pageNumber - 1).viewport;
  return {
    boundingRect: libViewportToScaled(position.boundingRect, viewport),
    rects: (position.rects || []).map((rect) =>
      libViewportToScaled(rect, viewport)
    ),
    pageNumber: position.pageNumber,
  };
}

/**
 * Creates a set of helper functions for interacting with a PDFViewer instance.
 *
 * @param {Partial<HighlighterProps>} props - The PDFViewer instance to create helpers for.
 * @returns An object containing various helper functions for the PDFViewer.
 *
 * The returned object includes functions for:
 * - Converting between viewport and scaled coordinates.
 * - Taking screenshots of specific areas on a page.
 * - Scrolling a specific page into view.
 * - Converting mouse coordinates to PDF point coordinates.
 * - Getting the viewport of a specific page.
 * - Scaling coordinates to viewport dimensions.
 *
 * Each function is designed to work seamlessly with the provided PDFViewer instance,
 * facilitating complex interactions and manipulations of PDF documents within a React application.
 */

export function createHighlighterContextValue(
  props: Partial<HighlighterProps>
) {
  const withViewer = createWithViewer(props.pdfViewer!);
  function getPageView(pdfViewer: PDFViewer, index: number) {
    return pdfViewer.getPageView(index);
  }
  function scrollPageIntoView(
    viewer: PDFViewer,
    pageNumber: number,
    destArray?: any[]
  ) {
    destArray = Array.isArray(destArray) ? destArray : [];
    viewer.scrollPageIntoView({
      pageNumber: pageNumber,
      destArray: [null, { name: "XYZ" }, ...destArray, 0],
    });
  }

  function convertToPdfPoint(
    viewer: PDFViewer,
    pageNumber: number,
    x: number,
    y: number
  ) {
    const viewport = getPageViewport(viewer, pageNumber);
    return viewport.convertToPdfPoint(x, y);
  }

  function getPageViewport(viewer: PDFViewer, pageNumber: number) {
    return getPageView(viewer, pageNumber - 1).viewport;
  }

  function scaledToViewport(
    viewer: PDFViewer,
    pageNumber: number,
    scaled: Scaled,
    usePdfCoordinates = false
  ) {
    const viewport = getPageViewport(viewer!, pageNumber);
    return libScaledToViewport(scaled, viewport, usePdfCoordinates);
  }

  function screenshot(viewer: PDFViewer, position: LTWH, pageNumber: number) {
    const canvas = viewer.getPageView(pageNumber - 1).canvas;
    return libGetAreaAsPNG(canvas, position);
  }

  return {
    viewportPositionToScaled: withViewer(viewportPositionToScaled),
    scaledPositionToViewport: withViewer(scaledPositionToViewport),
    viewportToScaled: withViewer(viewportToScaled),
    screenshot: withViewer(screenshot),
    scrollPageIntoView: withViewer(scrollPageIntoView),
    getPageView: withViewer(getPageView),
    convertToPdfPoint: withViewer(convertToPdfPoint),
    getPageViewport: withViewer(getPageViewport),
    scaledToViewport: withViewer(scaledToViewport),
    pdfViewer: props.pdfViewer,
    pdfDocument: props.pdfDocument,
  } as TypeHighlighter;
}
type TypeHighlight = {
  onShow: () => void;
  onHide: () => void;
  highlight: IHighlight;
};

type TypeLayer = {
  onMouseOver?: (event: React.MouseEvent<HTMLDivElement>) => void;
  highlight?: IHighlight;
  backgroundColor?: string;
  index: number;
  pageNumber: number;
};

type ProviderProp = PropsWithChildren<{
  value: TypeHighlight | TypeHighlighter | TypeLayer | null;
}>;

function createProvider(Context: any, hiddenWhenNoValue = false) {
  return ({ value, children }: ProviderProp) => {
    if (hiddenWhenNoValue && !value) return null;

    return <Context.Provider value={value} children={children} />;
  };
}

const HighlighterContext = createContext<TypeHighlighter | null>(null);
export const HighlighterProvider = createProvider(HighlighterContext);
export const useHighlighter = () => useContext(HighlighterContext)!;

const HighlightContext = createContext<TypeHighlight | null>(null);
export const HighlightProvider = createProvider(HighlightContext, true);
export const useHighlight = () => useContext(HighlightContext);

const LayerContext = createContext<TypeLayer | null>(null);
export const LayerProvider = createProvider(LayerContext);
export const useLayer = () => useContext(LayerContext);
