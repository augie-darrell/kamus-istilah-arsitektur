# Contributing

Preserve stable entry IDs, `source_text`, raw references, source occurrences, attribution, and distinct senses. Explain corrections in an editor revision note or review ledger. Retain the original wording separately when normalizing a typo or language label. Do not resolve a missing term through a vaguely similar word just to remove a warning.

New sources need author/publisher, edition/date, URL or local provenance, and appropriate publication permission. KBBI III is already bundled as a separately attributed supplement. Uniclass is a reference for broad navigation groups, not an official mapping in this project. Read DATA_NOTES.md and LICENSE_SCOPE.md before changing source material.

Use the browser editor for supported fields. For a reviewed tag correction, record its source-based reason in `editorial_tags`. Curated images need alt/title, creator, license, and source-page URL; check the intended sense. Live wiki/image matches remain suggestions.

After manual master-data changes, run `node tools/update-data.cjs`. After a code change, run `node tools/check-all.cjs`. Inspect desktop and phone layouts after styling changes, including home/entry spacing, independent scrolling, panel toggles, resizing, graph navigation, and editor export. Keep shared controls in assets/css/base.css, design variables in assets/css/theme.css, and responsive changes together instead of appending overriding rules. Browser modules live in assets/js/; retain shared components rather than adding separate reader/editor implementations.

Generated files should be committed alongside their source changes. Preserve a focused Git history; earlier layout descriptions belong in history, not repeated notes in current guides. Nothing is published by a local commit or editor export.
