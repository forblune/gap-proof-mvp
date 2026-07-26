"use client";
// #69: 데모 헤더의 모바일 액션 메뉴 — 모델 요약·연결 상태 배지·새 분석 시작하기가
// 한 줄에 욱여넣어져 텍스트가 단어 내에서 줄바꿈되던 문제(운영 실기기 확인)를
// "⋯" 버튼 + 우상단 소형 팝오버로 대체한다. 데스크톱 .top-actions는 무변화.
import { createPortal } from "react-dom";
import { useSlidePanel } from "./use-slide-panel";

export default function MobileActionsMenu({
  modelLabel,
  onChangeModel,
  modelDisabled,
  connectionLabel,
  connectionLive,
  onNewAnalysis,
}: {
  modelLabel: string;
  onChangeModel: () => void;
  modelDisabled: boolean;
  connectionLabel: string;
  connectionLive: boolean;
  onNewAnalysis: (() => void) | null; // null이면 버튼 숨김(샘플 모드)
}) {
  const { open, mounted, toggle, close, dismiss, triggerRef, closeRef, panelRef } = useSlidePanel();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="actions-toggle"
        aria-label="분석 상태·메뉴 열기"
        aria-expanded={open}
        aria-controls="gp-actions-panel"
        onClick={toggle}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {mounted && createPortal(
        <div className={open ? "drawer-root actions-root open" : "drawer-root actions-root"} aria-hidden={open ? undefined : true}>
          <div className="drawer-backdrop" onClick={close} />
          <div id="gp-actions-panel" ref={panelRef} className="actions-panel" role="dialog" aria-modal="true" aria-label="분석 상태·메뉴">
            <div className="drawer-head">
              <span className={`sample-badge ${connectionLive ? "live" : ""}`}>
                <i /> <span className="sample-badge-text">{connectionLabel}</span>
              </span>
              <button ref={closeRef} type="button" className="drawer-close" aria-label="메뉴 닫기" onClick={close}>
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <div className="actions-panel-body">
              <div className="actions-model-row">
                <small>AI 분석 모델</small>
                <b>{modelLabel}</b>
                <button
                  className="secondary"
                  disabled={modelDisabled}
                  onClick={() => { dismiss(); onChangeModel(); }}
                >모델 변경</button>
              </div>
              {onNewAnalysis && (
                <button className="text-button actions-reset" onClick={() => { dismiss(); onNewAnalysis(); }}>새 분석 시작하기</button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
