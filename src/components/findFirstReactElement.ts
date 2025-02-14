import { isValidElement, PropsWithChildren } from "react";

export function findFirstReactElement(children: PropsWithChildren["children"]) {
  if (!children) throw `None children found`;
  if (typeof children != "object")
    throw "Children must be valid `ReactElement`";
  if (Array.isArray(children)) {
    const result = children.find((x) => isValidElement(x));
    if (!result) throw "None valid `ReactElement` found";
    return result as JSX.Element;
  }
  return children as JSX.Element;
}
