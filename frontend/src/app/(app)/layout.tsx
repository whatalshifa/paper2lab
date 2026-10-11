import { AppBar } from "@/components/AppBar";

/** The app: the library, the reader and the accuracy page, under the app bar. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppBar />
      <main id="main" className="w-full flex-1">
        {children}
      </main>
    </>
  );
}
