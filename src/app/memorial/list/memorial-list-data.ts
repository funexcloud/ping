export type MemorialListItem = {
  id: string;
  name: string;
  religion: string;
  deathDate: string;
  age: string;
  burialPlace: string;
  tributes: number;
  messages: number;
};

export const MEMORIAL_LIST_ITEMS: MemorialListItem[] = [
  {
    id: "1",
    name: "홍길동",
    religion: "기독교",
    deathDate: "2024년 12월 25일",
    age: "85세",
    burialPlace: "서울시립승화원",
    tributes: 12,
    messages: 8,
  },
  {
    id: "2",
    name: "김영희",
    religion: "불교",
    deathDate: "2024년 12월 20일",
    age: "72세",
    burialPlace: "부산추모공원",
    tributes: 25,
    messages: 15,
  },
  {
    id: "3",
    name: "이철수",
    religion: "천주교",
    deathDate: "2024년 12월 15일",
    age: "68세",
    burialPlace: "인천추모원",
    tributes: 8,
    messages: 5,
  },
];
