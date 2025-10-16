import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
  size?: "sm" | "md" | "lg";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "md", ...props }, ref) => {
    const variants = {
      default: "bg-slate-900 text-white hover:bg-slate-800",
      outline: "border border-slate-300 text-slate-800 hover:bg-slate-100",
    } as const;

    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-6 text-base",
    } as const;

    return (
      <button
        ref={ref}
        className={[
          "inline-flex items-center justify-center rounded-md transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-slate-400",
          variants[variant],
          sizes[size],
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
