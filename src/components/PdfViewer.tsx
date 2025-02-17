import type { PDFDocumentProxy } from "pdfjs-dist";
import type {
  PDFViewerOptions,
  PDFViewer as PDFViewerType,
} from "pdfjs-dist/types/web/pdf_viewer";
import { PDFLinkService } from "pdfjs-dist/web/pdf_viewer.mjs";
import {
  cloneElement,
  CSSProperties,
  HTMLAttributes,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { findFirstReactElement } from "./findFirstReactElement";
import { debounce } from "ts-debounce";
import { PdfViewerContext, usePdfViewer } from "./usePdfViewer";
export { usePdfViewer };
/**
 * PdfViewer component is responsible for rendering a PDF document within a React application.
 * It utilizes the `pdfjs-dist` library to handle PDF rendering and provides a customizable viewer.
 *
 * @param {Object} props - Component props.
 * @param {PDFDocumentProxy} [props.pdfDocument] - The PDF document to be displayed.
 * @param {PDFViewerOptions} [props.pdfViewerOptions] - Options for configuring the PDF viewer.
 * @param {string} [props.pdfScaleValue] - The scale value for the PDF viewer.
 * @param {Function} [props.onScroll] - Callback function for handling scroll events.
 * @param {React.ReactNode} [props.children] - Child components to be rendered within the PDF viewer.
 * @returns {JSX.Element} - Rendered PDF viewer component.
 *
 * @example
 * <PdfViewer pdfDocument={pdfDoc} pdfScaleValue="1.5" onScroll={handleScroll} className="custom-pdf-viewer">
 *   <CustomComponent />
 * </PdfViewer>
 */
export function PdfViewer({
  pdfDocument,
  pdfViewerOptions,
  pdfScaleValue,
  onScroll,
  ...props
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
          // pdfViewer.currentScaleValue = pdfScaleValue || "auto";
          linkService.setViewer(pdfViewer);
          linkService.setDocument(pdfDocument);
          pdfViewer.setDocument(pdfDocument!);
          setPdfViewer(pdfViewer);
        }
      );
    }
  }, [pdfViewerOptions, container, pdfScaleValue]);
  useEffect(initialize, [container]);

  const onPdfScaleValue = useCallback(() => {
    pdfViewer!.currentScaleValue = pdfScaleValue! || "auto"; //"page-width";
  }, [pdfScaleValue, pdfViewer]);

  useEffect(() => {
    if (pdfViewer) {
      pdfViewer.eventBus.on("pagesinit", onPdfScaleValue);
      return () => {
        pdfViewer.eventBus.off("pagesinit", onPdfScaleValue);
      };
    }
  }, [pdfViewer, pdfScaleValue, onPdfScaleValue]);

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
  const child = findFirstReactElement(props.children);
  const _class = `pdfViewer-container ${props.className || ""}`;
  const style = useMemo(
    () =>
      Object.assign({}, props.style, {
        position: "absolute",
        width: "100%",
        height: "100%",
        overflow: "auto",
      }) as CSSProperties,
    [props.style]
  );

  return (
    <PdfViewerContext.Provider
      value={{
        pdfDocument: pdfDocument!,
        pdfViewer,
      }}
    >
      <div
        {...props}
        style={style}
        className={_class}
        ref={(el) => setContainer(el!)}
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
