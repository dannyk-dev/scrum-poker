"use client";

import * as React from "react";
import { ScrumPointUnit } from "@prisma/client";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import AddPoinTableCellialog from "./add-point-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import InputNumberChevron from "@/components/ui/input-number-chevron";
import { Check, X, ArrowUp, ArrowDown, Loader2, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/confirm-dialog";

type PointDraft = {
  value: number;
  valueStartUnit: ScrumPointUnit;
  timeStart: number;
  valueEndUnit: ScrumPointUnit;
  timeEnd: number;
};

export default function ScaleCard() {
  const utils = api.useUtils();
  const { data, isLoading } = api.gameSettings.get.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const points = data?.points ?? [];

  const updatePoint = api.gameSettings.updatePoint.useMutation({
    onSuccess: () => utils.gameSettings.get.invalidate(),
  });
  const removePoint = api.gameSettings.removePoint.useMutation({
    onSuccess: () => utils.gameSettings.get.invalidate(),
  });
  const replaceScale = api.gameSettings.replaceScale.useMutation({
    onSuccess: () => utils.gameSettings.get.invalidate(),
  });
  const clearScale = api.gameSettings.clearScale.useMutation({
    onSuccess: () => utils.gameSettings.get.invalidate(),
  });

  // optimistic reorder
  const reorderPoints = api.gameSettings.reorderPoints.useMutation({
    async onMutate({ orderedIds }) {
      await utils.gameSettings.get.cancel();
      const prev = utils.gameSettings.get.getData();
      utils.gameSettings.get.setData(undefined, (old) => {
        if (!old) return old;
        const map = new Map(old.points.map((p) => [p.id, p]));
        const nextPoints = orderedIds
          .map((id, idx) => {
            const p = map.get(id);
            return p ? { ...p, position: idx } : undefined;
          })
          .filter(Boolean) as typeof old.points;
        return { ...old, points: nextPoints };
      });
      return { prev };
    },
    onError(_e, _v, ctx) {
      if (ctx?.prev) utils.gameSettings.get.setData(undefined, ctx.prev);
    },
    onSettled() {
      utils.gameSettings.get.invalidate();
    },
  });

  // local row state
  const [editing, setEditing] = React.useState<Record<string, PointDraft | undefined>>({});
  const [savingRowId, setSavingRowId] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const startEditIfNeeded = (id: string, seed: PointDraft) => {
    setEditing((prev) => (prev[id] ? prev : { ...prev, [id]: { ...seed } }));
  };
  const patchDraft = (id: string, patch: Partial<PointDraft>, seed: PointDraft) => {
    startEditIfNeeded(id, seed);
    setEditing((prev) => ({ ...prev, [id]: { ...(prev[id] ?? seed), ...patch } }));
  };
  const cancelRow = (id: string) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const acceptRow = async (id: string) => {
    const draft = editing[id];
    if (!draft) return;
    const original = points.find((p) => p.id === id);
    if (!original) return;

    setSavingRowId(id);
    try {
      const ops: Promise<unknown>[] = [];
      if (draft.value !== original.value) ops.push(updatePoint.mutateAsync({ id, value: draft.value }));
      if (draft.valueStartUnit !== original.valueStartUnit)
        ops.push(updatePoint.mutateAsync({ id, valueStartUnit: draft.valueStartUnit }));
      if (draft.timeStart !== original.timeStart) ops.push(updatePoint.mutateAsync({ id, timeStart: draft.timeStart }));
      if (draft.valueEndUnit !== original.valueEndUnit)
        ops.push(updatePoint.mutateAsync({ id, valueEndUnit: draft.valueEndUnit }));
      if (draft.timeEnd !== original.timeEnd) ops.push(updatePoint.mutateAsync({ id, timeEnd: draft.timeEnd }));
      await Promise.all(ops);
      cancelRow(id);
    } finally {
      setSavingRowId(null);
    }
  };

  const moveRow = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= points.length) return;
    const orderedIds = points.map((p) => p.id);
    [orderedIds[index], orderedIds[next]] = [orderedIds[next], orderedIds[index]];
    reorderPoints.mutate({ orderedIds });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AddPoinTableCellialog />

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const items = [1, 2, 3, 5, 8, 13, 21, 34, 55].map((v) => ({
              value: v,
              timeStart: 0,
              timeEnd: 0,
              valueStartUnit: ScrumPointUnit.HOUR,
              valueEndUnit: ScrumPointUnit.HOUR,
            }));
            replaceScale.mutate({ points: items });
          }}
          isLoading={replaceScale.isPending}
        >
          {replaceScale.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Load Fibonacci
        </Button>

        <ConfirmDialog
          disabled={points.length === 0}
          trigger={
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear scale
            </Button>
          }
          title="Clear scale?"
          description="This will delete all points from the current scale. This cannot be undone."
          confirmText="Clear"
          confirmVariant="destructive"
          onConfirm={() => clearScale.mutate()}
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader className="bg-muted/60 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
            <TableRow>
              <TableHead className="w-[120px]">Value</TableHead>
              <TableHead className="w-[160px]">Unit (start)</TableHead>
              <TableHead className="w-[140px]">Time</TableHead>
              <TableHead className="w-[160px]">Unit (end)</TableHead>
              <TableHead className="w-[140px]">Time</TableHead>
              <TableHead className="w-[90px] text-center">Pos</TableHead>
              <TableHead className="w-[220px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {points.map((p, idx) => {
              const rowDraft = editing[p.id];
              const row = rowDraft ?? (p as PointDraft);
              const isEditing = !!rowDraft;
              const rowSaving = savingRowId === p.id;
              const seed: PointDraft = {
                value: p.value,
                valueStartUnit: p.valueStartUnit,
                timeStart: p.timeStart,
                valueEndUnit: p.valueEndUnit,
                timeEnd: p.timeEnd,
              };

              return (
                <TableRow key={p.id} className={isEditing ? "bg-muted/30 hover:bg-muted/40" : undefined}>
                  <TableCell>
                    <Input
                      className="w-full max-w-32"
                      type="number"
                      value={row.value}
                      disabled={rowSaving}
                      onChange={(e) => patchDraft(p.id, { value: Number(e.target.value) }, seed)}
                    />
                  </TableCell>

                  <TableCell>
                    <Select
                      value={row.valueStartUnit}
                      onValueChange={(v) => patchDraft(p.id, { valueStartUnit: v as ScrumPointUnit }, seed)}
                      disabled={rowSaving}
                    >
                      <SelectTrigger className="w-full max-w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ScrumPointUnit).map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>
                    <InputNumberChevron
                      className="w-fit max-w-32"
                      value={row.timeStart}
                      onChange={(val) => patchDraft(p.id, { timeStart: Number(val) }, seed)}
                      isDisabled={rowSaving}
                    />
                  </TableCell>

                  <TableCell>
                    <Select
                      value={row.valueEndUnit}
                      onValueChange={(v) => patchDraft(p.id, { valueEndUnit: v as ScrumPointUnit }, seed)}
                      disabled={rowSaving}
                    >
                      <SelectTrigger className="w-full max-w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ScrumPointUnit).map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>
                    <InputNumberChevron
                      className="w-fit max-w-32"
                      value={row.timeEnd}
                      onChange={(val) => patchDraft(p.id, { timeEnd: Number(val) }, seed)}
                      isDisabled={rowSaving}
                    />
                  </TableCell>

                  <TableCell className="text-center text-muted-foreground">{p.position}</TableCell>

                  <TableCell className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button variant="default" size="sm" onClick={() => acceptRow(p.id)} isLoading={rowSaving}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => cancelRow(p.id)} disabled={rowSaving}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => moveRow(idx, -1)} disabled={idx === 0}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveRow(idx, +1)}
                            disabled={idx === points.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              setRemovingId(p.id);
                              try {
                                await removePoint.mutateAsync({ id: p.id });
                              } finally {
                                setRemovingId(null);
                              }
                            }}
                            isLoading={removingId === p.id}
                          >
                           Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {!isLoading && points.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground px-3 py-8 text-center">
                  No points yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
