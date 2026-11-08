//! Apply desktop chrome only on the platform that implements it.
use tauri::{Manager, Runtime, WebviewWindowBuilder};

pub trait DesktopChrome: Sized {
    fn desktop_chrome(self) -> Self;
}

impl<'a, R: Runtime, M: Manager<R>> DesktopChrome for WebviewWindowBuilder<'a, R, M> {
    fn desktop_chrome(self) -> Self {
        #[cfg(target_os = "macos")]
        { self.title_bar_style(tauri::TitleBarStyle::Overlay).hidden_title(true) }
        #[cfg(not(target_os = "macos"))]
        { self }
    }
}
