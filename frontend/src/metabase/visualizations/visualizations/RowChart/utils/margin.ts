import { RowValue } from "metabase-types/api";
import { measureText } from "metabase/lib/measure-text";
import { Margin } from "../RowChartView/types/margin";
import { ChartFont } from "../RowChartView/types/style";
import { GroupedDataset } from "./data";

const CHART_PADDING = 10;
const TICKS_OFFSET = 10;
const GOAL_LINE_PADDING = 14;

export const getMaxWidth = (
  formattedYTicks: string[],
  ticksFont: ChartFont,
): number => {
  return Math.max(
    ...formattedYTicks.map(
      tick =>
        measureText(tick, {
          size: `${ticksFont.size}px`,
          family: "Lato",
          weight: String(ticksFont.weight ?? 400),
        }).width,
    ),
  );
};

export const getChartMargin = (
  data: GroupedDataset,
  yTickFormatter: (value: RowValue) => string,
  ticksFont: ChartFont,
  hasGoalLine: boolean,
): Margin => {
  const yTicksWidth = getMaxWidth(
    data.map(datum => yTickFormatter(datum.dimensionValue)),
    ticksFont,
  );

  const margin: Margin = {
    top: CHART_PADDING + (hasGoalLine ? GOAL_LINE_PADDING : 0),
    left: yTicksWidth + TICKS_OFFSET + CHART_PADDING,
    bottom: CHART_PADDING + TICKS_OFFSET + ticksFont.size,
    right: CHART_PADDING,
  };

  return margin;
};
