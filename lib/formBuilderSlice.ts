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
        (field) => field.id !== action.payload
      );
    },
    updateFieldLabel: (
      state,
      action: PayloadAction<{ id: string; label: string }>
    ) => {
      const field = state.fields.find(
        (field) => field.id === action.payload.id
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
