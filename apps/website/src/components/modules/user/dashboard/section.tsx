'use client';

import * as React from 'react';
import { Loader2Icon, PlusIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { $path } from 'next-typesafe-url';
import { useFormState } from 'react-dom';
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
import { IconButton } from '~/components/park-ui/icon-button';
import { useServerActionMutation } from '~/hooks/server-action-hooks';
import { useRouter } from 'next/navigation';

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
  const [itemIdDeleting, setItemIdDeleting] = React.useState<number>();
  const ref = React.useRef<HTMLInputElement>(null);
  const deleteSection = useServerActionMutation(deleteDashboardSection);
  const deleteItem = useServerActionMutation(deleteDashboardSectionItem);

  function onDeleteSectionClick() {
    if (window.confirm('Are you sure you want to delete this section?')) {
      deleteSection.mutateAsync({ sectionId: section.id }).then(() => {
        router.refresh();
        toast.success('Section deleted');
      });
    }
  }

  function onDeleteItemClick(sectionItemId: number) {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setItemIdDeleting(sectionItemId);

      deleteItem
        .mutateAsync({ sectionId: section.id, sectionItemId })
        .then(() => {
          router.refresh();
          toast.success('Item removed from section');
        })
        .catch((err) => {
          console.error(err.message);
        })
        .finally(() => {
          setItemIdDeleting(undefined);
        });
    }
  }

  return (
    <Card className={cn({ 'opacity-25': deleteSection.isPending })}>
      <CardHeader className="flex-row justify-between">
        <CardTitle>{section.name}</CardTitle>
        {!deleteSection.isPending ? (
          <IconButton onClick={onDeleteSectionClick}>
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
              <Link
                key={item.id}
                href={$path({
                  route: '/item/[...item]',
                  routeParams: {
                    item: [
                      settings.realm,
                      settings.region,
                      settings.faction,
                      `${item.slug}-${item.id}`,
                    ],
                  },
                })}
                className={cn('flex items-center gap-2 hover:underline underline-offset-4', {
                  'opacity-50': itemIdDeleting === id,
                })}
                style={{ ...getTextQualityColor(item.quality) }}
              >
                <ItemImage item={item} width={30} height={30} />
                <div className="flex items-center gap-2 justify-between w-full">
                  {item.name}
                  <IconButton
                    onClick={(e) => {
                      e.preventDefault();
                      onDeleteItemClick(id);
                    }}
                  >
                    {itemIdDeleting === id ? (
                      <Loader2Icon className="animate-spin text-white" size={16} />
                    ) : (
                      <XIcon size={16} className="text-white" />
                    )}
                  </IconButton>
                </div>
              </Link>
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

type SearchItemProps = {
  item: SearchItem;
  section: Props['section'];
};

const SearchItemComponent = (props: SearchItemProps) => {
  const highestOrder = props.section.items.reduce((acc, { dashboardSectionItem: { order } }) => {
    return order > acc ? order : acc;
  }, 0);
  const [state, action] = useFormState(addDashboardSectionItem, { error: '' });

  React.useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  return (
    <form action={action}>
      <input type="hidden" name="highest_order" value={highestOrder} />
      <input type="hidden" name="section_id" value={props.section.id} />
      <input type="hidden" name="item_id" value={props.item.id} />
      <button type="submit" className="flex items-center justify-start w-full gap-2 h-full">
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
    </form>
  );
};
