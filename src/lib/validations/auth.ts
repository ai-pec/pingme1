import { z } from "zod";

// Phone + OTP login
export const phoneSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),
});

export const otpSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, "Enter the 6-digit code sent to your phone"),
});

// Additional info collected after phone OTP sign-in (email is mandatory).
// Also reused on the profile page for editing name + email.
export const completeProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z.string().email("Please enter a valid email"),
});

export const addressSchema = z.object({
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Please enter a valid 6-digit pincode"),
  country: z.string().min(2, "Country is required"),
  state: z.string().min(2, "State is required"),
  city: z.string().min(2, "City is required"),
  fullAddress: z
    .string()
    .min(10, "Please enter a complete address")
    .max(500, "Address is too long"),
  landmark: z.string().optional().or(z.literal("")),
});

export type PhoneFormData = z.infer<typeof phoneSchema>;
export type OtpFormData = z.infer<typeof otpSchema>;
export type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
