"""
Replikasi training pipeline TS di Python untuk inspeksi weights + prediksi.
Tujuan: diagnosa kenapa prediksi terlalu jauh dari base rate.
"""
import json
import math
from datetime import date, timedelta
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "lib" / "data" / "training-dataset.json"

# Holiday calendar (subset, sama dengan lib/ml-features.ts)
HOLIDAYS = {
    "2024-01-01","2024-02-10","2024-02-08","2024-03-11","2024-04-10","2024-04-11",
    "2024-05-01","2024-05-23","2024-06-01","2024-06-17","2024-07-07","2024-08-17",
    "2024-09-16","2024-12-24","2024-12-25",
    "2025-01-01","2025-01-27","2025-01-29","2025-03-29","2025-03-31","2025-04-01",
    "2025-05-01","2025-05-12","2025-05-29","2025-06-01","2025-06-06","2025-06-27",
    "2025-08-17","2025-09-05","2025-12-24","2025-12-25",
    "2026-01-01","2026-01-16","2026-02-17","2026-03-19","2026-03-20","2026-03-21",
    "2026-05-01","2026-05-14","2026-05-27","2026-06-01","2026-06-16","2026-08-17",
    "2026-08-26","2026-12-24","2026-12-25",
}

SCHOOL_PERIODS = [
    (date(2024,12,22), date(2025,1,5)),
    (date(2024,3,22),  date(2024,3,31)),
    (date(2024,6,14),  date(2024,6,30)),
    (date(2025,3,21),  date(2025,3,30)),
    (date(2025,6,13),  date(2025,6,29)),
    (date(2025,12,20), date(2026,1,4)),
    (date(2026,3,20),  date(2026,3,29)),
    (date(2026,6,12),  date(2026,6,28)),
    (date(2026,12,21), date(2027,1,3)),
]

FEATURE_KEYS = ["isFriSat","isSunday","isMidweek","isHoliday","isSchoolHoliday",
                "monthSin","monthCos","leadTimeNorm","occupancyRate"]

def is_school(d: date) -> int:
    for s,e in SCHOOL_PERIODS:
        if s <= d <= e: return 1
    return 0

OCC_FLOOR = 0.3  # floor untuk hindari extrapolation di bawah training distribution

def feats(night: date, booking: date, occ: float, occ_floor: float = 0.0):
    dow = night.weekday()  # 0=Mon..6=Sun
    # JS getDay: 0=Sun..6=Sat. Python weekday: 0=Mon..6=Sun. Convert:
    js_dow = (dow + 1) % 7
    month = night.month - 1  # 0..11
    lead = max(0, (night - booking).days)
    occ_eff = max(occ_floor, min(1, max(0, occ)))
    return [
        1 if js_dow in (5,6) else 0,
        1 if js_dow == 0 else 0,
        1 if js_dow in (2,3) else 0,
        1 if night.isoformat() in HOLIDAYS else 0,
        is_school(night),
        math.sin(2*math.pi*month/12),
        math.cos(2*math.pi*month/12),
        min(lead, 90)/90,
        occ_eff,
        1.0,  # bias
    ]

def main():
    rows = json.loads(DATA.read_text())
    print(f"[INFO] dataset rows: {len(rows)}")

    X, y = [], []
    for r in rows:
        ratio = r["priceRatio"]
        if not (0.3 <= ratio <= 3.0): continue
        night = date.fromisoformat(r["nightDate"])
        booking = date.fromisoformat(r["bookingDate"])
        X.append(feats(night, booking, r["occupancyRate"]))
        y.append(ratio)

    # Synthetic prior — replikasi buildSyntheticSamples
    today = date(2026, 4, 28)
    seed = 1
    def rand():
        nonlocal_seed[0] = (nonlocal_seed[0] * 9301 + 49297) % 233280
        return nonlocal_seed[0] / 233280
    nonlocal_seed = [1]
    syn_X, syn_y = [], []
    for days_out in range(1, 181, 2):
        for variant in range(2):
            night = today + timedelta(days=days_out)
            lead_days = max(1, days_out - variant*45)
            booking = night - timedelta(days=lead_days)
            occ = 0.35 + rand()*0.55
            f = feats(night, booking, occ)
            yy = 1.0
            if f[0]: yy *= 1.07
            if f[1]: yy *= 0.97
            if f[2]: yy *= 0.96
            if f[3]: yy *= 1.22
            if f[4]: yy *= 1.12
            yy *= 1 + f[5]*0.03 + f[6]*-0.02
            if f[7] < 0.08: yy *= 1.1
            elif f[7] > 0.7: yy *= 0.93
            yy *= 1 + (f[8]-0.5)*0.18
            yy *= 0.97 + rand()*0.06
            syn_X.append(f); syn_y.append(yy)

    print(f"[INFO] real-from-dataset: {len(X)}, synthetic: {len(syn_X)}")
    print(f"[INFO] dataset y mean={np.mean(y):.4f} std={np.std(y):.4f} min={min(y):.3f} max={max(y):.3f}")
    print(f"[INFO] synth   y mean={np.mean(syn_y):.4f} std={np.std(syn_y):.4f}")

    # Combined: synthetic + dataset (dataset di-replicate 1x karena tidak ada live data 3x)
    Xall = np.array(syn_X + X)
    yall = np.array(syn_y + y)

    def fit(lam: float):
        XtX = Xall.T @ Xall
        n = XtX.shape[0]
        for i in range(n-1): XtX[i,i] += lam
        return np.linalg.solve(XtX, Xall.T @ yall)

    tests = [
        ("Live cold-start (occ=0)",          today+timedelta(days=14), today, 0.00),
        ("Sparse live (occ=0.1)",            today+timedelta(days=14), today, 0.10),
        ("Today+30 Thursday, occ=0.5",       today+timedelta(days=30), today, 0.50),
        ("Today+7 Sunday, occ=0.3",          today+timedelta(days=7),  today, 0.30),
        ("Christmas 2026, occ=0.8",          date(2026,12,25),         today, 0.80),
        ("Idul Fitri 2026, occ=0.9",         date(2026,3,20),          today, 0.90),
        ("Random Tue Aug 2026, occ=0.4",     date(2026,8,11),          today, 0.40),
    ]

    for label_cfg, lam, occ_floor in [
        ("CURRENT (lam=0.8, no floor)", 0.8, 0.0),
        ("PROPOSED (lam=3.0, floor=0.3)", 3.0, 0.3),
    ]:
        theta = fit(lam)
        print(f"\n========== {label_cfg} ==========")
        print("WEIGHTS:")
        for k, w in zip(FEATURE_KEYS + ["bias"], theta):
            print(f"  {k:20s} = {w:+.4f}")
        print("PREDICTIONS (clamp 0.7..1.5):")
        for label, night, booking, occ in tests:
            f = np.array(feats(night, booking, occ, occ_floor))
            raw = float(f @ theta)
            clamp = min(1.5, max(0.7, raw))
            dow_name = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][night.weekday()]
            print(f"  {label:35s} night={night} ({dow_name}) raw={raw:+.4f} clamped={clamp:.4f}")

if __name__ == "__main__":
    main()
