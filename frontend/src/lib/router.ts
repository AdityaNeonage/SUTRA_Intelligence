import { useCallback, useEffect, useState } from "react";

export type SutraRoute =
  | { name: "landing" }
  | { name: "login" }
  | { name: "dashboard" }
  | { name: "cases" }
  | { name: "case-workspace"; caseId: string; tab?: string }
  | { name: "network" }
  | { name: "timeline" }
  | { name: "evidence"; evidenceId?: string }
  | { name: "fusion" }
  | { name: "hypotheses" }
  | { name: "assistant" }
  | { name: "analytics" }
  | { name: "system" };

function trimmedPathname() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  return `${pathname}${window.location.search}`;
}

export function parseSutraRoute(pathname = trimmedPathname()): SutraRoute {
  const [rawPathname, rawSearch = ""] = pathname.split("?");
  const segments = rawPathname.split("/").filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(rawSearch);
  if (segments.length === 0) return { name: "landing" };
  if (segments[0] === "login") return { name: "login" };
  if (segments[0] === "dashboard") return { name: "dashboard" };
  if (segments[0] === "cases" && segments[1]) return { name: "case-workspace", caseId: segments[1], tab: segments[2] };
  if (segments[0] === "cases") return { name: "cases" };
  if (segments[0] === "network") return { name: "network" };
  if (segments[0] === "timeline") return { name: "timeline" };
  if (segments[0] === "evidence") return { name: "evidence", evidenceId: query.get("record") ?? undefined };
  if (segments[0] === "fusion") return { name: "fusion" };
  if (segments[0] === "hypotheses") return { name: "hypotheses" };
  if (segments[0] === "assistant") return { name: "assistant" };
  if (segments[0] === "analytics") return { name: "analytics" };
  if (segments[0] === "system") return { name: "system" };
  return { name: "landing" };
}

export function useSutraRouter() {
  const [route, setRoute] = useState<SutraRoute>(() => parseSutraRoute());

  useEffect(() => {
    const updateRoute = () => setRoute(parseSutraRoute());
    window.addEventListener("popstate", updateRoute);
    return () => window.removeEventListener("popstate", updateRoute);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const nextPath = to.startsWith("/") ? to : `/${to}`;
    if (nextPath !== `${window.location.pathname}${window.location.search}`) {
      window.history[options?.replace ? "replaceState" : "pushState"]({}, "", nextPath);
    }
    setRoute(parseSutraRoute(nextPath));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { route, navigate };
}
