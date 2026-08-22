"use client";

import { Check, Plus } from "lucide-react";
import { useId, useState } from "react";
import { CHAIN_IDS, isValidAddress } from "@/lib/chains/registry";
import { ABUSE_TYPES, ACTOR_CATEGORIES, useUserTags } from "@/lib/tags/user-store";
import type { AbuseType, ActorCategory, ChainId } from "@/lib/types";
import { Button } from "@/components/ui/primitives";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface Errors {
  subject?: string;
  label?: string;
}

export function TagForm({ presetSubject }: { presetSubject?: string }) {
  const t = useT().ui.tags;
  const add = useUserTags((state) => state.add);
  const ids = useId();

  const [chain, setChain] = useState<ChainId>("btc");
  const [subject, setSubject] = useState(presetSubject ?? "");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<ActorCategory>("unknown");
  const [abuse, setAbuse] = useState<AbuseType>("none");
  const [confidence, setConfidence] = useState(0.7);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);

  // Validation runs on blur and on submit, never on every keystroke.
  const validateSubject = (value: string): string | undefined => {
    if (!value.trim()) return t.formAddressRequired;
    if (!isValidAddress(chain, value.trim())) {
      return `Not a valid ${chain.toUpperCase()} address.`;
    }
    return undefined;
  };

  const validateLabel = (value: string): string | undefined =>
    value.trim() ? undefined : t.formLabelRequired;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Errors = {
      subject: validateSubject(subject),
      label: validateLabel(label),
    };
    setErrors(next);
    if (next.subject || next.label) {
      const firstInvalid = next.subject ? `${ids}-subject` : `${ids}-label`;
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    add({
      chain,
      subject: subject.trim(),
      label: label.trim(),
      category,
      abuse,
      confidence,
      notes: notes.trim() || undefined,
    });

    setSubject("");
    setLabel("");
    setNotes("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldWrap label={t.formChain} htmlFor={`${ids}-chain`}>
          <select
            id={`${ids}-chain`}
            value={chain}
            onChange={(event) => {
              setChain(event.target.value as ChainId);
              setErrors((current) => ({ ...current, subject: undefined }));
            }}
            className={inputClass}
          >
            {CHAIN_IDS.map((item) => (
              <option key={item} value={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
        </FieldWrap>

        <FieldWrap
          label={t.formLabel}
          htmlFor={`${ids}-label`}
          required
          error={errors.label}
          helper={t.formLabelHint}
        >
          <input
            id={`${ids}-label`}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onBlur={(event) =>
              setErrors((current) => ({ ...current, label: validateLabel(event.target.value) }))
            }
            placeholder={t.formLabelPlaceholder}
            aria-invalid={errors.label ? true : undefined}
            className={cn(inputClass, errors.label && "border-destructive")}
          />
        </FieldWrap>
      </div>

      <FieldWrap
        label={t.formAddress}
        htmlFor={`${ids}-subject`}
        required
        error={errors.subject}
        helper={t.formAddressHint}
      >
        <input
          id={`${ids}-subject`}
          value={subject}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setSubject(event.target.value)}
          onBlur={(event) =>
            setErrors((current) => ({ ...current, subject: validateSubject(event.target.value) }))
          }
          placeholder={chain === "btc" ? "bc1…" : "0x…"}
          aria-invalid={errors.subject ? true : undefined}
          className={cn(inputClass, "font-mono", errors.subject && "border-destructive")}
        />
      </FieldWrap>

      <div className="grid gap-3 sm:grid-cols-3">
        <FieldWrap label={t.formActorCategory} htmlFor={`${ids}-category`}>
          <select
            id={`${ids}-category`}
            value={category}
            onChange={(event) => setCategory(event.target.value as ActorCategory)}
            className={inputClass}
          >
            {ACTOR_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FieldWrap>

        <FieldWrap
          label={t.formAbuseType}
          htmlFor={`${ids}-abuse`}
          helper={t.formAbuseHint}
        >
          <select
            id={`${ids}-abuse`}
            value={abuse}
            onChange={(event) => setAbuse(event.target.value as AbuseType)}
            className={inputClass}
          >
            {ABUSE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FieldWrap>

        <FieldWrap
          label={t.formConfidence(Math.round(confidence * 100))}
          htmlFor={`${ids}-confidence`}
          helper={t.formConfidenceHint}
        >
          <input
            id={`${ids}-confidence`}
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={confidence}
            onChange={(event) => setConfidence(Number(event.target.value))}
            className="h-11 w-full cursor-pointer accent-[var(--primary)]"
          />
        </FieldWrap>
      </div>

      <FieldWrap label={t.formNotes} htmlFor={`${ids}-notes`} helper={t.formNotesHelper}>
        <textarea
          id={`${ids}-notes`}
          value={notes}
          rows={2}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t.formNotesPlaceholder}
          className={cn(inputClass, "h-auto py-2")}
        />
      </FieldWrap>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary">
          <Plus className="size-3.5" aria-hidden="true" />
          {t.formSubmit}
        </Button>
        <p aria-live="polite" className="text-xs text-success">
          {saved ? (
            <span className="inline-flex items-center gap-1">
              <Check className="size-3.5" aria-hidden="true" />
              {t.formSaved}
            </span>
          ) : null}
        </p>
      </div>
    </form>
  );
}

const inputClass =
  "h-11 min-h-11 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-foreground outline-none transition-colors duration-150 focus:border-ring";

function FieldWrap({
  label,
  htmlFor,
  children,
  helper,
  error,
  required,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  helper?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-[11px] text-destructive">
          {error}
        </p>
      ) : helper ? (
        <p className="mt-1 text-[11px] text-foreground-muted">{helper}</p>
      ) : null}
    </div>
  );
}
