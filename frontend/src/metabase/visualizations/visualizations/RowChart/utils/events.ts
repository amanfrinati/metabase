import { DatasetData, VisualizationSettings } from "metabase-types/api";
import { isMetric } from "metabase/lib/schema_metadata";
import { Series } from "../RowChartView/types/series";
import { getColumnDescriptors } from "./columns";
import { GroupedDataset, GroupedDatum, SeriesInfo } from "./data";

export const getClickData = (
  seriesIndex: number,
  datumIndex: number,
  series: Series<GroupedDatum, SeriesInfo>[],
  groupedData: GroupedDataset,
  data: DatasetData,
  visualizationSettings: VisualizationSettings,
) => {
  const dimensionDescriptors = getColumnDescriptors(
    visualizationSettings["graph.dimensions"] ?? [],
    data.cols,
  );

  const metricColumns = data.cols.filter(isMetric).map(column => column.name);
  const metricDescriptors = getColumnDescriptors(metricColumns, data.cols);

  const clickedSeries = series[seriesIndex];
  const datum = groupedData[datumIndex];

  const value = clickedSeries.xAccessor(datum);

  return {
    value,
    column: data.cols[metricDescriptors[0].index],
    data: [],
    dimensions: dimensionDescriptors.map(dimension => {
      return {
        column: data.cols[dimension.index],
        value: datum.dimensionValue,
      };
    }),
    settings: visualizationSettings,
  };
};
