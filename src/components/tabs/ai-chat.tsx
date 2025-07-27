import { Button } from "@/components/ui/button.tsx";
import { Form, FormField } from "@/components/ui/form.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useDockviewStore } from "@/hooks/stores/use-dockview-store.ts";
import { usePostgresStore } from "@/hooks/stores/use-postgres-store.ts";
import { useQueryStore } from "@/hooks/stores/use-query-store.ts";
import { useSettingsStore } from "@/hooks/stores/use-settings-store.ts";
import { createNewFile, getDatabaseFiles } from "@/lib/dexie/dexie-utils.ts";
import { executeQueryAndShowResults, openFileEditor } from "@/lib/dockview.ts";
import { getDatabaseSchemaDump } from "@/lib/pglite/pg-utils.ts";
import { useWorkflowMonitor } from "@/lib/pglite/use-workflow-monitor.ts";
import { cn, memDbId } from "@/lib/utils";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { usePGlite } from "@electric-sql/pglite-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CoreMessage, streamText } from "ai";
import { produce } from "immer";
import {
  ClipboardCopyIcon,
  FilePlusIcon,
  PlayIcon,
  PlusIcon,
} from "lucide-react";
import { ComponentType, useState } from "react";
import { useForm } from "react-hook-form";
import Markdown from "react-markdown";
import { z } from "zod";

const formSchema = z.object({
  question: z.string().min(1),
});

export const AiChat = () => {
  const db = usePGlite();
  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;

  const dockviewApi = useDockviewStore((state) => state.dockviewApi);

  const [chatMessages, setChatMessages] = useState<CoreMessage[]>([]);

  const { notifySendingChat, notifyRunArbitraryQuery } = useWorkflowMonitor();
  const setQueryResult = useQueryStore((state) => state.setQueryResult);

  const useCustomAIEndpoint = useSettingsStore(
    (state) => state.useCustomAIEndpoint,
  );
  const customAIEndpointUrl = useSettingsStore(
    (state) => state.customAIEndpointUrl,
  );
  const customAIEndpointKey = useSettingsStore(
    (state) => state.customAIEndpointKey,
  );
  const customAIEndpointModel = useSettingsStore(
    (state) => state.customAIEndpointModel,
  );
  const allCustomAIFieldsFilled = [
    customAIEndpointUrl,
    customAIEndpointKey,
    customAIEndpointModel,
  ].every((field) => field.trim() !== "");
  const mustFillCustomAIFields =
    useCustomAIEndpoint && !allCustomAIFieldsFilled;

  const aiProvider = createOpenAICompatible({
    name: "My AI",
    baseURL: useCustomAIEndpoint
      ? customAIEndpointUrl
      : import.meta.env.VITE_AI_BASE_URL,
    apiKey: useCustomAIEndpoint
      ? customAIEndpointKey
      : import.meta.env.VITE_AI_API_KEY,
  });

  const aiModel = aiProvider(
    useCustomAIEndpoint ? customAIEndpointModel : import.meta.env.VITE_AI_MODEL,
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    form.resetField("question");

    let updatedChatMessages = produce(chatMessages, (draft) => {
      draft.push({
        role: "user",
        content: values.question,
      });
    });

    setChatMessages(updatedChatMessages);

    // Ensure the workflow is applied before sending the chat message
    await notifySendingChat();

    const dbSchema = await getDatabaseSchemaDump(db);
    const res = streamText({
      model: aiModel,
      system: `You're an expert in SQL. You're given the schema of a database and a prompt. You need to write a Postgres query that answers the prompt.
      The schema of the database is as follows:
      *****************
      ${dbSchema}
      *****************
      There are rules for writing SQL queries:
      - Always quote identifiers (table and column names)
      
      The prompt is as follows:
      `,
      messages: updatedChatMessages,
    });

    updatedChatMessages = produce(updatedChatMessages, (draft) => {
      draft.push({
        role: "assistant",
        content: "",
      });
    });

    for await (const chunk of res.textStream) {
      updatedChatMessages = produce(updatedChatMessages, (draft) => {
        draft[draft.length - 1].content += chunk;
      });

      setChatMessages(updatedChatMessages);
    }
  };

  function copyToClipboard(text: string) {
    return navigator.clipboard.writeText(text);
  }

  async function createNewSqlFileFromContent(content: string) {
    const createdFileId = await createNewFile(currentDbId, {
      type: "sql",
      prefix: "AI SQL",
      existingFileNames: (await getDatabaseFiles(currentDbId)).map(
        (f) => f.name,
      ),
      content: content,
    });

    if (dockviewApi == null) return;
    await openFileEditor(dockviewApi, createdFileId);
  }

  const SimpleIconButton = ({
    icon: Icon,
    onClick,
    tooltip,
  }: {
    icon: ComponentType;
    onClick: () => void;
    tooltip?: string;
  }) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" className="h-6 w-6" onClick={onClick}>
            <Icon />
          </Button>
        </TooltipTrigger>
        {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
      </Tooltip>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="bg-muted shrink-0 border-b px-1 py-0.5">
        {
          <Button
            className="h-6"
            onClick={() => {
              setChatMessages([]);
              form.resetField("question");
            }}
            disabled={chatMessages.length === 0}
            variant="outline"
          >
            <PlusIcon />
            New
          </Button>
        }
      </div>
      <div className="relative flex-1">
        <div className="flex h-full flex-col items-start gap-1 overflow-auto px-2 pt-2 pb-[4rem] dark:bg-neutral-950">
          {chatMessages.length === 0 ? (
            <div className="text-muted-foreground">
              <div>Try asking me a question about your database schema.</div>
              <div>For example: "What are the tables in my database?"</div>
              <div>Or "How can I get the top 10 users by activity?"</div>
            </div>
          ) : (
            chatMessages.map(({ role, content }, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex max-w-full shrink-0 flex-col gap-1 overflow-auto rounded-2xl border px-3 py-2",
                  role === "user"
                    ? "bg-muted self-end rounded-br-sm"
                    : "bg-foreground dark:bg-muted-foreground text-background self-start rounded-bl-sm",
                )}
              >
                <Markdown
                  components={{
                    code(props) {
                      const { children, className, ...rest } = props;

                      const codeContent = (children ?? "").toString();

                      const isSqlCodeBlock = (className ?? "").includes(
                        "language-sql",
                      );

                      return (
                        <div>
                          <div className="flex justify-end">
                            {isSqlCodeBlock && (
                              <>
                                <SimpleIconButton
                                  icon={PlayIcon}
                                  onClick={async () => {
                                    await notifyRunArbitraryQuery();

                                    executeQueryAndShowResults({
                                      db,
                                      setQueryResult,
                                      query: codeContent,
                                      contextId: "AI-CHAT",
                                      dockviewApi,
                                      tabName: "AI Chat",
                                    });
                                  }}
                                  tooltip="Run this query"
                                />
                                <SimpleIconButton
                                  icon={FilePlusIcon}
                                  onClick={() => {
                                    createNewSqlFileFromContent(codeContent);
                                  }}
                                  tooltip="Create a new file for this query"
                                />
                              </>
                            )}
                            <SimpleIconButton
                              icon={ClipboardCopyIcon}
                              onClick={() => {
                                copyToClipboard(codeContent);
                              }}
                              tooltip="Copy this query to clipboard"
                            />
                          </div>
                          <code
                            {...rest}
                            className={cn(
                              className,
                              "inline-block max-w-full overflow-auto",
                            )}
                          >
                            {children}
                          </code>
                        </div>
                      );
                    },
                  }}
                >
                  {content.toString()}
                </Markdown>
              </div>
            ))
          )}
        </div>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="bg-muted z-10 flex max-h-[15rem] gap-2 border-t p-1"
        >
          <FormField
            control={form.control}
            name="question"
            render={({ field }) => (
              <Textarea
                className="bg-background"
                placeholder="Ask me anything..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!mustFillCustomAIFields) {
                      form.handleSubmit(handleSubmit)();
                    }
                  }
                }}
                {...field}
              />
            )}
          />

          <Tooltip>
            <TooltipTrigger className="self-start" asChild>
              <Button type="submit" disabled={mustFillCustomAIFields}>
                Ask
              </Button>
            </TooltipTrigger>
            {mustFillCustomAIFields && (
              <TooltipContent>
                Please fill all custom AI endpoint fields
              </TooltipContent>
            )}
          </Tooltip>
        </form>
      </Form>
    </div>
  );
};
