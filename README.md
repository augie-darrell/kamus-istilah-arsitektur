# Kamus Istilah Arsitektur

**Version 0.1.0** — first release for human content verification.

Website: https://augie-darrell.github.io/kamus-istilah-arsitektur/

A static, multilingual architecture dictionary with 6,603 entries from *Kamus Istilah Arsitektur 2010*, by Sugeng Rahardjo and the compiling team. Website by Augie Darrell Lee, supported by Formetrika Integrated. Dictionary authorship and website authorship are separate.

## Open locally

Open `index.html` after extracting the whole folder. Dictionary search, meanings, bookmarks, and graph navigation work offline. Wikipedia, Wiktionary, current KBBI links, and remote images require an internet connection.

For a local server, run this from the project folder, then open http://127.0.0.1:8766/index.html:

```powershell
python -m http.server 8766 --bind 127.0.0.1
```

This project has no framework, dependency installation, backend, API keys, or account system. Local changes stay on your computer until you commit and push them.

## Interface

- A title bar opens home and toggles the two side panels.
- Daftar Istilah contains search, language/type filters, saved entries, and an alphabet rail. Search tolerates spelling mistakes. Drag the alphabet rail to move through Aa, Ab, and other subsections.
- The center shares one layout and section style between home and entries. The selected entry header stays fixed while its content scrolls.
- Daftar Grafik supports node dragging, panning, wheel/pinch zoom, and double-click expansion. Its menu remembers 1–3 local steps. Graph Beranda opens the global theme hierarchy without leaving the entry or closing the phone's graph panel. Selecting an entry restores the local graph and preserves the search.
- Desktop side columns resize symmetrically. Phone panels occupy the available screen below the title bar; the same sponsor card moves to the reading column.

## Folder guide

| Location | Contents |
| --- | --- |
| `index.html`, `editor.html` | Dictionary and editor entry points |
| `site-config.js` | Site identity, release version, repository and download links |
| `assets/css/` | Theme variables and shared/page styles |
| `assets/js/` | Shared components, dictionary, graph, and editor code |
| `assets/images/` | Used branding, title-bar pattern, and curated illustration |
| `data/` | Master records, generated reading data, source/review evidence, and CSV |
| `docs/` | Editing guide, provenance, KBBI supplement, and license scope |
| `tools/` | Data generation, verification, and packaging commands |
| `.github/workflows/pages.yml` | Verification and automatic GitHub Pages deployment |

The root README and contribution guide are the project starting points. Earlier milestone notes are retained in Git history rather than repeated in the current folder.

## Data and generation

`data/dictionary.json` is the editable master. It retains stable IDs, original source transcripts, source occurrences, translations, explicit references, and separately attributed KBBI III excerpts. `data/associations.json` records generated tag/relationship suggestions and their evidence.

The reader loads **`data/reader.js`**, a compact generated projection. It excludes source transcripts, audit spans, unused examples, and duplicated relationship evidence. Shared language/URL tables and indexed edges remove repeated strings. The editor loads the complete `data/dictionary.js` archive. Both scripts support direct offline opening.

The former full graph script is removed: the reader already includes compact graph data, and the editor derives its current grouping from the editable records. The association JSON remains available for generation and review.

The browser editor and Node maintenance tools use the same generator in `assets/js/shared.js` / `assets/js/reader-data.js`. After manually changing the master JSON, run:

```powershell
node tools/update-data.cjs
node tools/check-all.cjs
```

This refreshes relations, associations, full offline data, the CSV export, and the reader bundle. `node tools/build-associations.cjs` refreshes generated files without re-resolving explicit references. `node tools/build-reader.cjs` rebuilds only the compact reader and prints raw/gzip sizes. Do not edit generated JavaScript or association files directly.

## Maintain content

Open `editor.html`, or use **Tentang kamus → Penyunting istilah**. Its two-column layout shares the dictionary's title bar, search, alphabet rail, entry rows, controls, and section styles. On a phone, switch between the full-screen list and form using **Daftar istilah**. The title-bar buttons add an entry and return to the dictionary.

Drag the editor's column boundary to resize its list, with the same default width and title-based limit as the dictionary. Double-click resets the width. The information button beside Save/Cancel opens the editor guide using the same dialog component as the reader.

Filter by language, word type, theme, or status. The form covers Makna, Padanan bahasa, Lihat, graph themes, three curated images, direct wiki links, source attribution, and review notes. Themes can remain automatic or be selected manually. Status filters distinguish local drafts, source issues, missing meanings, uncurated images, unresolved references, and completed reviews; an entry can match several statuses.

**Simpan draf** saves only in this browser. Use the file menu beside **Penyunting Istilah → Unduh pembaruan ZIP**, extract it, back up and replace the site's `data` folder, then refresh the dictionary. The ZIP includes the compact reader. Unsaved forms must be saved or cancelled before switching entries or leaving. **Cadangkan draf & buka data situs** downloads a backup before restoring the bundled data. Exporting does not publish or commit changes.

Edited meanings are stored separately from the original transcript and take priority in the reader, search, and automatic grouping. KBBI III text/provenance stays read-only. CSV remains a review/export format; JSON is the supported import format.

## Code map

| File | Responsibility |
| --- | --- |
| `assets/css/theme.css` | Editable color, font, size, spacing, and width variables |
| `assets/css/base.css` | Shared controls, accessibility, and typography primitives for reader/editor |
| `assets/css/styles.css` / `assets/css/editor.css` | Reader layout / editor-specific layout |
| `assets/js/app.js` | Reader state, routing, and rendering |
| `assets/js/search.js`, `assets/js/list-layout.js`, `assets/js/alphabet-rail.js` | Ranking, virtual list, and alphabet navigation |
| `assets/js/entry-content.js`, `assets/js/kbbi-format.js` | Meaning priority, word types, and KBBI formatting |
| `assets/js/entry-view.js` | Shared list rows, alphabet controls, tags, and meaning rendering |
| `assets/js/editor.js`, `assets/js/editor-model.js` | Editor interaction, draft filtering, and source-preserving edits |
| `assets/js/panel-layout.js`, `assets/js/graph-input.js` | Panel resizing and shared graph gestures |
| `assets/js/graph.js`, `assets/js/global-graph.js` | Local/global graph rendering |
| `assets/js/associations-builder.js` | Suggested groups/links, including reviewed sense overrides |
| `assets/js/references.js` | Wiki article lookup, deduplication, image relevance/cache |
| `assets/js/reader-data.js`, `assets/js/shared.js`, `tools/data-files.cjs` | Shared reader projection and export/generation pipeline |
| `site-config.js` | Credits, version, and optional repository/download URLs |

## Review status and services

All 27 original flagged entries and 108 unresolved extraction fragments have review decisions in `data/content-review.json`. Fifteen source issues and 35 unresolved whole references remain. `data/review-queue.csv` is the actionable queue. The extraction report retains the original snapshot counts.

Automatic tags were reviewed on a bounded 26-entry sample, with six sense corrections. This does not certify every generated tag or relationship. Broad parents use Uniclass as a navigation reference; they are not official code mappings.

Online images still come from Wikipedia/Wikimedia Commons, up to three when suitable. The query remains the displayed term unless a curator sets an override. Reviewed context filters reject reported mismatches for Acuan, Begel, and Beban. Images show titles and link to their original source; automatic matches still need curation. Google Images is an outbound link only. KBBI VI links are official lookup links, not a live definition API or verified existence check.

The GitHub button links to this repository. Windows and Android buttons remain disabled until download URLs are supplied in `site-config.js`.

## Online publication and local editing

Pushes to main run the checks and deploy the reading site through GitHub Actions. Configure the repository's Settings → Pages source as **GitHub Actions**. `node tools/build-public.cjs` prepares the generated `_site/` folder using an explicit list of reading assets.

The deployed website excludes editor.html, editor code/styles, the full editing data, and source-audit files. Its information dialog has no editor link. The complete local repository still contains the editor and maintenance records; a public repository also allows others to inspect or clone them. Only authorized GitHub collaborators can push changes to the main project. The editor has no sign-in and saves browser-local drafts rather than updating GitHub directly.

For maintenance: open editor.html locally, save a draft, export/apply the data update, verify, commit, and push. GitHub Pages publishes the new reading files after the workflow succeeds.

You may move or rename the whole project folder, including its hidden .git directory, then reopen it in VS Code. Relative asset links and the GitHub connection remain valid. Export browser drafts before moving or changing browser addresses. ZIP packages omit Git history; move the actual repository folder to preserve your checkpoints.

## Checks and packaging

`node tools/check-all.cjs` runs all regression suites plus JavaScript syntax checks. These cover source integrity, search/filter parity, graph paths, gestures, KBBI formatting, editorial corrections, reader/full-data parity, and editor exports. Check desktop and phone layouts in the browser after visual changes.

Package with `python tools/package-site.py`. It writes `../kamus-arsitektur-0.1.0.zip` using the version in site-config.js, verifies its integrity, and excludes Git history and local settings.

See [BEGINNER_GUIDE.md](docs/BEGINNER_GUIDE.md) for editing, [DATA_NOTES.md](docs/DATA_NOTES.md) for provenance/review, [KBBI_III.md](docs/KBBI_III.md) for the offline supplement, and [LICENSE_SCOPE.md](docs/LICENSE_SCOPE.md) for separate code/content rights. Git history preserves earlier milestones.
