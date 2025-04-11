import Logo from "@/assets/logo.svg";
import { DatabaseListDialogContent } from "@/components/sections/database-list-dialog-content.tsx";
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
import {
  FileEntry,
  appDb,
  getNonMemoryDatabases,
  useAppDbLiveQuery,
} from "@/lib/dexie/app-db";
import { createNewFile } from "@/lib/dexie/dexie-utils";
import {
  createWorkflowPanel,
  openAiChat,
  openFileEditor,
} from "@/lib/dockview";
import { memDbId } from "@/lib/utils";
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
  ScrollText,
  SettingsIcon,
  SquareTerminal,
  Star,
  Table2,
  TerminalSquare,
  Trash,
  Workflow,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

function RenameFileDialogContent({
  fileId,
  onClose,
}: {
  fileId: string | null;
  onClose?: () => void;
}) {
  const [newFileName, setNewFileName] = useState("");
  const dockviewApi = useDockviewStore((state) => state.dockviewApi);

  useEffect(() => {
    if (fileId == null) return;

    (async () => {
      const file = await appDb.files.get(fileId);

      if (file != null) {
        setNewFileName(file.name);
      }
    })();
  }, [fileId]);

  const updateFileName = async () => {
    if (newFileName.trim() === "") return;

    await appDb.files.update(fileId, { name: newFileName });

    if (dockviewApi != null && fileId != null) {
      dockviewApi.getPanel(fileId)?.setTitle(newFileName);
    }

    if (onClose) onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Rename file</DialogTitle>
        <DialogDescription>
          <Input
            placeholder="New file name"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
          />
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={updateFileName}>Rename</Button>
      </DialogFooter>
    </DialogContent>
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
  ).sort((a, b) => a.name.localeCompare(b.name));

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
                        openFileEditor(dockviewApi, file.id, file.name);
                      }}
                    >
                      {itemIcon ?? <ScrollText />}
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
    ?.sort((a, b) => b.lastOpened.getTime() - a.lastOpened.getTime())
    ?.slice(0, 3);

  const existingFileNames =
    useAppDbLiveQuery(
      () => appDb.files.where("databaseId").equals(currentDbId).toArray(),
      [currentDbId],
    )?.map((f) => f.name) ?? [];

  const setSettingsDialogOpen = useAnimationStore(
    (state) => state.setSettingsDialogOpen,
  );

  const currentSchemaWorkflow = useAppDbLiveQuery(
    () =>
      appDb.workflows
        .where("databaseId")
        .equals(currentDbId)
        .and((wf) => wf.type === "schema")
        .first(),
    [currentDbId],
  );

  const currentDataWorkflow = useAppDbLiveQuery(
    () =>
      appDb.workflows
        .where("databaseId")
        .equals(currentDbId)
        .and((wf) => wf.type === "data")
        .first(),
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
        <DialogContent>
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
                      <DropdownMenuSeparator />
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
              Setup pre-query workflow
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
                  <DropdownMenuItem disabled>
                    <Blocks />
                    Manage plugins
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <TerminalSquare />
                    Console
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarGroup>
          <FileCollapsibleSection
            fileFilterPredicate={(file) => !fileIdsInUse.includes(file.id)}
            sectionName="SQL scratchpad"
            itemIcon={<SquareTerminal />}
            newButtonAction={() =>
              createNewFile(currentDbId, {
                prefix: "SQL Query",
                existingFileNames: existingFileNames,
              })
            }
          />
          <FileCollapsibleSection
            fileFilterPredicate={(file) => fileIdsInUse.includes(file.id)}
            sectionName="In-workflow SQL"
            itemIcon={<ScrollText />}
            hiddenIfEmpty={true}
          />
        </SidebarContent>
      </Dialog>
    </Sidebar>
  );
}
