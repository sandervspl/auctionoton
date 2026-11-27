import { Link } from '@tanstack/react-router';
import { AccountButton, SignInOptions } from 'common/access-auth';
import { MenuIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import { RealmList, useRealmLabel } from 'common/realm-dropdown';
import { Button } from 'shadcn-ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from 'shadcn-ui/drawer';

export const MobileMenu = ({ userId }: { userId: string | null }) => {
  const [open, setOpen] = React.useState(false);
  const [showRealms, setShowRealms] = React.useState(false);
  const realmLabel = useRealmLabel();

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setShowRealms(false);
      }}
    >
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <MenuIcon />
        </Button>
      </DrawerTrigger>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader className="flex flex-row items-center justify-between border-b p-6">
          <DrawerTitle className="text-xl">Auctionoton</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close menu">
              <XIcon />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              aria-expanded={showRealms}
              onClick={() => setShowRealms((show) => !show)}
            >
              Realm: {realmLabel}
            </Button>
            {showRealms && (
              <div className="overflow-hidden rounded-md border">
                <RealmList
                  onSelect={() => {
                    setShowRealms(false);
                    setOpen(false);
                  }}
                />
              </div>
            )}
          </div>
          {userId && (
            <Button asChild variant="outline">
              <Link to="/user/dashboard" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
            </Button>
          )}
        </div>
        <DrawerFooter className="border-t p-6">
          {userId ? (
            <AccountButton />
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Sign in</h3>
              <SignInOptions />
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
