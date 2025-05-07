import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { usePostgresStore } from "@/hooks/stores/use-postgres-store.ts";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db.ts";
import { pgExtensions } from "@/lib/pglite/pg-utils.ts";

export const ExtensionListDialogContent = ({
  databaseId,
}: {
  databaseId: string;
}) => {
  const extensionsEnabled = useAppDbLiveQuery(() =>
    appDb.databases.get(databaseId),
  )?.enabledExtensions;

  const resultUnavailable = extensionsEnabled == null;

  const setEnabledExtensionsChanged = usePostgresStore(
    (state) => state.setEnabledExtensionsChanged,
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Manage extensions</DialogTitle>
        <DialogDescription>
          You can enable or disable Postgres extensions here.
        </DialogDescription>
      </DialogHeader>
      <div className="flex h-[300px] max-h-[50vh] flex-col gap-2 overflow-y-auto">
        {pgExtensions.map((ext) => (
          <div className="flex shrink-0 items-center gap-1" key={ext.id}>
            <Checkbox
              id={`${ext.id}-checkbox`}
              className="translate-y-[2px]"
              disabled={resultUnavailable}
              checked={extensionsEnabled?.includes(ext.id) ?? false}
              onCheckedChange={(checked) => {
                if (checked) {
                  appDb.databases.update(databaseId, {
                    enabledExtensions: [...(extensionsEnabled ?? []), ext.id],
                  });
                } else {
                  appDb.databases.update(databaseId, {
                    enabledExtensions: [
                      ...(extensionsEnabled ?? []).filter((e) => e !== ext.id),
                    ],
                  });
                }
                setEnabledExtensionsChanged(true);
              }}
            />
            <label htmlFor={`${ext.id}-checkbox`} className="text-sm">
              <span className="font-medium">{ext.name}</span>{" "}
              <em>- {ext.description}</em>
            </label>
          </div>
        ))}
      </div>
    </>
  );
};
