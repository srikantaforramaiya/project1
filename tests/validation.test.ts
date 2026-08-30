import { describe, it, expect } from "vitest";
import { registerSchema, indianMobileRegex, addressSchema, checkoutSchema } from "@/lib/validations";
import { generateOrderNumber } from "@/services/order-number";

describe("registration validation", () => {
  it("accepts a valid registration", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "Test@Example.com",
      phone: "9876543210",
      password: "Passw0rd!",
      confirmPassword: "Passw0rd!"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
      expect(result.data.phone).toBe("9876543210");
    }
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      name: "Test User", email: "t@e.com", phone: "9876543210",
      password: "Passw0rd!", confirmPassword: "Different1"
    });
    expect(result.success).toBe(false);
  });

  it("rejects weak passwords", () => {
    const result = registerSchema.safeParse({
      name: "Test User", email: "t@e.com", phone: "9876543210",
      password: "alllowercase1", confirmPassword: "alllowercase1"
    });
    expect(result.success).toBe(false);
  });

  it("normalises +91 phone numbers", () => {
    const result = registerSchema.safeParse({
      name: "Test User", email: "t@e.com", phone: "+91 98765 43210",
      password: "Passw0rd!", confirmPassword: "Passw0rd!"
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("9876543210");
  });

  it("rejects invalid Indian mobile numbers", () => {
    expect(indianMobileRegex.test("1234567890")).toBe(false);
    expect(indianMobileRegex.test("98765432")).toBe(false);
    expect(indianMobileRegex.test("9876543210")).toBe(true);
  });
});

describe("checkout validation", () => {
  it("requires an address id", () => {
    expect(checkoutSchema.safeParse({ addressId: "" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ addressId: "abc" }).success).toBe(true);
  });
});

describe("address validation", () => {
  it("requires a valid 6-digit PIN", () => {
    const base = { label: "Home", recipientName: "A B", phone: "9876543210", addressLine1: "123 Main St", city: "Bengaluru", state: "KA" };
    expect(addressSchema.safeParse({ ...base, postalCode: "56003" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...base, postalCode: "560038" }).success).toBe(true);
  });
});

describe("order number generation", () => {
  it("matches the FOOD-YYYYMMDD-NNNNNN format and never exposes DB ids", () => {
    const n = generateOrderNumber();
    expect(n).toMatch(/^FOOD-\d{8}-\d{6}$/);
    const n2 = generateOrderNumber();
    expect(n2).not.toBe(n); // effectively unique in practice
  });
});
