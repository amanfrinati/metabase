import { RowValue, VisualizationSettings } from "metabase-types/api";
import { formatValue } from "metabase/lib/formatting";
import { ChartColumns } from "./columns";

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

  const xTickFormatter = (value: any) => {
    // For multi-metrics charts we use the first metic column settings for formatting
    const metricColumn =
      "breakout" in chartColumns
        ? chartColumns.metric
        : chartColumns.metrics[0];

    return String(
      formatValue(value, {
        ...settings.column(metricColumn.column),
        jsx: false,
      }),
    );
  };

  return {
    yTickFormatter,
    xTickFormatter,
  };
};
