import { useQueryStore } from "@/hooks/stores/use-query-store";
import { DockviewDefaultTab, IDockviewPanelHeaderProps } from "dockview";

export const DockviewCustomTab = (props: IDockviewPanelHeaderProps) => {
  const unallotQueryResultPanel = useQueryStore(
    (state) => state.unallotQueryResultPanel,
  );

  return (
    <DockviewDefaultTab
      closeActionOverride={() => {
        const params = props.params;
        if (params.lotNumber != null && params.contextId != null) {
          unallotQueryResultPanel(params.contextId, params.lotNumber);
        }

        props.api.close();
      }}
      {...props}
    />
  );
};
