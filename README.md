# react-pdf-highlight

`react-pdf-highlight` is a [React](https://reactjs.org/) library that provides a highly customisable annotation experience for PDF documents on the web, with text and rectangular highlights both supported. It leverages [PDF.js](https://github.com/mozilla/pdf.js) as its viewer. The highlight data format is also independent of the viewport, making it suitable for saving on a server.

This originally started as a fork of [`react-pdf-highlighter`](https://github.com/agentcooper/react-pdf-highlighter) but so much has been refactored and redesigned that it would be a burden to pull it to the original repo.

Some of the changes include: `PdfViewer`, `Highlighter`, `usePdfViewer`, `useHighlight`, and `HighlightLayer` were added;

Some components are removed , inclides `Tip`, `Popup`, `MouseMonitor`

Efforts will be made to try to ensure feature parity with the original repo, but there are no guarantees that syntax and usage will be the same.

Set of React components for PDF annotation.

Features:

- Built on top of PDF.js
- Text and image highlights
- Popover text for highlights
- Scroll to highlights

## Example

```tsx
import { PdfViewer, PdfLoader } from "react-pdf-highlight";
import {
  Highlighter,
  HighlightLayer,
  type Highlights,
  type IHighlight,
  useHighlight,
  useLayer,
} from "react-pdf-highlight";
import "pdfjs-dist/web/pdf_viewer.css";
function App() {
  const highlights: Highlights = [];
  const pdfUrl: string = "/path/to/some.pdf";

  const selectionColor = ({ isScrollTo }) => {
    !isScrollTo ? "#fce897" : "#ff6467";
  };

  const highlighterRef = useRef();
  const scrollTo = (hightlight: any) => {
    highlighterRef.current.scrollTo(hightlight);
  };


  return (
    <PdfLoader url={pdfUrl}>
      <PdfViewer>
        <Highlighter
          ref={highlighterRef}
          highlights={highlights}
          enableAreaSelection={(event) => event.altKey}
          {/* *:selection{ background-color: ${selectionColor}}  */}
          cssSelectionColor={selectionColor}
          layerBackgroundColor={"#fce897"} // default
          layerScrolledToBackgroundColor={"#ff6467"} //default
          {/* renderHighlightLayer={  ()=> <HighlightLayer/>} */}
          renderHighlightLayer={() => <CustomHighlightLayer />}
        >
          <HighlightEditor />
        </Highlighter>
      </PdfViewer>
    </PdfLoader>
  );
}

function CustomHighlightLayer() {
  const { highlight, index, pageNumber, onMouseOver, backgroundColor } =
    useLayer();
  //  your own component codes
    return null
}

function HighlightEditor() {
  const { onShow, onHide, highlight } = useHighlight()!;

  const [comment, setComment] = useState<Comment>(
    highlight?.comment ?? { text: "" }
  );
  const [editing, setEditting] = useState(false);
  const onDelete = () => {};
  const onAdd = () => {
    onShow();
    setEditting(true);
  };

  const onEdit = () => {
    setComment(comment);
    setEditting(true);
  };

  const onUpdate = () => {
    onHide();
    // your logic to create/update highlight
  };

  const onCancel = () => onHide();
  const onChangeText = (event) => setComment({ text: event.target.value });

  if (!editing) {
    // new
    if (!highlight?.id) return <button onClick={onAdd}>Add</button>;
    return (
      <div>
        <blockquote>{comment?.text || "No Comment"}</blockquote>
        <div>
          <button onClick={onEdit}>Edit</button>
          <button onClick={onDelete}>Delete</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <textarea value={comment.text} onChange={onChangeText} />
      <div>
        <button onClick={onSave}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
```

To run the example app locally:

```bash
npm install
npm start
```

## Install

```bash
npm install react-pdf-highlight
```

## How to use

See [`./example/src/App.tsx`](https://github.com/Fi2zz/react-pdf-highlight/blob/main/example/src/App.tsx) for the React component API example.
See [demo](https://Fi2zz.github.io/react-pdf-highlight/demo).
