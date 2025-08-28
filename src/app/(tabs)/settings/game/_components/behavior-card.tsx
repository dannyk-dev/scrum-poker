"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const behaviorSchema = z.object({
  autoShowResults: z.boolean(),
  autoShowResultsTime: z.number().nonnegative(),
  onlyScrumMasterCanShowResults: z.boolean(),
  lockVotes: z.boolean(),
  notifyOnVote: z.boolean(),
  notifyOnJoin: z.boolean(),
  persistentLeave: z.boolean(),
});

type BehaviorForm = z.infer<typeof behaviorSchema>;

export default function BehaviorCard() {
  const utils = api.useUtils();
  const { data, isLoading } = api.gameSettings.get.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const form = useForm<BehaviorForm>({
    resolver: zodResolver(behaviorSchema),
    values: data?.settings
      ? {
          autoShowResults: data.settings.autoShowResults,
          autoShowResultsTime: Number(data.settings.autoShowResultsTime ?? 0),
          onlyScrumMasterCanShowResults:
            data.settings.onlyScrumMasterCanShowResults,
          lockVotes: data.settings.lockVotes,
          notifyOnVote: data.settings.notifyOnVote,
          notifyOnJoin: data.settings.notifyOnJoin,
          persistentLeave: data.settings.persistentLeave,
        }
      : {
          autoShowResults: false,
          autoShowResultsTime: 0,
          onlyScrumMasterCanShowResults: false,
          lockVotes: true,
          notifyOnVote: true,
          notifyOnJoin: true,
          persistentLeave: false,
        },
  });

  const mutate = api.gameSettings.update.useMutation({
    onSuccess: () => utils.gameSettings.get.invalidate(),
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => mutate.mutate(v))}
        className="grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        <FormField
          control={form.control}
          name="autoShowResults"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between rounded-md border p-4">
              <div className="space-y-0.5 pr-4">
                <FormLabel>Auto reveal results</FormLabel>
                <FormDescription>
                  Reveal after a timeout automatically.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="autoShowResultsTime"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between rounded-md border p-4">
              <div className="space-y-0.5 pr-4">
                <FormLabel>Reveal timeout (seconds)</FormLabel>
                <FormDescription>
                  Delay before automatic reveal.
                </FormDescription>
              </div>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  className="w-32"
                  value={Number.isFinite(field.value) ? field.value : 0}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  disabled={!form.watch("autoShowResults")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="onlyScrumMasterCanShowResults"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between rounded-md border p-4">
              <div className="space-y-0.5 pr-4">
                <FormLabel>Only Scrum Master reveals</FormLabel>
                <FormDescription>
                  Restrict reveal to Scrum Master.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lockVotes"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between rounded-md border p-4">
              <div className="space-y-0.5 pr-4">
                <FormLabel>Lock votes after reveal</FormLabel>
                <FormDescription>
                  Prevent changes once revealed.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notifyOnVote"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between rounded-md border p-4">
              <div className="space-y-0.5 pr-4">
                <FormLabel>Notify when someone votes</FormLabel>
                <FormDescription>
                  Emit room notifications for votes.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notifyOnJoin"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between rounded-md border p-4">
              <div className="space-y-0.5 pr-4">
                <FormLabel>Notify on join</FormLabel>
                <FormDescription>
                  Let the room know when a player joins.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="persistentLeave"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between rounded-md border p-4">
              <div className="space-y-0.5 pr-4">
                <FormLabel>Persist leave state</FormLabel>
                <FormDescription>
                  Keep “left room” across sessions.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end md:col-span-2">
          <Button type="submit" disabled={mutate.isPending || isLoading}>
            Save behavior
          </Button>
        </div>
      </form>
    </Form>
  );
}
