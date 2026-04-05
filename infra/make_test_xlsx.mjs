import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const XLSX = require(resolve(__dir, "../apps/api/node_modules/xlsx"));

const headers2 = [
  "#","Question Type *","Question No.","Section","Question Text *","Question Image URL",
  "Option A","Option B","Option C","Option D",
  "Correct Answer *","Explanation","Marks *","Difficulty *","Allow Shuffle? *",
  "Exam Level *","Subject Code *","Topic Code *","Source *","Paper Type *","Exam Mode *",
  "Year","Paper No.","Pool Tag","Language","Notes",
];
const hints = [
  "Auto","Select ▼","","","Full question text here","",
  "First option","Second option","Third option","Fourth option",
  "A/B/C/D","Step-by-step","e.g. 1","Select ▼","Yes / No",
  "Select ▼","Use exact code","Use exact code","Select ▼","Select ▼","Select ▼",
  "e.g. 2022","1 or 2","","English / Chichewa","",
];
const row1 = [
  1,"MCQ","2022-P1-Q01","Section A","Which of the following is the value of 3² + 4²?","",
  "15","20","25","30",
  "C","3²=9 and 4²=16. Therefore 3²+4²=25.",1,"Easy","Yes",
  "JCE","MATH-JCE","MATH-JCE-NUMBERS","MANEB Past Paper","MANEB Past Paper","Paper Layout",
  2022,1,"","English","",
];
const row2 = [
  2,"True/False","2022-P1-Q10","Section A","Photosynthesis occurs in the mitochondria of plant cells.","",
  "True","False","","",
  "False","Photosynthesis takes place in the chloroplasts.",1,"Easy","No",
  "JCE","BIOL-JCE","BIOL-JCE-CELLS","MANEB Past Paper","MANEB Past Paper","Paper Layout",
  2022,1,"","English","",
];
const row3 = [
  3,"MCQ","POOL-MATH-001","","If x + 7 = 15, what is x?","",
  "6","7","8","9",
  "C","x = 15 − 7 = 8.",1,"Easy","Yes",
  "JCE","MATH-JCE","MATH-JCE-NUMBERS","Teacher Created","Question Pool","Randomized",
  "","","JCE-MATHS-POOL-2026","English","",
];

const ws = XLSX.utils.aoa_to_sheet([headers2, hints, row1, row2, row3]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Questions");
XLSX.writeFile(wb, resolve(__dir, "test_upload.xlsx"));
console.log("✓ infra/test_upload.xlsx written (3 data rows)");
