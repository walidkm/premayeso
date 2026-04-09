import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..", "..");
const require = createRequire(import.meta.url);
const XLSX = require(resolve(repoRoot, "apps/api/node_modules/xlsx"));

const workbookPath = resolve(__dirname, "maneb-2021-jce-biology-sample-j022.xlsx");
const manifestPath = resolve(__dirname, "maneb-2021-jce-biology-sample-j022.manifest.json");
const assetsRoot = resolve(__dirname, "maneb-2021-jce-biology-sample-assets");
const sourcePagesDir = resolve(assetsRoot, "source-pages");
const orderedPagesDir = resolve(assetsRoot, "paper-pages");

const paperCode = "MANEB-JCE-BIOL-J022-2021-SAMPLE";
const sectionMap = [
  {
    section_code: "A",
    title: "Section A",
    instructions:
      "Answer all questions in this section. Encircle the letter corresponding to the correct answer.",
    order_index: 1,
    question_selection_mode: "answer_all",
    required_count: "",
    max_marks: 20,
    starts_at_question_number: 1,
    ends_at_question_number: 20,
  },
  {
    section_code: "B",
    title: "Section B",
    instructions: "Answer all questions in this section in the spaces provided.",
    order_index: 2,
    question_selection_mode: "answer_all",
    required_count: "",
    max_marks: 50,
    starts_at_question_number: 21,
    ends_at_question_number: 30,
  },
  {
    section_code: "C",
    title: "Section C",
    instructions: "Answer all the questions in this section.",
    order_index: 3,
    question_selection_mode: "answer_all",
    required_count: "",
    max_marks: 30,
    starts_at_question_number: 31,
    ends_at_question_number: 33,
  },
];

const pageAssets = [
  { pageNumber: 1, orderedFile: "paper-page-01-cover.png", sourceFile: "page-01.png", role: "cover" },
  { pageNumber: 2, orderedFile: "paper-page-02.png", sourceFile: "page-07.png", role: "section-a" },
  { pageNumber: 3, orderedFile: "paper-page-03.png", sourceFile: "page-08.png", role: "section-a" },
  { pageNumber: 4, orderedFile: "paper-page-04.png", sourceFile: "page-09.png", role: "section-a" },
  { pageNumber: 5, orderedFile: "paper-page-05.png", sourceFile: "page-10.png", role: "section-b" },
  { pageNumber: 6, orderedFile: "paper-page-06.png", sourceFile: "page-11.png", role: "section-b" },
  { pageNumber: 7, orderedFile: "paper-page-07.png", sourceFile: "page-12.png", role: "section-b" },
  { pageNumber: 8, orderedFile: "paper-page-08.png", sourceFile: "page-13.png", role: "section-b" },
  { pageNumber: 9, orderedFile: "paper-page-09.png", sourceFile: "page-14.png", role: "section-b" },
  { pageNumber: 10, orderedFile: "paper-page-10.png", sourceFile: "page-02.png", role: "section-b" },
  { pageNumber: 11, orderedFile: "paper-page-11.png", sourceFile: "page-03.png", role: "section-b" },
  { pageNumber: 12, orderedFile: "paper-page-12.png", sourceFile: "page-04.png", role: "section-c" },
  { pageNumber: 13, orderedFile: "paper-page-13.png", sourceFile: "page-05.png", role: "section-c" },
  { pageNumber: 14, orderedFile: "paper-page-14.png", sourceFile: "page-06.png", role: "section-c" },
];

function mcq(number, body, options, correctLabel, explanation, sourcePages, figureDependency = null) {
  return {
    questionNumber: number,
    sectionCode: "A",
    type: "mcq",
    body,
    marks: 1,
    difficulty: "easy",
    explanation,
    rubricCode: "",
    autoMarkingMode: "exact",
    options: options.map(([key, text]) => ({
      option_label: key,
      option_text: text,
      is_correct: key === correctLabel ? "true" : "false",
      distractor_explanation: key === correctLabel ? "" : "",
    })),
    parts: [],
    sourcePages,
    figureDependency,
  };
}

function structured(number, body, marks, parts, sourcePages, figureDependency = null) {
  return {
    questionNumber: number,
    sectionCode: "B",
    type: "structured",
    body,
    marks,
    difficulty: "medium",
    explanation: "",
    rubricCode: "",
    autoMarkingMode: "manual",
    options: [],
    parts,
    sourcePages,
    figureDependency,
  };
}

function essay(number, body, rubricCode, sourcePages) {
  return {
    questionNumber: number,
    sectionCode: "C",
    type: "essay",
    body,
    marks: 10,
    difficulty: "hard",
    explanation: "",
    rubricCode,
    autoMarkingMode: "manual",
    options: [],
    parts: [],
    sourcePages,
    figureDependency: null,
  };
}

function part(partLabel, body, marks, expectedAnswer) {
  return {
    part_label: partLabel,
    body,
    marks,
    expected_answer: expectedAnswer,
    rubric_code: "",
    auto_marking_mode: "manual",
  };
}

const questions = [
  mcq(
    1,
    "Which of the following is a characteristic of conifers?",
    [
      ["A", "presence of cones"],
      ["B", "presence of rhizomes"],
      ["C", "presence of spores"],
      ["D", "presence of thallus"],
    ],
    "A",
    "Conifers are cone-bearing seed plants.",
    [2]
  ),
  mcq(
    2,
    "Which of the following pairs of plants are flowering plants?",
    [
      ["A", "liverworts and mosses"],
      ["B", "bananas and reeds"],
      ["C", "moulds and conifers"],
      ["D", "algae and ferns"],
    ],
    "B",
    "Bananas and reeds are angiosperms.",
    [2]
  ),
  mcq(
    3,
    "Figure 1 is a diagram of a leaf. Use it to answer Questions 3 and 4. What type of leaf arrangement is shown in the diagram?",
    [
      ["A", "digitate"],
      ["B", "bipinnate"],
      ["C", "pinnate"],
      ["D", "trifoliate"],
    ],
    "C",
    "The leaflets are arranged on either side of a single rachis, which is pinnate.",
    [2],
    { label: "Figure 1", pages: [2], note: "Leaf diagram used by Questions 3 and 4." }
  ),
  mcq(
    4,
    "Figure 1 is a diagram of a leaf. Use it to answer Questions 3 and 4. What is the name of the part marked Z?",
    [
      ["A", "leaf margin"],
      ["B", "leaf blade"],
      ["C", "leaf stalk"],
      ["D", "leaf vein"],
    ],
    "C",
    "Z points to the leaf stalk.",
    [2],
    { label: "Figure 1", pages: [2], note: "Leaf diagram used by Questions 3 and 4." }
  ),
  mcq(
    5,
    "Figure 2 is a diagram of a root system. What type of root system is shown in the diagram?",
    [
      ["A", "tap root"],
      ["B", "adventitious root"],
      ["C", "fibrous root"],
      ["D", "lateral root"],
    ],
    "A",
    "The diagram shows one main root with smaller side branches, which is a tap root.",
    [2],
    { label: "Figure 2", pages: [2], note: "Root system diagram used by Question 5." }
  ),
  mcq(
    6,
    "Which of the following statements is true about cells?",
    [
      ["A", "Animal cells have cell walls."],
      ["B", "Cells without chloroplasts can make food."],
      ["C", "Plant cells have large vacuoles."],
      ["D", "Nucleus and cytoplasm do not have membranes."],
    ],
    "C",
    "Plant cells characteristically have a large central vacuole.",
    [2]
  ),
  mcq(
    7,
    "Figure 3 is a diagram of vertebrates. Use it to answer Questions 7 and 8. Which of the following characteristics could be used to classify the organisms? 1. fins 2. legs 3. toes 4. size",
    [
      ["A", "1, 2 and 3"],
      ["B", "1, 2 and 4"],
      ["C", "1, 3 and 4"],
      ["D", "2, 3 and 4"],
    ],
    "A",
    "Fins, legs and toes are structural features that classify the vertebrates shown; size is not a reliable classifying feature.",
    [3],
    { label: "Figure 3", pages: [3], note: "Vertebrate diagram used by Questions 7 and 8." }
  ),
  mcq(
    8,
    "Figure 3 is a diagram of vertebrates. Use it to answer Questions 7 and 8. To which of the following groups of animals does a gecko belong?",
    [
      ["A", "fish"],
      ["B", "mammal"],
      ["C", "reptile"],
      ["D", "amphibian"],
    ],
    "C",
    "A gecko is a reptile.",
    [3],
    { label: "Figure 3", pages: [3], note: "Vertebrate diagram used by Questions 7 and 8." }
  ),
  mcq(
    9,
    "Table 1 shows germination percentage of 250 bean seeds which were planted in three different types of soil at the same time. Use it to answer Questions 9 to 11. How many seeds germinated in clay soil?",
    [
      ["A", "225"],
      ["B", "220"],
      ["C", "200"],
      ["D", "175"],
    ],
    "C",
    "Clay soil had 80% germination, so 0.8 × 250 = 200 seeds.",
    [3],
    { label: "Table 1", pages: [3], note: "Germination table used by Questions 9 to 11." }
  ),
  mcq(
    10,
    "Table 1 shows germination percentage of 250 bean seeds which were planted in three different types of soil at the same time. Use it to answer Questions 9 to 11. Identify the input variable in this investigation.",
    [
      ["A", "time of planting"],
      ["B", "type of seeds used"],
      ["C", "germination percentage"],
      ["D", "type of soil"],
    ],
    "D",
    "The factor deliberately changed was the type of soil.",
    [3],
    { label: "Table 1", pages: [3], note: "Germination table used by Questions 9 to 11." }
  ),
  mcq(
    11,
    "Table 1 shows germination percentage of 250 bean seeds which were planted in three different types of soil at the same time. Use it to answer Questions 9 to 11. Which of the following are control variables of the experiment? 1. time of planting 2. type of seeds used 3. germination percentage 4. type of soil",
    [
      ["A", "1 and 2"],
      ["B", "1 and 4"],
      ["C", "2 and 3"],
      ["D", "3 and 4"],
    ],
    "A",
    "Time of planting and type of seeds were kept constant while soil type changed.",
    [3],
    { label: "Table 1", pages: [3], note: "Germination table used by Questions 9 to 11." }
  ),
  mcq(
    12,
    "Figure 4 is a skull of a mammal. Use it to answer Questions 12 and 13. Which of the following mammals have this kind of skull?",
    [
      ["A", "dogs"],
      ["B", "goats"],
      ["C", "lions"],
      ["D", "leopards"],
    ],
    "B",
    "The skull is adapted for a herbivore such as a goat.",
    [4],
    { label: "Figure 4", pages: [4], note: "Mammal skull used by Questions 12 and 13." }
  ),
  mcq(
    13,
    "Figure 4 is a skull of a mammal. Use it to answer Questions 12 and 13. Which of the following food substances can best be digested by the mammal?",
    [
      ["A", "cellulose"],
      ["B", "fats"],
      ["C", "proteins"],
      ["D", "vitamins"],
    ],
    "A",
    "The herbivore skull indicates adaptation for digesting cellulose-rich plant material.",
    [4],
    { label: "Figure 4", pages: [4], note: "Mammal skull used by Questions 12 and 13." }
  ),
  mcq(
    14,
    "A drop of food solution was placed on a white paper. What would be the result for the presence of lipids in the food?",
    [
      ["A", "blue black"],
      ["B", "brick red"],
      ["C", "translucent spot"],
      ["D", "purple"],
    ],
    "C",
    "Lipids leave a translucent greasy spot on paper.",
    [4]
  ),
  mcq(
    15,
    "Which of the following lists of food nutrients are necessary for the prevention of anaemia?",
    [
      ["A", "proteins, carbohydrates and iron"],
      ["B", "proteins, carbohydrates and vitamin C"],
      ["C", "proteins, iron and vitamin C"],
      ["D", "carbohydrates, iron and vitamin C"],
    ],
    "C",
    "Iron supports haemoglobin formation, vitamin C improves iron absorption, and proteins support tissue and blood formation.",
    [4]
  ),
  mcq(
    16,
    "What is the major cause of anaemia in children?",
    [
      ["A", "menstruation"],
      ["B", "diseases"],
      ["C", "bleeding"],
      ["D", "malnutrition"],
    ],
    "D",
    "Malnutrition is the main cause of anaemia in children in this context.",
    [4]
  ),
  mcq(
    17,
    "Which of the following is necessary for blood to clot?",
    [
      ["A", "platelets"],
      ["B", "red blood cells"],
      ["C", "white blood cells"],
      ["D", "plasma"],
    ],
    "A",
    "Platelets are directly involved in blood clotting.",
    [4]
  ),
  mcq(
    18,
    "Which blood vessel carries digested food from the small intestines to the liver?",
    [
      ["A", "hepatic portal vein"],
      ["B", "hepatic vein"],
      ["C", "hepatic artery"],
      ["D", "renal artery"],
    ],
    "A",
    "The hepatic portal vein carries absorbed nutrients from the intestines to the liver.",
    [4]
  ),
  mcq(
    19,
    "Why do stomates normally open during the day? 1. to allow sunlight to enter the leaf 2. to allow water vapour to leave the leaf 3. to allow carbon dioxide to enter the leaf 4. to allow oxygen to leave the leaf",
    [
      ["A", "1, 2 and 3"],
      ["B", "1, 2 and 4"],
      ["C", "1, 3 and 4"],
      ["D", "2, 3 and 4"],
    ],
    "D",
    "Open stomata allow gas exchange and transpiration; they do not open to let sunlight enter.",
    [4]
  ),
  mcq(
    20,
    "Which of the following is not a function of the liver?",
    [
      ["A", "changes toxic substances into harmless form"],
      ["B", "breaks down excess amino acids to urea"],
      ["C", "stores iron and vitamin D"],
      ["D", "regulates metabolic processes in the body"],
    ],
    "D",
    "The liver performs detoxification, deamination and storage functions; this option is the least specific liver function.",
    [4]
  ),
  structured(
    21,
    "Answer the following questions about sampling in a population of organisms.",
    3,
    [
      part(
        "a",
        "What is a “sample” in relation to population of organisms?",
        1,
        "A sample is a small representative group selected from a larger population for study."
      ),
      part(
        "b",
        "Explain the importance of using a sample when working with large populations.",
        2,
        "A sample makes large-population studies manageable, faster and cheaper while still allowing conclusions about the population."
      ),
    ],
    [5]
  ),
  structured(
    22,
    "The following data shows a sample of masses of Form 1 students at a certain school. Use it to answer the questions that follow: 45, 40, 43, 50, 39, 40, 42, 40, 39.",
    3,
    [
      part("a", "Find the median of the sample.", 2, "40 kg"),
      part(
        "b",
        "Why would a weighing instrument of 25 kg as maximum mass not be suitable for collecting such data from students in this class?",
        1,
        "Because the students' masses are greater than 25 kg, so the instrument would not measure them correctly."
      ),
    ],
    [5]
  ),
  structured(
    23,
    "Figure 5 shows a food web. Use it to answer the questions that follow.",
    9,
    [
      part("a", "Define the term “habitat”.", 1, "A habitat is the natural place or environment where an organism lives."),
      part(
        "b",
        "Construct any one food chain from the food web.",
        3,
        "Any correct food chain from the figure, for example: Vegetation -> Grasshopper -> Frog -> Snake."
      ),
      part(
        "c",
        "In a pond, fish feed on small vegetation, a snake feeds on the fish. Describe how energy flows from the sun to the snake as a second order consumer.",
        5,
        "Energy from the sun is trapped by green plants during photosynthesis, passed to fish when they feed on the vegetation, and then passed to the snake when it feeds on the fish, with some energy lost at each transfer."
      ),
    ],
    [6],
    { label: "Figure 5", pages: [6], note: "Food web used by Question 23." }
  ),
  structured(
    24,
    "Figure 6 shows an experiment on photosynthesis in which a leaf with green and non-green parts was used. Use it to answer the questions that follow.",
    5,
    [
      part("a", "Define the term “photosynthesis”.", 1, "Photosynthesis is the process by which green plants make food from carbon dioxide and water using light energy in the presence of chlorophyll."),
      part(
        "b(i)",
        "State one reason why Step 2 was carried out.",
        1,
        "Step 2 was carried out to remove chlorophyll from the leaf so the iodine colour change could be seen clearly."
      ),
      part(
        "b(ii)",
        "From the experiment, a student concluded that chlorophyll is necessary for photosynthesis. Explain why this conclusion was correct.",
        3,
        "Only the green parts of the leaf turned blue-black with iodine, showing that starch was produced there. The non-green parts remained brown, so only areas with chlorophyll photosynthesised."
      ),
    ],
    [7],
    { label: "Figure 6", pages: [7], note: "Photosynthesis experiment diagram used by Question 24." }
  ),
  structured(
    25,
    "Answer the following questions on obesity.",
    4,
    [
      part(
        "a(i)",
        "Give any two causes of obesity.",
        2,
        "Any two valid causes, for example: overeating a high-energy diet, lack of exercise, hormonal imbalance, or heredity."
      ),
      part(
        "a(ii)",
        "State how each of the causes in 25a.(i) can be prevented.",
        2,
        "Use matching prevention measures such as eating a balanced diet, avoiding overeating, and taking regular exercise."
      ),
    ],
    [8]
  ),
  structured(
    26,
    "Answer the following questions on sprains.",
    3,
    [
      part(
        "a",
        "What are “sprains”?",
        1,
        "Sprains are injuries caused by overstretching or tearing ligaments around a joint."
      ),
      part(
        "b",
        "State two ways of reducing swelling on a sprained joint.",
        2,
        "Any two valid ways, for example: apply a cold compress or ice, rest the joint, elevate it, or bandage it firmly."
      ),
    ],
    [8]
  ),
  structured(
    27,
    "Figure 7 shows parts of the human skeleton and associated muscles. Use it to answer the questions that follow.",
    3,
    [
      part("a", "Name the type of joint formed at C.", 1, "Hinge joint."),
      part(
        "b",
        "Describe how muscles A and B work together to raise the lower arm.",
        2,
        "When the lower arm is raised, muscle A contracts and shortens while muscle B relaxes and lengthens."
      ),
    ],
    [8, 9],
    { label: "Figure 7", pages: [8, 9], note: "Arm skeleton and muscle diagram used by Question 27." }
  ),
  structured(
    28,
    "Figure 8 is a diagram showing components of blood. Use it to answer the questions that follow.",
    6,
    [
      part("a", "Identify components I and J.", 2, "I - red blood cell; J - white blood cell."),
      part("b(i)", "Name the process that is occurring in component J.", 1, "Phagocytosis."),
      part(
        "b(ii)",
        "Explain the importance of the process stated in 28b(i).",
        2,
        "Phagocytosis helps protect the body by engulfing and destroying disease-causing organisms or foreign particles."
      ),
      part("c", "Which mineral element is important for the formation of component I?", 1, "Iron."),
    ],
    [9, 10],
    { label: "Figure 8", pages: [9, 10], note: "Blood component diagram used by Question 28." }
  ),
  structured(
    29,
    "Figure 9 is the diagram showing some micro-organisms. Use it to answer the questions that follow.",
    4,
    [
      part("a", "To which group of micro-organisms do G and H belong?", 1, "Bacteria."),
      part(
        "b(i)",
        "Give any two observable differences between G and H.",
        2,
        "G is rod-shaped and arranged in a chain, whereas H is spherical and grouped in a cluster."
      ),
      part(
        "b(ii)",
        "State the importance of G in its habitat.",
        1,
        "G helps in decomposition and nutrient recycling in its habitat."
      ),
    ],
    [10],
    { label: "Figure 9", pages: [10], note: "Micro-organism diagram used by Question 29." }
  ),
  structured(
    30,
    "Explain how each of the following pollutants would negatively affect living things in their environment.",
    10,
    [
      part("a", "smoke", 2, "Smoke causes respiratory problems and can reduce photosynthesis by blocking light or damaging leaves."),
      part("b", "domestic waste", 2, "Domestic waste can spread disease, attract pests and contaminate land or water."),
      part("c", "pesticides", 2, "Pesticides can poison non-target organisms and may bioaccumulate in food chains."),
      part("d", "untreated sewage", 2, "Untreated sewage spreads pathogens and can lower oxygen levels in water bodies."),
      part("e", "industrial waste", 2, "Industrial waste can introduce toxic chemicals that kill organisms and damage habitats."),
    ],
    [11]
  ),
  essay(
    31,
    "Describe an experiment that could be conducted to show the effect of nitrogen on maize seedlings. In your essay, include method, expected results and conclusion.",
    "J022-Q31-RUBRIC",
    [12]
  ),
  essay(
    32,
    "Suppose you are a nutrition officer in a village where people do not know the different food nutrients that could be included in their diet for good health. In an essay form, state any five food nutrients and for each one give its function in the body.",
    "J022-Q32-RUBRIC",
    [13]
  ),
  essay(
    33,
    "Discuss any five functions of the liver. Write your answer in an essay form.",
    "J022-Q33-RUBRIC",
    [14]
  ),
];

const rubricRows = [
  {
    rubric_code: "J022-Q31-RUBRIC",
    title: "Question 31 Essay Rubric",
    criterion_name: "Experimental method",
    max_marks: 4,
    order_index: 1,
  },
  {
    rubric_code: "J022-Q31-RUBRIC",
    title: "Question 31 Essay Rubric",
    criterion_name: "Expected results",
    max_marks: 3,
    order_index: 2,
  },
  {
    rubric_code: "J022-Q31-RUBRIC",
    title: "Question 31 Essay Rubric",
    criterion_name: "Conclusion and biological reasoning",
    max_marks: 3,
    order_index: 3,
  },
  {
    rubric_code: "J022-Q32-RUBRIC",
    title: "Question 32 Essay Rubric",
    criterion_name: "Range of nutrients identified",
    max_marks: 5,
    order_index: 1,
  },
  {
    rubric_code: "J022-Q32-RUBRIC",
    title: "Question 32 Essay Rubric",
    criterion_name: "Accuracy of stated functions",
    max_marks: 5,
    order_index: 2,
  },
  {
    rubric_code: "J022-Q33-RUBRIC",
    title: "Question 33 Essay Rubric",
    criterion_name: "Relevant liver functions selected",
    max_marks: 5,
    order_index: 1,
  },
  {
    rubric_code: "J022-Q33-RUBRIC",
    title: "Question 33 Essay Rubric",
    criterion_name: "Explanation and biological accuracy",
    max_marks: 5,
    order_index: 2,
  },
];

const examPaperRow = {
  exam_path: "JCE",
  subject_code: "BIOL-JCE",
  title: "2021 Junior Certificate Examination Biology Sample Paper",
  year: 2021,
  session: "Sample Paper",
  paper_number: "",
  paper_code: paperCode,
  duration_min: 120,
  total_marks: 100,
  instructions:
    "This paper contains 14 pages. The paper contains three sections: A, B and C. Answer all the questions in each section. Section A should be answered by encircling the letter with the correct answer. Sections B and C should be answered in the spaces provided.",
  source: "maneb",
  marking_mode: "hybrid",
  solution_unlock_mode: "after_marked",
  question_mode: "one_question_at_a_time",
  status: "published",
  is_sample: "true",
};

function buildWorkbookRows() {
  const paper_sections = sectionMap.map((section) => ({
    paper_code: paperCode,
    ...section,
  }));

  const questionRows = questions.map((question) => ({
    paper_code: paperCode,
    section_code: question.sectionCode,
    question_number: question.questionNumber,
    type: question.type,
    body: question.body,
    marks: question.marks,
    topic_code: "",
    subtopic_code: "",
    difficulty: question.difficulty,
    allow_shuffle: "false",
    expected_answer: "",
    explanation: question.explanation,
    rubric_code: question.rubricCode,
    auto_marking_mode: question.autoMarkingMode,
  }));

  const question_parts = questions.flatMap((question) =>
    question.parts.map((questionPart, index) => ({
      paper_code: paperCode,
      question_number: question.questionNumber,
      part_label: questionPart.part_label,
      body: questionPart.body,
      marks: questionPart.marks,
      expected_answer: questionPart.expected_answer,
      rubric_code: questionPart.rubric_code,
      auto_marking_mode: questionPart.auto_marking_mode,
      order_index: index + 1,
    }))
  );

  const options = questions.flatMap((question) =>
    question.options.map((option) => ({
      paper_code: paperCode,
      question_number: question.questionNumber,
      part_label: "",
      option_label: option.option_label,
      option_text: option.option_text,
      is_correct: option.is_correct,
      distractor_explanation: option.distractor_explanation,
    }))
  );

  return {
    exam_papers: [examPaperRow],
    paper_sections,
    questions: questionRows,
    question_parts,
    options,
    rubrics: rubricRows,
  };
}

function ensureOrderedPageAssets() {
  mkdirSync(orderedPagesDir, { recursive: true });
  for (const pageAsset of pageAssets) {
    const sourcePath = resolve(sourcePagesDir, pageAsset.sourceFile);
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing source page asset: ${sourcePath}`);
    }
    copyFileSync(sourcePath, resolve(orderedPagesDir, pageAsset.orderedFile));
  }
}

function buildManifest() {
  const questionInventory = questions.map((question) => ({
    questionNumber: question.questionNumber,
    sectionCode: question.sectionCode,
    type: question.type,
    marks: question.marks,
    partCount: question.parts.length,
    sourcePages: question.sourcePages,
    dependsOnFigure: Boolean(question.figureDependency),
  }));

  const figureDependencies = questions
    .filter((question) => question.figureDependency)
    .map((question) => ({
      questionNumber: question.questionNumber,
      label: question.figureDependency.label,
      pages: question.figureDependency.pages,
      note: question.figureDependency.note,
      assetFiles: question.figureDependency.pages.map(
        (pageNumber) => `maneb-2021-jce-biology-sample-assets/paper-pages/paper-page-${String(pageNumber).padStart(2, "0")}${pageNumber === 1 ? "-cover" : ""}.png`
      ),
    }));

  return {
    paperCode,
    title: examPaperRow.title,
    examPath: examPaperRow.exam_path,
    subject: "Biology",
    subjectCode: examPaperRow.subject_code,
    subjectNumber: "J022",
    year: 2021,
    sourceDescription:
      "Manual transcription source for the official MANEB 2021 Junior Certificate Examination Biology Sample Paper (J022), stored as an extracted DOCX of page images.",
    sourceReference: {
      extractedDocx: "C:/Users/Walid/Downloads/maneb_jce_biology_extracted.docx",
      originalOfficialPaper: "MANEB 2021 Junior Certificate Examination / Biology Sample Paper / J022",
      format: "official_image_only_docx_export",
    },
    paperMetadata: {
      totalPages: 14,
      durationMin: 120,
      totalMarks: 100,
      instructionsSummary: [
        "The paper contains three sections: A, B and C.",
        "Answer all the questions in each section.",
        "Section A should be answered by encircling the letter with the correct answer.",
        "Sections B and C should be answered in the spaces provided.",
      ],
    },
    pageAssets: pageAssets.map((page) => ({
      pageNumber: page.pageNumber,
      role: page.role,
      file: `maneb-2021-jce-biology-sample-assets/paper-pages/${page.orderedFile}`,
      sourceFile: `maneb-2021-jce-biology-sample-assets/source-pages/${page.sourceFile}`,
    })),
    pageToSectionMap: [
      { sectionCode: "A", pages: [2, 3, 4], questionRange: [1, 20] },
      { sectionCode: "B", pages: [5, 6, 7, 8, 9, 10, 11], questionRange: [21, 30] },
      { sectionCode: "C", pages: [12, 13, 14], questionRange: [31, 33] },
    ],
    questionInventory,
    figureDependencies,
    expectedPreview: {
      questionCount: questions.length,
      sectionCount: sectionMap.length,
      partCount: questions.reduce((sum, question) => sum + question.parts.length, 0),
      essayCount: questions.filter((question) => question.type === "essay").length,
      structuredCount: questions.filter((question) => question.type === "structured").length,
      objectiveCount: questions.filter((question) => question.type === "mcq").length,
      totalQuestionMarks: questions.reduce((sum, question) => sum + question.marks, 0),
      totalSectionMarks: sectionMap.reduce((sum, section) => sum + section.max_marks, 0),
      totalRubricMarks: 30,
    },
    featureAudit: {
      hasMcq: true,
      hasStructuredMultipart: true,
      hasEssay: true,
      hasAnswerAnyN: false,
      hasFigures: true,
      splitProof: {
        realContentProof: ["mcq", "structured_multipart", "essay", "figure_dependencies"],
        syntheticOnly: ["answer_any_n"],
      },
    },
    notes: [
      "Question content stays faithful to the official paper; internal answer keys, expected answers and essay rubrics were authored for platform validation.",
      "The official source does not contain an answer_any_n section. That behavior remains covered only by synthetic DB-backed fixtures.",
      "Figure-bearing questions rely on companion page assets referenced here; no runtime schema field was added for figures.",
    ],
  };
}

function writeWorkbook() {
  const workbook = XLSX.utils.book_new();
  const rowsBySheet = buildWorkbookRows();
  for (const [sheetName, rows] of Object.entries(rowsBySheet)) {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }
  XLSX.writeFile(workbook, workbookPath);
}

function writeManifest() {
  const manifest = buildManifest();
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

ensureOrderedPageAssets();
writeWorkbook();
writeManifest();

console.log(`Wrote ${workbookPath}`);
console.log(`Wrote ${manifestPath}`);
