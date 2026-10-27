import os
import sys
import fitz # PyMuPDF

def generate_pdf():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    md_path = os.path.join(script_dir, 'CAMPUS_EATS_MASTER_REPORT.md')
    pdf_path = os.path.join(script_dir, 'CampusEats_Microservices_Report.pdf')

    if not os.path.exists(md_path):
        print(f"Error: {md_path} not found.")
        sys.exit(1)

    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    doc = fitz.open()
    
    # Page setup
    width, height = fitz.paper_size("a4") # 595 x 842 pt
    margin_x = 45
    margin_top = 45
    margin_bottom = 45
    usable_width = width - (2 * margin_x)
    usable_height = height - margin_top - margin_bottom

    lines = md_text.split('\n')
    page = doc.new_page(width=width, height=height)
    current_y = margin_top

    # Helper function to check page break
    def check_page_break(needed_height):
        nonlocal page, current_y
        if current_y + needed_height > height - margin_bottom:
            page = doc.new_page(width=width, height=height)
            current_y = margin_top

    in_code_block = False
    code_block_lines = []

    for line in lines:
        stripped = line.strip()

        # Handle code blocks
        if stripped.startswith('```'):
            if in_code_block:
                # Flush code block
                block_height = len(code_block_lines) * 11 + 14
                check_page_break(block_height)
                rect = fitz.Rect(margin_x, current_y, margin_x + usable_width, current_y + block_height)
                page.draw_rect(rect, color=(0.88, 0.91, 0.94), fill=(0.96, 0.97, 0.98))
                
                c_y = current_y + 10
                for c_line in code_block_lines:
                    # Truncate if very long
                    display_c = c_line[:95]
                    page.insert_text(fitz.Point(margin_x + 8, c_y), display_c, fontsize=7.5, fontname="Courier", color=(0.1, 0.2, 0.3))
                    c_y += 11
                current_y += block_height + 6
                code_block_lines = []
                in_code_block = False
            else:
                in_code_block = True
            continue

        if in_code_block:
            code_block_lines.append(line)
            continue

        # Handle Headings
        if stripped.startswith('# '):
            text = stripped[2:]
            check_page_break(32)
            page.insert_text(fitz.Point(margin_x, current_y + 18), text, fontsize=16, fontname="Helvetica-Bold", color=(0.01, 0.35, 0.65))
            current_y += 28
            # underline
            page.draw_line(fitz.Point(margin_x, current_y), fitz.Point(margin_x + usable_width, current_y), color=(0.01, 0.35, 0.65), width=1.5)
            current_y += 10
        elif stripped.startswith('## '):
            text = stripped[3:]
            check_page_break(26)
            current_y += 8
            page.insert_text(fitz.Point(margin_x, current_y + 14), text, fontsize=12.5, fontname="Helvetica-Bold", color=(0.1, 0.2, 0.3))
            current_y += 20
        elif stripped.startswith('### '):
            text = stripped[4:]
            check_page_break(20)
            current_y += 4
            page.insert_text(fitz.Point(margin_x, current_y + 11), text, fontsize=10.5, fontname="Helvetica-Bold", color=(0.18, 0.3, 0.45))
            current_y += 16
        elif stripped.startswith('---'):
            check_page_break(12)
            page.draw_line(fitz.Point(margin_x, current_y + 4), fitz.Point(margin_x + usable_width, current_y + 4), color=(0.85, 0.88, 0.9), width=0.8)
            current_y += 12
        elif stripped == '':
            current_y += 5
        else:
            # Normal paragraph or list item
            bullet = stripped.startswith('* ') or stripped.startswith('- ')
            indent = 12 if bullet else 0
            clean_text = stripped[2:] if bullet else stripped

            # Basic wrap
            max_chars = 90 - int(indent / 3)
            words = clean_text.split(' ')
            cur_line = ""
            for word in words:
                if len(cur_line) + len(word) + 1 > max_chars:
                    check_page_break(13)
                    if bullet and cur_line == "":
                        page.insert_text(fitz.Point(margin_x, current_y + 9), "•", fontsize=9, fontname="Helvetica", color=(0.01, 0.35, 0.65))
                    page.insert_text(fitz.Point(margin_x + indent, current_y + 9), cur_line, fontsize=8.5, fontname="Helvetica", color=(0.15, 0.18, 0.22))
                    current_y += 12
                    cur_line = word
                else:
                    cur_line = f"{cur_line} {word}".strip()
            if cur_line:
                check_page_break(13)
                if bullet:
                    page.insert_text(fitz.Point(margin_x, current_y + 9), "•", fontsize=9, fontname="Helvetica", color=(0.01, 0.35, 0.65))
                page.insert_text(fitz.Point(margin_x + indent, current_y + 9), cur_line, fontsize=8.5, fontname="Helvetica", color=(0.15, 0.18, 0.22))
                current_y += 13

    # Add page numbers & header
    total_pages = len(doc)
    for idx, p in enumerate(doc):
        # Header
        p.insert_text(fitz.Point(margin_x, 28), "CampusEats (IIIT Vadodara) — Microservices Project Report", fontsize=7.5, fontname="Helvetica-Oblique", color=(0.5, 0.55, 0.6))
        p.draw_line(fitz.Point(margin_x, 32), fitz.Point(margin_x + usable_width, 32), color=(0.85, 0.88, 0.9), width=0.5)

        # Footer
        footer_text = f"Page {idx + 1} of {total_pages}"
        p.insert_text(fitz.Point(width - margin_x - 50, height - 24), footer_text, fontsize=8, fontname="Helvetica", color=(0.4, 0.45, 0.5))
        p.insert_text(fitz.Point(margin_x, height - 24), "CS543 Web Services · Pramit Mazumdar", fontsize=7.5, fontname="Helvetica", color=(0.5, 0.55, 0.6))
        p.draw_line(fitz.Point(margin_x, height - 32), fitz.Point(margin_x + usable_width, height - 32), color=(0.85, 0.88, 0.9), width=0.5)

    doc.save(pdf_path)
    doc.close()
    print(f"Successfully generated PDF report with {total_pages} pages: {pdf_path}")

if __name__ == '__main__':
    generate_pdf()
