import {
  DatasetColumn,
  DatasetData,
  VisualizationSettings,
} from "metabase-types/api";

export type ColumnDescriptor = {
  index: number;
  column: DatasetColumn;
};

export const getColumnDescriptors = (
  columnNames: string[],
  columns: DatasetColumn[],
): ColumnDescriptor[] => {
  return columnNames.map(columnName => {
    const index = columns.findIndex(column => column.name === columnName);
    return {
      index,
      column: columns[index],
    };
  });
};

export type BreakoutChartColumns = {
  dimension: ColumnDescriptor;
  breakout: ColumnDescriptor;
  metric: ColumnDescriptor;
};

export type MultipleMetricsChartColumns = {
  dimension: ColumnDescriptor;
  metrics: ColumnDescriptor[];
};

export type ChartColumns = BreakoutChartColumns | MultipleMetricsChartColumns;

export const getChartColumns = (
  data: DatasetData,
  visualizationSettings: VisualizationSettings,
): ChartColumns => {
  const [dimension, breakout] = getColumnDescriptors(
    visualizationSettings["graph.dimensions"] ?? [],
    data.cols,
  );

  const metrics = getColumnDescriptors(
    visualizationSettings["graph.metrics"] ?? [],
    data.cols,
  );

  if (breakout) {
    return {
      dimension,
      breakout,
      metric: metrics[0],
    };
  }

  return {
    dimension,
    metrics,
  };
};
