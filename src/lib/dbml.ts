import { TransformValueResult } from "@/lib/types.ts";
import { exporter as dbmlExporter } from "@dbml/core";

export function transformDbmlToSql(value?: string): TransformValueResult {
  if (value == null)
    return {
      success: false,
    };

  try {
    const generatedValue = dbmlExporter.export(value, "postgres");
    return {
      success: true,
      value: generatedValue,
    };
  } catch {
    return {
      success: false,
    };
  }
}
