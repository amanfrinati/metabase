import styled from "styled-components";
import { color } from "metabase/lib/colors";
import ActionButton from "metabase/components/ActionButton";
import DefaultTimeline from "metabase/components/Timeline";

export const Timeline = styled(DefaultTimeline)`
  padding-bottom: 1em;
`;

export const RevertButton = styled(ActionButton).attrs({
  successClassName: "",
  failedClassName: "",
})`
  padding: 0;
  border: none;
  color: ${color("text-dark")};
  font-size: 0.875em;

  &:hover {
    background-color: transparent;
    color: ${color("accent3")};
  }
`;
