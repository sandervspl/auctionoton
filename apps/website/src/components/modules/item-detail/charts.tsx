'use client';

import { type LineSvgProps, ResponsiveLine } from '@nivo/line';
import { CoinValue } from 'common/coin-value';
import { useId } from 'react';
// import { ResponsiveBar } from '@nivo/bar';

// export function BarChart(props) {
//   return (
//     <div {...props}>
//       <ResponsiveBar
//         data={[
//           { name: 'Jan', count: 111 },
//           { name: 'Feb', count: 157 },
//           { name: 'Mar', count: 129 },
//           { name: 'Apr', count: 150 },
//           { name: 'May', count: 119 },
//           { name: 'Jun', count: 72 },
//         ]}
//         keys={['count']}
//         indexBy="name"
//         margin={{ top: 0, right: 0, bottom: 40, left: 40 }}
//         padding={0.3}
//         colors={['#2563eb']}
//         axisBottom={{
//           tickSize: 0,
//           tickPadding: 16,
//         }}
//         axisLeft={{
//           tickSize: 0,
//           tickValues: 4,
//           tickPadding: 16,
//         }}
//         gridYValues={4}
//         theme={{
//           tooltip: {
//             chip: {
//               borderRadius: '9999px',
//             },
//             container: {
//               fontSize: '12px',
//               textTransform: 'capitalize',
//               borderRadius: '6px',
//             },
//           },
//           grid: {
//             line: {
//               stroke: '#f3f4f6',
//             },
//           },
//         }}
//         tooltipLabel={({ id }) => `${id}`}
//         enableLabel={false}
//         role="application"
//         ariaLabel="A bar chart showing data"
//       />
//     </div>
//   );
// }

export function CurvedlineChart({
  lineProps,
  ...props
}: {
  className?: string;
  data: { x: string; y: number }[];
  lineProps?: Omit<LineSvgProps, 'data'>;
}) {
  const id = useId();

  return (
    <div {...props}>
      <ResponsiveLine
        data={[
          {
            id,
            data: props.data,
          },
        ]}
        margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
        xScale={{
          type: 'point',
        }}
        yScale={{
          type: 'linear',
          min: 0,
          max: 'auto',
        }}
        //@ts-ignore
        yFormat={(value) => <CoinValue value={value as number} />}
        curve="linear"
        axisBottom={{
          tickSize: 1,
          tickPadding: 16,
        }}
        axisLeft={{
          tickSize: 0,
          tickValues: 5,
          tickPadding: 16,
        }}
        colors={['#FFD700']}
        pointSize={6}
        useMesh={true}
        gridYValues={6}
        theme={{
          tooltip: {
            chip: {
              borderRadius: '9999px',
              color: '#000',
            },
            container: {
              fontSize: '12px',
              textTransform: 'capitalize',
              borderRadius: '6px',
              background: '#000',
              color: '#FFF',
              border: '1px solid #848484',
            },
          },
          grid: {
            line: {
              stroke: '#585858',
            },
          },
          axis: {
            ticks: {
              text: {
                fill: '#828282',
              },
            },
          },
          crosshair: {
            line: {
              stroke: '#FFF',
            },
          },
        }}
        role="application"
        {...lineProps}
      />
    </div>
  );
}
