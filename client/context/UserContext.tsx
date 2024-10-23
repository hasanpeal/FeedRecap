// context/EmailContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

interface EmailContextType {
  emailContext: string;
  setEmailContext: (email: string) => void;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export const EmailProvider = ({ children }: { children: ReactNode }) => {
  const [emailContext, setEmailContext] = useState<string>("");

  return (
    <EmailContext.Provider value={{ emailContext, setEmailContext }}>
      {children}
    </EmailContext.Provider>
  );
};

export const useEmail = () => {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error("useEmail must be used within an EmailProvider");
  }
  return context;
};
