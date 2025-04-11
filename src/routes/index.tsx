import Logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAnimationStore } from "@/hooks/stores/use-animation-store.ts";
import { GITHUB_URL } from "@/lib/constants";
import {
  appDb,
  getNonMemoryDatabases,
  useAppDbLiveQuery,
} from "@/lib/dexie/app-db";
import { guid } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Database, MemoryStick, SettingsIcon } from "lucide-react";
import { generateSlug } from "random-word-slugs";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function CreatePersistentDatabaseDialogContent() {
  const navigate = useNavigate();

  const [newDbName, setNewDbName] = useState(generateSlug(3));

  async function createDatabase() {
    if (newDbName.trim() === "") return;

    const newDbId = await appDb.databases.add({
      id: guid(),
      name: newDbName,
      createdAt: new Date(),
      lastOpened: new Date(),
    });

    navigate({ to: `/database/${newDbId}` });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Enter your database name</DialogTitle>
        <DialogDescription className="flex flex-col gap-2">
          <Input
            placeholder="Database name"
            value={newDbName}
            onChange={(e) => setNewDbName(e.target.value)}
          />
          <Button onClick={createDatabase}>Create database</Button>
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  );
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="text-blue-400" target="_blank" href={href}>
      {children}
    </a>
  );
}

function HomePage() {
  const databases = useAppDbLiveQuery(getNonMemoryDatabases);

  const sortedDatabases = databases?.sort(
    (a, b) => b.lastOpened.getTime() - a.lastOpened.getTime(),
  );

  const navigate = useNavigate();

  const setSettingsDialogOpen = useAnimationStore(
    (state) => state.setSettingsDialogOpen,
  );

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-gray-100">
      <Card className="mx-2 mt-2">
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <img className="w-12 shrink-0 rounded-md" src={Logo} alt="logo" />
              <div>
                pgExplore
                <CardDescription className="font-normal">
                  PostgreSQL data explorer that lives in your browser. Powered
                  by{" "}
                  <a
                    className="text-blue-400"
                    target="_blank"
                    href="https://github.com/electric-sql/pglite"
                  >
                    PGlite
                  </a>
                  .
                </CardDescription>
              </div>
              <div className="flex-1" />
              <Button
                variant="ghost"
                onClick={() => setSettingsDialogOpen(true)}
              >
                <SettingsIcon />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 md:flex-row">
          <div className="flex flex-col gap-2">
            <div className="font-medium">Create a new database</div>
            <div className="flex flex-wrap gap-2">
              <div
                className="hover:bg-muted flex w-[13rem] flex-[1_0_auto] flex-col items-center rounded-xl border p-2 shadow transition ease-in-out select-none"
                onClick={() => navigate({ to: `/database/memory` })}
              >
                <div className="font-semibold">In-memory database</div>
                <MemoryStick size={48} strokeWidth={1} className="my-2" />
                <div className="text-muted-foreground text-center text-sm text-balance">
                  Run PostgreSQL in memory
                  <div className="max-w-[15rem] text-red-600">
                    All data is lost when the browser tab is closed.
                  </div>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <div className="hover:bg-muted flex w-[13rem] flex-[1_0_auto] flex-col items-center rounded-xl border p-2 shadow transition ease-in-out select-none">
                    <div className="font-semibold">Persistent database</div>
                    <Database size={48} strokeWidth={1} className="my-2" />
                    <div className="text-muted-foreground text-center text-sm text-balance">
                      Run PostgreSQL in IndexedDB
                      <div className="max-w-[15rem] text-green-600">
                        Data is persisted across browser sessions.
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <CreatePersistentDatabaseDialogContent />
              </Dialog>
            </div>
          </div>
          {/* divider */}
          <div className="hidden border-r border-gray-200 md:block"></div>
          {/* divider */}
          <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto">
            <div className="font-medium">Open an existing database</div>
            {databases?.length === 0 ? (
              <div className="text-muted-foreground">No databases found.</div>
            ) : (
              <div className="flex max-h-none flex-col gap-1 overflow-auto md:max-h-[10rem]">
                {sortedDatabases?.map((db) => (
                  <a
                    key={db.id}
                    className="flex max-h-[3rem] shrink-0 cursor-default items-center gap-2 rounded-xl p-1 select-none hover:bg-gray-100 md:w-[15rem]"
                    onClick={(event) => {
                      event.preventDefault();
                      navigate({ to: `/database/${db.id}` });
                    }}
                    href={`/database/${db.id}`}
                  >
                    <Database className="shrink-0" strokeWidth={1.5} />
                    <div>{db.name}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="my-5">
        Source code: <Link href={GITHUB_URL}>Github</Link>
      </div>
    </main>
  );
}
