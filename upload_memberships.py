"""
upload_memberships.py
---------------------
يقرأ Cards_2026.xlsx ويرفع البيانات لجدول memberships في Supabase.

الاستخدام:
    pip install openpyxl requests
    python upload_memberships.py
"""

import openpyxl
import re
import requests
import sys

# ── إعدادات Supabase ─────────────────────────────────────────────────────────
SUPABASE_URL = "https://nlhjibxhxzwehlzlixgb.supabase.co"
SUPABASE_KEY = "sb_publishable_iiqsJZG2MfcrPNCpt8iiQA_kfDlzxd1"
TABLE       = "memberships"
EXCEL_FILE  = "Cards_2026.xlsx"   # نفس مجلد الـ script
BATCH_SIZE  = 500                  # عدد الصفوف في كل طلب
# ─────────────────────────────────────────────────────────────────────────────

HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates",   # upsert
}

def clean_branch(raw: str) -> str:
    """يحذف اللاحقة التاريخية من اسم الفرع  مثلاً: 'Maadi - 01.04.2026' → 'Maadi'"""
    return re.split(r"\s*-\s*\d", raw)[0].strip()

def load_excel(path: str) -> list[dict]:
    print(f"📂 قراءة {path} ...")
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.active
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        num    = str(row[0]).strip() if row[0] else ""
        branch = str(row[2]).strip() if row[2] else ""
        if num and num != "None" and branch and branch != "None":
            rows.append({
                "membership_number": num,
                "branch_name":       clean_branch(branch),
            })
    print(f"✅ {len(rows):,} صف جاهز للرفع")
    return rows

def upsert_batch(batch: list[dict], idx: int, total: int):
    url = f"{SUPABASE_URL}/rest/v1/{TABLE}"
    resp = requests.post(url, headers=HEADERS, json=batch, timeout=60)
    if resp.status_code in (200, 201):
        print(f"  ✔ batch {idx} ({len(batch)} صف) — {min(idx*BATCH_SIZE, total):,}/{total:,}")
    else:
        print(f"  ✘ batch {idx} فشل: {resp.status_code} — {resp.text[:200]}")
        sys.exit(1)

def main():
    rows = load_excel(EXCEL_FILE)
    total = len(rows)
    print(f"\n🚀 بدء الرفع — {total:,} صف على دفعات {BATCH_SIZE} ...")

    for i in range(0, total, BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        upsert_batch(batch, i // BATCH_SIZE + 1, total)

    print(f"\n🎉 تم الرفع بنجاح — {total:,} عضوية في Supabase")

if __name__ == "__main__":
    main()
