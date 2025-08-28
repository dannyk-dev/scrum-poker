"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrumPointUnit } from "@prisma/client";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const presetSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        value: z.number().int(),
        timeStart: z.number().int().nonnegative(),
        timeEnd: z.number().int().nonnegative(),
        valueStartUnit: z.nativeEnum(ScrumPointUnit),
        valueEndUnit: z.nativeEnum(ScrumPointUnit),
      }),
    )
    .min(1, "Add at least one point"),
  isDefault: z.boolean().optional(),
});
type PresetForm = z.infer<typeof presetSchema>;

export default function PresetsCard() {
  const utils = api.useUtils();
  const { data: settings } = api.gameSettings.get.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const presetsQuery = api.gameSettings.listPresets.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const setActivePreset = api.gameSettings.setActivePreset.useMutation({
    onSuccess: () =>
      Promise.all([
        utils.gameSettings.get.invalidate(),
        utils.gameSettings.listPresets.invalidate(),
      ]),
  });
  const applyPresetToScale = api.gameSettings.applyPresetToScale.useMutation({
    onSuccess: () => utils.gameSettings.get.invalidate(),
  });
  const deletePreset = api.gameSettings.deletePreset.useMutation({
    onSuccess: () => presetsQuery.refetch(),
  });
  const createPreset = api.gameSettings.createPreset.useMutation({
    onSuccess: () =>
      Promise.all([
        utils.gameSettings.listPresets.invalidate(),
        utils.gameSettings.get.invalidate(),
      ]),
  });

  const [open, setOpen] = React.useState(false);
  const form = useForm<PresetForm>({
    resolver: zodResolver(presetSchema),
    defaultValues: {
      name: "",
      description: "",
      isDefault: false,
      items: [
        {
          value: 1,
          timeStart: 0,
          timeEnd: 0,
          valueStartUnit: ScrumPointUnit.DAY,
          valueEndUnit: ScrumPointUnit.DAY,
        },
        {
          value: 2,
          timeStart: 0,
          timeEnd: 0,
          valueStartUnit: ScrumPointUnit.DAY,
          valueEndUnit: ScrumPointUnit.DAY,
        },
        {
          value: 3,
          timeStart: 0,
          timeEnd: 0,
          valueStartUnit: ScrumPointUnit.DAY,
          valueEndUnit: ScrumPointUnit.DAY,
        },
        {
          value: 5,
          timeStart: 0,
          timeEnd: 0,
          valueStartUnit: ScrumPointUnit.DAY,
          valueEndUnit: ScrumPointUnit.DAY,
        },
        {
          value: 8,
          timeStart: 0,
          timeEnd: 0,
          valueStartUnit: ScrumPointUnit.DAY,
          valueEndUnit: ScrumPointUnit.DAY,
        },
      ],
    },
  });

  const addItem = () => {
    const arr = form.getValues("items");
    form.setValue(
      "items",
      [
        ...arr,
        {
          value: 13,
          timeStart: 0,
          timeEnd: 0,
          valueStartUnit: ScrumPointUnit.DAY,
          valueEndUnit: ScrumPointUnit.DAY,
        },
      ],
      { shouldDirty: true },
    );
  };
  const removeItem = (i: number) => {
    const arr = form.getValues("items").filter((_, idx) => idx !== i);
    form.setValue("items", arr, { shouldDirty: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">New preset</Button>
          </DialogTrigger>
          <DialogContent className="w-fit sm:max-w-fit">
            <DialogHeader>
              <DialogTitle>Create preset</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) =>
                  createPreset.mutate(v, {
                    onSuccess: () => {
                      setOpen(false);
                      form.reset();
                    },
                  }),
                )}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel>Default</FormLabel>
                          <FormDescription>
                            Mark as default for this org.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Optional" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Items</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="mt-3 overflow-x-auto rounded-md border">
                    <Table className="w-full text-sm">
                      <TableHeader className="bg-muted">
                        <TableRow>
                          <TableHead className="px-3 py-2 text-left">
                            Value
                          </TableHead>
                          <TableHead className="px-3 py-2 text-left">
                            Time Unit (start)
                          </TableHead>
                          <TableHead className="px-3 py-2 text-left">
                            Time Value
                          </TableHead>
                          <TableHead className="px-3 py-2 text-left">
                            Time Unit (end)
                          </TableHead>
                          <TableHead className="px-3 py-2 text-left">
                            Time Value
                          </TableHead>
                          <TableHead className="px-3 py-2 text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.watch("items").map((_, i) => (
                          <TableRow key={i} className="border-t">
                            <TableCell className="px-3 py-2">
                              <Controller
                                control={form.control}
                                name={`items.${i}.value`}
                                render={({ field }) => (
                                  <Input
                                    className="w-24"
                                    type="number"
                                    value={field.value}
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <Controller
                                control={form.control}
                                name={`items.${i}.valueStartUnit`}
                                render={({ field }) => (
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger className="w-36">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.values(ScrumPointUnit).map(
                                        (u) => (
                                          <SelectItem key={u} value={u}>
                                            {u}
                                          </SelectItem>
                                        ),
                                      )}
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
                                  <Input
                                    className="w-28"
                                    type="number"
                                    min={0}
                                    value={field.value}
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <Controller
                                control={form.control}
                                name={`items.${i}.valueEndUnit`}
                                render={({ field }) => (
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger className="w-36">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.values(ScrumPointUnit).map(
                                        (u) => (
                                          <SelectItem key={u} value={u}>
                                            {u}
                                          </SelectItem>
                                        ),
                                      )}
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
                                  <Input
                                    className="w-28"
                                    type="number"
                                    min={0}
                                    value={field.value}
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeItem(i)}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {form.watch("items").length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-muted-foreground px-3 py-8 text-center"
                            >
                              No items.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={createPreset.isPending}>
                    Create preset
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            isLoading={!settings?.settings?.activePresetId}
            onClick={() => setActivePreset.mutate({ presetId: null })}
            isLoading={setActivePreset.isPending}
          >
            Clear active
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-1">
        <div className="rounded-md border">
          <div className="border-b px-4 py-3">
            <div className="font-medium">Available presets</div>
            <div className="text-muted-foreground text-xs">
              Select, apply to scale, or set active.
            </div>
          </div>
          <div className="max-h-[360px] divide-y overflow-y-auto">
            {(presetsQuery.data ?? []).map((p) => {
              const isActive = p.id === settings?.settings?.activePresetId;
              return (
                <div
                  key={p.id}
                  className="flex flex-col items-start justify-between gap-y-4 px-4 py-3"
                >
                  <div className="flex flex-col gap-y-1.5">
                    <div className="space-x-2 text-sm font-medium">
                      <span>{p.name}</span>
                      {isActive && <Badge variant="success">(active)</Badge>}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {p.description ?? "—"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        applyPresetToScale.mutate({ presetId: p.id })
                      }
                      isLoading={applyPresetToScale.isPending}
                    >
                      Apply to scale
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActivePreset.mutate({ presetId: p.id })}
                      isLoading={setActivePreset.isPending}
                    >
                      Set active
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deletePreset.mutate({ presetId: p.id })}
                      isLoading={deletePreset.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
            {(presetsQuery.data ?? []).length === 0 && (
              <div className="text-muted-foreground px-4 py-6 text-sm">
                No presets yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
