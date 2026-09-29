import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-none border-2 border-transparent font-sans font-bold whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* Red pen: the primary action. White bold text on #E8112D, 2px ink border, hard shadow. */
        default: "press border-ink bg-primary text-primary-foreground shadow-hard",
        /* White card with ink border and hard shadow. */
        outline: "press border-ink bg-background text-foreground shadow-hard",
        /* Black pill: the nav CTA. */
        pill: "rounded-full bg-ink font-semibold text-background hover:bg-ink/85",
        secondary: "press border-ink bg-secondary text-secondary-foreground shadow-hard",
        ghost: "hover:bg-muted",
        destructive: "border-ink bg-background text-destructive",
        link: "border-0 px-0 font-semibold text-foreground underline underline-offset-2 hover:text-primary",
      },
      size: {
        default: "px-7 py-4 text-[17px] leading-6",
        sm: "px-5 py-2.5 text-[15px] leading-5",
        xs: "px-3 py-1 text-[13px] leading-[18px]",
        lg: "px-8 py-[18px] text-[17px] leading-6",
        icon: "size-10",
        "icon-xs": "size-6",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    compoundVariants: [
      { variant: "pill", size: "sm", className: "px-[18px] py-2.5" },
      { variant: "link", className: "px-0 py-0" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
