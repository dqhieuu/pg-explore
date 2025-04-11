import { Button } from "@/components/ui/button.tsx";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { usePostgresStore } from "@/hooks/stores/use-postgres-store.ts";
import {
  getNonMemoryDatabases,
  useAppDbLiveQuery,
} from "@/lib/dexie/app-db.ts";
import { memDbId } from "@/lib/utils.ts";
import dayjs from "dayjs";
import { DatabaseIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";

export const DatabaseListDialogContent = () => {
  const databases = useAppDbLiveQuery(getNonMemoryDatabases);
  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;

  const [totalDiskUsage, setTotalDiskUsage] = useState(0);

  useEffect(() => {
    const updateDiskUsage = async () => {
      const estimate = await navigator.storage.estimate();
      setTotalDiskUsage(estimate.usage ?? 0);
    };
    updateDiskUsage();

    const interval = setInterval(updateDiskUsage, 1000);

    return () => clearInterval(interval);
  }, [databases]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Databases</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <p>
          <span className="font-semibold">Total Disk Usage:</span>{" "}
          {(totalDiskUsage / 1024 / 1024).toFixed(2)} MB
        </p>
        {databases?.length === 0 ? (
          <p>No databases found.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {databases?.map((db) => (
              <li key={db.id} className="flex items-center gap-2">
                <div className="hover:bg-muted flex flex-1 items-center gap-2 rounded-md p-1 select-none">
                  <DatabaseIcon />
                  <div>
                    <div className="font-medium">
                      {db.name} {db.id === currentDbId ? "(In use)" : ""}
                    </div>
                    <em className="text-muted-foreground text-sm">
                      Last opened{" "}
                      {dayjs(db.lastOpened).format("YYYY-MM-DD HH:mm")}
                    </em>
                  </div>
                </div>
                <div className="j flex gap-1">
                  <Tooltip>
                    <TooltipContent>Rename database</TooltipContent>
                    <TooltipTrigger asChild>
                      <Button variant="ghost">
                        <PencilIcon className="" />
                      </Button>
                    </TooltipTrigger>
                  </Tooltip>
                  <Button variant="ghost">
                    <TrashIcon className="text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};
