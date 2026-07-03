import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { Node } from "@xyflow/react";
import { getProviderFields } from "../lib/generation-body";
import { loadDefaultSkillPrompt } from "../lib/load-default-skill-prompt";
import {
  formatSkillSection,
  getStylingConstraint,
} from "../prompts/shared-sections";
import {
  createPagePrompt,
  RESERVED_TOP_LEVEL_SLUGS,
} from "../prompts/create-page.prompt";
import {
  GENERATION_START_EVENT,
  GENERATION_COMPLETE_EVENT,
  GENERATION_ERROR_EVENT,
  DEFAULT_STYLING_MODE,
  type GenerationStartPayload,
  type GenerationCompletePayload,
  type GenerationErrorPayload,
} from "../lib/constants";
import { toast } from "sonner";

export interface UseCanvasCreatePageParams {
  screenToFlowPosition: (position: { x: number; y: number }) => {
    x: number;
    y: number;
  };
  getNodeId: () => string;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  reactFlowWrapper: MutableRefObject<HTMLDivElement | null>;
}

export function useCanvasCreatePage({
  screenToFlowPosition,
  getNodeId,
  setNodes,
  reactFlowWrapper,
}: UseCanvasCreatePageParams) {
  const [createPageDialog, setCreatePageDialog] = useState<{
    screenX: number;
    screenY: number;
  } | null>(null);
  const [newPageDescription, setNewPageDescription] = useState("");
  const [createPageError, setCreatePageError] = useState("");
  const [creatingPage, setCreatingPage] = useState(false);
  const newPageInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (createPageDialog && newPageInputRef.current) {
      requestAnimationFrame(() => newPageInputRef.current?.focus());
    }
  }, [createPageDialog]);

  const handleCreatePage = useCallback(async () => {
    const description = newPageDescription.trim();
    if (!description) return;
    setCreatePageError("");
    setCreatingPage(true);

    const skillPromptText = (await loadDefaultSkillPrompt()) ?? "";
    const skillSection = skillPromptText
      ? formatSkillSection(skillPromptText)
      : "";
    const prompt = createPagePrompt({
      skillSection,
      description,
      stylingConstraint: getStylingConstraint(DEFAULT_STYLING_MODE),
      reservedSlugs: RESERVED_TOP_LEVEL_SLUGS.join(", "),
    });

    const componentId = "chat-new-page";
    const pf = getProviderFields();
    const toastId = `create-page-${Date.now()}`;

    toast.loading("Creating new page…", { id: toastId, duration: Infinity });

    window.dispatchEvent(
      new CustomEvent<GenerationStartPayload>(GENERATION_START_EVENT, {
        detail: {
          componentId,
          componentName: "New Page",
          parentNodeId: "",
          iterationCount: 0,
          model: undefined,
          provider: pf.provider as GenerationStartPayload["provider"],
        },
      }),
    );

    try {
      const response = await fetch("/playground/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          componentId,
          iterationCount: 0,
          source: "new_page",
          ...pf,
        }),
      });
      const data = await response.json().catch(() => ({ success: false }));
      if (!response.ok || !data.success) {
        const errMsg =
          data?.error || `Page creation failed (${response.status})`;
        toast.error(errMsg, { id: toastId, duration: 6000 });
        setCreatePageError(errMsg);
        window.dispatchEvent(
          new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
            detail: { componentId, parentNodeId: "", error: errMsg },
          }),
        );
        return;
      }
      toast.success("Page created — drag from sidebar to canvas", {
        id: toastId,
        duration: 5000,
      });
      window.dispatchEvent(
        new CustomEvent<GenerationCompletePayload>(GENERATION_COMPLETE_EVENT, {
          detail: { componentId, parentNodeId: "", output: "" },
        }),
      );
      setCreatePageDialog(null);
      setNewPageDescription("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg, { id: toastId, duration: 6000 });
      setCreatePageError(msg);
      window.dispatchEvent(
        new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
          detail: { componentId, parentNodeId: "", error: msg },
        }),
      );
    } finally {
      setCreatingPage(false);
    }
  }, [newPageDescription]);

  const openCreatePageDialog = useCallback(
    (screenX: number, screenY: number) => {
      setCreatePageDialog({ screenX, screenY });
      setNewPageDescription("");
      setCreatePageError("");
    },
    [],
  );

  return {
    createPageDialog,
    setCreatePageDialog,
    newPageDescription,
    setNewPageDescription,
    createPageError,
    setCreatePageError,
    creatingPage,
    newPageInputRef,
    handleCreatePage,
    openCreatePageDialog,
  };
}
