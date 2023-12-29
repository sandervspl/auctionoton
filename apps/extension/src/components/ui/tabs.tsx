import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from 'src/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'auc-inline-flex auc-h-10 auc-items-center auc-justify-center auc-rounded-md auc-bg-muted auc-p-1 auc-text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'auc-inline-flex auc-items-center auc-justify-center auc-whitespace-nowrap auc-rounded-sm auc-px-3 auc-py-1.5 auc-text-sm auc-font-medium auc-ring-offset-background auc-transition-all focus-visible:auc-outline-none focus-visible:auc-ring-2 focus-visible:auc-ring-ring focus-visible:auc-ring-offset-2 disabled:auc-pointer-events-none disabled:auc-opacity-50 data-[state=active]:auc-bg-background data-[state=active]:auc-text-foreground data-[state=active]:auc-shadow-sm',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'auc-mt-2 auc-ring-offset-background focus-visible:auc-outline-none focus-visible:auc-ring-2 focus-visible:auc-ring-ring focus-visible:auc-ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
