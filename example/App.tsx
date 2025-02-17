import { useRef, useState } from "react";
import Aside from "./components/Aside";
import { Progress } from "./components/Spinner";
import HighlightEditor from "./HighlightEditor";
import type {
  HighlighterRef,
  Highlights,
  IHighlight,
} from "./react-pdf-highlight";
import {
  Highlighter,
  HighlightLayer,
  PdfDocumentLoader,
  PdfViewer,
  useLayer,
} from "./react-pdf-highlight";

import { Container } from "./components/Container";
import { testHighlights } from "./test-highlights";
const getNextId = () => String(Math.random()).slice(2);

export function App() {
  const url = "https://arxiv.org/pdf/1708.08021";
  const [highlights, setHighlights] = useState<Highlights>(testHighlights);
  const highlighter = useRef<HighlighterRef>(null);
  const addHighlight = (highlight: IHighlight) => {
    console.log("Saving highlight", highlight);
    setHighlights((prevHighlights) => [
      { ...highlight, id: getNextId() },
      ...prevHighlights,
    ]);
  };

  function updateHighlight(
    highlightId: string,
    comment: IHighlight["comment"]
  ) {
    setHighlights((prevHighlights) =>
      prevHighlights.map((highlight) => {
        if (highlight.id !== highlightId) return highlight;
        return {
          ...highlight,
          comment,
        };
      })
    );
  }

  const onHighlightEditorUpdate = (
    highlight: IHighlight,
    comment: IHighlight["comment"]
  ) => {
    if (!highlight.id) {
      return addHighlight({
        position: highlight.position!,
        content: highlight.content!,
        comment,
      });
    }
    updateHighlight(highlight.id!, comment);
  };

  const scrollToHighlight = (highlight: IHighlight) => {
    highlighter.current!.scrollTo?.(highlight);
  };

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-amber-50 ">
      <Aside highlights={highlights} onClickHighlight={scrollToHighlight} />
      <Container>
        <PdfDocumentLoader url={url} beforeLoaded={<Progress />}>
          <PdfViewer pdfScaleValue="page-width">
            <Highlighter
              cssSelectionColor={"#fce897"}
              layerBackgroundColor={"#fce897"}
              layerScrolledToBackgroundColor={"#ff6467"}
              ref={highlighter}
              enableAreaSelection={(event) => event.altKey}
              highlights={highlights}
              renderHighlightLayer={() => <HighlightLayer></HighlightLayer>}
            >
              <HighlightEditor onUpdate={onHighlightEditorUpdate} />
            </Highlighter>
          </PdfViewer>
        </PdfDocumentLoader>
      </Container>
    </div>
  );
}
