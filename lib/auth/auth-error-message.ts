/**
 * Supabase Auth returns English error messages. The UI is Indonesian, so map
 * the ones a learner/admin can realistically hit on the auth forms; anything
 * unknown falls back to a generic Indonesian message instead of leaking
 * English into the page.
 */
const AUTH_ERROR_MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "Email atau kata sandi salah."],
  [/email not confirmed/i, "Email belum dikonfirmasi. Periksa kotak masuk Anda."],
  [/user already registered|already been registered/i, "Email ini sudah terdaftar. Silakan masuk."],
  [/password should be at least/i, "Kata sandi minimal 6 karakter."],
  [/captcha/i, "Verifikasi captcha gagal. Coba lagi."],
  [/rate limit|too many requests|security purposes/i, "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi."],
  [/invalid email|unable to validate email/i, "Masukkan email yang valid."],
  [/signups not allowed|signup is disabled/i, "Pendaftaran akun sedang ditutup."],
  [/new password should be different/i, "Kata sandi baru harus berbeda dari kata sandi lama."],
  [/weak password|password is too weak/i, "Kata sandi terlalu lemah. Gunakan kombinasi yang lebih kuat."],
]

export function authErrorMessage(message: string | undefined | null): string {
  if (!message) return "Terjadi kesalahan. Coba lagi."
  for (const [pattern, text] of AUTH_ERROR_MESSAGES) {
    if (pattern.test(message)) return text
  }
  return "Terjadi kesalahan. Coba lagi."
}
