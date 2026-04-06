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
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22010000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Numbers, sets & number systems', 'MATH-JCE-NUMBERS-SETS-AND-NUMBER-SYSTEMS',  'JCE', 'F1', 1),
  ('22010000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'Introduction to algebra', 'MATH-JCE-INTRODUCTION-TO-ALGEBRA',         'JCE', 'F1', 2),
  ('22010000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001', 'Angles, lines & polygons', 'MATH-JCE-ANGLES-LINES-AND-POLYGONS',        'JCE', 'F1', 3),
  ('22010000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000001', 'Data collection & representation', 'MATH-JCE-DATA-COLLECTION-AND-REPRESENTATION','JCE', 'F1', 4),
  ('22010000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000001', 'Measurements & units', 'MATH-JCE-MEASUREMENTS-AND-UNITS',            'JCE', 'F1', 5),
  ('22010000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000001', 'Equations & inequalities', 'MATH-JCE-EQUATIONS-AND-INEQUALITIES',        'JCE', 'F2', 6),
  ('22010000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000001', 'Circles & constructions', 'MATH-JCE-CIRCLES-AND-CONSTRUCTIONS',         'JCE', 'F2', 7),
  ('22010000-0000-0000-0000-000000000008', '11000000-0000-0000-0000-000000000001', 'Introduction to trigonometry', 'MATH-JCE-INTRODUCTION-TO-TRIGONOMETRY',    'JCE', 'F2', 8),
  ('22010000-0000-0000-0000-000000000009', '11000000-0000-0000-0000-000000000001', 'Graphs & functions', 'MATH-JCE-GRAPHS-AND-FUNCTIONS',              'JCE', 'F2', 9),
  ('22010000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000001', 'Probability & statistics', 'MATH-JCE-PROBABILITY-AND-STATISTICS',        'JCE', 'F2', 10)
on conflict (id) do nothing;

-- ── Topics — Biology ─────────────────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22050000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000005', 'Cell structure & function', 'BIOL-JCE-CELL-STRUCTURE-AND-FUNCTION',         'JCE', 'F1', 1),
  ('22050000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000005', 'Classification of living things', 'BIOL-JCE-CLASSIFICATION-OF-LIVING-THINGS',   'JCE', 'F1', 2),
  ('22050000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000005', 'Nutrition in plants & animals', 'BIOL-JCE-NUTRITION-IN-PLANTS-AND-ANIMALS',     'JCE', 'F1', 3),
  ('22050000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000005', 'Transport in living organisms', 'BIOL-JCE-TRANSPORT-IN-LIVING-ORGANISMS',     'JCE', 'F2', 4),
  ('22050000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', 'Respiration & gas exchange', 'BIOL-JCE-RESPIRATION-AND-GAS-EXCHANGE',        'JCE', 'F2', 5),
  ('22050000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000005', 'Reproduction in living organisms', 'BIOL-JCE-REPRODUCTION-IN-LIVING-ORGANISMS',  'JCE', 'F2', 6),
  ('22050000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000005', 'Ecology & the environment', 'BIOL-JCE-ECOLOGY-AND-THE-ENVIRONMENT',         'JCE', 'F2', 7)
on conflict (id) do nothing;

-- ── Topics — Chemistry ───────────────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22080000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000008', 'Introduction to chemistry & safety', 'CHEM-JCE-INTRODUCTION-TO-CHEMISTRY-AND-SAFETY', 'JCE', 'F1', 1),
  ('22080000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000008', 'Atoms, elements & compounds', 'CHEM-JCE-ATOMS-ELEMENTS-AND-COMPOUNDS',        'JCE', 'F1', 2),
  ('22080000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000008', 'States of matter', 'CHEM-JCE-STATES-OF-MATTER',                   'JCE', 'F1', 3),
  ('22080000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000008', 'Chemical reactions', 'CHEM-JCE-CHEMICAL-REACTIONS',                 'JCE', 'F2', 4),
  ('22080000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000008', 'Acids, bases & salts', 'CHEM-JCE-ACIDS-BASES-AND-SALTS',               'JCE', 'F2', 5),
  ('22080000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000008', 'Metals & non-metals', 'CHEM-JCE-METALS-AND-NON-METALS',                'JCE', 'F2', 6)
on conflict (id) do nothing;

-- ── Topics — Physics ─────────────────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22090000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000009', 'Measurement & physical quantities', 'PHYS-JCE-MEASUREMENT-AND-PHYSICAL-QUANTITIES', 'JCE', 'F1', 1),
  ('22090000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000009', 'Forces & motion', 'PHYS-JCE-FORCES-AND-MOTION',                   'JCE', 'F1', 2),
  ('22090000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000009', 'Heat & temperature', 'PHYS-JCE-HEAT-AND-TEMPERATURE',                'JCE', 'F1', 3),
  ('22090000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000009', 'Light & optics', 'PHYS-JCE-LIGHT-AND-OPTICS',                    'JCE', 'F2', 4),
  ('22090000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000009', 'Sound & waves', 'PHYS-JCE-SOUND-AND-WAVES',                     'JCE', 'F2', 5),
  ('22090000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000009', 'Electricity & magnetism', 'PHYS-JCE-ELECTRICITY-AND-MAGNETISM',           'JCE', 'F2', 6)
on conflict (id) do nothing;

-- ── Topics — English Grammar ─────────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22030000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'Parts of speech', 'ENGR-JCE-PARTS-OF-SPEECH',          'JCE', 'F1', 1),
  ('22030000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000003', 'Sentence structure', 'ENGR-JCE-SENTENCE-STRUCTURE',       'JCE', 'F1', 2),
  ('22030000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', 'Reading comprehension', 'ENGR-JCE-READING-COMPREHENSION',    'JCE', 'F1', 3),
  ('22030000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000003', 'Writing & composition', 'ENGR-JCE-WRITING-AND-COMPOSITION',    'JCE', 'F2', 4),
  ('22030000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000003', 'Tenses & voice', 'ENGR-JCE-TENSES-AND-VOICE',           'JCE', 'F2', 5),
  ('22030000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000003', 'Vocabulary & idioms', 'ENGR-JCE-VOCABULARY-AND-IDIOMS',      'JCE', 'F2', 6)
on conflict (id) do nothing;

-- ── Topics — English Literature ──────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22040000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000004', 'Poetry analysis', 'ENGL-JCE-POETRY-ANALYSIS',        'JCE', 'F1', 1),
  ('22040000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000004', 'Prose & short stories', 'ENGL-JCE-PROSE-AND-SHORT-STORIES',  'JCE', 'F1', 2),
  ('22040000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000004', 'Drama & plays', 'ENGL-JCE-DRAMA-AND-PLAYS',          'JCE', 'F2', 3),
  ('22040000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', 'Novel study', 'ENGL-JCE-NOVEL-STUDY',            'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Chichewa ────────────────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22060000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000006', 'Ndakatulo (Poetry)', 'CHIC-JCE-NDAKATULO-POETRY',          'JCE', 'F1', 1),
  ('22060000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000006', 'Nkhani (Short stories)', 'CHIC-JCE-NKHANI-SHORT-STORIES',      'JCE', 'F1', 2),
  ('22060000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000006', 'Masamu a Chichewa (Grammar)', 'CHIC-JCE-MASAMU-A-CHICHEWA-GRAMMAR', 'JCE', 'F2', 3),
  ('22060000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000006', 'Kulemba (Composition)', 'CHIC-JCE-KULEMBA-COMPOSITION',       'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — History ─────────────────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22070000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000007', 'Pre-colonial Malawi', 'HIST-JCE-PRE-COLONIAL-MALAWI',          'JCE', 'F1', 1),
  ('22070000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000007', 'Colonial period in Malawi', 'HIST-JCE-COLONIAL-PERIOD-IN-MALAWI',    'JCE', 'F1', 2),
  ('22070000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000007', 'Independence movements', 'HIST-JCE-INDEPENDENCE-MOVEMENTS',       'JCE', 'F2', 3),
  ('22070000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000007', 'Post-independence Africa', 'HIST-JCE-POST-INDEPENDENCE-AFRICA',     'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Social Studies ──────────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22100000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000010', 'Malawi government & citizenship', 'SOCS-JCE-MALAWI-GOVERNMENT-AND-CITIZENSHIP', 'JCE', 'F1', 1),
  ('22100000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000010', 'Human rights & responsibilities', 'SOCS-JCE-HUMAN-RIGHTS-AND-RESPONSIBILITIES', 'JCE', 'F1', 2),
  ('22100000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000010', 'Environment & sustainability', 'SOCS-JCE-ENVIRONMENT-AND-SUSTAINABILITY',    'JCE', 'F2', 3),
  ('22100000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000010', 'Development in Malawi', 'SOCS-JCE-DEVELOPMENT-IN-MALAWI',           'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Life Skills ─────────────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22110000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000011', 'Personal development', 'LIFE-JCE-PERSONAL-DEVELOPMENT',        'JCE', 'F1', 1),
  ('22110000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000011', 'Health & reproductive health', 'LIFE-JCE-HEALTH-AND-REPRODUCTIVE-HEALTH', 'JCE', 'F1', 2),
  ('22110000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000011', 'Decision-making & peer pressure', 'LIFE-JCE-DECISION-MAKING-AND-PEER-PRESSURE','JCE','F2', 3),
  ('22110000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000011', 'HIV/AIDS & chronic diseases', 'LIFE-JCE-HIV-AIDS-AND-CHRONIC-DISEASES',  'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Agriculture ─────────────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22120000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000012', 'Soil science & conservation', 'AGRI-JCE-SOIL-SCIENCE-AND-CONSERVATION',  'JCE', 'F1', 1),
  ('22120000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000012', 'Crop production & agronomy', 'AGRI-JCE-CROP-PRODUCTION-AND-AGRONOMY',    'JCE', 'F1', 2),
  ('22120000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000012', 'Animal husbandry', 'AGRI-JCE-ANIMAL-HUSBANDRY',              'JCE', 'F2', 3),
  ('22120000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000012', 'Farm management & marketing', 'AGRI-JCE-FARM-MANAGEMENT-AND-MARKETING',   'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Computer Studies ────────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22130000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000013', 'Computer hardware & software', 'COMP-JCE-COMPUTER-HARDWARE-AND-SOFTWARE',   'JCE', 'F1', 1),
  ('22130000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000013', 'Operating systems & file mgmt', 'COMP-JCE-OPERATING-SYSTEMS-AND-FILE-MGMT',  'JCE', 'F1', 2),
  ('22130000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000013', 'Word processing & spreadsheets', 'COMP-JCE-WORD-PROCESSING-AND-SPREADSHEETS', 'JCE', 'F2', 3),
  ('22130000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000013', 'Internet, email & digital safety', 'COMP-JCE-INTERNET-EMAIL-AND-DIGITAL-SAFETY','JCE','F2', 4)
on conflict (id) do nothing;

-- ── Topics — Geography ───────────────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22140000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000014', 'Maps, scale & direction', 'GEOG-JCE-MAPS-SCALE-AND-DIRECTION',        'JCE', 'F1', 1),
  ('22140000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000014', 'Weather, climate & water cycle', 'GEOG-JCE-WEATHER-CLIMATE-AND-WATER-CYCLE', 'JCE', 'F1', 2),
  ('22140000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000014', 'Landforms & physical geography', 'GEOG-JCE-LANDFORMS-AND-PHYSICAL-GEOGRAPHY', 'JCE', 'F2', 3),
  ('22140000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000014', 'Population & human geography', 'GEOG-JCE-POPULATION-AND-HUMAN-GEOGRAPHY',   'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Business Studies ────────────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22150000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000015', 'Trade & commerce', 'BUSI-JCE-TRADE-AND-COMMERCE',              'JCE', 'F1', 1),
  ('22150000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000015', 'Money, banking & finance', 'BUSI-JCE-MONEY-BANKING-AND-FINANCE',      'JCE', 'F1', 2),
  ('22150000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000015', 'Entrepreneurship & marketing', 'BUSI-JCE-ENTREPRENEURSHIP-AND-MARKETING',  'JCE', 'F2', 3),
  ('22150000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000015', 'Insurance & transport in trade', 'BUSI-JCE-INSURANCE-AND-TRANSPORT-IN-TRADE', 'JCE', 'F2', 4)
on conflict (id) do nothing;

-- ── Topics — Additional Mathematics ─────────────────────────
insert into public.topics (id, subject_id, name, code, exam_path, form_level, order_index) values
  ('22020000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', 'Indices & logarithms', 'ADDM-JCE-INDICES-AND-LOGARITHMS',         'JCE', 'F1', 1),
  ('22020000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', 'Quadratic equations', 'ADDM-JCE-QUADRATIC-EQUATIONS',          'JCE', 'F1', 2),
  ('22020000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000002', 'Vectors & matrices', 'ADDM-JCE-VECTORS-AND-MATRICES',           'JCE', 'F2', 3),
  ('22020000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000002', 'Calculus — differentiation', 'ADDM-JCE-CALCULUS-DIFFERENTIATION',   'JCE', 'F2', 4)
on conflict (id) do nothing;
