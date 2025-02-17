import { PropsWithChildren } from "react";

import { Scroll } from "./Scroll";

export function Container({ children }: PropsWithChildren) {
  return (
    <div className="w-[75vw] h-full p-3 bg-amber-50  ">
      <Scroll className="border">{children}</Scroll>
    </div>
  );
}
