'use client';

import { useSettings } from 'hooks/use-settings';
import Link from 'next/link';

import { setAuctionHouseIdCookie } from 'actions/cookie';
import { useServerActionMutation } from 'hooks/server-action-hooks';
import { Button } from 'shadcn-ui/button';

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
  const setAuctionHouseCookie = useServerActionMutation(setAuctionHouseIdCookie);

  if (!props.href) {
    return (
      <Button
        variant={settings.faction === props.faction ? 'default' : 'outline'}
        onClick={() => {
          setFaction(props.faction);
          setAuctionHouseCookie.mutateAsync({
            region: settings.region,
            realmSlug: settings.realm,
            faction: props.faction,
          });
        }}
      >
        {props.faction}
      </Button>
    );
  }

  return (
    <Button variant={settings.faction === props.faction ? 'default' : 'outline'} asChild>
      <Link href={props.href} className="capitalize" onClick={() => setFaction(props.faction)}>
        {props.faction}
      </Link>
    </Button>
  );
};
