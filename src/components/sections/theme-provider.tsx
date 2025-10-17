import { useSettingsStore } from "@/hooks/stores/use-settings-store";
import { ReactNode, useEffect } from "react";

const setHtmlTheme = (theme: "dark" | "light") => {
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(theme);

  let themeMetaElem = document.querySelector(`meta[name=theme-color]`);
  if (!themeMetaElem) {
    themeMetaElem = document.createElement("meta");
    themeMetaElem.setAttribute("name", "theme-color");
    document.head.appendChild(themeMetaElem);
  }
  themeMetaElem.setAttribute(
    "content",
    theme === "dark" ? "#000000" : "#ffffff",
  );
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
