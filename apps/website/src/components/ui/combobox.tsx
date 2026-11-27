import { Combobox as ComboboxPrimitive } from '@ark-ui/react/combobox';
import type * as React from 'react';

import { cn } from 'services/cn';

export { createListCollection, useListCollection } from '@ark-ui/react/combobox';

function Combobox<T extends ComboboxPrimitive.CollectionItem>({
  className,
  ...props
}: ComboboxPrimitive.RootProps<T>) {
  return (
    <ComboboxPrimitive.Root
      data-slot="combobox"
      className={cn('flex w-full flex-col gap-1.5', className)}
      {...props}
    />
  );
}

function ComboboxControl({ className, ...props }: ComboboxPrimitive.ControlProps) {
  return (
    <ComboboxPrimitive.Control
      data-slot="combobox-control"
      className={cn('relative', className)}
      {...props}
    />
  );
}

function ComboboxInput(props: ComboboxPrimitive.InputProps) {
  return <ComboboxPrimitive.Input data-slot="combobox-input" {...props} />;
}

function ComboboxPositioner({ className, ...props }: ComboboxPrimitive.PositionerProps) {
  return (
    <ComboboxPrimitive.Positioner
      data-slot="combobox-positioner"
      className={cn('[--z-index:50]', className)}
      {...props}
    />
  );
}

function ComboboxContent({ className, ...props }: ComboboxPrimitive.ContentProps) {
  return (
    <ComboboxPrimitive.Content
      data-slot="combobox-content"
      className={cn(
        'z-50 flex flex-col rounded-md border bg-popover text-popover-foreground shadow-lg outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

function ComboboxItemGroup(props: ComboboxPrimitive.ItemGroupProps) {
  return <ComboboxPrimitive.ItemGroup data-slot="combobox-item-group" {...props} />;
}

function ComboboxItem({ className, ...props }: ComboboxPrimitive.ItemProps) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        'flex cursor-pointer items-center justify-between rounded-sm transition-colors hover:bg-accent data-highlighted:bg-accent data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function ComboboxItemText(props: React.ComponentProps<typeof ComboboxPrimitive.ItemText>) {
  return <ComboboxPrimitive.ItemText data-slot="combobox-item-text" {...props} />;
}

export {
  Combobox,
  ComboboxContent,
  ComboboxControl,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemGroup,
  ComboboxItemText,
  ComboboxPositioner,
};
