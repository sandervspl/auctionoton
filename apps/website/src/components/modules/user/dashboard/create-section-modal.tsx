'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2Icon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from 'shadcn-ui/dialog';
import { Button } from 'shadcn-ui/button';
import { Input } from 'shadcn-ui/input';
import { Label } from 'shadcn-ui/label';
import { createDashboardSection } from 'actions/dashboard';

export const CreateSectionModal = () => {
  const [state, action] = useFormState(createDashboardSection, { error: '' });

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Add section</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dashboard section</DialogTitle>
          <DialogDescription>Add a new dashboard section to organize your items.</DialogDescription>
        </DialogHeader>
        <form action={action}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Lionheart Helm reagents"
                className="col-span-3"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const SubmitButton = () => {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="gap-2">
      {pending && <Loader2Icon className="animate-spin" size={16} />}
      Create section
    </Button>
  );
};
