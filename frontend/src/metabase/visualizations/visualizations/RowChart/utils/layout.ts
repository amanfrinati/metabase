export const getMaxYValuesCount = (
  viewportHeight: number,
  minBarWidth: number,
  isStacked: boolean,
  seriesCount: number,
) => {
  // TODO: include bar padding into the calculation
  const singleValueHeight = isStacked ? minBarWidth : minBarWidth * seriesCount;

  return Math.floor(viewportHeight / singleValueHeight);
};
