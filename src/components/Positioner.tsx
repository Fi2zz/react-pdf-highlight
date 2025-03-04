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
import { useHighlighter } from "./Context";
function clamp(value: number, left: number, right: number) {
  return Math.min(Math.max(value, left), right);
}

export type PositionerProps = {
  position: Position;
  children: ReactNode;
};
/**
 * Positioner component is responsible for positioning highlighter elements on the PDF viewer.
 * It calculates the position based on the viewport position of the highlighted text and the current scroll position.
 *
 * @param {Object} props - The properties for the Positioner component.
 * @param {Position} props.position - The position of the highlighted text in the viewport.
 * @param {ReactNode} props.children - The children elements to be rendered within the Positioner.
 * @returns {JSX.Element | null} - Returns the positioned div containing the children if viewporPosition exists, otherwise returns null.
 */
export function Positioner({ position, children }: PositionerProps) {
  const helpers = useHighlighter();
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
    if (!position) return undefined;
    const calculating = width === 0 && height === 0;
    const style: Record<string, string | number> = {
      visibility: calculating ? "hidden" : "visible",
    };
    const scrollTop = helpers.pdfViewer?.container.scrollTop!;
    const { boundingRect } = position!;
    const pageNumber = boundingRect.pageNumber || position.pageNumber;
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
  }, [position, height, width, helpers]);

  useEffect(() => {
    setTimeout(updatePosition, 0);
  }, [updatePosition]);
  if (!position) return null;
  return (
    <div
      id="PdfHighlighter-positioner"
      style={style as CSSProperties}
      ref={div}
      children={children}
    />
  );
}
