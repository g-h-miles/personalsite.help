/** Big display headline plus a short paragraph, for the list pages. */
export function PageIntro({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-8 pt-8 pb-14 sm:pt-12 lg:pb-[72px]">
      <h1 className="type-h1">{title}</h1>
      <p className="max-w-[540px] text-lg leading-[30px] sm:text-xl sm:leading-8">{children}</p>
    </section>
  );
}
