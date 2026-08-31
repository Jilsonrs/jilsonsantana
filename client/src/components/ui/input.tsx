import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // Estado de erro dirigido por `aria-invalid`, não por uma prop nossa.
          // Assim a mesma marcação que pinta o campo é a que o leitor de tela
          // anuncia — cor sozinha não serve para quem não distingue vermelho.
          // Vale para TODO formulário do site, não só o login.
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-destructive/5",
          "aria-[invalid=true]:focus-visible:ring-destructive",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
