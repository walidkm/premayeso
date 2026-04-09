# Golden Workbook Samples

This directory is reserved for release-candidate workbook fixtures that are backed by real source papers.

## Current Status

The official MANEB JCE Biology sample is now accepted as the real-content golden source under a split-proof policy.

The current source paper is:

- `MANEB 2021 Junior Certificate Examination / Biology Sample Paper / J022`

Artifacts:

- `infra/samples/golden/maneb-2021-jce-biology-sample-j022.xlsx`
- `infra/samples/golden/maneb-2021-jce-biology-sample-j022.manifest.json`
- `infra/samples/golden/maneb-2021-jce-biology-sample.audit.json`
- `infra/samples/golden/maneb-2021-jce-biology-sample-assets/`

This paper is used for:

- official-content import preview
- official-content publish validation
- real MCQ, structured, essay, and figure-bearing attempt flow
- rubric marking against authored validation metadata

This paper is not used for:

- `answer_any_n` proof, because the official source requires `answer_all` in Sections A, B, and C

That split is intentional and recorded in both the manifest and the audit file. The repo still uses synthetic DB-backed fixtures for `answer_any_n` enforcement, timeout selection, and over-answer handling.

The manifest should record:

- `paperCode`
- `title`
- `examPath`
- `subject`
- `sourceDescription`
- `sourceReference`
- `pageAssets`
- `pageToSectionMap`
- `questionInventory`
- `figureDependencies`
- `expectedPreview`
- `featureAudit`
- `notes`

Use the manual transcription checklist in `infra/samples/golden/manual-transcription-workflow.md` before authoring or revising any accepted workbook from an image-only official source.
