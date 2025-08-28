"use client";

import * as React from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { ScrumPointUnit } from "@prisma/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InputNumberChevron from "@/components/ui/input-number-chevron";
import type { PresetForm } from "@/app/(tabs)/settings/game/_utils/schema";
// import { PresetForm } from "../_utils/schema";

type Props = {
  form: UseFormReturn<PresetForm>;
  disabled?: boolean;
  onAdd: () => void;
  onRemove: (i: number) => void;
  addLabel?: string;
};

export default function PresetItemsTable({ form, disabled, onAdd, onRemove, addLabel = "Add" }: Props) {
  const items = form.watch("items");

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>Items</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={disabled}>
          {addLabel}
        </Button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-md border">
        <Table className="w-full text-sm">
          <TableHeader className="bg-muted/60 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
            <TableRow>
              <TableHead className="px-3 py-2">Value</TableHead>
              <TableHead className="px-3 py-2">Unit (start)</TableHead>
              <TableHead className="px-3 py-2">Time</TableHead>
              <TableHead className="px-3 py-2">Unit (end)</TableHead>
              <TableHead className="px-3 py-2">Time</TableHead>
              <TableHead className="px-3 py-2 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

        <TableBody>
          {items.map((_, i) => (
            <TableRow key={i}>
              <TableCell className="px-3 py-2">
                <Controller
                  control={form.control}
                  name={`items.${i}.value`}
                  render={({ field }) => (
                    <InputNumberChevron
                      className="w-24"
                      value={field.value}
                      defaultValue={field.value}
                      onChange={(val) => field.onChange(Number(val))}
                      isDisabled={disabled}
                    />
                  )}
                />
              </TableCell>

              <TableCell className="px-3 py-2">
                <Controller
                  control={form.control}
                  name={`items.${i}.valueStartUnit`}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ScrumPointUnit).map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </TableCell>

              <TableCell className="px-3 py-2">
                <Controller
                  control={form.control}
                  name={`items.${i}.timeStart`}
                  render={({ field }) => (
                    <InputNumberChevron
                      className="w-28"
                      value={field.value}
                      defaultValue={field.value}
                      onChange={(val) => field.onChange(Number(val))}
                      isDisabled={disabled}
                    />
                  )}
                />
              </TableCell>

              <TableCell className="px-3 py-2">
                <Controller
                  control={form.control}
                  name={`items.${i}.valueEndUnit`}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ScrumPointUnit).map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </TableCell>

              <TableCell className="px-3 py-2">
                <Controller
                  control={form.control}
                  name={`items.${i}.timeEnd`}
                  render={({ field }) => (
                    <InputNumberChevron
                      className="w-28"
                      value={field.value}
                      defaultValue={field.value}
                      onChange={(val) => field.onChange(Number(val))}
                      isDisabled={disabled}
                    />
                  )}
                />
              </TableCell>

              <TableCell className="px-3 py-2 text-right">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemove(i)}
                  disabled={disabled}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}

          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground px-3 py-8 text-center">
                No items.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        </Table>
      </div>
    </div>
  );
}
