"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import InputNumberChevron from "@/components/ui/input-number-chevron";

const schema = z.object({
  value: z.number().int(),
  timeStart: z.number().int().nonnegative(),
  timeEnd: z.number().int().nonnegative(),
  valueStartUnit: z.nativeEnum(ScrumPointUnit),
  valueEndUnit: z.nativeEnum(ScrumPointUnit),
});
type FormType = z.infer<typeof schema>;

export default function AddPointDialog() {
  const utils = api.useUtils();
  const addPoint = api.gameSettings.addPoint.useMutation({
    onSuccess: () => utils.gameSettings.get.invalidate(),
  });
  const [open, setOpen] = React.useState(false);

  const form = useForm<FormType>({
    resolver: zodResolver(schema),
    defaultValues: {
      value: 1,
      timeStart: 0,
      timeEnd: 0,
      valueStartUnit: ScrumPointUnit.DAY,
      valueEndUnit: ScrumPointUnit.DAY,
    },
  });

  const saving = addPoint.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add point</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add point</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) =>
              addPoint.mutate(v, {
                onSuccess: () => {
                  setOpen(false);
                  form.reset();
                },
              }),
            )}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              {/* Value */}
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <InputNumberChevron
                        className="w-full"
                        value={field.value}
                        onChange={(val) => field.onChange(Number(val))}
                        isDisabled={saving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Unit */}
              <FormField
                control={form.control}
                name="valueStartUnit"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Start Unit</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={saving}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(ScrumPointUnit).map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time start */}
              <FormField
                control={form.control}
                name="timeStart"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Time start</FormLabel>
                    <FormControl>
                      <InputNumberChevron
                        className="w-full"
                        value={field.value}
                        onChange={(val) => field.onChange(Number(val))}
                        isDisabled={saving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Unit */}
              <FormField
                control={form.control}
                name="valueEndUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Unit</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={saving}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(ScrumPointUnit).map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time end */}
              <FormField
                control={form.control}
                name="timeEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time end</FormLabel>
                    <FormControl>
                      <InputNumberChevron
                        className="w-full"
                        value={field.value}
                        onChange={(val) => field.onChange(Number(val))}
                        isDisabled={saving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-8">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={saving} disabled={saving}>
                Add
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
