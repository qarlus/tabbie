import { Quote } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { QuoteModule, type QuoteData } from "@/components/QuoteModule";

registerModule<QuoteData>({
  type: "quote",
  label: "Line",
  description: "A calm line for the day — local catalog, or pin your own.",
  icon: Quote,
  defaultSpan: "half",
  singleton: true,
  lane: "focus",
  defaultData: () => ({ custom: "", shuffleDay: "", shuffleSalt: 0 }),
  render: ({ data, onChange, leading, menu, className }) => (
    <QuoteModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
