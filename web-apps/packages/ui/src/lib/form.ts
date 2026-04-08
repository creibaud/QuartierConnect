import { createFormHook } from "@tanstack/react-form";
import { OtpField, TextField } from "../components/form-fields";
import { fieldContext, formContext } from "./form-context";

export const { useAppForm, withForm } = createFormHook({
    fieldComponents: { TextField, OtpField },
    formComponents: {},
    fieldContext,
    formContext,
});
