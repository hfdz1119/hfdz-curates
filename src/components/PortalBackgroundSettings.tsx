import { FormEvent, useRef, useState } from "react";
import { Image as ImageIcon, RotateCcw, X } from "lucide-react";
import { normalizePortalBackgroundUrl } from "../stores/portalBackground";

type PortalBackgroundSettingsProps = {
  currentUrl: string | null;
  onApply: (url: string) => void;
  onReset: () => void;
};

function loadBackgroundImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    const timeoutId = window.setTimeout(() => {
      finish(() => {
        image.src = "";
        reject(new Error("图片加载超时，请检查链接或稍后重试。"));
      });
    }, 12000);

    const finish = (callback: () => void) => {
      window.clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
      callback();
    };

    image.referrerPolicy = "no-referrer";
    image.onload = () => finish(resolve);
    image.onerror = () => finish(() => reject(new Error("这个链接没有返回可用的图片，请检查图床分享地址。")));
    image.src = url;
  });
}

export function PortalBackgroundSettings({ currentUrl, onApply, onReset }: PortalBackgroundSettingsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [draftUrl, setDraftUrl] = useState(currentUrl ?? "");
  const [previewUrl, setPreviewUrl] = useState(currentUrl ?? "");
  const [previewReady, setPreviewReady] = useState(Boolean(currentUrl));
  const [previewRevision, setPreviewRevision] = useState(0);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const closeDialog = () => dialogRef.current?.close();

  const openDialog = () => {
    setDraftUrl(currentUrl ?? "");
    setPreviewUrl(currentUrl ?? "");
    setPreviewReady(Boolean(currentUrl));
    setError("");
    dialogRef.current?.showModal();
  };

  const getNormalizedDraft = () => {
    try {
      const normalizedUrl = normalizePortalBackgroundUrl(draftUrl);
      setError("");
      return normalizedUrl;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "无法使用这个链接。");
      return null;
    }
  };

  const handlePreview = () => {
    const normalizedUrl = getNormalizedDraft();
    if (!normalizedUrl) return;
    setPreviewReady(false);
    setPreviewRevision((revision) => revision + 1);
    setPreviewUrl(normalizedUrl);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUrl = getNormalizedDraft();
    if (!normalizedUrl) return;

    setChecking(true);
    try {
      await loadBackgroundImage(normalizedUrl);
      onApply(normalizedUrl);
      closeDialog();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "图片加载失败，请检查链接后重试。");
    } finally {
      setChecking(false);
    }
  };

  const handleReset = () => {
    onReset();
    closeDialog();
  };

  return <>
    <button className="portal-background-trigger" type="button" onClick={openDialog} ref={triggerRef}>
      <ImageIcon size={16} aria-hidden="true" />
      背景
      {currentUrl && <span className="portal-background-custom" aria-label="已使用自定义背景" />}
    </button>

    <dialog
      className="portal-background-dialog"
      ref={dialogRef}
      onClose={() => triggerRef.current?.focus()}
      onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}
    >
      <form className="portal-background-form" onSubmit={handleSubmit}>
        <header className="portal-dialog-header">
          <div>
            <h2>设置首页背景</h2>
            <p>粘贴你上传到图床后得到的图片链接。</p>
          </div>
          <button className="portal-dialog-close" type="button" aria-label="关闭背景设置" onClick={closeDialog}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={`portal-background-preview${previewReady ? " is-ready" : ""}`}>
          {previewUrl
            ? <img
              key={`${previewRevision}:${previewUrl}`}
              src={previewUrl}
              alt="背景图片预览"
              referrerPolicy="no-referrer"
              onLoad={() => setPreviewReady(true)}
              onError={() => {
                setPreviewReady(false);
                setError("预览加载失败，请确认复制的是图片直链。");
              }}
            />
            : <span>粘贴图片直链后可先预览</span>}
        </div>

        <label className="portal-background-field" htmlFor="portal-background-url">
          <span>图片链接</span>
          <small id="portal-background-help">仅接受 HTTPS；设置保存在当前浏览器，不会同步到其他设备。</small>
          <span className="portal-background-input-row">
            <input
              id="portal-background-url"
              name="background-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://image.hfdz1119.top/r/your-image.webp"
              value={draftUrl}
              aria-describedby={`portal-background-help${error ? " portal-background-error" : ""}`}
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setDraftUrl(event.target.value);
                if (error) setError("");
              }}
            />
            <button type="button" onClick={handlePreview}>预览</button>
          </span>
        </label>

        <p className="portal-background-error" id="portal-background-error" aria-live="polite">{error}</p>

        <div className="portal-dialog-actions">
          <button className="portal-reset-button" type="button" onClick={handleReset}>
            <RotateCcw size={15} aria-hidden="true" />恢复默认
          </button>
          <button className="portal-cancel-button" type="button" onClick={closeDialog}>取消</button>
          <button className="portal-apply-button" type="submit" disabled={checking}>
            {checking ? "正在检查图片…" : "应用背景"}
          </button>
        </div>
      </form>
    </dialog>
  </>;
}
