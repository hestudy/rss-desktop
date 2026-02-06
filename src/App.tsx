import { useEffect } from "react";
import { RssProvider, useRss } from "./contexts/RssContext";
import { ConfirmProvider } from "./components/ui/ConfirmDialog";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FeedList } from "./components/feeds/FeedList";
import { ArticleList } from "./components/articles/ArticleList";
import { ResizeHandle } from "./components/ui/ResizeHandle";
import { Group, Panel, type Layout, useGroupRef } from "react-resizable-panels";
import { invoke } from "@tauri-apps/api/core";
import "./styles/themes/index.css";

const STORAGE_KEY = "panel-layout";
const DEFAULT_PANEL_SIZE = 20; // 左侧面板默认大小（百分比数字）
const MIN_PANEL_SIZE_PERCENT = 15;
const MAX_PANEL_SIZE_PERCENT = 40;

// 仅在开发模式下启用调试日志
const DEBUG = import.meta.env.DEV;

function AppContent() {
  const { loadFeeds } = useRss();
  const groupRef = useGroupRef();

  useEffect(() => {
    let cancelled = false;

    loadFeeds();

    // 从 Tauri 存储加载面板大小
    invoke("get_store_value", { key: STORAGE_KEY })
      .then((value: unknown) => {
        if (cancelled) return;

        if (DEBUG) {
          console.log(
            "[Panel Layout] Raw value from storage:",
            value,
            "type:",
            typeof value,
          );
        }

        // 处理 serde_json::Value 格式的返回值
        let numValue: number | null = null;

        if (typeof value === "number") {
          numValue = value;
        } else if (value && typeof value === "object") {
          // serde_json::Value 可能被序列化为对象
          const record = value as Record<string, unknown>;
          if (DEBUG) {
            console.log(
              "[Panel Layout] Value is object, keys:",
              Object.keys(record),
            );
          }
          if ("n" in record && typeof record.n === "number") {
            numValue = record.n;
          }
        }

        if (DEBUG) {
          console.log("[Panel Layout] Parsed numValue:", numValue);
        }

        // 严格的值验证：必须在有效范围内 (15-40)
        if (
          numValue !== null &&
          numValue >= MIN_PANEL_SIZE_PERCENT &&
          numValue <= MAX_PANEL_SIZE_PERCENT
        ) {
          if (DEBUG) {
            console.log("[Panel Layout] Using valid value:", numValue);
          }
          // 使用 imperative API 设置布局
          if (!cancelled && groupRef.current) {
            groupRef.current.setLayout({
              "feed-panel": numValue,
              "article-panel": 100 - numValue,
            });
          }
        } else {
          // 值无效，使用默认值
          if (DEBUG) {
            console.log(
              "[Panel Layout] Invalid value, using default:",
              DEFAULT_PANEL_SIZE,
            );
          }
          if (!cancelled && groupRef.current) {
            groupRef.current.setLayout({
              "feed-panel": DEFAULT_PANEL_SIZE,
              "article-panel": 100 - DEFAULT_PANEL_SIZE,
            });
          }
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (DEBUG) {
          console.debug("Failed to load panel layout from storage:", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadFeeds, groupRef]);

  const handleLayoutChange = (newLayout: Layout) => {
    // 保存左侧面板的大小
    const feedPanelSize = newLayout["feed-panel"];
    // 更严格的验证，与读取逻辑保持一致 (15-40)
    if (
      feedPanelSize &&
      typeof feedPanelSize === "number" &&
      feedPanelSize >= MIN_PANEL_SIZE_PERCENT &&
      feedPanelSize <= MAX_PANEL_SIZE_PERCENT
    ) {
      invoke("set_store_value", {
        key: STORAGE_KEY,
        value: feedPanelSize,
      }).catch((error) => {
        // 存储失败时记录日志
        console.warn("Failed to save panel layout:", error);
      });
    }
  };

  return (
    <Group
      groupRef={groupRef}
      data-testid="resizable-layout"
      orientation="horizontal"
      className="h-screen"
      defaultLayout={{
        "feed-panel": DEFAULT_PANEL_SIZE,
        "article-panel": 100 - DEFAULT_PANEL_SIZE,
      }}
      onLayoutChange={handleLayoutChange}
    >
      {/* 左侧订阅列表 */}
      <Panel
        id="feed-panel"
        minSize={`${MIN_PANEL_SIZE_PERCENT}%`}
        maxSize={`${MAX_PANEL_SIZE_PERCENT}%`}
        defaultSize={`${DEFAULT_PANEL_SIZE}%`}
      >
        <div data-testid="feed-panel-content" className="h-full">
          <FeedList />
        </div>
      </Panel>

      {/* 拖拽手柄 */}
      <ResizeHandle />

      {/* 右侧文章列表 */}
      <Panel
        id="article-panel"
        minSize={200}
        defaultSize={`${100 - DEFAULT_PANEL_SIZE}%`}
      >
        <div data-testid="article-panel-content" className="h-full">
          <ArticleList />
        </div>
      </Panel>
    </Group>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ConfirmProvider>
        <RssProvider>
          <AppContent />
        </RssProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}

export default App;
