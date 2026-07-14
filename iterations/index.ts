// Auto-generated index for iteration components
// This file maps iteration filenames to their components

import { ComponentType } from 'react';

// Import all DailyRecapItem iterations
import DailyRecapItemIteration1 from './DailyRecapItem.iteration-1';
import DailyRecapItemIteration2 from './DailyRecapItem.iteration-2';
import DailyRecapItemIteration3 from './DailyRecapItem.iteration-3';

// Import all DrawdownConfigCard iterations
import DrawdownConfigCardIteration1 from './DrawdownConfigCard.iteration-1';

// Map of filename to component
export const iterationComponents: Record<string, ComponentType<any>> = {
  'DailyRecapItem.iteration-1.tsx': DailyRecapItemIteration1 as ComponentType<any>,
  'DailyRecapItem.iteration-2.tsx': DailyRecapItemIteration2 as ComponentType<any>,
  'DailyRecapItem.iteration-3.tsx': DailyRecapItemIteration3 as ComponentType<any>,
  'DrawdownConfigCard.iteration-1.tsx': DrawdownConfigCardIteration1 as ComponentType<any>,
};

export function getIterationComponent(filename: string): ComponentType<any> | undefined {
  return iterationComponents[filename];
}
