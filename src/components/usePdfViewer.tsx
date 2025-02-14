import { PDFDocumentProxy } from "pdfjs-dist";
import type { PDFViewer } from "pdfjs-dist/web/pdf_viewer.d.mts";
import { useContext } from "react";

import { createContext } from "react";
type TypePdfViewerContext = {
  pdfDocument: PDFDocumentProxy | null;
  pdfViewer: PDFViewer | null;
};

export const PdfViewerContext = createContext<TypePdfViewerContext>({
  pdfViewer: null,
  pdfDocument: null,
});
export const usePdfViewer = () => useContext(PdfViewerContext);
