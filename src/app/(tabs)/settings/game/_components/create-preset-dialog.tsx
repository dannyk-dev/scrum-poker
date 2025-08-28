"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrumPointUnit } from "@prisma/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
// import ItemsTable from "./ItemsTable";
import { api } from "@/trpc/react";
// import { PresetForm, presetSchema } from "./schema";
import { Switch } from "@/components/ui/switch";
import { type PresetForm, presetSchema } from "@/app/(tabs)/settings/game/_utils/schema";
import PresetItemsTable from "@/app/(tabs)/settings/game/_components/preset-item-table";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

export default function CreatePresetDialog({ open, onOpenChange }: Props) {
  const utils = api.useUtils();
  const createPreset = api.gameSettings.createPreset.useMutation({
    onSuccess: () =>
      Promise.all([utils.gameSettings.listPresets.invalidate(), utils.gameSettings.get.invalidate()]),
  });

  const form = useForm<PresetForm>({
    resolver: zodResolver(presetSchema),
    defaultValues: {
      name: "",
      description: "",
      isDefault: false,
      items: [
        { value: 1, timeStart: 0, timeEnd: 0, valueStartUnit: ScrumPointUnit.DAY, valueEndUnit: ScrumPointUnit.DAY },
        { value: 2, timeStart: 0, timeEnd: 0, valueStartUnit: ScrumPointUnit.DAY, valueEndUnit: ScrumPointUnit.DAY },
        { value: 3, timeStart: 0, timeEnd: 0, valueStartUnit: ScrumPointUnit.DAY, valueEndUnit: ScrumPointUnit.DAY },
        { value: 5, timeStart: 0, timeEnd: 0, valueStartUnit: ScrumPointUnit.DAY, valueEndUnit: ScrumPointUnit.DAY },
        { value: 8, timeStart: 0, timeEnd: 0, valueStartUnit: ScrumPointUnit.DAY, valueEndUnit: ScrumPointUnit.DAY },
      ],
    },
  });

  const addItem = () => {
    form.setValue("items", [
      ...form.getValues("items"),
      { value: 13, timeStart: 0, timeEnd: 0, valueStartUnit: ScrumPointUnit.DAY, valueEndUnit: ScrumPointUnit.DAY },
    ], { shouldDirty: true });
  };
  const removeItem = (i: number) => {
    form.setValue("items", form.getValues("items").filter((_, idx) => idx !== i), { shouldDirty: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">New preset</Button>
      </DialogTrigger>
      <DialogContent className="w-fit sm:max-w-fit">
        <DialogHeader><DialogTitle>Create preset</DialogTitle></DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) =>
              createPreset.mutate(v, {
                onSuccess: () => {
                  onOpenChange(false);
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

            <PresetItemsTable form={form} onAdd={addItem} onRemove={removeItem} />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" isLoading={createPreset.isPending}>Create preset</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
