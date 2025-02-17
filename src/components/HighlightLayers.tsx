import { ReactNode, useCallback } from "react";
import { createPortal } from "react-dom";
import { findOrCreateContainerLayer } from "../lib/pdfjs-dom";
import type { ViewportHighlight, IHighlight } from "../types";
import { useHighlighter, LayerProvider } from "./Context";
export type HighlightLayers = {
  highlights: { [pageNumber: string]: any[] };
  onMouseOver: (highlight: ViewportHighlight) => void;
  backgroundColor: (id: string) => string;
  renderHighlightLayer: () => ReactNode;
};

import { HighlightLayer } from "./HighlightLayer";

function defaultRenderHighlightLayer() {
  return <HighlightLayer />;
}

/**
 * Renders highlight layers for PDF pages based on the provided highlights data.
 *
 * @param {HighlightLayers} props - The properties for rendering the layers.
 * @param {Object} props.highlights - An object containing highlight data keyed by page number.
 * @param {Function} props.onMouseOver - A callback function to handle mouse over events on highlights.
 * @returns {JSX.Element | null} - Returns a JSX element containing the rendered highlight layers or null if no viewer is available.
 */
export function HighlightLayers({
  highlights,
  onMouseOver,
  backgroundColor,
  renderHighlightLayer,
}: HighlightLayers) {
  const helpers = useHighlighter();
  const findPortalContainer = useCallback(
    (page: number) => {
      const pageView = helpers.getPageView(page - 1);
      if (!pageView || !pageView.textLayer) return null;
      return findOrCreateContainerLayer(
        pageView.textLayer.div,
        "PdfHighlighter-layer-root"
      );
    },
    [helpers.pdfViewer]
  );

  if (!helpers.pdfViewer) return null;

  return Array.from(
    { length: helpers.pdfDocument?.numPages || 0 },
    (_, index) => index
  ).map((index) => {
    const pageNumber = index + 1;
    const container = findPortalContainer(pageNumber);
    if (!container) return null;
    const current = highlights[String(pageNumber)] || [];
    if (!current.length) return null;
    const layers = current.map((current, index) => {
      const position = helpers.scaledPositionToViewport!(current.position);
      const highlight: ViewportHighlight = { ...current, position };
      const children =
        typeof renderHighlightLayer === "function"
          ? renderHighlightLayer()
          : defaultRenderHighlightLayer();

      return (
        <LayerProvider
          value={{
            onMouseOver: () => onMouseOver(highlight),
            highlight: castToIHighlight(highlight),
            backgroundColor: backgroundColor(current.id),
            index,
            pageNumber,
          }}
          key={index}
          children={children}
        />
      );
    });
    return createPortal(layers, container);
  });
}

function castToIHighlight(highlight: ViewportHighlight) {
  const iHighlight = highlight as unknown as IHighlight;

  if (!highlight.content) return iHighlight;
  if ("image" in highlight.content) {
    iHighlight.type = "image";
  } else if ("text" in highlight.content) {
    iHighlight.type = "text";
  }

  return iHighlight;
}
