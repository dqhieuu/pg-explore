import { useSettingsStore } from "@/hooks/stores/use-settings-store";
import { ReactNode, useEffect } from "react";

const setHtmlTheme = (theme: "dark" | "light") => {
  const root = window.document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(theme);
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    if (theme === "auto") {
      const colorSchemeQuery = window.matchMedia(
        "(prefers-color-scheme: dark)",
      );

      const updateThemeBasedOnSystem = (event: MediaQueryListEvent) => {
        setHtmlTheme(event.matches ? "dark" : "light");
      };
      colorSchemeQuery.addEventListener("change", updateThemeBasedOnSystem);

      setHtmlTheme(colorSchemeQuery.matches ? "dark" : "light");

      return () => {
        colorSchemeQuery.removeEventListener(
          "change",
          updateThemeBasedOnSystem,
        );
      };
    }

    setHtmlTheme(theme);
  }, [theme]);

  return <>{children}</>;
}
