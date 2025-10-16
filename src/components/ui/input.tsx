import * as React from "react";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={[
          "h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2",
          "text-sm text-slate-900 placeholder-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-slate-400",
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
