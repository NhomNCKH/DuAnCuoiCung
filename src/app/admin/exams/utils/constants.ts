// app/admin/exams/utils/constants.ts
export const DIFFICULTY_LEVELS = {
  easy: { label: "Dễ", color: "bg-green-100 text-green-700" },
  medium: { label: "Trung bình", color: "bg-yellow-100 text-yellow-700" },
  hard: { label: "Khó", color: "bg-red-100 text-red-700" },
} as const;

export const EXAM_TYPES = {
  full: { label: "Full Test", questions: 83 },
  mini: { label: "Mini Test", questions: 30 },
} as const;

export const EXAM_STATUS = {
  draft: { label: "Bản nháp", color: "text-yellow-600", bgColor: "bg-yellow-50" },
  published: { label: "Đã xuất bản", color: "text-green-600", bgColor: "bg-green-50" },
  archived: { label: "Đã lưu trữ", color: "text-gray-500", bgColor: "bg-gray-50" },
} as const;

export const READING_PARTS = [
  { id: "part5", name: "Part 5: Incomplete Sentences", questions: 40 },
  { id: "part6", name: "Part 6: Text Completion", questions: 16 },
  { id: "part7", name: "Part 7: Reading Comprehension", questions: 27 },
];

export const WRITING_PARTS = [
  { id: "part1", name: "Part 1: Write a sentence based on a picture", questions: 5 },
  { id: "part2", name: "Part 2: Respond to a written request", questions: 2 },
  { id: "part3", name: "Part 3: Write an opinion essay", questions: 1 },
];

export const RULE_TYPES = [
  { value: "difficulty", label: "Độ khó", color: "blue" },
  { value: "topic", label: "Chủ đề", color: "green" },
  { value: "skill", label: "Kỹ năng", color: "purple" },
];