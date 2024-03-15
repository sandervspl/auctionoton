'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { $path } from 'next-typesafe-url';

const ERROR_MAP = {
  unauthorized: 'You are not signed in',
};

export const ErrorToast = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  React.useEffect(() => {
    if (searchParams.has('error')) {
      toast.error(ERROR_MAP[searchParams.get('error')!] || 'Oops, something went wrong!');
      router.push($path({ route: '/' }));
    }
  }, [searchParams, router]);

  return null;
};
