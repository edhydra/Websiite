import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { applyTheme, DEFAULT_BG, DEFAULT_THEME } from "@/lib/themes";

/** Applies the site theme + background the user has equipped (bought with coins). */
export default function ThemeSync() {
  const { user } = useAuth();
  const theme = user?.equipped?.site || DEFAULT_THEME;
  const bg = user?.equipped?.bg || DEFAULT_BG;

  useEffect(() => { applyTheme(theme, bg); }, [theme, bg]);
  return null;
}
