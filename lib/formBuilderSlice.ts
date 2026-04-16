// lib/formBuilderSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Field {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
}

interface FormBuilderState {
  fields: Field[];
  formName: string;
  leadSource: string;
  industry: string;
  textColor: string;
  backgroundColor: string;
}

const initialState: FormBuilderState = {
  fields: [],
  formName: "",
  leadSource: "",
  industry: "",
  textColor: "#000000",
  backgroundColor: "#ffffff",
};

const formBuilderSlice = createSlice({
  name: "formBuilder",
  initialState,
  reducers: {
    addField: (state, action: PayloadAction<Field>) => {
      state.fields.push(action.payload);
    },
    deleteField: (state, action: PayloadAction<string>) => {
      state.fields = state.fields.filter(
        (field) => field.id !== action.payload,
      );
    },
    updateFieldLabel: (
      state,
      action: PayloadAction<{ id: string; label: string }>,
    ) => {
      const field = state.fields.find(
        (field) => field.id === action.payload.id,
      );
      if (field) {
        field.label = action.payload.label;
      }
    },
    // Add other reducers here
  },
});

export const { addField, deleteField, updateFieldLabel } =
  formBuilderSlice.actions;
export default formBuilderSlice.reducer;

// Selectors for type-safe state access
export const selectFormFields = (state: { formBuilder: FormBuilderState }) =>
  state.formBuilder.fields;
export const selectFormName = (state: { formBuilder: FormBuilderState }) =>
  state.formBuilder.formName;
export const selectFormLeadSource = (state: {
  formBuilder: FormBuilderState;
}) => state.formBuilder.leadSource;
export const selectFormIndustry = (state: { formBuilder: FormBuilderState }) =>
  state.formBuilder.industry;
export const selectFormTextColor = (state: { formBuilder: FormBuilderState }) =>
  state.formBuilder.textColor;
export const selectFormBackgroundColor = (state: {
  formBuilder: FormBuilderState;
}) => state.formBuilder.backgroundColor;
export const selectFormFieldById = (
  state: { formBuilder: FormBuilderState },
  id: string,
) => state.formBuilder.fields.find((f) => f.id === id) ?? null;
