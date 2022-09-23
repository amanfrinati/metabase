import { scaleBand, scaleLinear } from "@visx/scale";
import type { Series as D3Series } from "d3-shape";
import { Series } from "../types/series";
import { createStackedXDomain, createXDomain, createYDomain } from "./domain";

export const createYScale = <TDatum>(
  data: TDatum[],
  series: Series<TDatum>[],
  chartHeight: number,
) => {
  return scaleBand({
    domain: createYDomain(data, series),
    range: [0, chartHeight],
    padding: 0.2,
  });
};

export const createXScale = <TDatum>(
  data: TDatum[],
  series: Series<TDatum>[],
  additionalValues: number[],
  range: [number, number],
) => {
  return scaleLinear({
    domain: createXDomain(data, series, additionalValues),
    range,
    nice: true,
  });
};

export const createStackedXScale = <TDatum>(
  stackedSeries: D3Series<TDatum, string>[],
  additionalValues: number[],
  range: [number, number],
) => {
  return scaleLinear({
    domain: createStackedXDomain(stackedSeries, additionalValues),
    range,
    nice: true,
  });
};
