type Testimonial = {
  quote: string;
  name?: string;
  role?: string;
  image?: string | null;
};

export function TestimonialsMinimal({
  items,
  storyHref,
  storyLabel,
  className = "",
}: {
  items: Testimonial[];
  storyHref?: string;
  storyLabel?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <blockquote key={item.quote} className="rounded-2xl border bg-white p-5">
            <p className="m-0 text-sm leading-6 text-slate-700">“{item.quote}”</p>
            <footer className="mt-3 text-xs font-semibold text-slate-500">
              {item.name || "PING"} {item.role ? `· ${item.role}` : ""}
            </footer>
          </blockquote>
        ))}
      </div>
      {storyHref ? (
        <a className="mt-4 inline-flex text-sm font-bold text-ping-primary no-underline" href={storyHref}>
          {storyLabel || "더 보기"}
        </a>
      ) : null}
    </div>
  );
}
