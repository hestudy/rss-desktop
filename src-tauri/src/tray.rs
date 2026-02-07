use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

/// 托盘管理器（简化版，暂不实现系统托盘）
/// Tauri v2 的托盘 API 有较大变化，先保留接口供后续扩展
pub struct TrayManager {
    unread_count: Arc<AtomicUsize>,
}

impl TrayManager {
    /// 创建新的托盘管理器
    pub fn new() -> Self {
        Self {
            unread_count: Arc::new(AtomicUsize::new(0)),
        }
    }

    /// 更新未读文章计数
    pub fn update_unread_count(&self, count: usize) {
        self.unread_count.store(count, Ordering::SeqCst);
    }

    /// 获取未读文章计数
    pub fn get_unread_count(&self) -> usize {
        self.unread_count.load(Ordering::SeqCst)
    }

    /// 更新托盘标题（暂为空实现）
    pub fn update_tray_title(_app: &tauri::AppHandle, _count: usize) {
        // TODO: 实现系统托盘标题更新
    }
}

impl Default for TrayManager {
    fn default() -> Self {
        Self::new()
    }
}

// ============= 测试模块 =============
#[cfg(test)]
mod tests {
    use super::*;

    // 测试: 创建新的托盘管理器
    #[test]
    fn test_tray_manager_new() {
        let manager = TrayManager::new();
        assert_eq!(manager.get_unread_count(), 0);
    }

    // 测试: 托盘管理器默认值
    #[test]
    fn test_tray_manager_default() {
        let manager = TrayManager::default();
        assert_eq!(manager.get_unread_count(), 0);
    }

    // 测试: 更新未读计数
    #[test]
    fn test_update_unread_count() {
        let manager = TrayManager::new();

        manager.update_unread_count(5);
        assert_eq!(manager.get_unread_count(), 5);

        manager.update_unread_count(0);
        assert_eq!(manager.get_unread_count(), 0);

        manager.update_unread_count(100);
        assert_eq!(manager.get_unread_count(), 100);
    }

    // 测试: 未读计数的并发更新
    #[test]
    fn test_unread_count_concurrent_updates() {
        let manager = TrayManager::new();
        let manager_arc = Arc::new(manager);

        // 创建多个句柄进行并发更新
        let handles: Vec<_> = (0..10)
            .map(|_| {
                let manager = manager_arc.clone();
                std::thread::spawn(move || {
                    for i in 0..100 {
                        manager.update_unread_count(i);
                    }
                })
            })
            .collect();

        for handle in handles {
            handle.join().unwrap();
        }

        // 最终值应该是最后一次更新的值（虽然具体值不确定，但应该是一个有效值）
        let count = manager_arc.get_unread_count();
        assert!(count <= 99); // 最后一次循环的值
    }
}
