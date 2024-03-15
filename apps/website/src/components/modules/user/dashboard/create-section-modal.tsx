'use client';

import { useFormStatus } from 'react-dom';
import { Loader2Icon, SquarePlusIcon } from 'lucide-react';

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
import { useCreateSectionModal } from './hooks';

export const CreateSectionModal = () => {
  const { isOpen, setOpen, action, state } = useCreateSectionModal();

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <SquarePlusIcon size={16} />
          Add collection
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create item collection</DialogTitle>
          <DialogDescription>Add a new dashboard section to organize your items.</DialogDescription>
        </DialogHeader>
        <form action={action}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-6 items-center gap-4">
              <Label htmlFor="section_name" className="text-right col-span-2">
                Collection name
              </Label>
              <Input
                id="section_name"
                name="section_name"
                placeholder="Lionheart Helm reagents"
                className="col-span-4"
                autoComplete="off"
              />
            </div>
            {state.error && <p className="text-red-500 ml-auto">{state.error}</p>}
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
