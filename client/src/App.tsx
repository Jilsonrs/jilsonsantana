import { Role } from "@jilson/core";

export default function App() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          jilsonsantana.com
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Platform launching soon. Role: {Role.MEMBER}
        </p>
      </div>
    </div>
  );
}
