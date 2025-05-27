/**
 * Contract for the result of a transformValue f(string) -> string function.
 */
export interface TransformValueResult {
  success: boolean;
  error?: string;
  value?: string;
}
