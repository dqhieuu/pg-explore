import { Button } from "@/components/ui/button.tsx";
import { Form, FormField } from "@/components/ui/form.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { getDatabaseSchemaDump } from "@/lib/pglite/pg-utils.ts";
import { cn } from "@/lib/utils";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { usePGlite } from "@electric-sql/pglite-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CoreMessage, streamText } from "ai";
import { produce } from "immer";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Markdown from "react-markdown";
import { z } from "zod";

const aiProvider = createOpenAICompatible({
  name: "My AI",
  baseURL: import.meta.env.VITE_AI_BASE_URL,
  apiKey: import.meta.env.VITE_AI_API_KEY,
});

const formSchema = z.object({
  question: z.string().min(1),
});

export const AiChat = () => {
  const db = usePGlite();

  const [chatMessages, setChatMessages] = useState<CoreMessage[]>([]);

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
      model: aiProvider(import.meta.env.VITE_AI_MODEL),
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
    <div className="flex flex-col gap-2 h-full">
      <div className="flex-1 flex gap-1 flex-col p-2 items-start overflow-auto">
        {chatMessages.length === 0 ? (
          <>
            <div className="text-primary/50">
              Try asking me a question about your database schema.
            </div>
            <div className="text-primary/50">
              For example: "What are the tables in my database?"
            </div>
            <div className="text-primary/50">
              Or "How can I get the top 10 users by activity?"
            </div>
          </>
        ) : (
          chatMessages.map(({ role, content }, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-2 px-3 py-2 border rounded-2xl shrink-0",
                role === "user"
                  ? "self-end bg-background rounded-br-sm"
                  : "self-start bg-foreground text-background rounded-bl-sm",
              )}
            >
              <Markdown>{content.toString()}</Markdown>
            </div>
          ))
        )}
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="p-1 flex gap-2 border-t bg-muted max-h-[15rem]"
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
                    form.handleSubmit(handleSubmit)();
                  }
                }}
                {...field}
              />
            )}
          />

          <Button type="submit">Ask</Button>
        </form>
      </Form>
    </div>
  );
};
