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
  highlights: Highlights;
  enableAreaSelection?: boolean | ((event: globalThis.MouseEvent) => boolean);
  renderHighlightLayer: (props: {
    highlight: ViewportHighlight;
    pageNumber: number;
    index: number;
  }) => JSX.Element;
  onSelection?: ({ position, content }: IHighlight) => JSX.Element | null;
  selectionColor?:
    | string
    | (({ isScrollTo }: { isScrollTo: boolean }) => string);

  pdfViewer?: PDFViewer;
  pdfDocument?: PDFDocumentProxy;
}>;

export type HighlighterRef = {
  scrollTo: (highlight: IHighlight) => void;
};

const InternalHighlights: ForwardRefRenderFunction<
  HighlighterRef,
  HighlighterProps
> = (props, ref) => {
  const helpers = createHighlighterContextValue(props);
  const [viewportPosition, setViewportPosition] = useState<Position>();
  const [highlight, setHighlight] = useState<IHighlight>();
  const [ghostHighlight, setGhostHighlight] = useState<IHighlight>();
  const [selectionIsCollapsed, setSelectionIsCollapsed] = useState(true);
  const [scrollId, setScrollId] = useState(EMPTY_SCROLL_ID);
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
    // props.onSelection?.(highlight as unknown as IHighlight);
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
    const enableAreaSelection = props.enableAreaSelection;
    if (typeof enableAreaSelection === "boolean")
      enabled = enableAreaSelection as boolean;
    else if (typeof enableAreaSelection == "function")
      enabled = enableAreaSelection(event);
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

  const getSelectionColor = useCallback(
    (viewportHighlight?: ViewportHighlight) => {
      const isScrollTo = viewportHighlight?.id == scrollId;
      const { selectionColor } = props;
      if (typeof selectionColor == "function")
        return selectionColor({ isScrollTo });
      if (isScrollTo) return "#ff6467";
      return (selectionColor || "#fce897") as string;
    },
    [scrollId]
  );

  helpers.getSelectionColor = getSelectionColor;

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

  useImperativeHandle(ref, () => {
    return {
      scrollTo,
    };
  });

  const highlightValue = {
    onShow: () => setGhostHighlight(highlight!),
    onHide: () => clearState(),
    highlight: highlight!,
  };

  return (
    <HighlighterProvider value={helpers}>
      <style>{buildStyle(getSelectionColor())}</style>
      <HighlightLayers
        highlights={highlights}
        onMouseOver={onMouseOverHighlightLayer}
      />
      <MouseSelection
        onEnabled={onEnableAreaSelection}
        onChange={setMouseSelectionInProgress}
        onSelection={onMouseSelection}
      />
      {highlight && (
        <HighlightProvider value={highlightValue}>
          <Positioner
            viewporPosition={viewportPosition!}
            children={props.children}
            helpers={helpers}
          />
        </HighlightProvider>
      )}
    </HighlighterProvider>
  );
};

export const Highlighter = forwardRef(InternalHighlights);

function groupHighlightsByPage(
  highlights: Array<IHighlight>,
  ghost: IHighlight
): {
  [pageNumber: string]: Array<IHighlight>;
} {
  const allHighlights = [...highlights, ghost].filter(Boolean) as IHighlight[];
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

function buildStyle(selectionColor: string) {
  return `
.annotationLayer {  position: absolute;  top: 0;  z-index: 3;}
.textLayer { z-index: 2;  opacity: 1;  mix-blend-mode: multiply;  display: flex;}
.textLayer > div:not(.PdfHighlighter-layer-root):not(.PdfHighlighter-layer) {  opacity: 1; mix-blend-mode: multiply;}
.textLayer ::selection { background: ${selectionColor};}
.textLayer .PdfHighlighter-layer { position:absolute; cursor:pointer ; opacity:1 }
#PdfHighlighter-positioner{position:absolute;z-index:6}
`.trim();
}
