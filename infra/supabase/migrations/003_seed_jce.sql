-- ============================================================
-- PreMayeso seed — JCE subjects + topics
-- All 15 JCE subjects with codes from feature_canvas_v5.2
-- Safe to re-run: uses ON CONFLICT DO NOTHING / DO UPDATE
-- ============================================================

-- ── Subjects ─────────────────────────────────────────────────
insert into public.subjects (id, name, code, exam_path, order_index, description) values
  ('11000000-0000-0000-0000-000000000001', 'Mathematics',           'MATH-JCE', 'JCE',  1,  'Numbers, algebra, geometry, statistics and trigonometry'),
  ('11000000-0000-0000-0000-000000000002', 'Additional Mathematics','ADDM-JCE', 'JCE',  2,  'Extended mathematics for Form 1 and Form 2'),
  ('11000000-0000-0000-0000-000000000003', 'English Grammar',       'ENGR-JCE', 'JCE',  3,  'Grammar, comprehension, composition and communication'),
  ('11000000-0000-0000-0000-000000000004', 'English Literature',    'ENGL-JCE', 'JCE',  4,  'Poetry, prose, drama and literary analysis'),
  ('11000000-0000-0000-0000-000000000005', 'Biology',               'BIOL-JCE', 'JCE',  5,  'Cell biology, nutrition, transport, respiration and ecology'),
  ('11000000-0000-0000-0000-000000000006', 'Chichewa',              'CHIC-JCE', 'JCE',  6,  'Chichewa language, grammar and literature'),
  ('11000000-0000-0000-0000-000000000007', 'History',               'HIST-JCE', 'JCE',  7,  'Malawi, African and world history'),
  ('11000000-0000-0000-0000-000000000008', 'Chemistry',             'CHEM-JCE', 'JCE',  8,  'Atoms, reactions, acids, bases and organic chemistry'),
  ('11000000-0000-0000-0000-000000000009', 'Physics',               'PHYS-JCE', 'JCE',  9,  'Mechanics, heat, light, sound and electricity'),
  ('11000000-0000-0000-0000-000000000010', 'Social Studies',        'SOCS-JCE', 'JCE', 10, 'Society, citizenship, environment and development'),
  ('11000000-0000-0000-0000-000000000011', 'Life Skills',           'LIFE-JCE', 'JCE', 11, 'Health, personal development and social skills'),
  ('11000000-0000-0000-0000-000000000012', 'Agriculture',           'AGRI-JCE', 'JCE', 12, 'Crop production, animal husbandry and soil science'),
  ('11000000-0000-0000-0000-000000000013', 'Computer Studies',      'COMP-JCE', 'JCE', 13, 'ICT fundamentals, hardware, software and the internet'),
  ('11000000-0000-0000-0000-000000000014', 'Geography',             'GEOG-JCE', 'JCE', 14, 'Physical and human geography, maps and the environment'),
  ('11000000-0000-0000-0000-000000000015', 'Business Studies',      'BUSI-JCE', 'JCE', 15, 'Commerce, finance, trade and entrepreneurship')
on conflict (code) do update set
  name        = excluded.name,
  exam_path   = excluded.exam_path,
  order_index = excluded.order_index,
  description = excluded.description;

-- ── Topics — Mathematics ─────────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22010000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Numbers, sets & number systems',  'JCE', 'F1', 1),
  ('22010000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'Introduction to algebra',         'JCE', 'F1', 2),
  ('22010000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001', 'Angles, lines & polygons',        'JCE', 'F1', 3),
  ('22010000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000001', 'Data collection & representation','JCE', 'F1', 4),
  ('22010000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000001', 'Measurements & units',            'JCE', 'F1', 5),
  ('22010000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000001', 'Equations & inequalities',        'JCE', 'F2', 6),
  ('22010000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000001', 'Circles & constructions',         'JCE', 'F2', 7),
  ('22010000-0000-0000-0000-000000000008', '11000000-0000-0000-0000-000000000001', 'Introduction to trigonometry',    'JCE', 'F2', 8),
  ('22010000-0000-0000-0000-000000000009', '11000000-0000-0000-0000-000000000001', 'Graphs & functions',              'JCE', 'F2', 9),
  ('22010000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000001', 'Probability & statistics',        'JCE', 'F2', 10)
on conflict (id) do nothing;

-- ── Topics — Biology ─────────────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22050000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000005', 'Cell structure & function',         'JCE', 'F1', 1),
  ('22050000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000005', 'Classification of living things',   'JCE', 'F1', 2),
  ('22050000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000005', 'Nutrition in plants & animals',     'JCE', 'F1', 3),
  ('22050000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000005', 'Transport in living organisms',     'JCE', 'F2', 4),
  ('22050000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', 'Respiration & gas exchange',        'JCE', 'F2', 5),
  ('22050000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000005', 'Reproduction in living organisms',  'JCE', 'F2', 6),
  ('22050000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000005', 'Ecology & the environment',         'JCE', 'F2', 7)
on conflict (id) do nothing;

-- ── Topics — Chemistry ───────────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22080000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000008', 'Introduction to chemistry & safety', 'JCE', 'F1', 1),
  ('22080000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000008', 'Atoms, elements & compounds',        'JCE', 'F1', 2),
  ('22080000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000008', 'States of matter',                   'JCE', 'F1', 3),
  ('22080000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000008', 'Chemical reactions',                 'JCE', 'F2', 4),
  ('22080000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000008', 'Acids, bases & salts',               'JCE', 'F2', 5),
  ('22080000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000008', 'Metals & non-metals',                'JCE', 'F2', 6)
on conflict (id) do nothing;

-- ── Topics — Physics ─────────────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22090000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000009', 'Measurement & physical quantities', 'JCE', 'F1', 1),
  ('22090000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000009', 'Forces & motion',                   'JCE', 'F1', 2),
  ('22090000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000009', 'Heat & temperature',                'JCE', 'F1', 3),
  ('22090000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000009', 'Light & optics',                    'JCE', 'F2', 4),
  ('22090000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000009', 'Sound & waves',                     'JCE', 'F2', 5),
  ('22090000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000009', 'Electricity & magnetism',           'JCE', 'F2', 6)
on conflict (id) do nothing;

-- ── Topics — English Grammar ─────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22030000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'Parts of speech',          'JCE', 'F1', 1),
  ('22030000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000003', 'Sentence structure',       'JCE', 'F1', 2),
  ('22030000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', 'Reading comprehension',    'JCE', 'F1', 3),
  ('22030000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000003', 'Writing & composition',    'JCE', 'F2', 4),
  ('22030000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000003', 'Tenses & voice',           'JCE', 'F2', 5),
  ('22030000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000003', 'Vocabulary & idioms',      'JCE', 'F2', 6)
on conflict (id) do nothing;

-- ── Topics — English Literature ──────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22040000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000004', 'Poetry analysis',        'JCE', 'F1', 1),
  ('22040000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000004', 'Prose & short stories',  'JCE', 'F1', 2),
  ('22040000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000004', 'Drama & plays',          'JCE', 'F2', 3),
  ('22040000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', 'Novel study',            'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Chichewa ────────────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22060000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000006', 'Ndakatulo (Poetry)',          'JCE', 'F1', 1),
  ('22060000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000006', 'Nkhani (Short stories)',      'JCE', 'F1', 2),
  ('22060000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000006', 'Masamu a Chichewa (Grammar)', 'JCE', 'F2', 3),
  ('22060000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000006', 'Kulemba (Composition)',       'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — History ─────────────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22070000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000007', 'Pre-colonial Malawi',          'JCE', 'F1', 1),
  ('22070000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000007', 'Colonial period in Malawi',    'JCE', 'F1', 2),
  ('22070000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000007', 'Independence movements',       'JCE', 'F2', 3),
  ('22070000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000007', 'Post-independence Africa',     'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Social Studies ──────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22100000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000010', 'Malawi government & citizenship', 'JCE', 'F1', 1),
  ('22100000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000010', 'Human rights & responsibilities', 'JCE', 'F1', 2),
  ('22100000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000010', 'Environment & sustainability',    'JCE', 'F2', 3),
  ('22100000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000010', 'Development in Malawi',           'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Life Skills ─────────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22110000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000011', 'Personal development',        'JCE', 'F1', 1),
  ('22110000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000011', 'Health & reproductive health', 'JCE', 'F1', 2),
  ('22110000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000011', 'Decision-making & peer pressure','JCE','F2', 3),
  ('22110000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000011', 'HIV/AIDS & chronic diseases',  'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Agriculture ─────────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22120000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000012', 'Soil science & conservation',  'JCE', 'F1', 1),
  ('22120000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000012', 'Crop production & agronomy',    'JCE', 'F1', 2),
  ('22120000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000012', 'Animal husbandry',              'JCE', 'F2', 3),
  ('22120000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000012', 'Farm management & marketing',   'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Computer Studies ────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22130000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000013', 'Computer hardware & software',   'JCE', 'F1', 1),
  ('22130000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000013', 'Operating systems & file mgmt',  'JCE', 'F1', 2),
  ('22130000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000013', 'Word processing & spreadsheets', 'JCE', 'F2', 3),
  ('22130000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000013', 'Internet, email & digital safety','JCE','F2', 4)
on conflict (id) do nothing;

-- ── Topics — Geography ───────────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22140000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000014', 'Maps, scale & direction',        'JCE', 'F1', 1),
  ('22140000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000014', 'Weather, climate & water cycle', 'JCE', 'F1', 2),
  ('22140000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000014', 'Landforms & physical geography', 'JCE', 'F2', 3),
  ('22140000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000014', 'Population & human geography',   'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Business Studies ────────────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22150000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000015', 'Trade & commerce',              'JCE', 'F1', 1),
  ('22150000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000015', 'Money, banking & finance',      'JCE', 'F1', 2),
  ('22150000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000015', 'Entrepreneurship & marketing',  'JCE', 'F2', 3),
  ('22150000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000015', 'Insurance & transport in trade', 'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Additional Mathematics ─────────────────────────
insert into public.topics (id, subject_id, name, exam_path, form_level, order_index) values
  ('22020000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', 'Indices & logarithms',         'JCE', 'F1', 1),
  ('22020000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', 'Quadratic equations',          'JCE', 'F1', 2),
  ('22020000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000002', 'Vectors & matrices',           'JCE', 'F2', 3),
  ('22020000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000002', 'Calculus — differentiation',   'JCE', 'F2', 4)
on conflict (id) do nothing;
