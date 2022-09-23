import React, { useMemo, useState } from "react";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Line } from "@visx/shape";
import { scaleBand } from "@visx/scale";
import type { Series as D3Series, SeriesPoint } from "d3-shape";
import { stack, stackOffsetExpand, stackOffsetNone } from "d3-shape";
import type { NumberValue, ScaleBand, ScaleLinear } from "d3-scale";
import { Text } from "@visx/text";
import { GridColumns } from "@visx/grid";
import { Series } from "./types/series";
import { createStackedXScale, createXScale, createYScale } from "./utils/scale";
import { ChartTheme } from "./types/style";
import { Margin } from "./types/margin";
import { ChartBar } from "./RowChartView.styled";

const MIN_TICKS_COUNT = 2;

type StackingOffset = "none" | "expand";

const StackingOffsetFn = {
  none: stackOffsetNone,
  expand: stackOffsetExpand,
} as const;

interface RowChartViewProps<TDatum> {
  width: number;
  height: number;
  data: TDatum[];
  series: Series<TDatum>[];
  shouldShowLabels?: boolean;
  stackingOffset: StackingOffset | null;
  onHoverChange?: (seriesIndex: number | null, barIndex: number | null) => void;
  onClick?: (
    event: React.MouseEvent,
    seriesIndex: number,
    barIndex: number,
  ) => void;
  yTickFormatter: (value: string | number) => string;
  xTickFormatter: (value: NumberValue) => string;
  goal?: {
    label?: string;
    value: number;
  };
  theme: ChartTheme;
  margin: Margin;
  seriesColors: Record<string, string>;
}

export type BarDimensions = {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  value: number | null;
};

const getNonStackedBar = <TDatum,>(
  datum: TDatum,
  series: Series<TDatum>,
  xScale: ScaleLinear<number, number, never>,
  yScale: ScaleBand<string>,
  innerBarScale: ScaleBand<number> | null,
  seriesIndex: number,
): BarDimensions | null => {
  const yValue = series.yAccessor(datum);
  const xValue = series.xAccessor(datum);
  const isNegative = xValue != null && xValue < 0;

  if (xValue == null) {
    return null;
  }

  const x = xScale(isNegative ? xValue : 0);
  const width = Math.abs(xScale(isNegative ? 0 : xValue) - x);

  const height = innerBarScale?.bandwidth() ?? yScale.bandwidth();
  const innerY = innerBarScale?.(seriesIndex) ?? 0;
  const y = innerY + (yScale(yValue) ?? 0);

  return {
    x,
    y,
    height,
    width,
    value: xValue,
  };
};

const getStackedBar = <TDatum,>(
  stackedDatum: SeriesPoint<TDatum>,
  series: Series<TDatum>,
  xScale: ScaleLinear<number, number, never>,
  yScale: ScaleBand<string>,
): BarDimensions | null => {
  const [xStartDomain, xEndDomain] = stackedDatum;

  const x = xScale(xStartDomain);
  const width = Math.abs(xScale(xEndDomain) - x);

  const height = yScale.bandwidth();
  const y = yScale(series.yAccessor(stackedDatum.data)) ?? 0;

  return {
    x,
    y,
    height,
    width,
    value: xEndDomain,
  };
};

export const RowChartView = <TDatum,>({
  width,
  height,
  data,
  goal,
  series: multipleSeries,
  shouldShowLabels,
  stackingOffset = null,
  theme,
  margin,
  yTickFormatter,
  xTickFormatter,
  onHoverChange,
  seriesColors,
  onClick,
}: RowChartViewProps<TDatum>) => {
  const [hoveredSeriesIndex, setHoveredSeriesIndex] = useState<number | null>();

  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  const seriesByKey = useMemo(() => {
    return multipleSeries.reduce((acc, series) => {
      acc[series.seriesKey] = series;
      return acc;
    }, {} as Record<string, Series<TDatum>>);
  }, [multipleSeries]);

  const isStacked = stackingOffset != null;

  const d3stack = useMemo(
    () =>
      stack<TDatum>()
        .keys(multipleSeries.map(s => s.seriesKey))
        .value((datum, seriesKey) => {
          return seriesByKey[seriesKey].xAccessor(datum) ?? 0;
        })
        .offset(StackingOffsetFn[stackingOffset ?? "none"]),
    [multipleSeries, seriesByKey, stackingOffset],
  );
  const stackedData: D3Series<TDatum, string>[] = useMemo(
    () => d3stack(data),
    [d3stack, data],
  );

  const yScale = createYScale(data, multipleSeries, yMax);
  const additionalXValues = [goal?.value ?? 0];
  const xScale = isStacked
    ? createStackedXScale(stackedData, additionalXValues, [0, xMax])
    : createXScale(data, multipleSeries, additionalXValues, [0, xMax]);

  const innerBarScale = isStacked
    ? null
    : scaleBand({
        domain: multipleSeries.map((_, index) => index),
        range: [0, yScale.bandwidth()],
      });

  const handleBarMouseEnter = (seriesIndex: number, barIndex: number) => {
    setHoveredSeriesIndex(seriesIndex);
    onHoverChange?.(seriesIndex, barIndex);
  };

  const handleBarMouseLeave = () => {
    setHoveredSeriesIndex(null);
    onHoverChange?.(null, null);
  };

  const handleClick = (
    event: React.MouseEvent,
    seriesIndex: number,
    datumIndex: number,
  ) => {
    onClick?.(event, seriesIndex, datumIndex);
  };

  const goalLineValue = xScale(goal?.value ?? 0);
  const xTicksCount = Math.max(
    MIN_TICKS_COUNT,
    Math.floor(xMax / theme.axis.minTicksInterval),
  );

  return (
    <svg width={width} height={height}>
      <Group top={margin.top} left={margin.left}>
        <GridColumns
          scale={xScale}
          height={yMax}
          stroke={theme.grid.color}
          numTicks={xTicksCount}
        />
        <AxisLeft
          tickFormat={yTickFormatter}
          hideTicks
          numTicks={Infinity}
          scale={yScale}
          stroke={theme.axis.color}
          tickStroke={theme.axis.color}
          tickLabelProps={() => ({
            fill: theme.axis.color,
            fontSize: theme.axis.ticks.size,
            fontWeight: theme.axis.ticks.weight,
            textAnchor: "end",
            dy: "0.33em",
          })}
        />
        <AxisBottom
          hideTicks
          numTicks={xTicksCount}
          tickFormat={xTickFormatter}
          top={yMax}
          scale={xScale}
          stroke={theme.axis.color}
          tickStroke={theme.axis.color}
          tickLabelProps={() => ({
            fill: theme.axis.color,
            fontSize: theme.axis.ticks.size,
            fontWeight: theme.axis.ticks.weight,
            textAnchor: "middle",
          })}
        />
        {multipleSeries.map((series, seriesIndex) => {
          return data.map((datum, datumIndex) => {
            let bar: BarDimensions | null = null;

            if (isStacked) {
              const stackedDatum = stackedData[seriesIndex][datumIndex];
              bar = getStackedBar(stackedDatum, series, xScale, yScale);
            } else {
              bar = getNonStackedBar(
                datum,
                series,
                xScale,
                yScale,
                innerBarScale,
                seriesIndex,
              );
            }

            if (bar?.value == null) {
              return null;
            }

            const { x, y, width, height, value } = bar;

            const hasSeriesHover = hoveredSeriesIndex != null;
            const isSeriesHovered = hoveredSeriesIndex === seriesIndex;
            const opacity = isSeriesHovered || !hasSeriesHover ? 1 : 0.6;
            const isNegative = value < 0;

            const isLabelVisible =
              shouldShowLabels &&
              value != null &&
              (!isStacked || seriesIndex === multipleSeries.length - 1);

            return (
              <>
                <ChartBar
                  key={`${series.seriesKey}:${datumIndex}`}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={seriesColors[series.seriesKey]}
                  opacity={opacity}
                  onClick={event => handleClick(event, seriesIndex, datumIndex)}
                  onMouseEnter={() =>
                    handleBarMouseEnter(seriesIndex, datumIndex)
                  }
                  onMouseLeave={handleBarMouseLeave}
                />
                {isLabelVisible && (
                  <Text
                    fontSize={theme.dataLabels.size}
                    fill={theme.dataLabels.color}
                    fontWeight={theme.dataLabels.weight}
                    dx="0.33em"
                    x={isNegative ? x : x + width}
                    y={y + height / 2}
                    verticalAnchor="middle"
                  >
                    {value}
                  </Text>
                )}
              </>
            );
          });
        })}

        {/* TODO: consolidate with the static viz if it makes sense */}
        {goal && (
          <>
            <Text
              y={0}
              textAnchor="start"
              verticalAnchor="end"
              dy="-0.2em"
              x={goalLineValue}
              fill={theme.goal.label.color}
              fontSize={theme.goal.label.size}
              fontWeight={theme.goal.label.weight}
            >
              {goal?.label}
            </Text>
            <Line
              strokeDasharray={4}
              stroke={theme.goal.lineStroke}
              strokeWidth={2}
              y1={0}
              y2={yMax}
              x1={goalLineValue}
              x2={goalLineValue}
            />
          </>
        )}
      </Group>
    </svg>
  );
};
