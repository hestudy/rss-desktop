use crate::settings::AppSettings;
use chrono::{DateTime, Duration, Utc};

// ============= 测试模块 (TDD: 先写测试) =============
#[cfg(test)]
mod tests {
    use super::*;
    use crate::PollInterval;
    use std::time::Duration as StdDuration;

    // 测试: 计算下次运行时间
    #[test]
    fn test_calculate_next_run_time() {
        let now = Utc::now();
        let settings = AppSettings {
            poll_interval: PollInterval::Minutes30,
            ..Default::default()
        };

        let next = calculate_next_run_time(&now, &settings);
        let expected = now + Duration::minutes(30);

        // 允许 1 秒误差
        let diff = (next - expected).num_seconds().abs();
        assert!(
            diff <= 1,
            "Expected next run time to be ~30 minutes from now"
        );
    }

    // 测试: 各种轮询间隔的下次运行时间
    #[test]
    fn test_calculate_next_run_time_various_intervals() {
        let now = Utc::now();

        let intervals = vec![
            (PollInterval::Minutes5, 5),
            (PollInterval::Minutes15, 15),
            (PollInterval::Minutes30, 30),
            (PollInterval::Hours1, 60),
            (PollInterval::Hours2, 120),
            (PollInterval::Hours6, 360),
            (PollInterval::Hours12, 720),
            (PollInterval::Hours24, 1440),
        ];

        for (interval, expected_minutes) in intervals {
            let settings = AppSettings {
                poll_interval: interval,
                ..Default::default()
            };

            let next = calculate_next_run_time(&now, &settings);
            let expected = now + Duration::minutes(expected_minutes);
            let diff = (next - expected).num_seconds().abs();

            assert!(
                diff <= 1,
                "Interval {:?}: Expected {} minutes, got {} seconds difference",
                interval,
                expected_minutes,
                diff
            );
        }
    }

    // 测试: 计算重试退避时间
    #[test]
    fn test_calculate_retry_backoff() {
        // 第 1 次错误: 30 秒 (2^0 * 30)
        let duration = calculate_retry_backoff(1);
        assert_eq!(duration, StdDuration::from_secs(30));

        // 第 2 次错误: 60 秒 (2^1 * 30)
        let duration = calculate_retry_backoff(2);
        assert_eq!(duration, StdDuration::from_secs(60));

        // 第 3 次错误: 120 秒 (2^2 * 30)
        let duration = calculate_retry_backoff(3);
        assert_eq!(duration, StdDuration::from_secs(120));

        // 第 4 次错误: 240 秒 (2^3 * 30)
        let duration = calculate_retry_backoff(4);
        assert_eq!(duration, StdDuration::from_secs(240));

        // 第 5 次错误: 480 秒 (2^4 * 30 = 8 分钟)
        let duration = calculate_retry_backoff(5);
        assert_eq!(duration, StdDuration::from_secs(480));

        // 第 6 次及以上: 960 秒但被限制到 600 秒 (10 分钟)
        let duration = calculate_retry_backoff(6);
        assert_eq!(duration, StdDuration::from_secs(600));

        let duration = calculate_retry_backoff(100);
        assert_eq!(duration, StdDuration::from_secs(600));
    }

    // 测试: 重试退避时间边界值
    #[test]
    fn test_calculate_retry_backoff_boundary() {
        // 0 次错误应该返回最小值 (30秒)
        let duration = calculate_retry_backoff(0);
        assert_eq!(duration, StdDuration::from_secs(30));

        // 最大退避时间不超过 10 分钟
        for errors in 0..=1000 {
            let duration = calculate_retry_backoff(errors);
            assert!(
                duration <= StdDuration::from_secs(600),
                "Backoff should not exceed 600 seconds, got {:?} for {} errors",
                duration,
                errors
            );
        }
    }

    // 测试: 0 次错误重试
    #[test]
    fn test_retry_backoff_zero_errors() {
        let duration = calculate_retry_backoff(0);
        // 0 次错误被视为 1 次错误处理，返回 30 秒
        assert_eq!(duration, StdDuration::from_secs(30));
    }
}

// ============= 实现代码 =============

/// 计算下次运行时间
pub fn calculate_next_run_time(now: &DateTime<Utc>, settings: &AppSettings) -> DateTime<Utc> {
    *now + Duration::minutes(settings.poll_interval.to_minutes() as i64)
}

/// 计算重试退避时间（指数退避，最大 10 分钟）
///
/// consecutive_errors=0 -> 30秒
/// consecutive_errors=1 -> 30秒
/// consecutive_errors=2 -> 60秒
/// consecutive_errors=3 -> 120秒
/// consecutive_errors=4 -> 240秒
/// consecutive_errors=5+ -> 480秒（8分钟）
pub fn calculate_retry_backoff(consecutive_errors: u32) -> std::time::Duration {
    const BASE_RETRY_SECS: u64 = 30;
    const MAX_RETRY_SECS: u64 = 600;

    // consecutive_errors=1 应该返回 30秒，所以使用 (errors - 1) 作为指数
    let errors = consecutive_errors.max(1);
    let exponent = (errors - 1).min(5) as u32;
    let secs = (BASE_RETRY_SECS * 2u64.pow(exponent)).min(MAX_RETRY_SECS);
    std::time::Duration::from_secs(secs)
}
