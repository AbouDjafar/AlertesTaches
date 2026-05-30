import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Task } from "@/lib/store";

export type CompilationDataset = {
  owner: string;
  fileName: string;
  tasks: Task[];
};

type CompilationContextValue = {
  datasets: CompilationDataset[];
  setDatasets: (nextDatasets: CompilationDataset[]) => void;
  clearDatasets: () => void;
};

const CompilationContext = createContext<CompilationContextValue | null>(null);

export function CompilationProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasetsState] = useState<CompilationDataset[]>([]);

  const value = useMemo<CompilationContextValue>(() => ({
    datasets,
    setDatasets: (nextDatasets) => {
      setDatasetsState(nextDatasets);
    },
    clearDatasets: () => {
      setDatasetsState([]);
    },
  }), [datasets]);

  return (
    <CompilationContext.Provider value={value}>
      {children}
    </CompilationContext.Provider>
  );
}

export function useCompilation() {
  const context = useContext(CompilationContext);
  if (!context) {
    throw new Error("useCompilation must be used within a CompilationProvider.");
  }
  return context;
}
