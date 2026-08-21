import {
  MentionInputList,
  MentionInputItem,
  MentionInputEmpty,
  MentionInputGroup,
  type MentionItemData,
} from "./mention-input";

interface SkillPickerProps {
  isLoadingSkills?: boolean;
}

export function SkillPicker({ isLoadingSkills = false }: SkillPickerProps) {
  return (
    <MentionInputGroup heading="Skills">
      <MentionInputList className="max-h-[256px]">
        {(item) => <SkillPickerItem key={item.id} item={item} />}
      </MentionInputList>

      <MentionInputEmpty>
        {isLoadingSkills ? "Loading skills…" : "No skills available."}
      </MentionInputEmpty>
    </MentionInputGroup>
  );
}

function SkillPickerItem({ item }: { item: MentionItemData }) {
  return (
    <MentionInputItem
      value={item}
      className="gap-2.5 rounded-lg px-2 py-1.5 data-[selected=true]:bg-stone-100 data-[selected=true]:text-stone-900"
    >
      <span className="text-[13px] font-medium text-stone-800 truncate">
        {item.label}
      </span>
      {typeof item.description === "string" && item.description && (
        <span className="ml-1 text-[11px] text-stone-400 truncate">
          {item.description}
        </span>
      )}
    </MentionInputItem>
  );
}
