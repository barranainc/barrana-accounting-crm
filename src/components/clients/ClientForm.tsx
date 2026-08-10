"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { createClient, updateClient } from "@/actions/clients";
import { DocumentChecklistSidebar } from "@/components/clients/DocumentChecklistSidebar";
import { defaultCheckedMap, type ClientTypeKey } from "@/lib/document-checklist";
import { Loader2 } from "lucide-react";

const schema = z.object({
  businessName:   z.string().min(1, "Business name is required"),
  legalName:      z.string().optional(),
  primaryEmail:   z.string().email("Valid email required"),
  primaryPhone:   z.string().optional(),
  clientType:     z.enum(["CORPORATION", "SOLE_PROPRIETOR", "PARTNERSHIP", "TRUST", "NON_PROFIT", "INDIVIDUAL"]),
  status:         z.enum(["ACTIVE", "ONBOARDING", "INACTIVE", "ARCHIVED"]),
  industry:       z.string().optional(),
  businessNumber: z.string().optional(),
  hstNumber:      z.string().optional(),
  fiscalYearEnd:  z.string().optional(),
  addressLine1:   z.string().optional(),
  addressLine2:   z.string().optional(),
  city:           z.string().optional(),
  province:       z.string().optional(),
  postalCode:     z.string().optional(),
  internalNotes:  z.string().optional(),
});

type ClientFormValues = z.infer<typeof schema>;

interface ClientFormProps {
  mode: "create" | "edit";
  clientId?: string;
  defaultValues?: Partial<ClientFormValues>;
}

const CLIENT_TYPES = [
  { value: "CORPORATION",     label: "Corporation" },
  { value: "SOLE_PROPRIETOR", label: "Sole Proprietor" },
  { value: "PARTNERSHIP",     label: "Partnership" },
  { value: "TRUST",           label: "Trust" },
  { value: "NON_PROFIT",      label: "Non-Profit" },
  { value: "INDIVIDUAL",      label: "Individual" },
];

const STATUSES = [
  { value: "ONBOARDING", label: "Onboarding" },
  { value: "ACTIVE",     label: "Active" },
  { value: "INACTIVE",   label: "Inactive" },
  { value: "ARCHIVED",   label: "Archived" },
];

export function ClientForm({ mode, clientId, defaultValues }: ClientFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<ClientFormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        clientType: "CORPORATION",
        status: "ONBOARDING",
        ...defaultValues,
      },
    });

  const clientType = watch("clientType");
  const status = watch("status");
  const showChecklist = mode === "create";

  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>(() =>
    defaultCheckedMap((defaultValues?.clientType as ClientTypeKey) ?? "CORPORATION")
  );
  // Each client type has its own checklist — reset the selection when the type changes.
  useEffect(() => {
    if (showChecklist) setCheckedDocs(defaultCheckedMap(clientType as ClientTypeKey));
  }, [clientType, showChecklist]);

  function toggleDoc(key: string) {
    setCheckedDocs((p) => ({ ...p, [key]: !p[key] }));
  }
  function setManyDocs(keys: string[], value: boolean) {
    setCheckedDocs((p) => {
      const next = { ...p };
      for (const k of keys) next[k] = value;
      return next;
    });
  }

  async function onSubmit(data: ClientFormValues) {
    setError(null);
    try {
      if (mode === "create") {
        const selectedDocumentKeys = Object.keys(checkedDocs).filter((k) => checkedDocs[k]);
        const result = await createClient({ ...data, selectedDocumentKeys });
        router.push(`/clients/${result.id}`);
      } else if (clientId) {
        await updateClient(clientId, data);
        router.push(`/clients/${clientId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className={showChecklist ? "grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" : "max-w-2xl"}>
        <div className="space-y-6 min-w-0">
      {/* Business identity */}
      <div className="rounded-lg border border-brand-greyBorder bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Business profile</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="businessName">Business name <span className="text-red-500">*</span></Label>
            <Input id="businessName" {...register("businessName")} placeholder="Maple Ridge Construction Inc." />
            {errors.businessName && <p className="text-xs text-destructive">{errors.businessName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="legalName">Legal name (if different)</Label>
            <Input id="legalName" {...register("legalName")} placeholder="Maple Ridge Construction Inc." />
          </div>

          <div className="space-y-1.5">
            <Label>Client type</Label>
            <Select value={clientType} onValueChange={(v) => setValue("clientType", v as ClientFormValues["clientType"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLIENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="primaryEmail">Primary email <span className="text-red-500">*</span></Label>
            <Input id="primaryEmail" type="email" {...register("primaryEmail")} placeholder="billing@company.com" />
            {errors.primaryEmail && <p className="text-xs text-destructive">{errors.primaryEmail.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="primaryPhone">Phone</Label>
            <Input id="primaryPhone" {...register("primaryPhone")} placeholder="+1 (416) 555-0100" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" {...register("industry")} placeholder="Construction, Technology…" />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setValue("status", v as ClientFormValues["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="businessNumber">Business number (CRA)</Label>
            <Input id="businessNumber" {...register("businessNumber")} placeholder="123456789 RT0001" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hstNumber">HST/GST number</Label>
            <Input id="hstNumber" {...register("hstNumber")} placeholder="123456789 RT0001" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fiscalYearEnd">Fiscal year end</Label>
            <Input id="fiscalYearEnd" {...register("fiscalYearEnd")} placeholder="December 31" />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-lg border border-brand-greyBorder bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Address</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="addressLine1">Street address</Label>
            <Input id="addressLine1" {...register("addressLine1")} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="addressLine2">Suite / unit</Label>
            <Input id="addressLine2" {...register("addressLine2")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register("city")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="province">Province</Label>
            <Input id="province" {...register("province")} placeholder="ON" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input id="postalCode" {...register("postalCode")} placeholder="M5V 3A8" />
          </div>
        </div>
      </div>

      {/* Internal notes */}
      <div className="rounded-lg border border-brand-greyBorder bg-white p-5 space-y-1.5">
        <Label htmlFor="internalNotes">Internal notes</Label>
        <p className="text-xs text-muted-foreground">Visible to staff only — not shown to the client.</p>
        <Textarea id="internalNotes" rows={3} {...register("internalNotes")} />
      </div>
        </div>

        {showChecklist && (
          <DocumentChecklistSidebar
            clientType={clientType as ClientTypeKey}
            checked={checkedDocs}
            onToggle={toggleDoc}
            onSetMany={setManyDocs}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />{mode === "create" ? "Creating…" : "Saving…"}</> : mode === "create" ? "Create client" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
