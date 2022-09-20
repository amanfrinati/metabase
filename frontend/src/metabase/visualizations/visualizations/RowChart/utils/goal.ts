import { VisualizationSettings } from "metabase-types/api";
import { getStackingOffset } from "./stacking";

const getGoalValue = (value: number, isPercent: boolean) =>
  isPercent ? value / 100 : value;

export const getChartGoal = (settings: VisualizationSettings) => {
  const isPercent = getStackingOffset(settings) === "expand";

  return settings["graph.show_goal"]
    ? {
        value: getGoalValue(settings["graph.goal_value"] ?? 0, isPercent),
        label: settings["graph.goal_label"],
      }
    : undefined;
};
