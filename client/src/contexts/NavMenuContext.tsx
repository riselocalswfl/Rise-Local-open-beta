import { createContext, useContext, useState, ReactNode } from "react";

interface NavMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const NavMenuContext = createContext<NavMenuContextType | undefined>(undefined);

export function useNavMenu() {
  const context = useContext(NavMenuContext);
  if (!context) {
    throw new Error("useNavMenu must be used within NavMenuProvider");
  }
  return context;
}

export function NavMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <NavMenuContext.Provider value={{ open, setOpen }}>
      {children}
    </NavMenuContext.Provider>
  );
}
