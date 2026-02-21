import { RssProvider } from "./contexts/RssContext";
import { ReaderProvider } from "./contexts/ReaderContext";
import { ConfirmProvider } from "./components/ui/ConfirmDialog";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UnifiedSettingsProvider } from "./components/settings/UnifiedSettings";
import { LayoutProvider } from "./contexts/LayoutContext";
import { ResponsiveLayout } from "./components/layout";
import "./styles/themes/index.css";

/**
 * App Component
 *
 * Main application component that sets up the provider hierarchy:
 * ThemeProvider -> ConfirmProvider -> RssProvider -> ReaderProvider -> UnifiedSettingsProvider -> LayoutProvider -> ResponsiveLayout
 *
 * ResponsiveLayout automatically chooses between:
 * - Desktop: Three-panel resizable layout
 * - Mobile: Single-column layout with bottom navigation
 */
function App() {
  return (
    <ThemeProvider>
      <ConfirmProvider>
        <RssProvider>
          <ReaderProvider>
            <UnifiedSettingsProvider>
              <LayoutProvider>
                <ResponsiveLayout />
              </LayoutProvider>
            </UnifiedSettingsProvider>
          </ReaderProvider>
        </RssProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}

export default App;
