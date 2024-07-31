'use client';

import * as React from 'react';
import Link from 'next/link';

import { setAuctionHouseIdCookie } from 'actions/cookie';
import { useServerActionMutation } from 'hooks/server-action-hooks';
import { useSettings } from 'hooks/use-settings';
import { Button } from 'shadcn-ui/button';
import { Loader2Icon } from 'lucide-react';

type Props = {
  href?: {
    a: string;
    h: string;
  };
};

export const FactionButtons = (props: Props) => {
  return (
    <div className="flex gap-2 items-center">
      <FactionButton faction="alliance" href={props.href?.a} />
      <FactionButton faction="horde" href={props.href?.h} />
    </div>
  );
};

const FactionButton = (props: { faction: 'alliance' | 'horde'; href?: string }) => {
  const { settings, setFaction } = useSettings();
  const [isPending, startTransition] = React.useTransition();
  const setAuctionHouseCookie = useServerActionMutation(setAuctionHouseIdCookie);

  if (!props.href) {
    return (
      <Button
        variant={settings.faction === props.faction ? 'default' : 'outline'}
        className="flex items-center gap-2"
        onClick={() => {
          startTransition(async () => {
            setFaction(props.faction);

            await setAuctionHouseCookie.mutateAsync({
              region: settings.region,
              realmSlug: settings.realm,
              faction: props.faction,
            });
          });
        }}
      >
        {props.faction}
        {isPending && <Loader2Icon className="animate-spin" size={16} />}
      </Button>
    );
  }

  return (
    <Button variant={settings.faction === props.faction ? 'default' : 'outline'} asChild>
      <Link
        href={props.href}
        className="capitalize flex items-center gap-2"
        onClick={() => setFaction(props.faction)}
      >
        {props.faction}
      </Link>
    </Button>
  );
};
