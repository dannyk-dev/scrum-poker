"use client";

import * as React from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import CreatePresetDialog from "@/app/(tabs)/settings/game/_components/create-preset-dialog";
import EditPresetDialog from "@/app/(tabs)/settings/game/_components/edit-preset-dialog";
import PresetList from "@/app/(tabs)/settings/game/_components/preset-list";

export default function PresetsCard() {
  const utils = api.useUtils();

  const { data: settings } = api.gameSettings.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const presetsQuery = api.gameSettings.listPresets.useQuery(undefined, { refetchOnWindowFocus: false });

  const setActivePreset = api.gameSettings.setActivePreset.useMutation({
    onSuccess: () => Promise.all([utils.gameSettings.get.invalidate(), utils.gameSettings.listPresets.invalidate()]),
  });
  const applyPresetToScale = api.gameSettings.applyPresetToScale.useMutation({
    onSuccess: () => utils.gameSettings.get.invalidate(),
  });
  const deletePreset = api.gameSettings.deletePreset.useMutation({
    onSuccess: () => presetsQuery.refetch(),
  });

  // per-row loading flags
  const [applyingId, setApplyingId] = React.useState<string | null>(null);
  const [activatingId, setActivatingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [clearingActive, setClearingActive] = React.useState(false);

  // dialogs
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CreatePresetDialog open={createOpen} onOpenChange={setCreateOpen} />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setClearingActive(true);
              try {
                await setActivePreset.mutateAsync({ presetId: null });
              } finally {
                setClearingActive(false);
              }
            }}
            disabled={clearingActive}
          >
            {clearingActive && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Clear active
          </Button>
        </div>
      </div>

      <Separator />

      <PresetList
        presets={presetsQuery.data ?? []}
        activePresetId={settings?.settings?.activePresetId}
        applyingId={applyingId}
        activatingId={activatingId}
        deletingId={deletingId}
        onEdit={(id) => {
          setEditingId(id);
          setEditOpen(true);
        }}
        onApply={async (id) => {
          setApplyingId(id);
          try {
            await applyPresetToScale.mutateAsync({ presetId: id });
          } finally {
            setApplyingId(null);
          }
        }}
        onActivate={async (id) => {
          setActivatingId(id);
          try {
            await setActivePreset.mutateAsync({ presetId: id });
          } finally {
            setActivatingId(null);
          }
        }}
        onDelete={async (id) => {
          setDeletingId(id);
          try {
            await deletePreset.mutateAsync({ presetId: id });
          } finally {
            setDeletingId(null);
          }
        }}
      />

      <EditPresetDialog
        open={editOpen}
        presetId={editingId}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditingId(null);
        }}
      />
    </div>
  );
}
