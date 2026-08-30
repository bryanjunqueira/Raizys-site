import os
import shutil
import re

base_dir = r"c:\Users\User\Raizys-site"

files_to_delete = [
    "add-topbar.ps1",
    "byte-clean.ps1",
    "check_active.js",
    "check_all_tags.js",
    "check_boms.js",
    "check_cal_f_rules.js",
    "check_css_encoding.js",
    "check_css_sections.js",
    "check_fixes.ps1",
    "check_home_sections.js",
    "check_null_bytes.js",
    "check_solucoes.js",
    "check_tags.js",
    "clean-artifacts.ps1",
    "clean_artifacts.py",
    "close.js",
    "correct_words.txt",
    "bad_words.txt",
    "css_additions.css",
    "diff.txt",
    "final-clean.ps1",
    "final-surgical-clean.ps1",
    "find_bad_words.ps1",
    "find_flying_cal_styles.js",
    "find_footer_styles.js",
    "fix_all.js",
    "fix_chars.ps1",
    "fix_encoding.js",
    "fix_final.py",
    "fix_forms.js",
    "fix_home.js",
    "fix_mobile_cache.js",
    "git.ignore",
    "inline_css.js",
    "migrate_web3forms.js",
    "precise-clean.ps1",
    "read_agenda_css.js",
    "read_all_changes.js",
    "read_css_diff.js",
    "read_css_sections.js",
    "read_default_eco_bar.js",
    "read_diff.js",
    "read_eco_bar_css.js",
    "read_header_diff.js",
    "read_header_selectors.js",
    "read_home_changes.js",
    "reverse_double_encoding.py",
    "standardize-and-clean.ps1",
    "surgical-clean.ps1",
    "test.txt",
    "update-footer-address.ps1",
    "update-header.ps1",
    "update-pages.ps1",
    "update-version.ps1",
    "update_footer.py",
    ".FullName",
    "assets/1.png",
    "assets/2.png",
    "assets/header-reference.png",
    "assets/hero-reference.png",
    "assets/logo-icon.png",
    "assets/logo-text.png",
    "assets/partner.png",
    "assets/pet_hero_illustration.png"
]

dirs_to_delete = [
    "backup_temp_2",
    "backup_temp_clean",
    "temp_zip"
]

def delete_unnecessary():
    print("Deleting unnecessary files...")
    for f in files_to_delete:
        path = os.path.join(base_dir, f)
        if os.path.exists(path):
            try:
                os.remove(path)
                print(f"Deleted file: {f}")
            except Exception as e:
                print(f"Error deleting file {f}: {e}")
                
    print("Deleting unnecessary directories...")
    for d in dirs_to_delete:
        path = os.path.join(base_dir, d)
        if os.path.exists(path) and os.path.isdir(path):
            try:
                shutil.rmtree(path)
                print(f"Deleted directory: {d}")
            except Exception as e:
                print(f"Error deleting directory {d}: {e}")

def strip_css_comments(text):
    out = []
    i = 0
    n = len(text)
    in_comment = False
    in_string_single = False
    in_string_double = False
    while i < n:
        c = text[i]
        next_c = text[i+1] if i + 1 < n else ""
        if not in_comment:
            if not in_string_single and not in_string_double:
                if c == '/' and next_c == '*':
                    in_comment = True
                    i += 1
                elif c == "'":
                    in_string_single = True
                    out.append(c)
                elif c == '"':
                    in_string_double = True
                    out.append(c)
                else:
                    out.append(c)
            elif in_string_single:
                out.append(c)
                if c == '\\':
                    out.append(next_c)
                    i += 1
                elif c == "'":
                    in_string_single = False
            elif in_string_double:
                out.append(c)
                if c == '\\':
                    out.append(next_c)
                    i += 1
                elif c == '"':
                    in_string_double = False
        else:
            if c == '*' and next_c == '/':
                in_comment = False
                i += 1
        i += 1
    return "".join(out)

def strip_js_comments(text):
    out = []
    i = 0
    n = len(text)
    state = "NORMAL"
    
    def get_last_non_ws():
        for c in reversed(out):
            if not c.isspace():
                return c
        return ""

    while i < n:
        c = text[i]
        next_c = text[i+1] if i + 1 < n else ""
        
        if state == "NORMAL":
            if c == '"':
                state = "STR_DOUBLE"
                out.append(c)
            elif c == "'":
                state = "STR_SINGLE"
                out.append(c)
            elif c == '`':
                state = "STR_TEMPLATE"
                out.append(c)
            elif c == '/' and next_c == '/':
                state = "LINE_COMMENT"
                i += 1
            elif c == '/' and next_c == '*':
                state = "BLOCK_COMMENT"
                i += 1
            elif c == '/':
                last_char = get_last_non_ws()
                if last_char and (last_char.isalnum() or last_char in ")$_]"):
                    out.append(c)
                else:
                    state = "REGEX"
                    out.append(c)
            else:
                out.append(c)
                
        elif state == "STR_DOUBLE":
            out.append(c)
            if c == '\\':
                out.append(next_c)
                i += 1
            elif c == '"':
                state = "NORMAL"
                
        elif state == "STR_SINGLE":
            out.append(c)
            if c == '\\':
                out.append(next_c)
                i += 1
            elif c == "'":
                state = "NORMAL"
                
        elif state == "STR_TEMPLATE":
            out.append(c)
            if c == '\\':
                out.append(next_c)
                i += 1
            elif c == '`':
                state = "NORMAL"
                
        elif state == "REGEX":
            out.append(c)
            if c == '\\':
                out.append(next_c)
                i += 1
            elif c == '[':
                state = "REGEX_CLASS"
            elif c == '/':
                state = "NORMAL"
                
        elif state == "REGEX_CLASS":
            out.append(c)
            if c == '\\':
                out.append(next_c)
                i += 1
            elif c == ']':
                state = "REGEX"
                
        elif state == "LINE_COMMENT":
            if c == '\n':
                state = "NORMAL"
                out.append(c)
                
        elif state == "BLOCK_COMMENT":
            if c == '*' and next_c == '/':
                state = "NORMAL"
                i += 1
                
        i += 1
        
    return "".join(out)

def strip_html_comments(text):
    out = []
    i = 0
    n = len(text)
    
    while i < n:
        if text[i:i+4] == '<!--':
            i += 4
            while i < n and text[i:i+3] != '-->':
                i += 1
            i += 3
            continue
            
        if text[i:i+6].lower() == '<style':
            start_tag_end = text.find('>', i)
            if start_tag_end != -1:
                out.append(text[i:start_tag_end+1])
                close_tag_start = text.lower().find('</style>', start_tag_end+1)
                if close_tag_start != -1:
                    style_content = text[start_tag_end+1:close_tag_start]
                    cleaned_style = strip_css_comments(style_content)
                    out.append(cleaned_style)
                    i = close_tag_start
                    continue
                    
        if text[i:i+7].lower() == '<script':
            start_tag_end = text.find('>', i)
            if start_tag_end != -1:
                out.append(text[i:start_tag_end+1])
                close_tag_start = text.lower().find('</script>', start_tag_end+1)
                if close_tag_start != -1:
                    script_content = text[start_tag_end+1:close_tag_start]
                    cleaned_script = strip_js_comments(script_content)
                    out.append(cleaned_script)
                    i = close_tag_start
                    continue
                    
        out.append(text[i])
        i += 1
        
    return "".join(out)

def clean_comments_in_production_files():
    print("Removing comments from production files...")
    for root, _, files in os.walk(base_dir):
        # Skip temporary directories or ignored directories
        if any(ignored in root for ignored in dirs_to_delete + [".git"]):
            continue
            
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in [".html", ".css", ".js"]:
                continue
                
            # Skip the cleanup script itself
            if file == "cleanup_workspace.py":
                continue
                
            filepath = os.path.join(root, file)
            print(f"Processing: {filepath}")
            
            try:
                # Read using utf-8-sig to handle BOM or utf-8 safely
                with open(filepath, 'r', encoding='utf-8-sig', errors='ignore') as f:
                    content = f.read()
                
                if ext == ".html":
                    cleaned = strip_html_comments(content)
                elif ext == ".css":
                    cleaned = strip_css_comments(content)
                elif ext == ".js":
                    cleaned = strip_js_comments(content)
                else:
                    continue
                
                with open(filepath, 'w', encoding='utf-8', newline='') as f:
                    f.write(cleaned)
                    
            except Exception as e:
                print(f"Error processing {filepath}: {e}")

if __name__ == "__main__":
    delete_unnecessary()
    clean_comments_in_production_files()
    print("Done!")
