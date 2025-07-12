import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { JSX, MouseEventHandler, ReactNode } from "react";

export function Sortable({
  children,
  className,
  onClick,
  ...props
}: {
  element?: keyof JSX.IntrinsicElements;
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  id: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("touch-none select-none", className)}
      onClick={onClick}
      {...attributes}
      {...listeners}
      {...props}
    >
      {children}
    </div>
  );
}
