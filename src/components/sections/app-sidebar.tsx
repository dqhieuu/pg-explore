import Logo from "@/assets/logo.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useDockviewStore } from "@/hooks/stores/use-dockview-store";
import { usePostgresStore } from "@/hooks/stores/use-postgres-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { APP_NAME, GITHUB_URL } from "@/lib/constants";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db";
import { createNewFile } from "@/lib/dexie/dexie-utils";
import { createWorkflowPanel, openFileEditor } from "@/lib/dockview";
import { memDbId } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  BookText,
  Bug,
  ChevronDown,
  Database,
  DatabaseIcon,
  FolderPen,
  HelpCircle,
  MoreHorizontal,
  Plus,
  PlusCircle,
  ScrollText,
  SettingsIcon,
  Star,
  Trash,
  Workflow,
} from "lucide-react";

import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
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

function SQLScratchpadSection() {
  const isMobile = useIsMobile();

  const currentDatabaseId =
    usePostgresStore((state) => state.databaseId) ?? memDbId;

  const databaseFiles =
    useAppDbLiveQuery(
      () => appDb.files.where("databaseId").equals(currentDatabaseId).toArray(),
      [currentDatabaseId],
    ) ?? [];

  const sortedFiles = databaseFiles.sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const deleteFile = (fileId: string) => {
    appDb.files.delete(fileId);
  };

  const dockviewApi = useDockviewStore((state) => state.dockviewApi);

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="hover:bg-gray-100 mb-1">
            SQL scratchpad
            <ChevronDown className="ml-auto transition-transform group-data-[state=closed]/collapsible:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {sortedFiles.map((file) => (
                <SidebarMenuItem className="group/file" key={file.id}>
                  <SidebarMenuButton
                    onClick={() => {
                      if (dockviewApi == null) return;
                      openFileEditor(dockviewApi, file.id, file.name);
                    }}
                  >
                    <ScrollText />
                    {file.name}
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction className="hover:bg-gray-200">
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
                      <DropdownMenuItem>
                        <FolderPen />
                        Rename file
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteFile(file.id)}>
                        <Trash className="text-destructive" />
                        <span className="text-destructive">Delete file</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>

            <Button
              variant="outline"
              className="mt-2"
              onClick={() =>
                createNewFile(currentDatabaseId, {
                  prefix: "SQL Query",
                  existingFileNames: databaseFiles.map((file) => file.name),
                })
              }
            >
              <Plus /> New
            </Button>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar() {
  const navigate = useNavigate();
  const currentDbId = usePostgresStore((state) => state.databaseId);

  const databases = useAppDbLiveQuery(() => appDb.databases.toArray());

  const dockviewApi = useDockviewStore((state) => state.dockviewApi);

  const lastOpenedDatabases = databases
    ?.sort((a, b) => b.lastOpened.getTime() - a.lastOpened.getTime())
    ?.slice(0, 3);

  const isInMemoryDatabase = currentDbId == null;

  const currentDatabaseName = isInMemoryDatabase
    ? "In-memory database"
    : databases?.find((db) => db.id === currentDbId)?.name;

  return (
    <Sidebar>
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
              <div className="flex relative">
                <img className="w-8 rounded-md opacity-85" src={Logo} />
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
                    <DropdownMenuItem>
                      <PlusCircle />
                      <span>More...</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSeparator />
              <DropdownMenuItem>
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
        <SidebarGroup>
          <Button
            onClick={() => dockviewApi && createWorkflowPanel(dockviewApi)}
          >
            <Workflow />
            Setup pre-query workflow
          </Button>
        </SidebarGroup>
        <SQLScratchpadSection />
      </SidebarContent>
      <SidebarFooter>
        {/* <Button className="ml-auto" variant={"outline"}>
          <SquareTerminalIcon size={25} />
          Console
        </Button> */}
      </SidebarFooter>
    </Sidebar>
  );
}
