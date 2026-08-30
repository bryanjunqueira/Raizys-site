const fs = require('fs');
const path = require('path');

const baseDir = "c:\\Users\\User\\Raizys-site";

const filesToDelete = [
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
];

const dirsToDelete = [
    "backup_temp_2",
    "backup_temp_clean",
    "temp_zip"
];

function deleteUnnecessary() {
    console.log("Deleting unnecessary files...");
    for (const f of filesToDelete) {
        const filepath = path.join(baseDir, f);
        if (fs.existsSync(filepath)) {
            try {
                fs.unlinkSync(filepath);
                console.log(`Deleted file: ${f}`);
            } catch (err) {
                console.error(`Error deleting file ${f}:`, err.message);
            }
        }
    }

    console.log("Deleting unnecessary directories...");
    for (const d of dirsToDelete) {
        const dirpath = path.join(baseDir, d);
        if (fs.existsSync(dirpath) && fs.statSync(dirpath).isDirectory()) {
            try {
                fs.rmSync(dirpath, { recursive: true, force: true });
                console.log(`Deleted directory: ${d}`);
            } catch (err) {
                console.error(`Error deleting directory ${d}:`, err.message);
            }
        }
    }
}

function stripCssComments(text) {
    let out = [];
    let i = 0;
    let n = text.length;
    let inComment = false;
    let inStringSingle = false;
    let inStringDouble = false;

    while (i < n) {
        let c = text[i];
        let nextC = i + 1 < n ? text[i + 1] : "";

        if (!inComment) {
            if (!inStringSingle && !inStringDouble) {
                if (c === '/' && nextC === '*') {
                    inComment = true;
                    i++;
                } else if (c === "'") {
                    inStringSingle = true;
                    out.push(c);
                } else if (c === '"') {
                    inStringDouble = true;
                    out.push(c);
                } else {
                    out.push(c);
                }
            } else if (inStringSingle) {
                out.push(c);
                if (c === '\\') {
                    out.push(nextC);
                    i++;
                } else if (c === "'") {
                    inStringSingle = false;
                }
            } else if (inStringDouble) {
                out.push(c);
                if (c === '\\') {
                    out.push(nextC);
                    i++;
                } else if (c === '"') {
                    inStringDouble = false;
                }
            }
        } else {
            if (c === '*' && nextC === '/') {
                inComment = false;
                i++;
            }
        }
        i++;
    }
    return out.join("");
}

function stripJsComments(text) {
    let out = [];
    let i = 0;
    let n = text.length;
    let state = "NORMAL";

    function getLastNonWs() {
        for (let j = out.length - 1; j >= 0; j--) {
            if (!/\s/.test(out[j])) {
                return out[j];
            }
        }
        return "";
    }

    while (i < n) {
        let c = text[i];
        let nextC = i + 1 < n ? text[i + 1] : "";

        if (state === "NORMAL") {
            if (c === '"') {
                state = "STR_DOUBLE";
                out.push(c);
            } else if (c === "'") {
                state = "STR_SINGLE";
                out.push(c);
            } else if (c === '`') {
                state = "STR_TEMPLATE";
                out.push(c);
            } else if (c === '/' && nextC === '/') {
                state = "LINE_COMMENT";
                i++;
            } else if (c === '/' && nextC === '*') {
                state = "BLOCK_COMMENT";
                i++;
            } else if (c === '/') {
                let lastChar = getLastNonWs();
                if (lastChar && (/[a-zA-Z0-9_$]/.test(lastChar) || lastChar === ')' || lastChar === ']' || lastChar === '}')) {
                    out.push(c);
                } else {
                    state = "REGEX";
                    out.push(c);
                }
            } else {
                out.push(c);
            }
        } else if (state === "STR_DOUBLE") {
            out.push(c);
            if (c === '\\') {
                out.push(nextC);
                i++;
            } else if (c === '"') {
                state = "NORMAL";
            }
        } else if (state === "STR_SINGLE") {
            out.push(c);
            if (c === '\\') {
                out.push(nextC);
                i++;
            } else if (c === "'") {
                state = "NORMAL";
            }
        } else if (state === "STR_TEMPLATE") {
            out.push(c);
            if (c === '\\') {
                out.push(nextC);
                i++;
            } else if (c === '`') {
                state = "NORMAL";
            }
        } else if (state === "REGEX") {
            out.push(c);
            if (c === '\\') {
                out.push(nextC);
                i++;
            } else if (c === '[') {
                state = "REGEX_CLASS";
            } else if (c === '/') {
                state = "NORMAL";
            }
        } else if (state === "REGEX_CLASS") {
            out.push(c);
            if (c === '\\') {
                out.push(nextC);
                i++;
            } else if (c === ']') {
                state = "REGEX";
            }
        } else if (state === "LINE_COMMENT") {
            if (c === '\n') {
                state = "NORMAL";
                out.push(c);
            }
        } else if (state === "BLOCK_COMMENT") {
            if (c === '*' && nextC === '/') {
                state = "NORMAL";
                i++;
            }
        }
        i++;
    }
    return out.join("");
}

function stripHtmlComments(text) {
    let out = [];
    let i = 0;
    let n = text.length;

    while (i < n) {
        if (text.substring(i, i + 4) === '<!--') {
            i += 4;
            while (i < n && text.substring(i, i + 3) !== '-->') {
                i++;
            }
            i += 3;
            continue;
        }

        if (text.substring(i, i + 6).toLowerCase() === '<style') {
            let startTagEnd = text.indexOf('>', i);
            if (startTagEnd !== -1) {
                out.push(text.substring(i, startTagEnd + 1));
                let closeTagStart = text.toLowerCase().indexOf('</style>', startTagEnd + 1);
                if (closeTagStart !== -1) {
                    let styleContent = text.substring(startTagEnd + 1, closeTagStart);
                    let cleanedStyle = stripCssComments(styleContent);
                    out.push(cleanedStyle);
                    i = closeTagStart;
                    continue;
                }
            }
        }

        if (text.substring(i, i + 7).toLowerCase() === '<script') {
            let startTagEnd = text.indexOf('>', i);
            if (startTagEnd !== -1) {
                out.push(text.substring(i, startTagEnd + 1));
                let closeTagStart = text.toLowerCase().indexOf('</script>', startTagEnd + 1);
                if (closeTagStart !== -1) {
                    let scriptContent = text.substring(startTagEnd + 1, closeTagStart);
                    let cleanedScript = stripJsComments(scriptContent);
                    out.push(cleanedScript);
                    i = closeTagStart;
                    continue;
                }
            }
        }

        out.push(text[i]);
        i++;
    }
    return out.join("");
}

function walkDir(dir, callback) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat && stat.isDirectory()) {
            // Skip ignored directories
            if (dirsToDelete.includes(file) || file === ".git") {
                continue;
            }
            walkDir(filepath, callback);
        } else {
            callback(filepath, file);
        }
    }
}

function cleanCommentsInProductionFiles() {
    console.log("Removing comments from production files...");
    walkDir(baseDir, (filepath, file) => {
        const ext = path.extname(file).toLowerCase();
        if (![".html", ".css", ".js"].includes(ext)) {
            return;
        }

        if (file === "cleanup_workspace.js" || file === "cleanup_workspace.py") {
            return;
        }

        console.log(`Processing: ${filepath}`);
        try {
            const content = fs.readFileSync(filepath, 'utf8');
            let cleaned = "";
            if (ext === ".html") {
                cleaned = stripHtmlComments(content);
            } else if (ext === ".css") {
                cleaned = stripCssComments(content);
            } else if (ext === ".js") {
                cleaned = stripJsComments(content);
            }

            fs.writeFileSync(filepath, cleaned, 'utf8');
        } catch (err) {
            console.error(`Error processing ${filepath}:`, err.message);
        }
    });
}

// Run tasks
deleteUnnecessary();
cleanCommentsInProductionFiles();
console.log("Done!");
