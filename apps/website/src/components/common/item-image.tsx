import * as React from 'react';

import { getRingQualityColor } from 'services/colors';
import { cn } from 'services/cn';

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  item: {
    icon: string | null;
    name: string | null;
    quality: number | null;
  };
};

export const ItemImage = ({ item, className, ...props }: Props) => {
  return (
    <img
      loading="lazy"
      decoding="async"
      {...props}
      src={item.icon ?? '/images/questionmark.webp'}
      alt={item.name ?? 'item'}
      className={cn('rounded-md ring-1', className)}
      style={{
        ...getRingQualityColor(item.quality),
      }}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = '/images/questionmark.webp';
        e.currentTarget.removeAttribute('srcset');
      }}
    />
  );
};
