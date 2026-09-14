import { Link } from '@tanstack/react-router';
import { Loader2Icon } from 'lucide-react';
import { setAuctionHouseIdCookie } from 'actions/cookie';
import { useServerMutation } from 'hooks/use-server-mutation';
import { useSettings } from 'hooks/use-settings';
import { Button } from 'shadcn-ui/button';

type Props = {
  itemParams?: { realmSlug: string; region: string; faction: string; itemSlug: string };
  initialValue?: string;
};

export function FactionButtons(props: Props) {
  return (
    <div className="flex gap-2 items-center">
      <FactionButton {...props} faction="alliance" />
      <FactionButton {...props} faction="horde" />
    </div>
  );
}

function FactionButton({
  itemParams,
  initialValue,
  faction,
}: Props & { faction: 'alliance' | 'horde' }) {
  const { settings, setSettings } = useSettings({ faction: initialValue });
  const cookie = useServerMutation(setAuctionHouseIdCookie);
  const activeFaction = initialValue ?? settings.faction;

  function onFactionClick() {
    const region = itemParams?.region ?? settings.region;
    const realm = itemParams?.realmSlug ?? settings.realm;
    setSettings({ region, realm, faction });
    if (region === 'eu' || region === 'us') {
      cookie.mutate({ region, realmSlug: realm, faction });
    }
  }

  const content = (
    <>
      {faction}
      {cookie.isPending && <Loader2Icon className="animate-spin" size={16} />}
    </>
  );
  return (
    <Button
      variant={activeFaction === faction ? 'default' : 'outline'}
      className="capitalize flex items-center gap-2"
      asChild={!!itemParams}
      onClick={onFactionClick}
    >
      {itemParams ? (
        <Link
          to="/item/$realmSlug/$region/$faction/$itemSlug"
          params={{ ...itemParams, faction }}
          replace
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </Button>
  );
}
