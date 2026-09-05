import Landing from "../features/teammate/Landing";
import { MotionConfig } from "motion/react";

export interface LandingPageProps {
  onExplorePlatform?: () => void;
  onWatchDemo?: () => void;
  onOpenLogin?: () => void;
  accessLabel?: string;
}

export function LandingPage({ onExplorePlatform, onWatchDemo, onOpenLogin }: LandingPageProps) {
  return <MotionConfig reducedMotion="user"><Landing
    onOpenDashboard={onWatchDemo ?? onExplorePlatform ?? (() => window.location.assign("/dashboard"))}
    onOpenLogin={onOpenLogin ?? (() => window.location.assign("/login"))}
  /></MotionConfig>;
}
