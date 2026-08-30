import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChefHat, ShieldCheck, Truck, Sparkles, Clock } from "lucide-react";
import { listProducts } from "@/services/catalog-products.service";
import { listCategoriesWithCounts } from "@/services/catalog-categories.service";
import { ProductCard } from "@/components/products/ProductCard";
import { TAGLINE } from "@/lib/store-config";

export default async function HomePage() {
  const [{ items: featured }, { items: newest }, categories] = await Promise.all([
    listProducts({ featuredOnly: true, availableOnly: true, pageSize: 8 }),
    listProducts({ availableOnly: true, sort: "newest", pageSize: 4 }),
    listCategoriesWithCounts()
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 md:py-28">
          <p className="badge mx-auto mb-6 border border-primary/40 bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Local kitchen · Fresh daily
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Fresh Local Food.
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Bold Flavours.</span>
            <br />
            Delivered Near You.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-text-secondary">{TAGLINE}. Cooked in small batches by local chefs, delivered hot to your door.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/menu" className="btn-primary text-base">
              Order Now <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/menu?sort=newest" className="btn-secondary text-base">
              View Menu
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="mb-6 text-2xl font-bold">Browse by Category</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <Link key={c.id} href={`/menu?category=${c.slug}`} className="card group relative overflow-hidden transition-all hover:border-primary/40 hover:shadow-neon-sm">
              <div className="relative aspect-[4/3]">
                {c.imageUrl ? (
                  <Image src={c.imageUrl} alt="" fill sizes="200px" className="object-cover opacity-60 transition-opacity group-hover:opacity-80" />
                ) : (
                  <div className="h-full w-full bg-surface-elevated" />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 p-3 text-center">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-xs text-text-secondary">{c._count.products} items</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-labelledby="featured-heading">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="featured-heading" className="text-2xl font-bold">Featured Dishes</h2>
          <Link href="/menu" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={{ ...p, price: p.price.toString(), categoryName: p.category.name }} />
          ))}
        </div>
      </section>

      {/* Why choose us */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-labelledby="why-heading">
        <h2 id="why-heading" className="mb-8 text-center text-2xl font-bold">Why Choose Us</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ChefHat, title: "Freshly Prepared", text: "Every dish is cooked to order — never reheated." },
            { icon: Sparkles, title: "Local Ingredients", text: "We source from local markets and farmers daily." },
            { icon: ShieldCheck, title: "Secure UPI Payments", text: "Pay safely with any UPI app. No cards needed." },
            { icon: Truck, title: "Quick Local Delivery", text: "Hot food at your doorstep across serviceable PIN codes." }
          ].map((f) => (
            <div key={f.title} className="card p-6 text-center">
              <f.icon className="mx-auto mb-3 h-8 w-8 text-primary" aria-hidden />
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-text-secondary">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6" aria-labelledby="new-heading">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="new-heading" className="text-2xl font-bold">Fresh Off the Stove</h2>
          <span className="flex items-center gap-1.5 text-sm text-text-secondary"><Clock className="h-4 w-4" aria-hidden /> Recently added</span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {newest.map((p) => (
            <ProductCard key={p.id} product={{ ...p, price: p.price.toString(), categoryName: p.category.name }} />
          ))}
        </div>
      </section>
    </div>
  );
}
