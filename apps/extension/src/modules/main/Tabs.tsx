/* eslint-disable jsx-a11y/anchor-is-valid */
import * as React from 'react';
type Props = {
  tabs: string[];
  onTabChange?: (tab: number) => void;
};

export const Tabs: React.FC<Props> = (props) => {
  const [activeTabIndex, setActiveTabIndex] = React.useState(0);

  return (
    <div className="tabs-container auc-mb-2">
      <ul className="tabs">
        {props.tabs.map((tab, i) => (
          <li
            key={tab}
            data-selected={activeTabIndex === i}
            data-first-in-row={i === 0}
            onClick={() => {
              setActiveTabIndex(i);
              props.onTabChange?.(i);
            }}
          >
            <a rel="np">
              <div>{tab}</div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
