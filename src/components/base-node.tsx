import { cn } from "@/lib/utils";
import { HTMLAttributes, Ref } from "react";

export function BaseNode({
  className,
  selected,
  ...props
}: {
  className: string;
  selected?: boolean;
  ref?: Ref<HTMLDivElement>;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative rounded-md border bg-card p-5 text-card-foreground shadow",
        selected ? "border-muted-foreground shadow-lg" : "",
        "hover:ring-1 ring-gray-400",
        className,
      )}
      tabIndex={0}
      {...props}
    />
  );
}
