// Stand-in for next/dynamic when the app is bundled outside Next.js.
import { lazy, Suspense, type ComponentType } from "react";

export default function dynamic<P extends object>(loader: () => Promise<{ default: ComponentType<P> }>) {
  const Lazy = lazy(loader);
  return function Dynamic(props: P) {
    return (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
