import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PackageDetail from "./pages/PackageDetail";
import PackageInstallHistory from "./pages/PackageInstallHistory";
import PackageRegistry from "./pages/PackageRegistry";
import PackageVersionCompare from "./pages/PackageVersionCompare";

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/paketler/gecmis" component={PackageInstallHistory} />
            <Route path="/paketler/:packageId/karsilastir" component={PackageVersionCompare} />
            <Route path="/paketler/:packageId" component={PackageDetail} />
            <Route path="/paketler" component={PackageRegistry} />
            <Route component={Home} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
