# Data provenance and editorial review

## Frozen blog snapshot

The dictionary was extracted on 26 October 2026 from 26 A–Z pages of the Kamus Istilah Arsitektur blog. It contains 6,603 entries from 6,612 source records, after merging nine exact repetitions. Distinct languages and senses remain separate records. The book is attributed to Sugeng Rahardjo and the compiling team, 2010; the digital blog source credits Rudy Novian / tim penyusun.

`source_text`, `source_occurrences`, `source_index`, `source_url`, `related_raw`, and stable IDs retain the original extraction evidence. The source-page letter is provenance; list headings are computed from the displayed term. `data/extraction-report.json` retains the original coverage and issue counts. Local HTML/text snapshots remain outside the distributable site in the task's work folder.

The nine merged repetitions are Aandeel, Aannemer, Aanstamping, Circular Stair, City Hall, Eccentric Load, Net, Specie, and Staging. Coverage verification establishes that source text was segmented; it does not certify the source's academic accuracy.

## Current editorial pass

The review ledger is `data/content-review.json`, based on v0.2.14. It includes all 27 originally flagged entries and all 108 originally unresolved fragments, explicit before/after patches, reasons, and a hash of preserved transcripts/occurrences/raw references.

| Result | Count |
| --- | ---: |
| Original flagged entries reviewed | 27 |
| Source issues still active | 15 |
| Original unresolved fragments reviewed | 108 |
| Current resolved explicit references | 1,153 |
| Current unresolved whole references | 35 |
| Entries in the bounded tag/sense sample | 26 |
| Explicit tag corrections | 6 |
| Reported image cases given context filters | 3 |

The reduction from 108 to 35 includes removing explanatory prose and restoring complete phrases, as well as resolving references. It does not mean 73 new links were added. For example, Cemetery now points to Burial Ground; Design and Build resolves to Design & Build. Missing phrases remain whole instead of pointing to an unrelated first word. The post-tensioning reference to a post-modern style was quarantined from navigation while its source wording was retained.

Malformed language labels were normalized for Composite Panel, Dokter Jiwa, and Sel Surya, keeping their original raw labels. A stray leading character was removed from Construction Plan. Cor uses the site's verb code because the source explicitly says kata kerja. Original extraction flags are retained in `source_review_flags`; unresolved flags stay active.

Japanese uses the consistent reading/editing label Jp. Shoji's former Jpg. label is retained in source_language_raw and the untouched source transcript. The parser still accepts legacy Jpg. input and converts its label to Jp.

Fifteen remaining source issues include missing word types, empty definitions, an unnamed source entry, and the uncertain raveling Form spelling. No replacement headword or definition was invented. `data/review-queue.csv` lists pending issues and the 35 missing whole references for review in Excel or the content editor.

`node tools/apply-content-review.cjs` applies only the ledger's explicit patches, checks for intervening field edits, verifies source hashes, and regenerates data plus the queue. It is idempotent for the reviewed dataset. Future editorial changes should update the ledger deliberately; do not overwrite later edits to force an old patch through.

## Generated groups and links

`assets/js/associations-builder.js` proposes relationships using bilingual families and weighted headword/translation/definition overlap. Broad parents are inspired by Uniclass tables supplied by the user. These are navigation aids, not certified Uniclass codes or a completed Indonesian localization.

The 26-entry review sample targets polysemy and reported problems. Bank meaning riverbank is separated from finance, Light meaning low weight from illumination, and Arc's welding sense from fire safety. Reviewed `editorial_tags` override keyword grouping; their reasons remain attached. Theme anchors must belong to the same sense-based theme. Most generated tags/links remain suggestions requiring future editorial review.

Explicit KBBI III subject/usage labels are additional tags under Umum. Suggested neighbors are not evidence for copying those labels to another entry.

The editor can override the automatic theme set through `editorial_tags`, with a reason and date. An explicit Umum choice is retained. KBBI labels stay source-derived. Browser drafts and review status are independent of the frozen extraction ledger.

## Reading data versus master data

The master JSON and full `dictionary.js` keep source evidence and supplements for the editor. `data/reader.js` is generated for reading/search/graph use; it omits audit-only fields and uses shared tables/indexed edges. `assets/js/reader-data.js` defines that projection. Tests compare all displayed meanings/types, search rankings, and graph links against the master.

`editorial_meaning` stores a replacement reading meaning without overwriting `definition` or `source_text`. A blank replacement permits valid KBBI III fallback. `editorial_status` records `reviewed` or `needs_review`; local-draft status comes from the browser's saved patches. `source_language_raw` retains an original language label when a later editor changes it. Existing KBBI excerpts and source occurrences are preserved through editing/export.

`tools/data-files.cjs` uses the same export generator as the browser editor. Manual edits, KBBI imports, reviewed corrections, and association rebuilds refresh the reader too. The CSV contains current editable reading fields and resolved references; it is not a replacement for the complete master or an import format.

## External material

KBBI III excerpts have separate book and digital provenance described in KBBI_III.md. KBBI VI links open official current lookups; existence and meaning are not automatically verified.

Wikipedia/Wiktionary links are direct article matches or curated overrides. The seed cache contains 19 previously checked entry records. Automatic matches and images are supplemental, not source definitions. The Acuan, Begel, and Beban image review adds context requirements while keeping the displayed term as the query. Provider results remain live and are not an approved gallery. Curated images retain creator/license/source metadata.

Code licensing does not grant an open-data license over the blog or KBBI. See LICENSE_SCOPE.md.
