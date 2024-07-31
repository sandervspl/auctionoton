'use client';

import * as React from 'react';
import Link from 'next/link';
import { MenuIcon, XIcon } from 'lucide-react';
import { $path } from 'next-typesafe-url';
import { UserButton, SignInButton } from '@clerk/nextjs';

import * as Drawer from 'park-ui/drawer';
import { IconButton } from 'park-ui/icon-button';
import { Button } from 'shadcn-ui/button';
import { RealmDropdown } from 'common/realm-dropdown';

type Props = Drawer.RootProps & { userId: string | null };

export const MobileMenu = ({ userId, ...props }: Props) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Drawer.Root {...props} open={open} onOpenChange={(details) => setOpen(details.open)}>
      <Drawer.Trigger asChild>
        <IconButton variant="ghost">
          <MenuIcon />
        </IconButton>
      </Drawer.Trigger>
      <Drawer.Backdrop />
      <Drawer.Positioner className="right-0">
        <Drawer.Content>
          <Drawer.Header className="flex items-center justify-between">
            <Drawer.Title>Auctionoton</Drawer.Title>
            <Drawer.CloseTrigger asChild>
              <IconButton variant="ghost">
                <XIcon />
              </IconButton>
            </Drawer.CloseTrigger>
          </Drawer.Header>
          <Drawer.Body className="space-y-4">
            <RealmDropdown onOpen={() => setOpen(false)} />
            {userId && (
              <Button asChild variant="outline">
                <Link href={$path({ route: '/user/dashboard' })} onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
              </Button>
            )}
          </Drawer.Body>
          <Drawer.Footer gap="3">
            <div className="flex items-center gap-2">
              {userId ? (
                <UserButton />
              ) : (
                <Button asChild variant="outline">
                  <SignInButton mode="modal" />
                </Button>
              )}
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
};
