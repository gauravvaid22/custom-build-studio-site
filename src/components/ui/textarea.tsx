import * as React from "react";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={[
          "w-full rounded-md border border-slate-300 bg-white px-3 py-2",
          "text-sm text-slate-900 placeholder-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-slate-400",
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
