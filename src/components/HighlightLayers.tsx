import {
  createContext,
  HTMLAttributes,
  ReactNode,
  useCallback,
  useContext,
} from "react";
import { createPortal } from "react-dom";
import { findOrCreateContainerLayer } from "../lib/pdfjs-dom";
import type { HighlightType, LTWHP } from "../types";
import { type ViewportHighlight } from "../types";
import {
  useHighlighter,
  useHighlighterProps,
  useSelectionColor,
} from "./Context";
export type HighlightLayersProps = {
  highlights: { [pageNumber: string]: any[] };
  onMouseOver: (highlight: ViewportHighlight) => void;
};

/**
 * Renders the highlight layers on top of each PDF page.
 *
 * @param {HighlightLayersProps} props - The properties for the HighlightLayers component.
 * @param {Highlight[]} highlights - An object where keys are page numbers and values are arrays of highlight objects for that page.
 * @param {function} onMouseOver - A callback function that is called when the mouse hovers over a highlight.
 * @returns {JSX.Element | null} - Returns the rendered highlight layers or null if there are no highlights or the PDF viewer is not available.
 */

export function HighlightLayers({
  highlights,
  onMouseOver,
}: HighlightLayersProps) {
  const helpers = useHighlighter();
  const props = useHighlighterProps();
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
      return (
        <LayerProvider
          onMouseOver={() => onMouseOver(highlight)}
          key={index}
          highlight={highlight}
          children={
            props.renderHighlightLayer!({ highlight, index, pageNumber })!
          }
        />
      );
    });
    return createPortal(layers, container);
  });
}

type HighlightLayerProps = {
  onMouseOut?: HTMLAttributes<HTMLDivElement>["onMouseOut"];
  onMouseOver?: HTMLAttributes<HTMLDivElement>["onMouseOver"];
  onClick?: HTMLAttributes<HTMLDivElement>["onClick"];
  className?: HTMLAttributes<HTMLDivElement>["className"];
  style?: HTMLAttributes<HTMLDivElement>["style"];
  highlight?: ViewportHighlight;
  type?: HighlightType;
  onChange?: (rect: LTWHP) => void;
  children?: ReactNode;
};
const LayerContext = createContext<HighlightLayerProps | null>(null);
/**
 * LayerProvider is a React component that wraps its children in a context provider for managing highlight layers.
 * It accepts any additional props and passes them down to the context provider, making them available to all
 * descendants that consume the LayerContext.
 *
 * @param {HighlightLayerProps & { children: JSX.Element }} props - The properties for the LayerProvider.
 * @param {JSX.Element} props.children - The children components to be wrapped in the context provider.
 * @returns {JSX.Element} The LayerProvider component with the context provider.
 */
export function LayerProvider({
  children,
  ...props
}: HighlightLayerProps & { children: ReactNode }) {
  return <LayerContext.Provider value={props} children={children} />;
}

/**
 * Layer component is responsible for rendering a highlight layer on top of a PDF page.
 * It uses the context provided by LayerContext to determine the highlight color and
 * forwards mouse events to both the context and the parent component for additional
 * event handling.
 *
 * @param {HighlightLayerProps} props - The properties for the Layer component.
 * @param {function} props.onMouseOver - Optional handler for mouse over events.
 * @param {function} props.onMouseOut - Optional handler for mouse out events.
 * @param {function} props.onClick - Optional handler for click events.
 * @param {React.ReactNode} props.children - The content to be rendered inside the layer.
 * @param {string} props.className - Optional CSS class name for styling.
 * @param {object} props.style - Optional inline styles for the layer.
 * @returns {JSX.Element} The rendered Layer component.
 */
function Layer(props: HighlightLayerProps) {
  const getSelectionColor = useSelectionColor();
  const context = useContext(LayerContext)!;
  const onMouseOver = (event: React.MouseEvent<HTMLDivElement>) => {
    context.onMouseOver?.(event);
    props.onMouseOver?.(event);
  };
  return (
    <div
      onMouseOver={onMouseOver}
      className={props.className}
      style={{
        backgroundColor: getSelectionColor(context.highlight),
        ...(props.style || {}),
      }}
      onMouseOut={props.onMouseOut}
      onClick={props.onClick}
      children={props.children}
    />
  );
}

/**
 * Renders text highlight layers based on the current highlight context.
 *
 * This function uses the `LayerContext` to access the current highlight data
 * and maps over the highlight positions to render a `Layer` component for each
 * highlighted rectangle.
 *
 * @param props - The properties to pass to each Layer component.
 * @returns A list of Layer components representing the text highlights.
 */

export function TextHighlight({
  ...props
}: Omit<HighlightLayerProps, "children">) {
  const { highlight } = useContext(LayerContext)!;
  const { rects } = highlight!.position;
  return rects.map((rect, index) => (
    <Layer
      {...props}
      type="text"
      className="highlight-text-layer PdfHighlighter-layer"
      key={index}
      style={rect}
    />
  ));
}

/**
 * Renders an image highlight layer based on the current highlight context.
 *
 * This component uses the `LayerContext` to obtain the current highlight information
 * and renders a `Layer` component with the appropriate styling and children.
 *
 * @param {HighlightLayerProps} props - The properties for the ImageHighlight component.
 * @param {React.ReactNode} props.children - The children elements to be rendered within the layer.
 * @returns {JSX.Element} The rendered image highlight layer.
 */
export function ImageHighlight({ children }: HighlightLayerProps) {
  const { highlight } = useContext(LayerContext)!;
  return (
    <Layer
      style={highlight!.position.boundingRect}
      className="highlight-image-layer PdfHighlighter-layer"
      children={children}
    />
  );
}

/**
 * Renders a highlight layer based on the specified type.
 *
 * @param {HighlightLayerProps} props - The properties for the highlight layer.
 * @param {string} props.type - The type of highlight layer to render ("text" or "image").
 * @returns {JSX.Element|null} The corresponding highlight component or null if no valid type is provided.
 *
 * @example
 * // Renders a text highlight layer
 * <HighlightLayer type="text" />
 *
 * // Renders an image highlight layer
 * <HighlightLayer type="image" />
 */
export function HighlightLayer({ type, ...props }: HighlightLayerProps) {
  if (props.children) return props.children;
  if (type == "text") return <TextHighlight {...props} />;
  if (type == "image") return <ImageHighlight {...props} />;
  return null;
}
