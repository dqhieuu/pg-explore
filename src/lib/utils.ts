import { useSettingsStore } from "@/hooks/stores/use-settings-store.ts";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const guid = () => {
  return uuidv4();
};

// https://github.com/radix-ui/primitives/issues/2122
export function fixRadixUiUnclosedDialog() {
  setTimeout(() => (document.body.style.pointerEvents = ""), 0);
}

export function isEmptyOrSpaces(str?: string | null) {
  return str == null || str.match(/^\s*$/) !== null;
}

export function nextIncrementedFilename(prefix: string, existing: string[]) {
  const existingNumbers = existing
    .filter((filename) => filename.match(new RegExp(`^${prefix} \\d+$`)))
    .map((filename) => parseInt(filename.replace(prefix, ""), 10));

  const nextNumber = Math.max(...existingNumbers, 0) + 1;
  const zeroPaddedNumber = nextNumber.toString().padStart(2, "0");

  return `${prefix} ${zeroPaddedNumber}`;
}

export async function resetApplication() {
  const databases = await window.indexedDB.databases();
  for (const db of databases) {
    if (db.name == null) continue;

    const request = window.indexedDB.deleteDatabase(db.name);
    await new Promise((resolve, reject) => {
      request.onsuccess = resolve;
      request.onerror = reject;
    });
  }
  localStorage.clear();

  window.location.href = "/";
}

export const devModeEnabled = () => useSettingsStore.getState().debugMode;

export const sessionId = guid();
export const MEM_DB_PREFIX = "mem_";
export const memDbId = `${MEM_DB_PREFIX}${sessionId}`;
