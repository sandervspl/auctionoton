import { useWowhead } from 'hooks/useWowhead';
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
  const { version } = useWowhead();

  function getServerName(): string {
    if (!user) {
      return 'Unknown';
    }

    const _version = version === 'seasonal' ? 'era' : 'classic'; // Used to be 'era' so for backwards compatibility we change it from 'seasonal' to 'era'
    const activeVersion = user.isActive?.[_version] || version;
    const serverName = user.realms?.[activeVersion];
    const region = user.region?.toUpperCase();

    if (!serverName || !region) {
      return 'Unknown';
    }

    const faction = user.faction[serverName.name];

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
