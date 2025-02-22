import { useQueryStore } from "@/hooks/stores/use-query-store";
import { DockviewDefaultTab, IDockviewPanelHeaderProps } from "dockview";

export const DockviewCustomTab = (props: IDockviewPanelHeaderProps) => {
  const deallotQueryResult = useQueryStore((state) => state.unallotQueryResult);

  return (
    <DockviewDefaultTab
      closeActionOverride={() => {
        const params = props.params;
        if (params.lotNumber != null && params.contextId != null) {
          deallotQueryResult(params.contextId, params.lotNumber);
        }

        props.api.close();
      }}
      {...props}
    />
  );
};
