import * as React from 'react';

type Props = {
  tabs: string[];
  onTabChange?: (tab: number) => void;
};

export const Tabs: React.FC<Props> = (props) => {
  const [activeTabIndex, setActiveTabIndex] = React.useState(0);

  return (
    <div className="tabs-container !auc-mx-0 auc-mb-2 !auc-w-fit auc-max-w-full">
      <div className="tabs">
        {props.tabs.map((tab, i) => (
          <button
            key={tab}
            type="button"
            className="!auc-px-2 !auc-py-1 !auc-text-xs"
            data-selected={activeTabIndex === i}
            aria-pressed={activeTabIndex === i}
            onClick={() => {
              setActiveTabIndex(i);
              props.onTabChange?.(i);
            }}
          >
            <div>{tab}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
