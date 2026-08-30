import { z } from "zod";

export const indianMobileRegex = /^[6-9]\d{9}$/;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your full name.").max(80),
    email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+91/, ""))
      .refine((v) => indianMobileRegex.test(v), "Please enter a valid Indian mobile number."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain an uppercase letter.")
      .regex(/[a-z]/, "Password must contain a lowercase letter.")
      .regex(/\d/, "Password must contain a number."),
    confirmPassword: z.string()
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password.")
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.")
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain an uppercase letter.")
      .regex(/[a-z]/, "Password must contain a lowercase letter.")
      .regex(/\d/, "Password must contain a number."),
    confirmPassword: z.string()
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+91/, ""))
    .refine((v) => indianMobileRegex.test(v), "Please enter a valid Indian mobile number.")
});

export const addressSchema = z.object({
  label: z.string().trim().min(1, "Label is required.").max(40),
  recipientName: z.string().trim().min(2, "Recipient name is required.").max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+91/, ""))
    .refine((v) => indianMobileRegex.test(v), "Please enter a valid Indian mobile number."),
  addressLine1: z.string().trim().min(5, "Please enter the address.").max(200),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  landmark: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required.").max(80),
  state: z.string().trim().min(2, "State is required.").max(80),
  postalCode: z.string().trim().regex(/^\d{6}$/, "Please enter a valid 6-digit PIN code."),
  isDefault: z.boolean().default(false)
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required.").max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens.")
    .optional()
    .or(z.literal("")),
  sku: z.string().trim().min(2, "SKU is required.").max(40),
  categoryId: z.string().min(1, "Category is required."),
  shortDescription: z.string().trim().min(5, "Short description is required.").max(200),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  price: z.coerce.number().positive("Price must be greater than zero.").max(1000000),
  compareAtPrice: z.coerce.number().positive().max(1000000).optional().nullable(),
  imageUrl: z.string().trim().url("Please enter a valid image URL.").optional().or(z.literal("")),
  isVegetarian: z.boolean().default(true),
  isVegan: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  spiceLevel: z.coerce.number().int().min(0).max(3).default(0),
  preparationTimeMinutes: z.coerce.number().int().min(1).max(240).default(15),
  trackInventory: z.boolean().default(false),
  stockQuantity: z.coerce.number().int().min(0).optional().nullable(),
  minimumOrderQuantity: z.coerce.number().int().min(1).default(1),
  maximumOrderQuantity: z.coerce.number().int().min(1).optional().nullable(),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  displayOrder: z.coerce.number().int().default(0)
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required.").max(60),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true)
});

export const checkoutSchema = z.object({
  addressId: z.string().min(1, "Please select a delivery address."),
  customerNotes: z.string().trim().max(500).optional().or(z.literal(""))
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "PAYMENT_RECEIVED",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUND_PENDING",
    "REFUNDED"
  ]),
  notes: z.string().trim().max(500).optional().or(z.literal(""))
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
