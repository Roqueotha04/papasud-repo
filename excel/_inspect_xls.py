"""Read-only inspection of the movements workbook. Prints a snapshot of every sheet.
No transformation, no writes to disk."""
import sys

PATH = r"c:\Users\angry\OneDrive\Escritorio\Programacion\Papasud repo\excel\Planilla de movimientos 2026.xls"


def main():
    try:
        import xlrd
    except ImportError:
        print("NO_XLRD")
        return

    book = xlrd.open_workbook(PATH, formatting_info=False)
    print("SHEETS:", book.sheet_names())
    for sh in book.sheets():
        print("\n" + "=" * 80)
        print(f"SHEET: {sh.name!r}  rows={sh.nrows} cols={sh.ncols}")
        print("=" * 80)
        max_rows = min(sh.nrows, 25)
        for r in range(max_rows):
            vals = []
            for c in range(sh.ncols):
                v = sh.cell_value(r, c)
                if isinstance(v, float) and v == int(v):
                    v = int(v)
                vals.append(str(v))
            line = " | ".join(vals).rstrip(" |")
            if line.strip():
                print(f"[{r:>3}] {line}")
        if sh.nrows > max_rows:
            print(f"... (+{sh.nrows - max_rows} more rows)")


if __name__ == "__main__":
    main()
