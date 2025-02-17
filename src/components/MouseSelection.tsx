import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isHTMLElement } from "../lib/pdfjs-dom.js";
import type { LTWH } from "../types.js";
import { useHighlighter } from "./Context.js";
interface Coords {
  x: number;
  y: number;
}

export interface MouseSelectionProps {
  onSelection: (startTarget: HTMLElement, boundingRect: LTWH) => void;
  onEnabled: (event: MouseEvent) => boolean;
  onChange: (isVisible: boolean) => void;
}
function getBoundingRect(start: Coords, end: Coords): LTWH {
  return {
    left: Math.min(end.x, start.x),
    top: Math.min(end.y, start.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

const shouldRender = (boundingRect: LTWH) =>
  boundingRect.width >= 1 && boundingRect.height >= 1;

/**
 * MouseSelection component handles the selection of text within a PDF viewer.
 * It provides callbacks for when a selection is made, when selection is enabled,
 * and when the visibility of the selection changes.
 *
 * @param {MouseSelectionProps} props - The properties for the MouseSelection component.
 * @param {function} props.onSelection - Callback fired when a selection is made.
 * @param {function} props.onEnabled - Callback to determine if selection should be enabled.
 * @param {function} props.onChange - Callback fired when the visibility of the selection changes.
 * @returns {JSX.Element} The MouseSelection component JSX.
 */
export function MouseSelection({
  onSelection,
  onEnabled,
  onChange,
}: MouseSelectionProps) {
  const [locked, setLocked] = useState(false);
  const [startCoords, setStartCoords] = useState<Coords | null>(null);
  const [endCoords, setEndCoords] = useState<Coords | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef(startCoords);
  const lockedRef = useRef(locked);
  const { pdfViewer } = useHighlighter();
  function toggleTextSelection(flag: boolean) {
    if (!pdfViewer) return;
    const viewer = pdfViewer.viewer! as HTMLDivElement;
    viewer.classList.toggle("disabled-selection", flag);
  }
  useEffect(() => {
    startRef.current = startCoords;
  }, [startCoords]);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  const onDragEnd = () => toggleTextSelection(false);
  const onDragStart = () => toggleTextSelection(true);
  const reset = useCallback(() => {
    onDragEnd();
    setStartCoords(null);
    setEndCoords(null);
    setLocked(false);
  }, [onDragEnd]);

  useEffect(() => {
    const isVisible = Boolean(startCoords && endCoords);
    onChange(isVisible);
  }, [startCoords, endCoords, onChange]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const container = root.parentElement;
    if (!container || !isHTMLElement(container)) {
      return;
    }

    const containerCoords = (pageX: number, pageY: number) => {
      const containerBoundingRect = container.getBoundingClientRect();
      return {
        x: pageX - containerBoundingRect.left + container.scrollLeft,
        y:
          pageY -
          containerBoundingRect.top +
          container.scrollTop -
          window.scrollY,
      };
    };

    const mouseMoveHandler = (event: MouseEvent) => {
      if (!startRef.current || lockedRef.current) {
        return;
      }
      setEndCoords(containerCoords(event.pageX, event.pageY));
    };

    const mouseDownHandler = (event: MouseEvent) => {
      reset();
      if (!onEnabled(event)) return;

      const startTarget = event.target as HTMLElement;
      if (!(startTarget instanceof Element) || !isHTMLElement(startTarget)) {
        return;
      }
      onDragStart();
      setStartCoords(containerCoords(event.pageX, event.pageY));
      setEndCoords(null);
      setLocked(false);

      const mouseUpHandler = (event: Event) => {
        event.currentTarget?.removeEventListener("mouseup", mouseUpHandler);
        const currentStart = startRef.current;
        if (!currentStart) {
          return;
        }
        if (!(event instanceof MouseEvent)) {
          return;
        }

        const endCoords = containerCoords(event.pageX, event.pageY);
        const boundingRect = getBoundingRect(currentStart, endCoords);
        if (
          !(event.target instanceof Element) ||
          !isHTMLElement(event.target) ||
          !container.contains(event.target) ||
          !shouldRender(boundingRect)
        ) {
          reset();
          return;
        }

        setEndCoords(endCoords);
        setLocked(true);

        onSelection(startTarget, boundingRect);
        onDragEnd();
      };

      const doc = container.ownerDocument;
      if (doc?.body) {
        doc.body.addEventListener("mouseup", mouseUpHandler);
      }
    };

    container.addEventListener("mousemove", mouseMoveHandler);
    container.addEventListener("mousedown", mouseDownHandler);
    return () => {
      container.removeEventListener("mousemove", mouseMoveHandler);
      container.removeEventListener("mousedown", mouseDownHandler);
    };
  }, [onEnabled, onDragStart, onDragEnd, onSelection, reset]);

  const computeStyle = useMemo(() => {
    if (!startCoords || !endCoords) return { display: "none" };
    return getBoundingRect(startCoords, endCoords);
  }, [startCoords, endCoords]);

  return (
    <div ref={rootRef} className="area-selection-container">
      {startCoords && endCoords && (
        <div style={computeStyle} className="area-selection-rect" />
      )}
    </div>
  );
}
