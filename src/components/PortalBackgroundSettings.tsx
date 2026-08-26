import { FormEvent, useId, useRef, useState } from "react";
import { Image as ImageIcon, RotateCcw, X } from "lucide-react";
import { normalizePortalImageUrl } from "../stores/portalBackground";

type PortalImageSettingsProps = {
  currentUrl: string | null;
  onApply: (url: string) => void | Promise<void>;
  onReset: () => void | Promise<void>;
  triggerLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  helpText: string;
  emptyPreviewText: string;
  previewAlt: string;
  applyLabel: string;
  previewShape?: "wide" | "square";
  validationLabel?: string;
  customStatusLabel?: string;
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

export function PortalImageSettings({ currentUrl, onApply, onReset, triggerLabel, dialogTitle, dialogDescription, helpText, emptyPreviewText, previewAlt, applyLabel, previewShape = "wide", validationLabel = "图片", customStatusLabel = `已使用自定义${triggerLabel}` }: PortalImageSettingsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fieldId = useId();
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
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
      const normalizedUrl = normalizePortalImageUrl(draftUrl, validationLabel);
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
      await onApply(normalizedUrl);
      closeDialog();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "图片加载失败，请检查链接后重试。");
    } finally {
      setChecking(false);
    }
  };

  const handleReset = async () => {
    setChecking(true);
    try {
      await onReset();
      closeDialog();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "恢复默认失败，请稍后重试。");
    } finally {
      setChecking(false);
    }
  };

  return <>
    <button className="portal-background-trigger" type="button" onClick={openDialog} ref={triggerRef}>
      <ImageIcon size={16} aria-hidden="true" />
      {triggerLabel}
      {currentUrl && <span className="portal-background-custom" aria-label={customStatusLabel} />}
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
            <h2>{dialogTitle}</h2>
            <p>{dialogDescription}</p>
          </div>
          <button className="portal-dialog-close" type="button" aria-label={`关闭${dialogTitle}`} onClick={closeDialog}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={`portal-background-preview${previewShape === "square" ? " is-square" : ""}${previewReady ? " is-ready" : ""}`}>
          {previewUrl
            ? <img
              key={`${previewRevision}:${previewUrl}`}
              src={previewUrl}
              alt={previewAlt}
              referrerPolicy="no-referrer"
              onLoad={() => setPreviewReady(true)}
              onError={() => {
                setPreviewReady(false);
                setError("预览加载失败，请确认复制的是图片直链。");
              }}
            />
            : <span>{emptyPreviewText}</span>}
        </div>

        <label className="portal-background-field" htmlFor={fieldId}>
          <span>图片链接</span>
          <small id={helpId}>{helpText}</small>
          <span className="portal-background-input-row">
            <input
              id={fieldId}
              name="image-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://image.hfdz1119.top/r/your-image.webp"
              value={draftUrl}
              aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setDraftUrl(event.target.value);
                if (error) setError("");
              }}
            />
            <button type="button" onClick={handlePreview}>预览</button>
          </span>
        </label>

        <p className="portal-background-error" id={errorId} aria-live="polite">{error}</p>

        <div className="portal-dialog-actions">
          <button className="portal-reset-button" type="button" onClick={() => void handleReset()} disabled={checking}>
            <RotateCcw size={15} aria-hidden="true" />恢复默认
          </button>
          <button className="portal-cancel-button" type="button" onClick={closeDialog}>取消</button>
          <button className="portal-apply-button" type="submit" disabled={checking}>
            {checking ? "正在检查图片…" : applyLabel}
          </button>
        </div>
      </form>
    </dialog>
  </>;
}

type PortalBackgroundSettingsProps = Pick<PortalImageSettingsProps, "currentUrl" | "onApply" | "onReset"> & {
  target?: "首页" | "管理页";
};

export function PortalBackgroundSettings({ target = "首页", ...props }: PortalBackgroundSettingsProps) {
  return <PortalImageSettings
    {...props}
    triggerLabel="背景"
    dialogTitle={`设置${target}背景`}
    dialogDescription="粘贴你上传到图床后得到的图片链接。"
    helpText="仅接受 HTTPS；设置保存在当前浏览器，不会同步到其他设备。"
    emptyPreviewText="粘贴图片直链后可先预览"
    previewAlt={`${target}背景图片预览`}
    applyLabel="应用背景"
  />;
}
