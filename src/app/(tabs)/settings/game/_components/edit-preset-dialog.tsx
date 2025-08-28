"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrumPointUnit } from "@prisma/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { api } from "@/trpc/react";
import { Switch } from "@/components/ui/switch";
import { type PresetForm, presetSchema } from "@/app/(tabs)/settings/game/_utils/schema";
import PresetItemsTable from "@/app/(tabs)/settings/game/_components/preset-item-table";

type Props = {
  open: boolean;
  presetId: string | null;
  onOpenChange: (o: boolean) => void;
};

export default function EditPresetDialog({ open, presetId, onOpenChange }: Props) {
  const utils = api.useUtils();
  const getPreset = api.gameSettings.getPreset.useQuery({ presetId: presetId as string }, { enabled: !!presetId });
  const updatePresetMeta = api.gameSettings.updatePresetMeta.useMutation({
    onSuccess: () => utils.gameSettings.listPresets.invalidate(),
  });
  const replacePresetItems = api.gameSettings.replacePresetItems.useMutation({
    onSuccess: () => utils.gameSettings.listPresets.invalidate(),
  });

  const form = useForm<PresetForm>({
    resolver: zodResolver(presetSchema),
    defaultValues: { name: "", description: "", isDefault: false, items: [] },
  });

  React.useEffect(() => {
    if (getPreset.data) {
      const p = getPreset.data;
      form.reset({
        name: p.name,
        description: p.description ?? "",
        isDefault: p.isDefault ?? false,
        items: p.items.map((it) => ({
          value: it.value,
          timeStart: it.timeStart ?? 0,
          timeEnd: it.timeEnd ?? 0,
          valueStartUnit: it.valueStartUnit,
          valueEndUnit: it.valueEndUnit,
        })),
      });
    }
  }, [getPreset.data, form]);

  const addItem = () => {
    form.setValue("items", [
      ...form.getValues("items"),
      { value: 1, timeStart: 0, timeEnd: 0, valueStartUnit: ScrumPointUnit.DAY, valueEndUnit: ScrumPointUnit.DAY },
    ], { shouldDirty: true });
  };
  const removeItem = (i: number) => {
    form.setValue("items", form.getValues("items").filter((_, idx) => idx !== i), { shouldDirty: true });
  };

  const saving = updatePresetMeta.isPending || replacePresetItems.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) form.reset();
      }}
    >
      <DialogContent className="w-fit sm:max-w-fit">
        <DialogHeader><DialogTitle>Edit preset</DialogTitle></DialogHeader>

        {getPreset.isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(async (v) => {
                if (!presetId) return;
                await Promise.all([
                  updatePresetMeta.mutateAsync({
                    presetId,
                    name: v.name,
                    description: v.description,
                    isDefault: v.isDefault ?? false,
                  }),
                  replacePresetItems.mutateAsync({
                    presetId,
                    items: v.items.map((it, i) => ({ ...it, position: i })),
                  }),
                ]);
                onOpenChange(false);
                form.reset();
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      <FormControl><Switch checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
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

              <PresetItemsTable form={form} onAdd={addItem} onRemove={removeItem} disabled={saving} addLabel="Add" />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={saving}>
                  {/* {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} */}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
