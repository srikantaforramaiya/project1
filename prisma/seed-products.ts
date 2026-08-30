import { PrismaClient, Prisma } from "@prisma/client";

type PrismaLike = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const categoryDefs = [
  { name: "Breakfast", slug: "breakfast", description: "Start your day right", displayOrder: 1, imageUrl: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80" },
  { name: "Snacks", slug: "snacks", description: "Crispy, crunchy, delicious", displayOrder: 2, imageUrl: "https://images.unsplash.com/photo-1541014741259-de529411b96a?w=600&q=80" },
  { name: "Main Course", slug: "main-course", description: "Hearty local meals", displayOrder: 3, imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80" },
  { name: "Sweets", slug: "sweets", description: "Traditional and fusion desserts", displayOrder: 4, imageUrl: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=600&q=80" },
  { name: "Beverages", slug: "beverages", description: "Refreshing local drinks", displayOrder: 5, imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80" }
];

type ProductDef = { cat: string; name: string; price: number; veg: boolean; spicy: boolean; desc: string; img: string; featured: boolean; stock: number | null };

const defs: ProductDef[] = [
  { cat: "breakfast", name: "Masala Dosa", price: 80, veg: true, spicy: true, desc: "Crispy golden dosa with our signature potato masala.", img: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&q=80", featured: true, stock: null },
  { cat: "breakfast", name: "Idli Vada Combo", price: 60, veg: true, spicy: false, desc: "Two steamed idlis and a crispy vada with sambar and chutney.", img: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80", featured: true, stock: null },
  { cat: "breakfast", name: "Upma with Kesari Bath", price: 70, veg: true, spicy: false, desc: "Classic Chow Chow Bath — upma and sweet kesari bath.", img: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&q=80", featured: false, stock: null },
  { cat: "snacks", name: "Onion Pakoda", price: 50, veg: true, spicy: true, desc: "Crunchy monsoon-favourite onion fritters.", img: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80", featured: true, stock: null },
  { cat: "snacks", name: "Chicken 65", price: 180, veg: false, spicy: true, desc: "Fiery South Indian fried chicken bites.", img: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800&q=80", featured: false, stock: null },
  { cat: "snacks", name: "Samosa (2 pcs)", price: 40, veg: true, spicy: true, desc: "Flaky pastry with spiced potato filling.", img: "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=800&q=80", featured: false, stock: null },
  { cat: "main-course", name: "Neon Paneer Meal", price: 220, veg: true, spicy: true, desc: "Paneer butter masala, chapati, rice and salad bowl.", img: "https://images.unsplash.com/photo-1631452180441-3d515c7503ab?w=800&q=80", featured: true, stock: null },
  { cat: "main-course", name: "Chicken Biryani", price: 260, veg: false, spicy: true, desc: "Aromatic dum biryani with raita and lemon.", img: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80", featured: true, stock: null },
  { cat: "main-course", name: "Veg Thali", price: 150, veg: true, spicy: false, desc: "Complete thali with 3 sabzis, dal, rice, chapati and sweet.", img: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80", featured: false, stock: null },
  { cat: "main-course", name: "Fish Curry Rice", price: 240, veg: false, spicy: true, desc: "Coastal-style fish curry with steamed rice.", img: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&q=80", featured: false, stock: null },
  { cat: "sweets", name: "Mysore Pak Box", price: 200, veg: true, spicy: false, desc: "Ghee-rich classic Mysore Pak. Box of 6. Limited stock.", img: "https://images.unsplash.com/photo-1606471191009-63994c53433b?w=800&q=80", featured: true, stock: 50 },
  { cat: "sweets", name: "Chocolate Gulab Jamun", price: 90, veg: true, spicy: false, desc: "Fusion jamun with a molten chocolate centre.", img: "https://images.unsplash.com/photo-1571167530149-c72f2b6b4a83?w=800&q=80", featured: false, stock: 40 },
  { cat: "beverages", name: "Filter Coffee", price: 35, veg: true, spicy: false, desc: "Strong frothy South Indian filter coffee.", img: "https://images.unsplash.com/photo-1518057111178-44a106bad636?w=800&q=80", featured: false, stock: null },
  { cat: "beverages", name: "Masala Chai", price: 25, veg: true, spicy: false, desc: "Spiced tea brewed with fresh ginger and cardamom.", img: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&q=80", featured: true, stock: null },
  { cat: "beverages", name: "Fresh Lime Soda", price: 45, veg: true, spicy: false, desc: "Sweet-salted lime soda with a hint of mint.", img: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=800&q=80", featured: false, stock: null }
];

export async function seedProducts(prisma: PrismaLike) {
  const categories = [];
  for (const c of categoryDefs) {
    const cat = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    categories.push(cat);
  }
  for (const [i, p] of defs.entries()) {
    const category = categories.find((c) => c.slug === p.cat)!;
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        categoryId: category.id,
        name: p.name,
        slug,
        sku: `NB-${String(i + 1).padStart(3, "0")}`,
        shortDescription: p.desc,
        description: `${p.desc} Prepared fresh in our kitchen with quality local ingredients.`,
        price: new Prisma.Decimal(p.price),
        imageUrl: p.img,
        isVegetarian: p.veg,
        isSpicy: p.spicy,
        spiceLevel: p.spicy ? 2 : 0,
        trackInventory: p.stock !== null,
        stockQuantity: p.stock,
        isFeatured: p.featured,
        displayOrder: i
      }
    });
  }
  console.log("Categories and products seeded.");
}
