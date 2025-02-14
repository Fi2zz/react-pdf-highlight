import { Key } from "react";
import type { IHighlight } from "../react-pdf-highlight";
import Switch from "./Switch";
export default function Aside({
  highlights,
  enableAreaSelection,
  onToggleAreaSelection,
  onClickHighlight,
}: any) {
  return (
    <div className="w-[25vw] bg-stone-300 text-[#333]">
      <div className="p-4">
        <h2 className="mb-1">react-pdf-highlighter</h2>
        <p className="text-xs">
          <a href="https://github.com/Fi2zz/react-pdf-highlight">
            Open in GitHub
          </a>
        </p>

        <span className="flex items-center gap-2 py-2">
          <Switch
            checked={enableAreaSelection}
            onChange={onToggleAreaSelection}
          />
          Enable Area Selection
        </span>
      </div>
      <ul>
        {highlights.map(
          (highlight: IHighlight, index: Key | null | undefined) => (
            <li
              key={index}
              className="p-4 cursor-pointer border-b border-b-stone-400 hover:bg-[#3a383414]"
              onClick={() => onClickHighlight(highlight)}
            >
              <div>
                <strong>{highlight.comment!.text}</strong>
                <AsideHighlight content={highlight.content}></AsideHighlight>
              </div>
              <div className="highlight__location">
                Page {highlight.position.pageNumber}
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  );
}

function AsideHighlight({ content }: any) {
  if (!content) return null;

  if (content.text) {
    return (
      <blockquote style={{ marginTop: "0.5rem" }}>
        {`${content.text.slice(0, 90).trim()}…`}
      </blockquote>
    );
  }
  if (content.image) {
    return (
      <div className="max-width-[300px] border  border-color-stone-500  overflow-auto">
        <img className="block " src={content.image} alt={"Screenshot"} />
      </div>
    );
  }

  return null;
}
