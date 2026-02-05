use thiserror::Error;

#[derive(Error, Debug)]
pub enum RssError {
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] ureq::Error),

    #[error("JSON parsing failed: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Feed parsing failed: {0}")]
    FeedError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Feed not found: {0}")]
    FeedNotFound(String),

    #[error("Invalid URL: {0}")]
    InvalidUrl(String),

    #[error("Storage error: {0}")]
    StorageError(String),
}

pub type Result<T> = std::result::Result<T, RssError>;
