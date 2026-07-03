import { ComponentType } from 'react';
import type { ComponentSize, ChatSubmitPayload, StylingMode } from './lib/constants';
import { DEFAULT_STYLING_MODE } from './lib/constants';
import { iterationPrompt } from './prompts/iteration.prompt';
import { iterationFromIterationPrompt } from './prompts/iteration-from-iteration.prompt';
import { adoptIterationPrompt } from './prompts/adopt.prompt';
import {
  elementIterationPrompt,
  elementIterationFromIterationPrompt,
} from './prompts/element-iteration.prompt';
import {
  formatChildrenSection,
  formatCustomInstructionsSection,
  formatSkillSection,
  formatScreenshotSection,
  formatElementSelectionsSection,
  getStylingConstraint,
  getStylingQualityItem,
  getQualityChecklist,
} from './prompts/shared-sections';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegistryGroupItem {
  id: string;
  label: string;
  children: RegistryItem[];
}

// Re-export ComponentSize from constants for backward compatibility
export type { ComponentSize } from './lib/constants';

export interface RegistryLeafItem {
  id: string;
  label: string;
  Component: ComponentType<Record<string, unknown>>;
  props?: Record<string, unknown>;
  getProps?: () => Promise<Record<string, unknown>> | Record<string, unknown>;
  parentId?: string; // Optional parent component id for nested discovered components
  // Iteration metadata
  sourcePath: string;
  propsInterface: string;
  childComponents?: string[]; // Child component names that can be iterated
  size?: ComponentSize; // Display size for the component preview
}

export type RegistryItem = RegistryGroupItem | RegistryLeafItem;

export function isGroup(item: RegistryItem): item is RegistryGroupItem {
  return 'children' in item && !('Component' in item);
}

export function isLeaf(item: RegistryItem): item is RegistryLeafItem {
  return 'Component' in item;
}

// ---------------------------------------------------------------------------
// Mock data imports
// ---------------------------------------------------------------------------

import { mockData as footerMockData } from './data/Footer.mockData';
import { mockData as settingsDashboardMockData } from './data/SettingsDashboard.mockData';
import { mockData as cardMockData } from './data/Card.mockData';
import { mockData as profitTargetConfigCardMockData } from './data/ProfitTargetConfigCard.mockData';
import { mockData as drawdownConfigCardMockData } from './data/DrawdownConfigCard.mockData';
import { mockData as tradingDaysConfigCardMockData } from './data/TradingDaysConfigCard.mockData';
import { mockData as consistencyRuleConfigCardMockData } from './data/ConsistencyRuleConfigCard.mockData';
import { mockData as balanceAndRealizedPnlCardMockData } from './data/BalanceAndRealizedPnlCard.mockData';
import { mockData as separatorMockData } from './data/Separator.mockData';

// ---------------------------------------------------------------------------
// Dynamic component imports
// ---------------------------------------------------------------------------

import Footer from '@/components/layout/Footer';
import PricingSection from '@/app/pricing-section/page';
import SettingsDashboard from '@/app/SettingsDashboard';
import { Card } from '@/components/ui/card';
import ProfitTargetConfigCard from '@/features/challenge-configuration/components/ProfitTargetConfigCard';
import DrawdownConfigCard from '@/features/challenge-configuration/components/DrawdownConfigCard';
import TradingDaysConfigCard from '@/features/challenge-configuration/components/TradingDaysConfigCard';
import ConsistencyRuleConfigCard from '@/features/challenge-configuration/components/ConsistencyRuleConfigCard';
import BalanceAndRealizedPnlCard from '@/features/performance-metrics/components/BalanceAndRealizedPnlCard';
import { Separator } from '@/components/ui/separator';


// ---------------------------------------------------------------------------
// Registry tree
// ---------------------------------------------------------------------------

export const registry: RegistryItem[] = [
  // ---------------------------------------------------------------------------
  // Discovered components — added via the playground discovery flow.
  // Each entry has its own data/<ComponentName>.mockData.ts file.
  // To add a new component, run discovery → analyze in the playground UI.
  // ---------------------------------------------------------------------------
  {
    id: 'pages',
    label: 'Pages',
    children: [
      {
        id: 'balance-and-realized-pnl-card',
        label: 'Balance And Realized Pnl Card',
        Component: BalanceAndRealizedPnlCard as unknown as ComponentType<Record<string, unknown>>,
        props: balanceAndRealizedPnlCardMockData as Record<string, unknown>,
        sourcePath: 'src/features/performance-metrics/components/BalanceAndRealizedPnlCard.tsx',
        size: 'default',
        propsInterface: `interface BalanceAndRealizedPnlCardProps {
  displayData: Session // { id, balance, realizedPnL, capital, lastUpdated }
  className?: string
}`,
      },
      {
        id: 'card',
        label: 'Card',
        Component: Card as unknown as ComponentType<Record<string, unknown>>,
        props: cardMockData as Record<string, unknown>,
        sourcePath: 'src/components/ui/card.tsx',
        size: 'default',
        propsInterface: `interface CardProps {
  className?: string
  children: React.ReactNode
}`,
        parentId: 'balance-and-realized-pnl-card',
      },
      {
        id: 'consistency-rule-config-card',
        label: 'ConsistencyRuleConfigCard',
        Component: ConsistencyRuleConfigCard as unknown as ComponentType<Record<string, unknown>>,
        props: consistencyRuleConfigCardMockData as Record<string, unknown>,
        sourcePath: 'src/features/challenge-configuration/components/ConsistencyRuleConfigCard.tsx',
        size: 'default',
        propsInterface: `// ConsistencyRuleConfigCard takes no props — it reads
// config.consistencyRule from the Zustand app store (useAppStore).
type ConsistencyRuleConfigCardProps = Record<string, never>`,
        childComponents: ['NumberInput'],
        parentId: 'settings-dashboard',
      },
      {
        id: 'drawdown-config-card',
        label: 'DrawdownConfigCard',
        Component: DrawdownConfigCard as unknown as ComponentType<Record<string, unknown>>,
        props: drawdownConfigCardMockData as Record<string, unknown>,
        sourcePath: 'src/features/challenge-configuration/components/DrawdownConfigCard.tsx',
        size: 'default',
        propsInterface: `// DrawdownConfigCard takes no props — it reads
// config.dailyDrawdown, config.maxDrawdown, and config.maxDrawdownType
// from the Zustand app store (useAppStore).
type DrawdownConfigCardProps = Record<string, never>`,
        childComponents: ['NumberInput', 'DrawdownTypeSelector'],
        parentId: 'settings-dashboard',
      },
      {
        id: 'footer',
        label: 'Footer',
        Component: Footer as unknown as ComponentType<Record<string, unknown>>,
        props: footerMockData as Record<string, unknown>,
        sourcePath: 'src/components/layout/Footer.tsx',
        size: 'default',
        propsInterface: `interface FooterProps {
  className?: string
}`,
      },
      {
        id: 'pricing-section',
        label: 'Pricing Section',
        Component: PricingSection as unknown as ComponentType<Record<string, unknown>>,
        sourcePath: 'src/app/pricing-section/page.tsx',
        size: 'default' as ComponentSize,
        propsInterface: '// PricingSection takes no props — content is internal',
      },
      {
        id: 'profit-target-config-card',
        label: 'ProfitTargetConfigCard',
        Component: ProfitTargetConfigCard as unknown as ComponentType<Record<string, unknown>>,
        props: profitTargetConfigCardMockData as Record<string, unknown>,
        sourcePath: 'src/features/challenge-configuration/components/ProfitTargetConfigCard.tsx',
        size: 'default',
        propsInterface: `// ProfitTargetConfigCard takes no props — it reads
// config.profitTarget from the Zustand app store (useAppStore).
type ProfitTargetConfigCardProps = Record<string, never>`,
        childComponents: ['NumberInput'],
        parentId: 'settings-dashboard',
      },
      {
        id: 'separator',
        label: 'Separator',
        Component: Separator as unknown as ComponentType<Record<string, unknown>>,
        props: separatorMockData as Record<string, unknown>,
        sourcePath: 'src/components/ui/separator.tsx',
        size: 'default',
        propsInterface: `interface SeparatorProps
  extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
  className?: string
}`,
        parentId: 'balance-and-realized-pnl-card',
      },
      {
        id: 'settings-dashboard',
        label: 'Settings Dashboard',
        Component: SettingsDashboard as unknown as ComponentType<Record<string, unknown>>,
        props: settingsDashboardMockData as Record<string, unknown>,
        sourcePath: 'src/app/SettingsDashboard.tsx',
        size: 'default',
        propsInterface: `// SettingsDashboard takes no props — child config cards
// read their state from the Zustand app store (useAppStore).
type SettingsDashboardProps = Record<string, never>`,
        childComponents: [
          'ProfitTargetConfigCard',
          'DrawdownConfigCard',
          'TradingDaysConfigCard',
          'ConsistencyRuleConfigCard',
        ],
      },
      {
        id: 'trading-days-config-card',
        label: 'TradingDaysConfigCard',
        Component: TradingDaysConfigCard as unknown as ComponentType<Record<string, unknown>>,
        props: tradingDaysConfigCardMockData as Record<string, unknown>,
        sourcePath: 'src/features/challenge-configuration/components/TradingDaysConfigCard.tsx',
        size: 'default',
        propsInterface: `// TradingDaysConfigCard takes no props — it reads
// config.minTradingDays and config.requireProfitableDays
// from the Zustand app store (useAppStore).
type TradingDaysConfigCardProps = Record<string, never>`,
        childComponents: ['NumberInput'],
        parentId: 'settings-dashboard',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Flatten helper
// ---------------------------------------------------------------------------

export function flattenRegistry(
  items: RegistryItem[],
  result: Record<string, RegistryLeafItem> = {}
): Record<string, RegistryLeafItem> {
  for (const item of items) {
    if (isLeaf(item)) {
      result[item.id] = item;
    } else if (isGroup(item)) {
      flattenRegistry(item.children, result);
    }
  }
  return result;
}

export const flatRegistry = flattenRegistry(registry);

/**
 * Preload all lazily-loaded components in the registry, if they expose a
 * `.preload()` method (e.g. React.lazy-wrapped components), to avoid HMR
 * cascades when components are first dropped onto the canvas in dev mode.
 */
export function preloadAllComponents(): void {
  for (const item of Object.values(flatRegistry)) {
    const Component = item.Component as ComponentType<Record<string, unknown>> & { preload?: () => void };
    if (typeof Component?.preload === 'function') {
      Component.preload();
    }
  }
}

// ---------------------------------------------------------------------------
// Registry resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a component by ID from the flat registry.
 * All components — examples and discovered — live in the registry tree above.
 */
export function resolveRegistryItem(componentId: string): RegistryLeafItem | null {
  return flatRegistry[componentId] ?? null;
}

/**
 * Convert a kebab-case registry ID to PascalCase.
 * e.g. "manifesto-page" → "ManifestoPage", "signup-form" → "SignupForm"
 *
 * This is used for iteration filenames so that the filename prefix can be
 * reliably converted back to the registry ID via the inverse transformation
 * (PascalCase → kebab-case) during iteration scanning.
 */
export function registryIdToPascalCase(id: string): string {
  return id.replace(/(^|-)([a-z])/g, (_, _sep, char) => char.toUpperCase());
}

// ---------------------------------------------------------------------------
// Prompt generator
// ---------------------------------------------------------------------------

export function generateIterationPrompt(
  componentId: string,
  iterationCount: number = 4,
  startNumber: number = 1,
  depth: 'shell' | '1-level' | 'all' = 'shell',
  customInstructions?: string,
  skillPrompt?: string,
  stylingMode: StylingMode = DEFAULT_STYLING_MODE,
  screenshotPath?: string,
  referenceNodesSection?: string,
): string {
  const item = resolveRegistryItem(componentId);
  if (!item) return '';

  const componentName = item.label.replace(/\s*\(.*\)/, '');
  const cleanComponentName = registryIdToPascalCase(componentId);
  const depthLabel = depth === 'shell' ? 'Shell only' : depth === '1-level' ? '1 level deep' : 'All levels';

  const childrenSection = formatChildrenSection(item.childComponents);
  const customInstructionsSection = formatCustomInstructionsSection(customInstructions);
  const skillSection = formatSkillSection(skillPrompt);

  const iterationNumbers = Array.from(
    { length: iterationCount },
    (_, i) => startNumber + i,
  );

  const iterationSavesBlock = iterationNumbers
    .map((n) => `   - Save as src/app/playground/iterations/${cleanComponentName}.iteration-${n}.tsx`)
    .join('\n');

  return iterationPrompt({
    skillSection,
    componentName,
    sourcePath: item.sourcePath,
    iterationCount: String(iterationCount),
    depthLabel,
    childrenSection,
    propsInterface: item.propsInterface,
    cleanComponentName,
    componentId,
    customInstructionsSection,
    stylingConstraint: getStylingConstraint(stylingMode),
    qualityChecklist: getQualityChecklist(stylingMode),
    iterationNumbersList: iterationNumbers.join(', '),
    iterationSavesBlock,
    screenshotSection: formatScreenshotSection(screenshotPath),
    referenceNodesSection: referenceNodesSection || '',
  });
}

// ---------------------------------------------------------------------------
// Iteration-from-iteration prompt generator
// ---------------------------------------------------------------------------

export function generateIterationFromIterationPrompt(
  componentId: string,
  sourceIterationFilename: string,
  iterationCount: number,
  startNumber: number,
  depth: 'shell' | '1-level' | 'all' = 'shell',
  customInstructions?: string,
  skillPrompt?: string,
  stylingMode: StylingMode = DEFAULT_STYLING_MODE,
  screenshotPath?: string,
  referenceNodesSection?: string,
): string {
  const item = resolveRegistryItem(componentId);
  if (!item) return '';

  const componentName = item.label.replace(/\s*\(.*\)/, '');
  const cleanComponentName = registryIdToPascalCase(componentId);
  const depthLabel = depth === 'shell' ? 'Shell only' : depth === '1-level' ? '1 level deep' : 'All levels';
  const endNumber = startNumber + iterationCount - 1;
  const iterationSourcePath = `src/app/playground/iterations/${sourceIterationFilename}`;

  const childrenSection = formatChildrenSection(item.childComponents);
  const customInstructionsSection = formatCustomInstructionsSection(customInstructions);
  const skillSection = formatSkillSection(skillPrompt);

  const iterationNumbers = Array.from(
    { length: iterationCount },
    (_, i) => startNumber + i,
  );

  const iterationSavesBlock = iterationNumbers
    .map((n) => `   - Save as src/app/playground/iterations/${cleanComponentName}.iteration-${n}.tsx`)
    .join('\n');

  return iterationFromIterationPrompt({
    skillSection,
    componentName,
    sourcePath: item.sourcePath,
    iterationSourcePath,
    iterationCount: String(iterationCount),
    startNumber: String(startNumber),
    endNumber: String(endNumber),
    depthLabel,
    childrenSection,
    propsInterface: item.propsInterface,
    iterationSavesBlock,
    treeParent: sourceIterationFilename,
    customInstructionsSection,
    iterationNumbersList: iterationNumbers.join(', '),
    sourceIterationFilename,
    stylingConstraint: getStylingConstraint(stylingMode),
    screenshotSection: formatScreenshotSection(screenshotPath),
    referenceNodesSection: referenceNodesSection || '',
  });
}

// ---------------------------------------------------------------------------
// Element-targeted iteration prompt generator
// ---------------------------------------------------------------------------

export function generateElementIterationPrompt(
  componentId: string,
  startNumber: number,
  iterationCount: number,
  depth: 'shell' | '1-level' | 'all' = 'all',
  elementSelections: ChatSubmitPayload['elementSelections'],
  customInstructions?: string,
  skillPrompt?: string,
  stylingMode: StylingMode = DEFAULT_STYLING_MODE,
  screenshotPath?: string,
  referenceNodesSection?: string,
): string {
  const item = flatRegistry[componentId];
  if (!item) return '';

  const componentName = item.label.replace(/\s*\(.*\)/, '');
  const cleanComponentName = registryIdToPascalCase(componentId);
  const depthLabel = depth === 'shell' ? 'Shell only' : depth === '1-level' ? '1 level deep' : 'All levels';

  const childrenSection = formatChildrenSection(item.childComponents);
  const customInstructionsSection = formatCustomInstructionsSection(customInstructions);
  const skillSection = formatSkillSection(skillPrompt);
  const elementSelectionsSection = formatElementSelectionsSection(elementSelections);

  const iterationNumbers = Array.from(
    { length: iterationCount },
    (_, i) => startNumber + i,
  );

  const iterationSavesBlock = iterationNumbers
    .map((n) => `   - Save as src/app/playground/iterations/${cleanComponentName}.iteration-${n}.tsx`)
    .join('\n');

  return elementIterationPrompt({
    skillSection,
    componentName,
    sourcePath: item.sourcePath,
    depthLabel,
    childrenSection,
    propsInterface: item.propsInterface,
    cleanComponentName,
    componentId,
    customInstructionsSection,
    elementSelectionsSection,
    iterationCount: String(iterationCount),
    iterationNumbersList: iterationNumbers.join(', '),
    iterationSavesBlock,
    stylingQualityItem: getStylingQualityItem(stylingMode),
    screenshotSection: formatScreenshotSection(screenshotPath),
    referenceNodesSection: referenceNodesSection || '',
  });
}

export function generateElementIterationFromIterationPrompt(
  componentId: string,
  sourceIterationFilename: string,
  startNumber: number,
  iterationCount: number,
  depth: 'shell' | '1-level' | 'all' = 'all',
  elementSelections: ChatSubmitPayload['elementSelections'],
  customInstructions?: string,
  skillPrompt?: string,
  stylingMode: StylingMode = DEFAULT_STYLING_MODE,
  screenshotPath?: string,
  referenceNodesSection?: string,
): string {
  const item = flatRegistry[componentId];
  if (!item) return '';

  const componentName = item.label.replace(/\s*\(.*\)/, '');
  const cleanComponentName = registryIdToPascalCase(componentId);
  const depthLabel = depth === 'shell' ? 'Shell only' : depth === '1-level' ? '1 level deep' : 'All levels';
  const iterationSourcePath = `src/app/playground/iterations/${sourceIterationFilename}`;

  const childrenSection = formatChildrenSection(item.childComponents);
  const customInstructionsSection = formatCustomInstructionsSection(customInstructions);
  const skillSection = formatSkillSection(skillPrompt);
  const elementSelectionsSection = formatElementSelectionsSection(elementSelections);

  const iterationNumbers = Array.from(
    { length: iterationCount },
    (_, i) => startNumber + i,
  );

  const iterationSavesBlock = iterationNumbers
    .map((n) => `   - Save as src/app/playground/iterations/${cleanComponentName}.iteration-${n}.tsx`)
    .join('\n');

  return elementIterationFromIterationPrompt({
    skillSection,
    componentName,
    sourcePath: item.sourcePath,
    iterationSourcePath,
    depthLabel,
    childrenSection,
    propsInterface: item.propsInterface,
    cleanComponentName,
    componentId,
    customInstructionsSection,
    elementSelectionsSection,
    iterationCount: String(iterationCount),
    iterationNumbersList: iterationNumbers.join(', '),
    iterationSavesBlock,
    treeParent: sourceIterationFilename,
    sourceIterationFilename,
    stylingQualityItem: getStylingQualityItem(stylingMode),
    screenshotSection: formatScreenshotSection(screenshotPath),
    referenceNodesSection: referenceNodesSection || '',
  });
}

// ---------------------------------------------------------------------------
// Adopt prompt generator
// ---------------------------------------------------------------------------

export function generateAdoptPrompt(
  componentId: string,
  iterationFilename: string
): string {
  const item = resolveRegistryItem(componentId);
  const originalPath = item?.sourcePath || `src/components/${iterationFilename.split('.iteration')[0]}.tsx`;
  const iterationPath = `src/app/playground/iterations/${iterationFilename}`;

  return adoptIterationPrompt({ originalPath, iterationPath });
}
