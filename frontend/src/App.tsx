import { lazy, Suspense, type ReactElement, useCallback, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Bot, BrainCircuit, FileText, FolderKanban, LayoutDashboard, MapPin, Network, Search, Users } from "lucide-react";
import { AppShell, type AppView } from "./components/AppShell";
import { CommandPalette, type CommandPaletteItem, Skeleton } from "./components/ui";
import { DemoExperienceProvider, useDemoExperience } from "./features/demo/DemoExperienceProvider";
import { clearSession } from "./lib/session";
import { useSutraRouter, type SutraRoute } from "./lib/router";
import { AssistantPage } from "./pages/AssistantPage";
import { CaseWorkspaceExperiencePage, type WorkspaceTab } from "./pages/CaseWorkspaceExperiencePage";
import { CasesPage } from "./pages/CasesPage";
import { DashboardExperiencePage } from "./pages/DashboardExperiencePage";
import { EvidencePage } from "./pages/EvidencePage";
import { HypothesisWorkbenchPage } from "./pages/HypothesisWorkbenchPage";
import { LandingPage } from "./pages/LandingPage";
import { TimelinePage } from "./pages/TimelinePage";

const NetworkExplorerPage = lazy(async () => ({ default: (await import("./pages/NetworkExplorerPage")).NetworkExplorerPage }));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } },
});

const workspaceTabs = new Set<WorkspaceTab>(["overview", "entities", "network", "timeline", "evidence", "hypotheses", "assistant"]);

function routeToView(route: SutraRoute): AppView {
  if (route.name === "case-workspace" || route.name === "cases") return "cases";
  if (route.name === "network") return "network";
  if (route.name === "timeline") return "timeline";
  if (route.name === "evidence") return "evidence";
  if (route.name === "hypotheses") return "hypotheses";
  if (route.name === "assistant") return "assistant";
  if (route.name === "analytics") return "analytics";
  if (route.name === "system") return "system";
  return "dashboard";
}

function PageLoading() {
  return <div className="experience-page-loading" role="status" aria-label="Loading experience"><Skeleton height={28} width="38%" /><Skeleton height={140} /><Skeleton height={360} /></div>;
}

function ExperienceConsole({ route, navigate }: { route: Exclude<SutraRoute, { name: "landing" } | { name: "login" }>; navigate: (to: string, options?: { replace?: boolean }) => void }) {
  const { cases, focusGraph, selectCase } = useDemoExperience();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const activeView = routeToView(route);
  const openCase = useCallback((caseId: string) => {
    selectCase(caseId);
    navigate(`/cases/${encodeURIComponent(caseId)}/overview`);
  }, [navigate, selectCase]);
  const openNetwork = useCallback(() => navigate("/network"), [navigate]);
  const openEvidence = useCallback((evidenceId?: string) => navigate(evidenceId ? `/evidence?record=${encodeURIComponent(evidenceId)}` : "/evidence"), [navigate]);
  const navigateView = useCallback((view: AppView) => {
    const paths: Record<AppView, string> = {
      dashboard: "/dashboard",
      cases: "/cases",
      network: "/network",
      timeline: "/timeline",
      evidence: "/evidence",
      hypotheses: "/hypotheses",
      assistant: "/assistant",
      analytics: "/dashboard",
      system: "/dashboard",
    };
    navigate(paths[view]);
  }, [navigate]);
  const openEntity = useCallback((id: string) => {
    focusGraph([id]);
    navigate("/network");
  }, [focusGraph, navigate]);

  const commandItems = useMemo<CommandPaletteItem[]>(() => [
    { id: "go-dashboard", label: "Open Dashboard", description: "Return to the command center", group: "Navigation", icon: <LayoutDashboard size={16} />, onSelect: () => navigate("/dashboard") },
    { id: "go-cases", label: "Search Cases", description: "Open case management", group: "Navigation", icon: <FolderKanban size={16} />, onSelect: () => navigate("/cases") },
    { id: "go-network", label: "Open Network Explorer", description: "Inspect the synthetic relationship graph", group: "Actions", icon: <Network size={16} />, onSelect: openNetwork },
    { id: "go-hypotheses", label: "Compare hypotheses", description: "Open the evidence comparison workbench", group: "Actions", icon: <BrainCircuit size={16} />, onSelect: () => navigate("/hypotheses") },
    { id: "go-assistant", label: "Start AI Assistant demo", description: "Run the local Rahul / Park Street graph-action demo", group: "Actions", icon: <Bot size={16} />, onSelect: () => navigate("/assistant") },
    { id: "go-evidence", label: "Open evidence register", description: "Inspect sources and confidence", group: "Actions", icon: <FileText size={16} />, onSelect: () => navigate("/evidence") },
    ...cases.map((item) => ({ id: `case-${item.id}`, label: `${item.reference} - ${item.title}`, description: `${item.category} - ${item.status}`, group: "Cases", icon: <FolderKanban size={16} />, keywords: [item.owner, item.priority], onSelect: () => openCase(item.id) })),
    { id: "entity-rahul", label: "Rahul", description: "Person - focus in Network Explorer", group: "Entities", icon: <Users size={16} />, keywords: ["person", "P-037", "Rahul Verma"], onSelect: () => openEntity("person-rahul-verma") },
    { id: "entity-park-street", label: "Park Street", description: "Location - focus in Network Explorer", group: "Entities", icon: <MapPin size={16} />, keywords: ["location", "observation"], onSelect: () => openEntity("location-park-street") },
    { id: "entity-account", label: "Account ***4871", description: "Bank account - focus in Network Explorer", group: "Entities", icon: <Search size={16} />, keywords: ["bank", "transfer", "financial"], onSelect: () => openEntity("bank-account-4871") },
  ], [cases, navigate, openCase, openEntity, openNetwork]);

  let page: ReactElement;
  if (route.name === "case-workspace") {
    const tab = workspaceTabs.has(route.tab as WorkspaceTab) ? route.tab as WorkspaceTab : "overview";
    page = <CaseWorkspaceExperiencePage caseId={route.caseId} activeTab={tab} onBack={() => navigate("/cases")} onNavigateTab={(nextTab) => {
      if (nextTab === "network") openNetwork();
      else navigate(`/cases/${encodeURIComponent(route.caseId)}/${nextTab}`);
    }} onOpenNetwork={openNetwork} onOpenEvidence={openEvidence} />;
  } else if (route.name === "cases") page = <CasesPage onOpenCase={openCase} />;
  else if (route.name === "network") page = <NetworkExplorerPage />;
  else if (route.name === "timeline") page = <TimelinePage onOpenNetwork={openNetwork} onOpenEvidence={openEvidence} />;
  else if (route.name === "evidence") page = <EvidencePage initialEvidenceId={route.evidenceId} onOpenNetwork={openNetwork} />;
  else if (route.name === "hypotheses") page = <HypothesisWorkbenchPage />;
  else if (route.name === "assistant") page = <AssistantPage onOpenNetwork={openNetwork} onOpenEvidence={openEvidence} />;
  else page = <DashboardExperiencePage onOpenCase={openCase} onOpenNetwork={openNetwork} onOpenHypotheses={() => navigate("/hypotheses")} />;

  const pageKey = route.name === "case-workspace" ? `${route.name}-${route.caseId}-${route.tab}` : `${route.name}-${"evidenceId" in route ? route.evidenceId ?? "" : ""}`;
  return <>
    <AppShell activeView={activeView} onNavigate={navigateView} onOpenCommandPalette={() => setPaletteOpen(true)} onExitDemo={() => { clearSession(); navigate("/"); }}>
      <Suspense fallback={<PageLoading />}><div className="experience-route-transition" key={pageKey}>{page}</div></Suspense>
    </AppShell>
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={commandItems} />
  </>;
}

function SutraApp() {
  const { route, navigate } = useSutraRouter();
  if (route.name === "landing" || route.name === "login") return <LandingPage onExplorePlatform={() => navigate("/dashboard")} onWatchDemo={() => navigate("/network")} onOpenLogin={() => navigate("/dashboard")} accessLabel="Open demo" />;
  return <DemoExperienceProvider><ExperienceConsole route={route} navigate={navigate} /></DemoExperienceProvider>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><SutraApp /></QueryClientProvider>;
}
