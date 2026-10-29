#!/usr/bin/env bash
# Cek kesiapan "agen operasi" (Supabase CLI + Vercel CLI) dan katakan dengan
# bahasa sederhana apa yang masih kurang. Hanya MEMBACA; tidak mengubah apa pun,
# dan tidak pernah mencetak isi token.
#
#   bash scripts/ops-preflight.sh
#
# Keluar 0 jika semuanya siap, 1 jika ada yang kurang.

set -u
ok=0; bad=0
pass() { printf '  [OK]    %s\n' "$1"; ok=$((ok+1)); }
fail() { printf '  [KURANG] %s\n          -> %s\n' "$1" "$2"; bad=$((bad+1)); }
host_reachable() { # kode HTTP apa pun selain 000 berarti jaringan menjangkau host itu
  local code; code=$(curl -s -o /dev/null -m 12 -w '%{http_code}' "https://$1/" 2>/dev/null); [ "${code:-000}" != "000" ]
}

echo "== 1. Alat (CLI)"
if command -v supabase >/dev/null 2>&1; then pass "Supabase CLI $(supabase --version 2>&1 | head -1)"
else fail "Supabase CLI belum terpasang" "jalankan: bash scripts/ops-setup.sh"; fi
if command -v vercel >/dev/null 2>&1; then pass "Vercel CLI $(vercel --version 2>&1 | tail -1)"
else fail "Vercel CLI belum terpasang" "jalankan: bash scripts/ops-setup.sh"; fi

echo "== 2. Akses jaringan (diatur di pengaturan environment)"
for h in api.supabase.com api.vercel.com; do
  if host_reachable "$h"; then pass "jaringan menjangkau $h"
  else fail "jaringan memblokir $h" "tambahkan $h ke Allowed domains di Network access environment (lihat docs/OPS-AGENT.md langkah 1)"; fi
done
if [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
  if host_reachable "${SUPABASE_PROJECT_REF}.supabase.co"; then pass "jaringan menjangkau ${SUPABASE_PROJECT_REF}.supabase.co"
  else fail "jaringan memblokir ${SUPABASE_PROJECT_REF}.supabase.co" "tambahkan ${SUPABASE_PROJECT_REF}.supabase.co ke Allowed domains (untuk uji alur login dan API)"; fi
fi

echo "== 3. Token dan ID (diisi di pengaturan environment, bukan di chat)"
for v in SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF VERCEL_TOKEN; do
  if [ -n "${!v:-}" ]; then pass "$v terisi"; else fail "$v belum diisi" "isi di environment variables (docs/OPS-AGENT.md langkah 2)"; fi
done
for v in SUPABASE_DB_PASSWORD VERCEL_ORG_ID VERCEL_PROJECT_ID; do
  if [ -n "${!v:-}" ]; then pass "$v terisi (opsional)"; else printf '  [opsional] %s belum diisi\n' "$v"; fi
done

echo "== 4. Token benar-benar diterima? (hanya dicek bila bagian 1-3 lolos)"
if command -v supabase >/dev/null 2>&1 && [ -n "${SUPABASE_ACCESS_TOKEN:-}" ] && host_reachable api.supabase.com; then
  if out=$(supabase projects list -o json 2>&1) && printf '%s' "$out" | grep -q "${SUPABASE_PROJECT_REF:-__none__}"; then
    pass "token Supabase valid dan project ${SUPABASE_PROJECT_REF} terlihat"
  else fail "token Supabase ditolak atau project ${SUPABASE_PROJECT_REF:-?} tidak ada di akun itu" "buat ulang token di supabase.com/dashboard/account/tokens dan cek SUPABASE_PROJECT_REF"; fi
else printf '  [lewati]  token Supabase belum bisa dicek\n'; fi
if command -v vercel >/dev/null 2>&1 && [ -n "${VERCEL_TOKEN:-}" ] && host_reachable api.vercel.com; then
  if vercel whoami --token "$VERCEL_TOKEN" >/dev/null 2>&1; then pass "token Vercel valid"
  else fail "token Vercel ditolak" "buat ulang token di vercel.com/account/tokens"; fi
else printf '  [lewati]  token Vercel belum bisa dicek\n'; fi

echo
if [ "$bad" -eq 0 ]; then echo "SIAP: $ok pemeriksaan lolos. Agen operasi bisa bekerja."; exit 0
else echo "BELUM SIAP: $bad hal kurang, $ok lolos. Ikuti petunjuk '->' di atas."; exit 1; fi
