"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  BrainCircuit,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  DEFAULT_VIGIL_DEVELOPER_SETTINGS,
  loadDeveloperSettings,
  normalizeDeveloperSettings,
  saveDeveloperSettings,
  type VigilDeveloperSettings,
} from "@/lib/developer-settings";

function BooleanSetting({
  value,
  onChange,
  title,
  description,
}: {
  value: boolean;
  onChange(value: boolean): void;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-5 rounded-2xl border border-[var(--line)] bg-[var(--inset)]/45 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[var(--ink)]">
          {title}
        </p>

        <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-[var(--ink-3)]">
          {description}
        </p>
      </div>

      <div className="flex shrink-0 rounded-xl border border-[var(--line)] bg-[var(--field)] p-1">
        <Button
          type="button"
          size="sm"
          variant={
            value
              ? "default"
              : "ghost"
          }
          onClick={() =>
            onChange(true)
          }
        >
          On
        </Button>

        <Button
          type="button"
          size="sm"
          variant={
            !value
              ? "default"
              : "ghost"
          }
          onClick={() =>
            onChange(false)
          }
        >
          Off
        </Button>
      </div>
    </div>
  );
}

export function SettingsClient() {
  const [
    settings,
    setSettings,
  ] =
    useState<VigilDeveloperSettings>(
      DEFAULT_VIGIL_DEVELOPER_SETTINGS
    );

  const [
    saved,
    setSaved,
  ] =
    useState(false);

  useEffect(() => {
    setSettings(
      loadDeveloperSettings()
    );
  }, []);

  function update(
    patch:
      Partial<VigilDeveloperSettings>
  ) {
    setSettings(
      (current) =>
        normalizeDeveloperSettings({
          ...current,
          ...patch,
        })
    );

    setSaved(false);
  }

  function handleSave() {
    saveDeveloperSettings(
      settings
    );

    setSaved(true);

    window.setTimeout(
      () =>
        setSaved(false),
      1800
    );
  }

  function handleReset() {
    setSettings(
      DEFAULT_VIGIL_DEVELOPER_SETTINGS
    );

    saveDeveloperSettings(
      DEFAULT_VIGIL_DEVELOPER_SETTINGS
    );

    setSaved(true);
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6 pb-8">
      <section className="px-0.5 pb-2 pt-1 sm:px-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Settings2 className="size-4 text-[var(--accent-800)]" />

          <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-3)]">
            Developer
          </span>

          <Badge variant="secondary">
            defaults
          </Badge>
        </div>

        <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em] sm:text-[38px]">
          Runtime settings
        </h1>

        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[var(--ink-2)]">
          Configure the defaults Vigil should use when you create a new orchestration. Individual orchestrations can later override these defaults independently.
        </p>
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-4 text-[var(--primary-700)]" />

            <CardTitle>
              Evaluation & replanning
            </CardTitle>
          </div>

          <CardDescription className="max-w-3xl">
            Control how aggressively Vigil checks completed work and whether it is allowed to create another planning iteration.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
          <BooleanSetting
            value={
              settings.semanticEvaluation
            }
            onChange={(
              semanticEvaluation
            ) =>
              update({
                semanticEvaluation,
              })
            }
            title="Semantic result evaluation"
            description="After structural success, allow Vigil to inspect actual worker outputs and decide whether the original goal was really satisfied."
          />

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--inset)]/45 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Label
                  htmlFor="max-replans"
                  className="text-sm font-bold"
                >
                  Maximum replans
                </Label>

                <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-[var(--ink-3)]">
                  Maximum number of additional planning iterations after the initial plan. Keep this small to avoid runaway agent loops.
                </p>
              </div>

              <Input
                id="max-replans"
                type="number"
                min={0}
                max={3}
                value={
                  settings.maxReplans
                }
                onChange={(event) =>
                  update({
                    maxReplans:
                      Number(
                        event.target.value
                      ),
                  })
                }
                className="w-full sm:w-24"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-[var(--accent-700)]" />

            <CardTitle>
              Creation flow
            </CardTitle>
          </div>

          <CardDescription>
            Defaults used by the orchestration playground.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
          <BooleanSetting
            value={
              settings.autoExecute
            }
            onChange={(
              autoExecute
            ) =>
              update({
                autoExecute,
              })
            }
            title="Auto-execute valid plans"
            description="When enabled, a newly generated executable plan can start immediately instead of waiting for a second Execute action."
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink-3)]">
          <Sparkles className="size-4 shrink-0" />

          <span>
            These are developer defaults, not workspace membership settings.
          </span>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={
              handleReset
            }
          >
            <RotateCcw />
            Reset
          </Button>

          <Button
            type="button"
            onClick={
              handleSave
            }
          >
            <Save />
            {saved
              ? "Saved"
              : "Save settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
