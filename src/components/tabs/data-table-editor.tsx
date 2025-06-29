import { Button } from "@/components/ui/button.tsx";
import { HotTable } from "@handsontable/react-wrapper";
import { ChevronDown } from "lucide-react";

export interface DataTableEditorProps {
  contextId: string;
  fileId: string;
}

export function DataTableEditor() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-1">
        <Button className="h-7" variant="ghost">
          <ChevronDown />
          Columns & actions
        </Button>
        <div className="h-5 border-l-3" />
        <Button className="h-7">Import data</Button>
      </div>
      <div className="ht-theme-main-dark-auto flex h-full w-full">
        <div className="flex flex-1 flex-col">
          <HotTable
            height="100%"
            style={{ maxHeight: "100%" }}
            data={[
              ...Array(55)
                .fill("")
                .map(() => [
                  "2019",
                  10,
                  11,
                  12,
                  13,
                  10,
                  11,
                  12,
                  13,
                  10,
                  11,

                  13,
                ]),
            ]}
            rowHeaders={true}
            colHeaders={[
              "co0000000000000000000l1",
              "cooooooooooooooooooooooooooooooool2",
              "col3",
              "col4",
              "col5",
              "col2",
              "col3",
              "col4",
              "col5",
              "col2",
              "col3",
              "col4",
              "col5",
            ]}
            contextMenu={[
              "col_left",
              "col_right",
              "row_above",
              "row_below",
              "---------",
              "undo",
              "redo",
              "---------",
              "remove_col",
              "remove_row",
            ]}
            dropdownMenu={[
              "col_left",
              "col_right",
              "---------",
              "clear_column",
              "remove_col",
            ]}
            manualColumnMove={true}
            licenseKey="non-commercial-and-evaluation"
          />
        </div>
      </div>
    </div>
  );
}
