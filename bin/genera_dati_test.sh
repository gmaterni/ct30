#!/usr/bin/env bash
# Genera i file DATI per le pratiche di test Problematiche
# Output: ./dati_test/DATI_*.txt  (uno per pratica) + ./dati_test/TUTTE_PRATICHE_DATI.txt

set -euo pipefail
cd "$(dirname "$0")/.."
echo "=== Generazione DATI test ==="
node tools/genera_dati_test.mjs
echo "=== Fatto. Output in ./dati_test/ ==="
