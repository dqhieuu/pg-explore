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
import { GITHUB_URL } from "@/lib/constants";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db";
import { guid } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Database, MemoryStick } from "lucide-react";
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
  const databases = useAppDbLiveQuery(() => appDb.databases.toArray());

  const navigate = useNavigate();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Card className="">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img className="w-12 rounded-md shrink-0" src={Logo} />
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
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-5 flex-col md:flex-row">
          <div className="flex flex-col gap-2">
            <div className="font-medium">Create a new database</div>
            <div className="flex gap-2 flex-wrap">
              <div
                className="flex flex-col p-2 border rounded-xl shadow items-center w-[13rem] select-none hover:bg-muted flex-[1_0_auto]"
                onClick={() => navigate({ to: `/database/memory` })}
              >
                <div className="font-semibold">In-memory database</div>
                <MemoryStick size={48} strokeWidth={1} className="my-2" />
                <div className="text-sm text-center text-balance text-muted-foreground">
                  Run PostgreSQL in memory
                  <div className="text-red-600">
                    All data is lost when the browser tab is closed.
                  </div>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <div className="flex flex-col p-2 border rounded-xl shadow items-center w-[13rem] select-none hover:bg-muted flex-[1_0_auto]">
                    <div className="font-semibold ">Persistent database</div>
                    <Database size={48} strokeWidth={1} className="my-2" />
                    <div className="text-sm text-center text-balance text-muted-foreground">
                      Run PostgreSQL in IndexedDB
                      <div className="text-green-600">
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
          <div className="border-r border-gray-200 hidden md:block"></div>
          {/* divider */}
          <div className="flex flex-col gap-2 min-w-0 w-full md:w-auto">
            <div className="font-medium">Open an existing database</div>
            {databases?.length === 0 ? (
              <div className="text-muted-foreground">No databases found.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {databases?.map((db) => (
                  <div
                    key={db.id}
                    className="flex md:w-[15rem] items-center gap-2 p-1 hover:bg-gray-100 rounded-xl select-none"
                    onClick={() => navigate({ to: `/database/${db.id}` })}
                  >
                    <Database strokeWidth={1.5} />
                    <div>{db.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="my-5">
        Reach us on <Link href={GITHUB_URL}>Github</Link>
      </div>
    </main>
  );
}
