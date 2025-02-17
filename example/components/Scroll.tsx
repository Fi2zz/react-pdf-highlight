import { PropsWithChildren } from "react";

export function Scroll({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={"w-full h-full overflow-hidden relative " + className}>
      <div className="w-full h-full  overflow-y-auto  relative">{children}</div>
    </div>
  );
}
