import { PDFDocumentProxy } from "pdfjs-dist";
import type { PDFViewer } from "pdfjs-dist/web/pdf_viewer.d.mts";
import {
  forwardRef,
  JSX,
  PropsWithChildren,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type ForwardRefRenderFunction,
} from "react";
import { debounce } from "ts-debounce";
import { getBoundingRect } from "../lib/get-bounding-rect";
import { getClientRects } from "../lib/get-client-rects";
import {
  getPageFromElement,
  getPagesFromRange,
  getWindow,
  isHTMLElement,
} from "../lib/pdfjs-dom";
import type {
  Highlights,
  IHighlight,
  LTWH,
  Position,
  ScaledPosition,
  ViewportHighlight,
} from "../types";
import { HighlightLayers } from "./HighlightLayers";
import { MouseSelection } from "./MouseSelection";
import { Positioner } from "./Positioner";
import {
  createHighlighterContextValue,
  HighlightProvider,
  HighlighterProvider,
} from "./Context";
const EMPTY_SCROLL_ID = "empty-scroll-id";
export * from "../types";
export { type ViewportHighlight };
export type HighlighterProps = PropsWithChildren<{
  /**
   * Collection of highlight data
   * @default []
   */
  highlights: Highlights;

  /**
   * Area selection enablement control
   * @param event - Native mouse event
   * @returns Boolean indicating whether area selection should be enabled
   */
  enableAreaSelection?: (event: globalThis.MouseEvent) => boolean;

  /**
   * Render function for highlight overlay layer
   * @returns JSX element representing the highlight layer
   */
  renderHighlightLayer: () => JSX.Element;

  /**
   * Background color for highlight layers
   * @default "rgba(255, 226, 143, 0.5)"
   */
  layerBackgroundColor?: string;
  /**
   * Background color when scrolled to a highlight
   * @default "rgba(255, 226, 143, 0.8)"
   */
  layerScrolledToBackgroundColor?: string;

  /**
   * CSS selection highlight color
   * @default "rgba(255, 226, 143, 0.5)"
   */
  cssSelectionColor?: string;

  /**
   * PDF viewer instance (from PDF.js)
   */
  pdfViewer?: PDFViewer;

  /**
   * PDF document proxy instance (from PDF.js)
   */
  pdfDocument?: PDFDocumentProxy;
}>;

export type HighlighterRef = {
  /**
   * Scrolls to specified highlight position
   * @param highlight - Target highlight object containing position data
   * @remarks
   * Calculates scroll position based on highlight coordinates
   * and updates viewport accordingly
   */
  scrollTo: (highlight: IHighlight) => void;
};
/**
 * Core highlighter component implementation
 * @remarks
 * Manages text/image highlighting within PDF viewer using PDF.js integration.
 * Exposes scroll functionality via React forwardRef pattern.
 *
 * @param props - Component configuration properties
 * @param ref - Forwarded ref for scroll control
 *
 * Features:
 * - Viewport position tracking
 * - Highlight state management
 * - User interaction handling (pointer events, selections, keyboard)
 * - Customizable highlight rendering
 * - PDF document integration
 */
const Core: ForwardRefRenderFunction<HighlighterRef, HighlighterProps> = (
  {
    layerScrolledToBackgroundColor = "ff6467",
    layerBackgroundColor = "#fce897",
    cssSelectionColor = "#fce897",
    renderHighlightLayer,
    ...props
  },
  ref
) => {
  const [viewportPosition, setViewportPosition] = useState<Position>();
  const [highlight, setHighlight] = useState<IHighlight>();
  const [ghostHighlight, setGhostHighlight] = useState<IHighlight>();
  const [selectionIsCollapsed, setSelectionIsCollapsed] = useState(true);
  const [scrollId, setScrollId] = useState(EMPTY_SCROLL_ID);
  const helpers = createHighlighterContextValue(props);
  const [, _forceUpdate] = useState(0);
  const forceUpdate = () => _forceUpdate((x) => x + 1);
  const [mouseSelectionInProgress, setMouseSelectionInProgress] =
    useState(false);
  const highlights = useMemo(
    () => groupHighlightsByPage(props.highlights, ghostHighlight!),
    [props.highlights, ghostHighlight, scrollId]
  );

  const onChangeHighlight = (
    viewportPosition: Position,
    highlight: IHighlight | ViewportHighlight
  ) => {
    setViewportPosition(viewportPosition);
    setHighlight(highlight as unknown as IHighlight);
  };
  function clearState() {
    setGhostHighlight(undefined);
    setViewportPosition(undefined);
    setHighlight(undefined);
  }
  function onMouseSelection(element: HTMLElement, boundingRect: LTWH) {
    const page = getPageFromElement(element);
    if (!page) return;
    const pageBoundingRect = {
      ...boundingRect,
      top: boundingRect.top - page.node.offsetTop,
      left: boundingRect.left - page.node.offsetLeft,
      pageNumber: page.number,
    };
    const viewportPosition = {
      boundingRect: pageBoundingRect,
      rects: [],
      pageNumber: page.number,
    };
    const image = helpers.screenshot(
      pageBoundingRect,
      pageBoundingRect.pageNumber
    );
    const scaledPosition = helpers.viewportPositionToScaled!(viewportPosition);
    const highlight = {
      position: scaledPosition,
      content: { image },
      type: "image",
    };
    onChangeHighlight(viewportPosition, highlight as IHighlight);
  }

  function onEnableAreaSelection(event: globalThis.MouseEvent) {
    let enabled = false;
    if (typeof props.enableAreaSelection == "function")
      enabled = props.enableAreaSelection?.(event);
    return (
      enabled &&
      event.target instanceof Element &&
      isHTMLElement(event.target) &&
      Boolean(event.target.closest(".page"))
    );
  }
  function onMouseOverHighlightLayer(viewportHighlight: ViewportHighlight) {
    const highlightInProgress = !selectionIsCollapsed || ghostHighlight;
    if (highlightInProgress || mouseSelectionInProgress) return;
    if (viewportHighlight.id == highlight?.id) return;
    clearState();
    setTimeout(() => {
      onChangeHighlight(viewportHighlight.position, viewportHighlight);
    }, 16);
  }

  const onSelectionchange = useCallback(() => {
    const pdfViewer = props.pdfViewer;
    if (!pdfViewer) return;
    const container = pdfViewer.container;
    if (!container) return;
    const selection = getWindow(container).getSelection();
    if (!selection) return;
    if (selection.isCollapsed) return setSelectionIsCollapsed(true);
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (
      !range ||
      !container ||
      !container.contains(range.commonAncestorContainer)
    ) {
      return;
    }
    setSelectionIsCollapsed(false);
    const pages = getPagesFromRange(range);
    if (!pages || pages.length === 0) return;
    const rects = getClientRects(range, pages);
    if (rects.length === 0) return;
    const boundingRect = getBoundingRect(rects);
    const viewportPosition: Position = {
      boundingRect,
      rects,
      pageNumber: pages[0].number,
    };
    const position = helpers.viewportPositionToScaled!(viewportPosition);
    const highlight: IHighlight = {
      position: position,
      content: { text: range.toString() },
      type: "text",
    };
    onChangeHighlight(viewportPosition, highlight);
  }, [props.pdfViewer, onChangeHighlight]);

  useEffect(() => forceUpdate(), [highlights]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Escape") clearState();
  };
  const _onSelectionchange = debounce(onSelectionchange, 500) as () => void;

  useEffect(() => {
    const pdfViewer = props.pdfViewer;

    if (pdfViewer) {
      const { ownerDocument } = pdfViewer.container;
      pdfViewer.container.addEventListener("pointerdown", handlePointerDown);
      pdfViewer.eventBus.on("textlayerrendered", forceUpdate);
      ownerDocument.addEventListener("keydown", onKeyDown);
      ownerDocument.addEventListener("selectionchange", _onSelectionchange);
      return () => {
        pdfViewer.eventBus.off("textlayerrendered", forceUpdate);
        pdfViewer.container.removeEventListener(
          "pointerdown",
          handlePointerDown
        );
        ownerDocument.removeEventListener("keydown", onKeyDown);
        ownerDocument.removeEventListener(
          "selectionchange",
          _onSelectionchange
        );
      };
    }
  }, [props.pdfViewer]);

  const scrollTo = (highlight: IHighlight) => {
    const position = highlight.position;
    const pageNumber = position.pageNumber;
    const scrollMargin = 10;
    const viewporPosition = helpers.scaledToViewport(
      pageNumber,
      position.boundingRect,
      position.usePdfCoordinates
    );
    const destArray = helpers.convertToPdfPoint(
      pageNumber,
      0,
      viewporPosition.top - scrollMargin
    );
    helpers.scrollPageIntoView(position.pageNumber, destArray);
    setScrollId(highlight.id!);
  };

  function handlePointerDown(event: MouseEvent) {
    if (!(event.target instanceof Element) || !isHTMLElement(event.target))
      return;
    if (event.target.closest("#PdfHighlighter-positioner")) return;
    clearState();
  }

  const backgroundColor = useCallback(
    (id: string) =>
      id == scrollId ? layerScrolledToBackgroundColor : layerBackgroundColor,
    [scrollId, layerBackgroundColor, layerScrolledToBackgroundColor]
  );

  const highlightContext = useMemo(() => {
    if (!highlight) return null;
    return {
      onShow: () => setGhostHighlight(highlight!),
      onHide: () => clearState(),
      highlight,
    };
  }, [highlight, setGhostHighlight, clearState]);

  useImperativeHandle(ref, () => ({ scrollTo }));
  return (
    <HighlighterProvider value={helpers}>
      <style>{buildStyle(cssSelectionColor || layerBackgroundColor)}</style>
      <HighlightLayers
        highlights={highlights}
        onMouseOver={onMouseOverHighlightLayer}
        backgroundColor={(hid: string) => backgroundColor(hid)}
        renderHighlightLayer={renderHighlightLayer}
      />
      <MouseSelection
        onEnabled={onEnableAreaSelection}
        onChange={setMouseSelectionInProgress}
        onSelection={onMouseSelection}
      />
      <HighlightProvider value={highlightContext}>
        <Positioner position={viewportPosition!} children={props.children} />
      </HighlightProvider>
    </HighlighterProvider>
  );
};

export const Highlighter = forwardRef(Core);

/**
 * Groups highlights by their respective page numbers, including a ghost highlight.
 *
 * This function takes an array of highlights and a ghost highlight, combines them,
 * filters out any falsy values, and then organizes the highlights into groups based
 * on the page number. Each group is an array of highlights that appear on the same page.
 *
 * @param highlights - An array of IHighlight objects representing the highlights to be grouped.
 * @param ghostHighlight - An IHighlight object representing a ghost highlight to be included in grouping.
 * @returns An object where each key is a page number (as a string) and each value is an array of IHighlight objects on that page.
 */
function groupHighlightsByPage(
  highlights: Highlights,
  ghostHighlight: IHighlight
): {
  [pageNumber: string]: Array<IHighlight>;
} {
  const allHighlights = [...highlights, ghostHighlight].filter(
    Boolean
  ) as IHighlight[];
  const pageNumbers = new Set<number>();
  for (const highlight of allHighlights) {
    pageNumbers.add(highlight.position.pageNumber);
    for (const rect of highlight.position.rects) {
      if (rect.pageNumber) {
        pageNumbers.add(rect.pageNumber);
      }
    }
  }
  const groupedHighlights: Record<number, IHighlight[]> = {};
  for (const pageNumber of pageNumbers) {
    groupedHighlights[pageNumber] = groupedHighlights[pageNumber] || [];
    for (const highlight of allHighlights) {
      const pageSpecificHighlight = {
        ...highlight,
        position: {
          pageNumber,
          boundingRect: highlight.position.boundingRect,
          rects: [],
          usePdfCoordinates: highlight.position.usePdfCoordinates,
        } as ScaledPosition,
      };
      let anyRectsOnPage = false;
      for (const rect of highlight.position.rects) {
        if (pageNumber === (rect.pageNumber || highlight.position.pageNumber)) {
          pageSpecificHighlight.position.rects.push(rect);
          anyRectsOnPage = true;
        }
      }
      if (anyRectsOnPage || pageNumber === highlight.position.pageNumber) {
        groupedHighlights[pageNumber].push(pageSpecificHighlight);
      }
    }
  }

  return groupedHighlights;
}

function buildStyle(backgroundColor: string) {
  return `
.pdfViewer.disabled-selection{ pointer-events:none; user-select:none }  
.annotationLayer {  position: absolute;  top: 0;  z-index: 3;}
.textLayer { z-index: 2;  opacity: 1;  mix-blend-mode: multiply;  display: flex;}
.textLayer > div:not(.PdfHighlighter-layer-root):not(.PdfHighlighter-layer) {  opacity: 1; mix-blend-mode: multiply;}
.area-selection-rect  { background-color: ${backgroundColor}; border:1px dashed #333; mix-blend-mode: multiply; position:absolute}
.textLayer ::selection { background-color: ${backgroundColor};}
.textLayer .PdfHighlighter-layer { position:absolute; cursor:pointer ; opacity:1 }
.textLayer .highlight-image-layer {border:1px dashed #333; }
#PdfHighlighter-positioner{position:absolute;z-index:6}
`.trim();
}
