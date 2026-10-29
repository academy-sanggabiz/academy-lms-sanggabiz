#!/usr/bin/env bash
# Memasang Supabase CLI dan Vercel CLI bila belum ada. Aman dijalankan berulang.
# Tidak membutuhkan token apa pun, hanya akses ke registry npm.
#
#   bash scripts/ops-setup.sh
#
# Bisa juga ditempel sebagai "Setup script" di pengaturan environment, supaya
# setiap sesi baru langsung punya kedua CLI:
#   npm install -g supabase@latest vercel@latest --no-audit --no-fund

set -euo pipefail

need=()
command -v supabase >/dev/null 2>&1 || need+=("supabase@latest")
command -v vercel   >/dev/null 2>&1 || need+=("vercel@latest")

if [ "${#need[@]}" -eq 0 ]; then
  echo "Sudah terpasang: supabase $(supabase --version 2>&1 | head -1), vercel $(vercel --version 2>&1 | tail -1)"
  exit 0
fi

echo "Memasang: ${need[*]}"
npm install -g "${need[@]}" --no-audit --no-fund
echo "Selesai: supabase $(supabase --version 2>&1 | head -1), vercel $(vercel --version 2>&1 | tail -1)"
