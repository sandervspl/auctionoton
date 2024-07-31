'use client';

import * as React from 'react';
import { Loader2Icon, PlusIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { $path } from 'next-typesafe-url';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from 'shadcn-ui/card';
import { getTextQualityColor } from 'services/colors';
import { ItemImage } from 'common/item-image';
import { Button } from 'shadcn-ui/button';
import { useSettings } from 'hooks/use-settings';
import { ItemSearch, type SearchItem } from 'common/item-search';
import { cn } from 'services/cn';
import {
  addDashboardSectionItem,
  deleteDashboardSection,
  deleteDashboardSectionItem,
} from 'actions/dashboard';
import { IconButton } from 'park-ui/icon-button';
import { useServerActionMutation } from 'hooks/server-action-hooks';

type Props = {
  section: {
    userId: string;
    id: number;
    name: string;
    order: number;
    items: {
      dashboardSectionId: number;
      dashboardSectionItemId: number;
      dashboardSectionItem: {
        id: number;
        itemId: number;
        order: number;
        item: {
          id: number;
          name: string | null;
          slug: string | null;
          icon: string | null;
          quality: number | null;
        };
      };
    }[];
  };
};

export const DashboardSection = ({ section }: Props) => {
  const router = useRouter();
  const { settings } = useSettings();
  const [isSearching, setIsSearching] = React.useState(false);
  const ref = React.useRef<HTMLInputElement>(null);
  const deleteSection = useServerActionMutation(deleteDashboardSection);

  function onDeleteSectionClick() {
    if (window.confirm('Are you sure you want to delete this section?')) {
      deleteSection.mutateAsync({ sectionId: section.id }).then(() => {
        router.refresh();
        toast.success('Section deleted');
      });
    }
  }

  return (
    <Card className={cn('group/card', { 'opacity-25': deleteSection.isPending })}>
      <CardHeader className="flex-row justify-between">
        <CardTitle>{section.name}</CardTitle>
        {!deleteSection.isPending ? (
          <IconButton onClick={onDeleteSectionClick} className="hidden group-hover/card:block">
            <XIcon size={16} />
          </IconButton>
        ) : (
          <Loader2Icon className="animate-spin" size={16} />
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-6 justify-between">
        {section.items.length > 0 && (
          <div className="flex flex-col gap-4">
            {section.items.map(({ dashboardSectionItem: { item, id } }) => (
              <ItemLink
                key={id}
                settings={settings}
                item={item}
                sectionId={section.id}
                sectionItemid={id}
              />
            ))}
          </div>
        )}

        <div className="flex mt-auto w-full">
          <ItemSearch
            ref={ref}
            onBlur={() => setIsSearching(false)}
            // Component needs to always be mounted or else the results don't render
            className={cn({ 'sr-only': !isSearching, 'w-full': isSearching })}
            searchItem={(props) => <SearchItemComponent {...props} section={section} />}
          />
          {!isSearching && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setIsSearching(true);
                ref.current?.focus();
              }}
            >
              <PlusIcon size={16} />
              Add item
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

type ItemLinkProps = {
  item: {
    id: number;
    name: string | null;
    slug: string | null;
    icon: string | null;
    quality: number | null;
  };
  settings: ReturnType<typeof useSettings>['settings'];
  sectionId: number;
  sectionItemid: number;
};

const ItemLink = ({ item, settings, sectionId, sectionItemid }: ItemLinkProps) => {
  const router = useRouter();
  const deleteItem = useServerActionMutation(deleteDashboardSectionItem);

  function onDeleteItemClick(sectionItemId: number) {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteItem
        .mutateAsync({ sectionId, sectionItemId })
        .then(() => {
          router.refresh();
          toast.success('Item removed from section');
        })
        .catch((err) => {
          console.error(err.message);
        });
    }
  }

  return (
    <Link
      key={item.id}
      href={$path({
        route: '/item/[...item]',
        routeParams: {
          item: [settings.realm, settings.region, settings.faction, `${item.slug}-${item.id}`],
        },
      })}
      className={cn('group/item flex items-center gap-2 hover:underline underline-offset-4', {
        'opacity-50': deleteItem.isPending,
      })}
      style={{ ...getTextQualityColor(item.quality) }}
    >
      <ItemImage item={item} width={30} height={30} />
      <div className="flex items-center gap-2 justify-between w-full">
        {item.name}
        {deleteItem.isPending ? (
          <Loader2Icon className="animate-spin text-white" size={16} />
        ) : (
          <IconButton
            onClick={(e) => {
              e.preventDefault();
              onDeleteItemClick(sectionItemid);
            }}
            className="hidden group-hover/item:block"
          >
            <XIcon size={16} className="text-white" />
          </IconButton>
        )}
      </div>
    </Link>
  );
};

type SearchItemProps = {
  item: SearchItem;
  section: Props['section'];
};

const SearchItemComponent = (props: SearchItemProps) => {
  const highestOrder = props.section.items.reduce((acc, { dashboardSectionItem: { order } }) => {
    return order > acc ? order : acc;
  }, 0);
  const addItem = useServerActionMutation(addDashboardSectionItem);

  const onItemClick = () => {
    addItem
      .mutateAsync({
        section_id: props.section.id,
        item_id: props.item.id,
        highest_order: highestOrder,
      })
      .then(() => {
        toast.success('Item added to section');
      })
      .catch((err) => {
        console.error(err.message);
        toast.error(err.message);
      });
  };

  return (
    <button
      type="button"
      className="flex items-center justify-start w-full gap-2 h-full"
      onClick={onItemClick}
    >
      <ItemImage item={props.item} width={24} height={24} />
      <span
        className="truncate"
        style={{
          ...getTextQualityColor(props.item.quality),
        }}
      >
        {props.item.name}
      </span>
    </button>
  );
};
