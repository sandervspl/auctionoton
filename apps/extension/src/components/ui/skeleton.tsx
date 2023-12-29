import * as React from 'react';
import { cn } from 'src/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('auc-animate-pulse auc-rounded-md auc-bg-muted', className)} {...props} />
  );
}

export { Skeleton };
