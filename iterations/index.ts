// Auto-generated index for iteration components
// This file maps iteration filenames to their components

import { ComponentType } from 'react';

// Import all DrawdownConfigCard iterations
import DrawdownConfigCardIteration1 from './DrawdownConfigCard.iteration-1';

// Import all StatusBadge iterations
import StatusBadgeIteration1 from './StatusBadge.iteration-1';

// Map of filename to component
export const iterationComponents: Record<string, ComponentType<any>> = {
  'DrawdownConfigCard.iteration-1.tsx': DrawdownConfigCardIteration1 as ComponentType<any>,
  'StatusBadge.iteration-1.tsx': StatusBadgeIteration1 as ComponentType<any>,
};

export function getIterationComponent(filename: string): ComponentType<any> | undefined {
  return iterationComponents[filename];
}
