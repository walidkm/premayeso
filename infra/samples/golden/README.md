# Golden Workbook Samples

This directory is reserved for release-candidate workbook fixtures that are backed by real source papers.

## Current Status

The requested official JCE Biology golden workbook is intentionally not fabricated here because the exact source paper has not been provided yet.

When the source paper is available, add:

1. `infra/samples/golden/<paper-code>.xlsx`
2. `infra/samples/golden/<paper-code>.manifest.json`

The manifest should record:

- `paperCode`
- `title`
- `examPath`
- `subject`
- `sourceDescription`
- `sourceDate`
- `expectedPreview`
  - `questionCount`
  - `sectionCount`
  - `partCount`
  - `essayCount`
  - `structuredCount`
- `notes`
