-- ============================================================
-- Migration 013: Transactional paper workbook publish RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_publish_paper_workbook(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paper              JSONB := COALESCE(p_payload -> 'paper', '{}'::jsonb);
  v_sections           JSONB := COALESCE(p_payload -> 'sections', '[]'::jsonb);
  v_questions          JSONB := COALESCE(p_payload -> 'questions', '[]'::jsonb);
  v_rubrics            JSONB := COALESCE(p_payload -> 'rubrics', '[]'::jsonb);
  v_existing_paper_id  UUID;
  v_paper_id           UUID;
  v_attempt_count      BIGINT;
  v_import_tag         TEXT;
  v_question_count     INTEGER := 0;
  v_question_total     INTEGER := 0;
  v_rubric             JSONB;
  v_criterion          JSONB;
  v_section            JSONB;
  v_question           JSONB;
  v_part               JSONB;
  v_rubric_id          UUID;
  v_section_id         UUID;
  v_question_id        UUID;
BEGIN
  IF COALESCE(v_paper ->> 'paperCode', '') = '' THEN
    RAISE EXCEPTION 'paperCode is required';
  END IF;

  v_import_tag := format('paper_import:%s', v_paper ->> 'paperCode');
  v_question_total := COALESCE(jsonb_array_length(v_questions), 0);

  SELECT id INTO v_existing_paper_id
  FROM public.exam_papers
  WHERE paper_code = v_paper ->> 'paperCode'
  LIMIT 1;

  IF v_existing_paper_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_attempt_count
    FROM public.paper_attempts
    WHERE exam_paper_id = v_existing_paper_id;

    IF v_attempt_count > 0 THEN
      RAISE EXCEPTION 'Cannot re-import paper % because attempts already exist', v_paper ->> 'paperCode';
    END IF;

    UPDATE public.exam_papers
    SET
      exam_path = NULLIF(v_paper ->> 'examPath', '')::exam_path_enum,
      subject_id = NULLIF(v_paper ->> 'subjectId', '')::uuid,
      title = NULLIF(v_paper ->> 'title', ''),
      year = NULLIF(v_paper ->> 'year', '')::integer,
      session = NULLIF(v_paper ->> 'session', ''),
      paper_number = NULLIF(v_paper ->> 'paperNumber', '')::integer,
      source_type = COALESCE(NULLIF(v_paper ->> 'sourceType', ''), 'maneb'),
      paper_type = CASE COALESCE(NULLIF(v_paper ->> 'sourceType', ''), 'maneb')
        WHEN 'school' THEN 'school_exam'
        WHEN 'teacher' THEN 'question_pool'
        ELSE 'maneb_past_paper'
      END,
      exam_mode = 'paper_layout',
      duration_min = NULLIF(v_paper ->> 'durationMin', '')::integer,
      instructions = NULLIF(v_paper ->> 'instructions', ''),
      total_marks = NULLIF(v_paper ->> 'totalMarks', '')::integer,
      has_sections = COALESCE(jsonb_array_length(v_sections), 0) > 0,
      marking_mode = COALESCE(NULLIF(v_paper ->> 'markingMode', ''), 'manual'),
      solution_unlock_mode = COALESCE(NULLIF(v_paper ->> 'solutionUnlockMode', ''), 'after_marked'),
      question_mode = COALESCE(NULLIF(v_paper ->> 'questionMode', ''), 'one_question_at_a_time'),
      is_sample = COALESCE(NULLIF(v_paper ->> 'isSample', '')::boolean, FALSE),
      status = COALESCE(NULLIF(v_paper ->> 'status', ''), 'draft'),
      updated_at = now()
    WHERE id = v_existing_paper_id
    RETURNING id INTO v_paper_id;
  ELSE
    INSERT INTO public.exam_papers (
      exam_path,
      subject_id,
      title,
      year,
      session,
      paper_number,
      paper_code,
      source_type,
      paper_type,
      exam_mode,
      duration_min,
      instructions,
      total_marks,
      has_sections,
      marking_mode,
      solution_unlock_mode,
      question_mode,
      is_sample,
      status,
      updated_at
    )
    VALUES (
      NULLIF(v_paper ->> 'examPath', '')::exam_path_enum,
      NULLIF(v_paper ->> 'subjectId', '')::uuid,
      NULLIF(v_paper ->> 'title', ''),
      NULLIF(v_paper ->> 'year', '')::integer,
      NULLIF(v_paper ->> 'session', ''),
      NULLIF(v_paper ->> 'paperNumber', '')::integer,
      NULLIF(v_paper ->> 'paperCode', ''),
      COALESCE(NULLIF(v_paper ->> 'sourceType', ''), 'maneb'),
      CASE COALESCE(NULLIF(v_paper ->> 'sourceType', ''), 'maneb')
        WHEN 'school' THEN 'school_exam'
        WHEN 'teacher' THEN 'question_pool'
        ELSE 'maneb_past_paper'
      END,
      'paper_layout',
      NULLIF(v_paper ->> 'durationMin', '')::integer,
      NULLIF(v_paper ->> 'instructions', ''),
      NULLIF(v_paper ->> 'totalMarks', '')::integer,
      COALESCE(jsonb_array_length(v_sections), 0) > 0,
      COALESCE(NULLIF(v_paper ->> 'markingMode', ''), 'manual'),
      COALESCE(NULLIF(v_paper ->> 'solutionUnlockMode', ''), 'after_marked'),
      COALESCE(NULLIF(v_paper ->> 'questionMode', ''), 'one_question_at_a_time'),
      COALESCE(NULLIF(v_paper ->> 'isSample', '')::boolean, FALSE),
      COALESCE(NULLIF(v_paper ->> 'status', ''), 'draft'),
      now()
    )
    RETURNING id INTO v_paper_id;
  END IF;

  FOR v_rubric IN SELECT value FROM jsonb_array_elements(v_rubrics)
  LOOP
    SELECT id INTO v_rubric_id
    FROM public.essay_rubrics
    WHERE rubric_code = NULLIF(v_rubric ->> 'rubricCode', '')
    LIMIT 1;

    IF v_rubric_id IS NULL THEN
      INSERT INTO public.essay_rubrics (
        rubric_code,
        exam_path,
        subject_id,
        title,
        total_marks,
        updated_at
      )
      VALUES (
        NULLIF(v_rubric ->> 'rubricCode', ''),
        NULLIF(v_paper ->> 'examPath', '')::exam_path_enum,
        NULLIF(v_paper ->> 'subjectId', '')::uuid,
        COALESCE(NULLIF(v_rubric ->> 'title', ''), 'Untitled rubric'),
        COALESCE(NULLIF(v_rubric ->> 'totalMarks', '')::integer, 0),
        now()
      )
      RETURNING id INTO v_rubric_id;
    ELSE
      UPDATE public.essay_rubrics
      SET
        exam_path = NULLIF(v_paper ->> 'examPath', '')::exam_path_enum,
        subject_id = NULLIF(v_paper ->> 'subjectId', '')::uuid,
        title = COALESCE(NULLIF(v_rubric ->> 'title', ''), title),
        total_marks = COALESCE(NULLIF(v_rubric ->> 'totalMarks', '')::integer, total_marks),
        updated_at = now()
      WHERE id = v_rubric_id;
    END IF;

    DELETE FROM public.essay_rubric_criteria
    WHERE rubric_id = v_rubric_id;

    FOR v_criterion IN SELECT value FROM jsonb_array_elements(COALESCE(v_rubric -> 'criteria', '[]'::jsonb))
    LOOP
      INSERT INTO public.essay_rubric_criteria (
        rubric_id,
        criterion_name,
        max_marks,
        mark_bands,
        order_index,
        updated_at
      )
      VALUES (
        v_rubric_id,
        COALESCE(NULLIF(v_criterion ->> 'criterionName', ''), 'Criterion'),
        COALESCE(NULLIF(v_criterion ->> 'maxMarks', '')::numeric, 0),
        COALESCE(v_criterion -> 'markBands', '[]'::jsonb),
        COALESCE(NULLIF(v_criterion ->> 'orderIndex', '')::integer, 0),
        now()
      );
    END LOOP;
  END LOOP;

  DELETE FROM public.paper_questions
  WHERE exam_paper_id = v_paper_id;

  DELETE FROM public.paper_sections
  WHERE exam_paper_id = v_paper_id;

  DELETE FROM public.question_parts
  WHERE question_id IN (
    SELECT id
    FROM public.questions
    WHERE pool_tag = v_import_tag
  );

  DELETE FROM public.questions
  WHERE pool_tag = v_import_tag;

  FOR v_section IN SELECT value FROM jsonb_array_elements(v_sections)
  LOOP
    INSERT INTO public.paper_sections (
      exam_paper_id,
      section_code,
      title,
      instructions,
      order_index,
      question_selection_mode,
      required_count,
      max_marks,
      starts_at_question_number,
      ends_at_question_number,
      updated_at
    )
    VALUES (
      v_paper_id,
      v_section ->> 'sectionCode',
      NULLIF(v_section ->> 'title', ''),
      NULLIF(v_section ->> 'instructions', ''),
      COALESCE(NULLIF(v_section ->> 'orderIndex', '')::integer, 0),
      COALESCE(NULLIF(v_section ->> 'questionSelectionMode', ''), 'answer_all'),
      NULLIF(v_section ->> 'requiredCount', '')::integer,
      NULLIF(v_section ->> 'maxMarks', '')::integer,
      NULLIF(v_section ->> 'startsAtQuestionNumber', '')::integer,
      NULLIF(v_section ->> 'endsAtQuestionNumber', '')::integer,
      now()
    );
  END LOOP;

  FOR v_question IN SELECT value FROM jsonb_array_elements(v_questions)
  LOOP
    SELECT id INTO v_rubric_id
    FROM public.essay_rubrics
    WHERE rubric_code = NULLIF(v_question ->> 'rubricCode', '')
    LIMIT 1;

    INSERT INTO public.questions (
      topic_id,
      subtopic_id,
      stem,
      options,
      correct_option,
      explanation,
      type,
      difficulty,
      marks,
      allow_shuffle,
      tier_gate,
      is_approved,
      language,
      pool_tag,
      question_no,
      exam_path,
      expected_answer,
      rubric_id,
      auto_marking_mode
    )
    VALUES (
      NULLIF(v_question ->> 'topicId', '')::uuid,
      NULLIF(v_question ->> 'subtopicId', '')::uuid,
      COALESCE(NULLIF(v_question ->> 'body', ''), 'Untitled question'),
      COALESCE(v_question -> 'options', '[]'::jsonb),
      NULLIF(v_question ->> 'correctOption', ''),
      NULLIF(v_question ->> 'explanation', ''),
      COALESCE(NULLIF(v_question ->> 'type', ''), 'short_answer'),
      COALESCE(NULLIF(v_question ->> 'difficulty', ''), 'medium'),
      COALESCE(NULLIF(v_question ->> 'marks', '')::integer, 1),
      COALESCE(NULLIF(v_question ->> 'allowShuffle', '')::boolean, FALSE),
      'free',
      TRUE,
      'English',
      v_import_tag,
      format('%s-Q%s', v_paper ->> 'paperCode', lpad(COALESCE(v_question ->> 'questionNumber', '0'), 2, '0')),
      NULLIF(v_paper ->> 'examPath', '')::exam_path_enum,
      NULLIF(v_question ->> 'expectedAnswer', ''),
      v_rubric_id,
      COALESCE(NULLIF(v_question ->> 'autoMarkingMode', ''), 'manual')
    )
    RETURNING id INTO v_question_id;

    SELECT id INTO v_section_id
    FROM public.paper_sections
    WHERE exam_paper_id = v_paper_id
      AND section_code = NULLIF(v_question ->> 'sectionCode', '')
    LIMIT 1;

    INSERT INTO public.paper_questions (
      exam_paper_id,
      question_id,
      order_index,
      section,
      section_id,
      question_number
    )
    VALUES (
      v_paper_id,
      v_question_id,
      COALESCE(NULLIF(v_question ->> 'questionNumber', '')::integer, 1) - 1,
      NULLIF(v_question ->> 'sectionCode', ''),
      v_section_id,
      NULLIF(v_question ->> 'questionNumber', '')::integer
    );

    FOR v_part IN SELECT value FROM jsonb_array_elements(COALESCE(v_question -> 'parts', '[]'::jsonb))
    LOOP
      SELECT id INTO v_rubric_id
      FROM public.essay_rubrics
      WHERE rubric_code = NULLIF(v_part ->> 'rubricCode', '')
      LIMIT 1;

      INSERT INTO public.question_parts (
        question_id,
        part_label,
        body,
        marks,
        expected_answer,
        order_index,
        rubric_id,
        auto_marking_mode,
        options,
        correct_option,
        updated_at
      )
      VALUES (
        v_question_id,
        COALESCE(NULLIF(v_part ->> 'partLabel', ''), 'a'),
        COALESCE(NULLIF(v_part ->> 'body', ''), 'Untitled part'),
        COALESCE(NULLIF(v_part ->> 'marks', '')::integer, 1),
        NULLIF(v_part ->> 'expectedAnswer', ''),
        COALESCE(NULLIF(v_part ->> 'orderIndex', '')::integer, 0),
        v_rubric_id,
        COALESCE(NULLIF(v_part ->> 'autoMarkingMode', ''), 'manual'),
        COALESCE(v_part -> 'options', '[]'::jsonb),
        NULLIF(v_part ->> 'correctOption', ''),
        now()
      );
    END LOOP;

    v_question_count := v_question_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'exam_paper_id', v_paper_id,
    'question_count', v_question_count,
    'expected_question_count', v_question_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_publish_paper_workbook(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_publish_paper_workbook(JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.admin_publish_paper_workbook(JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_publish_paper_workbook(JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
