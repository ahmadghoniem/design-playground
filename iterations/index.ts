// Auto-generated index for iteration components
// This file maps iteration filenames to their components

import { ComponentType, lazy } from 'react';

const CardIteration1 = lazy(() => import('./Card.iteration-1'));
const CardIteration2 = lazy(() => import('./Card.iteration-2'));
const CardIteration3 = lazy(() => import('./Card.iteration-3'));

// Map of filename to component
export const iterationComponents: Record<string, ComponentType<any>> = {
  'Card.iteration-1.tsx': CardIteration1,
  'Card.iteration-2.tsx': CardIteration2,
  'Card.iteration-3.tsx': CardIteration3,
};

export function getIterationComponent(filename: string): ComponentType<any> | undefined {
  return iterationComponents[filename];
}
