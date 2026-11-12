import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address"),

  password: z
    .string()
    .min(1, "Password is required")
    .max(100, "Password is too long"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, "Refresh token is required"),
});
