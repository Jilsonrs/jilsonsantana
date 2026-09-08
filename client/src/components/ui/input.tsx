import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-input/60 bg-background px-4 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300",
          "shadow-[0_10px_40px_hsl(var(--foreground)/0.03),0_2px_10px_hsl(var(--primary)/0.05)]",
          "focus-visible:border-primary focus-visible:shadow-[0_10px_40px_hsl(var(--primary)/0.12)]",
          // Estado de erro dirigido por `aria-invalid`, não por uma prop nossa.
          // Assim a mesma marcação que pinta o campo é a que o leitor de tela
          // anuncia — cor sozinha não serve para quem não distingue vermelho.
          // Vale para TODO formulário do site, não só o login.
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-destructive/5",
          "aria-[invalid=true]:shadow-[0_0_0_1px_hsl(var(--destructive)),0_10px_40px_hsl(var(--destructive)/0.1)]",
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
