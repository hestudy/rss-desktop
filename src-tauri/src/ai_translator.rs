use crate::settings::AiSettings;
use log::{debug, info, warn};
use serde_json::Value;
use std::time::Instant;

const CHUNK_MAX_CHARS: usize = 3000;
const MAX_RETRIES: u32 = 2;
const RETRY_DELAY_MS: u64 = 1000;

const BLOCK_TAGS: &[&str] = &[
    "<p>",
    "<p ",
    "</p>",
    "<div>",
    "<div ",
    "</div>",
    "<h1>",
    "<h1 ",
    "<h2>",
    "<h2 ",
    "<h3>",
    "<h3 ",
    "<h4>",
    "<h4 ",
    "<h5>",
    "<h5 ",
    "<h6>",
    "<h6 ",
    "<ul>",
    "<ul ",
    "<ol>",
    "<ol ",
    "<li>",
    "<li ",
    "<blockquote>",
    "<blockquote ",
    "<table>",
    "<table ",
    "<tr>",
    "<tr ",
    "<figure>",
    "<figure ",
    "<section>",
    "<section ",
    "<article>",
    "<article ",
    "<hr>",
    "<hr/",
    "<hr ",
    "<br>",
    "<br/",
    "<br ",
];

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

fn find_block_boundaries(html: &str) -> Vec<usize> {
    let lower = html.to_lowercase();
    let mut positions = Vec::new();

    for tag in BLOCK_TAGS {
        let mut start = 0;
        while let Some(pos) = lower[start..].find(tag) {
            let abs_pos = start + pos;
            positions.push(abs_pos);
            start = abs_pos + tag.len();
        }
    }

    positions.sort_unstable();
    positions.dedup();
    positions
}

fn split_into_chunks(html: &str) -> Vec<String> {
    let boundaries = find_block_boundaries(html);

    if boundaries.is_empty() || html.len() <= CHUNK_MAX_CHARS {
        return vec![html.to_string()];
    }

    let mut segments: Vec<&str> = Vec::new();
    let mut prev = 0;
    for &pos in &boundaries {
        if pos > prev {
            segments.push(&html[prev..pos]);
        }
        prev = pos;
    }
    if prev < html.len() {
        segments.push(&html[prev..]);
    }

    let mut chunks: Vec<String> = Vec::new();
    let mut current = String::new();

    for seg in segments {
        if !current.is_empty() && current.len() + seg.len() > CHUNK_MAX_CHARS {
            chunks.push(std::mem::take(&mut current));
        }
        current.push_str(seg);
    }
    if !current.is_empty() {
        chunks.push(current);
    }

    chunks
}

fn call_translate_api(
    content: &str,
    target_lang: &str,
    settings: &AiSettings,
) -> Result<String, String> {
    let base = settings.api_endpoint.trim_end_matches('/');
    let endpoint = format!("{}/chat/completions", base);

    let system_prompt = format!(
        "你是一个专业的翻译助手。请将用户提供的文章内容准确翻译为{}。\
         要求：1) 保留原文中所有的 HTML 标签和结构不变，只翻译标签内的文本内容；\
         2) 翻译要自然流畅；3) 只输出翻译后的 HTML，不要添加任何解释或注释。",
        target_lang
    );

    let output_tokens = ((content.len() as u32) * 2).max(1000).min(16000);

    let body = serde_json::json!({
        "model": settings.model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content}
        ],
        "max_tokens": output_tokens,
        "temperature": 0.3
    });

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
            return Err(match api_message {
                Some(msg) => format!("AI API error {}: {}", code, msg),
                None => format!("AI API error {}: {}", code, err_text),
            });
        }
        Err(ureq::Error::Transport(e)) => {
            return Err(format!("AI request transport error: {}", e));
        }
    };

    let json: Value = response
        .into_json()
        .map_err(|e| format!("Failed to parse AI response JSON: {}", e))?;

    json.get("choices")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|content| content.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "AI response missing choices[0].message.content".to_string())
}

pub fn translate_content(
    content: &str,
    target_lang: &str,
    settings: &AiSettings,
) -> Result<String, String> {
    if settings.api_key.trim().is_empty() {
        return Err("AI API key is empty".to_string());
    }

    if settings.model.trim().is_empty() {
        return Err("AI model is empty".to_string());
    }

    if strip_html_tags(content).trim().is_empty() {
        return Err("Article content is empty after preprocessing".to_string());
    }

    let chunks = split_into_chunks(content);

    if chunks.len() == 1 {
        info!(
            "[Translate] Single chunk ({}chars), no splitting needed",
            content.len()
        );
        let start = Instant::now();
        let result = call_translate_api(&chunks[0], target_lang, settings);
        info!("[Translate] Done in {:.1}s", start.elapsed().as_secs_f64());
        return result;
    }

    let chunk_count = chunks.len();
    let max_concurrent = (settings.max_concurrency.max(1) as usize).min(chunk_count);
    let batch_count = (chunk_count + max_concurrent - 1) / max_concurrent;
    info!(
        "[Translate] {} chunks, concurrency={}, {} batches",
        chunk_count, max_concurrent, batch_count
    );
    let total_start = Instant::now();
    let mut translated_parts: Vec<String> = Vec::with_capacity(chunk_count);

    for (batch_idx, batch) in chunks.chunks(max_concurrent).enumerate() {
        info!(
            "[Translate] Batch {}/{} starting ({} chunks)",
            batch_idx + 1,
            batch_count,
            batch.len()
        );
        let batch_start = Instant::now();

        let batch_results: Vec<Result<String, String>> = std::thread::scope(|s| {
            let handles: Vec<_> = batch
                .iter()
                .enumerate()
                .map(|(i, chunk)| {
                    let global_idx = translated_parts.len() + i;
                    s.spawn(move || {
                        if strip_html_tags(chunk).trim().is_empty() {
                            debug!(
                                "[Translate] Chunk {}/{} skipped (empty text)",
                                global_idx + 1,
                                chunk_count
                            );
                            return Ok(chunk.to_string());
                        }
                        debug!(
                            "[Translate] Chunk {}/{} starting ({}chars)",
                            global_idx + 1,
                            chunk_count,
                            chunk.len()
                        );
                        let chunk_start = Instant::now();
                        let mut last_err = String::new();
                        for attempt in 0..=MAX_RETRIES {
                            if attempt > 0 {
                                warn!(
                                    "[Translate] Chunk {}/{} retry {}/{} after {:.0}ms",
                                    global_idx + 1,
                                    chunk_count,
                                    attempt,
                                    MAX_RETRIES,
                                    RETRY_DELAY_MS as f64 * attempt as f64
                                );
                                std::thread::sleep(std::time::Duration::from_millis(
                                    RETRY_DELAY_MS * attempt as u64,
                                ));
                            }
                            match call_translate_api(chunk, target_lang, settings) {
                                Ok(translated) => {
                                    info!(
                                        "[Translate] Chunk {}/{} done in {:.1}s{}",
                                        global_idx + 1,
                                        chunk_count,
                                        chunk_start.elapsed().as_secs_f64(),
                                        if attempt > 0 {
                                            format!(" (after {} retries)", attempt)
                                        } else {
                                            String::new()
                                        }
                                    );
                                    return Ok(translated);
                                }
                                Err(e) => {
                                    last_err = e;
                                }
                            }
                        }
                        info!(
                            "[Translate] Chunk {}/{} FAILED in {:.1}s after {} retries",
                            global_idx + 1,
                            chunk_count,
                            chunk_start.elapsed().as_secs_f64(),
                            MAX_RETRIES
                        );
                        Err(format!(
                            "Chunk {}/{}: {}",
                            global_idx + 1,
                            chunk_count,
                            last_err
                        ))
                    })
                })
                .collect();

            handles.into_iter().map(|h| h.join().unwrap()).collect()
        });

        info!(
            "[Translate] Batch {}/{} finished in {:.1}s",
            batch_idx + 1,
            batch_count,
            batch_start.elapsed().as_secs_f64()
        );

        for result in batch_results {
            translated_parts.push(result?);
        }
    }

    info!(
        "[Translate] All {} chunks completed in {:.1}s",
        chunk_count,
        total_start.elapsed().as_secs_f64()
    );

    Ok(translated_parts.join(""))
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
    fn test_split_short_content_single_chunk() {
        let html = "<p>Hello world</p>";
        let chunks = split_into_chunks(html);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0], html);
    }

    #[test]
    fn test_split_multiple_paragraphs() {
        let p1 = format!("<p>{}</p>", "a".repeat(2000));
        let p2 = format!("<p>{}</p>", "b".repeat(2000));
        let html = format!("{}{}", p1, p2);
        let chunks = split_into_chunks(&html);
        assert!(
            chunks.len() >= 2,
            "Should split into multiple chunks, got {}",
            chunks.len()
        );
    }

    #[test]
    fn test_split_preserves_all_content() {
        let html = "<h1>Title</h1><p>Para 1</p><p>Para 2</p><div>Block</div>";
        let chunks = split_into_chunks(html);
        let reassembled: String = chunks.join("");
        assert_eq!(reassembled, html);
    }

    #[test]
    fn test_find_block_boundaries() {
        let html = "<p>first</p><p>second</p>";
        let boundaries = find_block_boundaries(html);
        assert!(boundaries.contains(&0));
        assert!(boundaries.len() >= 2);
    }

    #[test]
    fn test_translate_empty_api_key() {
        let settings = AiSettings {
            api_key: "".to_string(),
            ..AiSettings::default()
        };
        let result = translate_content("hello", "中文", &settings);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("API key is empty"));
    }

    #[test]
    fn test_translate_empty_model() {
        let settings = AiSettings {
            api_key: "test-key".to_string(),
            model: "".to_string(),
            ..AiSettings::default()
        };
        let result = translate_content("hello", "中文", &settings);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("model is empty"));
    }

    #[test]
    fn test_translate_empty_content() {
        let settings = AiSettings {
            api_key: "test-key".to_string(),
            ..AiSettings::default()
        };
        let result = translate_content("<div>   </div>", "中文", &settings);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("empty after preprocessing"));
    }
}
