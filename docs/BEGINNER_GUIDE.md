# Editing and maintaining the dictionary

## Open in VS Code

Choose **File → Open Folder** and select the folder containing `index.html`. Save changes with Ctrl+S, then refresh the browser. You can open `index.html` directly or serve the folder using the command in README. No website framework needs installing.

Start with small changes in `assets/css/theme.css`:

| Adjustment | Variable |
| --- | --- |
| Main text size | `--base-size` |
| Entry / list title sizes | `--entry-title-size`, `--term-size` |
| Body / heading fonts | `--body-font`, `--heading-font` |
| Background / button colors | `--page-bg`, `--sidebar-bg`, `--surface`, `--accent` |
| Reading margins | `--content-padding` |
| Section spacing | `--section-space`, `--section-gap` |
| Equal side-column width | `--side-column-width` |
| Button size / corners | `--control-size`, `--control-radius` |

Home and entries share the reading margins and section styles. Narrow-screen adjustments are grouped at the end of `assets/css/styles.css`; these may override desktop defaults. Dragging a divider saves a personal width in the browser. Double-click the divider to reset that saved width before judging a new CSS default.

`assets/css/base.css` contains controls shared by the reader and editor. `assets/css/styles.css` contains the three-column layout, sections, graph, and phone behavior. `assets/css/editor.css` contains only the editor layout. Change layout rules there instead of appending another overriding rule for the same element.

## Edit entries and images

1. Open `editor.html`, also linked from the information dialog.
2. Search or use the alphabet rail. Filter by language, word type, theme, or status. Use the title-bar **+** button to add an entry. On a phone, **Daftar istilah** returns from the form to the list.
3. Edit the relevant sections and add a short review note. Choose **Simpan draf**. This saves in this browser, not the website folder. Save or cancel an unfinished form before switching entries or leaving.
4. Open the file menu beside **Penyunting Istilah**, then choose **Unduh pembaruan ZIP**. Extract it, back up the existing data folder, and copy the exported data folder into the site folder.
5. Refresh the reader and check the entry. Commit the changed files in Git when satisfied.

The information button beside Save/Cancel opens a short guide inside the editor. Drag the list boundary on desktop to resize it; double-click to reset. The default and maximum width match the dictionary's list. Keyboard users can focus the boundary and use arrow keys, Home, or End.

The editor preserves the original source text and stable ID. An edited meaning is stored separately and takes priority over source/KBBI meanings. Clear that field to use a valid KBBI III supplement instead. The KBBI III pane stays read-only and is preserved by export. A changed headword must be rematched before an old supplement can appear under it.

For curated images, put local files in assets/images/ and use a path such as assets/images/example.jpg, or provide an HTTPS image URL. Supply title/alt text, creator, license, and the original source-page URL. Curated images fill available slots before automatic matches. Wiki overrides must link directly to the intended article, not a search page. Leaving these fields empty keeps automatic lookup.

In **Grafik istilah**, leave automatic grouping on or turn it off and choose themes under **Pilih tema**. Use Umum for a reviewed general sense. Explain the choice in the review note. KBBI subject tags remain derived from their source.

Status filters can overlap: a saved draft may still lack a meaning or curated image. **Sudah ditinjau** records the review checkbox, not a guarantee that every field is complete. **Gambar belum dikurasi** means no editor-supplied image is stored; live Wikimedia matches may still appear in the reader.

Use **Buka data JSON** to import a complete dataset. **Cadangkan draf & buka data situs** backs up local drafts, then returns to the bundled dataset. CSV can be inspected in Excel, but CSV import is not implemented. Drafts belong to the current browser and address; opening the site through a different address may show a different draft set.

## Review outstanding issues

Open `data/review-queue.csv` to see pending source omissions and whole references without a matching entry. `data/content-review.json` explains the completed decisions, including before/after fields. The original extraction report describes the frozen import; its original counts should not be mistaken for the current queue.

Do not invent a missing definition or connect a vaguely similar word merely to remove a warning. Add a new source with its author, edition/date, and attribution when needed.

## Save and return to a version

Git is already initialized locally on branch `main`, with your GitHub no-reply email. It records checkpoints on this computer. Nothing is uploaded automatically.

In VS Code's Source Control panel, inspect each changed file, stage the intended changes, enter a short message, and commit. Use the file timeline or Git history to inspect an earlier version. Before restoring older files, commit or back up any current edits you want to retain. The release tags identify stable checkpoints, starting with the prototype and subsequent refinements.

After code or master-data changes, run:

```powershell
node tools/update-data.cjs
node tools/check-all.cjs
```

For CSS-only changes, skip data regeneration and run the checks plus a browser inspection. Repackage with `python tools/package-site.py` when a stable copy is ready.

## Online publication

The repository is augie-darrell/kamus-istilah-arsitektur on GitHub. Pushes to main run verification and publish the reading files through GitHub Pages. The deployment omits the editor page and full editing archive; keep using your local editor.html to maintain the data. Other people cannot publish your browser drafts or modify your repository without GitHub write access.

After exporting/applying an editor update, inspect the changes in VS Code, commit, and use Sync Changes or Push. A failed verification prevents the new deployment. Settings → Pages must use GitHub Actions, matching .github/workflows/pages.yml.

To move the project, move the complete folder including its hidden .git folder, then open it at the new location in VS Code. Your Git history and remote connection move with it. Browser drafts are separate: export them before switching browsers or addresses. The release ZIP contains source files but excludes Git history.
