import { useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';

export function ErrorToast() {
  const { error } = useSearch({ from: '/' });
  const navigate = useNavigate();
  useEffect(() => {
    if (!error) return;
    toast.error(error === 'unauthorized' ? 'You are not signed in' : 'Something went wrong');
    void navigate({ to: '/', search: {}, replace: true });
  }, [error, navigate]);
  return null;
}
