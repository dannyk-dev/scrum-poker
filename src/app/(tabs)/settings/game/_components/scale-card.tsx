"use client";

import * as React from "react";
import { ScrumPointUnit } from "@prisma/client";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddPointDialog from "./add-point-dialog";

export default function ScaleCard() {
  const utils = api.useUtils();
  const { data } = api.gameSettings.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const points = data?.points ?? [];

  const updatePoint = api.gameSettings.updatePoint.useMutation({
    onSuccess: () => utils.gameSettings.get.invalidate(),
  });
  const removePoint = api.gameSettings.removePoint.useMutation({
    onSuccess: () => utils.gameSettings.get.invalidate(),
  });
  const reorderPoints = api.gameSettings.reorderPoints.useMutation({
    onSuccess: () => utils.gameSettings.get.invalidate(),
  });
  const replaceScale = api.gameSettings.replaceScale.useMutation({
    onSuccess: () => utils.gameSettings.get.invalidate(),
  });

  const moveRow = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= points.length) return;
    const orderedIds = points.map((p) => p.id);
    [orderedIds[index], orderedIds[next]] = [orderedIds[next], orderedIds[index]];
    reorderPoints.mutate({ orderedIds });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <AddPointDialog />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const items = [1,2,3,5,8,13,21,34,55].map((v) => ({
              value: v, timeStart: 0, timeEnd: 0, valueUnit: ScrumPointUnit.HOUR,
            }));
            replaceScale.mutate({ points: items });
          }}
        >
          Load Fibonacci
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <th className="text-left px-3 py-2">Value</th>
              <th className="text-left px-3 py-2">Unit</th>
              <th className="text-left px-3 py-2">Start</th>
              <th className="text-left px-3 py-2">End</th>
              <th className="text-left px-3 py-2">Position</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, idx) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">
                  <Input
                    className="w-24"
                    type="number"
                    value={p.value}
                    onChange={(e) => updatePoint.mutate({ id: p.id, value: Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={p.valueUnit}
                    onValueChange={(v) => updatePoint.mutate({ id: p.id, valueUnit: v as ScrumPointUnit })}
                  >
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(ScrumPointUnit).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Input
                    className="w-24"
                    type="number"
                    min={0}
                    value={p.timeStart}
                    onChange={(e) => updatePoint.mutate({ id: p.id, timeStart: Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    className="w-24"
                    type="number"
                    min={0}
                    value={p.timeEnd}
                    onChange={(e) => updatePoint.mutate({ id: p.id, timeEnd: Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-2">{p.position}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => moveRow(idx, -1)} disabled={idx === 0}>↑</Button>
                    <Button variant="outline" size="sm" onClick={() => moveRow(idx, +1)} disabled={idx === points.length - 1}>↓</Button>
                    <Button variant="destructive" size="sm" onClick={() => removePoint.mutate({ id: p.id })}>Remove</Button>
                  </div>
                </td>
              </tr>
            ))}
            {points.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No points yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
