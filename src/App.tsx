import { useEffect, useRef } from "react";
import { RssProvider, useRss } from "./contexts/RssContext";
import { ReaderProvider, useReader } from "./contexts/ReaderContext";
import { ConfirmProvider } from "./components/ui/ConfirmDialog";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UnifiedSettingsProvider } from "./components/settings/UnifiedSettings";
import { FeedList } from "./components/feeds/FeedList";
import { ArticleList } from "./components/articles/ArticleList";
import { ArticleViewer } from "./components/articles/ArticleViewer";
import { EmptyReaderPlaceholder } from "./components/articles/EmptyReaderPlaceholder";
import { ResizeHandle } from "./components/ui/ResizeHandle";
import { Group, Panel, type Layout, useGroupRef } from "react-resizable-panels";
import { invoke } from "@tauri-apps/api/core";
import "./styles/themes/index.css";

const STORAGE_KEY = "panel-layout-v2";

// 三栏默认大小（百分比）
const DEFAULT_SIDEBAR_SIZE = 15;
const DEFAULT_ARTICLE_LIST_SIZE = 30;
const DEFAULT_READER_SIZE = 55;

// 面板约束
const MIN_SIDEBAR_PERCENT = 12;
const MAX_SIDEBAR_PERCENT = 25;
const MIN_ARTICLE_LIST_PERCENT = 20;
const MAX_ARTICLE_LIST_PERCENT = 45;
const MIN_READER_SIZE = 200; // px

interface ThreePanelLayout {
  sidebar: number;
  articleList: number;
  reader: number;
}

function AppContent() {
  const { loadFeeds, silentRefreshAll, articles } = useRss();
  const { selectedArticleId, selectArticle, readerSettings } = useReader();
  const groupRef = useGroupRef();
  const initialRefreshDone = useRef(false);

  // 获取当前选中的文章
  const selectedArticle = articles.find(a => a.id === selectedArticleId) || null;
  const currentIndex = selectedArticle ? articles.findIndex(a => a.id === selectedArticle.id) : -1;
  const hasNext = currentIndex >= 0 && currentIndex < articles.length - 1;
  const hasPrevious = currentIndex > 0;

  const handleNext = () => {
    if (hasNext) {
      selectArticle(articles[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (hasPrevious) {
      selectArticle(articles[currentIndex - 1].id);
    }
  };

  useEffect(() => {
    let cancelled = false;

    loadFeeds().then(() => {
      if (!cancelled && !initialRefreshDone.current) {
        initialRefreshDone.current = true;
        silentRefreshAll();
      }
    });

    // 从 Tauri 存储加载面板布局
    invoke("get_store_value", { key: STORAGE_KEY })
      .then((value: unknown) => {
        if (cancelled) return;

        let layout: ThreePanelLayout | null = null;

        if (value && typeof value === "object") {
          const record = value as Record<string, unknown>;
          const sidebar = typeof record.sidebar === "number" ? record.sidebar : null;
          const articleList = typeof record.articleList === "number" ? record.articleList : null;
          const reader = typeof record.reader === "number" ? record.reader : null;

          if (
            sidebar !== null &&
            articleList !== null &&
            reader !== null &&
            sidebar >= MIN_SIDEBAR_PERCENT &&
            sidebar <= MAX_SIDEBAR_PERCENT &&
            articleList >= MIN_ARTICLE_LIST_PERCENT &&
            articleList <= MAX_ARTICLE_LIST_PERCENT
          ) {
            layout = { sidebar, articleList, reader };
          }
        }

        if (layout && !cancelled && groupRef.current) {
          groupRef.current.setLayout({
            "sidebar-panel": layout.sidebar,
            "article-list-panel": layout.articleList,
            "reader-panel": layout.reader,
          });
        }
      })
      .catch(() => {
        // 存储加载失败时使用默认布局
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFeeds, groupRef]);

  const handleLayoutChange = (newLayout: Layout) => {
    const sidebar = newLayout["sidebar-panel"];
    const articleList = newLayout["article-list-panel"];
    const reader = newLayout["reader-panel"];

    if (
      typeof sidebar === "number" &&
      typeof articleList === "number" &&
      typeof reader === "number" &&
      sidebar >= MIN_SIDEBAR_PERCENT &&
      sidebar <= MAX_SIDEBAR_PERCENT &&
      articleList >= MIN_ARTICLE_LIST_PERCENT &&
      articleList <= MAX_ARTICLE_LIST_PERCENT
    ) {
      invoke("set_store_value", {
        key: STORAGE_KEY,
        value: { sidebar, articleList, reader },
      }).catch(() => {
        // 存储保存失败时静默忽略
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
        "sidebar-panel": DEFAULT_SIDEBAR_SIZE,
        "article-list-panel": DEFAULT_ARTICLE_LIST_SIZE,
        "reader-panel": DEFAULT_READER_SIZE,
      }}
      onLayoutChange={handleLayoutChange}
    >
      {/* 左侧订阅列表 */}
      <Panel
        id="sidebar-panel"
        minSize={`${MIN_SIDEBAR_PERCENT}%`}
        maxSize={`${MAX_SIDEBAR_PERCENT}%`}
        defaultSize={`${DEFAULT_SIDEBAR_SIZE}%`}
      >
        <div data-testid="feed-panel-content" className="h-full">
          <FeedList />
        </div>
      </Panel>

      {/* 拖拽手柄 */}
      <ResizeHandle id="resize-handle-1" />

      {/* 中间文章列表 */}
      <Panel
        id="article-list-panel"
        minSize={`${MIN_ARTICLE_LIST_PERCENT}%`}
        maxSize={`${MAX_ARTICLE_LIST_PERCENT}%`}
        defaultSize={`${DEFAULT_ARTICLE_LIST_SIZE}%`}
      >
        <div data-testid="article-list-panel-content" className="h-full">
          <ArticleList />
        </div>
      </Panel>

      {/* 拖拽手柄 */}
      <ResizeHandle id="resize-handle-2" />

      {/* 右侧阅读器 */}
      <Panel
        id="reader-panel"
        minSize={MIN_READER_SIZE}
        defaultSize={`${DEFAULT_READER_SIZE}%`}
      >
        <div data-testid="reader-panel-content" className="h-full">
          {selectedArticle ? (
            <ArticleViewer
              key={selectedArticle.id}
              article={selectedArticle}
              articles={articles}
              onNext={handleNext}
              onPrevious={handlePrevious}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              readerSettings={readerSettings}
            />
          ) : (
            <EmptyReaderPlaceholder />
          )}
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
          <ReaderProvider>
            <UnifiedSettingsProvider>
              <AppContent />
            </UnifiedSettingsProvider>
          </ReaderProvider>
        </RssProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}

export default App;
