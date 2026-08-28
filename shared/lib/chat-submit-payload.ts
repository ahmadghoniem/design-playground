// The chat composer's output contract. Built by features/chat/DockedChatBar and
// consumed by app/ (useChatSubmit, build-chat-prompt) and features/generation
// (prompt-builders). It lives in shared/ rather than beside the composer because
// a feature (generation) consumes it, and features may not import each other.

export interface ChatSubmitPayload {
  text: string;
  model: string;
  targetNodeId: string | null;
  targetComponentId: string | null;
  targetComponentName: string | null;
  targetType: 'component' | 'iteration' | 'image' | 'text' | null;
  sourceFilename?: string;
  iterationCount?: number;
  canvasPosition: { x: number; y: number };
  elementSelections?: {
    tagName: string;
    displayName: string;
    textContent: string;
    cssSelector: string;
    htmlSource: string;
    ancestorComponents: string[];
    nodeId: string;
    componentName: string;
  }[];
  referenceNodes?: {
    nodeId: string;
    componentId: string;
    componentName: string;
    type: 'component' | 'iteration' | 'image' | 'text';
    sourceFilename?: string;
    imagePath?: string;
    imageUrl?: string;
    textContent?: string;
  }[];
  /** When true, edit the target file in-place instead of creating iterations */
  editMode?: boolean;
  /** Cursor chat behavior mode */
  chatMode?: 'explore' | 'edit' | 'raw';
}
