import useStorageQuery from 'hooks/useStorageQuery';
import React from 'react';

type Props = {
  id: string;
  hideServerName?: boolean;
  header?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export const TooltipBody: React.FC<Props> = (props) => {
  const { data: user } = useStorageQuery('user');

  function getServerName(): string {
    const serverName = user?.server.classic;
    const region = user?.region?.toUpperCase();

    if (!serverName) {
      return 'Unknown';
    }

    const faction = user.faction[serverName.slug];

    return `${serverName.name} ${region}-${faction}`;
  }

  return (
    <table id={props.id} className={props.className} style={props.style}>
      <tbody>
        <tr>
          <td>
            <table className="!auc-block !auc-w-full">
              <tbody className="!auc-block !auc-w-full">
                <tr className="auc-block auc-w-full">
                  <td>
                    {props.hideServerName ? null : (
                      <span className="q whtt-extra whtt-ilvl">
                        <span className="auc-capitalize">{getServerName()}</span>
                      </span>
                    )}
                    {props.header}
                  </td>
                </tr>
                {props.children}
              </tbody>
            </table>
          </td>

          <th className="!auc-bg-right-top" />
        </tr>

        <tr>
          <th className="!auc-bg-left-bottom" />
          <th className="!auc-bg-right-bottom" />
        </tr>
      </tbody>
    </table>
  );
};
