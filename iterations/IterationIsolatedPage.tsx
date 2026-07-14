import { useEffect, useState, type ComponentType } from 'react';
import { useParams } from 'react-router-dom';
import { flatRegistry } from '@pg/registry';
import { componentNameToRegistryId } from '@pg/features/iterations/iteration-filename';
import { loadIterationComponentModule } from '@pg/shared/lib/iteration-loader';
import type { ComponentSize } from '@pg/shared/lib/constants';
import { previewSchemeClass, usePreviewColorSchemeStore } from '@pg/shared/stores/preview-color-scheme-store';

function getRegistryItemForIteration(filename: string) {
  const baseName = filename.replace(/\.tsx$/, '').split('.')[0]; // e.g. "PricingCard"
  const kebab = componentNameToRegistryId(baseName);

  const possibleIds = [
    kebab,
    `${kebab}-expanded`,
    `${kebab}-minimal`,
  ];

  for (const id of possibleIds) {
    const item = flatRegistry[id];
    if (item) return item;
  }

  return undefined;
}

const isFullPage = (size?: ComponentSize) => size === 'laptop' || size === 'tablet' || size === 'mobile';

function ScreenFrame({ children, size }: { children: React.ReactNode; size?: ComponentSize }) {
  const full = isFullPage(size);
  const schemeClass = previewSchemeClass(usePreviewColorSchemeStore((s) => s.scheme));

  return (
    <div className="playground-iteration-view fixed inset-0 bg-gray-100 p-4">
      <div className={`app-theme w-full h-full overflow-auto rounded-2xl border border-gray-300 bg-background shadow-sm ${schemeClass}`}>
        <div className={full ? 'min-h-full' : 'grid min-h-full place-items-center p-[5%]'}>
          {children}
        </div>
      </div>
    </div>
  );
}

function NotFoundState({ slug }: { slug: string }) {
  return (
    <div className="fixed inset-0 bg-gray-100 grid place-items-center p-4">
      <div className="max-w-md text-center text-gray-500">
        <p className="font-medium text-gray-700">Couldn't resolve "{slug}"</p>
        <p className="mt-1 text-sm">
          No iteration or registry component matches this URL. If this was just generated,
          try reopening the tab — the iteration index may still be regenerating.
        </p>
      </div>
    </div>
  );
}

export function PlaygroundIterationIsolatedPage() {
  const { slug = '' } = useParams<{ slug: string }>();

  // Iterations are written asynchronously and the on-disk index that maps a
  // filename to its component can lag a moment behind — resolve it via a
  // dynamic import (always re-fetches fresh) with a short retry instead of
  // a static import that can capture a stale, pre-generation snapshot.
  const [IterationComponent, setIterationComponent] =
    useState<ComponentType<any> | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    setIterationComponent(null);
    setResolved(false);
    if (!slug) {
      setResolved(true);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const iterationFilename = `${slug}.tsx`;

    const attempt = (delay: number) => {
      loadIterationComponentModule()
        .then((mod) => {
          if (cancelled) return;
          const comp = mod.getIterationComponent(iterationFilename);
          if (comp) {
            setIterationComponent(() => comp);
            setResolved(true);
            return;
          }
          if (delay <= 4000) {
            timer = setTimeout(() => attempt(Math.min(delay * 1.5, 2000)), delay);
            return;
          }
          setResolved(true);
        })
        .catch(() => {
          if (!cancelled) setResolved(true);
        });
    };
    attempt(300);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [slug]);

  if (IterationComponent) {
    const registryItem = getRegistryItemForIteration(`${slug}.tsx`);
    const props = (registryItem?.props ?? {}) as Record<string, unknown>;

    return (
      <ScreenFrame size={registryItem?.size}>
        <IterationComponent {...props} />
      </ScreenFrame>
    );
  }

  // Fall back to rendering a registry component by id (e.g. opened from a
  // ComponentNode rather than an iteration node).
  const registryItem = flatRegistry[slug];
  if (registryItem) {
    const { Component, props, size } = registryItem;
    const effectiveProps = (props ?? {}) as Record<string, unknown>;

    return (
      <ScreenFrame size={size}>
        <Component {...effectiveProps} />
      </ScreenFrame>
    );
  }

  if (!resolved) return null;

  return <NotFoundState slug={slug} />;
}
