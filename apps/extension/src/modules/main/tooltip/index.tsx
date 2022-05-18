import * as i from 'types';
import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// import WarningSvg from 'static/exclamation-circle-regular.svg';
import { ELEMENT_ID } from 'src/constants';
import useItemFetcher from 'hooks/useItemFetcher';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';
import useStorageQuery from 'hooks/useStorageQuery';

dayjs.extend(relativeTime);

/** @TODO */
/**
 * x fix new item format
 * - add tooltip with text to add your server with a link to the form
 */

const Tooltip: React.FC<Props> = (props) => {
  const { data: user } = useStorageQuery('user');
  const { error, isFetching, isLoading, item, refetch } = useItemFetcher(props.itemId);
  const isClassicWowhead = useIsClassicWowhead();

  if (!user?.version) {
    return null;
  }

  /** @TODO Show link to change realm, let user know to set realm */
  if (isClassicWowhead && !user?.server.classic) {
    return null;
  }

  if (!isClassicWowhead && !user?.server.retail) {
    return null;
  }

  return (
    <table id={ELEMENT_ID.TOOLTIP}>
      <tbody>
        <tr>
          <td>
            <table className="w-full">
              <tbody>
                {props.layout != null && (
                  React.cloneElement(props.layout, {
                    itemId: props.itemId,
                  })
                )}
                <tr>
                  <td>
                    {typeof props.children === 'function'
                      ? props.children({ error: !!error, item, loading: isLoading || isFetching, getItem: refetch })
                      : props.children}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>

          <th className="!bg-right-top" />
        </tr>

        <tr>
          <th className="!bg-left-bottom" />
          <th className="!bg-right-bottom" />
        </tr>
      </tbody>
    </table>
  );
};

interface ChildrenFuncArgs {
  error: boolean;
  loading: boolean;
  item: i.MaybeAnyItem;
  getItem: i.ItemRefetchFn;
}

interface Props {
  itemId: number;
  children: null | JSX.Element | ((args: ChildrenFuncArgs) => JSX.Element | null);
  layout?: React.ReactElement;
}

export default Tooltip;
