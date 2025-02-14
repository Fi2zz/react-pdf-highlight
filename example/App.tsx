import { useRef, useState } from "react";
import Aside from "./components/Aside";
import { Progress } from "./components/Spinner";
import HighlightEditor from "./HighlightEditor";
import type { HighlighterRef, Highlights, IHighlight, ViewportHighlight } from "./react-pdf-highlight";
import {
  Highlighter,
  HighlightLayer,
  PdfLoader,
  PdfViewer,
} from "./react-pdf-highlight";
import { testHighlights } from "./test-highlights";
const getNextId = () => String(Math.random()).slice(2);

function injectTypeToHighlight(x: IHighlight) {
    if ("image" in x.content!) {
      x.type = "image";
    } else {
      x.type = "text";
    }
    return x;
  }
  

export function App() {
  const url = "https://arxiv.org/pdf/1708.08021";
  const [highlights, setHighlights] =    useState<Highlights>(testHighlights);
  const highlighter = useRef<HighlighterRef>(null);
  const [enableAreaSelection, setEnableAreaSelection] = useState(false);
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

  const selectionColor = ({ isScrollTo }: { isScrollTo: boolean }) =>
    !isScrollTo ? "#fce897" : "#ff6467";

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
    highlighter.current!.scrollTo(highlight);
  };


  return (
    <div className="flex w-full h-full relative">
      <Aside
        highlights={highlights}
        enableAreaSelection={enableAreaSelection}
        onClickHighlight={scrollToHighlight}
        onToggleAreaSelection={() => setEnableAreaSelection((e) => !e)}
      />
      <div className="w-[75vw] h-full py-2 relative ">
        <div className="w-[640px]  h-full overflow-hidden mx-auto border ">
          <div className="w-full  h-full overflow-scroll relative">
            <PdfLoader url={url} beforeLoaded={<Progress />}>
              <PdfViewer>
                <Highlighter
                  selectionColor={selectionColor}
                  ref={highlighter}
                  enableAreaSelection={(event) =>
                    event.altKey || enableAreaSelection
                  }
                  highlights={highlights.map(injectTypeToHighlight)}
                  renderHighlightLayer={renderHighlightLayer}
                >
                  <HighlightEditor onUpdate={onHighlightEditorUpdate} />
                </Highlighter>
              </PdfViewer>
            </PdfLoader>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderHighlightLayer({ highlight }: { highlight: ViewportHighlight }) {
  return (
    <HighlightLayer
      highlight={highlight}
      type={(highlight as unknown as IHighlight).type}
    />
  );
}
