import { useCallback, useState } from "react";
import { type ScriptureReference } from "./scripture";

type ReaderModalState = {
  isOpen: boolean;
  reference: ScriptureReference | null;
  bounds: { book: string; startChapter: number; endChapter: number } | null;
};

export function useReaderModal() {
  const [state, setState] = useState<ReaderModalState>({
    isOpen: false,
    reference: null,
    bounds: null,
  });

  const open = useCallback(
    (
      reference: ScriptureReference,
      bounds?: { book: string; startChapter: number; endChapter: number },
    ) => {
      setState({
        isOpen: true,
        reference,
        bounds: bounds ?? null,
      });
    },
    [],
  );

  const close = useCallback(() => {
    setState((current) => ({
      ...current,
      isOpen: false,
    }));
  }, []);

  return {
    isOpen: state.isOpen,
    reference: state.reference,
    bounds: state.bounds,
    open,
    close,
  };
}
