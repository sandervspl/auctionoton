import { Link } from '@tanstack/react-router';
import { AccountButton, SignInLink, useAccessAuth } from 'common/access-auth';

import { ItemSearch } from 'common/item-search';
import { RealmDropdown } from 'common/realm-dropdown';
import { Button } from 'shadcn-ui/button';

import { MobileMenu } from './mobile-menu';

export const Navbar = () => {
  const { session } = useAccessAuth();
  const userId = session?.userId;

  return (
    <header className="relative h-16 px-4 border-b shrink-0 md:px-6 gap-4">
      <div className="flex items-center justify-between mx-auto w-full h-full max-w-screen-xl">
        <div className="flex items-center justify-start gap-4">
          <Link to="/" className="flex items-center gap-2 sm:min-w-36 shrink-0">
            <img src="/vectors/icon.svg" alt="logo" className="size-6" width={24} height={24} />
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
                  <Link to="/user/dashboard">Dashboard</Link>
                </Button>
                <AccountButton />
              </>
            ) : (
              <SignInLink />
            )}
          </div>
        </div>

        <div className="block md:hidden">
          <MobileMenu variant="right" userId={userId ?? null} />
        </div>
      </div>
    </header>
  );
};
