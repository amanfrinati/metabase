import React, { useCallback, useMemo } from "react";
import { t } from "ttag";

import { getIn } from "icepick";
import _ from "underscore";
import {
  GRAPH_DATA_SETTINGS,
  GRAPH_GOAL_SETTINGS,
  GRAPH_COLORS_SETTINGS,
  GRAPH_AXIS_SETTINGS,
  GRAPH_DISPLAY_VALUES_SETTINGS,
} from "metabase/visualizations/lib/settings/graph";
import { getColorsForValues } from "metabase/lib/colors/charts";
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
import { color } from "metabase/lib/colors";
import { isDimension, isMetric } from "metabase/lib/schema_metadata";
import { RowChartView } from "./RowChartView/RowChartView";
import { ChartTheme } from "./RowChartView/types/style";
import { getMaxYValuesCount } from "./utils/layout";
import { getChartMargin, getMaxWidth } from "./utils/margin";
import { Margin } from "./RowChartView/types/margin";
import { getChartColumns } from "./utils/columns";
import { getClickData } from "./utils/events";
import { getFormatters } from "./utils/format";
import { getStackingOffset } from "./utils/stacking";
import { getChartGoal } from "./utils/goal";
import { getChartTheme } from "./utils/theme";
import { getSeriesColors } from "./utils/colors";

const MIN_BAR_HEIGHT = 24;

type $FIXME = any;

interface RowChartProps {
  className: string;
  width: number;
  height: number;
  data: DatasetData;
  settings: VisualizationSettings;
  visualizationIsClickable: $FIXME;
  onVisualizationClick: $FIXME;
}

const RowChart = ({
  className,
  width,
  height,
  settings,
  data,
  visualizationIsClickable,
  onVisualizationClick,
  ...props
}: RowChartProps) => {
  console.log(">>>set", settings);
  const chartColumns = useMemo(
    () => getChartColumns(data, settings),
    [data, settings],
  );

  const groupedData = useMemo(
    () => getGroupedDataset(data, chartColumns),
    [chartColumns, data],
  );
  const series = useMemo(
    () => getSeries(data, chartColumns),
    [chartColumns, data],
  );

  const seriesColors = useMemo(
    () => getSeriesColors(settings, series),
    [series, settings],
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
      settings,
      chartColumns,
    );

    onVisualizationClick({ ...clickData, element: event.target });
  };

  const goal = useMemo(() => getChartGoal(settings), [settings]);

  const theme: ChartTheme = useMemo(getChartTheme, []);

  const stackingOffset = getStackingOffset(settings);

  const maxYValues = getMaxYValuesCount(
    height,
    MIN_BAR_HEIGHT,
    stackingOffset != null,
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
    () =>
      getChartMargin(
        trimmedData,
        yTickFormatter,
        theme.axis.ticks,
        goal != null,
      ),
    [goal, theme.axis.ticks, trimmedData, yTickFormatter],
  );

  const shouldShowLabels =
    settings["graph.show_values"] && stackingOffset !== "expand";

  return (
    <div className={className} style={{ overflow: "hidden" }}>
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
        stackingOffset={stackingOffset}
        seriesColors={seriesColors}
      />
    </div>
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

RowChart.settings = {
  ...stackingSettings,
  "graph.show_values": {
    section: t`Display`,
    title: t`Show values on data points`,
    widget: "toggle",
    getHidden: (_series: any[], vizSettings: VisualizationSettings) =>
      vizSettings["stackable.stack_type"] === "normalized",
    default: false,
  },
  ...GRAPH_GOAL_SETTINGS,
  ...GRAPH_DATA_SETTINGS,
  // ...GRAPH_AXIS_SETTINGS,
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

/**
 * Required to make it compatible with series settings without rewriting them fully
 * It expands a single card + dataset into multiple "series" and sets _seriesKey which is needed for settings to work
 */
RowChart.transformSeries = (originalMultipleSeries: any) => {
  const [series] = originalMultipleSeries;

  if (series.card._transformed) {
    return originalMultipleSeries;
  }

  const { card, data } = series;
  const chartColumns = getChartColumns(data, card.visualization_settings);

  return getSeries(data, chartColumns)
    .map(s => s.seriesKey)
    .map(seriesKey => {
      const seriesCard = {
        ...card,
        name: seriesKey,
        _seriesKey: seriesKey,
        _transformed: true,
      };
      return { card: seriesCard, data };
    });
};

export default RowChart;
