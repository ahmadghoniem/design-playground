import {
  Loader2,
  Sparkles,
  Search,
  Home,
  User,
  Pencil,
  Tag,
  Trash2,
  Wand2,
  LayoutGrid,
  RotateCcw,
} from "lucide-react";
import {
  parseDesignMd,
  readableTextColor,
  pickSurfaceColor,
} from "../../../lib/parse-design-md";
import {
  SectionShell,
  ColorCard,
  TypographyCard,
  ShowcaseCard,
  PreviewButton,
  CircleIcon,
} from "./cards";

/** Preview — bento-grid showcase of the parsed design system. */
export default function PreviewSection({
  content,
  loading,
  onEdit,
  aiRunning,
  onAiRegenerate,
}: {
  content: string;
  loading: boolean;
  onEdit: () => void;
  aiRunning: boolean;
  onAiRegenerate: () => void;
}) {
  const ds = parseDesignMd(content);
  const colorEntries = Object.entries(ds.colors).filter(
    ([k]) => !k.startsWith("on-"),
  );
  const surface = pickSurfaceColor(ds);
  const headlineFont =
    ds.typography.h1?.fontFamily ||
    ds.typography.headline?.fontFamily ||
    "serif";
  const bodyFont =
    ds.typography["body-md"]?.fontFamily ||
    ds.typography.body?.fontFamily ||
    "sans-serif";
  const labelFont =
    ds.typography["label-caps"]?.fontFamily ||
    ds.typography.label?.fontFamily ||
    bodyFont;

  const primaryHex = ds.colors.primary || "#141414";
  const secondaryHex = ds.colors.secondary || ds.colors.tertiary || "#EC722F";
  const tertiaryHex = ds.colors.tertiary || ds.colors.secondary || primaryHex;
  const onPrimary = ds.colors["on-primary"] || readableTextColor(primaryHex);
  const onSecondary =
    ds.colors["on-secondary"] || readableTextColor(secondaryHex);
  const onTertiary = ds.colors["on-tertiary"] || readableTextColor(tertiaryHex);
  const danger = ds.colors.destructive || ds.colors.danger || "#C0362C";

  if (loading) {
    return (
      <div className="px-8 py-10 text-stone-400 text-sm flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your design system…
      </div>
    );
  }

  if (colorEntries.length === 0 && Object.keys(ds.typography).length === 0) {
    return (
      <SectionShell
        title="Preview"
        blurb="Your DESIGN.md doesn't define any tokens yet. Use the AI to draft one from your codebase, or open the editor to add some."
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onAiRegenerate}
            disabled={aiRunning}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-stone-900 hover:bg-black rounded-lg transition-colors disabled:opacity-50"
          >
            {aiRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate from my codebase
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 text-[13px] font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
          >
            Open editor
          </button>
        </div>
      </SectionShell>
    );
  }

  return (
    <div className="px-7 py-7">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-stone-900">
            {ds.name || "Your design system"}
          </h2>
          {ds.description && (
            <p className="mt-1 text-[12.5px] text-stone-600 leading-relaxed max-w-xl">
              {ds.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAiRegenerate}
            disabled={aiRunning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50"
            title="Regenerate from your codebase"
          >
            {aiRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            Regenerate
          </button>
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-stone-500">
          Tokens
        </span>
        <span className="text-[11px] text-stone-400">
          Live from your DESIGN.md front-matter — updates instantly on edit.
        </span>
      </div>
      <div className="grid grid-cols-12 gap-4">
        {/* Column 1: Colors stack */}
        <div className="col-span-3 flex flex-col gap-4">
          {colorEntries.slice(0, 5).map(([name, hex]) => (
            <ColorCard key={name} name={name} hex={hex} />
          ))}
        </div>

        {/* Column 2: Typography */}
        <div className="col-span-4 flex flex-col gap-4">
          <TypographyCard
            label="Headline"
            font={headlineFont}
            surface={surface}
            serif
          />
          <TypographyCard label="Body" font={bodyFont} surface={surface} />
          <TypographyCard label="Label" font={labelFont} surface={surface} />
        </div>

        {/* Column 3: Components — merged into a single column */}
        <div className="col-span-5 flex flex-col gap-4">
          <ShowcaseCard surface={surface}>
            <div className="grid grid-cols-2 gap-2.5">
              <PreviewButton
                label="Primary"
                bg={primaryHex}
                text={onPrimary}
                rounded={ds.rounded.md}
              />
              <PreviewButton
                label="Secondary"
                bg={surface}
                text={primaryHex}
                rounded={ds.rounded.md}
                muted
              />
              <PreviewButton
                label="Inverted"
                bg={primaryHex}
                text={onPrimary}
                rounded={ds.rounded.md}
              />
              <PreviewButton
                label="Outlined"
                bg="transparent"
                text={primaryHex}
                rounded={ds.rounded.md}
                outlined
                borderColor={primaryHex}
              />
            </div>
          </ShowcaseCard>

          <div className="grid grid-cols-2 gap-4">
            <ShowcaseCard surface={surface}>
              <div
                className="flex items-center gap-2 bg-white px-3"
                style={{
                  borderRadius: ds.rounded.lg || ds.rounded.md || "999px",
                  height: 40,
                }}
              >
                <Search className="w-4 h-4 text-stone-400" />
                <span
                  className="text-stone-400"
                  style={{ fontFamily: bodyFont, fontSize: 13 }}
                >
                  Search
                </span>
              </div>
            </ShowcaseCard>

            <ShowcaseCard surface={surface}>
              <div className="flex flex-col gap-2 py-3">
                <div
                  className="h-[3px] rounded-full"
                  style={{ background: primaryHex, width: "85%" }}
                />
                <div
                  className="h-[3px] rounded-full"
                  style={{ background: secondaryHex, width: "70%" }}
                />
                <div
                  className="h-[3px] rounded-full"
                  style={{ background: primaryHex, width: "55%" }}
                />
              </div>
            </ShowcaseCard>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ShowcaseCard surface={surface}>
              <div className="flex items-center justify-around py-1.5">
                <div
                  className="flex items-center justify-center"
                  style={{
                    background: primaryHex,
                    color: onPrimary,
                    borderRadius: 999,
                    width: 36,
                    height: 36,
                  }}
                >
                  <Home className="w-4 h-4" />
                </div>
                <Search className="w-[18px] h-[18px] text-stone-500" />
                <User className="w-[18px] h-[18px] text-stone-500" />
              </div>
            </ShowcaseCard>

            <ShowcaseCard surface={surface}>
              <div className="flex items-center justify-around py-1">
                <CircleIcon bg={primaryHex} text={onPrimary} icon={Wand2} />
                <CircleIcon
                  bg={secondaryHex}
                  text={onSecondary}
                  icon={LayoutGrid}
                />
                <CircleIcon bg={tertiaryHex} text={onTertiary} icon={Tag} />
                <CircleIcon bg={danger} text="#fff" icon={Trash2} />
              </div>
            </ShowcaseCard>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-4">
            <ShowcaseCard surface={surface} compact>
              <div
                className="flex items-center justify-center mx-auto"
                style={{
                  background: primaryHex,
                  color: onPrimary,
                  borderRadius: ds.rounded.md || "8px",
                  width: 44,
                  height: 44,
                }}
              >
                <Pencil className="w-4 h-4" />
              </div>
            </ShowcaseCard>
            <ShowcaseCard surface={surface} compact>
              <div
                className="inline-flex items-center gap-1.5 px-3.5 py-2"
                style={{
                  background: "transparent",
                  color: primaryHex,
                  borderRadius: ds.rounded.md || "8px",
                  border: `1px solid ${primaryHex}`,
                  fontFamily: bodyFont,
                  fontSize: 13,
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Label
              </div>
            </ShowcaseCard>
          </div>
        </div>
      </div>
    </div>
  );
}
