import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "./Button";
import { Tooltip } from "./Tooltip";
import { cx } from "./utils";

export interface GraphControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFit?: () => void;
  onReset?: () => void;
  disabled?: boolean;
  className?: string;
}

/** Common compact controls for a Cytoscape/Sigma canvas without binding to either library. */
export function GraphControls({ onZoomIn, onZoomOut, onFit, onReset, disabled = false, className }: GraphControlsProps) {
  const controls = [
    { id: "zoom-out", label: "Zoom out", icon: <Minus size={15} />, action: onZoomOut },
    { id: "zoom-in", label: "Zoom in", icon: <Plus size={15} />, action: onZoomIn },
    { id: "fit", label: "Fit graph to view", icon: <Maximize2 size={14} />, action: onFit },
    { id: "reset", label: "Reset graph view", icon: <RotateCcw size={14} />, action: onReset },
  ];

  return (
    <div className={cx("sutra-graph-controls", className)} role="group" aria-label="Network graph controls">
      {controls.map((control) => (
        <Tooltip key={control.id} content={control.label}>
          <Button variant="ghost" size="sm" aria-label={control.label} disabled={disabled || !control.action} onClick={control.action}>{control.icon}</Button>
        </Tooltip>
      ))}
    </div>
  );
}
