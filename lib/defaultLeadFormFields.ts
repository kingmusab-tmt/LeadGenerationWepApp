/**
 * The field structure used whenever a seller has no custom lead-capture
 * forms of their own — both the "Add Lead" dialog's fallback form and the
 * CSV import route build leads against this exact same shape, so an
 * imported lead and a manually-added default-form lead always line up
 * (same field ids/labels, matchable against each other and against any
 * future custom form that happens to reuse these ids).
 */
export interface DefaultLeadFormFieldDef {
  id: string;
  label: string;
  type: string;
  required: boolean;
}

export const DEFAULT_LEAD_FORM_FIELDS: DefaultLeadFormFieldDef[] = [
  { id: "name", label: "Name", type: "text", required: true },
  { id: "email", label: "Email", type: "email", required: true },
  { id: "phone", label: "Phone", type: "tel", required: false },
  { id: "city", label: "City", type: "text", required: false },
  { id: "address", label: "Address", type: "text", required: false },
  {
    id: "service_needed",
    label: "Service Needed",
    type: "textarea",
    required: true,
  },
];
