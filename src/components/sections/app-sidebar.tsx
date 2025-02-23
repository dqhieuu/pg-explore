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
import { usePostgresStore } from "@/hooks/stores/use-postgres-store";
import { APP_NAME } from "@/lib/constants";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db";
import { fixRadixUiUnclosedDialog } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  Bug,
  ChevronDown,
  Database,
  DatabaseIcon,
  FolderPen,
  MoreHorizontal,
  Plus,
  PlusCircle,
  ScrollText,
  SettingsIcon,
  SquareTerminalIcon,
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function AppSidebar() {
  const navigate = useNavigate();
  const currentDbId = usePostgresStore((state) => state.databaseId);

  const databases = useAppDbLiveQuery(() => appDb.databases.toArray());

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
          <SidebarMenuItem>
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
                  {/* <div className="absolute bg-muted top-0 bottom-0 left-0 right-0 z-0 -m-1"></div> */}
                  <img className="w-8 rounded-md opacity-85" src={Logo} />
                  <DropdownMenuLabel>{APP_NAME}</DropdownMenuLabel>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      navigate({ to: "/" });
                      fixRadixUiUnclosedDialog();
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
                            onClick={() =>
                              navigate({ to: `/database/${db.id}` })
                            }
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
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <SettingsIcon />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Bug />
                  <span>Report an issue / Feedback</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Star />
                  <span>Star / Fork this repo</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <Button>
            <Workflow />
            Setup pre-query workflow
          </Button>
        </SidebarGroup>
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
                  <SidebarMenuItem className="group/file">
                    <SidebarMenuButton>
                      <ScrollText />
                      Query 1
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction className="hover:bg-gray-200">
                          <MoreHorizontal className="hidden group-hover/file:block" />
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
                        <DropdownMenuItem>
                          <Trash className="text-destructive" />
                          <span className="text-destructive">Delete file</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                </SidebarMenu>

                <Button variant="outline" className="mt-2">
                  <Plus /> New
                </Button>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarFooter>
        <Button className="ml-auto" variant={"outline"}>
          <SquareTerminalIcon size={25} />
          Console
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
