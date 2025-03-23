import { Button } from "@/components/ui/button.tsx";
import { Form, FormField } from "@/components/ui/form.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useSettingsStore } from "@/hooks/stores/use-settings-store.ts";
import { getDatabaseSchemaDump } from "@/lib/pglite/pg-utils.ts";
import { cn } from "@/lib/utils";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { usePGlite } from "@electric-sql/pglite-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CoreMessage, streamText } from "ai";
import { produce } from "immer";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Markdown from "react-markdown";
import { z } from "zod";

const formSchema = z.object({
  question: z.string().min(1),
});

export const AiChat = () => {
  const db = usePGlite();

  const [chatMessages, setChatMessages] = useState<CoreMessage[]>([]);

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

    const dbSchema = await getDatabaseSchemaDump(db);
    const res = streamText({
      model: aiModel,
      system: `You're an expert in SQL. You're given the schema of a database and a prompt. You need to write a Postgres query that answers the prompt.
      The schema of the database is as follows:
      *****************
      ${dbSchema}
      *****************
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
        <div className="flex h-full flex-col items-start gap-1 overflow-auto px-2 pt-2 pb-[4rem]">
          {chatMessages.length === 0 ? (
            <div className="text-primary/50">
              <div>Try asking me a question about your database schema.</div>
              <div>For example: "What are the tables in my database?"</div>
              <div>Or "How can I get the top 10 users by activity?"</div>
            </div>
          ) : (
            chatMessages.map(({ role, content }, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex shrink-0 flex-col gap-1 overflow-auto rounded-2xl border px-3 py-2",
                  role === "user"
                    ? "bg-background self-end rounded-br-sm"
                    : "bg-foreground text-background self-start rounded-bl-sm",
                )}
              >
                <Markdown>{content.toString()}</Markdown>
              </div>
            ))
          )}
        </div>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="bg-muted flex max-h-[15rem] gap-2 border-t p-1"
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
            <TooltipTrigger className="self-start">
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
