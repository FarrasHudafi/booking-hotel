"""
Convert dataset_hotel_dynamic_pricing.xlsx -> lib/data/training-dataset.json

Schema target (per row, sudah dipangkas ke fitur yang dipakai pipeline ML):
  {
    "nightDate":     "YYYY-MM-DD",   // tanggal malam menginap
    "bookingDate":   "YYYY-MM-DD",   // tanggal booking dibuat
    "priceRatio":    number,          // target = actualPrice / basePrice
    "occupancyRate": number,          // 0..1
    "roomType":      string           // metadata, tidak dipakai model (untuk inspeksi)
  }

Filter:
  - Status == "Confirmed"  (selaras filter live: payment.status != failure)
  - Outlier ratio (<0.3 atau >3.0) di-drop di sisi TS, supaya parity penuh.
"""
import json
import os
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "dataset_hotel_dynamic_pricing.xlsx"
OUT = ROOT / "lib" / "data" / "training-dataset.json"

def main() -> int:
    if not SRC.exists():
        print(f"[ERR] dataset tidak ditemukan: {SRC}", file=sys.stderr)
        return 1

    df = pd.read_excel(SRC)
    print(f"[INFO] loaded {len(df)} rows from {SRC.name}")

    # Kolom esensial
    needed = ["Booking Date", "Night Date", "Base Price (Rp)", "Actual Price (Rp)",
              "Price Ratio", "Occupancy Rate", "Room Type", "Status"]
    missing = [c for c in needed if c not in df.columns]
    if missing:
        print(f"[ERR] kolom hilang: {missing}", file=sys.stderr)
        return 1

    df = df[needed].copy()

    before = len(df)
    df = df[df["Status"].astype(str).str.lower() == "confirmed"]
    print(f"[INFO] filter Confirmed: {before} -> {len(df)}")

    df = df.dropna(subset=["Booking Date", "Night Date", "Price Ratio", "Occupancy Rate"])
    df = df[df["Base Price (Rp)"] > 0]

    out = []
    for _, r in df.iterrows():
        booking = pd.to_datetime(r["Booking Date"]).strftime("%Y-%m-%d")
        night = pd.to_datetime(r["Night Date"]).strftime("%Y-%m-%d")
        out.append({
            "nightDate": night,
            "bookingDate": booking,
            "priceRatio": float(r["Price Ratio"]),
            "occupancyRate": float(r["Occupancy Rate"]),
            "roomType": str(r["Room Type"]),
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = OUT.stat().st_size / 1024
    print(f"[OK] wrote {len(out)} samples -> {OUT.relative_to(ROOT)} ({size_kb:.1f} KB)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
