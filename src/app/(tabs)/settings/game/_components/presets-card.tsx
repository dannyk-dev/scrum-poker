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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

const presetSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().max(500).optional(),
  items: z.array(
    z.object({
      value: z.number().int(),
      timeStart: z.number().int().nonnegative().default(0),
      timeEnd: z.number().int().nonnegative().default(0),
      valueUnit: z.nativeEnum(ScrumPointUnit),
    })
  ).min(1, "Add at least one point"),
  isDefault: z.boolean().optional(),
});
type PresetForm = z.infer<typeof presetSchema>;

export default function PresetsCard() {
  const utils = api.useUtils();
  const { data: settings } = api.gameSettings.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const presetsQuery = api.gameSettings.listPresets.useQuery(undefined, { refetchOnWindowFocus: false });

  const setActivePreset = api.gameSettings.setActivePreset.useMutation({
    onSuccess: () => Promise.all([
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
    onSuccess: () => Promise.all([
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
        { value: 1, timeStart: 0, timeEnd: 0, valueUnit: ScrumPointUnit.HOUR },
        { value: 2, timeStart: 0, timeEnd: 0, valueUnit: ScrumPointUnit.HOUR },
        { value: 3, timeStart: 0, timeEnd: 0, valueUnit: ScrumPointUnit.HOUR },
        { value: 5, timeStart: 0, timeEnd: 0, valueUnit: ScrumPointUnit.HOUR },
        { value: 8, timeStart: 0, timeEnd: 0, valueUnit: ScrumPointUnit.HOUR },
      ],
    },
  });

  const addItem = () => {
    const arr = form.getValues("items");
    form.setValue("items", [...arr, { value: 13, timeStart: 0, timeEnd: 0, valueUnit: ScrumPointUnit.HOUR }], { shouldDirty: true });
  };
  const removeItem = (i: number) => {
    const arr = form.getValues("items").filter((_, idx) => idx !== i);
    form.setValue("items", arr, { shouldDirty: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm">New preset</Button></DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle>Create preset</DialogTitle></DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) =>
                  createPreset.mutate(v, { onSuccess: () => { setOpen(false); form.reset(); } }),
                )}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
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
                          <FormDescription>Mark as default for this org.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
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
                        <FormControl><Input {...field} placeholder="Optional" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>Add</Button>
                  </div>
                  <div className="mt-3 overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left px-3 py-2">Value</th>
                          <th className="text-left px-3 py-2">Unit</th>
                          <th className="text-left px-3 py-2">Start</th>
                          <th className="text-left px-3 py-2">End</th>
                          <th className="text-right px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.watch("items").map((_, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">
                              <Controller
                                control={form.control}
                                name={`items.${i}.value`}
                                render={({ field }) => (
                                  <Input className="w-24" type="number" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} />
                                )}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Controller
                                control={form.control}
                                name={`items.${i}.valueUnit`}
                                render={({ field }) => (
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {Object.values(ScrumPointUnit).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Controller
                                control={form.control}
                                name={`items.${i}.timeStart`}
                                render={({ field }) => (
                                  <Input className="w-28" type="number" min={0} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} />
                                )}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Controller
                                control={form.control}
                                name={`items.${i}.timeEnd`}
                                render={({ field }) => (
                                  <Input className="w-28" type="number" min={0} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} />
                                )}
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button type="button" variant="destructive" size="sm" onClick={() => removeItem(i)}>Remove</Button>
                            </td>
                          </tr>
                        ))}
                        {form.watch("items").length === 0 && (
                          <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No items.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createPreset.isPending}>Create preset</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!settings?.settings?.activePresetId}
            onClick={() => setActivePreset.mutate({ presetId: null })}
          >
            Clear active
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-md border">
          <div className="px-4 py-3 border-b">
            <div className="font-medium">Available presets</div>
            <div className="text-xs text-muted-foreground">Select, apply to scale, or set active.</div>
          </div>
          <div className="max-h-[360px] overflow-y-auto divide-y">
            {(presetsQuery.data ?? []).map((p) => {
              const isActive = p.id === settings?.settings?.activePresetId;
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-medium">
                      {p.name} {isActive && <span className="text-primary text-xs align-middle">(active)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.description ?? "—"}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => applyPresetToScale.mutate({ presetId: p.id })}>Apply to scale</Button>
                    <Button size="sm" onClick={() => setActivePreset.mutate({ presetId: p.id })}>Set active</Button>
                    <Button size="sm" variant="destructive" onClick={() => deletePreset.mutate({ presetId: p.id })}>Delete</Button>
                  </div>
                </div>
              );
            })}
            {(presetsQuery.data ?? []).length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">No presets yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-md border">
          <div className="px-4 py-3 border-b">
            <div className="font-medium">Current active preset</div>
            <div className="text-xs text-muted-foreground">Shown when a preset is linked as active.</div>
          </div>
          <div className="p-4 text-sm">
            {settings?.settings?.activePreset?.name ?? "None"}
          </div>
        </div>
      </div>
    </div>
  );
}
