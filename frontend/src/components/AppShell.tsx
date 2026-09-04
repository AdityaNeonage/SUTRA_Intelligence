import type { ReactNode } from "react";
import {
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
  ShieldCheck,
} from "lucide-react";

export type AppView = "dashboard" | "cases" | "network" | "timeline" | "evidence" | "fusion" | "hypotheses" | "assistant" | "analytics" | "system";

const navigation: Array<{ id: AppView; label: string; icon: typeof LayoutDashboard; description: string }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Operational intelligence" },
  { id: "cases", label: "Cases", icon: FolderKanban, description: "Case management and workspaces" },
  { id: "network", label: "Network Explorer", icon: Network, description: "Interactive relationship graph" },
  { id: "timeline", label: "Timeline", icon: CalendarClock, description: "Activity and event context" },
  { id: "evidence", label: "Evidence", icon: FileText, description: "Source-aware evidence register" },
  { id: "fusion", label: "Fusion Lab", icon: ScanSearch, description: "Hotspots, resolution, and evidence pipeline" },
  { id: "hypotheses", label: "Hypothesis Workbench", icon: BrainCircuit, description: "Compare competing explanations" },
  { id: "assistant", label: "AI Assistant", icon: Bot, description: "Reviewable mock graph actions" },
];

export function AppShell({
  activeView,
  onNavigate,
  onOpenCommandPalette,
  onExitDemo,
  children,
}: {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenCommandPalette: () => void;
  onExitDemo: () => void;
  children: ReactNode;
}) {
  const activeItem = navigation.find((item) => item.id === activeView) ?? navigation[0];
  return (
    <div className="app-shell experience-shell">
      <aside className="sidebar">
        <button className="brand brand--button" onClick={() => onNavigate("dashboard")} aria-label="Go to SUTRA dashboard">
          <div className="brand__mark"><ShieldCheck size={22} strokeWidth={2.1} /></div>
          <div><strong>SUTRA</strong><span>SECURE UNIFIED THREAT &amp; RELATIONSHIP ANALYTICS</span></div>
        </button>
        <div className="sidebar__section-label">Investigation workspace</div>
        <nav className="sidebar__nav" aria-label="Primary navigation">
          {navigation.map(({ id, label, icon: Icon, description }) => (
            <button key={id} className={`nav-item${activeView === id ? " nav-item--active" : ""}`} onClick={() => onNavigate(id)} title={description}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__foot">
          <div className="sidebar__classification"><span /> Synthetic demo - evidence-first</div>
          <button className="nav-item nav-item--logout" onClick={onExitDemo}><LogOut size={18} /> <span>Exit demo</span></button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar experience-topbar">
          <div><div className="breadcrumb">SUTRA <span>/</span> {activeItem.label}</div><h1>{activeItem.label}</h1></div>
          <div className="topbar__actions">
            <button className="command-trigger" onClick={onOpenCommandPalette} aria-label="Open command palette"><Command size={15} /><span>Search SUTRA</span><kbd>Ctrl K</kbd></button>
            <span className="experience-live-status"><i /> Demo ready</span>
            <div className="user-chip" title="Synthetic Phase 2 investigator session"><span>I</span><div><strong>Investigator</strong><small>demo workspace</small></div></div>
          </div>
        </header>
        <section className="page-content experience-page-content">{children}</section>
      </main>
    </div>
  );
}
