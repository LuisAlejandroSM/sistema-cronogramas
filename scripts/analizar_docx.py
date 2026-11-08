import os
import zipfile
import xml.etree.ElementTree as ET

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def get_text(node):
    return ''.join(node.itertext()).strip()

def analyze_docx(path):
    with zipfile.ZipFile(path) as z:
        xml_content = z.read('word/document.xml')
    tree = ET.fromstring(xml_content)
    body = tree.find('w:body', NS)
    
    tables_info = []
    paragraphs = []
    
    for elem in body:
        tag = elem.tag.split('}')[-1]
        if tag == 'p':
            t = get_text(elem)
            if t:
                paragraphs.append(t)
        elif tag == 'tbl':
            rows_data = []
            for tr in elem.findall('w:tr', NS):
                row_cells = []
                for tc in tr.findall('w:tc', NS):
                    row_cells.append(get_text(tc))
                if any(row_cells):
                    rows_data.append(row_cells)
            tables_info.append(rows_data)
            
    return {
        'paragraphs': paragraphs,
        'tables': tables_info
    }

if __name__ == '__main__':
    folder = 'formularios'
    files = sorted([f for f in os.listdir(folder) if f.endswith('.docx')])
    for idx, f in enumerate(files, 1):
        info = analyze_docx(os.path.join(folder, f))
        print(f"\n=======================================================")
        print(f"[{idx}] FILE: {f}")
        print(f"Total paragraphs: {len(info['paragraphs'])}, Total tables: {len(info['tables'])}")
        print("Header paragraphs:", info['paragraphs'][:4])
        for t_idx, tbl in enumerate(info['tables']):
            print(f"  Table {t_idx+1}: {len(tbl)} rows x {len(tbl[0]) if tbl else 0} cols")
            if tbl:
                # print first 2 rows
                for r in tbl[:2]:
                    # truncate cell text
                    short_cells = [c[:30].replace('\n', ' ') for c in r if c]
                    print(f"    {short_cells}")
