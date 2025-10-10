export const cn = (...c: (string | false | undefined | null)[]) =>
  c.filter(Boolean).join(" ");
