// Shared pure validation/normalization logic for the two form-builder
// screens (create: formbuilder.tsx, edit: forms/edit/[formId]/page.tsx).
// These used to be hand-duplicated in both files — every past fix to one
// (duplicate-label detection, empty-options detection, the dropdown/tel
// type normalization) had to be repeated in the other, which is exactly
// how they drifted out of sync before.

// "select"/"dropdown"/"checkbox"/"radio" fields all carry a saved `options`
// list — "dropdown" survives here only because forms saved before the
// dropdown→select normalization below existed may still have it loaded
// from the database.
export function isOptionsField(type?: string): boolean {
  return (
    type === "select" ||
    type === "dropdown" ||
    type === "checkbox" ||
    type === "radio"
  );
}

// The backend only accepts "select"/"phone" as canonical types — both the
// create and edit screens save through this same mapping so a form saved
// from either ends up with the same values regardless of which UI added
// the field originally.
export function normalizeFieldType(type: string): string {
  if (type === "dropdown") return "select";
  if (type === "tel") return "phone";
  return type;
}

export function normalizeFieldsForSave<T extends { type: string }>(
  fields: T[],
): T[] {
  return fields.map((field) => ({
    ...field,
    type: normalizeFieldType(field.type),
  }));
}

// Submissions are keyed by label, so two fields sharing a label would
// silently overwrite each other's captured value.
export function findDuplicateLabel(
  fields: Array<{ type: string; label: string }>,
): string | null {
  const labels = fields
    .filter((f) => f.type !== "header" && f.type !== "paragraph")
    .map((f) => f.label.trim().toLowerCase());
  const duplicate = labels.find(
    (label, index) => labels.indexOf(label) !== index,
  );
  return duplicate ?? null;
}

export function findEmptyOptionsField<
  T extends { type: string; options?: string[] },
>(fields: T[]): T | undefined {
  return fields.find(
    (f) =>
      isOptionsField(f.type) &&
      !(f.options ?? []).some((o) => o.trim().length > 0),
  );
}
