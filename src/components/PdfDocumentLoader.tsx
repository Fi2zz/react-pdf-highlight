import type { OnProgressParameters, PDFDocumentProxy } from "pdfjs-dist";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import React, {
  JSX,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DocumentInitParameters,
  PDFDocumentLoadingTask,
} from "pdfjs-dist/types/src/display/api";
import { findFirstReactElement } from "./findFirstReactElement";
export const PdfDocument = createContext<PDFDocumentProxy | null>(null);
export const usePdfDocument = () => useContext(PdfDocument);

/**
 * PdfLoaderProps defines the properties for the PdfLoader component.
 * This component is responsible for loading PDF documents with various configuration options.
 *
 * @typedef {Object} PdfLoaderProps
 * @property {Partial<DocumentInitParameters>} [documentInitParams] - Partial configuration for the PDF document initialization.
 * @property {string} [workerSrc] - The source URL for the PDF.js worker script.
 * @property {JSX.Element} beforeLoaded - A JSX element to render before the PDF is loaded.
 * @property {JSX.Element} [errorMessage] - A JSX element to render if there is an error loading the PDF.
 * @property {function(Error): void} [onError] - A callback function to handle errors during PDF loading.
 * @property {ReactNode | undefined} children - The content to render inside the PdfLoader component.
 * @property {function(PDFProgressData): void} [onProgress] - A callback function to track the loading progress of the PDF.
 * @property {function(string): void} [onPassword] - A callback function to handle password required events for encrypted PDFs.
 */
type PdfLoaderProps = Partial<DocumentInitParameters> & {
  /** See `GlobalWorkerOptionsType`. */
  workerSrc?: string;
  beforeLoaded: JSX.Element;
  errorMessage?: JSX.Element;
  onError?: (error: Error) => void;
  children: ReactNode | undefined;

  onProgress?: PDFDocumentLoadingTask["onProgress"];
  onPassword?: PDFDocumentLoadingTask["onPassword"];
};

const defaultWorker = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;
/**
 * PdfDocumentLoader is a React component responsible for loading and managing a PDF document.
 * It handles the asynchronous loading process, displays loading progress, and manages errors.
 *
 * Props:
 * - pdfLoaderProps: An object containing properties to configure the PDF loading behavior.
 *   - url: The URL of the PDF file to load.
 *   - data: The binary data of the PDF file to load.
 *   - onProgress: A callback function to be called with the loading progress.
 *   - beforeLoaded: A React element to display before the PDF is fully loaded.
 *   - errorMessage: A React element to display if an error occurs during loading.
 *
 * State:
 * - pdfDocument: The loaded PDF document proxy, or null if not loaded.
 * - error: An error object if loading fails, or null if successful.
 * - progress: An object containing the number of bytes loaded and the total number of bytes.
 *
 * The component uses the `useEffect` hook to handle side effects such as loading the PDF
 * when the component mounts or when the `url` or `data` prop changes. It also cleans up
 * any existing PDF document when the component unmounts or when the props change.
 *
 * The component renders a `PdfDocument.Provider` that wraps its children, providing the
 * loaded PDF document proxy to them via React context.
 */
export function PdfDocumentLoader(props: PdfLoaderProps) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const reset = () => {
    setError(null);
    setPdfDocument(null);
  };

  const [progress, setProgress] = useState<OnProgressParameters>({
    loaded: 0,
    total: 0,
  });

  const destroy = () => pdfDocument?.destroy();
  const onLoading = (
    { loaded, total }: OnProgressParameters,
    pdfDocument?: PDFDocumentProxy
  ) => {
    if (pdfDocument) setPdfDocument(pdfDocument!);
    setProgress({ loaded, total });
  };

  const load = useCallback(() => {
    reset();
    loadingTask(props, onLoading);
  }, [props]);

  useEffect(() => {
    destroy();
    load();
    return () => {
      destroy();
    };
  }, [props.url, props.data]);
  const renderError = useCallback(
    function renderError() {
      const { errorMessage } = props;
      if (errorMessage)
        return React.cloneElement(errorMessage, { error: error });
      return null;
    },
    [props.errorMessage, error]
  );

  const renderBeforeLoaded = useCallback(() => {
    if (!props.beforeLoaded) return `${progress.loaded}/${progress.total}`;
    return React.cloneElement(
      props.beforeLoaded,
      Object.assign({}, props.beforeLoaded.props, { progress })
    );
  }, [progress, props.beforeLoaded]);

  useEffect(() => {
    if (typeof props.onProgress == "function") props.onProgress(progress);
  }, [props.onProgress, progress]);

  const _children = useMemo(() => {
    if (error) return renderError();

    const { loaded, total } = progress;
    if ((loaded == 0 && total == 0) || loaded != total)
      return renderBeforeLoaded();
    const children = findFirstReactElement(props.children);
    if (!children) return null;
    return React.cloneElement(
      children,
      Object.assign({}, children.props, {
        pdfDocument,
      })
    );
  }, [pdfDocument, progress, props.children, error, renderBeforeLoaded]);
  return (
    <PdfDocument.Provider value={pdfDocument}>{_children}</PdfDocument.Provider>
  );
}

function loadingTask(
  props: Partial<PdfLoaderProps>,

  onLoading: (p: OnProgressParameters, pdfDocument?: PDFDocumentProxy) => void
) {
  if (!props.url && !props.data) return;

  GlobalWorkerOptions.workerSrc = props.workerSrc || defaultWorker;
  Promise.resolve().then(() => {
    if (!props.url) return;
    const task = getDocument(props);
    // loadingTaskRef.current.onPassword = props.onPassword || Noop;
    task.onProgress = async ({ loaded, total }: OnProgressParameters) => {
      if (total == 0 && loaded == 0) return;
      if (loaded == total) {
        const pdfDocument = await task?.promise!;
        return onLoading({ loaded, total }, pdfDocument);
      }
      onLoading({ loaded, total });
    };
  });
}
