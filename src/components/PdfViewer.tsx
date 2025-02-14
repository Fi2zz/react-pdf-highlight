import type { PDFDocumentProxy } from "pdfjs-dist";
import type {
  PDFViewerOptions,
  PDFViewer as PDFViewerType,
} from "pdfjs-dist/types/web/pdf_viewer";
import { PDFLinkService } from "pdfjs-dist/web/pdf_viewer.mjs";
import {
  cloneElement,
  HTMLAttributes,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from "react";

import { findFirstReactElement } from "./findFirstReactElement";

import { debounce } from "ts-debounce";
import { PdfViewerContext, usePdfViewer } from "./usePdfViewer";
export { usePdfViewer };
/**
 * PdfViewer component is responsible for rendering a PDF document within a React application.
 * It utilizes the `pdfjs-dist` library to handle PDF rendering and provides various options
 * for customization such as scaling, event handling, and context menu management.
 *
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child components to render within the PdfViewer.
 * @param {PDFViewerOptions} [props.pdfViewerOptions] - Options to configure the PDF viewer.
 * @param {string} [props.pdfScaleValue] - The scale value for the PDF viewer.
 * @param {Function} [props.onScroll] - Callback function for scroll events.
 * @param {Function} [props.onContextMenu] - Callback function for context menu events.
 * @param {Function} [props.onPointerDown] - Callback function for pointer down events.
 * @param {PDFDocumentProxy} props.pdfDocument - The PDF document to render.
 * @param {string} [props.className] - Optional CSS class name for styling.
 * @returns {JSX.Element} - Rendered PdfViewer component.
 */
export function PdfViewer({
  children,
  pdfViewerOptions,
  pdfScaleValue,
  onScroll,
  onContextMenu,
  onPointerDown,
  pdfDocument,
  className,
}: PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    pdfViewerOptions?: PDFViewerOptions;
    pdfScaleValue?: string;
    pdfDocument?: PDFDocumentProxy;
  }
>) {
  const [container, setContainer] = useState<HTMLDivElement | null>();
  const [pdfViewer, setPdfViewer] = useState<PDFViewerType | null>(null);
  const initialize = useCallback(() => {
    if (container) {
      import("pdfjs-dist/web/pdf_viewer.mjs").then(
        ({ EventBus, PDFLinkService, PDFViewer }) => {
          const viewerOptions: Partial<PDFViewerOptions> =
            pdfViewerOptions || {};

          const eventBus = viewerOptions.eventBus || new EventBus();
          const linkService = (pdfViewerOptions?.linkService ||
            new PDFLinkService({
              eventBus,
              externalLinkTarget: 2,
            })) as PDFLinkService;

          viewerOptions.container = viewerOptions.container || container;
          viewerOptions.eventBus = eventBus;
          viewerOptions.linkService = linkService as PDFLinkService;
          viewerOptions.textLayerMode = 2;
          viewerOptions.removePageBorders = true;
          const pdfViewer = new PDFViewer(viewerOptions as PDFViewerOptions);
          pdfViewer.currentScaleValue = pdfScaleValue || "auto";
          linkService.setViewer(pdfViewer);
          linkService.setDocument(pdfDocument);
          pdfViewer.setDocument(pdfDocument!);
          setPdfViewer(pdfViewer);
        }
      );
    }
  }, [pdfViewerOptions, container, pdfScaleValue]);
  useEffect(initialize, [container]);
  useEffect(() => {
    if (pdfViewer && pdfScaleValue) {
      const onPdfScaleValue = () =>
        (pdfViewer!.currentScaleValue = pdfScaleValue! || "auto");
      pdfViewer.eventBus.on("pagesinit", onPdfScaleValue);
      return () => {
        pdfViewer.eventBus.off("pagesinit", onPdfScaleValue);
      };
    }
  }, [pdfViewer, pdfScaleValue]);

  const onPdfScaleValue = useCallback(() => {
    pdfViewer!.currentScaleValue = pdfScaleValue! || "auto"; //"page-width";
  }, [pdfScaleValue, pdfViewer]);

  const onResize = debounce(() => onPdfScaleValue(), 500) as () => void;
  useEffect(() => {
    if (pdfViewer) {
      const handleScroll = (event: Event) => onScroll?.(event as any);
      const container = pdfViewer.container;
      container.addEventListener("scroll", handleScroll);
      container.ownerDocument.defaultView?.addEventListener("resize", onResize);
      return () => {
        container.removeEventListener("scroll", handleScroll);
        container.ownerDocument.defaultView?.removeEventListener(
          "resize",
          onResize
        );
      };
    }
    return () => {};
  }, [pdfViewer, onScroll, onResize]);

  const child = findFirstReactElement(children);
  const _class = `pdfViewer-container ${
    typeof className == "string" ? className : ""
  }`;

  return (
    <PdfViewerContext.Provider
      value={{
        pdfDocument: pdfDocument!,
        pdfViewer,
      }}
    >
      <style>{css()}</style>
      <div
        className={_class}
        ref={(el) => setContainer(el!)}
        onPointerDown={onPointerDown}
        onContextMenu={onContextMenu}
      >
        <div className="pdfViewer" />
        {cloneElement(
          child as unknown as JSX.Element,
          Object.assign({}, child?.props || {}, { pdfViewer, pdfDocument })
        )}
      </div>
    </PdfViewerContext.Provider>
  );
}

function css() {
  return `
  .pdfViewer.disabled-selection{ pointer-events:none; user-select:none }  
  .pdfViewer-container{position:absolute; width:100%;height:100%;overflow:auto}
 `.trim();
}
