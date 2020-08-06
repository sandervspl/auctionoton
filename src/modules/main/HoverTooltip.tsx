import React from 'react';
import ReactDOM from 'react-dom';

import generateContainer from './generateContainer';
import { getItemNameFromUrl } from './getPageItem';
import Tooltip from './tooltip';


const HoverTooltip = (props: Props): JSX.Element | null => {
  const container = React.useRef(generateContainer(props.parent));
  const [itemName, setItemName] = React.useState<string | undefined>();

  React.useMemo(() => {
    container.current.style.display = 'none';

    const itemLinks = document.querySelectorAll('a[href^="/item="]');
    const itemLinksArr = Array.from(itemLinks) as HTMLAnchorElement[];

    for (const link of itemLinksArr) {
      link.addEventListener('mouseenter', () => {
        container.current.style.display = 'block';

        const itemNameFromUrl = getItemNameFromUrl(link.href);

        if (itemNameFromUrl) {
          setItemName(itemNameFromUrl);
        }
      });

      link.addEventListener('mouseout', () => {
        container.current.style.display = 'none';
      });
    }
  }, []);

  if (!itemName) {
    return null;
  }

  return ReactDOM.createPortal(
    <Tooltip itemName={itemName} />,
    container.current,
  );
};

type Props = {
  parent: Element;
}

export default HoverTooltip;
