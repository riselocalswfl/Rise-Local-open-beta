import { ReactNode } from "react";
import BottomTabs from "@/components/nav/BottomTabs";

interface AppShellProps {
  children: ReactNode;
  hideTabs?: boolean;
}

export default function AppShell({ children, hideTabs = false }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <main
        className={`flex-1 ${!hideTabs ? "pb-20" : ""}`}
        style={!hideTabs ? { paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" } : undefined}
      >
        {children}
      </main>
      {!hideTabs && <BottomTabs />}
    </div>
  );
}
