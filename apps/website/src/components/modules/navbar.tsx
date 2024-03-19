import Link from 'next/link';
import { $path } from 'next-typesafe-url';
import { SignInButton, UserButton, auth } from '@clerk/nextjs';
import Image from 'next/image';

import { RealmDropdown } from 'common/realm-dropdown';
import { ItemSearch } from 'common/item-search';

import Script from 'next/script';
import { Button } from 'shadcn-ui/button';

import IconSvg from 'public/vectors/icon.svg';

export const Navbar = () => {
  const { userId } = auth();

  return (
    <header className="relative h-16 px-4 border-b shrink-0 md:px-6 gap-4">
      <div className="flex items-center justify-between mx-auto w-full h-full max-w-screen-xl">
        <div className="flex items-center justify-start gap-4">
          <Link href={$path({ route: '/' })} className="flex gap-2 items-center self-center">
            <Image src={IconSvg} alt="logo" className="size-6" />
            <span className="hidden sm:block text-lg font-bold">auctionoton</span>
            <span className="sm:hidden">A</span>
          </Link>
          <ItemSearch />
        </div>
        <div className="flex ml-auto self-center gap-2">
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
                <SignInButton />
              </Button>
            )}
          </div>
        </div>
      </div>
      <Script
        src="http://umami-f4oc848.168.119.167.208.sslip.io/script.js"
        data-website-id="047847e3-ba46-4960-a0fd-9eae75c8ba96"
      />
    </header>
  );
};
