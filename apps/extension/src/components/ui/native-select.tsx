import * as React from 'react';
import { cn } from 'utils';

// Let the browser own the menu: portaled dropdowns can dismiss themselves when
// an extension popup changes window focus or size.
const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'auc-h-10 auc-w-full auc-min-w-0 auc-appearance-auto auc-rounded-md auc-border auc-border-input auc-bg-background auc-px-3 auc-py-2 auc-text-sm auc-text-foreground auc-ring-offset-background focus:auc-outline-none focus:auc-ring-2 focus:auc-ring-offset-2 disabled:auc-cursor-not-allowed disabled:auc-opacity-50',
      className,
    )}
    {...props}
  />
));
NativeSelect.displayName = 'NativeSelect';

export { NativeSelect };
