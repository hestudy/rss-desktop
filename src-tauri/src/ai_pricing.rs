use serde::{Deserialize, Serialize};

/// 模型价格（单位：美元/百万 token）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPrice {
    pub model: String,
    pub input_price: f64,
    pub output_price: f64,
}

/// 内置模型价格表
fn builtin_prices() -> Vec<ModelPrice> {
    vec![
        ModelPrice { model: "gpt-4o-mini".into(), input_price: 0.15, output_price: 0.60 },
        ModelPrice { model: "gpt-4o".into(), input_price: 2.50, output_price: 10.00 },
        ModelPrice { model: "gpt-4.1-mini".into(), input_price: 0.40, output_price: 1.60 },
        ModelPrice { model: "gpt-4.1-nano".into(), input_price: 0.10, output_price: 0.40 },
        ModelPrice { model: "gpt-3.5-turbo".into(), input_price: 0.50, output_price: 1.50 },
        ModelPrice { model: "deepseek-chat".into(), input_price: 0.27, output_price: 1.10 },
        ModelPrice { model: "claude-3-haiku".into(), input_price: 0.25, output_price: 1.25 },
        ModelPrice { model: "claude-3.5-sonnet".into(), input_price: 3.00, output_price: 15.00 },
    ]
}

/// 获取内置模型价格
pub fn get_builtin_model_price(model: &str) -> Option<ModelPrice> {
    let lower = model.to_lowercase();
    // 优先精确匹配
    let prices = builtin_prices();
    if let Some(p) = prices.iter().find(|p| lower == p.model.to_lowercase()) {
        return Some(p.clone());
    }
    // 回退到 contains 匹配，按模型名长度降序以优先匹配更具体的名称
    let mut sorted = prices;
    sorted.sort_by(|a, b| b.model.len().cmp(&a.model.len()));
    sorted.into_iter().find(|p| lower.contains(&p.model.to_lowercase()))
}

/// 获取所有内置模型价格
pub fn get_all_builtin_prices() -> Vec<ModelPrice> {
    builtin_prices()
}

/// 计算费用（美元）
/// 自定义价格优先于内置价格（支持部分覆盖）
pub fn calculate_cost(
    model: &str,
    prompt_tokens: u32,
    completion_tokens: u32,
    custom_input_price: Option<f64>,
    custom_output_price: Option<f64>,
) -> f64 {
    let builtin = get_builtin_model_price(model);
    let input_price = custom_input_price
        .or(builtin.as_ref().map(|p| p.input_price))
        .unwrap_or(0.0);
    let output_price = custom_output_price
        .or(builtin.as_ref().map(|p| p.output_price))
        .unwrap_or(0.0);

    let input_cost = (prompt_tokens as f64) * input_price / 1_000_000.0;
    let output_cost = (completion_tokens as f64) * output_price / 1_000_000.0;
    input_cost + output_cost
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_builtin_model_price() {
        let price = get_builtin_model_price("gpt-4o-mini");
        assert!(price.is_some());
        let p = price.unwrap();
        assert!((p.input_price - 0.15).abs() < f64::EPSILON);
    }

    #[test]
    fn test_get_builtin_model_price_case_insensitive() {
        let price = get_builtin_model_price("GPT-4o-Mini");
        assert!(price.is_some());
    }

    #[test]
    fn test_get_builtin_model_price_unknown() {
        let price = get_builtin_model_price("unknown-model-xyz");
        assert!(price.is_none());
    }

    #[test]
    fn test_calculate_cost_builtin() {
        let cost = calculate_cost("gpt-4o-mini", 1000, 500, None, None);
        // input: 1000 * 0.15 / 1M = 0.00015
        // output: 500 * 0.60 / 1M = 0.0003
        let expected = 0.00015 + 0.0003;
        assert!((cost - expected).abs() < 1e-10);
    }

    #[test]
    fn test_calculate_cost_custom_overrides() {
        let cost = calculate_cost("gpt-4o-mini", 1000, 500, Some(1.0), Some(2.0));
        // input: 1000 * 1.0 / 1M = 0.001
        // output: 500 * 2.0 / 1M = 0.001
        let expected = 0.001 + 0.001;
        assert!((cost - expected).abs() < 1e-10);
    }

    #[test]
    fn test_calculate_cost_unknown_model_no_custom() {
        let cost = calculate_cost("unknown-model", 1000, 500, None, None);
        assert!((cost - 0.0).abs() < f64::EPSILON);
    }
}
