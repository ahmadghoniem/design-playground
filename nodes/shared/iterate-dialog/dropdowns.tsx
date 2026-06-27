'use client';

import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { getModelIconConfig } from '../../../lib/model-icons';
import { useModelSettingsStore } from '../../../stores/model-settings-store';
import { ITERATION_COUNT_OPTIONS, type ModelOption } from '../../../lib/constants';
import { VariationStackIcon } from './icons';

// ---------------------------------------------------------------------------
// ModelPillDropdown — rounded pill button that opens a model selector
// ---------------------------------------------------------------------------

export function ModelPillDropdown({
  model,
  onChange,
  models,
  isLoading,
}: {
  model: string;
  onChange: (model: string) => void;
  models: ModelOption[];
  isLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeProvider = useModelSettingsStore((s) => s.activeProvider);
  const currentLabel = models.find(m => m.value === model)?.label || model || 'Default';
  const currentConfig = getModelIconConfig(model, activeProvider);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex h-9 max-w-[220px] items-center gap-2 rounded-full bg-stone-100/80 pl-2 pr-3 text-[15px] font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-800"
        aria-label="Select model"
      >
        <span
          className="size-6 flex-shrink-0 rounded-full bg-center bg-no-repeat"
          style={{
            backgroundColor: currentConfig.bg,
            backgroundImage: `url(${currentConfig.src})`,
            backgroundSize: '72%',
          }}
        />
        <span className="truncate">
          {isLoading ? 'Loading...' : currentLabel}
        </span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 max-h-64 w-64 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_18px_50px_-22px_rgba(0,0,0,0.35)]">
          {models.map((option) => {
            const config = getModelIconConfig(option.value, activeProvider);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-100 ${
                  model === option.value ? 'bg-stone-50' : ''
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-6 flex-shrink-0 rounded-full bg-center bg-no-repeat"
                    style={{
                      backgroundColor: config.bg,
                      backgroundImage: `url(${config.src})`,
                      backgroundSize: '72%',
                    }}
                  />
                  <span className="truncate">{option.label}</span>
                </span>
                {model === option.value && <Check className="size-3.5 flex-shrink-0 text-stone-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VariationCountDropdown — pill button for selecting how many variations
// ---------------------------------------------------------------------------

export function VariationCountDropdown({
  count,
  onChange,
}: {
  count: number;
  onChange: (count: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-stone-200/70 bg-stone-50/90 px-2.5 text-[14px] font-semibold text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
        aria-label="Select variation count"
      >
        <VariationStackIcon />
        <span>{count}x</span>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-24 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_18px_50px_-22px_rgba(0,0,0,0.35)]">
          {(ITERATION_COUNT_OPTIONS as readonly number[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-100 ${
                count === option ? 'bg-stone-50' : ''
              }`}
            >
              <span>{option}x</span>
              {count === option && <Check className="size-3.5 text-stone-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
