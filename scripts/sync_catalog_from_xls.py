import json
import re
from datetime import datetime
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
XLS_PATH = Path(r"C:\Users\zuzuh\Downloads\articulos.xls")
CATALOG_JS_PATH = ROOT / "src" / "data" / "catalog.js"
RAW_CATALOG_PATH = ROOT / "server" / "seed-data" / "raw-catalog.json"
REPORT_PATH = ROOT / "docs" / "catalog-sync-report-2026-07-01.json"


def load_excel_rows():
    sheet = pd.read_excel(XLS_PATH, header=None)
    rows = []

    for desc, code, rubro, price, cost in sheet.iloc[3:].itertuples(index=False):
        if pd.isna(desc) or pd.isna(code):
            continue

        code_text = str(code).strip()
        if not code_text.isdigit():
            continue

        rows.append(
            {
                "code": int(code_text),
                "name": str(desc).strip(),
                "rubro": "" if pd.isna(rubro) else str(rubro).strip(),
                "price": float(price) if not pd.isna(price) else 0.0,
                "cost": None if pd.isna(cost) else float(cost),
            }
        )

    return rows


def load_catalog_js():
    text = CATALOG_JS_PATH.read_text(encoding="utf-8")
    match = re.search(r"export const productCatalog = (.*)", text, re.S)
    if not match:
      raise RuntimeError("No se pudo leer src/data/catalog.js")
    return json.loads(match.group(1).rstrip().rstrip(";"))


def write_catalog_js(items):
    payload = json.dumps(items, ensure_ascii=False, separators=(",", ":"))
    CATALOG_JS_PATH.write_text(f"export const productCatalog = {payload}\n", encoding="utf-8")


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, items):
    path.write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def sync_items(existing_items, excel_rows):
    existing_by_code = {int(item["code"]): item for item in existing_items}
    excel_by_code = {int(item["code"]): item for item in excel_rows}
    next_items = []
    stats = {
        "matched": 0,
        "name_changed": 0,
        "price_changed": 0,
        "unchanged": 0,
        "missing_in_repo": [],
        "examples": [],
    }

    for item in existing_items:
        code = int(item["code"])
        incoming = excel_by_code.get(code)
        if not incoming:
            next_items.append(item)
            continue

        stats["matched"] += 1
        next_item = dict(item)
        old_name = str(item.get("name", "")).strip()
        old_price = float(item.get("price", 0) or 0)
        new_name = incoming["name"]
        new_price = float(incoming["price"])

        if old_name != new_name:
            stats["name_changed"] += 1
        if old_price != new_price:
            stats["price_changed"] += 1
        if old_name == new_name and old_price == new_price:
            stats["unchanged"] += 1
        elif len(stats["examples"]) < 20:
            stats["examples"].append(
                {
                    "code": code,
                    "old_name": old_name,
                    "new_name": new_name,
                    "old_price": old_price,
                    "new_price": new_price,
                }
            )

        next_item["name"] = new_name
        next_item["price"] = new_price
        if "rubro" in next_item or incoming.get("rubro"):
            next_item["rubro"] = incoming.get("rubro", "")
        if "cost" in next_item or incoming.get("cost") is not None:
            next_item["cost"] = incoming.get("cost")
        next_items.append(next_item)

    existing_codes = set(existing_by_code)
    for row in excel_rows:
        if int(row["code"]) not in existing_codes:
            stats["missing_in_repo"].append(
                {
                    "code": int(row["code"]),
                    "name": row["name"],
                    "price": float(row["price"]),
                    "rubro": row["rubro"],
                    "cost": row["cost"],
                }
            )

    return next_items, stats


def main():
    excel_rows = load_excel_rows()
    catalog_items = load_catalog_js()
    raw_items = load_json(RAW_CATALOG_PATH)

    next_catalog, catalog_stats = sync_items(catalog_items, excel_rows)
    next_raw, raw_stats = sync_items(raw_items, excel_rows)

    write_catalog_js(next_catalog)
    write_json(RAW_CATALOG_PATH, next_raw)

    report = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "sourceFile": str(XLS_PATH),
        "excelRows": len(excel_rows),
        "catalog": catalog_stats,
        "rawCatalog": raw_stats,
        "notes": [
            "Se sincronizaron solo nombre y precio por código.",
            "No se importó costo.",
            "Los códigos nuevos quedan reportados para alta manual.",
        ],
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
