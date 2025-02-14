import { HtmlHTMLAttributes, PropsWithChildren, useState } from "react";
import { useHighlight, type IHighlight } from "./react-pdf-highlight";
import { Comment } from "./react-pdf-highlight";
export type UpdatableComment = { text: string };
export default function HighlightEditor(props: {
  onUpdate: (highlight: IHighlight, comment: Comment) => void;
  onDelete?: (highlight: IHighlight) => void;
}) {
  const { onShow, onHide, highlight } = useHighlight()!;
  const [comment, setComment] = useState<Comment>(
    highlight?.comment ?? { text: "" }
  );
  const [editing, setEditting] = useState(false);

  const onAdd = () => {
    onShow();
    setEditting(true);
  };
  const onEdit = () => {
    setComment(comment);
    setEditting(true);
  };

  const onCancel = () => onHide();

  const onSave = () => {
    props.onUpdate(highlight, comment);
    onHide();
  };

  if (!editing) {
    // new
    if (!highlight?.id) {
      return (
        <Button
          className="bg-blue-500 hover:bg-blue-700 text-white   px-2 rounded-md"
          onClick={onAdd}
        >
          Add
        </Button>
      );
    }

    return (
      <div
        className="
    bg-stone-50
    border
    border-stone-100
    shadow-lg
    p-2
    rounded-md
    max-width-[300px]
    max-height-[100px]
    overflow-y-scroll
    "
      >
        <CommentText>{comment?.text}</CommentText>

        <div className="flex gap-2">
          <Button className="text-sky-600" onClick={onEdit}>
            Edit
          </Button>
          <Button
            className="text-sky-600"
            onClick={() => props.onDelete?.(highlight)}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="
    bg-stone-50
    border 
    border-stone-400
    shadow-lg
    p-3
    rounded-md
     max-width-[300px]
    max-height-[100px]
    overflow-y-scroll
    flex-col
    "
    >
      <textarea
        className="border w-full"
        value={comment.text}
        autoFocus
        onChange={(event) => setComment({ text: event.target.value })}
        ref={(node) => node?.focus()}
      />
      <div className="flex gap-2">
        <Button className=" text-sky-600" onClick={onSave}>
          Save
        </Button>
        <Button className="text-sky-600" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Button({
  children,
  className,
  ...props
}: PropsWithChildren & HtmlHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`py-0.5 cursor-pointer text-sm ${className}`}>
      {children}
    </button>
  );
}

function CommentText({ children }: PropsWithChildren) {
  return <blockquote className="w-full">{children || "No Comment"}</blockquote>;
}
