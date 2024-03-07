'use client';

import * as React from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'shadcn-ui/dropdown-menu';
import { Button } from 'shadcn-ui/button';

type Props = {
  options: { value: string; label: string }[];
  label?: string;
  children?: React.ReactNode;
};

export function DropdownRadio(props: Props) {
  const [option, setOption] = React.useState(props.options[0]?.value);
  const selectedLabel = props.options.find((o) => o.value === option)?.label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{props.children ?? selectedLabel}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {props.label && (
          <>
            <DropdownMenuLabel>{props.label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuRadioGroup value={option} onValueChange={(value) => setOption(value)}>
          {props.options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
