import Logo from "@/assets/logo.svg";
import { DatabaseListDialogContent } from "@/components/sections/database-list-dialog-content.tsx";
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAnimationStore } from "@/hooks/stores/use-animation-store.ts";
import { useDockviewStore } from "@/hooks/stores/use-dockview-store";
import { usePostgresStore } from "@/hooks/stores/use-postgres-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { APP_NAME, GITHUB_URL } from "@/lib/constants";
import { FileEntry, appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db";
import {
  createNewFile,
  getNonMemoryDatabases,
  getWorkflow,
} from "@/lib/dexie/dexie-utils";
import {
  createWorkflowPanel,
  openAiChat,
  openFileEditor,
} from "@/lib/dockview";
import { cn, memDbId } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import {
  Blocks,
  BookText,
  BotMessageSquare,
  Bug,
  ChevronDown,
  Database,
  DatabaseIcon,
  EllipsisIcon,
  FolderPen,
  HelpCircle,
  MoreHorizontal,
  Plus,
  PlusCircle,
  SettingsIcon,
  SquareTerminal,
  Star,
  Table2,
  TerminalSquare,
  Trash,
  Workflow,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";

const renameFileFormSchema = z.object({
  name: z.string().min(1, "File name is required"),
});

function RenameFileDialogContent({
  fileId,
  onClose,
}: {
  fileId: string | null;
  onClose?: () => void;
}) {
  const dockviewApi = useDockviewStore((state) => state.dockviewApi);

  const form = useForm<z.infer<typeof renameFileFormSchema>>({
    resolver: zodResolver(renameFileFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof renameFileFormSchema>) => {
    await appDb.files.update(fileId, { name: values.name });

    if (dockviewApi != null && fileId != null) {
      dockviewApi.getPanel(fileId)?.setTitle(values.name);
    }

    if (onClose) onClose();
  };

  useEffect(() => {
    if (fileId == null) return;

    appDb.files.get(fileId).then((file) => {
      if (file == null) return;

      form.setValue("name", file.name);
    });
  }, [fileId, form]);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Rename file</DialogTitle>
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
    </DialogContent>
  );
}

interface TypeToStyle {
  name: string;
  style: string;
}

const typeToStyleMappings: Record<string, TypeToStyle> = {
  sql: {
    name: "SQL",
    style: "bg-blue-900 text-white",
  },
  dbml: {
    name: "DBML",
    style: "bg-yellow-800 text-white",
  },
};

function FileTextIcon({ type }: { type: string }) {
  const displayName = typeToStyleMappings[type]?.name ?? type.toUpperCase();
  const style = typeToStyleMappings[type]?.style;

  return (
    <div className={cn("rounded-md px-2 py-1 text-xs", style)}>
      {displayName}
    </div>
  );
}

function FileCollapsibleSection({
  newButtonAction,
  sectionName,
  itemIcon,
  hiddenIfEmpty,
  fileFilterPredicate,
}: {
  sectionName: string;
  newButtonAction?: () => void;
  itemIcon?: ReactNode;
  hiddenIfEmpty?: boolean;
  fileFilterPredicate?: (file: FileEntry) => boolean;
}) {
  const hiddenIfEmptyValue = hiddenIfEmpty ?? false;

  const dockviewApi = useDockviewStore((state) => state.dockviewApi);
  const isMobile = useIsMobile();

  const currentDatabaseId =
    usePostgresStore((state) => state.databaseId) ?? memDbId;

  const databaseFiles = (
    useAppDbLiveQuery(
      () => appDb.files.where("databaseId").equals(currentDatabaseId).toArray(),
      [currentDatabaseId],
    ) ?? []
  ).toSorted((a, b) => a.name.localeCompare(b.name));

  const filteredFiles = fileFilterPredicate
    ? databaseFiles.filter(fileFilterPredicate)
    : databaseFiles;

  const deleteFile = (fileId: string) => {
    appDb.files.delete(fileId);
  };

  const [dialogFileId, setDialogFileId] = useState<string | null>(null);

  if (hiddenIfEmptyValue && filteredFiles.length === 0) return null;

  return (
    <Dialog
      open={dialogFileId != null}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setDialogFileId(null);
        }
      }}
    >
      <Collapsible defaultOpen className="group/collapsible shrink-0">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="mb-1 hover:bg-gray-100">
              {sectionName}
              <ChevronDown className="ml-auto transition-transform group-data-[state=closed]/collapsible:rotate-180" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredFiles.map((file) => (
                  <SidebarMenuItem
                    className="group/file flex items-center"
                    key={file.id}
                  >
                    <SidebarMenuButton
                      className="h-auto"
                      onClick={() => {
                        if (dockviewApi == null) return;
                        openFileEditor(dockviewApi, file.id);
                      }}
                    >
                      {itemIcon ?? <FileTextIcon type={file.type} />}
                      {file.name}
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction className="top-auto! p-4 hover:bg-gray-100">
                          <MoreHorizontal
                            className={
                              isMobile ? "" : "hidden group-hover/file:block"
                            }
                          />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-[10rem]"
                        side="right"
                        align="start"
                      >
                        <DialogTrigger
                          asChild
                          onClick={() => setDialogFileId(file.id)}
                        >
                          <DropdownMenuItem>
                            <FolderPen />
                            Rename file
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DropdownMenuItem onClick={() => deleteFile(file.id)}>
                          <Trash className="text-destructive" />
                          <span className="text-destructive">Delete file</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
              {newButtonAction && (
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={newButtonAction}
                >
                  <Plus /> New
                </Button>
              )}
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
      <RenameFileDialogContent
        fileId={dialogFileId}
        onClose={() => {
          setDialogFileId(null);
        }}
        key={dialogFileId}
      />
    </Dialog>
  );
}

export function AppSidebar() {
  const navigate = useNavigate();
  const databases = useAppDbLiveQuery(getNonMemoryDatabases);
  const dockviewApi = useDockviewStore((state) => state.dockviewApi);

  const databaseId = usePostgresStore((state) => state.databaseId);
  const isInMemoryDatabase = databaseId == null;

  const currentDatabaseName = isInMemoryDatabase
    ? "In-memory database"
    : databases?.find((db) => db.id === databaseId)?.name;
  const currentDbId = databaseId ?? memDbId;

  const lastOpenedDatabases = databases
    ?.toSorted((a, b) => b.lastOpened.getTime() - a.lastOpened.getTime())
    ?.slice(0, 3);

  const existingFileNames =
    useAppDbLiveQuery(
      () => appDb.files.where("databaseId").equals(currentDbId).toArray(),
      [currentDbId],
    )?.map((f) => f.name) ?? [];

  const setSettingsDialogOpen = useAnimationStore(
    (state) => state.setSettingsDialogOpen,
  );

  const setExtensionsDialogOpen = useAnimationStore(
    (state) => state.setExtensionsDialogOpen,
  );

  const currentSchemaWorkflow = useAppDbLiveQuery(
    () => getWorkflow(currentDbId, "schema"),
    [currentDbId],
  );

  const currentDataWorkflow = useAppDbLiveQuery(
    () => getWorkflow(currentDbId, "data"),
    [currentDbId],
  );

  const fileIdsInUse = [
    ...(currentSchemaWorkflow?.workflowSteps ?? []).map((step) => step.fileId),
    ...(currentDataWorkflow?.workflowSteps ?? []).map((step) => step.fileId),
  ];

  const [currentDialogType, setCurrentDialogType] =
    useState<"database-list">("database-list");

  return (
    <Sidebar>
      <Dialog>
        <DialogContent aria-describedby={undefined}>
          {currentDialogType === "database-list" && (
            <DatabaseListDialogContent />
          )}
        </DialogContent>
        <SidebarHeader>
          <SidebarMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className={`h-auto ${isInMemoryDatabase ? "italic" : ""}`}
                >
                  <DatabaseIcon />
                  <span className="font-semibold">{currentDatabaseName}</span>
                  <ChevronDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <div className="relative flex">
                  <img
                    alt="App logo"
                    className="w-8 rounded-md opacity-85"
                    src={Logo}
                  />
                  <DropdownMenuLabel>{APP_NAME}</DropdownMenuLabel>
                </div>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => {
                    navigate({ to: "/" });
                  }}
                >
                  <Plus />
                  <span>New database</span>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Database />
                    <span>Open database</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {lastOpenedDatabases?.map((db) => (
                        <DropdownMenuItem
                          key={db.id}
                          onClick={() => {
                            navigate({ to: `/database/${db.id}` });
                          }}
                        >
                          <span>{db.name}</span>
                        </DropdownMenuItem>
                      ))}
                      {(lastOpenedDatabases?.length ?? 0) > 0 && (
                        <DropdownMenuSeparator />
                      )}
                      <DialogTrigger
                        asChild
                        onClick={() => setCurrentDialogType("database-list")}
                      >
                        <DropdownMenuItem>
                          <PlusCircle />
                          <span>More...</span>
                        </DropdownMenuItem>
                      </DialogTrigger>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSettingsDialogOpen(true)}>
                  <SettingsIcon />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <HelpCircle />
                    <span>Help</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem disabled>
                        <BookText />
                        <span>Documentation (TODO)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`${GITHUB_URL}/issues`} target="_blank">
                          <Bug />
                          <span>Report an issue / Feedback</span>
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={GITHUB_URL} target="_blank">
                          <Star />
                          <span>Star / Fork this repo</span>
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="flex shrink-0 gap-2">
            <Button
              onClick={() => dockviewApi && createWorkflowPanel(dockviewApi)}
            >
              <Workflow />
              Set up pre-query steps
            </Button>
            <div className="flex">
              <Button
                onClick={() => dockviewApi && openAiChat(dockviewApi)}
                variant="secondary"
                className="flex-1 rounded-r-none bg-gray-200"
              >
                <BotMessageSquare />
                AI chat
              </Button>
              <Button
                variant="secondary"
                disabled
                className="flex-1 rounded-l-none bg-gray-200"
              >
                <Table2 />
                Tables
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">
                    <EllipsisIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setExtensionsDialogOpen(true);
                    }}
                  >
                    <Blocks />
                    Manage extensions
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <TerminalSquare />
                    Console
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarGroup>
          <SidebarGroup className="flex overflow-auto p-0">
            <FileCollapsibleSection
              fileFilterPredicate={(file) =>
                file.type === "sql" && !fileIdsInUse.includes(file.id)
              }
              sectionName="SQL scratchpad"
              itemIcon={<SquareTerminal />}
              newButtonAction={() =>
                createNewFile(currentDbId, {
                  type: "sql",
                  prefix: "SQL Query",
                  existingFileNames: existingFileNames,
                })
              }
            />
            <FileCollapsibleSection
              fileFilterPredicate={(file) => fileIdsInUse.includes(file.id)}
              sectionName="In-workflow files"
              hiddenIfEmpty
            />
            <FileCollapsibleSection
              fileFilterPredicate={(file) =>
                file.type !== "sql" && !fileIdsInUse.includes(file.id)
              }
              sectionName="Unused files"
              hiddenIfEmpty
            />
          </SidebarGroup>
        </SidebarContent>
      </Dialog>
    </Sidebar>
  );
}
