/** Replace `{{key}}` placeholders in a prompt template. Missing keys become ''. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/{{(\w+)}}/g, (_match, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return vars[key] ?? '';
    }
    return '';
  });
}
