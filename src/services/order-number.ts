export function generateOrderNumber(): string {
  const date = new Date();
  const ymd = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `FOOD-${ymd}-${rand}`;
}
