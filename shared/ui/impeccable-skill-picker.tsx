import { ChevronLeft, Plus } from "lucide-react";
import {
  MentionInputList,
  MentionInputItem,
  MentionInputEmpty,
  MentionInputGroup,
  type MentionItemData,
} from "./mention-input";
import { IMPECCABLE_ITEM_ID } from "@pg/shared/lib/impeccable-skill";
import { useSkillsUiStore } from "@pg/shared/stores/skills-ui-store";

interface ImpeccableSkillPickerProps {
  impeccableSubMenuOpen: boolean;
  onBackFromSubMenu: () => void;
  isLoadingSkills?: boolean;
  showAddSkillButton?: boolean;
}

export function ImpeccableSkillPicker({
  impeccableSubMenuOpen,
  onBackFromSubMenu,
  isLoadingSkills = false,
  showAddSkillButton = true,
}: ImpeccableSkillPickerProps) {
  const openSkillsCatalog = useSkillsUiStore((s) => s.openCatalog);

  return (
    <MentionInputGroup
      heading={impeccableSubMenuOpen ? undefined : "Skills"}
    >
      {impeccableSubMenuOpen && (
        <div className="flex items-center gap-1.5 px-2 pb-1 pt-0.5">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onBackFromSubMenu();
            }}
            className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium text-stone-400 hover:text-stone-600 transition-colors"
          >
            <ChevronLeft size={10} strokeWidth={1.5} aria-hidden />
            back
          </button>
          <span className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase">
            impeccable
          </span>
        </div>
      )}

      <MentionInputList className="max-h-[256px]">
        {(item) => <ImpeccableSkillPickerItem key={item.id} item={item} />}
      </MentionInputList>

      {!impeccableSubMenuOpen && (
        <>
          <MentionInputEmpty>
            {isLoadingSkills ? "Loading skills…" : "No skills available."}
          </MentionInputEmpty>
          {showAddSkillButton && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={openSkillsCatalog}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-stone-100 px-2 py-2 text-[12px] font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add a skill…
            </button>
          )}
        </>
      )}
    </MentionInputGroup>
  );
}

function ImpeccableSkillPickerItem({
  item,
}: {
  item: MentionItemData;
}) {
  const isImpeccableParent = item.id === IMPECCABLE_ITEM_ID;
  const isCmd = item.id.startsWith(`${IMPECCABLE_ITEM_ID}:`);
  const cmdCategory = (
    item as MentionItemData & { impeccableCategory?: string }
  ).impeccableCategory;

  if (isImpeccableParent) {
    return (
      <MentionInputItem
        value={item}
        className="gap-2.5 rounded-lg px-2 py-1.5 data-[selected=true]:bg-stone-100 data-[selected=true]:text-stone-900"
      >
        <span
          className="inline-flex items-center justify-center flex-shrink-0 rounded-full text-[10px] font-bold text-white"
          style={{
            width: 24,
            height: 24,
            background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
            boxShadow:
              "0 1px 3px rgba(124,58,237,0.35), inset 0 -2px 3px rgba(0,0,0,0.12), inset 0 2px 2px rgba(255,255,255,0.3)",
            flexShrink: 0,
          }}
        >
          i
        </span>
        <span className="flex-1 text-[13px] font-medium text-stone-800 truncate">
          {item.label}
        </span>
        <span className="ml-auto text-stone-400 text-[13px] leading-none">
          ›
        </span>
      </MentionInputItem>
    );
  }

  if (isCmd) {
    const cmdId = item.id.slice(IMPECCABLE_ITEM_ID.length + 1);
    return (
      <MentionInputItem
        value={item}
        className="gap-2 rounded-lg px-2 py-1.5 data-[selected=true]:bg-stone-100 data-[selected=true]:text-stone-900"
      >
        {cmdCategory && (
          <span className="impeccable-cmd-category">{String(cmdCategory)}</span>
        )}
        <span className="text-[13px] font-medium text-stone-800">{cmdId}</span>
        {typeof item.description === "string" && item.description && (
          <span className="ml-1 text-[11px] text-stone-400 truncate">
            {item.description}
          </span>
        )}
      </MentionInputItem>
    );
  }

  return (
    <MentionInputItem
      value={item}
      className="gap-2.5 rounded-lg px-2 py-1.5 data-[selected=true]:bg-stone-100 data-[selected=true]:text-stone-900"
    >
      <span className="text-[13px] font-medium text-stone-800 truncate">
        {item.label}
      </span>
    </MentionInputItem>
  );
}
