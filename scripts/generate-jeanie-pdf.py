"""Generate JEANIE-GUIDE.pdf from JEANIE-GUIDE.md"""
import re
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parent.parent
MD_PATH = ROOT / "JEANIE-GUIDE.md"
OUT_PATH = ROOT / "Martins Global Travel PDF.pdf"

GOLD = (201, 168, 76)
INK = (30, 30, 30)
MUTED = (90, 90, 90)


def safe(text: str) -> str:
    return strip_md(text)


def strip_md(text: str) -> str:
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"`(.+?)`", r"\1", text)
    text = (
        text.replace("\u2014", " - ")
        .replace("\u2013", "-")
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2022", "-")
        .replace("\u00b7", " - ")
        .replace("\u2192", "->")
    )
    # Drop any remaining non-latin-1 characters
    text = text.encode("ascii", "replace").decode("ascii")
    return text.strip()


class GuidePDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*GOLD)
        self.cell(0, 6, "Martins Global Travels  |  Staff Dashboard Guide", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*GOLD)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 8, f"Page {self.page_no()}  |  Staff only - keep admin link private", align="C")


def write_paragraph(pdf: GuidePDF, text: str, size: int = 10, bold: bool = False):
    text = strip_md(text)
    if not text:
        return
    pdf.set_font("Helvetica", "B" if bold else "", size)
    pdf.set_text_color(*INK)
    pdf.multi_cell(0, 5.5, safe(text))
    pdf.ln(1)


def write_bullet(pdf: GuidePDF, text: str):
    text = strip_md(text)
    if not text:
        return
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*INK)
    pdf.multi_cell(0, 5.5, safe(f"  -  {text}"))
    pdf.ln(0.5)


def write_table_row(pdf: GuidePDF, cells: list[str], header: bool = False):
    if not cells or all(not c.strip() for c in cells):
        return
    col_w = 190 / max(len(cells), 1)
    pdf.set_font("Helvetica", "B" if header else "", 9 if header else 9)
    pdf.set_text_color(*(GOLD if header else INK))
    if header:
        pdf.set_fill_color(245, 242, 235)
    for cell in cells:
        pdf.cell(col_w, 7, safe(cell)[:42], border=1, fill=header)
    pdf.ln(7)
    pdf.ln(1)


def main():
    lines = MD_PATH.read_text(encoding="utf-8").splitlines()
    pdf = GuidePDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    in_code = False
    in_quote = False
    i = 0
    while i < len(lines):
        line = lines[i]
        raw = line.rstrip()

        if raw.startswith("```"):
            in_code = not in_code
            if not in_code:
                pdf.ln(2)
            i += 1
            continue

        if in_code:
            if raw.strip():
                pdf.set_font("Courier", "", 9)
                pdf.set_text_color(40, 40, 40)
                w = pdf.w - pdf.l_margin - pdf.r_margin
                pdf.multi_cell(w, 5, safe(raw))
            i += 1
            continue

        if raw.strip() == "---":
            pdf.ln(3)
            i += 1
            continue

        if raw.startswith("# "):
            pdf.ln(2)
            pdf.set_font("Helvetica", "B", 16)
            pdf.set_text_color(*GOLD)
            pdf.multi_cell(0, 8, safe(raw[2:]))
            pdf.ln(2)
            i += 1
            continue

        if raw.startswith("## "):
            pdf.ln(3)
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(*INK)
            pdf.multi_cell(0, 7, safe(raw[3:]))
            pdf.ln(1)
            i += 1
            continue

        if raw.startswith("### "):
            pdf.ln(2)
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(*GOLD)
            pdf.multi_cell(0, 6, safe(raw[4:]))
            pdf.ln(1)
            i += 1
            continue

        if raw.startswith("> "):
            quote_lines = []
            while i < len(lines) and lines[i].startswith(">"):
                quote_lines.append(strip_md(lines[i][2:]))
                i += 1
            pdf.set_fill_color(252, 250, 245)
            pdf.set_draw_color(*GOLD)
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(60, 60, 60)
            pdf.multi_cell(0, 5.5, safe("\n".join(quote_lines)), border="L", fill=True)
            pdf.ln(2)
            continue

        if raw.startswith("|") and "|" in raw[1:]:
            if re.match(r"^\|[\s\-:|]+\|$", raw):
                i += 1
                continue
            cells = [c.strip() for c in raw.strip("|").split("|")]
            is_header = i + 1 < len(lines) and re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip())
            write_table_row(pdf, cells, header=is_header)
            if is_header:
                i += 2
            else:
                i += 1
            continue

        if raw.startswith("- "):
            write_bullet(pdf, raw[2:])
            i += 1
            continue

        if re.match(r"^\d+\.\s", raw):
            write_bullet(pdf, raw)
            i += 1
            continue

        if raw.strip():
            write_paragraph(pdf, raw)
        i += 1

    pdf.output(str(OUT_PATH))
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
