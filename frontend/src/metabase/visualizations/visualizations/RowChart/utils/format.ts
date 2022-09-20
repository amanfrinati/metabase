import { RowValue, VisualizationSettings } from "metabase-types/api";
import { formatValue } from "metabase/lib/formatting";
import { ChartColumns } from "./columns";
import { getStackingOffset } from "./stacking";

export const getFormatters = (
  chartColumns: ChartColumns,
  settings: VisualizationSettings,
) => {
  const yTickFormatter = (value: RowValue) => {
    return String(
      formatValue(value, {
        ...settings.column(chartColumns.dimension.column),
        jsx: false,
      }),
    );
  };

  // For multi-metrics charts we use the first metic column settings for formatting
  const metricColumn =
    "breakout" in chartColumns ? chartColumns.metric : chartColumns.metrics[0];

  const percentXTicksFormatter = (percent: any) =>
    String(
      formatValue(percent, {
        column: metricColumn.column,
        number_separators: settings.column(metricColumn.column)
          .number_separators,
        jsx: false,
        number_style: "percent",
        decimals: 2,
      }),
    );

  const xTickFormatter = (value: any) =>
    String(
      formatValue(value, {
        ...settings.column(metricColumn.column),
        jsx: false,
      }),
    );

  const shouldFormatXTicksAsPercent = getStackingOffset(settings) === "expand";

  return {
    yTickFormatter,
    xTickFormatter: shouldFormatXTicksAsPercent
      ? percentXTicksFormatter
      : xTickFormatter,
  };
};
