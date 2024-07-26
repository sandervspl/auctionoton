import Link from 'next/link';
import { $path } from 'next-typesafe-url';
import { SignInButton, UserButton, auth } from '@clerk/nextjs';
import Image from 'next/image';
import { MenuIcon, XIcon } from 'lucide-react';

import { Button } from 'shadcn-ui/button';
import * as Drawer from 'park-ui/drawer';
import { IconButton } from 'park-ui/icon-button';
import { RealmDropdown } from 'common/realm-dropdown';
import { ItemSearch } from 'common/item-search';

import IconSvg from 'public/vectors/icon.svg';

export const Navbar = () => {
  const { userId } = auth();

  return (
    <header className="relative h-16 px-4 border-b shrink-0 md:px-6 gap-4">
      <div className="flex items-center justify-between mx-auto w-full h-full max-w-screen-xl">
        <div className="flex items-center justify-start gap-4">
          <Link
            href={$path({ route: '/' })}
            className="flex items-center gap-2 sm:min-w-36 shrink-0"
          >
            <Image src={IconSvg} alt="logo" className="size-6" />
            <div className="hidden sm:block text-lg font-bold ">auctionoton</div>
          </Link>
          <ItemSearch />
        </div>

        <div className="ml-auto self-center gap-2 hidden md:flex">
          <RealmDropdown />
          <div className="flex items-center gap-2">
            {userId ? (
              <>
                <Button asChild variant="outline">
                  <Link href={$path({ route: '/user/dashboard' })}>Dashboard</Link>
                </Button>
                <UserButton />
              </>
            ) : (
              <Button asChild variant="outline">
                <SignInButton mode="modal" />
              </Button>
            )}
          </div>
        </div>

        <div className="block md:hidden">
          <MobileMenu variant="right" userId={userId} />
        </div>
      </div>
    </header>
  );
};

export const MobileMenu = (props: Drawer.RootProps & { userId: string | null }) => {
  return (
    <Drawer.Root {...props}>
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
            <RealmDropdown />
            {props.userId && (
              <Button asChild variant="outline">
                <Link href={$path({ route: '/user/dashboard' })}>Dashboard</Link>
              </Button>
            )}
          </Drawer.Body>
          <Drawer.Footer gap="3">
            <div className="flex items-center gap-2">
              {props.userId ? (
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
