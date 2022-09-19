import React, { useCallback, useMemo } from "react";
import { t } from "ttag";

import {
  GRAPH_DATA_SETTINGS,
  STACKABLE_SETTINGS,
  GRAPH_GOAL_SETTINGS,
  GRAPH_COLORS_SETTINGS,
  GRAPH_AXIS_SETTINGS,
  GRAPH_DISPLAY_VALUES_SETTINGS,
} from "metabase/visualizations/lib/settings/graph";
import { RowChartView } from "./RowChartView/RowChartView";
import {
  getGroupedDataset,
  getSeries,
  groupExcessiveData,
} from "metabase/visualizations/visualizations/RowChart/utils/data";
import { getAccentColors } from "metabase/lib/colors/groups";
import { formatValue } from "metabase/lib/formatting";
import {
  DatasetData,
  RowValue,
  VisualizationSettings,
} from "metabase-types/api";
import { ChartTheme } from "./RowChartView/types/style";
import { color } from "metabase/lib/colors";
import { isDimension, isMetric } from "metabase/lib/schema_metadata";
import { getMaxYValuesCount } from "./utils/layout";
import { getChartMargin, getMaxWidth } from "./utils/margin";
import { Margin } from "./RowChartView/types/margin";
import { getChartColumns } from "./utils/columns";
import { getClickData } from "./utils/events";
import { getFormatters } from "./utils/format";

const MIN_BAR_HEIGHT = 24;

type $FIXME = any;

interface RowChartProps {
  width: number;
  height: number;
  data: DatasetData;
  settings: VisualizationSettings;
  visualizationIsClickable: $FIXME;
  onVisualizationClick: $FIXME;
}

const RowChart = ({
  width,
  height,
  settings,
  data,
  visualizationIsClickable,
  onVisualizationClick,
  ...props
}: RowChartProps) => {
  const chartColumns = useMemo(
    () => getChartColumns(data, settings),
    [data, settings],
  );
  const colors = useMemo(() => getAccentColors(), []);
  const groupedData = useMemo(
    () => getGroupedDataset(data, chartColumns),
    [chartColumns, data],
  );
  const series = useMemo(
    () => getSeries(data, chartColumns, colors),
    [chartColumns, colors, data],
  );

  const handleClick = (
    event: React.MouseEvent,
    seriesIndex: number,
    datumIndex: number,
  ) => {
    const clickData = getClickData(
      seriesIndex,
      datumIndex,
      series,
      groupedData,
      data,
      chartColumns,
    );

    onVisualizationClick({ ...clickData, element: event.target });
  };

  const goal = settings["graph.show_goal"]
    ? {
        value: settings["graph.goal_value"] ?? 0,
        label: settings["graph.goal_label"],
      }
    : undefined;

  const theme: ChartTheme = useMemo(
    () => ({
      axis: {
        color: color("bg-dark"),
        ticksFontSize: 12,
        ticksFontWeight: 700,
      },
      goal: {
        color: color("text-medium"),
        fontSize: 14,
        fontWeight: 700,
      },
      dataLabels: {
        fontWeight: 700,
        color: color("text-dark"),
        fontSize: 14,
      },
      grid: {
        color: color("border"),
      },
    }),
    [],
  );

  const isStacked = settings["stackable.stack_type"] != null;
  const stackingOffset =
    settings["stackable.stack_type"] === "stacked" ? "none" : "expand";

  const maxYValues = getMaxYValuesCount(
    height,
    MIN_BAR_HEIGHT,
    isStacked,
    series.length,
  );

  const trimmedData = useMemo(
    () => groupExcessiveData(groupedData, maxYValues),
    [groupedData, maxYValues],
  );

  const { xTickFormatter, yTickFormatter } = useMemo(
    () => getFormatters(chartColumns, settings),
    [chartColumns, settings],
  );

  const margin = useMemo(
    () => getChartMargin(trimmedData, yTickFormatter),
    [trimmedData, yTickFormatter],
  );

  const shouldShowLabels =
    settings["graph.show_values"] &&
    !(isStacked && stackingOffset === "expand");

  return (
    <RowChartView
      margin={margin}
      theme={theme}
      width={width}
      height={height}
      data={trimmedData}
      series={series}
      goal={goal}
      onClick={visualizationIsClickable ? handleClick : undefined}
      yTickFormatter={yTickFormatter}
      xTickFormatter={xTickFormatter}
      shouldShowLabels={shouldShowLabels}
      isStacked={isStacked}
      stackingOffset={stackingOffset}
    />
  );
};

RowChart.uiName = t`Row`;
RowChart.identifier = "row";
RowChart.iconName = "horizontal_bar";
RowChart.noun = t`row chart`;

const stackingSettings = {
  "stackable.stack_type": {
    section: t`Display`,
    title: t`Stacking`,
    widget: "radio",
    default: null,
    props: {
      options: [
        { name: t`Don't stack`, value: null },
        { name: t`Stack`, value: "stacked" },
        { name: t`Stack - 100%`, value: "normalized" },
      ],
    },
  },
};

RowChart.supportsSeries = true;
RowChart.settings = {
  ...stackingSettings,
  ...GRAPH_GOAL_SETTINGS,
  ...GRAPH_COLORS_SETTINGS,
  ...GRAPH_AXIS_SETTINGS,
  ...GRAPH_DISPLAY_VALUES_SETTINGS,
  ...GRAPH_DATA_SETTINGS,
};

RowChart.isSensible = ({ cols, rows }: $FIXME) => {
  return (
    rows.length > 1 &&
    cols.length >= 2 &&
    cols.filter(isDimension).length > 0 &&
    cols.filter(isMetric).length > 0
  );
};

RowChart.isLiveResizable = (series: any[]) => {
  const totalRows = series.reduce((sum, s) => sum + s.data.rows.length, 0);
  return totalRows < 10;
};

// rename these settings
RowChart.settings["graph.metrics"] = {
  ...RowChart.settings["graph.metrics"],
  title: t`X-axis`,
};
RowChart.settings["graph.dimensions"] = {
  ...RowChart.settings["graph.dimensions"],
  title: t`Y-axis`,
};

RowChart.seriesAreCompatible = () => true;

export default RowChart;
