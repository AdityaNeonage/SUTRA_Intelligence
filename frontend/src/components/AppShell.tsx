import type { ReactNode } from "react";
import {
  ArrowLeft,
  Bot,
  BrainCircuit,
  CalendarClock,
  Command,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Network,
  ScanSearch,
  ServerCog,
  Database,
  Waypoints,
} from "lucide-react";

export type AppView = "dashboard" | "cases" | "network" | "timeline" | "evidence" | "data-store" | "fusion" | "hypotheses" | "assistant" | "analytics" | "system";

const navigation: Array<{ id: AppView; label: string; icon: typeof LayoutDashboard; description: string }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Operational intelligence" },
  { id: "cases", label: "Cases", icon: FolderKanban, description: "Case management and workspaces" },
  { id: "network", label: "Network", icon: Network, description: "Interactive relationship graph" },
  { id: "timeline", label: "Timeline", icon: CalendarClock, description: "Activity and event context" },
  { id: "evidence", label: "Evidence", icon: FileText, description: "Source-aware evidence register" },
  { id: "fusion", label: "Map & Identity", icon: ScanSearch, description: "Hotspots, resolution, and evidence pipeline" },
  { id: "hypotheses", label: "AI Insights", icon: BrainCircuit, description: "Compare competing explanations" },
  { id: "assistant", label: "Copilot", icon: Bot, description: "Reviewable mock graph actions" },
];

const liveNavigation: Array<{ id: AppView; label: string; icon: typeof LayoutDashboard; description: string }> = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard, description: "Backend-connected operational overview" },
  { id: "cases", label: "Cases", icon: FolderKanban, description: "Authorised cases from the database" },
  { id: "network", label: "Network", icon: Network, description: "Relationship graph returned by the API" },
  { id: "fusion", label: "Map & Identity", icon: ScanSearch, description: "Interactive sample map and linked evidence inside the live console" },
  { id: "evidence", label: "Evidence Hub", icon: FileText, description: "Upload files into the evidence pipeline" },
  { id: "data-store", label: "Data Store", icon: Database, description: "Inspect files and records stored by the backend" },
  { id: "assistant", label: "SUTRA Copilot", icon: Bot, description: "Deterministic evidence-grounded graph assistance" },
  { id: "analytics", label: "AI Insights", icon: Waypoints, description: "Backend graph analytics" },
  { id: "system", label: "System Health", icon: ServerCog, description: "API and dependency readiness" },
];

export function AppShell({
  activeView,
  onNavigate,
  onOpenCommandPalette,
  onExit,
  mode = "demo",
  userName = "Investigator",
  userDetail = "demo workspace",
  children,
}: {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenCommandPalette: () => void;
  onExit: () => void;
  mode?: "demo" | "live";
  userName?: string;
  userDetail?: string;
  children: ReactNode;
}) {
  const activeNavigation = mode === "live" ? liveNavigation : navigation;
  const activeItem = activeNavigation.find((item) => item.id === activeView) ?? activeNavigation[0];
  const initial = userName.trim().charAt(0).toUpperCase() || "I";
  return (
    <div className="app-shell experience-shell team-console">
      <aside className="sidebar">
        <div className="team-brand-row">
          <button className="team-back" onClick={onExit} aria-label={mode === "live" ? "Sign out" : "Return to home"}><ArrowLeft size={15} /></button>
          <button className="team-brand" onClick={() => onNavigate("dashboard")} aria-label="SUTRA dashboard"><img src="/teammate-logo.jpeg" alt="" /><strong>SUTRA</strong></button>
        </div>
        <div className="team-workspace-card"><span>Investigation workspace</span><strong>{mode === "live" ? "Authorised access" : "Sample investigation"}</strong><small><i />{mode === "live" ? "Signed-in session" : "Synthetic data · not live"}</small></div>
        <nav className="sidebar__nav" aria-label="Primary navigation">
          {activeNavigation.map(({ id, label, icon: Icon, description }) => (
            <button key={id} className={`nav-item${activeView === id ? " nav-item--active" : ""}`} onClick={() => onNavigate(id)} title={description} aria-label={label} aria-current={activeView === id ? "page" : undefined}>
              <Icon size={17} strokeWidth={1.7} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__foot">
          {mode === "demo" && <a className="team-live-link" href="/login">Open live workspace <ArrowLeft size={14} style={{transform:"rotate(180deg)"}} /></a>}
          <div className="team-investigator"><b>{initial}</b><div><strong>{userName}</strong><span>{userDetail}</span></div></div>
          <button className="nav-item nav-item--logout" onClick={onExit} aria-label={mode === "live" ? "Sign out" : "Exit demo"}><LogOut size={16} /><span>{mode === "live" ? "Sign out" : "Exit demo"}</span></button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar experience-topbar">
          <div className="team-page-heading"><span>Workspace /</span><h1>{activeItem.label}</h1></div>
          <div className="topbar__actions">
            <button className="command-trigger" onClick={onOpenCommandPalette} aria-label="Open command palette"><Command size={14} /><span>Search investigation</span><kbd>Ctrl K</kbd></button>
            <span className="team-session-badge">{mode === "live" ? "LIVE WORKSPACE" : "SAMPLE"}</span>
          </div>
        </header>
        <section className="page-content experience-page-content">{children}</section>
        {activeView !== "assistant" && <button className="team-copilot-launcher" onClick={() => onNavigate("assistant")}><img src="/teammate-copilot.png" alt="" /><span>SUTRA Copilot</span><i /></button>}
      </main>
    </div>
  );
}
