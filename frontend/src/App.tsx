import { lazy, Suspense, type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Bot, BrainCircuit, Database, FileText, FolderKanban, LayoutDashboard, MapPin, Network, ScanSearch, Search, Users } from "lucide-react";
import { AppShell, type AppView } from "./components/AppShell";
import { CommandPalette, type CommandPaletteItem, Skeleton } from "./components/ui";
import { DemoExperienceProvider, useDemoExperience } from "./features/demo/DemoExperienceProvider";
import { clearSession, readSession, writeSession } from "./lib/session";
import { useSutraRouter, type SutraRoute } from "./lib/router";
import type { AuthSession } from "./types/api";
import { useSystemHealth } from "./api/queries";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AssistantPage } from "./pages/AssistantPage";
import { CaseWorkspacePage } from "./pages/CaseWorkspacePage";
import { CaseWorkspaceExperiencePage, type WorkspaceTab } from "./pages/CaseWorkspaceExperiencePage";
import { CasesPage } from "./pages/CasesPage";
import { CommandCenterPage } from "./pages/CommandCenterPage";
import { DashboardExperiencePage } from "./pages/DashboardExperiencePage";
import { DataStorePage } from "./pages/DataStorePage";
import { EvidencePage } from "./pages/EvidencePage";
import { HypothesisWorkbenchPage } from "./pages/HypothesisWorkbenchPage";
import { LandingPage } from "./pages/LandingPage";
import { LiveNetworkPage } from "./pages/LiveNetworkPage";
import { LiveEvidencePage } from "./pages/LiveEvidencePage";
import { LiveAssistantPage } from "./pages/LiveAssistantPage";
import { LoginPage } from "./pages/LoginPage";
import { SystemHealthPage } from "./pages/SystemHealthPage";
import { TimelinePage } from "./pages/TimelinePage";

const NetworkExplorerPage = lazy(async () => ({ default: (await import("./pages/NetworkExplorerPage")).NetworkExplorerPage }));
const FusionIntelligencePage = lazy(async () => ({ default: (await import("./pages/FusionIntelligencePage")).FusionIntelligencePage }));
const LiveFusionPage = lazy(async () => ({ default: (await import("./pages/LiveFusionPage")).LiveFusionPage }));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } },
});

const workspaceTabs = new Set<WorkspaceTab>(["overview", "entities", "network", "timeline", "evidence", "hypotheses", "assistant"]);

function routeToView(route: SutraRoute): AppView {
  if (route.name === "case-workspace" || route.name === "cases") return "cases";
  if (route.name === "network") return "network";
  if (route.name === "timeline") return "timeline";
  if (route.name === "evidence") return "evidence";
  if (route.name === "fusion") return "fusion";
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
  const openFusion = useCallback(() => navigate("/fusion"), [navigate]);
  const navigateView = useCallback((view: AppView) => {
    const paths: Record<AppView, string> = {
      dashboard: "/dashboard",
      cases: "/cases",
      network: "/network",
      timeline: "/timeline",
      evidence: "/evidence",
      "data-store": "/evidence",
      fusion: "/fusion",
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
    { id: "go-fusion", label: "Open Intelligence Fusion Center", description: "Review hotspots, entity matches, and the evidence pipeline", group: "Actions", icon: <ScanSearch size={16} />, onSelect: openFusion },
    ...cases.map((item) => ({ id: `case-${item.id}`, label: `${item.reference} - ${item.title}`, description: `${item.category} - ${item.status}`, group: "Cases", icon: <FolderKanban size={16} />, keywords: [item.owner, item.priority], onSelect: () => openCase(item.id) })),
    { id: "entity-rahul", label: "Rahul", description: "Person - focus in Network Explorer", group: "Entities", icon: <Users size={16} />, keywords: ["person", "P-037", "Rahul Verma"], onSelect: () => openEntity("person-rahul-verma") },
    { id: "entity-park-street", label: "Park Street", description: "Location - focus in Network Explorer", group: "Entities", icon: <MapPin size={16} />, keywords: ["location", "observation"], onSelect: () => openEntity("location-park-street") },
    { id: "entity-account", label: "Account ***4871", description: "Bank account - focus in Network Explorer", group: "Entities", icon: <Search size={16} />, keywords: ["bank", "transfer", "financial"], onSelect: () => openEntity("bank-account-4871") },
  ], [cases, navigate, openCase, openEntity, openFusion, openNetwork]);

  let page: ReactElement;
  if (route.name === "case-workspace") {
    const tab = workspaceTabs.has(route.tab as WorkspaceTab) ? route.tab as WorkspaceTab : "overview";
    page = <CaseWorkspaceExperiencePage caseId={route.caseId} activeTab={tab} onBack={() => navigate("/cases")} onNavigateTab={(nextTab) => {
      if (nextTab === "network") openNetwork();
      else if (nextTab === "assistant" || nextTab === "hypotheses") navigate("/" + nextTab);
      else navigate(`/cases/${encodeURIComponent(route.caseId)}/${nextTab}`);
    }} onOpenNetwork={openNetwork} onOpenEvidence={openEvidence} onOpenLive={() => navigate("/live/cases")} />;
  } else if (route.name === "cases") page = <CasesPage onOpenCase={openCase} onOpenLive={() => navigate("/live/cases")} />;
  else if (route.name === "network") page = <NetworkExplorerPage />;
  else if (route.name === "timeline") page = <TimelinePage onOpenNetwork={openNetwork} onOpenEvidence={openEvidence} />;
  else if (route.name === "evidence") page = <EvidencePage initialEvidenceId={route.evidenceId} onOpenNetwork={openNetwork} onOpenLiveEvidence={() => navigate("/live/evidence")} />;
  else if (route.name === "fusion") page = <FusionIntelligencePage onOpenNetwork={openNetwork} onOpenEvidence={openEvidence} />;
  else if (route.name === "hypotheses") page = <HypothesisWorkbenchPage />;
  else if (route.name === "assistant") page = <AssistantPage onOpenNetwork={openNetwork} onOpenEvidence={openEvidence} onOpenTimeline={() => navigate("/cases/case-104/timeline")} />;
  else page = <DashboardExperiencePage onOpenCase={openCase} onOpenNetwork={openNetwork} onOpenFusion={openFusion} onOpenHypotheses={() => navigate("/hypotheses")} />;

  const pageKey = route.name === "case-workspace" ? `${route.name}-${route.caseId}-${route.tab}` : `${route.name}-${"evidenceId" in route ? route.evidenceId ?? "" : ""}`;
  return <>
    <AppShell activeView={activeView} onNavigate={navigateView} onOpenCommandPalette={() => setPaletteOpen(true)} onExit={() => { clearSession(); navigate("/"); }}>
      <Suspense fallback={<PageLoading />}><div className="experience-route-transition" key={pageKey}>{page}</div></Suspense>
    </AppShell>
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={commandItems} />
  </>;
}

function LiveConsole({
  route,
  session,
  navigate,
  onLogout,
}: {
  route: SutraRoute;
  session: AuthSession;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  onLogout: () => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const health = useSystemHealth();
  const token = session.access_token;
  const caseId = "caseId" in route ? route.caseId : undefined;
  const activeView: AppView = route.name === "live-cases" ? "cases"
    : route.name === "live-fusion" ? "fusion"
    : route.name === "live-network" ? "network"
      : route.name === "live-evidence" ? "evidence"
        : route.name === "live-data-store" ? "data-store"
          : route.name === "live-assistant" ? "assistant"
      : route.name === "live-analytics" ? "analytics"
        : route.name === "live-system" ? "system"
          : "dashboard";
  const openCase = useCallback((id: string) => navigate(`/live/cases/${encodeURIComponent(id)}`), [navigate]);
  const openNetwork = useCallback((id?: string) => navigate(id ? `/live/network?case=${encodeURIComponent(id)}` : "/live/network"), [navigate]);
  const selectNetworkCase = useCallback((id: string) => openNetwork(id), [openNetwork]);
  const selectAnalyticsCase = useCallback((id: string) => navigate(`/live/analytics?case=${encodeURIComponent(id)}`), [navigate]);
  const navigateView = useCallback((view: AppView) => {
    const paths: Partial<Record<AppView, string>> = {
      dashboard: "/live",
      cases: "/live/cases",
      network: "/live/network",
      fusion: "/live/fusion",
      evidence: "/live/evidence",
      "data-store": "/live/data-store",
      assistant: "/live/assistant",
      analytics: "/live/analytics",
      system: "/live/system",
    };
    navigate(paths[view] ?? "/live");
  }, [navigate]);
  const commands = useMemo<CommandPaletteItem[]>(() => [
    { id: "live-fusion", label: "Intelligence Fusion Center", description: "Open the interactive sample map within the live console", group: "Live console", icon: <MapPin size={16} />, onSelect: () => navigate("/live/fusion") },
    { id: "live-dashboard", label: "Live Dashboard", description: "Open the backend-connected overview", group: "Live console", icon: <LayoutDashboard size={16} />, onSelect: () => navigate("/live") },
    { id: "live-cases", label: "Live Cases", description: "Read authorised cases from the database", group: "Live console", icon: <FolderKanban size={16} />, onSelect: () => navigate("/live/cases") },
    { id: "live-network", label: "Live Network", description: "Query the backend knowledge graph", group: "Live console", icon: <Network size={16} />, onSelect: () => navigate("/live/network") },
    { id: "live-evidence", label: "Upload Evidence", description: "Store and process files in the evidence pipeline", group: "Live console", icon: <FileText size={16} />, onSelect: () => navigate("/live/evidence") },
    { id: "live-store", label: "Open Data Store", description: "Inspect uploaded files and extracted database records", group: "Live console", icon: <Database size={16} />, onSelect: () => navigate("/live/data-store") },
    { id: "live-assistant", label: "Open SUTRA Copilot", description: "Ask the evidence-grounded graph copilot", group: "Live console", icon: <Bot size={16} />, onSelect: () => navigate("/live/assistant") },
    { id: "live-analytics", label: "Live Analytics", description: "Open backend bridge analysis", group: "Live console", icon: <ScanSearch size={16} />, onSelect: () => navigate("/live/analytics") },
  ], [navigate]);

  let page: ReactElement;
  if (route.name === "live-cases") {
    page = <CaseWorkspacePage token={token} caseId={route.caseId} onSelectCase={openCase} onExploreNetwork={() => openNetwork(route.caseId)} onOpenStore={(id, batch) => navigate(`/live/data-store?case=${encodeURIComponent(id)}${batch ? `&batch=${encodeURIComponent(batch)}` : ""}`)} />;
  } else if (route.name === "live-network") {
    page = <LiveNetworkPage token={token} entityId={route.entityId} caseId={route.caseId} onSelectCase={selectNetworkCase} />;
  } else if (route.name === "live-fusion") {
    page = <LiveFusionPage onOpenLiveEvidence={() => navigate("/live/evidence")} />;
  } else if (route.name === "live-evidence") {
    page = <LiveEvidencePage token={token} initialCaseId={route.caseId} onOpenDataStore={(id, batch) => navigate(`/live/data-store?case=${encodeURIComponent(id ?? "")}${batch ? `&batch=${encodeURIComponent(batch)}` : ""}`)} onOpenNetwork={openNetwork} />;
  } else if (route.name === "live-data-store") {
    page = <DataStorePage key={`${route.caseId}-${route.ingestionId}-${route.documentId}`} token={token} initialCaseId={route.caseId} initialIngestionId={route.ingestionId} initialDocumentId={route.documentId} />;
  } else if (route.name === "live-assistant") {
    page = <LiveAssistantPage token={token} onNavigate={navigate} />;
  } else if (route.name === "live-analytics") {
    page = <AnalyticsPage token={token} caseId={route.caseId} onSelectCase={selectAnalyticsCase} onOpenNetwork={() => openNetwork(route.caseId)} />;
  } else if (route.name === "live-system") {
    page = <SystemHealthPage />;
  } else {
    page = <CommandCenterPage token={token} health={health.data} onOpenCase={openCase} onOpenNetwork={() => openNetwork()} />;
  }

  return <>
    <AppShell
      activeView={activeView}
      onNavigate={navigateView}
      onOpenCommandPalette={() => setPaletteOpen(true)}
      onExit={onLogout}
      mode="live"
      userName={session.user.full_name}
      userDetail={session.user.role}
    >
      <Suspense fallback={<PageLoading />}><div className="experience-route-transition">{page}</div></Suspense>
    </AppShell>
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={commands} />
  </>;
}

function SutraApp() {
  const { route, navigate } = useSutraRouter();
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  useEffect(() => {
    const expire = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== session?.access_token) return;
      clearSession(); setSession(null); queryClient.clear();
    };
    window.addEventListener("sutra:session-expired", expire);
    return () => window.removeEventListener("sutra:session-expired", expire);
  }, [session?.access_token]);
  const authenticated = useCallback((nextSession: AuthSession) => {
    writeSession(nextSession);
    setSession(nextSession);
    const intended = window.location.pathname.startsWith("/live") ? window.location.pathname + window.location.search : "/live";
    navigate(intended, { replace: true });
  }, [navigate]);
  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    queryClient.clear();
    navigate("/", { replace: true });
  }, [navigate]);

  if (route.name === "landing") return <LandingPage onExplorePlatform={() => navigate("/cases/case-104/overview")} onWatchDemo={() => navigate("/network")} onOpenLogin={() => navigate("/login")} accessLabel="Open Live Console" />;
  if (route.name === "login") return session ? <LiveConsole route={{ name: "live-dashboard" }} session={session} navigate={navigate} onLogout={logout} /> : <LoginPage onAuthenticated={authenticated} onOpenDemo={() => navigate("/cases/case-104/overview")} />;
  if (route.name.startsWith("live-")) return session ? <LiveConsole route={route} session={session} navigate={navigate} onLogout={logout} /> : <LoginPage onAuthenticated={authenticated} onOpenDemo={() => navigate("/cases/case-104/overview")} />;
  return <DemoExperienceProvider><ExperienceConsole route={route} navigate={navigate} /></DemoExperienceProvider>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><SutraApp /></QueryClientProvider>;
}
