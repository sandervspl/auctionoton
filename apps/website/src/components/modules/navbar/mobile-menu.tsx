import { Link } from '@tanstack/react-router';
import { AccountButton, SignInOptions } from 'common/access-auth';
import { MenuIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import { RealmDropdown } from 'common/realm-dropdown';
import * as Drawer from 'park-ui/drawer';
import { IconButton } from 'park-ui/icon-button';
import { Button } from 'shadcn-ui/button';

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
                <Link to="/user/dashboard" onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
              </Button>
            )}
          </Drawer.Body>
          <Drawer.Footer gap="3">
            <div className="w-full">
              {userId ? (
                <AccountButton />
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Sign in</h3>
                  <SignInOptions />
                </div>
              )}
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
};
