"""Package the static website without local Git history or private settings."""
from pathlib import Path
import json
import re
import zipfile

site = Path(__file__).resolve().parents[1]
version = re.search(r"version:\s*'([\d.]+)'", (site / 'site-config.js').read_text(encoding='utf-8')).group(1)
archive = site.parent / f'kamus-arsitektur-{version}.zip'
excluded = {'.git', 'node_modules', '__pycache__', '_site'}
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    for path in sorted(site.rglob('*')):
        relative = path.relative_to(site)
        if (path.is_file() and not excluded.intersection(relative.parts)
                and not any(part.startswith('.env') for part in relative.parts)
                and path.suffix.lower() != '.zip'):
            bundle.write(path, Path('kamus-arsitektur') / relative)

with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    names = bundle.namelist()
    assert not any('/.git/' in name or '/.env' in name for name in names)
    for name in ['index.html', 'editor.html', 'assets/css/base.css', 'assets/js/entry-view.js', 'assets/js/editor-model.js', 'data/reader.js', 'data/dictionary.js',
                 'data/kbbi-iii-sources.json', 'data/kbbi-iii-import-report.json']:
        assert 'kamus-arsitektur/' + name in names
    print(json.dumps({'archive': str(archive), 'files': len(names),
                      'bytes': archive.stat().st_size, 'integrity': 'passed'}, indent=2))
