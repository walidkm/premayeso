# Manual Transcription Workflow

Use this workflow when the official source paper is an image-only PDF and the golden workbook cannot be produced from machine-readable text.

## Source Audit

1. Confirm the paper metadata from the cover page:
   - exam body
   - year
   - exam level
   - subject
   - paper title/code
   - total marks
   - time allowed
2. Confirm section instructions from the source, including whether any section is `answer_any_n`.
3. Decide whether the source qualifies for:
   - full golden-workbook proof, or
   - split proof, where official content is used for the shapes it genuinely contains and missing shapes stay covered by synthetic fixtures
4. Do not invent missing structures inside the official workbook. If a shape is absent from the source, record that explicitly in the audit and prove it separately.

## Page Inventory

1. Record the page range for each section.
2. Record the question-number range for each section.
3. Record every page that contains a required figure or diagram.

## Question Audit

For each question, record:

- question number
- section code
- question type
- marks
- whether it has subparts
- whether it depends on a figure
- whether it needs a rubric

## Figure Handling

1. Preserve each figure-bearing page or extracted figure asset used by a question.
2. Add a manifest note for every question that cannot be rendered correctly without a figure.
3. Do not replace missing figures with placeholder-only golden content.

## Workbook Authoring Gate

Author `infra/samples/golden/<paper-code>.xlsx` when all of the following are true:

- the source is official
- the page audit is complete
- the workbook content stays faithful to the source
- figure dependencies are accounted for
- the expected preview counts have been computed and recorded

If the source is using split proof, the audit must also state:

- which proof obligations are satisfied by the official workbook
- which proof obligations remain synthetic-only
- that no missing shape was invented or mixed in from another source
