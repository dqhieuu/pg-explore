import { useQueryStore } from "@/hooks/stores/use-query-store";
import {
  DockviewDefaultTab,
  IDockviewPanelHeaderProps,
} from "@hieu_dq/dockview";

export const DockviewCustomTab = (props: IDockviewPanelHeaderProps) => {
  const signalSaveQueryEditors = useQueryStore(
    (state) => state.signalSaveQueryEditors,
  );


  return (
    <DockviewDefaultTab
      closeActionOverride={() => {
        const params = props.params;
        signalSaveQueryEditors([params.contextId]);

        // Wait for the next tick so that signalSaveQueryEditors can finish
        setTimeout(() => {
          props.api.close();
        }, 0);
      }}
      {...props}
    />
  );
};
