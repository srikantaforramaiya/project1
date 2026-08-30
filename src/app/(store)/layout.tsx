import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSessionUser } from "@/lib/auth";
import { cartCount } from "@/services/cart.service";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const count = user ? await cartCount(user.id) : 0;
  return (
    <div className="flex min-h-screen flex-col">
      <Header cartCount={count} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
