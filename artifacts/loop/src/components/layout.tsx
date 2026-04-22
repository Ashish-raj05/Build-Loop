import { useGetMe, getGetMeQueryKey, useLogout } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function Layout({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const queryClient = useQueryClient();

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user && location !== "/login" && location !== "/signup") {
    setLocation("/login");
    return null;
  }

  if (user && (location === "/login" || location === "/signup")) {
    setLocation("/");
    return null;
  }

  const handleLogout = async () => {
    await logout.mutateAsync();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {user && (
        <header className="border-b border-border bg-white sticky top-0 z-10">
          <div className="max-w-[680px] mx-auto w-full px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <span className="font-medium text-primary tracking-tight">Loop</span>
              <nav className="flex items-center gap-6">
                <Link
                  href="/"
                  className={`text-sm transition-colors hover:text-primary ${
                    location === "/" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  Today
                </Link>
                <Link
                  href="/clients"
                  className={`text-sm transition-colors hover:text-primary ${
                    location === "/clients" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  Clients
                </Link>
              </nav>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Logout
            </button>
          </div>
        </header>
      )}
      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  );
}
