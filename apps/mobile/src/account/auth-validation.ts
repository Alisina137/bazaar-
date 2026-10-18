export type AuthMode = "login" | "register";
export type AuthField = "displayName" | "email" | "password" | "confirmPassword";
export type AuthValidationCode =
  | "emailRequired"
  | "emailInvalid"
  | "passwordRequired"
  | "passwordTooShort"
  | "passwordTooLong"
  | "nameTooLong"
  | "confirmationRequired"
  | "confirmationMismatch";

export interface AuthFormValues {
  email: string;
  password: string;
  displayName: string;
  confirmPassword: string;
}

export type AuthFormErrors = Partial<Record<AuthField, AuthValidationCode>>;

/** Matches the existing auth API's basic length and email constraints. */
export function validateAuthForm(
  mode: AuthMode,
  values: AuthFormValues
): AuthFormErrors {
  const errors: AuthFormErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = "emailRequired";
  } else if (
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = "emailInvalid";
  }

  if (!values.password) {
    errors.password = "passwordRequired";
  } else if (values.password.length > 128) {
    errors.password = "passwordTooLong";
  } else if (mode === "register" && values.password.length < 8) {
    errors.password = "passwordTooShort";
  }

  if (mode === "register") {
    if (values.displayName.trim().length > 160) {
      errors.displayName = "nameTooLong";
    }
    if (!values.confirmPassword) {
      errors.confirmPassword = "confirmationRequired";
    } else if (values.confirmPassword !== values.password) {
      errors.confirmPassword = "confirmationMismatch";
    }
  }

  return errors;
}
