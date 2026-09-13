'use client';

import * as React from 'react';
import Image, { type ImageProps } from 'next/image';
import type { O } from 'ts-toolbelt';

import { getRingQualityColor } from 'services/colors';
import { cn } from 'services/cn';

type Props = O.Optional<ImageProps, 'src' | 'alt'> & {
  item: {
    icon: string | null;
    name: string | null;
    quality: number | null;
  };
};

export const ItemImage = ({ item, className, ...props }: Props) => {
  return (
    <Image
      {...props}
      src={item.icon ?? '/images/questionmark.webp'}
      alt={item.name ?? 'item'}
      className={cn('rounded-md ring-1', className)}
      style={{
        ...getRingQualityColor(item.quality),
      }}
      onError={(e) => {
        (e.target as any).src = '/images/questionmark.webp';
        (e.target as any).removeAttribute('srcset');
      }}
    />
  );
};
