export interface PlaygroundSkill {
  /** Slash-command name, e.g. `frontend-design` for `/frontend-design` */
  name: string;
  /** One-line description shown in the picker */
  description: string;
  /** Which root it was read from — only user skills can be removed */
  source: 'builtin' | 'user';
}
