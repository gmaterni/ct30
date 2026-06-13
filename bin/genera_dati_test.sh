#!/usr/bin/env bash
# Genera i file DATI per le pratiche di test Problematiche
# Output: ./tmp/P*.txt  (uno per pratica) + ./tmp/TUTTE_PRATICHE_DATI.txt

set -euo pipefail
cd "$(dirname "$0")/.."
echo "=== Generazione DATI test Problematiche ==="
node tools/genera_dati_test.mjs
echo "=== Fatto. Output in ./tmp/ ==="
