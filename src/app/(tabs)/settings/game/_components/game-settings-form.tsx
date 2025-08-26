"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BehaviorCard from "@/app/(tabs)/settings/game/_components/behavior-card";
import PresetsCard from "@/app/(tabs)/settings/game/_components/presets-card";
import ScaleCard from "@/app/(tabs)/settings/game/_components/scale-card";

export default function GameSettingsForm() {
  return (
    <div className="container  space-y-8">

      <Card>
        <CardHeader>
          <CardTitle>Game behavior</CardTitle>
          <CardDescription>Control how rounds behave for your team.</CardDescription>
        </CardHeader>
        <CardContent>
          <BehaviorCard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scrum points scale</CardTitle>
          <CardDescription>Configure the cards used for estimation.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScaleCard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Presets</CardTitle>
          <CardDescription>Save and reuse point scales across teams.</CardDescription>
        </CardHeader>
        <CardContent>
          <PresetsCard />
        </CardContent>
      </Card>
    </div>
  );
}
