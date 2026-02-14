use crate::models::AiUsageRecord;
use crate::settings::AiSettings;
use log::{debug, info};
use serde_json::Value;
use std::time::Instant;

const MAX_INPUT_CHARS: usize = 4000;

fn strip_html_tags(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut in_tag = false;

    for ch in input.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => output.push(ch),
            _ => {}
        }
    }

    output
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
}

fn truncate_chars(input: &str, max_chars: usize) -> String {
    input.chars().take(max_chars).collect()
}

pub fn generate_summary(content: &str, settings: &AiSettings, article_id: Option<&str>) -> Result<(String, AiUsageRecord), String> {
    if settings.api_key.trim().is_empty() {
        return Err("AI API key is empty".to_string());
    }

    if settings.model.trim().is_empty() {
        return Err("AI model is empty".to_string());
    }

    let stripped = strip_html_tags(content);
    let normalized = stripped.split_whitespace().collect::<Vec<_>>().join(" ");
    let truncated = truncate_chars(&normalized, MAX_INPUT_CHARS);

    if truncated.trim().is_empty() {
        return Err("Article content is empty after preprocessing".to_string());
    }

    let base = settings.api_endpoint.trim_end_matches('/');
    // 纵深防御：在实际调用前再次校验 endpoint
    crate::fetcher::validate_api_endpoint(&settings.api_endpoint)
        .map_err(|e| format!("Invalid API endpoint: {}", e))?;
    let endpoint = format!("{}/chat/completions", base);

    debug!(
        "[Summary] model={}, endpoint={}, input_chars={}, truncated_chars={}",
        settings.model,
        base,
        content.len(),
        truncated.len()
    );

    let user_prompt = format!("请用{}总结以下文章：\n\n{}", settings.language, truncated);

    let body = serde_json::json!({
        "model": settings.model,
        "messages": [
            {"role": "system", "content": settings.prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": settings.max_tokens,
        "temperature": 0.3
    });

    let start = Instant::now();
    info!(
        "[Summary] Requesting AI summary ({}chars input)",
        truncated.len()
    );

    let response = ureq::post(&endpoint)
        .set(
            "Authorization",
            &format!("Bearer {}", settings.api_key.trim()),
        )
        .set("Content-Type", "application/json")
        .send_json(body);

    let response = match response {
        Ok(resp) => resp,
        Err(ureq::Error::Status(code, resp)) => {
            let err_text = resp
                .into_string()
                .unwrap_or_else(|_| "<no response body>".to_string());
            let api_message = serde_json::from_str::<Value>(&err_text).ok().and_then(|v| {
                v.get("error")?
                    .get("message")?
                    .as_str()
                    .map(ToString::to_string)
            });
            let err = match api_message {
                Some(msg) => format!("AI API error {}: {}", code, msg),
                None => format!("AI API error {}: {}", code, err_text),
            };
            info!(
                "[Summary] Failed in {:.1}s: {}",
                start.elapsed().as_secs_f64(),
                err
            );
            return Err(err);
        }
        Err(ureq::Error::Transport(e)) => {
            let err = format!("AI request transport error: {}", e);
            info!(
                "[Summary] Failed in {:.1}s: {}",
                start.elapsed().as_secs_f64(),
                err
            );
            return Err(err);
        }
    };

    let json: Value = response
        .into_json()
        .map_err(|e| format!("Failed to parse AI response JSON: {}", e))?;

    let summary = json
        .get("choices")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|content| content.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "AI response missing choices[0].message.content".to_string())?;

    let prompt_tokens = json.get("usage")
        .and_then(|u| u.get("prompt_tokens"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    let completion_tokens = json.get("usage")
        .and_then(|u| u.get("completion_tokens"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;

    let usage_record = AiUsageRecord::new(
        "summary",
        &settings.model,
        prompt_tokens,
        completion_tokens,
        article_id,
    );

    info!(
        "[Summary] Done in {:.1}s, output_chars={}, tokens={}+{}",
        start.elapsed().as_secs_f64(),
        summary.len(),
        prompt_tokens,
        completion_tokens
    );

    Ok((summary, usage_record))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_html_tags() {
        let input = "<div>Hello <b>World</b>&nbsp; &amp; Rust</div>";
        let output = strip_html_tags(input);
        assert!(output.contains("Hello World"));
        assert!(output.contains("& Rust"));
        assert!(!output.contains("<b>"));
    }

    #[test]
    fn test_truncate_chars() {
        let input = "a".repeat(5000);
        let output = truncate_chars(&input, 4000);
        assert_eq!(output.chars().count(), 4000);
    }
}
