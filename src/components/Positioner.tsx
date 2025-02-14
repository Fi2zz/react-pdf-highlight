import {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Position } from "../types";
function clamp(value: number, left: number, right: number) {
  return Math.min(Math.max(value, left), right);
}
/**
 * Positioner component is responsible for positioning highlighter elements on the PDF viewer.
 * It calculates the position based on the viewport position of the highlighted text and the current scroll position.
 *
 * @param {Object} props - The properties for the Positioner component.
 * @param {Position} props.viewporPosition - The position of the highlighted text in the viewport.
 * @param {ReactNode} props.children - The children elements to be rendered within the Positioner.
 * @returns {JSX.Element | null} - Returns the positioned div containing the children if viewporPosition exists, otherwise returns null.
 */
export function Positioner({
  viewporPosition,
  children,
  helpers,
}: {
  viewporPosition: Position;
  children: ReactNode;
  helpers: any;
}) {
  const [height, setHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const div = useRef<HTMLDivElement | null>(null);
  const updatePosition = useCallback(() => {
    if (!div.current) return;
    const { offsetHeight, offsetWidth } = div.current;
    setHeight(offsetHeight);
    setWidth(offsetWidth);
  }, []);

  const style = useMemo(() => {
    if (!viewporPosition) return undefined;
    const calculating = width === 0 && height === 0;
    const style: Record<string, string | number> = {
      visibility: calculating ? "hidden" : "visible",
    };
    const scrollTop = helpers.pdfViewer?.container.scrollTop!;
    const { boundingRect } = viewporPosition!;
    const pageNumber = boundingRect.pageNumber || viewporPosition.pageNumber;
    const node = helpers.getPageView(pageNumber - 1)!.div;
    const pageBoundingRect = node.getBoundingClientRect();
    const partial = {
      left: node.offsetLeft + boundingRect.left + boundingRect.width / 2,
      top: boundingRect.top + node.offsetTop,
      bottom: boundingRect.top + node.offsetTop + boundingRect.height,
    };
    const shouldMove = partial.top - height - 5 < scrollTop;
    style.top = shouldMove ? partial.bottom + 5 : partial.top - height - 5;
    style.left = clamp(
      partial.left - width / 2,
      0,
      pageBoundingRect.width - width
    );
    return style;
  }, [viewporPosition, height, width, helpers]);

  useEffect(() => {
    setTimeout(updatePosition, 0);
  }, [updatePosition]);
  if (!viewporPosition) return null;
  return (
    <div
      id="PdfHighlighter-positioner"
      style={style as CSSProperties}
      ref={div}
      children={children}
    />
  );
}
