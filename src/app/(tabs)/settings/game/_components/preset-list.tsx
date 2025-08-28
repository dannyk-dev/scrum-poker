"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type PresetLite = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  updatedAt: string | Date;
};

type Props = {
  presets: PresetLite[];
  activePresetId?: string | null;
  applyingId: string | null;
  activatingId: string | null;
  deletingId: string | null;
  onEdit: (id: string) => void;
  onApply: (id: string) => Promise<void> | void;
  onActivate: (id: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

export default function PresetList({
  presets,
  activePresetId,
  applyingId,
  activatingId,
  deletingId,
  onEdit,
  onApply,
  onActivate,
  onDelete,
}: Props) {
  return (
    <div className="rounded-md border">
      <div className="border-b px-4 py-3">
        <div className="font-medium">Available presets</div>
        <div className="text-muted-foreground text-xs">Select, apply to scale, set active, or edit.</div>
      </div>

      <div className="max-h-[360px] divide-y overflow-y-auto">
        {presets.map((p) => {
          const isActive = p.id === activePresetId;
          const isApplying = applyingId === p.id;
          const isActivating = activatingId === p.id;
          const isDeleting = deletingId === p.id;

          return (
            <div key={p.id} className="flex flex-col items-start justify-between gap-y-3 px-4 py-3 md:flex-row">
              <div className="flex flex-col gap-y-1.5">
                <div className="space-x-2 text-sm font-medium">
                  <span>{p.name}</span>
                  {isActive && <Badge variant="success">(active)</Badge>}
                </div>
                <div className="text-muted-foreground text-xs">{p.description ?? "—"}</div>
              </div>

              <div className="grid grid-cols-4 gap-2 md:auto-cols-max md:grid-flow-col">
                <Button size="sm" variant="secondary" onClick={() => onEdit(p.id)}>
                  Edit
                </Button>

                <Button size="sm" variant="outline" onClick={() => onApply(p.id)} disabled={isApplying}>
                  {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Apply to scale
                </Button>

                <Button size="sm" onClick={() => onActivate(p.id)} disabled={isActivating}>
                  {isActivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Set active
                </Button>

                <Button size="sm" variant="destructive" onClick={() => onDelete(p.id)} disabled={isDeleting}>
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </Button>
              </div>
            </div>
          );
        })}

        {presets.length === 0 && (
          <div className="text-muted-foreground px-4 py-6 text-sm">No presets yet.</div>
        )}
      </div>
    </div>
  );
}
