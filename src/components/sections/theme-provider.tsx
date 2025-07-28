import { useSettingsStore } from "@/hooks/stores/use-settings-store";
import { ReactNode, useEffect } from "react";

const setHtmlTheme = (theme: "dark" | "light") => {
  const root = window.document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(theme);

  const themeMetaElem = window.document.querySelector(
    'meta[name="theme-color"]',
  );
  if (themeMetaElem) {
    themeMetaElem.setAttribute(
      "content",
      theme === "dark" ? "#111827" : "#fff",
    );
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((state) => state.theme);
  const setResolvedTheme = useSettingsStore((state) => state.setResolvedTheme);

  useEffect(() => {
    if (theme === "auto") {
      const colorSchemeQuery = window.matchMedia(
        "(prefers-color-scheme: dark)",
      );

      const updateThemeBasedOnSystem = (event: MediaQueryListEvent) => {
        const resolvedTheme = event.matches ? "dark" : "light";
        setHtmlTheme(resolvedTheme);
        setResolvedTheme(resolvedTheme);
      };
      colorSchemeQuery.addEventListener("change", updateThemeBasedOnSystem);

      const resolvedTheme = colorSchemeQuery.matches ? "dark" : "light";
      setHtmlTheme(resolvedTheme);
      setResolvedTheme(resolvedTheme);

      return () => {
        colorSchemeQuery.removeEventListener(
          "change",
          updateThemeBasedOnSystem,
        );
      };
    }

    setHtmlTheme(theme);
    setResolvedTheme(theme);
  }, [setResolvedTheme, theme]);

  return <>{children}</>;
}
