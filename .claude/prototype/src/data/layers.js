/** @typedef {{ id: string; label: string; depth: number; icon: 'layout' | 'layers' | 'box' | 'chart' | 'table' | 'primitive'; expanded?: boolean; selected?: boolean; dim?: boolean }} LayerRow */

/** @type {LayerRow[]} */
export const layers = [
  { id: 'app', label: 'App', depth: 0, expanded: true, icon: 'layout' },
  { id: 'theme-provider', label: 'ThemeProvider', depth: 1, dim: true, icon: 'box' },
  { id: 'header', label: 'Header', depth: 1, icon: 'layers' },
  { id: 'perf-dash', label: 'PerformanceDashboard', depth: 1, expanded: true, icon: 'chart' },
  { id: 'perf-metric', label: 'PerformanceMetricCard', depth: 2, icon: 'box' },
  { id: 'equity-chart', label: 'EquityCurveChart', depth: 2, expanded: true, icon: 'chart' },
  { id: 'chart-container', label: 'ChartContainer', depth: 3, icon: 'primitive' },
  { id: 'chart-tooltip', label: 'ChartTooltipContent', depth: 3, icon: 'primitive' },
  { id: 'objectives', label: 'ObjectivesDashboard', depth: 1, icon: 'layers' },
  { id: 'trade-table', label: 'TradeHistoryTable', depth: 1, expanded: true, icon: 'table' },
  { id: 'trade-row', label: 'TradeHistoryRow', depth: 2, icon: 'box' },
  { id: 'download-csv', label: 'DownloadAsCSV', depth: 2, selected: true, icon: 'box' },
  { id: 'trade-placeholder', label: 'TradeHistoryPlaceholder', depth: 2, icon: 'box' },
  { id: 'daily-recap', label: 'DailyRecapView', depth: 1, icon: 'layers' },
  { id: 'settings-dash', label: 'SettingsDashboard', depth: 1, expanded: true, icon: 'layers' },
  { id: 'profit-target', label: 'ProfitTargetConfigCard', depth: 2, icon: 'box' },
  { id: 'drawdown', label: 'DrawdownConfigCard', depth: 2, icon: 'box' },
  { id: 'consistency', label: 'ConsistencyRuleConfigCard', depth: 2, icon: 'box' },
  { id: 'trading-days', label: 'TradingDaysConfigCard', depth: 2, icon: 'box' },
  { id: 'donate', label: 'FloatingDonateButton', depth: 1, icon: 'box' },
  { id: 'footer', label: 'Footer', depth: 1, icon: 'layers' },
];
