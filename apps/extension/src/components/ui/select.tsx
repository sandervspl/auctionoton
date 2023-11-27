import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from 'src/utils';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'auc-flex auc-h-10 auc-w-full auc-items-center auc-justify-between auc-rounded-md auc-border auc-border-input auc-bg-background auc-px-3 auc-py-2 auc-text-sm auc-ring-offset-background placeholder:auc-text-muted-foreground focus:auc-outline-none focus:auc-ring-2 focus:auc-ring-ring focus:auc-ring-offset-2 disabled:auc-cursor-not-allowed disabled:auc-opacity-50 [&>span]:auc-line-clamp-1',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="auc-h-4 auc-w-4 auc-opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'auc-flex auc-cursor-default auc-items-center auc-justify-center auc-py-1',
      className,
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'auc-flex auc-cursor-default auc-items-center auc-justify-center auc-py-1',
      className,
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'auc-relative auc-z-50 auc-max-h-96 auc-min-w-[8rem] auc-overflow-hidden auc-rounded-md auc-border auc-bg-popover auc-text-popover-foreground auc-shadow-md data-[state=open]:auc-animate-in data-[state=closed]:auc-animate-out data-[state=closed]:auc-fade-out-0 data-[state=open]:auc-fade-in-0 data-[state=closed]:auc-zoom-out-95 data-[state=open]:auc-zoom-in-95 data-[side=bottom]:auc-slide-in-from-top-2 data-[side=left]:auc-slide-in-from-right-2 data-[side=right]:auc-slide-in-from-left-2 data-[side=top]:auc-slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:auc-translate-y-1 data-[side=left]:-auc-translate-x-1 data-[side=right]:auc-translate-x-1 data-[side=top]:-auc-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'auc-p-1',
          position === 'popper' &&
            'auc-h-[var(--radix-select-trigger-height)] auc-w-full auc-min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('auc-py-1.5 auc-pl-8 auc-pr-2 auc-text-sm auc-font-semibold', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'auc-relative auc-flex auc-w-full auc-cursor-default auc-select-none auc-items-center auc-rounded-sm auc-py-1.5 auc-pl-8 auc-pr-2 auc-text-sm auc-outline-none focus:auc-bg-accent focus:auc-text-accent-foreground data-[disabled]:auc-pointer-events-none data-[disabled]:auc-opacity-50',
      className,
    )}
    {...props}
  >
    <span className="auc-absolute auc-left-2 auc-flex auc-h-3.5 auc-w-3.5 auc-items-center auc-justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="auc-h-4 auc-w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-auc-mx-1 auc-my-1 auc-h-px auc-bg-muted', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
