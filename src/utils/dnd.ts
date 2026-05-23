// dnd.ts
export const reorderArray = (arr: any[], from: number, to: number) => {
  const item = arr.splice(from, 1)[0];
  arr.splice(to, 0, item);
  return arr;
};
