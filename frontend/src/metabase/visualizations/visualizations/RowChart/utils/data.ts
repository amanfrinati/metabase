import { t } from "ttag";
import { isMetric } from "metabase/lib/schema_metadata";
import {
  DatasetColumn,
  DatasetData,
  RowValue,
  RowValues,
} from "metabase-types/api";
import { Series } from "../RowChartView/types/series";
import {
  ChartColumns,
  ColumnDescriptor,
  getColumnDescriptors,
} from "./columns";

export type MetricValue = number | null;

export type MetricName = string;
export type BreakoutName = string;

export type MetricDatum = { [key: MetricName]: MetricValue };

export type SeriesInfo = {
  metricColumn: DatasetColumn;
  dimensionColumn: DatasetColumn;
};

export type GroupedDatum = {
  dimensionValue: RowValue;
  metrics: MetricDatum;
  breakout?: { [key: BreakoutName]: MetricDatum };
};

export type GroupedDataset = GroupedDatum[];

const getMetricValue = (value: RowValue): MetricValue => {
  if (typeof value === "number") {
    return value;
  }

  return null;
};

const sumMetrics = (left: MetricDatum, right: MetricDatum): MetricDatum => {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return Array.from(keys).reduce<MetricDatum>((datum, metricKey) => {
    const leftValue = left[metricKey];
    const rightValue = right[metricKey];

    if (typeof leftValue === "number" || typeof rightValue === "number") {
      datum[metricKey] = (leftValue ?? 0) + (rightValue ?? 0);
    } else {
      datum[metricKey] = null;
    }

    return datum;
  }, {});
};

const groupDataByDimensions = (
  rows: RowValues[],
  chartColumns: ChartColumns,
  allMetrics: ColumnDescriptor[],
): GroupedDataset => {
  const { dimension } = chartColumns;

  const groupedData = new Map<RowValue, GroupedDatum>();

  for (const row of rows) {
    const dimensionValue = row[dimension.index];

    const datum = groupedData.get(dimensionValue) ?? {
      dimensionValue,
      metrics: {},
    };

    const rowMetrics = allMetrics.reduce<MetricDatum>((datum, metric) => {
      datum[metric.column.name] = getMetricValue(row[metric.index]);
      return datum;
    }, {});

    datum.metrics = sumMetrics(rowMetrics, datum.metrics);

    if ("breakout" in chartColumns) {
      const breakoutName = String(row[chartColumns.breakout.index]);

      datum.breakout ??= {};
      datum.breakout = {
        ...datum.breakout,
        [breakoutName]: sumMetrics(
          rowMetrics,
          datum.breakout[breakoutName] ?? {},
        ),
      };
    }

    groupedData.set(dimensionValue, datum);
  }

  return Array.from(groupedData.values());
};

export const getGroupedDataset = (
  data: DatasetData,
  chartColumns: ChartColumns,
): GroupedDataset => {
  const allMetricColumns = data.cols
    .filter(isMetric)
    .map(column => column.name);
  const allMetricDescriptors = getColumnDescriptors(
    allMetricColumns,
    data.cols,
  );

  return groupDataByDimensions(data.rows, chartColumns, allMetricDescriptors);
};

export const groupExcessiveData = (
  dataset: GroupedDataset,
  valuesLimit: number,
): GroupedDataset => {
  if (dataset.length <= valuesLimit) {
    return dataset;
  }

  const groupStartingFromIndex = valuesLimit - 1;
  const result = dataset.slice();
  const dataToGroup = result.splice(groupStartingFromIndex - 1);

  const groupedDatumDimensionValue = valuesLimit > 1 ? t`Other` : t`All values`;
  const groupedValuesDatum = dataToGroup.reduce(
    (groupedValue, currentValue) => {
      groupedValue.metrics = sumMetrics(
        groupedValue.metrics,
        currentValue.metrics,
      );

      Object.keys(currentValue.breakout ?? {}).map(breakoutName => {
        groupedValue.breakout ??= {};

        groupedValue.breakout[breakoutName] = sumMetrics(
          groupedValue.breakout[breakoutName] ?? {},
          currentValue.breakout?.[breakoutName] ?? {},
        );
      });

      return groupedValue;
    },
    {
      dimensionValue: groupedDatumDimensionValue,
      metrics: {},
      breakout: {},
    },
  );

  return [...result, groupedValuesDatum];
};

const getBreakoutDistinctValues = (
  data: DatasetData,
  breakout: ColumnDescriptor,
) => {
  return Array.from(new Set(data.rows.map(row => String(row[breakout.index]))));
};

const getBreakoutSeries = (
  breakoutValues: string[],
  metric: ColumnDescriptor,
  dimension: ColumnDescriptor,
  colors: string[],
): Series<GroupedDatum, SeriesInfo>[] => {
  return breakoutValues.map((breakoutName, seriesIndex) => {
    return {
      seriesKey: breakoutName,
      yAccessor: (datum: GroupedDatum) => String(datum.dimensionValue),
      xAccessor: (datum: GroupedDatum) =>
        datum.breakout?.[breakoutName]?.[metric.column.name] ?? null,
      color: colors[seriesIndex % colors.length],
      seriesInfo: {
        metricColumn: metric.column,
        dimensionColumn: dimension.column,
      },
    };
  });
};

const getMultipleMetricSeries = (
  dimension: ColumnDescriptor,
  metrics: ColumnDescriptor[],
  colors: string[],
): Series<GroupedDatum, SeriesInfo>[] => {
  return metrics.map((metric, seriesIndex) => {
    return {
      seriesKey: metric.column.name,
      yAccessor: (datum: GroupedDatum) => String(datum.dimensionValue),
      xAccessor: (datum: GroupedDatum) => datum.metrics[metric.column.name],
      color: colors[seriesIndex % colors.length],
      seriesInfo: {
        dimensionColumn: dimension.column,
        metricColumn: metric.column,
      },
    };
  });
};

export const getSeries = (
  data: DatasetData,
  chartColumns: ChartColumns,
  colors: string[],
): Series<GroupedDatum, SeriesInfo>[] => {
  if ("breakout" in chartColumns) {
    const breakoutValues = getBreakoutDistinctValues(
      data,
      chartColumns.breakout,
    );

    return getBreakoutSeries(
      breakoutValues,
      chartColumns.metric,
      chartColumns.dimension,
      colors,
    );
  }

  return getMultipleMetricSeries(
    chartColumns.dimension,
    chartColumns.metrics,
    colors,
  );
};
