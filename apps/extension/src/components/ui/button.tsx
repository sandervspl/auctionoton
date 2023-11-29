import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from 'src/utils';

const buttonVariants = cva(
  'auc-inline-flex auc-items-center auc-justify-center auc-whitespace-nowrap auc-rounded-md auc-text-sm auc-font-medium auc-ring-offset-background auc-transition-colors auc-focus-visible:outline-none auc-focus-visible:ring-2 auc-focus-visible:ring-ring auc-focus-visible:ring-offset-2 auc-disabled:pointer-events-none auc-disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'auc-bg-primary auc-text-primary-foreground hover:auc-bg-primary/90',
        destructive:
          'auc-bg-destructive auc-text-destructive-foreground hover:auc-bg-destructive/90',
        outline:
          'auc-border auc-border-input auc-bg-background hover:auc-bg-accent hover:auc-text-accent-foreground',
        secondary: 'auc-bg-secondary auc-text-secondary-foreground hover:auc-bg-secondary/80',
        ghost: 'hover:auc-bg-accent hover:auc-text-accent-foreground',
        link: 'auc-text-primary auc-underline-offset-4 hover:auc-underline',
      },
      size: {
        default: 'auc-h-10 auc-px-4 auc-py-2',
        sm: 'auc-h-9 auc-rounded-md auc-px-3',
        lg: 'auc-h-11 auc-rounded-md auc-px-8',
        icon: 'auc-h-10 auc-w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
