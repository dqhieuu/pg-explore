import { Button } from "@/components/ui/button.tsx";
import { HotTable } from "@handsontable/react-wrapper";
import { ChevronDown } from "lucide-react";

export interface DataTableEditorProps {
  contextId: string;
  fileId: string;
}

export function DataTableEditor() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b p-1">
        <Button className="h-7" variant="ghost">
          <ChevronDown />
          Columns & properties
        </Button>
        <Button className="h-7">Import data</Button>
      </div>
      <div className="ht-theme-main-dark-auto">
        <HotTable
          data={[
            ["", "Tesla", "Volvo", "Toyota", "Ford"],
            ["2019", 10, 11, 12, 13],
            ["2020", 20, 11, 14, 13],
            ["2021", 30, 15, 12, 13],
          ]}
          rowHeaders={true}
          colHeaders={["col1", "col2", "col3", "col4", "col5"]}
          height="auto"
          manualColumnMove={true}
          licenseKey="non-commercial-and-evaluation"
        />
      </div>
    </div>
  );
}
