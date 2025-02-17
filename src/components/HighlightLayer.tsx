import { HTMLAttributes, useMemo } from "react";
import type { HighlightType, IHighlight } from "../types";
import { useLayer } from "./Context";
export type RectProps = HTMLAttributes<HTMLDivElement>;

/**
 * Rect component is used to render a rectangular highlight layer within the PDF viewer.
 * It accepts various props to customize its appearance and behavior.
 *
 * @param {RectProps} props - The properties for the Rect component.
 * @returns {JSX.Element} The rendered Rect component.
 */
export function Rect({ type, ...props }: RectProps & { type: HighlightType }) {
  const context = useLayer()!;
  const onMouseOver = (event: React.MouseEvent<HTMLDivElement>) => {
    context.onMouseOver?.(event);
    props.onMouseOver?.(event);
  };
  const style = useMemo(() => {
    return Object.assign(
      { backgroundColor: context.backgroundColor },
      props.style
    );
  }, [props.style, context]);

  let className = `highlight-${type}-layer PdfHighlighter-layer `;
  if (props.className) className += ` ${props.className}`;

  return (
    <div
      {...props}
      className={className}
      onMouseOver={onMouseOver}
      style={style}
    />
  );
}

export function TextLayer(props: RectProps) {
  const { highlight } = useLayer()!;
  const { rects } = highlight!.position;
  return rects.map((rect, index) => (
    <Rect
      {...props}
      type="text"
      key={`text-highlight-${index}`}
      style={rect} // Position data for individual text fragment
    />
  ));
}

export function ImageLayer(props: RectProps) {
  const { highlight } = useLayer()!; // Get current highlight context
  const { boundingRect } = highlight!.position; // Extract image boundary coordinates

  return (
    <Rect
      {...props}
      type="image"
      style={boundingRect} // Complete image boundary data
    />
  );
}

/**
 * Renders a layer based on the type of highlight.
 *
 * @param {RectProps} props - The properties for the layer.
 * @returns {JSX.Element|null} The rendered layer component or null if no children are provided.
 */

export function HighlightLayer(props: RectProps) {
  const { highlight } = useLayer()!;
  switch ((highlight as unknown as IHighlight).type) {
    case "text":
      return <TextLayer {...props} />;
    case "image":
      return <ImageLayer {...props} />;

    default:
      return props.children || null;
  }
}
