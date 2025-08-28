"use client";

import * as React from "react";
import { ScrumPointUnit } from "@prisma/client";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddPoinTableCellialog from "./add-point-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import InputNumberChevron from "@/components/ui/input-number-chevron";

export default function ScaleCard() {
  const utils = api.useUtils();
  const { data } = api.gameSettings.get.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
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
    [orderedIds[index], orderedIds[next]] = [
      orderedIds[next],
      orderedIds[index],
    ];
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
          Load Fibonacci
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow>
              <TableHead>Value</TableHead>
              <TableHead>Unit (start)</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Unit (end)</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((p, idx) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Input
                    className="w-full max-w-32"
                    type="number"
                    value={p.value}
                    onChange={(e) =>
                      updatePoint.mutate({
                        id: p.id,
                        value: Number(e.target.value),
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={p.valueStartUnit}
                    onValueChange={(v) =>
                      updatePoint.mutate({
                        id: p.id,
                        valueStartUnit: v as ScrumPointUnit,
                      })
                    }
                  >
                    <SelectTrigger className="w-full max-w-32">
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
                    defaultValue={p.timeStart}
                    value={p.timeStart}
                    onChange={(val) =>
                      updatePoint.mutate({
                        id: p.id,
                        timeStart: Number(val),
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={p.valueEndUnit}
                    className="w-full max-w-32"
                    onValueChange={(v) =>
                      updatePoint.mutate({
                        id: p.id,
                        valueEndUnit: v as ScrumPointUnit,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
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
                    value={p.timeEnd}
                    defaultValue={p.timeEnd}
                    onChange={(val) =>
                      updatePoint.mutate({
                        id: p.id,
                        timeEnd: Number(val),
                      })
                    }
                  />
                </TableCell>
                <TableCell>{p.position}</TableCell>
                <TableCell className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveRow(idx, -1)}
                      disabled={idx === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveRow(idx, +1)}
                      disabled={idx === points.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removePoint.mutate({ id: p.id })}
                      isLoading={removePoint.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {points.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground px-3 py-8 text-center"
                >
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
