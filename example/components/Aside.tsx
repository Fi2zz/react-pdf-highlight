import { Key, PropsWithChildren } from "react";
import type { IHighlight } from "../react-pdf-highlight";

import { Scroll } from "./Scroll";

function Link({ children, href }: PropsWithChildren<{ href: string }>) {
  return (
    <a
      href={href}
      className=" text-red-500 underline text-xs"
      children={children}
    ></a>
  );
}

export default function Aside({ highlights, onClickHighlight }: any) {
  return (
    <div className="w-[25vw] h-full  text-[#333]">
      <div className="p-4">
        <h2 className="mb-1">react-pdf-highlight</h2>
        <div className="flex gap-2">
          <Link href="https://github.com/Fi2zz/react-pdf-highlight">
            Open in GitHub
          </Link>
          <Link href="https://fi2zz.github.io/react-pdf-highlight/">
            Documentation
          </Link>
        </div>
        <div className="text-gray-500 text-sm py-2">
          To create area highlight hold ⌥ Option key (Alt), then click and drag.
        </div>
      </div>
      <Scroll>
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
      </Scroll>
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
