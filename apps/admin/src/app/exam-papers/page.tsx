import { AdminShell } from "@/components/AdminShell";
import { PageIntro } from "@/components/AdminUi";
import { ExamPapersManager } from "@/components/ExamPapersManager";
import { getAdminPageContext } from "@/lib/adminPage";
import type { ContentTreeSubjectDto, ExamPaperAdminDto, SchoolAdminDto } from "@/lib/content";

export const revalidate = 0;

export default async function ExamPapersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, examPath, role, email, token } = await getAdminPageContext(searchParams, { area: "platform" });

  const [{ data: subjectData }, { data: paperData }, { data: schoolData }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, description, code, exam_path, order_index, topics(id, name, description, code, form_level, exam_path, order_index)")
      .eq("exam_path", examPath)
      .order("order_index"),
    supabase
      .from("exam_papers")
      .select("id, exam_path, subject_id, school_id, source_type, paper_type, exam_mode, title, year, paper_number, term, session, paper_code, duration_min, total_marks, instructions, has_sections, marking_mode, solution_unlock_mode, question_mode, status, is_sample, created_at, updated_at, subjects(name, code), schools(name), paper_questions(id), paper_sections(id)")
      .eq("exam_path", examPath)
      .order("year", { ascending: false })
      .order("paper_number", { ascending: true }),
    supabase.from("schools").select("id, name, created_at").order("name"),
  ]);

  const subjects = ((subjectData as ContentTreeSubjectDto[] | null) ?? []).map((subject) => ({
    ...subject,
    topics: (subject.topics ?? []).sort((left, right) => left.order_index - right.order_index),
  }));
  const papers = ((paperData as ExamPaperAdminDto[] | null) ?? []).map((paper) => ({
    ...paper,
    question_count: paper.paper_questions?.length ?? 0,
    section_count: paper.paper_sections?.length ?? 0,
  }));
  const schools = (schoolData as SchoolAdminDto[] | null) ?? [];

  return (
    <AdminShell activePath="/exam-papers" examPath={examPath} email={email} role={role}>
      <PageIntro
        eyebrow={`${examPath} Exam Papers`}
        title="Exam paper management"
        description="Create and maintain paper metadata inside the correct subject and exam-level context. School papers, sample papers, and past papers all live here."
      />
      <ExamPapersManager token={token} role={role} examPath={examPath} subjects={subjects} schools={schools} papers={papers} />
    </AdminShell>
  );
}
