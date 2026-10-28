import { z } from "zod"

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(1, "Nama lengkap wajib diisi"),
    email: z.string().trim().email("Masukkan email yang valid"),
    password: z.string().min(6, "Kata sandi minimal 6 karakter"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Kata sandi tidak cocok",
    path: ["confirmPassword"],
  })

export type SignupFormValues = z.infer<typeof signupSchema>
