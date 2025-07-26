import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import {
  deleteDatabaseAndDependencies,
  usePostgresStore,
} from "@/hooks/stores/use-postgres-store.ts";
import { PGDatabase, appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db.ts";
import { getNonMemoryDatabases } from "@/lib/dexie/dexie-utils.ts";
import { cn, memDbId } from "@/lib/utils.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { DatabaseIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const renameDatabaseFormSchema = z.object({
  name: z.string().min(1, "Database name is required"),
});

function RenameDatabaseDialogContent({
  databaseId,
  onClose,
}: {
  databaseId: string;
  onClose?: () => void;
}) {
  const form = useForm<z.infer<typeof renameDatabaseFormSchema>>({
    resolver: zodResolver(renameDatabaseFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof renameDatabaseFormSchema>) => {
    await appDb.databases.update(databaseId, {
      name: values.name,
    });

    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (databaseId == null) return;

    appDb.databases.get(databaseId).then((db) => {
      if (db == null) return;

      form.setValue("name", db.name);
    });
  }, [databaseId, form]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Rename database</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            name="name"
            render={({ field }) => (
              <FormItem>
                <Input
                  placeholder="New file name"
                  autoComplete="off"
                  {...field}
                />
                <FormMessage className="text-destructive" />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="submit">Rename</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

function DeleteDatabaseDialogContent({
  databaseId,
  onClose,
}: {
  databaseId: string;
  onClose?: () => void;
}) {
  const onDelete = async () => {
    await deleteDatabaseAndDependencies(databaseId);

    if (onClose) {
      onClose();
    }
  };

  const [databaseName, setDatabaseName] = useState<string>();
  useEffect(() => {
    if (databaseId == null) return;

    appDb.databases.get(databaseId).then((db) => {
      setDatabaseName(db?.name);
    });
  }, [databaseId]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete database</DialogTitle>
      </DialogHeader>
      <p>
        Are you sure you want to delete{" "}
        {databaseName !== null ? (
          <>
            the database <strong>{databaseName}</strong>
          </>
        ) : (
          "this database"
        )}
        ?
      </p>
      <DialogFooter>
        <Button variant="destructive" onClick={onDelete}>
          Delete
        </Button>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
}

const DatabaseList = ({
  databases,
  currentDbId,
  onSelectDatabase,
  onRenameDatabase,
  onDeleteDatabase,
}: {
  databases: PGDatabase[];
  currentDbId: string;
  onSelectDatabase: (database: PGDatabase) => void;
  onRenameDatabase: (database: PGDatabase) => void;
  onDeleteDatabase: (database: PGDatabase) => void;
}) => {
  const orderedDatabases = [
    ...databases.filter((db) => db.id === currentDbId),
    ...databases
      .filter((db) => db.id !== currentDbId)
      .toSorted((a, b) => b.lastOpened.getTime() - a.lastOpened.getTime()),
  ];

  return orderedDatabases.map((db) => (
    <li key={db.id} className="flex items-center gap-2">
      <button
        className={cn(
          "flex flex-1 items-center gap-2 rounded-md p-1 px-3 text-start select-none",
          db.id !== currentDbId ? "hover:bg-muted" : "",
        )}
        onClick={() => onSelectDatabase(db)}
        {...(db.id === currentDbId && {
          tabIndex: -1,
        })}
      >
        <DatabaseIcon />
        <div>
          <div className="font-medium">
            {db.name} {db.id === currentDbId ? "(Current)" : ""}
          </div>
          <em className="text-muted-foreground text-sm">
            Last opened {dayjs(db.lastOpened).format("YYYY-MM-DD HH:mm:ss")}
          </em>
        </div>
      </button>
      <div className="flex gap-1">
        <Tooltip>
          <TooltipContent>Rename database</TooltipContent>
          <TooltipTrigger asChild>
            <Button variant="ghost" onClick={() => onRenameDatabase(db)}>
              <PencilIcon className="" />
            </Button>
          </TooltipTrigger>
        </Tooltip>
        {db.id !== currentDbId && (
          <Tooltip>
            <TooltipContent>Delete database</TooltipContent>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={() => onDeleteDatabase(db)}>
                <TrashIcon className="text-destructive" />
              </Button>
            </TooltipTrigger>
          </Tooltip>
        )}
      </div>
    </li>
  ));
};

export const DatabaseListDialogContent = () => {
  const databases = useAppDbLiveQuery(getNonMemoryDatabases) ?? [];
  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;

  const [totalDiskUsage, setTotalDiskUsage] = useState(0);
  const [availableDisk, setAvailableDisk] = useState(0);

  const [popupActionState, setPopupActionState] = useState<{
    action: "rename" | "delete";
    databaseId: string;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const updateDiskUsage = async () => {
      const estimate = await navigator.storage.estimate();
      setTotalDiskUsage(estimate.usage ?? 0);
      setAvailableDisk(estimate.quota ?? 0);
    };
    updateDiskUsage();

    const interval = setInterval(updateDiskUsage, 3000);

    return () => clearInterval(interval);
  }, [databases]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Databases</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-semibold">Storage used:</span>
            <Progress
              // Handle case when availableDisk is infinitesimal
              value={availableDisk < 1 ? 0 : totalDiskUsage / availableDisk}
            />
          </div>
          <div className="-mt-2 self-end text-sm">
            {(totalDiskUsage / 1024 / 1024).toFixed(2)} MB /{" "}
            {(availableDisk / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>

        {databases.length === 0 ? (
          <p>No databases found.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            <Dialog
              open={popupActionState !== null}
              onOpenChange={(open) => {
                if (!open) setPopupActionState(null);
              }}
            >
              <DatabaseList
                databases={databases}
                currentDbId={currentDbId}
                onSelectDatabase={(db) => {
                  navigate({ to: `/database/${db.id}` });
                }}
                onRenameDatabase={(db) => {
                  setPopupActionState({
                    action: "rename",
                    databaseId: db.id,
                  });
                }}
                onDeleteDatabase={(db) => {
                  setPopupActionState({
                    action: "delete",
                    databaseId: db.id,
                  });
                }}
              />

              {popupActionState && (
                <DialogContent aria-describedby={undefined}>
                  {popupActionState.action === "rename" && (
                    <RenameDatabaseDialogContent
                      databaseId={popupActionState.databaseId}
                      onClose={() => setPopupActionState(null)}
                    />
                  )}
                  {popupActionState.action === "delete" && (
                    <DeleteDatabaseDialogContent
                      databaseId={popupActionState.databaseId}
                      onClose={() => setPopupActionState(null)}
                    />
                  )}
                </DialogContent>
              )}
            </Dialog>
          </ul>
        )}
      </div>
    </>
  );
};
