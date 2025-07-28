import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useAnimationStore } from "@/hooks/stores/use-animation-store.ts";
import { useSettingsStore } from "@/hooks/stores/use-settings-store";
import { cn, resetApplication } from "@/lib/utils.ts";
import { DialogTitle } from "@radix-ui/react-dialog";
import { DatabaseBackup } from "lucide-react";
import { ChangeEvent, ReactNode, useState } from "react";

const OnOffSetting = ({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-foreground/50 text-sm">{description}</div>
      </div>
      <Switch
        className="shrink-0"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
};

const InputSetting = ({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  value: string;
  onValueChange: (value: string) => void;
}) => {
  return (
    <label className="flex flex-col items-start gap-0">
      <div className="font-medium">{label}</div>
      <Input
        type="text"
        placeholder={description}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onValueChange(e.target.value)
        }
      />
    </label>
  );
};

const EditorSettings = () => {
  const showAccurateSqlError = useSettingsStore(
    (state) => state.editorShowAccurateSQLError,
  );
  const setShowAccurateSqlError = useSettingsStore(
    (state) => state.setEditorShowAccurateSQLError,
  );

  return (
    <div className="flex flex-col gap-2">
      <OnOffSetting
        label="Show accurate SQL error (experimental)"
        description="Pre-execute SQL queries to check for errors"
        checked={showAccurateSqlError}
        onCheckedChange={setShowAccurateSqlError}
      />
    </div>
  );
};

const AdvancedSettings = () => {
  const debugMode = useSettingsStore((state) => state.debugMode);
  const setDebugMode = useSettingsStore((state) => state.setDebugMode);

  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <OnOffSetting
        label="Debug mode"
        description="Enable debug mode for debugging purposes"
        checked={debugMode}
        onCheckedChange={setDebugMode}
      />
      {isConfirmingReset ? (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className="mt-5 self-start"
            onClick={() => setIsConfirmingReset(false)}
          >
            Cancel action
          </Button>
          <Button
            variant="destructive"
            className="mt-5 self-start"
            onClick={resetApplication}
          >
            <DatabaseBackup />
            Confirm reset
          </Button>
        </div>
      ) : (
        <Button
          variant="destructive"
          className="mt-5 self-start"
          onClick={() => setIsConfirmingReset(true)}
        >
          <DatabaseBackup />
          Reset everything
        </Button>
      )}
    </div>
  );
};

const GeneralSettings = () => {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Theme</div>
          <div className="text-foreground/50 text-sm">
            Choose between light and dark themes
          </div>
        </div>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger className="w-[9rem] shrink-0">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">System theme</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const AISettings = () => {
  const useCustomAIEndpoint = useSettingsStore(
    (state) => state.useCustomAIEndpoint,
  );
  const setUseCustomAIEndpoint = useSettingsStore(
    (state) => state.setUseCustomAIEndpoint,
  );

  const customAIEndpointUrl = useSettingsStore(
    (state) => state.customAIEndpointUrl,
  );
  const setCustomAIEndpointUrl = useSettingsStore(
    (state) => state.setCustomAIEndpointUrl,
  );

  const customAIEndpointKey = useSettingsStore(
    (state) => state.customAIEndpointKey,
  );
  const setCustomAIEndpointKey = useSettingsStore(
    (state) => state.setCustomAIEndpointKey,
  );

  const customAIEndpointModel = useSettingsStore(
    (state) => state.customAIEndpointModel,
  );

  const setCustomAIEndpointModel = useSettingsStore(
    (state) => state.setCustomAIEndpointModel,
  );

  return (
    <div className="flex flex-col gap-2">
      <OnOffSetting
        label="Use custom API endpoint"
        description="Provide your own API endpoint for AI features"
        checked={useCustomAIEndpoint}
        onCheckedChange={setUseCustomAIEndpoint}
      />
      <div
        className={cn(
          "flex flex-col gap-2 rounded-lg border p-2 shadow-md",
          useCustomAIEndpoint ? "flex" : "hidden",
        )}
      >
        <InputSetting
          label="Base URL"
          description="https://api.example.com"
          value={customAIEndpointUrl}
          onValueChange={setCustomAIEndpointUrl}
        />

        <InputSetting
          label="API key"
          description="your-secret-key"
          value={customAIEndpointKey}
          onValueChange={setCustomAIEndpointKey}
        />

        <InputSetting
          label="AI model"
          description="Example: gemini-2.0-flash"
          value={customAIEndpointModel}
          onValueChange={setCustomAIEndpointModel}
        />
      </div>
    </div>
  );
};

const sectionData = [
  {
    id: "general",
    title: "General",
    body: () => <GeneralSettings />,
  },
  {
    id: "editor",
    title: "Editor",
    body: () => <EditorSettings />,
  },
  { id: "ai", title: "AI", body: () => <AISettings /> },
  { id: "advanced", title: "Advanced", body: () => <AdvancedSettings /> },
];

export const SettingsDialog = ({ children }: { children: ReactNode }) => {
  const [selectedSection, setSelectedSection] = useState("general");
  const isOpen = useAnimationStore((state) => state.settingsDialogOpen);
  const setIsOpen = useAnimationStore((state) => state.setSettingsDialogOpen);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-auto max-w-none sm:max-w-none">
        <DialogHeader className="min-w-auto text-left">
          <DialogTitle className="font-bold">Settings</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex w-full max-w-full shrink-0 overflow-x-auto md:-ml-[1.5rem] md:w-[10rem] md:flex-col">
                {sectionData.map((section) => (
                  <Button
                    key={section.id}
                    variant="link"
                    onClick={() => setSelectedSection(section.id)}
                    className={cn(
                      "hover:bg-muted under text-foreground/50 justify-center rounded-none hover:no-underline focus-visible:underline focus-visible:ring-0 focus-visible:outline-none md:w-[10rem] md:justify-start md:pl-6",
                      selectedSection === section.id
                        ? "text-foreground bg-muted font-bold"
                        : "",
                    )}
                  >
                    {section.title}
                  </Button>
                ))}
              </div>
              <div className="text-foreground mt-2 flex w-[80vw] max-w-[30rem] shrink-0 flex-col gap-2">
                {sectionData.find((s) => s.id === selectedSection)?.body()}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
      {children}
    </Dialog>
  );
};
