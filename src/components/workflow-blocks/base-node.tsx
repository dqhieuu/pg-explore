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
        "bg-card text-card-foreground relative rounded-md border p-5 shadow",
        // "outline-3 outline-green-500",
        selected ? "border-muted-foreground shadow-lg" : "",
        "ring-gray-400 hover:ring-1",
        className,
      )}
      tabIndex={0}
      {...props}
    />
  );
}
