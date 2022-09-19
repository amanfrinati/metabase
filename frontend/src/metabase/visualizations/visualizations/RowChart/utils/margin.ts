import { RowValue } from "metabase-types/api";
import { measureText } from "metabase/lib/measure-text";
import { Margin } from "../RowChartView/types/margin";
import { GroupedDataset } from "./data";

export const getMaxWidth = (formattedYTicks: string[]): number => {
  return Math.max(
    ...formattedYTicks.map(
      tick =>
        measureText(tick, {
          size: `14px`,
          family: "Lato",
          weight: "700",
        }).width,
    ),
  );
};

export const getChartMargin = (
  data: GroupedDataset,
  yTickFormatter: (value: RowValue) => string,
): Margin => {
  const yTicksWidth = getMaxWidth(
    data.map(datum => yTickFormatter(datum.dimensionValue)),
  );

  const margin: Margin = {
    top: 20,
    left: yTicksWidth + 10,
    bottom: 40,
    right: 20,
  };

  return margin;
};
