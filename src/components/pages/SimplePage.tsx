export function SimplePage({ title, intro, sections }: {
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-3 text-lg text-text-secondary">{intro}</p>
      {sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="text-xl font-semibold">{s.heading}</h2>
          <p className="mt-2 leading-relaxed text-text-secondary">{s.body}</p>
        </section>
      ))}
    </article>
  );
}
